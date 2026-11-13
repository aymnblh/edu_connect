import { useEffect, useRef, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useWorkspace } from '../contexts/useWorkspace';
import { useLocale } from '../lib/i18n';
import { Menu } from 'lucide-react';
import DemoBanner from './DemoBanner';
import Sidebar from './Sidebar';

export default function AuthenticatedLayout() {
  const { isAuthenticated } = useWorkspace();
  const { t } = useLocale();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const desktop = window.matchMedia('(min-width: 769px)');
    const closeOnDesktop = () => {
      if (desktop.matches) setSidebarOpen(false);
    };
    desktop.addEventListener('change', closeOnDesktop);
    return () => desktop.removeEventListener('change', closeOnDesktop);
  }, []);

  useEffect(() => {
    if (!sidebarOpen) return;

    const sidebar = document.getElementById('app-sidebar');
    const menuButton = menuButtonRef.current;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    sidebar?.querySelector<HTMLElement>('[data-sidebar-close]')?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setSidebarOpen(false);
        return;
      }
      if (event.key !== 'Tab' || !sidebar) return;

      const focusable = Array.from(
        sidebar.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), select:not([disabled]), input:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ).filter((element) => element.offsetParent !== null);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) return;

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
      menuButton?.focus();
    };
  }, [sidebarOpen]);

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
        ref={menuButtonRef}
        type="button"
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
        <DemoBanner />
        <Outlet />
      </main>
    </div>
  );
}
