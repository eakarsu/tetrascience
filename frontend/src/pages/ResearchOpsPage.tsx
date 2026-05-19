import React, { useState } from 'react';
import api from '../services/api';

// Apply pass 5: surfaces backlog endpoints — ELN, lineage, bulk import, comments,
// publication readiness, PubChem lookup. Each section maps 1:1 to a backend route.

type TabKey = 'eln' | 'lineage' | 'bulk' | 'comment' | 'publication' | 'pubchem';

const ResearchOpsPage: React.FC = () => {
  const [tab, setTab] = useState<TabKey>('eln');
  return (
    <div>
      <h1 className="text-2xl font-semibold mb-2">Research Ops</h1>
      <p className="text-sm text-gray-500 mb-4">ELN, lineage, bulk import, comments, publication readiness, PubChem.</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {([
          ['eln', 'ELN Entry'],
          ['lineage', 'Data Lineage'],
          ['bulk', 'Bulk Import'],
          ['comment', 'Comment'],
          ['publication', 'Publication Readiness'],
          ['pubchem', 'PubChem Lookup'],
        ] as Array<[TabKey, string]>).map(([k, label]) => (
          <button key={k} className={`px-3 py-1.5 rounded ${tab === k ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`} onClick={() => setTab(k)}>{label}</button>
        ))}
      </div>
      {tab === 'eln' && <ElnPanel />}
      {tab === 'lineage' && <LineagePanel />}
      {tab === 'bulk' && <BulkPanel />}
      {tab === 'comment' && <CommentPanel />}
      {tab === 'publication' && <PublicationPanel />}
      {tab === 'pubchem' && <PubChemPanel />}
    </div>
  );
};

function show503(setErr: (s: string) => void, err: any, fallback: string) {
  if (err.response?.status === 503) {
    const missing = err.response?.data?.missing;
    setErr(missing ? `Service not configured. Missing env: ${missing}` : 'Service not configured.');
  } else {
    setErr(err.response?.data?.error || err.message || fallback);
  }
}

