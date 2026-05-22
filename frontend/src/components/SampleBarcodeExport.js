import React, { useState } from 'react';

// NON-VIZ 1: Date-range picker -> PDF sheets of printable sample barcodes
const SampleBarcodeExport = () => {
  const today = new Date().toISOString().slice(0, 10);
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10);
  const [start, setStart] = useState(weekAgo);
  const [end, setEnd] = useState(today);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const download = async () => {
    setBusy(true);
    setError('');
    try {
      const token = localStorage.getItem('token');
      const url = `http://localhost:4000/api/custom-views/sample-barcodes?start=${start}&end=${end}`;
      const resp = await fetch(url, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || `HTTP ${resp.status}`);
      }
      const blob = await resp.blob();
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `sample_barcodes_${start}_${end}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (e) {
      setError(e.message || 'Download failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-base font-semibold text-slate-800 mb-3">
        Sample Barcode PDF Export
      </h3>
      <div className="grid grid-cols-2 gap-3 mb-3">
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">Start date</span>
          <input
            type="date"
            value={start}
            onChange={(e) => setStart(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="block text-slate-600 mb-1">End date</span>
          <input
            type="date"
            value={end}
            onChange={(e) => setEnd(e.target.value)}
            className="w-full border border-gray-300 rounded px-2 py-1 text-sm"
          />
        </label>
      </div>
      <button
        onClick={download}
        disabled={busy}
        className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-medium px-4 py-2 rounded"
      >
        {busy ? 'Generating PDF...' : 'Download barcode sheet (PDF)'}
      </button>
      {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
      <p className="mt-3 text-xs text-slate-500">
        Generates one PDF row per sample with a rectangle barcode strip and label.
      </p>
    </div>
  );
};

export default SampleBarcodeExport;
