import crypto from 'crypto';

export class DomainError extends Error {
  constructor(public status: number, public code: string, message: string, public details?: unknown, public eventId?: string) { super(message); this.name = 'DomainError'; }
}
export const id = () => crypto.randomUUID();
export const canonicalize = (value: unknown): unknown => {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value && typeof value === 'object') return Object.keys(value as object).sort().reduce<Record<string, unknown>>((out, key) => { out[key] = canonicalize((value as Record<string, unknown>)[key]); return out; }, {});
  return value;
};
export const digest = (value: unknown) => crypto.createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex');
export const requiredText = (value: unknown, label: string, max = 255): string => {
  const result = typeof value === 'string' ? value.trim() : '';
  if (!result || result.length > max || /[\u0000-\u001f\u007f]/.test(result)) throw new DomainError(400, 'VALIDATION_ERROR', `${label} is required and must be at most ${max} characters`);
  return result;
};
export const optionalText = (value: unknown, label: string, max = 255): string | null => value == null || value === '' ? null : requiredText(value, label, max);
export const secret = (value: unknown, label: string): string => {
  if (typeof value !== 'string' || value.length < 12 || value.length > 200 || /[\u0000-\u001f\u007f]/.test(value)) throw new DomainError(400, 'VALIDATION_ERROR', `${label} must contain 12 to 200 valid characters`);
  return value;
};
export const oneOf = <T extends string>(value: unknown, label: string, values: readonly T[]): T => {
  const result = requiredText(value, label, 80).toUpperCase() as T;
  if (!values.includes(result)) throw new DomainError(400, 'VALIDATION_ERROR', `${label} must be one of ${values.join(', ')}`);
  return result;
};
export const finiteNumber = (value: unknown, label: string, min = -1e15, max = 1e15): number => {
  const result = Number(value);
  if (!Number.isFinite(result) || result < min || result > max) throw new DomainError(400, 'VALIDATION_ERROR', `${label} must be between ${min} and ${max}`);
  return result;
};
export const integer = (value: unknown, label: string, min: number, max: number): number => {
  const result = finiteNumber(value, label, min, max);
  if (!Number.isInteger(result)) throw new DomainError(400, 'VALIDATION_ERROR', `${label} must be an integer`);
  return result;
};
export const instant = (value: unknown, label: string): Date => {
  const result = new Date(value as string);
  if (!value || Number.isNaN(result.getTime())) throw new DomainError(400, 'VALIDATION_ERROR', `${label} must be an ISO-8601 timestamp`);
  return result;
};
export const uuid = (value: unknown, label = 'id'): string => {
  const result = requiredText(value, label, 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(result)) throw new DomainError(400, 'VALIDATION_ERROR', `${label} must be a UUID`);
  return result;
};
