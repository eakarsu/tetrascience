import React, { useState, useEffect, useCallback } from 'react';
import { FlaskConical, Plus, Search, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';

interface Molecule {
  id: number;
  name: string;
  smiles: string;
  molecularFormula: string;
  molecularWeight: number;
  logP: number;
  tpsa: number;
  hbdCount: number;
  hbaCount: number;
  rotatableBonds: number;
  category: string;
  targetProtein: string;
  status: string;
  source: string;
  description: string;
}

const emptyMolecule = {
  name: '', smiles: '', molecularFormula: '', molecularWeight: 0, logP: 0,
  tpsa: 0, hbdCount: 0, hbaCount: 0,
  rotatableBonds: 0, category: 'small_molecule', targetProtein: '', status: 'active',
  source: '', description: '',
};

const MolecularSearchPage: React.FC = () => {
  const [molecules, setMolecules] = useState<Molecule[]>([]);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Molecule | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyMolecule);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/molecules');
      setMolecules(res.data);
    } catch (err) {
      console.error('Failed to fetch molecules', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const filtered = molecules.filter(m => {
    if (categoryFilter && m.category !== categoryFilter) return false;
    if (statusFilter && m.status !== statusFilter) return false;
    return matchesSearch(m, search, ['name', 'smiles', 'molecularFormula', 'molecularWeight', 'logP', 'category', 'targetProtein', 'status', 'source']);
  });
  const { sorted, sort, requestSort } = useSortableData(filtered);

  const handleSave = async () => {
    setError('');
    try {
      if (isEditing && selected) {
        await api.put(`/molecules/${selected.id}`, form);
      } else {
        await api.post('/molecules', form);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyMolecule);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/molecules/${selected.id}`);
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
      const res = await api.post('/ai/analyze-molecule', { moleculeId: selected.id });
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      screening: 'bg-yellow-100 text-yellow-700',
      inactive: 'bg-gray-100 text-gray-600',
    };
    return (
      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>
        {status}
      </span>
    );
  };

  const categories = [...new Set(molecules.map(m => m.category).filter(Boolean))];
  const statuses = [...new Set(molecules.map(m => m.status).filter(Boolean))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
            <FlaskConical className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Molecular Search</h1>
            <p className="text-sm text-gray-500">{filtered.length} molecules</p>
          </div>
        </div>
        <button
          onClick={() => { setForm(emptyMolecule); setIsEditing(false); setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> New Molecule
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search molecules..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none"
          />
        </div>
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
        >
          <option value="">All Statuses</option>
          {statuses.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortableTh label="Name" sortKey="name" sort={sort} onSort={requestSort} />
                <SortableTh label="SMILES" sortKey="smiles" sort={sort} onSort={requestSort} />
                <SortableTh label="Formula" sortKey="molecularFormula" sort={sort} onSort={requestSort} />
                <SortableTh label="Weight" sortKey="molecularWeight" sort={sort} onSort={requestSort} />
                <SortableTh label="Category" sortKey="category" sort={sort} onSort={requestSort} />
                <SortableTh label="Target" sortKey="targetProtein" sort={sort} onSort={requestSort} />
                <SortableTh label="Status" sortKey="status" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((m) => (
                <tr
                  key={m.id}
                  onClick={() => { setSelected(m); setShowDetail(true); setAiResponse(''); }}
                  className="border-b border-gray-100 hover:bg-blue-50 cursor-pointer transition-colors"
                >
                  <td className="px-4 py-3 font-medium text-gray-900">{m.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs max-w-[150px] truncate">{m.smiles}</td>
                  <td className="px-4 py-3 text-gray-600">{m.molecularFormula}</td>
                  <td className="px-4 py-3 text-gray-600">{m.molecularWeight?.toFixed(2)}</td>
                  <td className="px-4 py-3 text-gray-600">{m.category}</td>
                  <td className="px-4 py-3 text-gray-600">{m.targetProtein}</td>
                  <td className="px-4 py-3">{statusBadge(m.status)}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-gray-400">No molecules found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal
        isOpen={showDetail}
        onClose={() => setShowDetail(false)}
        title={selected?.name || 'Molecule Details'}
        onEdit={() => {
          if (selected) {
            setForm({ ...selected });
            setIsEditing(true);
            setShowDetail(false);
            setShowForm(true);
            setError('');
          }
        }}
        onDelete={() => setShowConfirm(true)}
      >
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><p>{statusBadge(selected.status)}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">SMILES</p><p className="font-mono text-sm break-all">{selected.smiles}</p></div>
              <div><p className="text-xs text-gray-500">Molecular Formula</p><p className="font-medium">{selected.molecularFormula}</p></div>
              <div><p className="text-xs text-gray-500">Molecular Weight</p><p>{selected.molecularWeight}</p></div>
              <div><p className="text-xs text-gray-500">LogP</p><p>{selected.logP}</p></div>
              <div><p className="text-xs text-gray-500">TPSA</p><p>{selected.tpsa}</p></div>
              <div><p className="text-xs text-gray-500">HBD Count</p><p>{selected.hbdCount}</p></div>
              <div><p className="text-xs text-gray-500">HBA Count</p><p>{selected.hbaCount}</p></div>
              <div><p className="text-xs text-gray-500">Rotatable Bonds</p><p>{selected.rotatableBonds}</p></div>
              <div><p className="text-xs text-gray-500">Category</p><p>{selected.category}</p></div>
              <div><p className="text-xs text-gray-500">Target Protein</p><p>{selected.targetProtein}</p></div>
              <div><p className="text-xs text-gray-500">Source</p><p>{selected.source}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Description</p><p className="text-sm text-gray-700">{selected.description}</p></div>
            </div>
            <button
              onClick={handleAI}
              disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 transition-all text-sm font-medium"
            >
              <Sparkles className="w-4 h-4" />
              Analyze with AI
            </button>
            <AIResponsePanel
              response={aiResponse}
              loading={aiLoading}
              title="AI Molecular Analysis"
              onClose={() => setAiResponse('')}
            />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        onConfirm={handleDelete}
        title="Delete Molecule"
        message={`Are you sure you want to delete "${selected?.name}"? This action cannot be undone.`}
      />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Molecule' : 'New Molecule'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">
                &times;
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">SMILES *</label>
                  <input type="text" value={form.smiles} onChange={(e) => setForm({ ...form, smiles: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Molecular Formula</label>
                  <input type="text" value={form.molecularFormula} onChange={(e) => setForm({ ...form, molecularFormula: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Molecular Weight</label>
                  <input type="number" step="0.01" value={form.molecularWeight} onChange={(e) => setForm({ ...form, molecularWeight: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">LogP</label>
                  <input type="number" step="0.01" value={form.logP} onChange={(e) => setForm({ ...form, logP: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">TPSA</label>
                  <input type="number" step="0.01" value={form.tpsa} onChange={(e) => setForm({ ...form, tpsa: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HBD Count</label>
                  <input type="number" value={form.hbdCount} onChange={(e) => setForm({ ...form, hbdCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">HBA Count</label>
                  <input type="number" value={form.hbaCount} onChange={(e) => setForm({ ...form, hbaCount: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rotatable Bonds</label>
                  <input type="number" value={form.rotatableBonds} onChange={(e) => setForm({ ...form, rotatableBonds: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="small_molecule">Small Molecule</option>
                    <option value="peptide">Peptide</option>
                    <option value="antibody">Antibody</option>
                    <option value="natural_product">Natural Product</option>
                    <option value="polymer">Polymer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Protein</label>
                  <input type="text" value={form.targetProtein} onChange={(e) => setForm({ ...form, targetProtein: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="active">Active</option>
                    <option value="screening">Screening</option>
                    <option value="inactive">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Source</label>
                  <input type="text" value={form.source} onChange={(e) => setForm({ ...form, source: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })}
                    rows={3}
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

export default MolecularSearchPage;
