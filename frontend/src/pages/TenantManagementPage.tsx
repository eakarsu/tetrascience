import React, { useState, useEffect, useCallback } from 'react';
import { Building2, Plus, Search, Sparkles } from 'lucide-react';
import api from '../services/api';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';

interface Tenant {
  id: number;
  name: string;
  slug: string;
  industry: string;
  plan: string;
  status: string;
  maxUsers: number;
  maxStorage: number;
  dataIsolation: string;
  settings: any;
  contactEmail: string;
  contactName: string;
  createdAt: string;
}

const emptyTenant = {
  name: '', slug: '', industry: 'pharma', plan: 'professional', status: 'active',
  maxUsers: 50, maxStorage: 100, dataIsolation: 'schema',
  settings: '{}', contactEmail: '', contactName: '',
};

const TenantManagementPage: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [filtered, setFiltered] = useState<Tenant[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Tenant | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyTenant);
  const [error, setError] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const handleAI = async () => {
    if (!selected) return;
    setAiLoading(true);
    setAiResponse('');
    try {
      const res = await api.post('/ai/analyze-tenant', { tenantId: selected.id });
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/tenants');
      setTenants(res.data);
    } catch (err) {
      console.error('Failed to fetch tenants', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = tenants;
    if (search) {
      result = result.filter(t =>
        matchesSearch(t, search, ['name', 'slug', 'industry', 'plan', 'status', 'dataIsolation', 'maxUsers', 'maxStorage', 'contactEmail'])
      );
    }
    setFiltered(result);
  }, [tenants, search]);

  const { sorted, sort, requestSort } = useSortableData(filtered);

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        settings: typeof form.settings === 'string' ? JSON.parse(form.settings || '{}') : form.settings,
      };
      if (isEditing && selected) {
        await api.put(`/tenants/${selected.id}`, payload);
      } else {
        await api.post('/tenants', payload);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyTenant);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/tenants/${selected.id}`);
      setShowDetail(false);
      setSelected(null);
      fetchData();
    } catch (err) {
      console.error('Failed to delete', err);
    }
  };

  const planBadge = (plan: string) => {
    const colors: Record<string, string> = {
      enterprise: 'bg-purple-100 text-purple-700',
      professional: 'bg-blue-100 text-blue-700',
      starter: 'bg-green-100 text-green-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[plan] || 'bg-gray-100 text-gray-600'}`}>{plan}</span>;
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      suspended: 'bg-red-100 text-red-700',
      trial: 'bg-yellow-100 text-yellow-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
            <Building2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Tenant Management</h1>
            <p className="text-sm text-gray-500">{filtered.length} tenants</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyTenant); setIsEditing(false); setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Tenant
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search tenants..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortableTh label="Name" sortKey="name" sort={sort} onSort={requestSort} />
                <SortableTh label="Slug" sortKey="slug" sort={sort} onSort={requestSort} />
                <SortableTh label="Industry" sortKey="industry" sort={sort} onSort={requestSort} />
                <SortableTh label="Plan" sortKey="plan" sort={sort} onSort={requestSort} />
                <SortableTh label="Status" sortKey="status" sort={sort} onSort={requestSort} />
                <SortableTh label="Max Users" sortKey="maxUsers" sort={sort} onSort={requestSort} />
                <SortableTh label="Data Isolation" sortKey="dataIsolation" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((t) => (
                <tr key={t.id} onClick={() => { setSelected(t); setShowDetail(true); setAiResponse(''); }}
                  className="border-b border-gray-100 hover:bg-emerald-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{t.name}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{t.slug}</td>
                  <td className="px-4 py-3 text-gray-600">{t.industry}</td>
                  <td className="px-4 py-3">{planBadge(t.plan)}</td>
                  <td className="px-4 py-3">{statusBadge(t.status)}</td>
                  <td className="px-4 py-3 text-gray-600">{t.maxUsers}</td>
                  <td className="px-4 py-3 text-gray-600">{t.dataIsolation}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No tenants found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title={selected?.name || 'Tenant Details'}
        onEdit={() => {
          if (selected) {
            setForm({ ...selected, settings: JSON.stringify(selected.settings || {}, null, 2) });
            setIsEditing(true); setShowDetail(false); setShowForm(true); setError('');
          }
        }}
        onDelete={() => setShowConfirm(true)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-xs text-gray-500">Slug</p><p className="font-mono">{selected.slug}</p></div>
              <div><p className="text-xs text-gray-500">Industry</p><p>{selected.industry}</p></div>
              <div><p className="text-xs text-gray-500">Plan</p><p>{planBadge(selected.plan)}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><p>{statusBadge(selected.status)}</p></div>
              <div><p className="text-xs text-gray-500">Max Users</p><p>{selected.maxUsers}</p></div>
              <div><p className="text-xs text-gray-500">Max Storage</p><p>{selected.maxStorage} GB</p></div>
              <div><p className="text-xs text-gray-500">Data Isolation</p><p>{selected.dataIsolation}</p></div>
              <div><p className="text-xs text-gray-500">Contact Email</p><p>{selected.contactEmail}</p></div>
              <div><p className="text-xs text-gray-500">Contact Name</p><p>{selected.contactName}</p></div>
              <div><p className="text-xs text-gray-500">Created</p><p>{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : ''}</p></div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Settings</p>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto">{JSON.stringify(selected.settings, null, 2)}</pre>
              </div>
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Analyze with AI
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Tenant Analysis" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete}
        title="Delete Tenant" message={`Are you sure you want to delete "${selected?.name}"? This will remove all associated data.`} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Tenant' : 'New Tenant'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input type="text" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Slug *</label>
                  <input type="text" value={form.slug} onChange={(e) => setForm({ ...form, slug: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Industry</label>
                  <select value={form.industry} onChange={(e) => setForm({ ...form, industry: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="pharma">Pharma</option>
                    <option value="biotech">Biotech</option>
                    <option value="academic">Academic</option>
                    <option value="cro">CRO</option>
                    <option value="medical_device">Medical Device</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Plan</label>
                  <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="enterprise">Enterprise</option>
                    <option value="professional">Professional</option>
                    <option value="starter">Starter</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="active">Active</option>
                    <option value="suspended">Suspended</option>
                    <option value="trial">Trial</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Users</label>
                  <input type="number" value={form.maxUsers} onChange={(e) => setForm({ ...form, maxUsers: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Max Storage (GB)</label>
                  <input type="number" value={form.maxStorage} onChange={(e) => setForm({ ...form, maxStorage: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Isolation</label>
                  <select value={form.dataIsolation} onChange={(e) => setForm({ ...form, dataIsolation: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="schema">Schema</option>
                    <option value="database">Database</option>
                    <option value="row">Row</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
                  <input type="email" value={form.contactEmail} onChange={(e) => setForm({ ...form, contactEmail: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
                  <input type="text" value={form.contactName} onChange={(e) => setForm({ ...form, contactName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Settings (JSON)</label>
                  <textarea value={form.settings} onChange={(e) => setForm({ ...form, settings: e.target.value })} rows={3}
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

export default TenantManagementPage;
