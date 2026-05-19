// AI Extras — Custom Feature Suggestions (batch 11)
// Literature Mining Agent, Similar Compound Finder, Multi-Modal Data Fusion,
// Experiment Recommendation Engine, Compliance & Publication Readiness Checker,
// Researcher Collaboration Network.

import { Router, Response } from 'express';
import { callOpenRouter } from '../services/openrouter';
import { AuthRequest } from '../middleware/auth';
import { Molecule, AssayResult, Document } from '../models';

const router = Router();

// 1) Literature Mining Agent — recommend papers + flag contradictions.
// TODO: configure credentials — PUBMED_API_KEY, BIORXIV_BASE_URL for live ingest.
router.post('/literature-mine', async (req: AuthRequest, res: Response) => {
  try {
    const { researchTopic, recentExperimentNotes, knownPapers = [] } = req.body || {};
    if (!researchTopic) return res.status(400).json({ error: 'researchTopic required' });
    const sys = 'You are a scientific literature mining agent. From the topic + recent experiment notes, recommend 5 papers (by title pattern) likely relevant. Flag any apparent contradictions with knownPapers. Output JSON. Mark uncertain papers as "candidate — verify in PubMed".';
    const user = `Topic: ${researchTopic}\nExperimentNotes: ${(recentExperimentNotes || '').slice(0, 4000)}\nKnown papers: ${JSON.stringify(knownPapers).slice(0, 3000)}`;
    const result = await callOpenRouter([{ role: 'user', content: user }], sys);
    res.json({ ...result, pubmedConfigured: !!process.env.PUBMED_API_KEY });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'literature-mine failed' });
  }
});

// 2) Similar Compound Finder — query structure, find similar in DB, highlight profiles.
router.post('/similar-compounds', async (req: AuthRequest, res: Response) => {
  try {
    const { smiles, properties = {}, topK = 5 } = req.body || {};
    if (!smiles) return res.status(400).json({ error: 'smiles required' });
    const candidates = await Molecule.findAll({ limit: 100 });
    const compact = candidates.map((m: any) => ({ id: m.id, name: m.name, smiles: m.smiles })).slice(0, 50);
    const sys = 'You are a cheminformatics assistant. From the candidate molecules, choose the topK most structurally similar to the query SMILES. Output JSON: { ranked: [{ id, name, similarity: 0-1, pharmacologicalNotes }], rationale }.';
    const user = `Query SMILES: ${smiles}\nQuery properties: ${JSON.stringify(properties)}\ntopK: ${topK}\nCandidates: ${JSON.stringify(compact)}`;
    const result = await callOpenRouter([{ role: 'user', content: user }], sys);
    res.json({ ...result, candidates: compact.length });
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'similar-compounds failed' });
  }
});

// 3) Multi-Modal Data Fusion — combine assay results + literature + structural data.
router.post('/data-fusion', async (req: AuthRequest, res: Response) => {
  try {
    const { moleculeId, assayIds = [], literatureSnippets = [] } = req.body || {};
    if (!moleculeId) return res.status(400).json({ error: 'moleculeId required' });
    const molecule = await Molecule.findByPk(moleculeId);
    const assays = assayIds.length ? await AssayResult.findAll({ where: { id: assayIds }, limit: 10 }) : [];
    const sys = 'You are a multi-modal drug discovery analyst. Fuse structural data, assay outcomes, and literature snippets to generate hypotheses about mechanism and next experiments. Output JSON: { hypotheses, contradictions, suggestedExperiments }.';
    const user = `Molecule: ${JSON.stringify(molecule)}\nAssays: ${JSON.stringify(assays)}\nLiterature: ${JSON.stringify(literatureSnippets).slice(0, 4000)}`;
    const result = await callOpenRouter([{ role: 'user', content: user }], sys);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'data-fusion failed' });
  }
});

// 4) Experiment Recommendation Engine
router.post('/experiment-recommend', async (req: AuthRequest, res: Response) => {
  try {
    const { datasetSummary, recentResults = [], researchGoal } = req.body || {};
    if (!datasetSummary) return res.status(400).json({ error: 'datasetSummary required' });
    const sys = 'You are an experimental design advisor. Suggest the next 3-5 experiments to validate or extend findings. Output JSON: { experiments: [{ name, hypothesis, controls, expectedReadout, estimatedDays, dependencies }], notes }.';
    const user = `Goal: ${researchGoal || 'unspecified'}\nDataset: ${typeof datasetSummary === 'string' ? datasetSummary.slice(0, 3000) : JSON.stringify(datasetSummary).slice(0, 3000)}\nRecent results: ${JSON.stringify(recentResults).slice(0, 3000)}`;
    const result = await callOpenRouter([{ role: 'user', content: user }], sys);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'experiment-recommend failed' });
  }
});

// 5) Compliance & Publication Readiness Checker
router.post('/publication-readiness', async (req: AuthRequest, res: Response) => {
  try {
    const { manuscriptDraftId, manuscriptText, regulatoryFlags = [] } = req.body || {};
    let text = manuscriptText;
    if (manuscriptDraftId && !text) {
      const d = await Document.findByPk(manuscriptDraftId);
      text = (d as any)?.content || (d as any)?.text || '';
    }
    if (!text || text.length < 200) return res.status(400).json({ error: 'manuscriptText (>=200 chars) or manuscriptDraftId required' });
    const sys = 'You are a publication-readiness reviewer. Audit completeness (methods, stats, ethics, data availability), regulatory compliance (IRB, IACUC, dual-use research), and statistical rigor. Output JSON: { sections: [{ name, status, gaps }], regulatoryFlags, overallScore: 0-100 }.';
    const user = `Manuscript (${text.length} chars): ${text.slice(0, 10000)}\nRegulatoryFlags: ${JSON.stringify(regulatoryFlags)}`;
    const result = await callOpenRouter([{ role: 'user', content: user }], sys);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'publication-readiness failed' });
  }
});

// 6) Researcher Collaboration Network — suggest collaborators.
router.post('/collab-network', async (req: AuthRequest, res: Response) => {
  try {
    const { focusAreas = [], geography, openToIndustry = true } = req.body || {};
    if (!focusAreas.length) return res.status(400).json({ error: 'focusAreas[] required' });
    const sys = 'You are a research collaboration scout. Suggest 5 prototypical collaborator profiles (institution type, expertise, geographic match) suitable for the given focus areas. Note: this is a suggested profile — verify identities externally. Output JSON.';
    const user = `Focus: ${focusAreas.join(', ')}\nGeography: ${geography || 'global'}\nOpenToIndustry: ${openToIndustry}`;
    const result = await callOpenRouter([{ role: 'user', content: user }], sys);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err?.message || 'collab-network failed' });
  }
});

export default router;
