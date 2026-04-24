import React, { useState, useEffect, useCallback } from 'react';
import { Fingerprint, Plus, Search, Sparkles, FileText } from 'lucide-react';
import api from '../services/api';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';

interface Entity {
  id: number;
  surfaceForm: string;
  canonicalName: string;
  entityType: string;
  confidence: number;
  resolved: boolean;
  resolvedBy: string;
  source: string;
  context: string;
  externalIds: any;
  createdAt: string;
  updatedAt: string;
}

const emptyEntity = {
  surfaceForm: '', canonicalName: '', entityType: 'compound', confidence: 0.9,
  resolved: false, source: 'manual', context: '', externalIds: '',
};

const EntityResolutionPage: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [filtered, setFiltered] = useState<Entity[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Entity | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExtract, setShowExtract] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyEntity);
  const [extractText, setExtractText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/entities');
      setEntities(res.data);
    } catch (err) {
      console.error('Failed to fetch entities', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = entities;
    if (search) {
      result = result.filter(e =>
        matchesSearch(e, search, ['surfaceForm', 'canonicalName', 'entityType', 'confidence', 'source', 'resolved'])
      );
    }
    setFiltered(result);
  }, [entities, search]);

  const { sorted, sort, requestSort } = useSortableData(filtered);

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        externalIds: typeof form.externalIds === 'string' ? (() => { try { return JSON.parse(form.externalIds); } catch { return form.externalIds; } })() : form.externalIds,
      };
      if (isEditing && selected) {
        await api.put(`/entities/${selected.id}`, payload);
      } else {
        await api.post('/entities', payload);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyEntity);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/entities/${selected.id}`);
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
      const res = await api.post('/ai/extract-entities', { entityId: selected.id, type: 'entity-analysis', text: selected.context || selected.canonicalName });
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const handleExtract = async () => {
    if (!extractText.trim()) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await api.post('/ai/extract-entities', { text: extractText });
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
      fetchData();
    } catch (err) {
      setAiResponse('Failed to extract entities. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center">
            <Fingerprint className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Entity Resolution</h1>
            <p className="text-sm text-gray-500">{filtered.length} entities</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => { setExtractText(''); setShowExtract(true); setAiResponse(''); setAiLoading(false); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
            <FileText className="w-4 h-4" /> Extract from Text
          </button>
          <button onClick={() => { setForm(emptyEntity); setIsEditing(false); setShowForm(true); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> New Entity
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search entities..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortableTh label="Surface Form" sortKey="surfaceForm" sort={sort} onSort={requestSort} />
                <SortableTh label="Canonical Name" sortKey="canonicalName" sort={sort} onSort={requestSort} />
                <SortableTh label="Type" sortKey="entityType" sort={sort} onSort={requestSort} />
                <SortableTh label="Confidence" sortKey="confidence" sort={sort} onSort={requestSort} />
                <SortableTh label="Resolved" sortKey="resolved" sort={sort} onSort={requestSort} />
                <SortableTh label="Source" sortKey="source" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((e) => (
                <tr key={e.id} onClick={() => { setSelected(e); setShowDetail(true); }}
                  className="border-b border-gray-100 hover:bg-rose-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{e.surfaceForm}</td>
                  <td className="px-4 py-3 text-gray-600">{e.canonicalName}</td>
                  <td className="px-4 py-3 text-gray-600">{e.entityType}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(e.confidence || 0) * 100}%` }}></div>
                      </div>
                      <span className="text-xs text-gray-500">{((e.confidence || 0) * 100).toFixed(0)}%</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${e.resolved ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
                      {e.resolved ? 'Yes' : 'No'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{e.source}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No entities found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title={selected?.canonicalName || 'Entity Details'}
        onEdit={() => {
          if (selected) {
            setForm({ ...selected, externalIds: typeof selected.externalIds === 'object' ? JSON.stringify(selected.externalIds, null, 2) : selected.externalIds });
            setIsEditing(true); setShowDetail(false); setShowForm(true); setError('');
          }
        }}
        onDelete={() => setShowConfirm(true)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Surface Form</p><p className="font-medium">{selected.surfaceForm}</p></div>
              <div><p className="text-xs text-gray-500">Canonical Name</p><p className="font-medium">{selected.canonicalName}</p></div>
              <div><p className="text-xs text-gray-500">Type</p><p>{selected.entityType}</p></div>
              <div><p className="text-xs text-gray-500">Confidence</p>
                <div className="flex items-center gap-2">
                  <div className="w-24 h-2 bg-gray-200 rounded-full overflow-hidden">
                    <div className="h-full bg-rose-500 rounded-full" style={{ width: `${(selected.confidence || 0) * 100}%` }}></div>
                  </div>
                  <span className="text-sm">{((selected.confidence || 0) * 100).toFixed(1)}%</span>
                </div>
              </div>
              <div><p className="text-xs text-gray-500">Resolved</p><p>{selected.resolved ? 'Yes' : 'No'}</p></div>
              <div><p className="text-xs text-gray-500">Resolved By</p><p>{selected.resolvedBy}</p></div>
              <div><p className="text-xs text-gray-500">Source</p><p>{selected.source}</p></div>
              <div><p className="text-xs text-gray-500">External IDs</p><p className="font-mono text-xs">{typeof selected.externalIds === 'object' ? JSON.stringify(selected.externalIds) : selected.externalIds}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Context</p><p className="text-sm">{selected.context}</p></div>
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Analyze with AI
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Entity Analysis" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete}
        title="Delete Entity" message={`Are you sure you want to delete "${selected?.canonicalName}"?`} />

      {showExtract && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowExtract(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Extract Entities from Text</h2>
              <button onClick={() => setShowExtract(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Paste scientific text</label>
                <textarea value={extractText} onChange={(e) => setExtractText(e.target.value)} rows={6}
                  placeholder="Paste text containing scientific entities..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <button onClick={handleExtract} disabled={aiLoading || !extractText.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium disabled:opacity-50">
                <Sparkles className="w-4 h-4" /> Extract Entities
              </button>
              <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Entity Extraction" onClose={() => setAiResponse('')} />
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Entity' : 'New Entity'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Surface Form *</label>
                  <input type="text" value={form.surfaceForm} onChange={(e) => setForm({ ...form, surfaceForm: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Canonical Name *</label>
                  <input type="text" value={form.canonicalName} onChange={(e) => setForm({ ...form, canonicalName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Entity Type</label>
                  <select value={form.entityType} onChange={(e) => setForm({ ...form, entityType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="compound">Compound</option>
                    <option value="protein">Protein</option>
                    <option value="gene">Gene</option>
                    <option value="disease">Disease</option>
                    <option value="pathway">Pathway</option>
                    <option value="organism">Organism</option>
                    <option value="cell_line">Cell Line</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Confidence</label>
                  <input type="number" step="0.01" min="0" max="1" value={form.confidence}
                    onChange={(e) => setForm({ ...form, confidence: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resolved</label>
                  <select value={form.resolved ? 'true' : 'false'} onChange={(e) => setForm({ ...form, resolved: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <input type="text" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">External IDs</label>
                  <input type="text" value={form.externalIds} onChange={(e) => setForm({ ...form, externalIds: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Context</label>
                  <textarea value={form.context} onChange={(e) => setForm({ ...form, context: e.target.value })} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
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

export default EntityResolutionPage;
