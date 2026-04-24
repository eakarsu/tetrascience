import React, { useState, useEffect, useCallback } from 'react';
import { TestTube2, Plus, Search, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';

interface Assay {
  id: number;
  assayName: string;
  assayType: string;
  moleculeId: number;
  moleculeName?: string;
  targetProtein: string;
  result: number;
  unit: string;
  status: string;
  runDate: string;
  operator: string;
  plateId: string;
  wellPosition: string;
  concentration: number;
  concentrationUnit: string;
  notes: string;
}

const emptyAssay = {
  assayName: '', assayType: 'binding', moleculeId: '', targetProtein: '',
  result: 0, unit: 'nM', status: 'completed', runDate: new Date().toISOString().split('T')[0],
  operator: '', plateId: '', wellPosition: '',
  concentration: 0, concentrationUnit: 'uM', notes: '',
};

const AssayResultsPage: React.FC = () => {
  const [assays, setAssays] = useState<Assay[]>([]);
  const [filtered, setFiltered] = useState<Assay[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Assay | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyAssay);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/assays');
      setAssays(res.data);
    } catch (err) {
      console.error('Failed to fetch assays', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = assays;
    if (search) {
      const searchKeys: (keyof Assay)[] = ['assayName', 'assayType', 'targetProtein', 'result', 'unit', 'status', 'operator', 'runDate'];
      result = result.filter(a => matchesSearch(a, search, searchKeys));
    }
    if (typeFilter) result = result.filter(a => a.assayType === typeFilter);
    if (statusFilter) result = result.filter(a => a.status === statusFilter);
    setFiltered(result);
  }, [assays, search, typeFilter, statusFilter]);

  const { sorted, sort, requestSort } = useSortableData(filtered);

  const handleSave = async () => {
    setError('');
    try {
      const payload = { ...form, moleculeId: form.moleculeId ? parseInt(form.moleculeId) : null };
      if (isEditing && selected) {
        await api.put(`/assays/${selected.id}`, payload);
      } else {
        await api.post('/assays', payload);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyAssay);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/assays/${selected.id}`);
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
      const res = await api.post('/ai/analyze-assay', { assayId: selected.id });
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      completed: 'bg-green-100 text-green-700',
      running: 'bg-blue-100 text-blue-700',
      failed: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  const types = [...new Set(assays.map(a => a.assayType).filter(Boolean))];
  const statuses = [...new Set(assays.map(a => a.status).filter(Boolean))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-lg flex items-center justify-center">
            <TestTube2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Assay Results</h1>
            <p className="text-sm text-gray-500">{filtered.length} assays</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyAssay); setIsEditing(false); setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> New Assay
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search assays..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All Types</option>
          {types.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortableTh label="Assay Name" sortKey="assayName" sort={sort} onSort={requestSort} />
                <SortableTh label="Type" sortKey="assayType" sort={sort} onSort={requestSort} />
                <SortableTh label="Molecule" sortKey="moleculeName" sort={sort} onSort={requestSort} />
                <SortableTh label="Target" sortKey="targetProtein" sort={sort} onSort={requestSort} />
                <SortableTh label="Result" sortKey="result" sort={sort} onSort={requestSort} />
                <SortableTh label="Unit" sortKey="unit" sort={sort} onSort={requestSort} />
                <SortableTh label="Status" sortKey="status" sort={sort} onSort={requestSort} />
                <SortableTh label="Run Date" sortKey="runDate" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((a) => (
                <tr key={a.id} onClick={() => { setSelected(a); setShowDetail(true); setAiResponse(''); }}
                  className="border-b border-gray-100 hover:bg-green-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{a.assayName}</td>
                  <td className="px-4 py-3 text-gray-600">{a.assayType}</td>
                  <td className="px-4 py-3 text-gray-600">{a.moleculeName || `ID: ${a.moleculeId}`}</td>
                  <td className="px-4 py-3 text-gray-600">{a.targetProtein}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono">{a.result}</td>
                  <td className="px-4 py-3 text-gray-600">{a.unit}</td>
                  <td className="px-4 py-3">{statusBadge(a.status)}</td>
                  <td className="px-4 py-3 text-gray-600">{a.runDate ? new Date(a.runDate).toLocaleDateString() : ''}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No assays found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title={selected?.assayName || 'Assay Details'}
        onEdit={() => { if (selected) { setForm({ ...selected }); setIsEditing(true); setShowDetail(false); setShowForm(true); setError(''); } }}
        onDelete={() => setShowConfirm(true)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Assay Name</p><p className="font-medium">{selected.assayName}</p></div>
              <div><p className="text-xs text-gray-500">Type</p><p>{selected.assayType}</p></div>
              <div><p className="text-xs text-gray-500">Target Protein</p><p>{selected.targetProtein}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><p>{statusBadge(selected.status)}</p></div>
              <div><p className="text-xs text-gray-500">Result</p><p className="font-mono">{selected.result} {selected.unit}</p></div>
              <div><p className="text-xs text-gray-500">Molecule ID</p><p>{selected.moleculeId}</p></div>
              <div><p className="text-xs text-gray-500">Operator</p><p>{selected.operator}</p></div>
              <div><p className="text-xs text-gray-500">Plate ID</p><p>{selected.plateId}</p></div>
              <div><p className="text-xs text-gray-500">Well Position</p><p>{selected.wellPosition}</p></div>
              <div><p className="text-xs text-gray-500">Concentration</p><p>{selected.concentration} {selected.concentrationUnit}</p></div>
              <div><p className="text-xs text-gray-500">Run Date</p><p>{selected.runDate ? new Date(selected.runDate).toLocaleDateString() : ''}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Notes</p><p className="text-sm">{selected.notes}</p></div>
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Analyze with AI
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Assay Analysis" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete}
        title="Delete Assay" message={`Are you sure you want to delete "${selected?.assayName}"? This action cannot be undone.`} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Assay' : 'New Assay'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assay Name *</label>
                  <input type="text" value={form.assayName} onChange={(e) => setForm({ ...form, assayName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assay Type</label>
                  <select value={form.assayType} onChange={(e) => setForm({ ...form, assayType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="binding">Binding</option>
                    <option value="enzymatic">Enzymatic</option>
                    <option value="cell_viability">Cell Viability</option>
                    <option value="admet">ADMET</option>
                    <option value="functional">Functional</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Molecule ID</label>
                  <input type="number" value={form.moleculeId} onChange={(e) => setForm({ ...form, moleculeId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Protein</label>
                  <input type="text" value={form.targetProtein} onChange={(e) => setForm({ ...form, targetProtein: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Result</label>
                  <input type="number" step="0.001" value={form.result} onChange={(e) => setForm({ ...form, result: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit</label>
                  <input type="text" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="completed">Completed</option>
                    <option value="running">Running</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Run Date</label>
                  <input type="date" value={form.runDate} onChange={(e) => setForm({ ...form, runDate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
                  <input type="text" value={form.operator} onChange={(e) => setForm({ ...form, operator: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plate ID</label>
                  <input type="text" value={form.plateId} onChange={(e) => setForm({ ...form, plateId: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Well Position</label>
                  <input type="text" value={form.wellPosition} onChange={(e) => setForm({ ...form, wellPosition: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Concentration</label>
                  <input type="number" step="0.01" value={form.concentration} onChange={(e) => setForm({ ...form, concentration: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Concentration Unit</label>
                  <input type="text" value={form.concentrationUnit} onChange={(e) => setForm({ ...form, concentrationUnit: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={3}
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

export default AssayResultsPage;
