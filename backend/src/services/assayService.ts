import bcrypt from 'bcryptjs';
import { appendAudit, verifyAuditRows } from '../core/audit';
import { db, DbClient, one } from '../core/db';
import { DomainError, digest, id, instant, integer, oneOf, requiredText, secret, uuid } from '../core/domain';
import { maxFutureSeconds } from '../core/runtime';
import { AuthUser } from '../middleware/auth';
import { parsePacket, validateMeasurements } from '../core/validation';

const INSTRUMENT_TYPES = ['PLATE_READER','HPLC','MASS_SPEC','FLOW_CYTOMETER'] as const;
const INSTRUMENT_STATES = ['ACTIVE','MAINTENANCE','RETIRED'] as const;

async function transition(client: DbClient, input: { tenantId: string; entityType: string; entityId: string; fromState?: string | null; toState: string; reason: string; actorUserId?: string | null; ingestionEventId?: string | null; version: number; requestId?: string | null }) {
  const transitionId = id();
  await client.query(`INSERT INTO tsc_state_transitions (id,tenant_id,entity_type,entity_id,from_state,to_state,reason,actor_user_id,ingestion_event_id,entity_version) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`, [transitionId, input.tenantId, input.entityType, input.entityId, input.fromState || null, input.toState, input.reason, input.actorUserId || null, input.ingestionEventId || null, input.version]);
  await appendAudit(client, { tenantId: input.tenantId, eventType: `${input.entityType}_${input.toState}`, entityType: input.entityType, entityId: input.entityId, actorUserId: input.actorUserId, requestId: input.requestId, eventData: { fromState: input.fromState || null, toState: input.toState, reason: input.reason, version: input.version } });
}

export async function createInstrument(user: AuthUser, body: any, requestId?: string) {
  const client = await db.connect();
  try {
    await client.query('BEGIN'); const instrumentId = id();
    const calibratedAt = instant(body.calibratedAt, 'calibratedAt'); const dueAt = instant(body.calibrationDueAt, 'calibrationDueAt');
    if (dueAt <= calibratedAt) throw new DomainError(400, 'VALIDATION_ERROR', 'calibrationDueAt must be after calibratedAt');
    await client.query(`INSERT INTO tsc_instruments (id,tenant_id,external_key,source_system,name,instrument_type,serial_number,state,calibrated_at,calibration_due_at,created_by) VALUES ($1,$2,$3,$4,$5,$6,$7,'ACTIVE',$8,$9,$10)`, [instrumentId, user.tenantId, requiredText(body.externalKey, 'externalKey', 120), requiredText(body.sourceSystem, 'sourceSystem', 80), requiredText(body.name, 'name', 200), oneOf(body.instrumentType, 'instrumentType', INSTRUMENT_TYPES), requiredText(body.serialNumber, 'serialNumber', 120), calibratedAt, dueAt, user.id]);
    await transition(client, { tenantId: user.tenantId, entityType: 'INSTRUMENT', entityId: instrumentId, toState: 'ACTIVE', reason: requiredText(body.reason, 'reason', 500), actorUserId: user.id, version: 1, requestId });
    await client.query('COMMIT'); return { id: instrumentId, state: 'ACTIVE' };
  } catch (error) { await client.query('ROLLBACK'); if ((error as any).code === '23505') throw new DomainError(409, 'INSTRUMENT_ALREADY_EXISTS', 'Instrument key or serial number already exists in this tenant'); throw error; }
  finally { client.release(); }
}

