import { DbClient } from './db';
import { canonicalize, digest, id } from './domain';

export interface AuditInput { tenantId: string; eventType: string; entityType: string; entityId?: string | null; actorUserId?: string | null; requestId?: string | null; eventData: Record<string, unknown>; occurredAt?: Date; }
export async function appendAudit(client: DbClient, input: AuditInput): Promise<{ sequence: number; hash: string }> {
  await client.query('SELECT pg_advisory_xact_lock(hashtext($1))', [`audit:${input.tenantId}`]);
  const latest = (await client.query('SELECT tenant_sequence,event_hash FROM tsc_audit_events WHERE tenant_id=$1 ORDER BY tenant_sequence DESC LIMIT 1', [input.tenantId])).rows[0];
  const sequence = Number(latest?.tenant_sequence || 0) + 1; const previousHash = latest?.event_hash || '0'.repeat(64); const occurredAt = input.occurredAt || new Date();
  const eventData = canonicalize(input.eventData) as Record<string, unknown>;
  const hash = digest({ tenantId: input.tenantId, sequence, eventType: input.eventType, entityType: input.entityType, entityId: input.entityId || null, actorUserId: input.actorUserId || null, requestId: input.requestId || null, eventData, previousHash, occurredAt: occurredAt.toISOString() });
  await client.query(`INSERT INTO tsc_audit_events (id,tenant_id,tenant_sequence,event_type,entity_type,entity_id,actor_user_id,request_id,event_data,previous_hash,event_hash,occurred_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)`, [id(), input.tenantId, sequence, input.eventType, input.entityType, input.entityId || null, input.actorUserId || null, input.requestId || null, eventData, previousHash, hash, occurredAt]);
  return { sequence, hash };
}

export function verifyAuditRows(rows: any[]): { valid: boolean; brokenAt?: number } {
  let previousHash = '0'.repeat(64); let expectedSequence = 1;
  for (const row of rows) {
    const expected = digest({ tenantId: row.tenant_id, sequence: Number(row.tenant_sequence), eventType: row.event_type, entityType: row.entity_type, entityId: row.entity_id || null, actorUserId: row.actor_user_id || null, requestId: row.request_id || null, eventData: canonicalize(row.event_data), previousHash, occurredAt: new Date(row.occurred_at).toISOString() });
    if (Number(row.tenant_sequence) !== expectedSequence || row.previous_hash !== previousHash || row.event_hash !== expected) return { valid: false, brokenAt: Number(row.tenant_sequence) };
    previousHash = row.event_hash; expectedSequence += 1;
  }
  return { valid: true };
}
