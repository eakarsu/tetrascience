import React, { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, Plus, Search, Sparkles, Filter } from 'lucide-react';
import api from '../services/api';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';

interface AuditLog {
  id: number;
  action: string;
  resource: string;
  resourceId: number;
  userId: number;
  userName: string;
  createdAt: string;
  ipAddress: string;
  userAgent: string;
  previousValue: any;
  newValue: any;
  reason: string;
  gxpRelevant: boolean;
  electronicSignature: string;
  tenantId: number;
}

const emptyLog = {
  action: 'create', resource: '', resourceId: 0, userId: 1,
  userName: '', ipAddress: '', userAgent: '', previousValue: '{}',
  newValue: '{}', reason: '', gxpRelevant: false, electronicSignature: '', tenantId: 1,
};

const ComplianceAuditPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [filtered, setFiltered] = useState<AuditLog[]>([]);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [gxpFilter, setGxpFilter] = useState<string>('');
  const [selected, setSelected] = useState<AuditLog | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyLog);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/audit-trail');
      setLogs(res.data);
    } catch (err) {
      console.error('Failed to fetch audit logs', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = logs;
    if (search) {
      result = result.filter(l =>
        matchesSearch(l, search, ['action', 'resource', 'resourceId', 'userName', 'gxpRelevant', 'ipAddress', 'createdAt'])
      );
    }
    if (actionFilter) result = result.filter(l => l.action === actionFilter);
    if (gxpFilter === 'true') result = result.filter(l => l.gxpRelevant);
    if (gxpFilter === 'false') result = result.filter(l => !l.gxpRelevant);
    setFiltered(result);
  }, [logs, search, actionFilter, gxpFilter]);

  const { sorted, sort, requestSort } = useSortableData(filtered);

  const handleSave = async () => {
    setError('');
    try {
      const payload = {
        ...form,
        previousValue: typeof form.previousValue === 'string' ? JSON.parse(form.previousValue || '{}') : form.previousValue,
        newValue: typeof form.newValue === 'string' ? JSON.parse(form.newValue || '{}') : form.newValue,
      };
      if (isEditing && selected) {
        await api.put(`/audit-trail/${selected.id}`, payload);
      } else {
        await api.post('/audit-trail', payload);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyLog);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/audit-trail/${selected.id}`);
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
      const res = await api.post('/ai/compliance-check', {});
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get compliance analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const actionBadge = (action: string) => {
    const colors: Record<string, string> = {
      create: 'bg-green-100 text-green-700',
      update: 'bg-blue-100 text-blue-700',
      delete: 'bg-red-100 text-red-700',
      read: 'bg-gray-100 text-gray-600',
      login: 'bg-purple-100 text-purple-700',
      export: 'bg-amber-100 text-amber-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[action] || 'bg-gray-100 text-gray-600'}`}>{action}</span>;
  };

  const actions = [...new Set(logs.map(l => l.action).filter(Boolean))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-red-600 rounded-lg flex items-center justify-center">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Compliance & Audit Trail</h1>
            <p className="text-sm text-gray-500">{filtered.length} log entries</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={handleAI} disabled={aiLoading}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
            <Sparkles className="w-4 h-4" /> Compliance Check
          </button>
          <button onClick={() => { setForm(emptyLog); setShowForm(true); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Log Entry
          </button>
        </div>
      </div>

      <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Compliance Analysis" onClose={() => setAiResponse('')} />

      <div className="flex flex-wrap gap-3 mb-4 mt-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search audit logs..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <select value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All Actions</option>
          {actions.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={gxpFilter} onChange={(e) => setGxpFilter(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
          <option value="">All GxP</option>
          <option value="true">GxP Relevant</option>
          <option value="false">Non-GxP</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortableTh label="Timestamp" sortKey="createdAt" sort={sort} onSort={requestSort} />
                <SortableTh label="Action" sortKey="action" sort={sort} onSort={requestSort} />
                <SortableTh label="Resource" sortKey="resource" sort={sort} onSort={requestSort} />
                <SortableTh label="User" sortKey="userName" sort={sort} onSort={requestSort} />
                <SortableTh label="GxP" sortKey="gxpRelevant" sort={sort} onSort={requestSort} />
                <SortableTh label="IP" sortKey="ipAddress" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((l) => (
                <tr key={l.id} onClick={() => { setSelected(l); setShowDetail(true); }}
                  className="border-b border-gray-100 hover:bg-red-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">{l.createdAt ? new Date(l.createdAt).toLocaleString() : ''}</td>
                  <td className="px-4 py-3">{actionBadge(l.action)}</td>
                  <td className="px-4 py-3 text-gray-600">{l.resource} #{l.resourceId}</td>
                  <td className="px-4 py-3 text-gray-600">{l.userName}</td>
                  <td className="px-4 py-3">
                    {l.gxpRelevant ? (
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">GxP</span>
                    ) : (
                      <span className="text-gray-400 text-xs">-</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{l.ipAddress}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No audit logs found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title="Audit Log Details"
        onEdit={() => {
          if (selected) {
            setForm({
              ...selected,
              previousValue: JSON.stringify(selected.previousValue || {}, null, 2),
              newValue: JSON.stringify(selected.newValue || {}, null, 2),
            });
            setIsEditing(true); setShowDetail(false); setShowForm(true); setError('');
          }
        }}
        onDelete={() => setShowConfirm(true)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Timestamp</p><p className="font-mono text-sm">{selected.createdAt ? new Date(selected.createdAt).toLocaleString() : ''}</p></div>
              <div><p className="text-xs text-gray-500">Action</p><p>{actionBadge(selected.action)}</p></div>
              <div><p className="text-xs text-gray-500">Resource</p><p>{selected.resource}</p></div>
              <div><p className="text-xs text-gray-500">Resource ID</p><p>{selected.resourceId}</p></div>
              <div><p className="text-xs text-gray-500">User Name</p><p>{selected.userName}</p></div>
              <div><p className="text-xs text-gray-500">User ID</p><p>{selected.userId}</p></div>
              <div><p className="text-xs text-gray-500">IP Address</p><p className="font-mono">{selected.ipAddress}</p></div>
              <div><p className="text-xs text-gray-500">GxP Relevant</p>
                <p>{selected.gxpRelevant ? (
                  <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">Yes</span>
                ) : 'No'}</p>
              </div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Reason</p><p className="text-sm">{selected.reason}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Electronic Signature</p><p className="font-mono text-xs">{selected.electronicSignature}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">User Agent</p><p className="text-xs text-gray-600 break-all">{selected.userAgent}</p></div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Previous Value</p>
                <pre className="bg-red-50 rounded-lg p-3 text-xs overflow-auto">{JSON.stringify(selected.previousValue, null, 2)}</pre>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">New Value</p>
                <pre className="bg-green-50 rounded-lg p-3 text-xs overflow-auto">{JSON.stringify(selected.newValue, null, 2)}</pre>
              </div>
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Analyze with AI
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Compliance Analysis" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete}
        title="Delete Audit Log" message={`Are you sure you want to delete this audit log entry?`} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Audit Log' : 'New Audit Log Entry'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Action *</label>
                  <select value={form.action} onChange={(e) => setForm({ ...form, action: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="create">Create</option>
                    <option value="read">Read</option>
                    <option value="update">Update</option>
                    <option value="delete">Delete</option>
                    <option value="login">Login</option>
                    <option value="export">Export</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource</label>
                  <input type="text" value={form.resource} onChange={(e) => setForm({ ...form, resource: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Resource ID</label>
                  <input type="number" value={form.resourceId} onChange={(e) => setForm({ ...form, resourceId: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">User Name</label>
                  <input type="text" value={form.userName} onChange={(e) => setForm({ ...form, userName: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">IP Address</label>
                  <input type="text" value={form.ipAddress} onChange={(e) => setForm({ ...form, ipAddress: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">GxP Relevant</label>
                  <select value={form.gxpRelevant ? 'true' : 'false'} onChange={(e) => setForm({ ...form, gxpRelevant: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="false">No</option>
                    <option value="true">Yes</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
                  <textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Electronic Signature</label>
                  <input type="text" value={form.electronicSignature} onChange={(e) => setForm({ ...form, electronicSignature: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Previous Value (JSON)</label>
                  <textarea value={form.previousValue} onChange={(e) => setForm({ ...form, previousValue: e.target.value })} rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Value (JSON)</label>
                  <textarea value={form.newValue} onChange={(e) => setForm({ ...form, newValue: e.target.value })} rows={2}
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

export default ComplianceAuditPage;
