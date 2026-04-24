import React, { useState, useEffect, useCallback } from 'react';
import { Workflow, Plus, Search, Sparkles, Play, CheckCircle, XCircle, Clock } from 'lucide-react';
import api from '../services/api';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';

interface Pipeline {
  id: number;
  name: string;
  pipelineType: string;
  source: string;
  destination: string;
  status: string;
  recordsProcessed: number;
  recordsTotal: number;
  startTime: string;
  endTime: string;
  lastRunDuration: number;
  errorMessage: string;
  schedule: string;
}

const emptyPipeline = {
  name: '', pipelineType: 'etl', source: '', destination: '',
  status: 'queued', recordsProcessed: 0, recordsTotal: 100, startTime: '',
  endTime: '', lastRunDuration: 0, errorMessage: '', schedule: '',
};

const PipelineMonitorPage: React.FC = () => {
  const [pipelines, setPipelines] = useState<Pipeline[]>([]);
  const [filtered, setFiltered] = useState<Pipeline[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Pipeline | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyPipeline);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/pipelines');
      setPipelines(res.data);
    } catch (err) {
      console.error('Failed to fetch pipelines', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = pipelines;
    if (search) {
      result = result.filter(p =>
        matchesSearch(p, search, ['name', 'pipelineType', 'source', 'destination', 'status', 'recordsProcessed', 'recordsTotal', 'lastRunDuration'])
      );
    }
    setFiltered(result);
  }, [pipelines, search]);

  const { sorted, sort, requestSort } = useSortableData(filtered);

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
      };
      if (isEditing && selected) {
        await api.put(`/pipelines/${selected.id}`, payload);
      } else {
        await api.post('/pipelines', payload);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyPipeline);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/pipelines/${selected.id}`);
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
      const res = await api.post('/ai/diagnose-pipeline', { pipelineId: selected.id });
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI diagnosis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      running: 'bg-blue-100 text-blue-700',
      completed: 'bg-green-100 text-green-700',
      failed: 'bg-red-100 text-red-700',
      queued: 'bg-yellow-100 text-yellow-700',
      paused: 'bg-gray-100 text-gray-600',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  const statusCounts = {
    running: pipelines.filter(p => p.status === 'running').length,
    completed: pipelines.filter(p => p.status === 'completed').length,
    failed: pipelines.filter(p => p.status === 'failed').length,
    queued: pipelines.filter(p => p.status === 'queued').length,
  };

  const summaryCards = [
    { label: 'Running', count: statusCounts.running, icon: Play, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Completed', count: statusCounts.completed, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Failed', count: statusCounts.failed, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
    { label: 'Queued', count: statusCounts.queued, icon: Clock, color: 'text-yellow-600', bg: 'bg-yellow-50' },
  ];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-cyan-600 rounded-lg flex items-center justify-center">
            <Workflow className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Pipeline Monitor</h1>
            <p className="text-sm text-gray-500">{filtered.length} pipelines</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyPipeline); setIsEditing(false); setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Pipeline
        </button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        {summaryCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{card.count}</p>
                </div>
                <div className={`w-10 h-10 ${card.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${card.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search pipelines..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortableTh label="Name" sortKey="name" sort={sort} onSort={requestSort} />
                <SortableTh label="Type" sortKey="pipelineType" sort={sort} onSort={requestSort} />
                <SortableTh label="Source → Destination" sortKey="source" sort={sort} onSort={requestSort} />
                <SortableTh label="Records" sortKey="recordsProcessed" sort={sort} onSort={requestSort} />
                <SortableTh label="Status" sortKey="status" sort={sort} onSort={requestSort} />
                <SortableTh label="Duration" sortKey="lastRunDuration" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((p) => {
                const progress = p.recordsTotal > 0 ? (p.recordsProcessed / p.recordsTotal) * 100 : 0;
                return (
                  <tr key={p.id} onClick={() => { setSelected(p); setShowDetail(true); setAiResponse(''); }}
                    className="border-b border-gray-100 hover:bg-cyan-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.name}</td>
                    <td className="px-4 py-3 text-gray-600">{p.pipelineType}</td>
                    <td className="px-4 py-3 text-gray-600">{p.source} → {p.destination}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
                          <div className="h-full bg-cyan-500 rounded-full transition-all" style={{ width: `${progress}%` }}></div>
                        </div>
                        <span className="text-xs text-gray-500">{p.recordsProcessed}/{p.recordsTotal}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">{statusBadge(p.status)}</td>
                    <td className="px-4 py-3 text-gray-600">{p.lastRunDuration ? `${p.lastRunDuration}s` : '-'}</td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No pipelines found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title={selected?.name || 'Pipeline Details'}
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
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-xs text-gray-500">Type</p><p>{selected.pipelineType}</p></div>
              <div><p className="text-xs text-gray-500">Source</p><p>{selected.source}</p></div>
              <div><p className="text-xs text-gray-500">Destination</p><p>{selected.destination}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><p>{statusBadge(selected.status)}</p></div>
              <div><p className="text-xs text-gray-500">Schedule</p><p>{selected.schedule}</p></div>
              <div><p className="text-xs text-gray-500">Records</p><p>{selected.recordsProcessed} / {selected.recordsTotal}</p></div>
              <div><p className="text-xs text-gray-500">Duration</p><p>{selected.lastRunDuration ? `${selected.lastRunDuration}s` : '-'}</p></div>
              <div><p className="text-xs text-gray-500">Start Time</p><p>{selected.startTime ? new Date(selected.startTime).toLocaleString() : '-'}</p></div>
              <div><p className="text-xs text-gray-500">End Time</p><p>{selected.endTime ? new Date(selected.endTime).toLocaleString() : '-'}</p></div>
              {selected.errorMessage && (
                <div className="col-span-2">
                  <p className="text-xs text-gray-500">Error Message</p>
                  <p className="text-sm text-red-600 bg-red-50 rounded-lg p-2">{selected.errorMessage}</p>
                </div>
              )}
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Analyze with AI
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Pipeline Diagnosis" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete}
        title="Delete Pipeline" message={`Are you sure you want to delete "${selected?.name}"?`} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Pipeline' : 'New Pipeline'}</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Pipeline Type</label>
                  <select value={form.pipelineType} onChange={(e) => setForm({ ...form, pipelineType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="etl">ETL</option>
                    <option value="streaming">Streaming</option>
                    <option value="batch">Batch</option>
                    <option value="real_time">Real Time</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="queued">Queued</option>
                    <option value="running">Running</option>
                    <option value="completed">Completed</option>
                    <option value="failed">Failed</option>
                    <option value="paused">Paused</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <input type="text" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destination</label>
                  <input type="text" value={form.destination} onChange={(e) => setForm({ ...form, destination: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Records Processed</label>
                  <input type="number" value={form.recordsProcessed} onChange={(e) => setForm({ ...form, recordsProcessed: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Records</label>
                  <input type="number" value={form.recordsTotal} onChange={(e) => setForm({ ...form, recordsTotal: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Schedule</label>
                  <input type="text" value={form.schedule} onChange={(e) => setForm({ ...form, schedule: e.target.value })}
                    placeholder="e.g., 0 */6 * * *"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Error Message</label>
                  <input type="text" value={form.errorMessage} onChange={(e) => setForm({ ...form, errorMessage: e.target.value })}
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

export default PipelineMonitorPage;
