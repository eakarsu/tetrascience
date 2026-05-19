import React, { useState } from 'react';
import { BookOpen, Beaker, Users as UsersIcon, Sparkles, Loader2, Layers } from 'lucide-react';
import api from '../services/api';
import AIResponsePanel from '../components/AIResponsePanel';

type ToolKey = 'literature-mining' | 'similar-compounds' | 'collaboration-suggestion' | 'multi-modal-data-fusion';

const tools: Array<{
  key: ToolKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  color: string;
}> = [
  {
    key: 'literature-mining',
    label: 'Literature Mining',
    icon: BookOpen,
    description: 'Mine recommendations and search strategies for research papers',
    color: 'from-purple-600 to-indigo-600',
  },
  {
    key: 'similar-compounds',
    label: 'Similar Compounds',
    icon: Beaker,
    description: 'Find structurally / pharmacologically similar compounds',
    color: 'from-emerald-600 to-teal-600',
  },
  {
    key: 'collaboration-suggestion',
    label: 'Collaboration Suggestions',
    icon: UsersIcon,
    description: 'Get researcher and lab collaboration suggestions for a project',
    color: 'from-amber-500 to-orange-500',
  },
  {
    key: 'multi-modal-data-fusion',
    label: 'Multi-Modal Fusion',
    icon: Layers,
    description: 'Synthesize cross-modal insights across molecule, assay, document, and instrument data',
    color: 'from-sky-600 to-blue-600',
  },
];

