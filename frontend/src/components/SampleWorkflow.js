import React, { useEffect, useState } from 'react';
import api from '../services/api';

// VIZ 1: SVG flow showing sample lifecycle
const SampleWorkflow = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api.get('/custom-views/sample-workflow')
      .then((res) => setData(res.data))
      .catch((e) => setError(e?.message || 'Failed to load workflow'));
  }, []);

  const stages = data?.stages || [];
  const width = 760;
  const height = 220;
  const padding = 40;
  const stageW = 130;
  const stageH = 80;
  const gap = stages.length > 1 ? (width - padding * 2 - stages.length * stageW) / (stages.length - 1) : 0;

  return (
    <div className="bg-white p-4 rounded-lg border border-gray-200">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-base font-semibold text-slate-800">Sample Workflow</h3>
        {data && (
          <span className="text-xs text-slate-500">
            Total samples: {data.totalSamples}
          </span>
        )}
      </div>
      {error && <div className="text-sm text-red-600 mb-2">{error}</div>}
      <svg
        width="100%"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="Sample lifecycle workflow"
      >
        <defs>
          <marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5"
                  markerWidth="6" markerHeight="6" orient="auto">
            <path d="M0,0 L10,5 L0,10 z" fill="#64748b" />
          </marker>
        </defs>
        {stages.map((s, i) => {
          const x = padding + i * (stageW + gap);
          const y = (height - stageH) / 2;
          return (
            <g key={s.key}>
              <rect
                x={x} y={y}
                width={stageW} height={stageH} rx={10}
                fill={s.color} fillOpacity={0.15}
                stroke={s.color} strokeWidth={2}
              />
              <text x={x + stageW / 2} y={y + 30}
                    textAnchor="middle" fontSize="14" fontWeight="600" fill="#0f172a">
                {s.label}
              </text>
              <text x={x + stageW / 2} y={y + 55}
                    textAnchor="middle" fontSize="18" fontWeight="700" fill={s.color}>
                {s.count}
              </text>
              {i < stages.length - 1 && (
                <line
                  x1={x + stageW + 2}
                  y1={y + stageH / 2}
                  x2={x + stageW + gap - 4}
                  y2={y + stageH / 2}
                  stroke="#64748b" strokeWidth={2}
                  markerEnd="url(#arrow)"
                />
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
};

export default SampleWorkflow;
