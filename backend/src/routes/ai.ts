import { Router, Response } from 'express';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import { Molecule, AssayResult, Document, KnowledgeNode, KnowledgeEdge, Entity, Pipeline, SearchQuery, AuditLog, Instrument, Tenant, User } from '../models';
import { callOpenRouter } from '../services/openrouter';
import { AuthRequest } from '../middleware/auth';

const router = Router();

// POST /analyze-molecule
router.post('/analyze-molecule', async (req: AuthRequest, res: Response) => {
  try {
    const { moleculeId, name, smiles, properties } = req.body;
    let moleculeData: any;

    if (moleculeId) {
      const molecule = await Molecule.findByPk(moleculeId);
      if (!molecule) {
        res.status(404).json({ error: 'Molecule not found' });
        return;
      }
      moleculeData = molecule.toJSON();
    } else {
      moleculeData = { name, smiles, properties };
    }

    const systemPrompt = `You are an expert computational chemist and pharmacologist working in drug discovery. Analyze the provided molecule data and provide insights on:
1. Drug-likeness assessment (Lipinski's Rule of Five, Veber rules)
2. Structure-Activity Relationship (SAR) observations based on the molecular structure
3. ADMET prediction (Absorption, Distribution, Metabolism, Excretion, Toxicity)
4. Potential therapeutic applications based on the target protein and mechanism
5. Chemical stability and reactivity concerns
6. Suggestions for structural optimization
Provide scientifically rigorous analysis with specific references to molecular properties.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Analyze the following molecule:\n${JSON.stringify(moleculeData, null, 2)}` }],
      systemPrompt
    );

    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to analyze molecule', details: error.message });
  }
});

// POST /analyze-assay
router.post('/analyze-assay', async (req: AuthRequest, res: Response) => {
  try {
    const { assayId, data } = req.body;
    let assayData: any;

    if (assayId) {
      const assay = await AssayResult.findByPk(assayId, {
        include: [{ model: Molecule, as: 'molecule' }],
      });
      if (!assay) {
        res.status(404).json({ error: 'Assay result not found' });
        return;
      }
      assayData = assay.toJSON();
    } else {
      assayData = data;
    }

    const systemPrompt = `You are an expert bioassay scientist specializing in drug screening and pharmacology. Analyze the provided assay result data and provide insights on:
1. Interpretation of the assay results in biological context
2. Identification of trends and dose-response relationships
3. Statistical significance assessment of the results
4. Comparison with typical values for this assay type
5. Potential sources of variability or error
6. Recommendations for follow-up experiments
Provide quantitative analysis where possible and reference standard pharmacological principles.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Analyze the following assay result:\n${JSON.stringify(assayData, null, 2)}` }],
      systemPrompt
    );

    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to analyze assay', details: error.message });
  }
});

// POST /summarize-document
router.post('/summarize-document', async (req: AuthRequest, res: Response) => {
  try {
    const { documentId, text } = req.body;
    let docContent: string;

    if (documentId) {
      const doc = await Document.findByPk(documentId);
      if (!doc) {
        res.status(404).json({ error: 'Document not found' });
        return;
      }
      docContent = `Title: ${doc.title}\nType: ${doc.documentType}\nAuthors: ${doc.authors || 'N/A'}\n\n${doc.content}`;
    } else {
      docContent = text;
    }

    const systemPrompt = `You are a scientific literature expert specializing in life sciences and pharmaceutical research. Summarize the provided document with:
1. A concise executive summary (2-3 sentences)
2. Key findings and conclusions
3. Methodology highlights
4. Relevance to drug discovery and development
5. Critical assessment of the document quality
6. Key terms and concepts for indexing
Maintain scientific accuracy and highlight the most impactful information.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Summarize the following document:\n${docContent}` }],
      systemPrompt
    );

    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to summarize document', details: error.message });
  }
});

