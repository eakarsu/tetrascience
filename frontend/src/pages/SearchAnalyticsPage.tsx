import React, { useState, useEffect, useCallback } from 'react';
import { BarChart3, Plus, Search, Sparkles } from 'lucide-react';
import api from '../services/api';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';

interface SearchQuery {
  id: number;
  query: string;
  searchType: string;
  resultsCount: number;
  clickedResultId: number;
  clickPosition: number;
  responseTimeMs: number;
  precisionAtK: number;
  mrr: number;
  ndcg: number;
  userId: number;
  sessionId: string;
  createdAt: string;
  updatedAt: string;
}

const emptyQuery = {
  query: '', searchType: 'semantic', resultsCount: 0, clickedResultId: 0, clickPosition: 0,
  responseTimeMs: 0, precisionAtK: 0, mrr: 0, ndcg: 0,
  userId: 1, sessionId: '',
};

const SearchAnalyticsPage: React.FC = () => {
  const [queries, setQueries] = useState<SearchQuery[]>([]);
  const [filtered, setFiltered] = useState<SearchQuery[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<SearchQuery | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyQuery);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/search-analytics');
      setQueries(res.data);
    } catch (err) {
      console.error('Failed to fetch search analytics', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = queries;
    if (search) {
      result = result.filter(q => matchesSearch(q, search, [
        'query', 'searchType', 'resultsCount', 'responseTimeMs',
        'precisionAtK', 'mrr', 'ndcg', 'userId', 'sessionId',
      ]));
    }
    setFiltered(result);
  }, [queries, search]);

  const { sorted, sort, requestSort } = useSortableData(filtered);

  const handleSave = async () => {
    setError('');
    try {
      const payload = { ...form };
      if (isEditing && selected) {
        await api.put(`/search-analytics/${selected.id}`, payload);
      } else {
        await api.post('/search-analytics', payload);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyQuery);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/search-analytics/${selected.id}`);
      setShowDetail(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const handleAI = async () => {
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await api.post('/ai/analyze-search-quality', {});
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const avgResponseTime = queries.length > 0 ? (queries.reduce((s, q) => s + (q.responseTimeMs || 0), 0) / queries.length).toFixed(0) : '0';
  const avgPrecision = queries.length > 0 ? (queries.reduce((s, q) => s + (q.precisionAtK || 0), 0) / queries.length).toFixed(3) : '0';
  const avgMRR = queries.length > 0 ? (queries.reduce((s, q) => s + (q.mrr || 0), 0) / queries.length).toFixed(3) : '0';
  const avgNDCG = queries.length > 0 ? (queries.reduce((s, q) => s + (q.ndcg || 0), 0) / queries.length).toFixed(3) : '0';

  const typeCounts: Record<string, number> = {};
  queries.forEach(q => {
    typeCounts[q.searchType] = (typeCounts[q.searchType] || 0) + 1;
  });
  const maxTypeCount = Math.max(...Object.values(typeCounts), 1);

  const stats = [
    { label: 'Avg Response Time', value: `${avgResponseTime}ms`, color: 'text-teal-600', bg: 'bg-teal-50' },
    { label: 'Avg Precision@K', value: avgPrecision, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Avg MRR', value: avgMRR, color: 'text-purple-600', bg: 'bg-purple-50' },
    { label: 'Avg nDCG', value: avgNDCG, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Total Queries', value: queries.length.toString(), color: 'text-gray-600', bg: 'bg-gray-50' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-lg flex items-center justify-center">
            <BarChart3 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Search Analytics</h1>
            <p className="text-sm text-gray-500">{filtered.length} queries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAI} disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
            <Sparkles className="w-4 h-4" /> Analyze Quality
          </button>
          <button onClick={() => { setForm(emptyQuery); setIsEditing(false); setShowForm(true); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Log Query
          </button>
        </div>
      </div>

      <div className="grid grid-cols-5 gap-4 mb-6">
        {stats.map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-200 p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className={`text-xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {Object.keys(typeCounts).length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-medium text-gray-700 mb-3">Query Distribution by Search Type</h3>
          <div className="space-y-2">
            {Object.entries(typeCounts).map(([type, count]) => (
              <div key={type} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 w-24">{type}</span>
                <div className="flex-1 h-6 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-gradient-to-r from-teal-500 to-teal-400 rounded-full flex items-center justify-end pr-2 transition-all"
                    style={{ width: `${(count / maxTypeCount) * 100}%`, minWidth: '2rem' }}>
                    <span className="text-xs text-white font-medium">{count}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Search Quality Analysis" onClose={() => setAiResponse('')} />

      <div className="flex flex-wrap gap-3 mb-4 mt-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search queries..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortableTh label="Query" sortKey="query" sort={sort} onSort={requestSort} />
                <SortableTh label="Search Type" sortKey="searchType" sort={sort} onSort={requestSort} />
                <SortableTh label="Results" sortKey="resultsCount" sort={sort} onSort={requestSort} />
                <SortableTh label="Click Pos" sortKey="clickPosition" sort={sort} onSort={requestSort} />
                <SortableTh label="Response" sortKey="responseTimeMs" sort={sort} onSort={requestSort} />
                <SortableTh label="Precision" sortKey="precisionAtK" sort={sort} onSort={requestSort} />
                <SortableTh label="MRR" sortKey="mrr" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((q) => (
                <tr key={q.id} onClick={() => { setSelected(q); setShowDetail(true); }}
                  className="border-b border-gray-100 hover:bg-teal-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{q.query}</td>
                  <td className="px-4 py-3 text-gray-600">{q.searchType}</td>
                  <td className="px-4 py-3 text-gray-600">{q.resultsCount}</td>
                  <td className="px-4 py-3 text-gray-600">{q.clickPosition}</td>
                  <td className="px-4 py-3 text-gray-600">{q.responseTimeMs}ms</td>
                  <td className="px-4 py-3 text-gray-600">{q.precisionAtK?.toFixed(3)}</td>
                  <td className="px-4 py-3 text-gray-600">{q.mrr?.toFixed(3)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No queries found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Search Query Details"
        onEdit={() => {
          if (selected) {
            setForm({ ...selected });
            setIsEditing(true); setShowDetail(false); setShowForm(true); setError('');
          }
        }}
        onDelete={() => setShowConfirm(true)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><p className="text-xs text-gray-500">Query</p><p className="font-medium">{selected.query}</p></div>
              <div><p className="text-xs text-gray-500">Search Type</p><p>{selected.searchType}</p></div>
              <div><p className="text-xs text-gray-500">Results Count</p><p>{selected.resultsCount}</p></div>
              <div><p className="text-xs text-gray-500">Click Position</p><p>{selected.clickPosition}</p></div>
              <div><p className="text-xs text-gray-500">Response Time</p><p>{selected.responseTimeMs}ms</p></div>
              <div><p className="text-xs text-gray-500">Precision@K</p><p>{selected.precisionAtK?.toFixed(4)}</p></div>
              <div><p className="text-xs text-gray-500">MRR</p><p>{selected.mrr?.toFixed(4)}</p></div>
              <div><p className="text-xs text-gray-500">nDCG</p><p>{selected.ndcg?.toFixed(4)}</p></div>
              <div><p className="text-xs text-gray-500">Session ID</p><p className="font-mono text-xs">{selected.sessionId}</p></div>
              <div><p className="text-xs text-gray-500">Created At</p><p>{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ''}</p></div>
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Analyze with AI
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Query Analysis" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete}
        title="Delete Query" message="Are you sure you want to delete this search query record?" />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Query' : 'Log Query'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Query *</label>
                  <input type="text" value={form.query} onChange={(e) => setForm({ ...form, query: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Search Type</label>
                  <select value={form.searchType} onChange={(e) => setForm({ ...form, searchType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="semantic">Semantic</option>
                    <option value="keyword">Keyword</option>
                    <option value="hybrid">Hybrid</option>
                    <option value="structural">Structural</option>
                    <option value="similarity">Similarity</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Results Count</label>
                  <input type="number" value={form.resultsCount} onChange={(e) => setForm({ ...form, resultsCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Click Position</label>
                  <input type="number" value={form.clickPosition} onChange={(e) => setForm({ ...form, clickPosition: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Response Time (ms)</label>
                  <input type="number" value={form.responseTimeMs} onChange={(e) => setForm({ ...form, responseTimeMs: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Precision@K</label>
                  <input type="number" step="0.001" value={form.precisionAtK} onChange={(e) => setForm({ ...form, precisionAtK: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">MRR</label>
                  <input type="number" step="0.001" value={form.mrr} onChange={(e) => setForm({ ...form, mrr: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">nDCG</label>
                  <input type="number" step="0.001" value={form.ndcg} onChange={(e) => setForm({ ...form, ndcg: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Session ID</label>
                  <input type="text" value={form.sessionId} onChange={(e) => setForm({ ...form, sessionId: e.target.value })}
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

export default SearchAnalyticsPage;
