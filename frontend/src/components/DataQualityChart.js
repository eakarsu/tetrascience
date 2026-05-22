import React, { useEffect, useState } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts';
import api from '../services/api';

// VIZ 2: recharts area chart of data quality scores per instrument over time
const PALETTE = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#06b6d4'];

const DataQualityChart = () => {
  const [series, setSeries] = useState([]);
  const [instruments, setInstruments] = useState([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/custom-views/data-quality')
      .then((res) => {
        setSeries(res.data.series || []);
        setInstruments(res.data.instruments || []);
      })
      .catch((e) => setError(e?.message || 'Failed to load data quality'));
  }, []);

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <h3 className="text-base font-semibold text-slate-800 mb-2">
        Data Quality Score per Instrument (14 days)
      </h3>
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <AreaChart data={series} margin={{ top: 10, right: 24, left: 0, bottom: 0 }}>
            <defs>
              {instruments.map((name, idx) => (
                <linearGradient key={name} id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor={PALETTE[idx % PALETTE.length]} stopOpacity={0.55} />
                  <stop offset="95%" stopColor={PALETTE[idx % PALETTE.length]} stopOpacity={0.05} />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
            <XAxis dataKey="date" tick={{ fontSize: 11 }} />
            <YAxis domain={[70, 100]} tick={{ fontSize: 11 }} />
            <Tooltip />
            <Legend />
            {instruments.map((name, idx) => (
              <Area
                key={name}
                type="monotone"
                dataKey={name}
                stroke={PALETTE[idx % PALETTE.length]}
                fill={`url(#grad-${idx})`}
                strokeWidth={2}
              />
            ))}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default DataQualityChart;