// POST /explore-graph
router.post('/explore-graph', async (req: AuthRequest, res: Response) => {
  try {
    const { nodeId } = req.body;

    const node = await KnowledgeNode.findByPk(nodeId, {
      include: [
        { model: KnowledgeEdge, as: 'outgoingEdges', include: [{ model: KnowledgeNode, as: 'targetNode' }] },
        { model: KnowledgeEdge, as: 'incomingEdges', include: [{ model: KnowledgeNode, as: 'sourceNode' }] },
      ],
    });

    if (!node) {
      res.status(404).json({ error: 'Node not found' });
      return;
    }

    const systemPrompt = `You are a knowledge graph expert specializing in biomedical and pharmaceutical ontologies. Analyze the provided knowledge graph node and its connections to:
1. Explain the biological/chemical relationships represented by the edges
2. Identify potential hidden connections or missing relationships
3. Suggest hypotheses based on the graph topology
4. Assess the strength of evidence for each relationship
5. Recommend additional nodes or edges that could enrich the graph
6. Identify potential drug repurposing opportunities based on the connections
Think systematically about the network of relationships and their implications.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Analyze the following knowledge graph node and its connections:\n${JSON.stringify(node.toJSON(), null, 2)}` }],
      systemPrompt
    );

    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to explore graph', details: error.message });
  }
});

// POST /extract-entities
router.post('/extract-entities', async (req: AuthRequest, res: Response) => {
  try {
    const { text } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Text is required for entity extraction' });
      return;
    }

    const systemPrompt = `You are a Named Entity Recognition (NER) expert specializing in biomedical text mining. Extract entities from the provided text and return them in the following JSON format:
{
  "entities": [
    {
      "surfaceForm": "the exact text as it appears",
      "canonicalName": "the standardized/canonical name",
      "entityType": "chemical|protein|gene|disease|assay|organism",
      "confidence": 0.95
    }
  ]
}
Only return valid JSON. Extract all chemical compounds, proteins, genes, diseases, assay types, and organisms mentioned in the text. Assign confidence scores between 0 and 1 based on certainty of the entity classification.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Extract entities from the following text:\n\n${text}` }],
      systemPrompt
    );

    let extractedEntities: any[] = [];
    try {
      const jsonMatch = result.text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        extractedEntities = parsed.entities || [];
      }
    } catch (parseError) {
      extractedEntities = [];
    }

    const savedEntities = [];
    for (const entity of extractedEntities) {
      try {
        const saved = await Entity.create({
          surfaceForm: entity.surfaceForm,
          canonicalName: entity.canonicalName,
          entityType: entity.entityType,
          confidence: entity.confidence,
          source: 'ai-extraction',
          context: text.substring(0, 500),
          resolved: false,
        });
        savedEntities.push(saved);
      } catch (saveError) {
        // Skip entities that fail validation
      }
    }

    res.json({ response: result.text, model: result.model, savedEntities });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to extract entities', details: error.message });
  }
});

// POST /diagnose-pipeline
router.post('/diagnose-pipeline', async (req: AuthRequest, res: Response) => {
  try {
    const { pipelineId } = req.body;

    const pipeline = await Pipeline.findByPk(pipelineId);
    if (!pipeline) {
      res.status(404).json({ error: 'Pipeline not found' });
      return;
    }

    const systemPrompt = `You are a data engineering expert specializing in scientific data pipelines and ETL processes in life sciences. Diagnose the provided pipeline and:
1. Analyze the current status and identify likely failure causes
2. Examine the error message for root cause analysis
3. Assess the records processed vs total for progress diagnosis
4. Suggest specific fixes and remediation steps
5. Recommend monitoring and alerting improvements
6. Identify potential data quality issues based on the pipeline configuration
7. Suggest performance optimizations
Provide actionable, specific recommendations with priority levels.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Diagnose the following data pipeline:\n${JSON.stringify(pipeline.toJSON(), null, 2)}` }],
      systemPrompt
    );

    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to diagnose pipeline', details: error.message });
  }
});

