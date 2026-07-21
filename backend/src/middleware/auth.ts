import { NextFunction, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { required } from '../core/runtime';
import { db } from '../core/db';

export type Role = 'TENANT_ADMIN' | 'SCIENTIST' | 'QUALITY_REVIEWER' | 'INSTRUMENT_SERVICE' | 'AUDITOR';
export interface AuthUser { id: string; email: string; name: string; role: Role; tenantId: string; serviceSourceSystem?: string | null; serviceInstrumentKey?: string | null; }
export interface AuthRequest extends Request { user?: AuthUser; requestId?: string; }

export async function authMiddleware(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) { res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Bearer token required' } }); return; }
  try {
    const claims = jwt.verify(header.slice(7), required('JWT_SECRET', 32), { algorithms: ['HS256'], issuer: 'tetrascience', audience: 'assay-review-ui' }) as AuthUser;
    const current = (await db.query(`SELECT u.id,u.email,u.name,u.role,u.tenant_id,u.service_source_system,u.service_instrument_key,t.status tenant_status FROM tsc_users u JOIN tsc_tenants t ON t.id=u.tenant_id WHERE u.id=$1 AND u.tenant_id=$2 AND u.active`, [claims.id, claims.tenantId])).rows[0];
    if (!current || current.tenant_status !== 'ACTIVE') { res.status(401).json({ error: { code: 'IDENTITY_INACTIVE', message: 'Identity or tenant is inactive' } }); return; }
    req.user = { id: current.id, email: current.email, name: current.name, role: current.role, tenantId: current.tenant_id, serviceSourceSystem: current.service_source_system, serviceInstrumentKey: current.service_instrument_key };
    next();
  } catch (error: any) { if (['ECONNREFUSED','57P01','57P02','57P03','53300'].includes(error?.code)) res.status(503).set('Retry-After','5').json({ error: { code: 'IDENTITY_STORE_UNAVAILABLE', message: 'Identity validation is temporarily unavailable' } }); else res.status(401).json({ error: { code: 'INVALID_TOKEN', message: 'Token is invalid or expired' } }); }
}
export const requireRole = (...roles: Role[]) => (req: AuthRequest, res: Response, next: NextFunction): void => {
  if (!req.user || !roles.includes(req.user.role)) { res.status(403).json({ error: { code: 'FORBIDDEN', message: `Requires one of: ${roles.join(', ')}` } }); return; }
  next();
};
