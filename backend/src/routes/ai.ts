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

export default router;
