import { useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { 
  ChevronLeft, 
  ChevronRight, 
  LayoutDashboard, 
  ShieldCheck, 
  FileText, 
  LogOut, 
  BookOpen,
  HeartHandshake,
  Users,
  GraduationCap,
  UserPlus
} from 'lucide-react';
import { useWorkspace } from '../contexts/useWorkspace';
import { logoutSession } from '../lib/api';
import { useLocale } from '../lib/i18n';
import { readWorkspaceSessionItem } from '../lib/workspace';
import LocaleSwitcher from './LocaleSwitcher';
import WorkspaceSwitcher from './WorkspaceSwitcher';

interface SidebarProps {
  sidebarOpen?: boolean;
  setSidebarOpen?: (open: boolean) => void;
}

export default function Sidebar({ sidebarOpen, setSidebarOpen }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { activeRole } = useWorkspace();
  const { t } = useLocale();
  const user = (() => {
    const raw = readWorkspaceSessionItem('user');
    if (!raw) return null;
    try {
      return JSON.parse(raw) as { name?: string } | null;
    } catch {
      return null;
    }
  })();

  const handleLogout = async () => {
    await logoutSession();
    navigate('/login');
  };

  const getLinks = () => {
    switch (activeRole) {
      case 'system_admin':
        return [
          { to: '/superadmin', label: t('nav.schoolManagement'), icon: ShieldCheck },
          { to: '/policies', label: t('nav.legal'), icon: FileText },
        ];
      case 'principal':
      case 'secretary':
        return [
          { to: '/director', label: t('nav.directorOverview'), icon: LayoutDashboard },
          { to: '/director/students', label: t('nav.studentsParents'), icon: Users },
          { to: '/director/classes', label: t('nav.classesCourses'), icon: GraduationCap },
          { to: '/director/team', label: t('nav.teamTeachers'), icon: UserPlus },
          { to: '/policies', label: t('nav.legal'), icon: FileText },
        ];
      case 'teacher':
        return [
          { to: '/teacher/dashboard', label: t('nav.teacherClass'), icon: BookOpen },
          { to: '/policies', label: t('nav.legal'), icon: FileText },
        ];
      case 'parent':
        return [
          { to: '/parent/dashboard', label: t('nav.parentSpace'), icon: HeartHandshake },
          { to: '/policies', label: t('nav.legal'), icon: FileText },
        ];
      default:
        return [{ to: '/policies', label: t('nav.legal'), icon: FileText }];
    }
  };

  const links = getLinks();
  const userInitial = user?.name ? user.name.charAt(0).toUpperCase() : 'U';
  const currentPath = `${location.pathname}${location.search}${location.hash}`;

  const handleNavClick = () => {
    if (setSidebarOpen) setSidebarOpen(false);
  };

  return (
    <aside id="app-sidebar" className={`premium-sidebar ${collapsed ? 'premium-sidebar-collapsed' : ''} ${sidebarOpen ? 'sidebar-open' : ''}`}>
      {/* Header / Brand */}
      <div className={`sidebar-header ${collapsed ? 'sidebar-header--collapsed' : 'sidebar-header--expanded'}`}>
        <div className="sidebar-brand">
          <div className="sidebar-brand-icon">
            <img src="/wasel-edu-logo.svg" alt="" aria-hidden="true" />
          </div>
          {!collapsed && (
            <span className="sidebar-brand-text">
              {t('common.appName')}
            </span>
          )}
        </div>
        {!collapsed && (
          <button 
            type="button"
            onClick={() => setCollapsed(true)}
            className="sidebar-toggle-btn"
            aria-label={t('sidebar.collapse')}
            aria-expanded="true"
          >
            <ChevronLeft size={18} />
          </button>
        )}
        {collapsed && (
          <button 
            type="button"
            onClick={() => setCollapsed(false)}
            className="sidebar-expand-btn"
            aria-label={t('sidebar.expand')}
            aria-expanded="false"
          >
            <ChevronRight size={14} />
          </button>
        )}
      </div>

      {/* Navigation Links */}
      <nav aria-label={t('nav.main')} className="sidebar-links">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <NavLink
              key={link.to}
              to={link.to}
              state={link.to === '/policies' ? { from: currentPath } : undefined}
              className={({ isActive }) => `sidebar-link ${isActive ? 'sidebar-link-active' : ''}`}
              title={collapsed ? link.label : undefined}
              onClick={handleNavClick}
            >
              <Icon size={20} className="sidebar-link-icon" />
              {!collapsed && <span>{link.label}</span>}
            </NavLink>
          );
        })}
      </nav>

      {/* Workspace Switcher Component & User Section */}
      <div className="sidebar-footer sidebar-footer-stack">
        {/* Switcher */}
        {!collapsed && (
          <div className="sidebar-workspace-block">
            <span className="sidebar-section-label">
              {t('sidebar.activeRole')}
            </span>
            <WorkspaceSwitcher />
            <LocaleSwitcher />
          </div>
        )}

        {/* User Card */}
        <div className={`sidebar-user-card ${collapsed ? 'sidebar-user-card--collapsed' : ''}`}>
          <div className="sidebar-user-main">
            <div className="sidebar-user-avatar">
              {userInitial}
            </div>
            {!collapsed && (
              <div className="sidebar-user-meta">
                <div className="sidebar-user-name">
                  {user?.name || t('sidebar.userFallback')}
                </div>
                <div className="sidebar-user-role">
                  {activeRole ? t(`role.${activeRole}`) : ''}
                </div>
              </div>
            )}
          </div>
          {!collapsed && (
            <button 
              onClick={handleLogout}
              className="logout-btn"
              title={t('sidebar.logout')}
              aria-label={t('sidebar.logout')}
            >
              <LogOut size={16} />
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
