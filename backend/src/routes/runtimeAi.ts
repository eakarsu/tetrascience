import { Router, Response } from 'express';
import { db } from '../core/db';
import { id, requiredText } from '../core/domain';
import { authMiddleware, AuthRequest, requireRole } from '../middleware/auth';
import { generateAssayReadinessEvidence } from '../services/openrouterEvidence';

const router = Router();

router.post('/assay-readiness', authMiddleware, requireRole('TENANT_ADMIN', 'SCIENTIST', 'QUALITY_REVIEWER', 'AUDITOR'), async (req: AuthRequest, res: Response) => {
  const workflowSummary = requiredText(req.body?.workflowSummary, 'workflowSummary', 2000);
  const evidence = await generateAssayReadinessEvidence(workflowSummary);
  const analysisId = id();
  await db.query(
    `INSERT INTO tsc_runtime_ai_results(id,tenant_id,user_id,feature,input,provider_request_id,provider_model,result_text,provider_receipt)
     VALUES ($1,$2,$3,'assay-readiness',$4::jsonb,$5,$6,$7,$8::jsonb)`,
    [analysisId, req.user!.tenantId, req.user!.id, JSON.stringify({ workflowSummary }), evidence.receipt.requestId, evidence.receipt.model, evidence.content, JSON.stringify(evidence.receipt)],
  );
  res.json({ analysisId, result: evidence.content, providerReceipt: evidence.receipt, advisoryOnly: true });
});

export default router;