// POST /analyze-search-quality
router.post('/analyze-search-quality', async (req: AuthRequest, res: Response) => {
  try {
    const queries = await SearchQuery.findAll({ order: [['createdAt', 'DESC']] });

    const stats = await SearchQuery.findAll({
      attributes: [
        'searchType',
        [sequelize.fn('AVG', sequelize.col('responseTimeMs')), 'avgResponseTimeMs'],
        [sequelize.fn('AVG', sequelize.col('precisionAtK')), 'avgPrecisionAtK'],
        [sequelize.fn('AVG', sequelize.col('mrr')), 'avgMrr'],
        [sequelize.fn('AVG', sequelize.col('ndcg')), 'avgNdcg'],
        [sequelize.fn('COUNT', sequelize.col('id')), 'count'],
      ],
      group: ['searchType'],
      raw: true,
    });

    const totalQueries = queries.length;
    const recentQueries = queries.slice(0, 50).map((q: any) => ({
      query: q.query,
      searchType: q.searchType,
      resultsCount: q.resultsCount,
      responseTimeMs: q.responseTimeMs,
      precisionAtK: q.precisionAtK,
      mrr: q.mrr,
      ndcg: q.ndcg,
    }));

    const systemPrompt = `You are a search quality engineer and information retrieval expert working in scientific data platforms. Analyze the search analytics data and:
1. Assess overall search quality using precision@k, MRR, and NDCG metrics
2. Compare performance across search types (keyword, semantic, hybrid)
3. Identify query patterns that perform poorly
4. Analyze response time distribution and identify bottlenecks
5. Recommend specific improvements to search relevance
6. Suggest query expansion or rewriting strategies
7. Propose A/B testing experiments for search improvements
Provide data-driven recommendations with expected impact estimates.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Analyze search quality data:\n\nTotal queries: ${totalQueries}\n\nAggregated stats by type:\n${JSON.stringify(stats, null, 2)}\n\nRecent queries sample:\n${JSON.stringify(recentQueries, null, 2)}` }],
      systemPrompt
    );

    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to analyze search quality', details: error.message });
  }
});

// POST /generate-embedding-description
router.post('/generate-embedding-description', async (req: AuthRequest, res: Response) => {
  try {
    const { text, sourceType } = req.body;

    if (!text) {
      res.status(400).json({ error: 'Text is required' });
      return;
    }

    const systemPrompt = `You are a scientific text enrichment specialist. Generate a rich, detailed description for the provided text that will be used as context for embedding generation. The description should:
1. Expand abbreviations and acronyms
2. Add relevant scientific context and background
3. Include related terms and synonyms for better semantic matching
4. Highlight key concepts and their relationships
5. Provide domain-specific context for the source type: ${sourceType || 'general'}
6. Ensure the description captures the semantic meaning comprehensively
Return a single, well-structured paragraph that enriches the original text for embedding purposes.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Generate a rich description for embedding context:\n\nSource type: ${sourceType || 'general'}\nText: ${text}` }],
      systemPrompt
    );

    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate embedding description', details: error.message });
  }
});

// POST /compliance-check
router.post('/compliance-check', async (req: AuthRequest, res: Response) => {
  try {
    const { startDate, endDate } = req.body;
    const where: any = {};

    if (startDate && endDate) {
      where.createdAt = {
        [Op.between]: [new Date(startDate), new Date(endDate)],
      };
    } else {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      where.createdAt = {
        [Op.gte]: thirtyDaysAgo,
      };
    }

    const logs = await AuditLog.findAll({
      where,
      order: [['createdAt', 'DESC']],
    });

    const gxpLogs = logs.filter((l: any) => l.gxpRelevant);
    const actionSummary: any = {};
    logs.forEach((l: any) => {
      actionSummary[l.action] = (actionSummary[l.action] || 0) + 1;
    });

    const systemPrompt = `You are a GxP compliance expert and quality assurance specialist in regulated life sciences environments. Review the provided audit trail data and:
1. Assess compliance with 21 CFR Part 11 (electronic records and signatures)
2. Identify any gaps in audit trail coverage
3. Check for unusual patterns (bulk deletions, off-hours modifications, privilege escalation)
4. Verify electronic signature requirements for GxP-relevant actions
5. Assess data integrity risks (ALCOA+ principles)
6. Check for proper access control and separation of duties
7. Identify any remediation actions needed
8. Provide an overall compliance risk score (Low/Medium/High/Critical)
Be thorough and specific in identifying potential compliance gaps.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Review the following audit trail for GxP compliance:\n\nTotal logs: ${logs.length}\nGxP-relevant logs: ${gxpLogs.length}\nAction summary: ${JSON.stringify(actionSummary)}\n\nAudit log entries:\n${JSON.stringify(logs.map((l: any) => l.toJSON()), null, 2)}` }],
      systemPrompt
    );

    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to perform compliance check', details: error.message });
  }
});

