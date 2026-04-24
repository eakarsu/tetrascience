import React, { useState, useEffect, useCallback } from 'react';
import { Users, Plus, Search, Sparkles } from 'lucide-react';
import api from '../services/api';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';

interface User {
  id: number;
  name: string;
  email: string;
  password?: string;
  role: string;
  tenantId: number;
  tenantName?: string;
  avatar?: string;
  isActive: boolean;
  lastLogin: string;
  createdAt: string;
  updatedAt?: string;
}

const emptyUser = {
  name: '', email: '', password: '', role: 'scientist', tenantId: 1,
  isActive: true, avatar: '',
};

const UserManagementPage: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [filtered, setFiltered] = useState<User[]>([]);
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<User | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyUser);
  const [error, setError] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/users');
      setUsers(res.data);
    } catch (err) {
      console.error('Failed to fetch users', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = users;
    if (search) {
      result = result.filter(u =>
        matchesSearch(u, search, ['name', 'email', 'role', 'tenantId', 'isActive', 'lastLogin'])
      );
    }
    setFiltered(result);
  }, [users, search]);

  const { sorted, sort, requestSort } = useSortableData(filtered);

  const handleSave = async () => {
    setError('');
    try {
      const payload = { ...form };
      if (isEditing && selected) {
        const { password, ...updatePayload } = payload;
        await api.put(`/users/${selected.id}`, password ? payload : updatePayload);
      } else {
        await api.post('/users', payload);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyUser);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/users/${selected.id}`);
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
      const res = await api.post('/ai/analyze-user', { userId: selected.id });
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const roleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      scientist: 'bg-blue-100 text-blue-700',
      engineer: 'bg-green-100 text-green-700',
      viewer: 'bg-gray-100 text-gray-600',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[role] || 'bg-gray-100 text-gray-600'}`}>{role}</span>;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-sky-500 to-sky-600 rounded-lg flex items-center justify-center">
            <Users className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-500">{filtered.length} users</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyUser); setIsEditing(false); setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New User
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search users..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <SortableTh label="Name" sortKey="name" sort={sort} onSort={requestSort} />
                <SortableTh label="Email" sortKey="email" sort={sort} onSort={requestSort} />
                <SortableTh label="Role" sortKey="role" sort={sort} onSort={requestSort} />
                <SortableTh label="Tenant" sortKey="tenantId" sort={sort} onSort={requestSort} />
                <SortableTh label="Active" sortKey="isActive" sort={sort} onSort={requestSort} />
                <SortableTh label="Last Login" sortKey="lastLogin" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((u) => (
                <tr key={u.id} onClick={() => { setSelected(u); setShowDetail(true); setAiResponse(''); }}
                  className="border-b border-gray-100 hover:bg-sky-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.email}</td>
                  <td className="px-4 py-3">{roleBadge(u.role)}</td>
                  <td className="px-4 py-3 text-gray-600">{u.tenantName || `ID: ${u.tenantId}`}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${u.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                      {u.isActive ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600 text-xs">{u.lastLogin ? new Date(u.lastLogin).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-gray-400">No users found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title={selected?.name || 'User Details'}
        onEdit={() => {
          if (selected) {
            setForm({
              ...selected,
              password: '',
            });
            setIsEditing(true); setShowDetail(false); setShowForm(true); setError('');
          }
        }}
        onDelete={() => setShowConfirm(true)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-xs text-gray-500">Email</p><p>{selected.email}</p></div>
              <div><p className="text-xs text-gray-500">Role</p><p>{roleBadge(selected.role)}</p></div>
              <div><p className="text-xs text-gray-500">Active</p>
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selected.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>
                  {selected.isActive ? 'Active' : 'Inactive'}
                </span>
              </div>
              <div><p className="text-xs text-gray-500">Tenant ID</p><p>{selected.tenantId}</p></div>
              {selected.avatar && <div><p className="text-xs text-gray-500">Avatar</p><p>{selected.avatar}</p></div>}
              <div><p className="text-xs text-gray-500">Last Login</p><p>{selected.lastLogin ? new Date(selected.lastLogin).toLocaleString() : '-'}</p></div>
              <div><p className="text-xs text-gray-500">Created</p><p>{selected.createdAt ? new Date(selected.createdAt).toLocaleDateString() : ''}</p></div>
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Analyze with AI
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI User Analysis" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete}
        title="Delete User" message={`Are you sure you want to delete "${selected?.name}"?`} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit User' : 'New User'}</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                  <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">{isEditing ? 'New Password (leave blank to keep)' : 'Password *'}</label>
                  <input type="password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
                  <select value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="admin">Admin</option>
                    <option value="scientist">Scientist</option>
                    <option value="engineer">Engineer</option>
                    <option value="viewer">Viewer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                  <input type="number" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Active</label>
                  <select value={form.isActive ? 'true' : 'false'} onChange={(e) => setForm({ ...form, isActive: e.target.value === 'true' })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="true">Active</option>
                    <option value="false">Inactive</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Avatar URL</label>
                  <input type="text" value={form.avatar} onChange={(e) => setForm({ ...form, avatar: e.target.value })}
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

export default UserManagementPage;
