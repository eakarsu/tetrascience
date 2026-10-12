import type { Request, Response } from 'express';
import type { PoolClient } from 'pg';
import { db } from '../core/db';
import { DomainError } from '../core/domain';
import type { AuthUser } from '../middleware/auth';

export const advisoryRoles = ['TENANT_ADMIN', 'SCIENTIST', 'QUALITY_REVIEWER', 'AUDITOR'] as const;
export function requestScope(req: Request, res: Response): { signal: AbortSignal; dispose(): void } {
  const controller = new AbortController();
  const abort = () => controller.abort();
  const close = () => { if (!res.writableEnded) abort(); };
  req.once('aborted', abort); res.once('close', close);
  if (req.aborted || res.destroyed) abort();
  return { signal: controller.signal, dispose() { req.off('aborted', abort); res.off('close', close); } };
}
async function freshActor(transaction: PoolClient, actor: AuthUser) {
  const current = (await transaction.query(`SELECT u.role,t.status FROM tsc_users u JOIN tsc_tenants t ON t.id=u.tenant_id WHERE u.id=$1 AND u.tenant_id=$2 AND u.active`, [actor.id, actor.tenantId])).rows[0];
  if (!current || current.status !== 'ACTIVE') throw new DomainError(401, 'IDENTITY_INACTIVE', 'Identity or tenant is inactive');
  if (!(advisoryRoles as readonly string[]).includes(current.role)) throw new DomainError(403, 'FORBIDDEN', 'This role cannot generate assay operations advice');
}
export async function saveAdvisory<T>(actor: AuthUser, signal: AbortSignal, insert: (transaction: PoolClient) => Promise<T>): Promise<T> {
  signal.throwIfAborted(); const transaction = await db.connect();
  try { await transaction.query('BEGIN'); signal.throwIfAborted(); await freshActor(transaction, actor); const result = await insert(transaction); signal.throwIfAborted(); await freshActor(transaction, actor); signal.throwIfAborted(); await transaction.query('COMMIT'); return result; }
  catch (error) { await transaction.query('ROLLBACK'); throw error; }
  finally { transaction.release(); }
}