// POST /analyze-instrument
router.post('/analyze-instrument', async (req: AuthRequest, res: Response) => {
  try {
    const { instrumentId } = req.body;
    const instrument = await Instrument.findByPk(instrumentId);
    if (!instrument) {
      res.status(404).json({ error: 'Instrument not found' });
      return;
    }
    const systemPrompt = `You are a laboratory instrumentation expert specializing in scientific instrument management, calibration, and integration in life sciences environments. Analyze the provided instrument data and provide insights on:
1. Calibration status assessment and schedule optimization
2. Integration readiness and data format compatibility
3. Throughput analysis and utilization recommendations
4. Maintenance and lifecycle management suggestions
5. Regulatory compliance considerations (GLP/GMP)
6. Risk assessment for instrument downtime impact
Provide specific, actionable recommendations based on the instrument configuration.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Analyze the following laboratory instrument:\n${JSON.stringify(instrument.toJSON(), null, 2)}` }],
      systemPrompt
    );
    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to analyze instrument', details: error.message });
  }
});

// POST /analyze-tenant
router.post('/analyze-tenant', async (req: AuthRequest, res: Response) => {
  try {
    const { tenantId } = req.body;
    const tenant = await Tenant.findByPk(tenantId);
    if (!tenant) {
      res.status(404).json({ error: 'Tenant not found' });
      return;
    }
    const systemPrompt = `You are a multi-tenant SaaS platform expert specializing in life sciences data platforms. Analyze the provided tenant configuration and provide insights on:
1. Resource utilization assessment (users, storage)
2. Data isolation and security posture evaluation
3. Plan optimization recommendations
4. Compliance readiness based on industry
5. Growth and scaling recommendations
6. Best practices for tenant configuration
Provide specific recommendations tailored to the tenant's industry and plan.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Analyze the following tenant configuration:\n${JSON.stringify(tenant.toJSON(), null, 2)}` }],
      systemPrompt
    );
    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to analyze tenant', details: error.message });
  }
});

// POST /analyze-user
router.post('/analyze-user', async (req: AuthRequest, res: Response) => {
  try {
    const { userId } = req.body;
    const user = await User.findByPk(userId, { attributes: { exclude: ['password'] } });
    if (!user) {
      res.status(404).json({ error: 'User not found' });
      return;
    }
    const systemPrompt = `You are a platform administration expert specializing in user management and access control in regulated life sciences environments. Analyze the provided user profile and provide insights on:
1. Role and permission assessment
2. Activity and engagement analysis
3. Security posture (last login patterns, account status)
4. Access control recommendations
5. Compliance considerations for the user's role
6. Suggestions for improving user productivity
Provide specific, actionable recommendations. Never expose or discuss password data.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Analyze the following user profile:\n${JSON.stringify(user.toJSON(), null, 2)}` }],
      systemPrompt
    );
    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to analyze user', details: error.message });
  }
});

// POST /literature-mining - recommend research literature for current context
router.post('/literature-mining', async (req: AuthRequest, res: Response) => {
  try {
    const { topic, context, sources } = req.body;
    if (!topic) {
      res.status(400).json({ error: 'topic is required' });
      return;
    }
    const systemPrompt = `You are a scientific literature analyst. Suggest relevant publications and research directions for the given topic and experimental context. Note that you are recommending search queries and themes (you do not have live access to PubMed/bioRxiv). Output sections: Suggested Search Queries, Likely Relevant Authors/Groups, Key Topics/Themes, Potential Contradictions To Investigate, Recommended Next Steps.`;

    const userPrompt = `Topic:\n${topic}\n\nExperimental Context:\n${JSON.stringify(context || {}, null, 2)}\n\nKnown sources to consider: ${JSON.stringify(sources || ['PubMed', 'bioRxiv', 'ChemRxiv'])}\n\nProduce literature mining recommendations.`;

    const result = await callOpenRouter([{ role: 'user', content: userPrompt }], systemPrompt);
    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to mine literature', details: error.message });
  }
});