const AIResearchToolsPage: React.FC = () => {
  const [activeTool, setActiveTool] = useState<ToolKey>('literature-mining');
  const [topic, setTopic] = useState('');
  const [context, setContext] = useState('');
  const [smiles, setSmiles] = useState('');
  const [molecule, setMolecule] = useState('');
  const [project, setProject] = useState('');
  const [expertise, setExpertise] = useState('');
  const [fusionMoleculeId, setFusionMoleculeId] = useState('');
  const [fusionAssayIds, setFusionAssayIds] = useState('');
  const [fusionDocumentIds, setFusionDocumentIds] = useState('');
  const [fusionInstrumentIds, setFusionInstrumentIds] = useState('');
  const [fusionFreeForm, setFusionFreeForm] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState('');
  const [error, setError] = useState('');

  const tool = tools.find((t) => t.key === activeTool)!;
  const Icon = tool.icon;

  const submit = async () => {
    setLoading(true);
    setError('');
    setResponse('');
    try {
      let payload: any = {};
      if (activeTool === 'literature-mining') {
        if (!topic.trim()) {
          setError('Topic is required');
          setLoading(false);
          return;
        }
        payload = { topic, context };
      } else if (activeTool === 'similar-compounds') {
        if (!smiles.trim() && !molecule.trim()) {
          setError('Provide a SMILES or molecule name');
          setLoading(false);
          return;
        }
        payload = { smiles, molecule };
      } else if (activeTool === 'collaboration-suggestion') {
        if (!project.trim()) {
          setError('Project description is required');
          setLoading(false);
          return;
        }
        payload = { project, expertise };
      } else if (activeTool === 'multi-modal-data-fusion') {
        const parseIds = (s: string): number[] =>
          s.split(/[,\s]+/).map((t) => t.trim()).filter(Boolean).map((t) => Number(t)).filter((n) => Number.isFinite(n));
        const moleculeId = fusionMoleculeId.trim() ? Number(fusionMoleculeId.trim()) : undefined;
        const assayIds = parseIds(fusionAssayIds);
        const documentIds = parseIds(fusionDocumentIds);
        const instrumentIds = parseIds(fusionInstrumentIds);
        if (!moleculeId && assayIds.length === 0 && documentIds.length === 0 && instrumentIds.length === 0 && !fusionFreeForm.trim()) {
          setError('Provide at least one input (molecule, assay, document, instrument, or free-form context).');
          setLoading(false);
          return;
        }
        payload = { moleculeId, assayIds, documentIds, instrumentIds, freeFormContext: fusionFreeForm };
      }
      const res = await api.post(`/ai/${activeTool}`, payload);
      setResponse(res.data?.response || JSON.stringify(res.data, null, 2));
    } catch (err: any) {
      if (err.response?.status === 503) {
        setError('AI not configured. Set OPENROUTER_API_KEY in the backend environment.');
      } else {
        setError(err.response?.data?.error || err.message || 'Request failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Sparkles className="w-6 h-6 text-purple-600" /> AI Research Tools
        </h1>
        <p className="text-sm text-gray-600 mt-1">
          Literature mining, compound similarity, and collaboration matching.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        {tools.map((t) => {
          const TIcon = t.icon;
          const active = activeTool === t.key;
          return (
            <button
              key={t.key}
              onClick={() => {
                setActiveTool(t.key);
                setResponse('');
                setError('');
              }}
              className={`text-left p-4 rounded-xl border ${
                active
                  ? 'border-purple-500 bg-purple-50 shadow-sm'
                  : 'border-gray-200 bg-white hover:border-purple-300'
              } transition`}
            >
              <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-2 bg-gradient-to-r ${t.color} text-white`}>
                <TIcon className="w-5 h-5" />
              </div>
              <div className="font-semibold text-sm text-gray-900">{t.label}</div>
              <div className="text-xs text-gray-500 mt-1">{t.description}</div>
            </button>
          );
        })}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <Icon className="w-5 h-5 text-purple-600" />
          <h2 className="text-lg font-semibold">{tool.label}</h2>
        </div>

        {activeTool === 'literature-mining' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
              <input
                type="text"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g., kinase inhibitors for triple-negative breast cancer"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Context (optional)</label>
              <textarea
                value={context}
                onChange={(e) => setContext(e.target.value)}
                rows={4}
                placeholder="Specific subdomains, species, methods of interest..."
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {activeTool === 'similar-compounds' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SMILES (optional)</label>
              <input
                type="text"
                value={smiles}
                onChange={(e) => setSmiles(e.target.value)}
                placeholder="e.g., CC(=O)Oc1ccccc1C(=O)O"
                className="w-full border rounded px-3 py-2 font-mono text-xs"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Molecule Name (optional)</label>
              <input
                type="text"
                value={molecule}
                onChange={(e) => setMolecule(e.target.value)}
                placeholder="e.g., aspirin"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <p className="text-xs text-gray-500">Provide either a SMILES or a name. The model returns search strategies and conceptual matches; it does not query live databases.</p>
          </div>
        )}

        {activeTool === 'collaboration-suggestion' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Project Description</label>
              <textarea
                value={project}
                onChange={(e) => setProject(e.target.value)}
                rows={5}
                placeholder="What are you trying to accomplish? Goals, methods, current expertise gaps..."
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Required Expertise</label>
              <input
                type="text"
                value={expertise}
                onChange={(e) => setExpertise(e.target.value)}
                placeholder="e.g., cryo-EM, structural biology, mass spectrometry"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {activeTool === 'multi-modal-data-fusion' && (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Molecule ID (optional)</label>
              <input
                type="text"
                value={fusionMoleculeId}
                onChange={(e) => setFusionMoleculeId(e.target.value)}
                placeholder="e.g., 42"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assay IDs (comma separated)</label>
              <input
                type="text"
                value={fusionAssayIds}
                onChange={(e) => setFusionAssayIds(e.target.value)}
                placeholder="e.g., 11, 12, 13"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Document IDs (comma separated)</label>
              <input
                type="text"
                value={fusionDocumentIds}
                onChange={(e) => setFusionDocumentIds(e.target.value)}
                placeholder="e.g., 7, 8"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Instrument IDs (comma separated)</label>
              <input
                type="text"
                value={fusionInstrumentIds}
                onChange={(e) => setFusionInstrumentIds(e.target.value)}
                placeholder="e.g., 3"
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Free-form context (optional)</label>
              <textarea
                value={fusionFreeForm}
                onChange={(e) => setFusionFreeForm(e.target.value)}
                rows={4}
                placeholder="Add hypotheses, prior observations, or constraints to consider during fusion."
                className="w-full border rounded px-3 py-2 text-sm"
              />
            </div>
          </div>
        )}

        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">{error}</div>
        )}

        <button
          onClick={submit}
          disabled={loading}
          className="mt-4 inline-flex items-center gap-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white px-4 py-2 rounded-lg disabled:opacity-50"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {loading ? 'Working...' : `Run ${tool.label}`}
        </button>
      </div>

      <AIResponsePanel
        title={tool.label}
        response={response}
        loading={loading}
        onClose={() => setResponse('')}
      />
    </div>
  );
};

export default AIResearchToolsPage;
