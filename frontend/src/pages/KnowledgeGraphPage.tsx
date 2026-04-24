import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Share2, Plus, Search, Sparkles, Eye, List } from 'lucide-react';
import api from '../services/api';
import { useSortableData, SortableTh, matchesSearch } from '../components/SortableTable';
import DetailModal from '../components/DetailModal';
import ConfirmDialog from '../components/ConfirmDialog';
import AIResponsePanel from '../components/AIResponsePanel';

interface GraphNode {
  id: number;
  label: string;
  nodeType: string;
  properties: any;
  description: string;
}

interface GraphEdge {
  id: number;
  sourceNodeId: number;
  targetNodeId: number;
  relationshipType: string;
  weight: number;
  properties: any;
}

const nodeColors: Record<string, string> = {
  molecule: '#3b82f6',
  protein: '#10b981',
  disease: '#ef4444',
  pathway: '#8b5cf6',
  gene: '#f59e0b',
  organism: '#06b6d4',
  compound: '#ec4899',
  default: '#6b7280',
};

const emptyNode = { label: '', nodeType: 'molecule', properties: '{}', description: '' };
const emptyEdge = { sourceNodeId: '', targetNodeId: '', relationshipType: 'interacts_with', weight: 1.0, properties: '{}' };

const KnowledgeGraphPage: React.FC = () => {
  const [nodes, setNodes] = useState<GraphNode[]>([]);
  const [edges, setEdges] = useState<GraphEdge[]>([]);
  const [view, setView] = useState<'graph' | 'list'>('graph');
  const [selected, setSelected] = useState<GraphNode | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [showNodeForm, setShowNodeForm] = useState(false);
  const [showEdgeForm, setShowEdgeForm] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [nodeForm, setNodeForm] = useState<any>(emptyNode);
  const [edgeForm, setEdgeForm] = useState<any>(emptyEdge);
  const [search, setSearch] = useState('');
  const [highlightedNode, setHighlightedNode] = useState<number | null>(null);
  const [aiResponse, setAiResponse] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [error, setError] = useState('');
  const svgRef = useRef<SVGSVGElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [nodesRes, edgesRes] = await Promise.all([
        api.get('/knowledge-graph/nodes'),
        api.get('/knowledge-graph/edges'),
      ]);
      setNodes(nodesRes.data);
      setEdges(edgesRes.data);
    } catch (err) {
      console.error('Failed to fetch knowledge graph', err);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  const getNodeConnections = (nodeId: number) => {
    return edges.filter(e => e.sourceNodeId === nodeId || e.targetNodeId === nodeId);
  };

  const getNodePosition = (index: number, total: number) => {
    const types = [...new Set(nodes.map(n => n.nodeType))];
    const node = nodes[index];
    const typeIndex = types.indexOf(node.nodeType);
    const nodesOfType = nodes.filter(n => n.nodeType === node.nodeType);
    const indexInType = nodesOfType.indexOf(node);

    const centerX = 400;
    const centerY = 300;
    const typeRadius = 180;
    const typeAngle = (2 * Math.PI * typeIndex) / Math.max(types.length, 1);
    const typeCenterX = centerX + typeRadius * Math.cos(typeAngle) * 0.5;
    const typeCenterY = centerY + typeRadius * Math.sin(typeAngle) * 0.5;

    const itemRadius = 60 + nodesOfType.length * 10;
    const itemAngle = (2 * Math.PI * indexInType) / Math.max(nodesOfType.length, 1);

    return {
      x: typeCenterX + itemRadius * Math.cos(itemAngle),
      y: typeCenterY + itemRadius * Math.sin(itemAngle),
    };
  };

  const nodePositions = nodes.map((_, i) => getNodePosition(i, nodes.length));

  const getNodeById = (id: number) => nodes.find(n => n.id === id);
  const getNodePosById = (id: number) => {
    const idx = nodes.findIndex(n => n.id === id);
    return idx >= 0 ? nodePositions[idx] : null;
  };

  const isConnected = (nodeId: number) => {
    if (!highlightedNode) return true;
    if (nodeId === highlightedNode) return true;
    return edges.some(e =>
      (e.sourceNodeId === highlightedNode && e.targetNodeId === nodeId) ||
      (e.targetNodeId === highlightedNode && e.sourceNodeId === nodeId)
    );
  };

  const isEdgeHighlighted = (edge: GraphEdge) => {
    if (!highlightedNode) return true;
    return edge.sourceNodeId === highlightedNode || edge.targetNodeId === highlightedNode;
  };

  const handleSaveNode = async () => {
    setError('');
    try {
      const payload = {
        ...nodeForm,
        properties: typeof nodeForm.properties === 'string' ? JSON.parse(nodeForm.properties || '{}') : nodeForm.properties,
      };
      if (isEditing && selected) {
        await api.put(`/knowledge-graph/nodes/${selected.id}`, payload);
      } else {
        await api.post('/knowledge-graph/nodes', payload);
      }
      setShowNodeForm(false);
      setIsEditing(false);
      setNodeForm(emptyNode);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save node');
    }
  };

  const handleSaveEdge = async () => {
    setError('');
    try {
      const payload = {
        ...edgeForm,
        sourceNodeId: parseInt(edgeForm.sourceNodeId),
        targetNodeId: parseInt(edgeForm.targetNodeId),
        properties: typeof edgeForm.properties === 'string' ? JSON.parse(edgeForm.properties || '{}') : edgeForm.properties,
      };
      await api.post('/knowledge-graph/edges', payload);
      setShowEdgeForm(false);
      setEdgeForm(emptyEdge);
      fetchData();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to save edge');
    }
  };

  const handleDeleteNode = async () => {
    if (!selected) return;
    try {
      await api.delete(`/knowledge-graph/nodes/${selected.id}`);
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
      const res = await api.post('/ai/explore-graph', { nodeId: selected.id });
      setAiResponse(res.data.analysis || res.data.response || JSON.stringify(res.data));
    } catch (err) {
      setAiResponse('Failed to get AI analysis. Please try again.');
    } finally {
      setAiLoading(false);
    }
  };

  const filteredNodes = nodes.filter(n => matchesSearch(n, search, ['label', 'nodeType', 'description']));
  const enrichedFiltered = filteredNodes.map(n => ({ ...n, connections: getNodeConnections(n.id).length }));
  const { sorted, sort, requestSort } = useSortableData(enrichedFiltered);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Share2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Knowledge Graph</h1>
            <p className="text-sm text-gray-500">{nodes.length} nodes, {edges.length} edges</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setView('graph')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'graph' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              <Eye className="w-4 h-4" /> Graph
            </button>
            <button onClick={() => setView('list')}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${view === 'list' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500'}`}>
              <List className="w-4 h-4" /> List
            </button>
          </div>
          <button onClick={() => { setNodeForm(emptyNode); setIsEditing(false); setShowNodeForm(true); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Node
          </button>
          <button onClick={() => { setEdgeForm(emptyEdge); setShowEdgeForm(true); setError(''); }}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
            <Plus className="w-4 h-4" /> Add Edge
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search nodes..." value={search} onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {Object.entries(nodeColors).filter(([k]) => k !== 'default').map(([type, color]) => (
            <div key={type} className="flex items-center gap-1 text-xs text-gray-600">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: color }}></div>
              {type}
            </div>
          ))}
        </div>
      </div>

      {view === 'graph' ? (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <svg ref={svgRef} viewBox="0 0 800 600" className="w-full h-[500px]">
            <defs>
              <marker id="arrowhead" markerWidth="6" markerHeight="4" refX="6" refY="2" orient="auto">
                <polygon points="0 0, 6 2, 0 4" fill="#94a3b8" />
              </marker>
            </defs>
            {edges.map((edge) => {
              const sourcePos = getNodePosById(edge.sourceNodeId);
              const targetPos = getNodePosById(edge.targetNodeId);
              if (!sourcePos || !targetPos) return null;
              return (
                <line
                  key={edge.id}
                  x1={sourcePos.x}
                  y1={sourcePos.y}
                  x2={targetPos.x}
                  y2={targetPos.y}
                  stroke={isEdgeHighlighted(edge) ? '#94a3b8' : '#e2e8f0'}
                  strokeWidth={isEdgeHighlighted(edge) ? 1.5 : 0.5}
                  opacity={isEdgeHighlighted(edge) ? 1 : 0.3}
                  markerEnd="url(#arrowhead)"
                />
              );
            })}
            {nodes.map((node, i) => {
              const pos = nodePositions[i];
              const color = nodeColors[node.nodeType] || nodeColors.default;
              const connected = isConnected(node.id);
              const connections = getNodeConnections(node.id).length;
              return (
                <g
                  key={node.id}
                  onClick={() => {
                    if (highlightedNode === node.id) {
                      setHighlightedNode(null);
                    } else {
                      setHighlightedNode(node.id);
                    }
                    setSelected(node);
                    setShowDetail(true);
                    setAiResponse('');
                  }}
                  className="cursor-pointer"
                  opacity={connected ? 1 : 0.2}
                >
                  <circle cx={pos.x} cy={pos.y} r={12 + connections * 2} fill={color} opacity={0.2} />
                  <circle cx={pos.x} cy={pos.y} r={8 + connections} fill={color} stroke="white" strokeWidth={2} />
                  <text x={pos.x} y={pos.y + 20 + connections} textAnchor="middle" fontSize="9" fill="#374151" fontWeight="500">
                    {node.label.length > 15 ? node.label.substring(0, 15) + '...' : node.label}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <SortableTh label="Label" sortKey="label" sort={sort} onSort={requestSort} />
                  <SortableTh label="Type" sortKey="nodeType" sort={sort} onSort={requestSort} />
                  <SortableTh label="Connections" sortKey="connections" sort={sort} onSort={requestSort} />
                  <SortableTh label="Description" sortKey="description" sort={sort} onSort={requestSort} />
                </tr>
              </thead>
              <tbody>
                {sorted.map((n) => (
                  <tr key={n.id} onClick={() => { setSelected(n); setShowDetail(true); setAiResponse(''); }}
                    className="border-b border-gray-100 hover:bg-purple-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900">
                      <div className="flex items-center gap-2">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColors[n.nodeType] || nodeColors.default }}></div>
                        {n.label}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{n.nodeType}</td>
                    <td className="px-4 py-3 text-gray-600">{n.connections}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[300px] truncate">{n.description}</td>
                  </tr>
                ))}
                {sorted.length === 0 && (
                  <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-400">No nodes found</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      <DetailModal isOpen={showDetail} onClose={() => { setShowDetail(false); setHighlightedNode(null); }} title={selected?.label || 'Node Details'}
        onEdit={() => {
          if (selected) {
            setNodeForm({
              ...selected,
              properties: JSON.stringify(selected.properties || {}, null, 2),
            });
            setIsEditing(true);
            setShowDetail(false);
            setShowNodeForm(true);
            setError('');
          }
        }}
        onDelete={() => setShowConfirm(true)}>
        {selected && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div><p className="text-xs text-gray-500">Label</p><p className="font-medium">{selected.label}</p></div>
              <div>
                <p className="text-xs text-gray-500">Type</p>
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: nodeColors[selected.nodeType] || nodeColors.default }}></div>
                  <p>{selected.nodeType}</p>
                </div>
              </div>
              <div className="col-span-2"><p className="text-xs text-gray-500">Description</p><p className="text-sm">{selected.description}</p></div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-1">Properties</p>
                <pre className="bg-gray-50 rounded-lg p-3 text-xs overflow-auto">{JSON.stringify(selected.properties, null, 2)}</pre>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500 mb-2">Connected Nodes ({getNodeConnections(selected.id).length})</p>
                <div className="space-y-1">
                  {getNodeConnections(selected.id).map(edge => {
                    const otherId = edge.sourceNodeId === selected.id ? edge.targetNodeId : edge.sourceNodeId;
                    const other = getNodeById(otherId);
                    return (
                      <div key={edge.id} className="flex items-center gap-2 text-sm bg-gray-50 rounded-lg px-3 py-2">
                        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: nodeColors[other?.nodeType || 'default'] || nodeColors.default }}></div>
                        <span className="font-medium">{other?.label || 'Unknown'}</span>
                        <span className="text-gray-400">--</span>
                        <span className="text-xs text-purple-600 bg-purple-50 px-2 py-0.5 rounded">{edge.relationshipType}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
            <button onClick={handleAI} disabled={aiLoading}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded-lg hover:from-purple-700 hover:to-indigo-700 text-sm font-medium">
              <Sparkles className="w-4 h-4" /> Explore with AI
            </button>
            <AIResponsePanel response={aiResponse} loading={aiLoading} title="AI Graph Exploration" onClose={() => setAiResponse('')} />
          </div>
        )}
      </DetailModal>

      <ConfirmDialog isOpen={showConfirm} onClose={() => setShowConfirm(false)} onConfirm={handleDeleteNode}
        title="Delete Node" message={`Are you sure you want to delete "${selected?.label}"? This will also remove connected edges.`} />

      {showNodeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowNodeForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">{isEditing ? 'Edit Node' : 'New Node'}</h2>
              <button onClick={() => setShowNodeForm(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                <input type="text" value={nodeForm.label} onChange={(e) => setNodeForm({ ...nodeForm, label: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                <select value={nodeForm.nodeType} onChange={(e) => setNodeForm({ ...nodeForm, nodeType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="molecule">Molecule</option>
                  <option value="protein">Protein</option>
                  <option value="disease">Disease</option>
                  <option value="pathway">Pathway</option>
                  <option value="gene">Gene</option>
                  <option value="organism">Organism</option>
                  <option value="compound">Compound</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={nodeForm.description} onChange={(e) => setNodeForm({ ...nodeForm, description: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Properties (JSON)</label>
                <textarea value={nodeForm.properties} onChange={(e) => setNodeForm({ ...nodeForm, properties: e.target.value })} rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowNodeForm(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium">Cancel</button>
              <button onClick={handleSaveNode} className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                {isEditing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdgeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowEdgeForm(false)}></div>
          <div className="relative bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold">Add Edge</h2>
              <button onClick={() => setShowEdgeForm(false)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
            <div className="px-6 py-4 space-y-4">
              {error && <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{error}</div>}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Node</label>
                <select value={edgeForm.sourceNodeId} onChange={(e) => setEdgeForm({ ...edgeForm, sourceNodeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select source...</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.nodeType})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Target Node</label>
                <select value={edgeForm.targetNodeId} onChange={(e) => setEdgeForm({ ...edgeForm, targetNodeId: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="">Select target...</option>
                  {nodes.map(n => <option key={n.id} value={n.id}>{n.label} ({n.nodeType})</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Relationship Type</label>
                <select value={edgeForm.relationshipType} onChange={(e) => setEdgeForm({ ...edgeForm, relationshipType: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none">
                  <option value="interacts_with">Interacts With</option>
                  <option value="inhibits">Inhibits</option>
                  <option value="activates">Activates</option>
                  <option value="binds_to">Binds To</option>
                  <option value="part_of">Part Of</option>
                  <option value="related_to">Related To</option>
                  <option value="derives_from">Derives From</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Weight</label>
                <input type="number" step="0.1" value={edgeForm.weight} onChange={(e) => setEdgeForm({ ...edgeForm, weight: parseFloat(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Properties (JSON)</label>
                <textarea value={edgeForm.properties} onChange={(e) => setEdgeForm({ ...edgeForm, properties: e.target.value })} rows={2}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>
            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-200">
              <button onClick={() => setShowEdgeForm(false)} className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-medium">Cancel</button>
              <button onClick={handleSaveEdge} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">Create</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default KnowledgeGraphPage;
