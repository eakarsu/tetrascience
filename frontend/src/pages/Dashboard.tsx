import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
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
  Activity,
  TrendingUp,
} from 'lucide-react';
import api from '../services/api';

interface DashboardProps {
  user: { name: string; role: string };
}

const Dashboard: React.FC<DashboardProps> = ({ user }) => {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    molecules: 0,
    assays: 0,
    pipelines: 0,
    documents: 0,
    entities: 0,
    instruments: 0,
    embeddings: 0,
    tenants: 0,
    users: 0,
    auditLogs: 0,
    knowledgeNodes: 0,
    searchQueries: 0,
  });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const endpoints = [
          { key: 'molecules', url: '/molecules' },
          { key: 'assays', url: '/assays' },
          { key: 'pipelines', url: '/pipelines' },
          { key: 'documents', url: '/documents' },
          { key: 'entities', url: '/entities' },
          { key: 'instruments', url: '/instruments' },
          { key: 'embeddings', url: '/embeddings' },
          { key: 'tenants', url: '/tenants' },
          { key: 'users', url: '/users' },
          { key: 'auditLogs', url: '/audit-logs' },
          { key: 'knowledgeNodes', url: '/knowledge-graph/nodes' },
          { key: 'searchQueries', url: '/search-analytics' },
        ];

        const results = await Promise.allSettled(
          endpoints.map((ep) => api.get(ep.url))
        );

        const newStats: any = {};
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            const data = result.value.data;
            newStats[endpoints[index].key] = Array.isArray(data) ? data.length : 0;
          } else {
            newStats[endpoints[index].key] = 0;
          }
        });
        setStats((prev) => ({ ...prev, ...newStats }));
      } catch (err) {
        console.error('Failed to fetch stats', err);
      }
    };
    fetchStats();
  }, []);

  const features = [
    {
      title: 'Molecules',
      desc: 'Molecular structures and properties',
      icon: FlaskConical,
      count: stats.molecules,
      path: '/molecules',
      gradient: 'from-blue-500 to-blue-600',
      bg: 'bg-blue-50',
      text: 'text-blue-600',
    },
    {
      title: 'Assays',
      desc: 'Assay results and analysis',
      icon: TestTube2,
      count: stats.assays,
      path: '/assays',
      gradient: 'from-green-500 to-green-600',
      bg: 'bg-green-50',
      text: 'text-green-600',
    },
    {
      title: 'Documents',
      desc: 'Scientific documents and papers',
      icon: FileText,
      count: stats.documents,
      path: '/documents',
      gradient: 'from-amber-500 to-amber-600',
      bg: 'bg-amber-50',
      text: 'text-amber-600',
    },
    {
      title: 'Knowledge Graph',
      desc: 'Entity relationships and graph',
      icon: Share2,
      count: stats.knowledgeNodes,
      path: '/knowledge-graph',
      gradient: 'from-purple-500 to-purple-600',
      bg: 'bg-purple-50',
      text: 'text-purple-600',
    },
    {
      title: 'Entity Resolution',
      desc: 'Disambiguate and link entities',
      icon: Fingerprint,
      count: stats.entities,
      path: '/entities',
      gradient: 'from-rose-500 to-rose-600',
      bg: 'bg-rose-50',
      text: 'text-rose-600',
    },
    {
      title: 'Pipelines',
      desc: 'Data pipeline monitoring',
      icon: Workflow,
      count: stats.pipelines,
      path: '/pipelines',
      gradient: 'from-cyan-500 to-cyan-600',
      bg: 'bg-cyan-50',
      text: 'text-cyan-600',
    },
    {
      title: 'Instruments',
      desc: 'Lab instrument management',
      icon: Radio,
      count: stats.instruments,
      path: '/instruments',
      gradient: 'from-orange-500 to-orange-600',
      bg: 'bg-orange-50',
      text: 'text-orange-600',
    },
    {
      title: 'Search Analytics',
      desc: 'Search quality and performance',
      icon: BarChart3,
      count: stats.searchQueries,
      path: '/search-analytics',
      gradient: 'from-teal-500 to-teal-600',
      bg: 'bg-teal-50',
      text: 'text-teal-600',
    },
    {
      title: 'Embeddings',
      desc: 'Vector embeddings management',
      icon: Boxes,
      count: stats.embeddings,
      path: '/embeddings',
      gradient: 'from-violet-500 to-violet-600',
      bg: 'bg-violet-50',
      text: 'text-violet-600',
    },
    {
      title: 'Compliance',
      desc: 'Audit trail and compliance',
      icon: ShieldCheck,
      count: stats.auditLogs,
      path: '/compliance',
      gradient: 'from-red-500 to-red-600',
      bg: 'bg-red-50',
      text: 'text-red-600',
    },
    {
      title: 'Tenants',
      desc: 'Multi-tenant management',
      icon: Building2,
      count: stats.tenants,
      path: '/tenants',
      gradient: 'from-emerald-500 to-emerald-600',
      bg: 'bg-emerald-50',
      text: 'text-emerald-600',
    },
    {
      title: 'Users',
      desc: 'User accounts and permissions',
      icon: Users,
      count: stats.users,
      path: '/users',
      gradient: 'from-sky-500 to-sky-600',
      bg: 'bg-sky-50',
      text: 'text-sky-600',
    },
  ];

  const topStats = [
    { label: 'Total Molecules', value: stats.molecules, icon: FlaskConical, color: 'text-blue-600', bg: 'bg-blue-50' },
    { label: 'Total Assays', value: stats.assays, icon: TestTube2, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Active Pipelines', value: stats.pipelines, icon: Activity, color: 'text-cyan-600', bg: 'bg-cyan-50' },
    { label: 'Documents', value: stats.documents, icon: TrendingUp, color: 'text-amber-600', bg: 'bg-amber-50' },
  ];

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {user.name}
        </h1>
        <p className="text-gray-500 mt-1">Here's an overview of your Scientific Data Cloud</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {topStats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-200 p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-500">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
                </div>
                <div className={`w-10 h-10 ${stat.bg} rounded-lg flex items-center justify-center`}>
                  <Icon className={`w-5 h-5 ${stat.color}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {features.map((feature) => {
          const Icon = feature.icon;
          return (
            <button
              key={feature.title}
              onClick={() => navigate(feature.path)}
              className="bg-white rounded-xl border border-gray-200 p-5 text-left hover:shadow-lg hover:border-gray-300 transition-all group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className={`w-10 h-10 bg-gradient-to-br ${feature.gradient} rounded-lg flex items-center justify-center shadow-sm`}>
                  <Icon className="w-5 h-5 text-white" />
                </div>
                <span className={`text-xs font-semibold ${feature.text} ${feature.bg} px-2 py-1 rounded-full`}>
                  {feature.count}
                </span>
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">
                {feature.title}
              </h3>
              <p className="text-sm text-gray-500 mt-1">{feature.desc}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default Dashboard;
