import { DomainError, finiteNumber, instant, integer, oneOf, requiredText, uuid } from './domain';

export const ASSAY_TYPES = ['POTENCY','PURITY','BINDING','CELL_VIABILITY'] as const;
export const UNITS = ['RFU','PERCENT','NM','MG_PER_ML'] as const;
export interface MeasurementInput { sampleId?: string; sampleCode: string; analyte: string; value: number; unit: string; replicate: number; qualifier: string; }
export interface Packet { externalRunKey: string; capturedAt: Date; protocol: { id: string; version: string; assayType: typeof ASSAY_TYPES[number]; requiredAnalyte: string; resultUnit: typeof UNITS[number]; minimumReplicates: number; lowerBound: number | null; upperBound: number | null; }; measurements: MeasurementInput[]; revisionOfRunId: string | null; }

export function parsePacket(payload: any): Packet {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) throw new DomainError(400, 'VALIDATION_ERROR', 'payload must be an object');
  if (!payload.protocol || typeof payload.protocol !== 'object') throw new DomainError(400, 'VALIDATION_ERROR', 'payload.protocol is required');
  if (!Array.isArray(payload.measurements) || payload.measurements.length < 1 || payload.measurements.length > 5000) throw new DomainError(400, 'VALIDATION_ERROR', 'measurements must contain 1 to 5000 rows');
  const lower = payload.protocol.lowerBound == null ? null : finiteNumber(payload.protocol.lowerBound, 'protocol.lowerBound');
  const upper = payload.protocol.upperBound == null ? null : finiteNumber(payload.protocol.upperBound, 'protocol.upperBound');
  if (lower != null && upper != null && lower > upper) throw new DomainError(400, 'VALIDATION_ERROR', 'protocol.lowerBound cannot exceed upperBound');
  return {
    externalRunKey: requiredText(payload.externalRunKey, 'externalRunKey', 160), capturedAt: instant(payload.capturedAt, 'capturedAt'),
    protocol: { id: requiredText(payload.protocol.id, 'protocol.id', 120), version: requiredText(payload.protocol.version, 'protocol.version', 40), assayType: oneOf(payload.protocol.assayType, 'protocol.assayType', ASSAY_TYPES), requiredAnalyte: requiredText(payload.protocol.requiredAnalyte, 'protocol.requiredAnalyte', 120), resultUnit: oneOf(payload.protocol.resultUnit, 'protocol.resultUnit', UNITS), minimumReplicates: integer(payload.protocol.minimumReplicates, 'protocol.minimumReplicates', 1, 12), lowerBound: lower, upperBound: upper },
    measurements: payload.measurements.map((row: any, index: number) => ({ sampleCode: requiredText(row.sampleCode, `measurements[${index}].sampleCode`, 120), analyte: requiredText(row.analyte, `measurements[${index}].analyte`, 120), value: finiteNumber(row.value, `measurements[${index}].value`), unit: oneOf(row.unit, `measurements[${index}].unit`, UNITS), replicate: integer(row.replicate, `measurements[${index}].replicate`, 1, 12), qualifier: oneOf(row.qualifier || 'NONE', `measurements[${index}].qualifier`, ['NONE','LT','GT'] as const) })),
    revisionOfRunId: payload.revisionOfRunId == null ? null : uuid(payload.revisionOfRunId, 'revisionOfRunId'),
  };
}

export interface Finding { code: string; severity: 'WARNING' | 'ERROR'; message: string; evidence: Record<string, unknown>; }
export function validateMeasurements(packet: Packet): Finding[] {
  const findings: Finding[] = []; const keys = new Set<string>(); const replicates = new Map<string, Set<number>>();
  for (const row of packet.measurements) {
    const key = `${row.sampleCode}:${row.analyte}:${row.replicate}`;
    if (keys.has(key)) findings.push({ code: 'DUPLICATE_REPLICATE', severity: 'ERROR', message: `Duplicate replicate ${row.replicate} for ${row.sampleCode}/${row.analyte}`, evidence: { sampleCode: row.sampleCode, analyte: row.analyte, replicate: row.replicate } });
    keys.add(key);
    if (row.analyte !== packet.protocol.requiredAnalyte) findings.push({ code: 'ANALYTE_MISMATCH', severity: 'ERROR', message: `${row.sampleCode} uses unexpected analyte ${row.analyte}`, evidence: { expected: packet.protocol.requiredAnalyte, actual: row.analyte } });
    if (row.unit !== packet.protocol.resultUnit) findings.push({ code: 'UNIT_MISMATCH', severity: 'ERROR', message: `${row.sampleCode} uses ${row.unit}; protocol requires ${packet.protocol.resultUnit}`, evidence: { expected: packet.protocol.resultUnit, actual: row.unit } });
    const group = `${row.sampleCode}:${row.analyte}`; if (!replicates.has(group)) replicates.set(group, new Set()); replicates.get(group)!.add(row.replicate);
    if (packet.protocol.lowerBound != null && row.value < packet.protocol.lowerBound) findings.push({ code: 'BELOW_PROTOCOL_RANGE', severity: 'WARNING', message: `${row.sampleCode} result is below the protocol range`, evidence: { value: row.value, lowerBound: packet.protocol.lowerBound } });
    if (packet.protocol.upperBound != null && row.value > packet.protocol.upperBound) findings.push({ code: 'ABOVE_PROTOCOL_RANGE', severity: 'WARNING', message: `${row.sampleCode} result is above the protocol range`, evidence: { value: row.value, upperBound: packet.protocol.upperBound } });
  }
  for (const [group, values] of replicates) if (values.size < packet.protocol.minimumReplicates) findings.push({ code: 'INSUFFICIENT_REPLICATES', severity: 'ERROR', message: `${group} has ${values.size} replicates; ${packet.protocol.minimumReplicates} required`, evidence: { actual: values.size, required: packet.protocol.minimumReplicates } });
  return findings;
}
