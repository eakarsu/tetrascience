import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/LoginPage';
import Dashboard from './pages/Dashboard';
import MolecularSearchPage from './pages/MolecularSearchPage';
import AssayResultsPage from './pages/AssayResultsPage';
import DocumentSearchPage from './pages/DocumentSearchPage';
import KnowledgeGraphPage from './pages/KnowledgeGraphPage';
import EntityResolutionPage from './pages/EntityResolutionPage';
import PipelineMonitorPage from './pages/PipelineMonitorPage';
import InstrumentManagerPage from './pages/InstrumentManagerPage';
import SearchAnalyticsPage from './pages/SearchAnalyticsPage';
import EmbeddingsManagerPage from './pages/EmbeddingsManagerPage';
import ComplianceAuditPage from './pages/ComplianceAuditPage';
import TenantManagementPage from './pages/TenantManagementPage';
import UserManagementPage from './pages/UserManagementPage';

function App() {
  const [user, setUser] = useState<any>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const savedToken = localStorage.getItem('token');
    const savedUser = localStorage.getItem('user');
    if (savedToken && savedUser) {
      setToken(savedToken);
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  }, []);

  const handleLogin = (userData: any, tokenData: string) => {
    setUser(userData);
    setToken(tokenData);
    localStorage.setItem('token', tokenData);
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const handleLogout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  };

  if (!token || !user) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <Router>
      <div className="flex min-h-screen bg-gray-50">
        <Sidebar user={user} onLogout={handleLogout} />
        <main className="flex-1 ml-64">
          <div className="p-6">
            <Routes>
              <Route path="/" element={<Dashboard user={user} />} />
              <Route path="/molecules" element={<MolecularSearchPage />} />
              <Route path="/assays" element={<AssayResultsPage />} />
              <Route path="/documents" element={<DocumentSearchPage />} />
              <Route path="/knowledge-graph" element={<KnowledgeGraphPage />} />
              <Route path="/entities" element={<EntityResolutionPage />} />
              <Route path="/pipelines" element={<PipelineMonitorPage />} />
              <Route path="/instruments" element={<InstrumentManagerPage />} />
              <Route path="/search-analytics" element={<SearchAnalyticsPage />} />
              <Route path="/embeddings" element={<EmbeddingsManagerPage />} />
              <Route path="/compliance" element={<ComplianceAuditPage />} />
              <Route path="/tenants" element={<TenantManagementPage />} />
              <Route path="/users" element={<UserManagementPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