const Result: React.FC<{ data: any; err: string }> = ({ data, err }) => (
  <div className="mt-3">
    {err && <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">{err}</div>}
    {data && <pre className="p-3 bg-gray-900 text-gray-100 text-xs rounded overflow-auto max-h-80">{JSON.stringify(data, null, 2)}</pre>}
  </div>
);

const ElnPanel: React.FC = () => {
  const [title, setTitle] = useState('');
  const [payload, setPayload] = useState('{\n  "experiment": "blank"\n}');
  const [tags, setTags] = useState('');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setData(null); setErr('');
    try {
      const parsed = JSON.parse(payload);
      const tagsArr = tags.split(',').map(s => s.trim()).filter(Boolean);
      const r = await api.post('/ai/eln-entry', { title, payload: parsed, tags: tagsArr });
      setData(r.data);
    } catch (e: any) { show503(setErr, e, 'Failed to create ELN entry'); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2 max-w-xl">
      <input className="w-full px-3 py-2 border rounded" placeholder="Entry title" value={title} onChange={(e) => setTitle(e.target.value)} required />
      <textarea className="w-full px-3 py-2 border rounded font-mono text-sm" rows={6} value={payload} onChange={(e) => setPayload(e.target.value)} />
      <input className="w-full px-3 py-2 border rounded" placeholder="Tags (comma-separated)" value={tags} onChange={(e) => setTags(e.target.value)} />
      <button className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Save Entry'}</button>
      <Result data={data} err={err} />
    </form>
  );
};

const LineagePanel: React.FC = () => {
  const [parentType, setParentType] = useState('molecule');
  const [parentId, setParentId] = useState('');
  const [childType, setChildType] = useState('assay');
  const [childId, setChildId] = useState('');
  const [transform, setTransform] = useState('');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setData(null); setErr('');
    try {
      const r = await api.post('/ai/data-lineage', { parent_type: parentType, parent_id: parentId, child_type: childType, child_id: childId, transform });
      setData(r.data);
    } catch (e: any) { show503(setErr, e, 'Failed to record lineage'); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2 max-w-xl">
      <div className="grid grid-cols-2 gap-2">
        <input className="w-full px-3 py-2 border rounded" placeholder="parent_type" value={parentType} onChange={(e) => setParentType(e.target.value)} />
        <input className="w-full px-3 py-2 border rounded" placeholder="parent_id" value={parentId} onChange={(e) => setParentId(e.target.value)} required />
        <input className="w-full px-3 py-2 border rounded" placeholder="child_type" value={childType} onChange={(e) => setChildType(e.target.value)} />
        <input className="w-full px-3 py-2 border rounded" placeholder="child_id" value={childId} onChange={(e) => setChildId(e.target.value)} required />
      </div>
      <input className="w-full px-3 py-2 border rounded" placeholder="Transform (e.g. 'docked_into')" value={transform} onChange={(e) => setTransform(e.target.value)} />
      <button className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Recording...' : 'Record Edge'}</button>
      <Result data={data} err={err} />
    </form>
  );
};

const BulkPanel: React.FC = () => {
  const [targetType, setTargetType] = useState('molecule');
  const [rowsText, setRowsText] = useState('[\n  {"name":"Aspirin","smiles":"CC(=O)Oc1ccccc1C(=O)O"}\n]');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setData(null); setErr('');
    try {
      const rows = JSON.parse(rowsText);
      const r = await api.post('/ai/bulk-import', { target_type: targetType, rows });
      setData(r.data);
    } catch (e: any) { show503(setErr, e, 'Failed to queue import'); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2 max-w-xl">
      <input className="w-full px-3 py-2 border rounded" placeholder="Target type (e.g. molecule)" value={targetType} onChange={(e) => setTargetType(e.target.value)} required />
      <textarea className="w-full px-3 py-2 border rounded font-mono text-sm" rows={6} value={rowsText} onChange={(e) => setRowsText(e.target.value)} />
      <button className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Queuing...' : 'Queue Bulk Import'}</button>
      <Result data={data} err={err} />
    </form>
  );
};

const CommentPanel: React.FC = () => {
  const [entityType, setEntityType] = useState('assay');
  const [entityId, setEntityId] = useState('');
  const [body, setBody] = useState('');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setData(null); setErr('');
    try {
      const r = await api.post('/ai/comment', { entity_type: entityType, entity_id: entityId, body });
      setData(r.data);
    } catch (e: any) { show503(setErr, e, 'Failed to add comment'); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2 max-w-xl">
      <div className="grid grid-cols-2 gap-2">
        <input className="w-full px-3 py-2 border rounded" placeholder="entity_type" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
        <input className="w-full px-3 py-2 border rounded" placeholder="entity_id" value={entityId} onChange={(e) => setEntityId(e.target.value)} required />
      </div>
      <textarea className="w-full px-3 py-2 border rounded" rows={4} value={body} onChange={(e) => setBody(e.target.value)} required placeholder="Comment text" />
      <button className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Saving...' : 'Add Comment'}</button>
      <Result data={data} err={err} />
    </form>
  );
};

const PublicationPanel: React.FC = () => {
  const [manuscript, setManuscript] = useState('');
  const [journal, setJournal] = useState('');
  const [studyType, setStudyType] = useState('');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true); setData(null); setErr('');
    try {
      const r = await api.post('/ai/publication-readiness', { manuscript_text: manuscript, target_journal: journal, study_type: studyType });
      setData(r.data);
    } catch (e: any) { show503(setErr, e, 'Failed publication readiness'); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2 max-w-xl">
      <input className="w-full px-3 py-2 border rounded" placeholder="Target journal (optional)" value={journal} onChange={(e) => setJournal(e.target.value)} />
      <input className="w-full px-3 py-2 border rounded" placeholder="Study type (optional)" value={studyType} onChange={(e) => setStudyType(e.target.value)} />
      <textarea className="w-full px-3 py-2 border rounded text-sm" rows={8} value={manuscript} onChange={(e) => setManuscript(e.target.value)} required placeholder="Paste manuscript text..." />
      <button className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Reviewing...' : 'Check Readiness'}</button>
      <Result data={data} err={err} />
    </form>
  );
};

const PubChemPanel: React.FC = () => {
  const [name, setName] = useState('');
  const [cid, setCid] = useState('');
  const [smiles, setSmiles] = useState('');
  const [data, setData] = useState<any>(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name && !cid && !smiles) { setErr('name, cid or smiles required'); return; }
    setLoading(true); setData(null); setErr('');
    try {
      const r = await api.post('/ai/pubchem-lookup', { name: name || undefined, cid: cid || undefined, smiles: smiles || undefined });
      setData(r.data);
    } catch (e: any) { show503(setErr, e, 'Lookup failed'); }
    finally { setLoading(false); }
  };
  return (
    <form onSubmit={submit} className="space-y-2 max-w-xl">
      <p className="text-xs text-gray-500">PubChem PUG-REST is free; PUBCHEM_API_KEY honoured if set as gateway header.</p>
      <input className="w-full px-3 py-2 border rounded" placeholder="Name (e.g. aspirin)" value={name} onChange={(e) => setName(e.target.value)} />
      <input className="w-full px-3 py-2 border rounded" placeholder="CID" value={cid} onChange={(e) => setCid(e.target.value)} />
      <input className="w-full px-3 py-2 border rounded font-mono" placeholder="SMILES" value={smiles} onChange={(e) => setSmiles(e.target.value)} />
      <button className="px-4 py-2 bg-indigo-600 text-white rounded" disabled={loading}>{loading ? 'Looking up...' : 'Lookup'}</button>
      <Result data={data} err={err} />
    </form>
  );
};

export default ResearchOpsPage;
