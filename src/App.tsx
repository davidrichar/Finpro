
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import Entries from './pages/Entries';
import Accounts from './pages/Accounts';
import Transfers from './pages/Transfers';
import Settings from './pages/Settings';
import Reports from './pages/Reports';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { type ReactNode } from 'react';
import Layout from './components/Layout';
import { ToastProvider } from './contexts/ToastContext';

const ProtectedRoute = ({ children }: { children: ReactNode }) => {
  const { session, loading } = useAuth();

  if (loading) return <div className="layout-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Loading...</div>;

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  return <Layout>{children}</Layout>;
};

function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/"
              element={
                <ProtectedRoute>
                  <Navigate to="/entries" replace />
                </ProtectedRoute>
              }
            />
            <Route
              path="/entries"
              element={
                <ProtectedRoute>
                  <Entries />
                </ProtectedRoute>
              }
            />
            <Route
              path="/accounts"
              element={
                <ProtectedRoute>
                  <Accounts />
                </ProtectedRoute>
              }
            />
            <Route
              path="/transfers"
              element={
                <ProtectedRoute>
                  <Transfers />
                </ProtectedRoute>
              }
            />
            <Route
              path="/reports"
              element={
                <ProtectedRoute>
                  <Reports />
                </ProtectedRoute>
              }
            />
            <Route
              path="/settings"
              element={
                <ProtectedRoute>
                  <Settings />
                </ProtectedRoute>
              }
            />
          </Routes>
        </Router>
      </AuthProvider>
    </ToastProvider>
  );
}

export default App;
