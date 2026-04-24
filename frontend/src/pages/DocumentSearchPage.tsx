import React, { useState, useEffect, useCallback } from 'react';
import { FileText, Plus, Search, Sparkles } from 'lucide-react';
import api from '../services/api';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';

interface Document {
  id: number;
  title: string;
  documentType: string;
  authors: string;
  abstract: string;
  content: string;
  department: string;
  version: string;
  status: string;
  format: string;
  tags: string;
  fileSize: number;
  tenantId: number;
}

const emptyDoc = {
  title: '', documentType: 'research_paper', authors: '', abstract: '', content: '',
  department: '', version: '1.0', status: 'published', format: 'pdf', tags: '',
  fileSize: 0, tenantId: 0,
};

const DocumentSearchPage: React.FC = () => {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [filtered, setFiltered] = useState<Document[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Document | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyDoc);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/documents');
      setDocuments(res.data);
    } catch (err) {
      console.error('Failed to fetch documents', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = documents;
    result = result.filter(d =>
      matchesSearch(d, search, ['title', 'documentType', 'authors', 'department', 'tags', 'version', 'status', 'format', 'fileSize'])
    );
    if (typeFilter) result = result.filter(d => d.documentType === typeFilter);
    if (statusFilter) result = result.filter(d => d.status === statusFilter);
    setFiltered(result);
  }, [documents, search, typeFilter, statusFilter]);

  const handleSave = async () => {
    setError('');
    try {
      if (isEditing && selected) {
        await api.put(`/documents/${selected.id}`, form);
      } else {
        await api.post('/documents', form);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyDoc);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/documents/${selected.id}`);
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
      const res = await api.post('/ai/summarize-document', { documentId: selected.id });
      setAiResponse(res.data.summary || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI summary. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      published: 'bg-green-100 text-green-700',
      draft: 'bg-yellow-100 text-yellow-700',
      review: 'bg-blue-100 text-blue-700',
      archived: 'bg-gray-100 text-gray-600',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  const { sorted, sort, requestSort } = useSortableData(filtered);

  const types = [...new Set(documents.map(d => d.documentType).filter(Boolean))];
  const statuses = [...new Set(documents.map(d => d.status).filter(Boolean))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
            <FileText className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Document Search</h1>
            <p className="text-sm text-gray-500">{filtered.length} documents</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyDoc); setIsEditing(false); setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> New Document
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search documents..." value={search} onChange={(e) => setSearch(e.target.value)}
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
                <SortableTh label="Title" sortKey="title" sort={sort} onSort={requestSort} />
                <SortableTh label="Type" sortKey="documentType" sort={sort} onSort={requestSort} />
                <SortableTh label="Authors" sortKey="authors" sort={sort} onSort={requestSort} />
                <SortableTh label="Department" sortKey="department" sort={sort} onSort={requestSort} />
                <SortableTh label="Version" sortKey="version" sort={sort} onSort={requestSort} />
                <SortableTh label="Status" sortKey="status" sort={sort} onSort={requestSort} />
                <SortableTh label="Format" sortKey="format" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((d) => (
                <tr key={d.id} onClick={() => { setSelected(d); setShowDetail(true); setAiResponse(''); }}
                  className="border-b border-gray-100 hover:bg-amber-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900 max-w-[250px] truncate">{d.title}</td>
                  <td className="px-4 py-3 text-gray-600">{d.documentType}</td>
                  <td className="px-4 py-3 text-gray-600 max-w-[150px] truncate">{d.authors}</td>
                  <td className="px-4 py-3 text-gray-600">{d.department}</td>
                  <td className="px-4 py-3 text-gray-600">{d.version}</td>
                  <td className="px-4 py-3">{statusBadge(d.status)}</td>
                  <td className="px-4 py-3 text-gray-600 uppercase">{d.format}</td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-8 text-center text-gray-400">No documents found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title={selected?.title || 'Document Details'}
        onEdit={() => { if (selected) { setForm({ ...selected }); setIsEditing(true); setShowDetail(false); setShowForm(true); setError(''); } }}
        onDelete={() => setShowConfirm(true)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2"><p className="text-xs text-gray-500">Title</p><p className="font-medium">{selected.title}</p></div>
              <div><p className="text-xs text-gray-500">Type</p><p>{selected.documentType}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><p>{statusBadge(selected.status)}</p></div>
              <div><p className="text-xs text-gray-500">Authors</p><p>{selected.authors}</p></div>
              <div><p className="text-xs text-gray-500">Department</p><p>{selected.department}</p></div>
              <div><p className="text-xs text-gray-500">Version</p><p>{selected.version}</p></div>
              <div><p className="text-xs text-gray-500">Format</p><p className="uppercase">{selected.format}</p></div>
              <div><p className="text-xs text-gray-500">File Size</p><p>{selected.fileSize}</p></div>
              <div><p className="text-xs text-gray-500">Tenant ID</p><p>{selected.tenantId}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Tags</p><p>{selected.tags}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Abstract</p><p className="text-sm text-gray-700">{selected.abstract}</p></div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Content</p>
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-700 max-h-48 overflow-y-auto">{selected.content}</div>
              </div>
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Summarize with AI
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Document Summary" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete}
        title="Delete Document" message={`Are you sure you want to delete "${selected?.title}"? This action cannot be undone.`} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Document' : 'New Document'}</h2>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="flex-1 overflow-y-auto px-6 py-4">
              {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                  <select value={form.documentType} onChange={(e) => setForm({ ...form, documentType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="research_paper">Research Paper</option>
                    <option value="protocol">Protocol</option>
                    <option value="sop">SOP</option>
                    <option value="report">Report</option>
                    <option value="patent">Patent</option>
                    <option value="regulatory">Regulatory</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="published">Published</option>
                    <option value="draft">Draft</option>
                    <option value="review">Review</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Authors</label>
                  <input type="text" value={form.authors} onChange={(e) => setForm({ ...form, authors: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Department</label>
                  <input type="text" value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                  <input type="text" value={form.version} onChange={(e) => setForm({ ...form, version: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Format</label>
                  <select value={form.format} onChange={(e) => setForm({ ...form, format: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="pdf">PDF</option>
                    <option value="docx">DOCX</option>
                    <option value="html">HTML</option>
                    <option value="xml">XML</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">File Size</label>
                  <input type="number" value={form.fileSize} onChange={(e) => setForm({ ...form, fileSize: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                  <input type="number" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: Number(e.target.value) })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tags (comma-separated)</label>
                  <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Abstract</label>
                  <textarea value={form.abstract} onChange={(e) => setForm({ ...form, abstract: e.target.value })} rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Content</label>
                  <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} rows={5}
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

export default DocumentSearchPage;
