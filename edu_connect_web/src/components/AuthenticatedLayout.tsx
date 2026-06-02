import { useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useWorkspace } from '../contexts/useWorkspace';
import { useLocale } from '../lib/i18n';
import { Menu } from 'lucide-react';
import Sidebar from './Sidebar';

export default function AuthenticatedLayout() {
  const { isAuthenticated } = useWorkspace();
  const { t } = useLocale();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="layout">
      {/* Skip to content link for keyboard/screen-reader users */}
      <a href="#main-content" className="skip-link">
        {t('layout.skipContent')}
      </a>

      {/* Visual Ambient Background */}
      <div className="ambient-bg">
        <div className="ambient-blob-1"></div>
        <div className="ambient-blob-2"></div>
      </div>

      {/* Hamburger button for mobile */}
      <button
        className="hamburger-btn"
        onClick={() => setSidebarOpen(true)}
        aria-label={t('layout.openMenu')}
        aria-expanded={sidebarOpen}
        aria-controls="app-sidebar"
      >
        <Menu size={20} />
      </button>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      
      {/* Premium Sidebar */}
      <Sidebar sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      
      {/* Content Canvas */}
      <main id="main-content" className="layout-content-wrapper">
        <Outlet />
      </main>
    </div>
  );
}
