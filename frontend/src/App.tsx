// === Batch 11 Gaps & Frontend Mounts ===
import GapLiteratureMiningPage from './pages/gap/GapLiteratureMiningPage'
import GapSimilarCompoundsPage from './pages/gap/GapSimilarCompoundsPage'
import GapCollaborationSuggesterPage from './pages/gap/GapCollaborationSuggesterPage'
import GapExperimentRecommenderPage from './pages/gap/GapExperimentRecommenderPage'
import GapElnAuthoringPage from './pages/gap/GapElnAuthoringPage'
import GapDataVersioningPage from './pages/gap/GapDataVersioningPage'
import GapExternalDbSyncPage from './pages/gap/GapExternalDbSyncPage'
import GapAssayCollabPage from './pages/gap/GapAssayCollabPage'
import GapBulkImportPage from './pages/gap/GapBulkImportPage'
import GapRegulatorySubmissionPage from './pages/gap/GapRegulatorySubmissionPage'
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
import AIResearchToolsPage from './pages/AIResearchToolsPage';
import ResearchOpsPage from './pages/ResearchOpsPage';
import CustomViewsPage from './pages/CustomViewsPage';

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
              <Route path="/ai-research-tools" element={<AIResearchToolsPage />} />
              <Route path="/research-ops" element={<ResearchOpsPage />} />
              <Route path="/custom-views" element={<CustomViewsPage />} />
                  {/* === Batch 11 Gaps & Frontend Mounts === */}
        <Route path="/gap/literature-mining" element={<GapLiteratureMiningPage />} />
        <Route path="/gap/similar-compounds" element={<GapSimilarCompoundsPage />} />
        <Route path="/gap/collaboration-suggester" element={<GapCollaborationSuggesterPage />} />
        <Route path="/gap/experiment-recommender" element={<GapExperimentRecommenderPage />} />
        <Route path="/gap/eln-authoring" element={<GapElnAuthoringPage />} />
        <Route path="/gap/data-versioning" element={<GapDataVersioningPage />} />
        <Route path="/gap/external-db-sync" element={<GapExternalDbSyncPage />} />
        <Route path="/gap/assay-collab" element={<GapAssayCollabPage />} />
        <Route path="/gap/bulk-import" element={<GapBulkImportPage />} />
        <Route path="/gap/regulatory-submission" element={<GapRegulatorySubmissionPage />} />
      </Routes>
          </div>
        </main>
      </div>
    </Router>
  );
}

export default App;
