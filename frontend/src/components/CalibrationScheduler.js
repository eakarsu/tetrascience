import React, { useEffect, useState } from 'react';
import api from '../services/api';

// NON-VIZ 2: Form -> POST writes to calibration_schedule + upcoming list
const CalibrationScheduler = () => {
  const [instrument, setInstrument] = useState('');
  const [nextDue, setNextDue] = useState('');
  const [technician, setTechnician] = useState('');
  const [notes, setNotes] = useState('');
  const [entries, setEntries] = useState([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const load = async () => {
    try {
      const res = await api.get('/custom-views/calibration-schedule');
      setEntries(res.data.entries || []);
    } catch (e) {
      setError(e?.message || 'Failed to load schedule');
    }
  };

  useEffect(() => { load(); }, []);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    if (!instrument || !nextDue || !technician) {
      setError('instrument, next-due date and technician are required');
      return;
    }
    setBusy(true);
    try {
      await api.post('/custom-views/calibration-schedule', {
        instrument, nextDue, technician, notes,
      });
      setInstrument(''); setNextDue(''); setTechnician(''); setNotes('');
      await load();
    } catch (e) {
      setError(e?.response?.data?.error || e?.message || 'Save failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-base font-semibold text-slate-800 mb-3">
        Instrument Calibration Scheduler
      </h3>
      <form onSubmit={submit} className="grid grid-cols-2 gap-3 mb-4">
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Instrument</span>
          <input
            value={instrument}
            onChange={(e) => setInstrument(e.target.value)}
            placeholder="e.g. LC-MS Orbitrap"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Next due</span>
          <input
            type="date"
            value={nextDue}
            onChange={(e) => setNextDue(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Technician</span>
          <input
            value={technician}
            onChange={(e) => setTechnician(e.target.value)}
            placeholder="e.g. Dr. Patel"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Notes (optional)</span>
          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. mass-axis recalibration"
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <div className="col-span-2">
          <button
            type="submit"
            disabled={busy}
            className="bg-emerald-600 hover:bg-emerald-700 disabled:bg-gray-400 text-white text-sm font-medium px-4 py-2 rounded"
          >
            {busy ? 'Saving...' : 'Schedule calibration'}
          </button>
          {error && <span className="ml-3 text-sm text-red-600">{error}</span>}
        </div>
      </form>

      <h4 className="text-sm font-semibold text-slate-700 mb-2">Upcoming calibrations</h4>
      {entries.length === 0 ? (
        <p className="text-sm text-slate-500">No calibrations scheduled yet.</p>
      ) : (
        <table className="w-full text-sm border border-gray-200">
          <thead className="bg-slate-50">
            <tr>
              <th className="text-left p-2 border-b">Instrument</th>
              <th className="text-left p-2 border-b">Next due</th>
              <th className="text-left p-2 border-b">Technician</th>
              <th className="text-left p-2 border-b">Notes</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td className="p-2 border-b">{e.instrument}</td>
                <td className="p-2 border-b">{e.nextDue}</td>
                <td className="p-2 border-b">{e.technician}</td>
                <td className="p-2 border-b text-slate-600">{e.notes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default CalibrationScheduler;
