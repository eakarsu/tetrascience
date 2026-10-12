import { Router, Response, NextFunction } from 'express';
import { db } from '../core/db';
import { id, requiredText } from '../core/domain';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { generateAssayReadinessEvidence } from '../services/openrouterEvidence';
import { advisoryRoles, requestScope, saveAdvisory } from '../services/advisoryCancellation';

const router = Router();
router.get('/assay-readiness', authMiddleware, requireRole(...advisoryRoles), async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const rows = (await db.query(`SELECT id,input,result_text,provider_model,created_at FROM tsc_runtime_ai_results WHERE tenant_id=$1 AND user_id=$2 AND feature='assay-readiness' ORDER BY created_at DESC,id DESC LIMIT 50`, [req.user!.tenantId, req.user!.id])).rows;
    res.json({ reports: rows.map(row => ({ id: row.id, prompt: row.input.workflowSummary, content: row.result_text, model: row.provider_model, createdAt: row.created_at })) });
  } catch (error) { next(error); }
});
router.post('/assay-readiness', authMiddleware, requireRole(...advisoryRoles), async (req: AuthRequest, res: Response, next: NextFunction) => {
  const scope = requestScope(req, res);
  try {
    const workflowSummary = requiredText(req.body?.workflowSummary, 'workflowSummary', 2000);
    const evidence = await generateAssayReadinessEvidence(workflowSummary, scope.signal);
    const analysisId = id();
    const saved = await saveAdvisory(req.user!, scope.signal, async transaction => (await transaction.query(
      `INSERT INTO tsc_runtime_ai_results(id,tenant_id,user_id,feature,input,provider_request_id,provider_model,result_text,provider_receipt) VALUES($1,$2,$3,'assay-readiness',$4::jsonb,$5,$6,$7,$8::jsonb) RETURNING created_at`,
      [analysisId, req.user!.tenantId, req.user!.id, JSON.stringify({ workflowSummary }), evidence.receipt.requestId, evidence.receipt.model, evidence.content, JSON.stringify(evidence.receipt)],
    )).rows[0]);
    scope.signal.throwIfAborted(); res.json({ id: analysisId, analysisId, result: evidence.content, model: evidence.receipt.model, providerReceipt: evidence.receipt, createdAt: saved.created_at, advisoryOnly: true });
  } catch (error) { if (!scope.signal.aborted && !res.destroyed) next(error); }
  finally { scope.dispose(); }
});
export default router;
