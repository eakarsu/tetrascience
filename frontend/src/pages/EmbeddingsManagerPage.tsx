import React, { useState, useEffect, useCallback } from 'react';
import { Boxes, Plus, Search, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';

interface Embedding {
  id: number;
  name: string;
  sourceType: string;
  sourceText: string;
  modelName: string;
  dimensions: number;
  vector: number[];
  similarityScore: number;
  metadata: any;
  createdAt: string;
}

const emptyEmbedding = {
  name: '', sourceType: 'molecule', sourceText: '', modelName: 'text-embedding-ada-002',
  dimensions: 1536, vector: '[]', similarityScore: 0, metadata: '{}',
};

const parseVector = (v: any): number[] => {
  if (Array.isArray(v)) return v;
  if (typeof v === 'string') { try { return JSON.parse(v); } catch { return []; } }
  return [];
};

const EmbeddingsManagerPage: React.FC = () => {
  const [embeddings, setEmbeddings] = useState<Embedding[]>([]);
  const [filtered, setFiltered] = useState<Embedding[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Embedding | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyEmbedding);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/embeddings');
      setEmbeddings(res.data);
    } catch (err) {
      console.error('Failed to fetch embeddings', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const result = embeddings.filter(e =>
      matchesSearch(e, search, ['name', 'sourceText', 'sourceType', 'modelName', 'dimensions', 'similarityScore'])
    );
    setFiltered(result);
  }, [embeddings, search]);

  const { sorted, sort, requestSort } = useSortableData(filtered);

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        vector: typeof form.vector === 'string' ? JSON.parse(form.vector || '[]') : form.vector,
        metadata: typeof form.metadata === 'string' ? JSON.parse(form.metadata || '{}') : form.metadata,
      };
      if (isEditing && selected) {
        await api.put(`/embeddings/${selected.id}`, payload);
      } else {
        await api.post('/embeddings', payload);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyEmbedding);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/embeddings/${selected.id}`);
      setShowDetail(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const handleAI = async () => {
    if (!selected) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await api.post('/ai/generate-embedding-description', { text: selected.sourceText, sourceType: selected.sourceType });
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI description. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-violet-600 rounded-lg flex items-center justify-center">
            <Boxes className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Embeddings Manager</h1>
            <p className="text-sm text-gray-500">{filtered.length} embeddings</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyEmbedding); setIsEditing(false); setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Embedding
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search embeddings..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortableTh label="Name" sortKey="name" sort={sort} onSort={requestSort} />
                <SortableTh label="Source Type" sortKey="sourceType" sort={sort} onSort={requestSort} />
                <SortableTh label="Model" sortKey="modelName" sort={sort} onSort={requestSort} />
                <SortableTh label="Dimensions" sortKey="dimensions" sort={sort} onSort={requestSort} />
                <SortableTh label="Similarity" sortKey="similarityScore" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id} onClick={() => { setSelected(e); setShowDetail(true); setAiResponse(''); }}
                  className="border-b border-gray-100 hover:bg-violet-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.name}</td>
                  <td className="px-4 py-3 text-gray-600">{e.sourceType}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{e.modelName}</td>
                  <td className="px-4 py-3 text-gray-600">{e.dimensions}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-violet-500 rounded-full" style={{ width: `${(e.similarityScore || 0) * 100}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500">{((e.similarityScore || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-gray-400">No embeddings found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title={selected?.name || 'Embedding Details'}
        onEdit={() => {
          if (selected) {
            setForm({
              ...selected,
              vector: JSON.stringify(parseVector(selected.vector).slice(0, 20), null, 2),
              metadata: JSON.stringify(selected.metadata || {}, null, 2),
            });
            setIsEditing(true); setShowDetail(false); setShowForm(true); setError('');
          }
        }}
        onDelete={() => setShowConfirm(true)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-xs text-gray-500">Source Type</p><p>{selected.sourceType}</p></div>
              <div><p className="text-xs text-gray-500">Source Text</p><p>{selected.sourceText}</p></div>
              <div><p className="text-xs text-gray-500">Model</p><p className="font-mono text-sm">{selected.modelName}</p></div>
              <div><p className="text-xs text-gray-500">Dimensions</p><p>{selected.dimensions}</p></div>
              <div><p className="text-xs text-gray-500">Similarity Score</p><p>{((selected.similarityScore || 0) * 100).toFixed(1)}%</p></div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Vector Preview (first 10 dimensions)</p>
                <div className="flex flex-wrap gap-1">
                  {parseVector(selected.vector).slice(0, 10).map((v: number, i: number) => (
                    <span key={i} className="px-2 py-1 bg-violet-50 text-violet-700 rounded text-xs font-mono">
                      {typeof v === 'number' ? v.toFixed(4) : v}
                    </span>
                  ))}
                  {parseVector(selected.vector).length > 10 && (
                    <span className="px-2 py-1 bg-gray-50 text-gray-500 rounded text-xs">
                      ...+{parseVector(selected.vector).length - 10} more
                    </span>
                  )}
                </div>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Metadata</p>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto">{JSON.stringify(selected.metadata, null, 2)}</pre>
              </div>
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Generate Description
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Embedding Description" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete}
        title="Delete Embedding" message={`Are you sure you want to delete "${selected?.name}"?`} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Embedding' : 'New Embedding'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Type</label>
                  <select value={form.sourceType} onChange={(e) => setForm({ ...form, sourceType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="molecule">Molecule</option>
                    <option value="document">Document</option>
                    <option value="assay">Assay</option>
                    <option value="entity">Entity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source Text</label>
                  <input type="text" value={form.sourceText} onChange={(e) => setForm({ ...form, sourceText: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model Name</label>
                  <select value={form.modelName} onChange={(e) => setForm({ ...form, modelName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="text-embedding-ada-002">text-embedding-ada-002</option>
                    <option value="text-embedding-3-small">text-embedding-3-small</option>
                    <option value="text-embedding-3-large">text-embedding-3-large</option>
                    <option value="mol2vec">mol2vec</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dimensions</label>
                  <input type="number" value={form.dimensions} onChange={(e) => setForm({ ...form, dimensions: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Similarity Score</label>
                  <input type="number" step="0.01" min="0" max="1" value={form.similarityScore}
                    onChange={(e) => setForm({ ...form, similarityScore: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Vector (JSON array)</label>
                  <textarea value={form.vector} onChange={(e) => setForm({ ...form, vector: e.target.value })} rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Metadata (JSON)</label>
                  <textarea value={form.metadata} onChange={(e) => setForm({ ...form, metadata: e.target.value })} rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium">Cancel</button>
              <button onClick={handleSave} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                {isEditing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmbeddingsManagerPage;
