import React, { useState, useEffect, useCallback } from 'react';
import { Radio, Plus, Search, Sparkles } from 'lucide-react';
import api from '../services/api';
import DetailModal from '../components/DetailModal';
import AIResponsePanel from '../components/AIResponsePanel';
import ConfirmDialog from '../components/ConfirmDialog';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';

interface Instrument {
  id: number;
  name: string;
  instrumentType: string;
  manufacturer: string;
  model: string;
  serialNumber: string;
  location: string;
  status: string;
  integrationStatus: string;
  lastCalibration: string;
  nextCalibration: string;
  dataFormat: string;
  throughputPerDay: string;
  tenantId: string;
}

const emptyInstrument = {
  name: '', instrumentType: 'spectrometer', manufacturer: '', model: '',
  serialNumber: '', location: '', status: 'online', integrationStatus: 'connected',
  lastCalibration: '', nextCalibration: '',
  dataFormat: '', throughputPerDay: '', tenantId: '',
};

const InstrumentManagerPage: React.FC = () => {
  const [instruments, setInstruments] = useState<Instrument[]>([]);
  const [filtered, setFiltered] = useState<Instrument[]>([]);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [selected, setSelected] = useState<Instrument | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<any>(emptyInstrument);
  const [error, setError] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const res = await api.get('/instruments');
      setInstruments(res.data);
    } catch (err) {
      console.error('Failed to fetch instruments', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    let result = instruments;
    if (search) {
      const searchKeys: (keyof Instrument)[] = ['name', 'instrumentType', 'manufacturer', 'model', 'serialNumber', 'location', 'status', 'integrationStatus'];
      result = result.filter(i => matchesSearch(i, search, searchKeys));
    }
    if (typeFilter) result = result.filter(i => i.instrumentType === typeFilter);
    if (statusFilter) result = result.filter(i => i.status === statusFilter);
    setFiltered(result);
  }, [instruments, search, typeFilter, statusFilter]);

  const { sorted, sort, requestSort } = useSortableData(filtered);

  const handleSave = async () => {
    setError('');
    try {
      if (isEditing && selected) {
        await api.put(`/instruments/${selected.id}`, form);
      } else {
        await api.post('/instruments', form);
      }
      setShowForm(false);
      setIsEditing(false);
      setForm(emptyInstrument);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save');
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    try {
      await api.delete(`/instruments/${selected.id}`);
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
      const res = await api.post('/ai/analyze-instrument', { instrumentId: selected.id });
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const statusBadge = (status: string) => {
    const colors: Record<string, string> = {
      online: 'bg-green-100 text-green-700',
      offline: 'bg-gray-100 text-gray-600',
      maintenance: 'bg-yellow-100 text-yellow-700',
      error: 'bg-red-100 text-red-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  const integrationBadge = (status: string) => {
    const colors: Record<string, string> = {
      connected: 'bg-green-100 text-green-700',
      disconnected: 'bg-red-100 text-red-700',
      pending: 'bg-yellow-100 text-yellow-700',
      configured: 'bg-blue-100 text-blue-700',
    };
    return <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] || 'bg-gray-100 text-gray-600'}`}>{status}</span>;
  };

  const types = [...new Set(instruments.map(i => i.instrumentType).filter(Boolean))];
  const statuses = [...new Set(instruments.map(i => i.status).filter(Boolean))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-orange-500 to-orange-600 rounded-lg flex items-center justify-center">
            <Radio className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Instrument Manager</h1>
            <p className="text-sm text-gray-500">{filtered.length} instruments</p>
          </div>
        </div>
        <button onClick={() => { setForm(emptyInstrument); setIsEditing(false); setShowForm(true); setError(''); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium">
          <Plus className="w-4 h-4" /> New Instrument
        </button>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search instruments..." value={search} onChange={(e) => setSearch(e.target.value)}
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
                <SortableTh label="Name" sortKey="name" sort={sort} onSort={requestSort} />
                <SortableTh label="Type" sortKey="instrumentType" sort={sort} onSort={requestSort} />
                <SortableTh label="Manufacturer" sortKey="manufacturer" sort={sort} onSort={requestSort} />
                <SortableTh label="Model" sortKey="model" sort={sort} onSort={requestSort} />
                <SortableTh label="Serial" sortKey="serialNumber" sort={sort} onSort={requestSort} />
                <SortableTh label="Location" sortKey="location" sort={sort} onSort={requestSort} />
                <SortableTh label="Status" sortKey="status" sort={sort} onSort={requestSort} />
                <SortableTh label="Integration" sortKey="integrationStatus" sort={sort} onSort={requestSort} />
              </tr>
            </thead>
            <tbody>
              {sorted.map((i) => (
                <tr key={i.id} onClick={() => { setSelected(i); setShowDetail(true); setAiResponse(''); }}
                  className="border-b border-gray-100 hover:bg-orange-50 cursor-pointer transition-colors">
                  <td className="px-4 py-3 font-medium text-gray-900">{i.name}</td>
                  <td className="px-4 py-3 text-gray-600">{i.instrumentType}</td>
                  <td className="px-4 py-3 text-gray-600">{i.manufacturer}</td>
                  <td className="px-4 py-3 text-gray-600">{i.model}</td>
                  <td className="px-4 py-3 text-gray-600 font-mono text-xs">{i.serialNumber}</td>
                  <td className="px-4 py-3 text-gray-600">{i.location}</td>
                  <td className="px-4 py-3">{statusBadge(i.status)}</td>
                  <td className="px-4 py-3">{integrationBadge(i.integrationStatus)}</td>
                </tr>
              ))}
              {sorted.length === 0 && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No instruments found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <DetailModal isOpen={showDetail} onClose={() => setShowDetail(false)} title={selected?.name || 'Instrument Details'}
        onEdit={() => {
          if (selected) { setForm({ ...selected }); setIsEditing(true); setShowDetail(false); setShowForm(true); setError(''); }
        }}
        onDelete={() => setShowConfirm(true)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Name</p><p className="font-medium">{selected.name}</p></div>
              <div><p className="text-xs text-gray-500">Type</p><p>{selected.instrumentType}</p></div>
              <div><p className="text-xs text-gray-500">Manufacturer</p><p>{selected.manufacturer}</p></div>
              <div><p className="text-xs text-gray-500">Model</p><p>{selected.model}</p></div>
              <div><p className="text-xs text-gray-500">Serial Number</p><p className="font-mono">{selected.serialNumber}</p></div>
              <div><p className="text-xs text-gray-500">Location</p><p>{selected.location}</p></div>
              <div><p className="text-xs text-gray-500">Status</p><p>{statusBadge(selected.status)}</p></div>
              <div><p className="text-xs text-gray-500">Integration</p><p>{integrationBadge(selected.integrationStatus)}</p></div>
              <div><p className="text-xs text-gray-500">Last Calibration</p><p>{selected.lastCalibration ? new Date(selected.lastCalibration).toLocaleDateString() : '-'}</p></div>
              <div><p className="text-xs text-gray-500">Next Calibration</p><p>{selected.nextCalibration ? new Date(selected.nextCalibration).toLocaleDateString() : '-'}</p></div>
              <div><p className="text-xs text-gray-500">Data Format</p><p>{selected.dataFormat}</p></div>
              <div><p className="text-xs text-gray-500">Throughput Per Day</p><p>{selected.throughputPerDay}</p></div>
              <div><p className="text-xs text-gray-500">Tenant ID</p><p>{selected.tenantId}</p></div>
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Analyze with AI
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Instrument Analysis" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDelete}
        title="Delete Instrument" message={`Are you sure you want to delete "${selected?.name}"?`} />

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Instrument' : 'New Instrument'}</h2>
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Instrument Type</label>
                  <select value={form.instrumentType} onChange={(e) => setForm({ ...form, instrumentType: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="spectrometer">Spectrometer</option>
                    <option value="chromatograph">Chromatograph</option>
                    <option value="microscope">Microscope</option>
                    <option value="sequencer">Sequencer</option>
                    <option value="plate_reader">Plate Reader</option>
                    <option value="mass_spec">Mass Spectrometer</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="online">Online</option>
                    <option value="offline">Offline</option>
                    <option value="maintenance">Maintenance</option>
                    <option value="error">Error</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                  <input type="text" value={form.manufacturer} onChange={(e) => setForm({ ...form, manufacturer: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                  <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input type="text" value={form.serialNumber} onChange={(e) => setForm({ ...form, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                  <input type="text" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Integration Status</label>
                  <select value={form.integrationStatus} onChange={(e) => setForm({ ...form, integrationStatus: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                    <option value="connected">Connected</option>
                    <option value="disconnected">Disconnected</option>
                    <option value="pending">Pending</option>
                    <option value="configured">Configured</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Data Format</label>
                  <input type="text" value={form.dataFormat} onChange={(e) => setForm({ ...form, dataFormat: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Throughput Per Day</label>
                  <input type="text" value={form.throughputPerDay} onChange={(e) => setForm({ ...form, throughputPerDay: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tenant ID</label>
                  <input type="text" value={form.tenantId} onChange={(e) => setForm({ ...form, tenantId: e.target.value })}
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

export default InstrumentManagerPage;
