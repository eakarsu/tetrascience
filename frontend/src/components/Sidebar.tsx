import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Dna,
  FlaskConical,
  TestTube2,
  FileText,
  Share2,
  Fingerprint,
  Workflow,
  Radio,
  BarChart3,
  Boxes,
  ShieldCheck,
  Building2,
  Users,
  LogOut,
  LayoutDashboard,
  Sparkles,
} from 'lucide-react';

interface SidebarProps {
  user: { name: string; role: string; email: string } | null;
  onLogout: () => void;
}

const navGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    ],
  },
  {
    label: 'Discovery',
    items: [
      { path: '/molecules', label: 'Molecules', icon: FlaskConical },
      { path: '/assays', label: 'Assays', icon: TestTube2 },
      { path: '/documents', label: 'Documents', icon: FileText },
    ],
  },
  {
    label: 'Intelligence',
    items: [
      { path: '/knowledge-graph', label: 'Knowledge Graph', icon: Share2 },
      { path: '/entities', label: 'Entity Resolution', icon: Fingerprint },
      { path: '/embeddings', label: 'Embeddings', icon: Boxes },
    ],
  },
  {
    label: 'Operations',
    items: [
      { path: '/pipelines', label: 'Pipelines', icon: Workflow },
      { path: '/instruments', label: 'Instruments', icon: Radio },
      { path: '/search-analytics', label: 'Search Analytics', icon: BarChart3 },
    ],
  },
  {
    label: 'AI Tools',
    items: [
      { path: '/ai-research-tools', label: 'AI Research Tools', icon: Sparkles },
      { path: '/research-ops', label: 'Research Ops', icon: Sparkles },
    ],
  },
  {
    label: 'Lab Views',
    items: [
      { path: '/custom-views', label: 'Lab Views', icon: FlaskConical },
    ],
  },
  {
    label: 'Administration',
    items: [
      { path: '/compliance', label: 'Compliance', icon: ShieldCheck },
      { path: '/tenants', label: 'Tenants', icon: Building2 },
      { path: '/users', label: 'Users', icon: Users },
    ],
  },
];

const Sidebar: React.FC<SidebarProps> = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <div className="fixed left-0 top-0 bottom-0 w-64 bg-slate-900 text-white flex flex-col z-40">
      <div className="px-5 py-5 border-b border-slate-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
            <Dna className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">TetraScience</h1>
            <p className="text-xs text-slate-400">Scientific Data Cloud</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-3">
        {navGroups.map((group) => (
          <div key={group.label} className="mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-3 mb-1">
              {group.label}
            </p>
            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              const Icon = item.icon;
              return (
                <button
                  key={item.path}
                  onClick={() => navigate(item.path)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                    isActive
                      ? 'bg-slate-700 text-white font-medium'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <Icon className="w-4 h-4 flex-shrink-0" />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="px-4 py-4 border-t border-slate-700">
        {user && (
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-sm font-medium text-white truncate">{user.name}</p>
              <p className="text-xs text-slate-400 truncate capitalize">{user.role}</p>
            </div>
            <button
              onClick={onLogout}
              className="text-slate-400 hover:text-white transition-colors p-1.5 rounded-lg hover:bg-slate-800"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;