// POST /similar-compounds - suggest similar compounds and pharmacological profile differences
router.post('/similar-compounds', async (req: AuthRequest, res: Response) => {
  try {
    const { moleculeId, name, smiles, properties } = req.body;
    let moleculeData: any;

    if (moleculeId) {
      const molecule = await Molecule.findByPk(moleculeId);
      if (!molecule) {
        res.status(404).json({ error: 'Molecule not found' });
        return;
      }
      moleculeData = molecule.toJSON();
    } else {
      moleculeData = { name, smiles, properties };
    }

    const systemPrompt = `You are a medicinal chemist. Given a molecule, suggest structurally and pharmacologically similar compounds that may share or differ in mechanism. Discuss likely shared targets, scaffolds, side-effect risk, and ADMET differences. State assumptions and note that you do not have live access to chemical databases. Output sections: Similar Scaffold Candidates, Pharmacological Comparison, Potential Off-Target Concerns, Suggested Database Queries.`;

    const result = await callOpenRouter(
      [{ role: 'user', content: `Find similar compounds for:\n${JSON.stringify(moleculeData, null, 2)}` }],
      systemPrompt
    );
    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to find similar compounds', details: error.message });
  }
});

// POST /collaboration-suggestion - suggest researcher collaboration matches
router.post('/collaboration-suggestion', async (req: AuthRequest, res: Response) => {
  try {
    const { researcherProfile, targetTopic, network } = req.body;
    if (!researcherProfile) {
      res.status(400).json({ error: 'researcherProfile is required' });
      return;
    }
    const systemPrompt = `You are a research collaboration broker. Given a researcher profile and a topic of interest, suggest the type of collaborators they should seek (skill profiles, institutional types, geographic considerations) and how to approach them. Output sections: Ideal Collaborator Profiles, Skill Gaps To Fill, Suggested Outreach Templates, Risks/Conflicts To Watch.`;

    const userPrompt = `Researcher Profile:\n${JSON.stringify(researcherProfile, null, 2)}\n\nTarget Topic: ${targetTopic || 'unspecified'}\n\nKnown Network:\n${JSON.stringify(network || [], null, 2)}\n\nProduce collaboration recommendations.`;

    const result = await callOpenRouter([{ role: 'user', content: userPrompt }], systemPrompt);
    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to generate collaboration suggestions', details: error.message });
  }
});

// POST /multi-modal-data-fusion - synthesize insights across heterogeneous modalities
router.post('/multi-modal-data-fusion', async (req: AuthRequest, res: Response) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      res.status(503).json({ error: 'AI not configured. Set OPENROUTER_API_KEY to enable AI features.' });
      return;
    }
    const { moleculeId, assayIds, documentIds, instrumentIds, freeFormContext } = req.body || {};

    let molecule: any = null;
    if (moleculeId) {
      const m = await Molecule.findByPk(moleculeId);
      if (m) molecule = m.toJSON();
    }

    let assays: any[] = [];
    if (Array.isArray(assayIds) && assayIds.length) {
      const rows = await AssayResult.findAll({ where: { id: { [Op.in]: assayIds } } });
      assays = rows.map((r: any) => r.toJSON());
    }

    let documents: any[] = [];
    if (Array.isArray(documentIds) && documentIds.length) {
      const rows = await Document.findAll({ where: { id: { [Op.in]: documentIds } } });
      documents = rows.map((d: any) => ({
        id: d.id,
        title: d.title,
        documentType: d.documentType,
        authors: d.authors,
        contentSnippet: (d.content || '').slice(0, 1500),
      }));
    }

    let instruments: any[] = [];
    if (Array.isArray(instrumentIds) && instrumentIds.length) {
      const rows = await Instrument.findAll({ where: { id: { [Op.in]: instrumentIds } } });
      instruments = rows.map((i: any) => i.toJSON());
    }

    const systemPrompt = `You are a multi-modal data fusion analyst for life-sciences research. Integrate evidence across molecule structure, assay results, literature/documents, and instrument metadata to produce unified, prioritized scientific insights. State assumptions; do not invent values not present in the input. Output sections: Cross-Modal Findings, Convergent Evidence, Conflicting Evidence, Open Questions, Recommended Next Experiments, Confidence Assessment (Low/Medium/High with rationale).`;

    const userPrompt = `Fuse the following multi-modal evidence:

Molecule:
${molecule ? JSON.stringify(molecule, null, 2) : '(none provided)'}

Assay results (${assays.length}):
${assays.length ? JSON.stringify(assays, null, 2) : '(none provided)'}

Documents (${documents.length}):
${documents.length ? JSON.stringify(documents, null, 2) : '(none provided)'}

Instruments (${instruments.length}):
${instruments.length ? JSON.stringify(instruments, null, 2) : '(none provided)'}

Free-form context:
${freeFormContext || '(none)'}`;

    const result = await callOpenRouter([{ role: 'user', content: userPrompt }], systemPrompt);
    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed multi-modal fusion', details: error.message });
  }
});

