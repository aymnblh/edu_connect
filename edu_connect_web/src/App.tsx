import { Suspense, lazy } from 'react';
import type { ReactNode } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import WorkspaceRoute from './components/WorkspaceRoute';
import { WorkspaceProvider } from './contexts/WorkspaceContext';
import AuthenticatedLayout from './components/AuthenticatedLayout';
import { useLocale } from './lib/i18n';

const queryClient = new QueryClient();

const Login = lazy(() => import('./pages/Login'));
const SuperAdminDashboard = lazy(() => import('./pages/SuperAdminDashboard'));
const DirectorDashboard = lazy(() => import('./pages/DirectorDashboard'));
const LegalPolicies = lazy(() => import('./pages/LegalPolicies'));
const WorkspaceSelect = lazy(() => import('./pages/WorkspaceSelect'));
const TeacherDashboard = lazy(() => import('./pages/TeacherDashboard'));
const ParentDashboard = lazy(() => import('./pages/ParentDashboard'));

function PageLoader() {
  const { t } = useLocale();

  return (
    <div className="flex-center app-loader">
      {t('common.loading')}
    </div>
  );
}

function PageTransition({ children }: { children: ReactNode }) {
  return (
    <div className="page-enter page-enter-active">
      {children}
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <WorkspaceProvider>
        <Router>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              {/* Public Auth Portal */}
              <Route path="/login" element={<PageTransition><Login /></PageTransition>} />
              <Route path="/policies" element={<PageTransition><LegalPolicies /></PageTransition>} />
              <Route path="/workspace/select" element={<PageTransition><WorkspaceSelect /></PageTransition>} />
              
              {/* Authenticated Workspace Scopes wrapped with Sidebar Layout */}
              <Route element={<AuthenticatedLayout />}>
                <Route path="/superadmin" element={<PageTransition><WorkspaceRoute role="system_admin"><SuperAdminDashboard /></WorkspaceRoute></PageTransition>} />
                <Route path="/director" element={<PageTransition><WorkspaceRoute role={['principal', 'secretary']}><DirectorDashboard /></WorkspaceRoute></PageTransition>} />
                <Route path="/director/students" element={<PageTransition><WorkspaceRoute role={['principal', 'secretary']}><DirectorDashboard /></WorkspaceRoute></PageTransition>} />
                <Route path="/director/classes" element={<PageTransition><WorkspaceRoute role={['principal', 'secretary']}><DirectorDashboard /></WorkspaceRoute></PageTransition>} />
                <Route path="/director/team" element={<PageTransition><WorkspaceRoute role={['principal', 'secretary']}><DirectorDashboard /></WorkspaceRoute></PageTransition>} />
                <Route path="/director/messages" element={<PageTransition><WorkspaceRoute role={['principal', 'secretary']}><DirectorDashboard /></WorkspaceRoute></PageTransition>} />
                <Route path="/teacher/dashboard" element={<PageTransition><WorkspaceRoute role="teacher"><TeacherDashboard /></WorkspaceRoute></PageTransition>} />
                <Route path="/parent/dashboard" element={<PageTransition><WorkspaceRoute role="parent"><ParentDashboard /></WorkspaceRoute></PageTransition>} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<Navigate to="/login" replace />} />
            </Routes>
          </Suspense>
        </Router>
      </WorkspaceProvider>
    </QueryClientProvider>
  );
}

export default App;
