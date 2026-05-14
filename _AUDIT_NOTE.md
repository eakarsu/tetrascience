# Audit Note - tetrascience

Source: `_AUDIT/reports/batch_11.md` (lines 1124-1174).

## Original Audit Recommendations

### Missing AI Counterparts
- `/literature-mining` for research paper recommendations.
- `/similar-compounds` for drug discovery search.
- `/collaboration-suggestion` for researcher matching.

### Missing Non-AI Features
- Lab notebook (ELN) workflows.
- Data versioning/lineage tracking.
- Integrations with PubChem/ChemSpider/PDB.
- Collaboration/commenting on results.
- Batch/bulk data import.

### Custom Feature Suggestions
1. Literature Mining Agent.
2. Similar Compound Finder.
3. Multi-Modal Data Fusion.
4. Experiment Recommendation Engine.
5. Compliance & Publication Readiness Checker.
6. Researcher Collaboration Network.

## Implementations Applied

Added 3 AI endpoints to `backend/src/routes/ai.ts` using the existing `callOpenRouter` service and Sequelize models:
- `POST /api/ai/literature-mining`
- `POST /api/ai/similar-compounds`
- `POST /api/ai/collaboration-suggestion`

Pattern matches existing routes (same `AuthRequest`, response shape `{ response, model }`, `callOpenRouter` helper). No new dependencies. Each prompt instructs the model that it does not have live external database access, so callers know results are query/strategy-level recommendations.

## Backlog (Prioritized)

### High
- ELN workflow (data model + UI work).
- Data lineage / versioning across pipelines.
- External database integrations (PubChem/PDB) — needs SDK/API decision.

### Medium
- Bulk data import for assays and molecules.
- Comment/collaboration system on experiments.
- Multi-modal data fusion endpoint.

### Low / Product Decisions
- Publication readiness checker.
- Researcher collaboration network UI.

## Apply pass 3 (frontend)

- Verified: `frontend/src/pages/AIResearchToolsPage.tsx` is a tabbed UI that already covers all three new endpoints from pass 2:
  - `literature-mining`, `similar-compounds`, `collaboration-suggestion` (each as its own tool tab, calling `POST /api/ai/<tool>` via the shared `services/api.ts` axios client which includes the bearer token from `localStorage`).
- The page is registered in `App.tsx` at `/ai-research-tools`.
- **Action: LEFT-AS-IS** — frontend is fully wired for all backend AI endpoints added in pass 2.

## Apply pass 4 (mechanical backlog)

Implemented `multi-modal-data-fusion` (backlog Medium item):

- BE (`backend/src/routes/ai.ts`): `POST /api/ai/multi-modal-data-fusion` accepts `moleculeId`, `assayIds`, `documentIds`, `instrumentIds`, and `freeFormContext`; loads matching rows via Sequelize and asks the model for Cross-Modal Findings, Convergent Evidence, Conflicting Evidence, Open Questions, Recommended Next Experiments, and Confidence Assessment. Explicit 503 when `OPENROUTER_API_KEY` is unset.
- FE (`frontend/src/pages/AIResearchToolsPage.tsx`): added a 4th tab "Multi-Modal Fusion" (Layers icon) with input fields for the IDs and free-form context, plus client-side validation and 503 messaging via the existing `error` state. Bearer auth provided by the shared `services/api.ts` axios client.
- Syntax: backend `tsc --noEmit -p backend` PASS; frontend `tsc --noEmit -p frontend` PASS.

Items still skipped: ELN workflow (needs schema design), data lineage / versioning, PubChem/PDB/external integrations (NEEDS-API-DECISION), bulk import, comments/collaboration UI, publication readiness, researcher network UI.

## Apply pass 5 (all backlog)

Added 6 backlog endpoints (mix of MECHANICAL and NEEDS-CREDS / NEEDS-PRODUCT-DECISION).

- BE (`backend/src/routes/ai.ts`):
  - `POST /api/ai/eln-entry` — persists ELN entries in new `eln_entries` table (PRODUCT-DECISION: JSONB payload to avoid premature schema lock-in).
  - `POST /api/ai/data-lineage` — records edges in new `data_lineage_edges` table (parent_type/id, child_type/id, transform).
  - `POST /api/ai/bulk-import` — queues bulk-import job into new `bulk_import_jobs` table.
  - `POST /api/ai/comment` — adds comment to any entity in new `entity_comments` table.
  - `POST /api/ai/publication-readiness` — AI-only readiness checker; 503+`missing: OPENROUTER_API_KEY` if no key.
  - `POST /api/ai/pubchem-lookup` — PubChem PUG-REST proxy (free; honours optional PUBCHEM_API_KEY as gateway header).
  - All tables created via `CREATE TABLE IF NOT EXISTS` in `ensureExtraTables()`.
- FE: new `pages/ResearchOpsPage.tsx` with 6 tabs; route `/research-ops` registered; `Sidebar.tsx` entry added under "AI Tools".
- Syntax: `tsc --noEmit -p backend` PASS; `tsc --noEmit -p frontend` PASS.
