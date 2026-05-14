// === Batch 11 Gaps & Frontend Mounts ===
// Gap features (AI counterparts + Non-AI features) for tetrascience.
// Lazy gap_features table (in-memory), OpenRouter via native fetch.

import express from 'express';
const router = express.Router();

const gapFeatures = new Map<string, Array<{ at: string; payload: any }>>();

async function llm(systemPrompt: string, userMsg: string, maxTokens = 1400): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) { const e: any = new Error('OPENROUTER_API_KEY not configured'); e.status = 503; throw e; }
  const model = process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5';
  const r = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + apiKey, 'Content-Type': 'application/json', 'HTTP-Referer': 'http://localhost:3000', 'X-Title': 'tetrascience Gap Features' },
    body: JSON.stringify({ model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMsg }], max_tokens: maxTokens }),
  });
  const data: any = await r.json();
  if (data?.error) throw new Error(data.error.message || 'LLM error');
  return data?.choices?.[0]?.message?.content || '';
}

function track(slug: string, payload: any) {
  const list = gapFeatures.get(slug) || [];
  list.push({ at: new Date().toISOString(), payload });
  gapFeatures.set(slug, list);
}

function safe(res: any, e: any) { return res.status((e && e.status) || 500).json({ error: (e && e.message) || 'request failed' }); }

// ---- AI Gap Counterparts ----

router.post('/gap-literature-mining', async (req, res) => {
  try {
    const body: any = req.body || {};
    const sys = "You recommend papers relevant to current experiments and flag contradictions.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('literature-mining', { keys: Object.keys(body) });
    res.json({ papers: out });
  } catch (e: any) { safe(res, e); }
});

router.post('/gap-similar-compounds', async (req, res) => {
  try {
    const body: any = req.body || {};
    const sys = "You find similar compounds by structure/properties; highlight pharmacological profiles.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('similar-compounds', { keys: Object.keys(body) });
    res.json({ compounds: out });
  } catch (e: any) { safe(res, e); }
});

router.post('/gap-collaboration-suggester', async (req, res) => {
  try {
    const body: any = req.body || {};
    const sys = "You suggest collaborators by publication history, geography, and overlap.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('collaboration-suggester', { keys: Object.keys(body) });
    res.json({ collaborators: out });
  } catch (e: any) { safe(res, e); }
});

router.post('/gap-experiment-recommender', async (req, res) => {
  try {
    const body: any = req.body || {};
    const sys = "You suggest next experiments based on dataset characteristics.";
    const user = `Body: ${JSON.stringify(body).slice(0, 4000)}`;
    const out = await llm(sys, user);
    track('experiment-recommender', { keys: Object.keys(body) });
    res.json({ experiments: out });
  } catch (e: any) { safe(res, e); }
});

// ---- Non-AI Gap Features ----

router.post('/gap-eln-authoring', (req, res) => {
  const body: any = req.body || {};
  const record = { id: 'eln-authoring_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('eln-authoring', record);
  res.json({ entry: record, status: 'recorded' });
});

router.post('/gap-data-versioning', (req, res) => {
  const body: any = req.body || {};
  const record = { id: 'data-versioning_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('data-versioning', record);
  res.json({ version: record, status: 'recorded' });
});

router.post('/gap-external-db-sync', (req, res) => {
  const body: any = req.body || {};
  const record = { id: 'external-db-sync_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('external-db-sync', record);
  res.json({ syncJob: record, status: 'recorded' });
});

router.post('/gap-assay-collab', (req, res) => {
  const body: any = req.body || {};
  const record = { id: 'assay-collab_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('assay-collab', record);
  res.json({ comment: record, status: 'recorded' });
});

router.post('/gap-bulk-import', (req, res) => {
  const body: any = req.body || {};
  const record = { id: 'bulk-import_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('bulk-import', record);
  res.json({ job: record, status: 'recorded' });
});

router.post('/gap-regulatory-submission', (req, res) => {
  const body: any = req.body || {};
  const record = { id: 'regulatory-submission_' + Date.now(), ...body, createdAt: new Date().toISOString() };
  track('regulatory-submission', record);
  res.json({ submission: record, status: 'recorded' });
});

router.get('/gap-features/_audit', (req, res) => {
  const rows: Array<{ feature: string; events: number }> = [];
  for (const [k, v] of gapFeatures.entries()) rows.push({ feature: k, events: v.length });
  res.json({ rows });
});

export default router;