// =====================================================================
// Apply pass 5: backlog endpoints (additive only, cap=10/project)
// Required env vars (per integration; absent => 503 + missing field):
//   OPENROUTER_API_KEY  - existing AI endpoints
//   PUBCHEM_API_KEY     - /pubchem-lookup (PubChem PUG-REST is free but if a
//                          gateway/key is configured it is required here)
// PRODUCT-DECISION:
//   - ELN entries use a single `eln_entries` table with JSONB payload to avoid
//     committing to a final schema. CREATE TABLE IF NOT EXISTS keeps it additive.
//   - Data lineage stored as edges in `data_lineage_edges` (parent_type, parent_id,
//     child_type, child_id, transform). Simple, reversible.
//   - Comments use `entity_comments` (entity_type, entity_id, body). Resolves
//     "comment/collaboration on results" without affecting existing tables.
//   - Bulk import is synchronous JSON-array ingest into `bulk_import_jobs`
//     and per-row staging; production async pipeline deferred.
//   - Publication readiness is AI-only (no external journal API).
// =====================================================================

async function ensureExtraTables(): Promise<void> {
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS eln_entries (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      title TEXT NOT NULL,
      payload JSONB NOT NULL,
      tags TEXT[],
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS data_lineage_edges (
      id SERIAL PRIMARY KEY,
      parent_type TEXT NOT NULL,
      parent_id TEXT NOT NULL,
      child_type TEXT NOT NULL,
      child_id TEXT NOT NULL,
      transform TEXT,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS entity_comments (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      body TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
  await sequelize.query(`
    CREATE TABLE IF NOT EXISTS bulk_import_jobs (
      id SERIAL PRIMARY KEY,
      user_id INTEGER,
      target_type TEXT NOT NULL,
      total_rows INTEGER NOT NULL,
      payload JSONB NOT NULL,
      status TEXT NOT NULL DEFAULT 'queued',
      created_at TIMESTAMP NOT NULL DEFAULT NOW()
    )
  `);
}

// Best-effort table init (silent on error so existing endpoints keep working)
ensureExtraTables().catch(() => {});

// POST /api/ai/eln-entry - create / list ELN entries
router.post('/eln-entry', async (req: AuthRequest, res: Response) => {
  try {
    const { title, payload, tags } = req.body || {};
    if (!title || !payload) {
      res.status(400).json({ error: 'title and payload are required' });
      return;
    }
    const userId = (req as any).user?.id || null;
    const [rows] = await sequelize.query(
      `INSERT INTO eln_entries (user_id, title, payload, tags) VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      { bind: [userId, title, JSON.stringify(payload), Array.isArray(tags) ? tags : null] }
    );
    res.json({ entry: (rows as any[])[0], note: 'ELN entry persisted in eln_entries (JSONB payload).' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create ELN entry', details: error.message });
  }
});

// POST /api/ai/data-lineage - record a lineage edge between two entities
router.post('/data-lineage', async (req: AuthRequest, res: Response) => {
  try {
    const { parent_type, parent_id, child_type, child_id, transform } = req.body || {};
    if (!parent_type || !parent_id || !child_type || !child_id) {
      res.status(400).json({ error: 'parent_type, parent_id, child_type, child_id are required' });
      return;
    }
    const [rows] = await sequelize.query(
      `INSERT INTO data_lineage_edges (parent_type, parent_id, child_type, child_id, transform) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
      { bind: [String(parent_type), String(parent_id), String(child_type), String(child_id), transform || null] }
    );
    res.json({ edge: (rows as any[])[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to record lineage edge', details: error.message });
  }
});

// POST /api/ai/bulk-import - queue a bulk import job
router.post('/bulk-import', async (req: AuthRequest, res: Response) => {
  try {
    const { target_type, rows } = req.body || {};
    if (!target_type || !Array.isArray(rows)) {
      res.status(400).json({ error: 'target_type and rows[] are required' });
      return;
    }
    const userId = (req as any).user?.id || null;
    const [r] = await sequelize.query(
      `INSERT INTO bulk_import_jobs (user_id, target_type, total_rows, payload) VALUES ($1, $2, $3, $4) RETURNING id, status, created_at`,
      { bind: [userId, String(target_type), rows.length, JSON.stringify(rows)] }
    );
    res.json({ job: (r as any[])[0], note: 'Bulk import job queued; external worker performs the load.' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to queue bulk import', details: error.message });
  }
});

// POST /api/ai/comment - create a comment on any entity (collaboration)
router.post('/comment', async (req: AuthRequest, res: Response) => {
  try {
    const { entity_type, entity_id, body } = req.body || {};
    if (!entity_type || !entity_id || !body) {
      res.status(400).json({ error: 'entity_type, entity_id and body are required' });
      return;
    }
    const userId = (req as any).user?.id || null;
    const [rows] = await sequelize.query(
      `INSERT INTO entity_comments (user_id, entity_type, entity_id, body) VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
      { bind: [userId, String(entity_type), String(entity_id), String(body).slice(0, 4000)] }
    );
    res.json({ comment: (rows as any[])[0] });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create comment', details: error.message });
  }
});

// POST /api/ai/publication-readiness - AI-only readiness checker
router.post('/publication-readiness', async (req: AuthRequest, res: Response) => {
  try {
    if (!process.env.OPENROUTER_API_KEY) {
      res.status(503).json({ error: 'AI not configured', missing: 'OPENROUTER_API_KEY' });
      return;
    }
    const { manuscript_text, target_journal, study_type } = req.body || {};
    if (!manuscript_text) {
      res.status(400).json({ error: 'manuscript_text is required' });
      return;
    }
    const systemPrompt = `You are a journal-readiness reviewer for life-sciences manuscripts. Score the manuscript on completeness, methodological rigor, statistical reporting, ethics/consent, data availability, figures/tables, and reproducibility. Return JSON: {"overall_readiness_score":0-100,"section_scores":{"introduction":0,"methods":0,"results":0,"discussion":0,"references":0,"figures_tables":0,"data_availability":0,"ethics_consent":0},"top_blockers":["<string>"],"recommended_target_journal_fit":"<string>","priority_fixes":["<string>"]}`;
    const userPrompt = `Target journal: ${target_journal || 'unspecified'}\nStudy type: ${study_type || 'unspecified'}\n\nManuscript:\n"""\n${String(manuscript_text).slice(0, 12000)}\n"""`;
    const result = await callOpenRouter([{ role: 'user', content: userPrompt }], systemPrompt);
    res.json({ response: result.text, model: result.model });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed publication readiness', details: error.message });
  }
});

// POST /api/ai/pubchem-lookup - PubChem CID/property lookup (free, optional gateway key)
router.post('/pubchem-lookup', async (req: AuthRequest, res: Response) => {
  try {
    const { name, cid, smiles } = req.body || {};
    if (!name && !cid && !smiles) {
      res.status(400).json({ error: 'name, cid or smiles is required' });
      return;
    }
    // PRODUCT-DECISION: PubChem PUG-REST is free; if PUBCHEM_API_KEY is set we
    // honour it as a gateway header. Endpoint shape is intentionally narrow.
    let url = 'https://pubchem.ncbi.nlm.nih.gov/rest/pug/compound/';
    if (cid) url += `cid/${encodeURIComponent(String(cid))}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName/JSON`;
    else if (name) url += `name/${encodeURIComponent(String(name))}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName/JSON`;
    else url += `smiles/${encodeURIComponent(String(smiles))}/property/MolecularFormula,MolecularWeight,CanonicalSMILES,IUPACName/JSON`;
    const headers: Record<string, string> = {};
    if (process.env.PUBCHEM_API_KEY) headers['x-api-key'] = process.env.PUBCHEM_API_KEY;
    const r = await fetch(url, { headers });
    if (!r.ok) {
      res.status(502).json({ error: 'Upstream PubChem error', status: r.status });
      return;
    }
    const json = await r.json();
    res.json({ source: 'pubchem', result: json });
  } catch (error: any) {
    res.status(500).json({ error: 'PubChem lookup failed', details: error.message });
  }
});

export default router;
