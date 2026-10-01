import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import CopilotPage from './features/copilot/CopilotPage';
import DocumentsPage from './features/documents/DocumentsPage';
import AuditPage from './features/compliance/AuditPage';
import QueryDetailPage from './features/compliance/QueryDetailPage';
import LoginPage from './features/auth/LoginPage';
import ProfilePage from './features/profile/ProfilePage';
import SettingsPage from './features/settings/SettingsPage';

// Simple auth guard
const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        
        <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
          <Route path="/copilot" element={<CopilotPage />} />
          <Route path="/documents" element={<DocumentsPage />} />
          <Route path="/audit" element={<AuditPage />} />
          <Route path="/audit/:queryId" element={<QueryDetailPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/settings" element={<SettingsPage />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
