import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import { appendAudit } from '../core/audit';
import { db } from '../core/db';
import { requiredText } from '../core/domain';
import { loginLockMinutes, required } from '../core/runtime';
import { authMiddleware, AuthRequest } from '../middleware/auth';

const router = Router();
router.post('/login', rateLimit({ windowMs: 15 * 60_000, limit: 10, standardHeaders: true, legacyHeaders: false }), async (req: AuthRequest, res: Response) => {
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : ''; const password = typeof req.body?.password === 'string' ? req.body.password : '';
  if (!email || password.length < 12 || password.length > 200) { res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } }); return; }
  const client = await db.connect();
  try {
    await client.query('BEGIN');
    const user = (await client.query(`SELECT u.*,t.status tenant_status FROM tsc_users u JOIN tsc_tenants t ON t.id=u.tenant_id WHERE u.email=$1 FOR UPDATE OF u`, [email])).rows[0];
    const currentlyLocked = Boolean(user?.locked_until && new Date(user.locked_until) > new Date());
    if (!user || !user.active || user.tenant_status !== 'ACTIVE' || currentlyLocked || !(await bcrypt.compare(password, user.password_hash))) {
      if (user) {
        const attempts = currentlyLocked ? Number(user.failed_login_count) : Number(user.failed_login_count) + 1; const locked = currentlyLocked ? user.locked_until : attempts >= 5 ? new Date(Date.now() + loginLockMinutes() * 60_000) : null;
        await client.query('UPDATE tsc_users SET failed_login_count=$2,locked_until=$3 WHERE id=$1', [user.id, attempts >= 5 ? 0 : attempts, locked]);
        await appendAudit(client, { tenantId: user.tenant_id, eventType: 'LOGIN_FAILED', entityType: 'USER', entityId: user.id, requestId: req.requestId, eventData: { locked: Boolean(locked) } });
      }
      await client.query('COMMIT'); res.status(401).json({ error: { code: 'INVALID_CREDENTIALS', message: 'Invalid credentials' } }); return;
    }
    await client.query('UPDATE tsc_users SET failed_login_count=0,locked_until=NULL,last_login_at=NOW() WHERE id=$1', [user.id]);
    await appendAudit(client, { tenantId: user.tenant_id, eventType: 'LOGIN_SUCCEEDED', entityType: 'USER', entityId: user.id, actorUserId: user.id, requestId: req.requestId, eventData: { role: user.role } });
    await client.query('COMMIT');
    const claims = { id: user.id, email: user.email, name: user.name, role: user.role, tenantId: user.tenant_id };
    const token = jwt.sign(claims, required('JWT_SECRET', 32), { algorithm: 'HS256', issuer: 'tetrascience', audience: 'assay-review-ui', expiresIn: '8h' });
    res.json({ token, user: claims });
  } catch (error) { await client.query('ROLLBACK'); res.status(503).set('Retry-After', '5').json({ error: { code: 'AUTH_UNAVAILABLE', message: 'Authentication is temporarily unavailable' } }); }
  finally { client.release(); }
});
router.get('/me', authMiddleware, async (req: AuthRequest, res: Response) => {
  const user = (await db.query(`SELECT id,email,name,role,tenant_id "tenantId",active,last_login_at "lastLoginAt" FROM tsc_users WHERE id=$1 AND tenant_id=$2`, [req.user!.id, req.user!.tenantId])).rows[0];
  if (!user?.active) { res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'User is not active' } }); return; }
  res.json(user);
});
export default router;
