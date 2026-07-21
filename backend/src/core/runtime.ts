import path from 'path';
import dotenv from 'dotenv';
dotenv.config({ path: path.resolve(__dirname, '../../../.env'), quiet: true });

export function csv(name: string): string[] { return (process.env[name] || '').split(',').map(item => item.trim()).filter(Boolean); }
export function required(name: string, min = 1): string {
  const value = process.env[name]?.trim(); if (!value || value.length < min) throw new Error(`${name} is required and must contain at least ${min} characters`); return value;
}
export function numeric(name: string, fallback: number, min: number, max: number): number {
  const value = process.env[name] == null ? fallback : Number(process.env[name]); if (!Number.isFinite(value) || value < min || value > max) throw new Error(`${name} must be between ${min} and ${max}`); return value;
}
export function validateRuntime(): void {
  required('JWT_SECRET', 32);
  if (process.env.NODE_ENV === 'production') {
    required('DATABASE_URL'); const origins = csv('CORS_ORIGINS');
    if (!origins.length || origins.includes('*')) throw new Error('CORS_ORIGINS must contain explicit production origins');
  }
  if (process.env.ENABLE_AI === 'true' || process.env.ENABLE_DEMO_ROUTES === 'true') throw new Error('AI and demo routes are unsupported by the assay-release product');
}
export const maxFutureSeconds = () => numeric('MAX_SOURCE_FUTURE_SECONDS', 300, 0, 3600);
export const loginLockMinutes = () => numeric('LOGIN_LOCK_MINUTES', 15, 1, 1440);