export async function calibrateInstrument(user: AuthUser, instrumentId: string, body: any, requestId?: string) {
  instrumentId = uuid(instrumentId); const client = await db.connect();
  try {
    await client.query('BEGIN'); const instrument = await one<any>(client, 'SELECT * FROM tsc_instruments WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [instrumentId, user.tenantId], 'INSTRUMENT_NOT_FOUND', 'Instrument does not exist');
    const expectedVersion = integer(body.expectedVersion, 'expectedVersion', 1, 1_000_000); if (instrument.version !== expectedVersion) throw new DomainError(409, 'VERSION_CONFLICT', 'Instrument was changed by another request');
    if (instrument.state === 'RETIRED') throw new DomainError(409, 'INSTRUMENT_RETIRED', 'A retired instrument cannot be calibrated');
    const calibratedAt = instant(body.calibratedAt, 'calibratedAt'); const dueAt = instant(body.calibrationDueAt, 'calibrationDueAt'); if (dueAt <= calibratedAt) throw new DomainError(400, 'VALIDATION_ERROR', 'calibrationDueAt must be after calibratedAt');
    await client.query(`UPDATE tsc_instruments SET calibrated_at=$3,calibration_due_at=$4,state='ACTIVE',version=version+1,updated_at=NOW() WHERE id=$1 AND tenant_id=$2`, [instrumentId, user.tenantId, calibratedAt, dueAt]);
    await transition(client, { tenantId: user.tenantId, entityType: 'INSTRUMENT', entityId: instrumentId, fromState: instrument.state, toState: 'ACTIVE', reason: requiredText(body.reason, 'reason', 500), actorUserId: user.id, version: instrument.version + 1, requestId });
    await client.query('COMMIT'); return { id: instrumentId, state: 'ACTIVE', version: instrument.version + 1 };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function createSample(user: AuthUser, body: any, requestId?: string) {
  const sampleId = id(); const client = await db.connect();
  try {
    await client.query('BEGIN'); await client.query(`INSERT INTO tsc_samples (id,tenant_id,sample_code,description,matrix,state,created_by) VALUES ($1,$2,$3,$4,$5,'ACTIVE',$6)`, [sampleId, user.tenantId, requiredText(body.sampleCode, 'sampleCode', 120), requiredText(body.description, 'description', 300), requiredText(body.matrix, 'matrix', 100), user.id]);
    await transition(client, { tenantId: user.tenantId, entityType: 'SAMPLE', entityId: sampleId, toState: 'ACTIVE', reason: requiredText(body.reason, 'reason', 500), actorUserId: user.id, version: 1, requestId }); await client.query('COMMIT'); return { id: sampleId, state: 'ACTIVE' };
  } catch (error) { await client.query('ROLLBACK'); if ((error as any).code === '23505') throw new DomainError(409, 'SAMPLE_ALREADY_EXISTS', 'Sample code already exists in this tenant'); throw error; } finally { client.release(); }
}

function normalizeEnvelope(body: any) {
  const sourceSystem = requiredText(body.sourceSystem, 'sourceSystem', 80); const sourceRecordId = requiredText(body.sourceRecordId, 'sourceRecordId', 180); const instrumentKey = requiredText(body.instrumentKey, 'instrumentKey', 120); const sourceTimestamp = instant(body.sourceTimestamp, 'sourceTimestamp');
  if (sourceTimestamp.getTime() > Date.now() + maxFutureSeconds() * 1000) throw new DomainError(400, 'SOURCE_TIMESTAMP_IN_FUTURE', 'sourceTimestamp exceeds the allowed clock skew');
  if (!body.payload || typeof body.payload !== 'object' || Array.isArray(body.payload)) throw new DomainError(400, 'VALIDATION_ERROR', 'payload must be an object');
  return { sourceSystem, sourceRecordId, instrumentKey, sourceTimestamp, payload: body.payload, checksum: digest({ sourceSystem, sourceRecordId, instrumentKey, sourceTimestamp: sourceTimestamp.toISOString(), payload: body.payload }) };
}

export async function ingest(user: AuthUser, body: any, requestId?: string) {
  const envelope = normalizeEnvelope(body);
  if (user.serviceSourceSystem !== envelope.sourceSystem || user.serviceInstrumentKey !== envelope.instrumentKey) throw new DomainError(403, 'SERVICE_BINDING_MISMATCH', 'Instrument-service identity is not bound to this source and instrument');
  const client = await db.connect();
  try {
    await client.query('BEGIN'); await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`ingest:${user.tenantId}:${envelope.sourceSystem}:${envelope.sourceRecordId}`]);
    const existing = (await client.query('SELECT * FROM tsc_ingestion_events WHERE tenant_id=$1 AND source_system=$2 AND source_record_id=$3', [user.tenantId, envelope.sourceSystem, envelope.sourceRecordId])).rows[0];
    if (existing) { await client.query('COMMIT'); if (existing.payload_checksum === envelope.checksum) return { replayed: true, event: existing }; throw new DomainError(409, 'DUPLICATE_EVENT_CONFLICT', 'The source record id was already used with different content'); }
    const eventId = id();
    await client.query(`INSERT INTO tsc_ingestion_events (id,tenant_id,source_system,source_record_id,source_timestamp,payload_checksum,payload,status) VALUES ($1,$2,$3,$4,$5,$6,$7,'RECEIVED')`, [eventId, user.tenantId, envelope.sourceSystem, envelope.sourceRecordId, envelope.sourceTimestamp, envelope.checksum, envelope.payload]);
    await client.query('SAVEPOINT process_packet');
    try {
      const instrument = await one<any>(client, 'SELECT * FROM tsc_instruments WHERE tenant_id=$1 AND external_key=$2 AND source_system=$3', [user.tenantId, envelope.instrumentKey, envelope.sourceSystem], 'INSTRUMENT_SOURCE_NOT_AUTHORIZED', 'Source is not bound to this tenant instrument');
      const packet = parsePacket(envelope.payload); if (packet.capturedAt.getTime() > Date.now() + maxFutureSeconds() * 1000) throw new DomainError(400, 'CAPTURE_TIMESTAMP_IN_FUTURE', 'capturedAt exceeds the allowed clock skew');
      if ((await client.query('SELECT 1 FROM tsc_assay_runs WHERE tenant_id=$1 AND external_run_key=$2', [user.tenantId, packet.externalRunKey])).rowCount) throw new DomainError(409, 'RUN_ALREADY_EXISTS', 'externalRunKey is immutable and already exists');
      const codes = [...new Set(packet.measurements.map(row => row.sampleCode))];
      const samples = (await client.query(`SELECT * FROM tsc_samples WHERE tenant_id=$1 AND sample_code=ANY($2::text[])`, [user.tenantId, codes])).rows; const sampleByCode = new Map(samples.map(row => [row.sample_code, row]));
      const missing = codes.filter(code => !sampleByCode.get(code) || sampleByCode.get(code).state !== 'ACTIVE'); if (missing.length) throw new DomainError(422, 'UNKNOWN_OR_INACTIVE_SAMPLE', 'Every measurement must reference an active tenant sample', { sampleCodes: missing });
      const findings = validateMeasurements(packet);
      if (instrument.state !== 'ACTIVE') findings.push({ code: 'INSTRUMENT_NOT_ACTIVE', severity: 'ERROR' as const, message: `Instrument state ${instrument.state} is not eligible for data release`, evidence: { state: instrument.state } });
      if (packet.capturedAt < new Date(instrument.calibrated_at) || packet.capturedAt > new Date(instrument.calibration_due_at)) findings.push({ code: 'CALIBRATION_OUT_OF_WINDOW', severity: 'ERROR' as const, message: 'Run was captured outside the instrument calibration window', evidence: { calibratedAt: instrument.calibrated_at, calibrationDueAt: instrument.calibration_due_at, capturedAt: packet.capturedAt } });
      const duplicate = findings.find(item => item.code === 'DUPLICATE_REPLICATE'); if (duplicate) throw new DomainError(422, duplicate.code, duplicate.message, duplicate.evidence);
      let revision: any = null;
      if (packet.revisionOfRunId) { revision = await one<any>(client, 'SELECT * FROM tsc_assay_runs WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [packet.revisionOfRunId, user.tenantId], 'REVISION_TARGET_NOT_FOUND', 'Revision target does not exist in this tenant'); if (revision.state !== 'QUARANTINED') throw new DomainError(409, 'REVISION_TARGET_NOT_QUARANTINED', 'Only a quarantined run may be corrected'); }
      const runId = id(); const state = findings.some(item => item.severity === 'ERROR') ? 'QUARANTINED' : 'VALIDATED';
      await client.query(`INSERT INTO tsc_assay_runs (id,tenant_id,instrument_id,ingestion_event_id,external_run_key,protocol_id,protocol_version,assay_type,required_analyte,result_unit,minimum_replicates,lower_bound,upper_bound,captured_at,state,revision_of_id) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)`, [runId, user.tenantId, instrument.id, eventId, packet.externalRunKey, packet.protocol.id, packet.protocol.version, packet.protocol.assayType, packet.protocol.requiredAnalyte, packet.protocol.resultUnit, packet.protocol.minimumReplicates, packet.protocol.lowerBound, packet.protocol.upperBound, packet.capturedAt, state, packet.revisionOfRunId]);
      for (const row of packet.measurements) await client.query(`INSERT INTO tsc_measurements (id,tenant_id,assay_run_id,sample_id,analyte,value,unit,replicate,qualifier) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`, [id(), user.tenantId, runId, sampleByCode.get(row.sampleCode).id, row.analyte, row.value, row.unit, row.replicate, row.qualifier]);
      for (const finding of findings) await client.query(`INSERT INTO tsc_validation_findings (id,tenant_id,assay_run_id,code,severity,message,evidence) VALUES ($1,$2,$3,$4,$5,$6,$7)`, [id(), user.tenantId, runId, finding.code, finding.severity, finding.message, finding.evidence]);
      await client.query(`UPDATE tsc_ingestion_events SET instrument_id=$2,status='PROCESSED',assay_run_id=$3 WHERE id=$1`, [eventId, instrument.id, runId]);
      await transition(client, { tenantId: user.tenantId, entityType: 'ASSAY_RUN', entityId: runId, toState: state, reason: state === 'VALIDATED' ? 'Deterministic validation passed' : 'Deterministic validation found release-blocking errors', actorUserId: user.id, ingestionEventId: eventId, version: 1, requestId });
      if (revision && state === 'VALIDATED') { await client.query(`UPDATE tsc_assay_runs SET state='WITHDRAWN',version=version+1 WHERE id=$1`, [revision.id]); await transition(client, { tenantId: user.tenantId, entityType: 'ASSAY_RUN', entityId: revision.id, fromState: revision.state, toState: 'WITHDRAWN', reason: `Superseded by corrected run ${packet.externalRunKey}`, actorUserId: user.id, ingestionEventId: eventId, version: revision.version + 1, requestId }); }
      await client.query('RELEASE SAVEPOINT process_packet'); await client.query('COMMIT'); return { replayed: false, event: { id: eventId, status: 'PROCESSED' }, run: { id: runId, state, findings } };
    } catch (error) {
      await client.query('ROLLBACK TO SAVEPOINT process_packet'); const domainError = error instanceof DomainError ? error : new DomainError(500, 'INGESTION_PROCESSING_ERROR', 'Instrument packet could not be processed');
      await client.query(`UPDATE tsc_ingestion_events SET status=$2,error_code=$3,error_message=$4 WHERE id=$1`, [eventId, error instanceof DomainError ? 'REJECTED' : 'ERROR', domainError.code, domainError.message.slice(0, 300)]);
      await appendAudit(client, { tenantId: user.tenantId, eventType: 'INGESTION_REJECTED', entityType: 'INGESTION_EVENT', entityId: eventId, actorUserId: user.id, requestId, eventData: { code: domainError.code, sourceSystem: envelope.sourceSystem, sourceRecordId: envelope.sourceRecordId } });
      await client.query('COMMIT'); domainError.eventId = eventId; throw domainError;
    }
  } catch (error) { try { await client.query('ROLLBACK'); } catch { /* already closed */ } throw error; } finally { client.release(); }
}

export async function submitRun(user: AuthUser, runId: string, body: any, requestId?: string) {
  runId = uuid(runId); const client = await db.connect();
  try {
    await client.query('BEGIN'); const run = await one<any>(client, 'SELECT * FROM tsc_assay_runs WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [runId, user.tenantId], 'RUN_NOT_FOUND', 'Assay run does not exist'); const decisionId = requiredText(body.clientDecisionId, 'clientDecisionId', 120); const reason = requiredText(body.reason, 'reason', 500);
    const existing = (await client.query(`SELECT * FROM tsc_review_decisions WHERE tenant_id=$1 AND assay_run_id=$2 AND client_decision_id=$3`, [user.tenantId, runId, decisionId])).rows[0]; if (existing) { if (existing.stage !== 'SCIENTIST_SUBMISSION' || existing.decision !== 'APPROVE' || existing.reason !== reason || existing.actor_user_id !== user.id) throw new DomainError(409, 'DECISION_ID_CONFLICT', 'clientDecisionId was already used for different decision content'); await client.query('COMMIT'); return { replayed: true, runId, state: run.state }; }
    if (run.state !== 'VALIDATED') throw new DomainError(409, 'RUN_NOT_VALIDATED', `Run state ${run.state} cannot be submitted`);
    await client.query(`INSERT INTO tsc_review_decisions (id,tenant_id,assay_run_id,client_decision_id,stage,decision,reason,signature_statement,actor_user_id) VALUES ($1,$2,$3,$4,'SCIENTIST_SUBMISSION','APPROVE',$5,$6,$7)`, [id(), user.tenantId, runId, decisionId, reason, `Scientist ${user.name} submitted validated evidence for independent quality review`, user.id]);
    await client.query(`UPDATE tsc_assay_runs SET state='SUBMITTED',submitted_by=$2,submitted_at=NOW(),version=version+1 WHERE id=$1`, [runId, user.id]); await transition(client, { tenantId: user.tenantId, entityType: 'ASSAY_RUN', entityId: runId, fromState: 'VALIDATED', toState: 'SUBMITTED', reason, actorUserId: user.id, version: run.version + 1, requestId }); await client.query('COMMIT'); return { replayed: false, runId, state: 'SUBMITTED' };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function releaseRun(user: AuthUser, runId: string, body: any, requestId?: string) {
  runId = uuid(runId); const decision = oneOf(body.decision, 'decision', ['APPROVE','REJECT'] as const); const decisionId = requiredText(body.clientDecisionId, 'clientDecisionId', 120); const reason = requiredText(body.reason, 'reason', 500); const password = secret(body.password, 'password'); const client = await db.connect();
  try {
    await client.query('BEGIN'); const run = await one<any>(client, 'SELECT * FROM tsc_assay_runs WHERE id=$1 AND tenant_id=$2 FOR UPDATE', [runId, user.tenantId], 'RUN_NOT_FOUND', 'Assay run does not exist'); const existing = (await client.query('SELECT * FROM tsc_review_decisions WHERE tenant_id=$1 AND assay_run_id=$2 AND client_decision_id=$3', [user.tenantId, runId, decisionId])).rows[0]; if (existing) { if (existing.stage !== 'QUALITY_RELEASE' || existing.decision !== decision || existing.reason !== reason || existing.actor_user_id !== user.id) throw new DomainError(409, 'DECISION_ID_CONFLICT', 'clientDecisionId was already used for different decision content'); await client.query('COMMIT'); return { replayed: true, runId, state: run.state }; }
    if (run.state !== 'SUBMITTED') throw new DomainError(409, 'RUN_NOT_SUBMITTED', `Run state ${run.state} cannot receive a quality decision`); if (run.submitted_by === user.id) throw new DomainError(409, 'SEPARATION_OF_DUTIES', 'The submitting scientist cannot perform quality release');
    const actor = await one<any>(client, 'SELECT password_hash,active FROM tsc_users WHERE id=$1 AND tenant_id=$2', [user.id, user.tenantId], 'USER_NOT_FOUND', 'Reviewer account does not exist'); if (!actor.active || !(await bcrypt.compare(password, actor.password_hash))) throw new DomainError(401, 'E_SIGNATURE_FAILED', 'Password reauthentication failed');
    const state = decision === 'APPROVE' ? 'RELEASED' : 'REJECTED'; const statement = `I, ${user.name}, reviewed the assay evidence and ${decision === 'APPROVE' ? 'approve release' : 'reject release'} under my authenticated identity`;
    await client.query(`INSERT INTO tsc_review_decisions (id,tenant_id,assay_run_id,client_decision_id,stage,decision,reason,signature_statement,actor_user_id) VALUES ($1,$2,$3,$4,'QUALITY_RELEASE',$5,$6,$7,$8)`, [id(), user.tenantId, runId, decisionId, decision, reason, statement, user.id]);
    await client.query(`UPDATE tsc_assay_runs SET state=$2,released_by=$3,released_at=NOW(),version=version+1 WHERE id=$1`, [runId, state, user.id]); await transition(client, { tenantId: user.tenantId, entityType: 'ASSAY_RUN', entityId: runId, fromState: 'SUBMITTED', toState: state, reason, actorUserId: user.id, version: run.version + 1, requestId }); await client.query('COMMIT'); return { replayed: false, runId, state };
  } catch (error) { await client.query('ROLLBACK'); throw error; } finally { client.release(); }
}

export async function dashboard(user: AuthUser) {
  const [counts, runs, instruments, samples, ingestions] = await Promise.all([
    db.query(`SELECT (SELECT count(*) FROM tsc_assay_runs WHERE tenant_id=$1)::int runs,(SELECT count(*) FROM tsc_assay_runs WHERE tenant_id=$1 AND state='QUARANTINED')::int quarantined,(SELECT count(*) FROM tsc_assay_runs WHERE tenant_id=$1 AND state='SUBMITTED')::int awaiting_quality,(SELECT count(*) FROM tsc_assay_runs WHERE tenant_id=$1 AND state='RELEASED')::int released,(SELECT count(*) FROM tsc_ingestion_events WHERE tenant_id=$1 AND status IN ('REJECTED','ERROR'))::int rejected_ingestions`, [user.tenantId]),
    db.query(`SELECT r.*,i.name instrument_name,i.external_key,(SELECT count(*)::int FROM tsc_measurements m WHERE m.assay_run_id=r.id) measurement_count,(SELECT count(*)::int FROM tsc_validation_findings f WHERE f.assay_run_id=r.id AND f.severity='ERROR') error_count FROM tsc_assay_runs r JOIN tsc_instruments i ON i.id=r.instrument_id WHERE r.tenant_id=$1 ORDER BY r.created_at DESC LIMIT 100`, [user.tenantId]),
    db.query(`SELECT id,external_key,source_system,name,instrument_type,serial_number,state,calibrated_at,calibration_due_at,version FROM tsc_instruments WHERE tenant_id=$1 ORDER BY name`, [user.tenantId]),
    db.query(`SELECT id,sample_code,description,matrix,state,version,created_at FROM tsc_samples WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100`, [user.tenantId]),
    db.query(`SELECT id,source_system,source_record_id,source_timestamp,received_at,status,error_code,error_message,assay_run_id FROM tsc_ingestion_events WHERE tenant_id=$1 ORDER BY received_at DESC LIMIT 100`, [user.tenantId]),
  ]);
  return { counts: counts.rows[0], runs: runs.rows, instruments: instruments.rows, samples: samples.rows, ingestions: ingestions.rows };
}

export async function evidence(user: AuthUser, runId: string) {
  runId = uuid(runId); const run = await one<any>(db, `SELECT r.*,i.name instrument_name,i.external_key,i.serial_number FROM tsc_assay_runs r JOIN tsc_instruments i ON i.id=r.instrument_id WHERE r.id=$1 AND r.tenant_id=$2`, [runId, user.tenantId], 'RUN_NOT_FOUND', 'Assay run does not exist');
  const [measurements, findings, decisions, transitions] = await Promise.all([
    db.query(`SELECT m.*,s.sample_code FROM tsc_measurements m JOIN tsc_samples s ON s.id=m.sample_id WHERE m.assay_run_id=$1 AND m.tenant_id=$2 ORDER BY s.sample_code,m.analyte,m.replicate`, [runId, user.tenantId]), db.query('SELECT * FROM tsc_validation_findings WHERE assay_run_id=$1 AND tenant_id=$2 ORDER BY created_at,id', [runId, user.tenantId]), db.query(`SELECT d.id,d.stage,d.decision,d.reason,d.signature_statement,d.decided_at,u.name actor_name,u.email actor_email FROM tsc_review_decisions d JOIN tsc_users u ON u.id=d.actor_user_id WHERE d.assay_run_id=$1 AND d.tenant_id=$2 ORDER BY d.decided_at`, [runId, user.tenantId]), db.query(`SELECT * FROM tsc_state_transitions WHERE entity_type='ASSAY_RUN' AND entity_id=$1 AND tenant_id=$2 ORDER BY occurred_at,id`, [runId, user.tenantId])
  ]); return { run, measurements: measurements.rows, findings: findings.rows, decisions: decisions.rows, transitions: transitions.rows };
}

export async function verifyAudit(user: AuthUser) {
  const rows = (await db.query('SELECT * FROM tsc_audit_events WHERE tenant_id=$1 ORDER BY tenant_sequence', [user.tenantId])).rows; return { ...verifyAuditRows(rows), events: rows.length, lastHash: rows.at(-1)?.event_hash || null };
}
