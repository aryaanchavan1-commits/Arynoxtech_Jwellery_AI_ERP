import React, { useContext, useState } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { AuthContext } from '../../contexts/AuthContext';
import { AppContext } from '../../contexts/AppContext';

const navSections = [
  {
    title: 'BUSINESS',
    items: [
      { path: '/dashboard', icon: '📊', label: 'Dashboard', badge: null },
      { path: '/masters', icon: '📦', label: 'Masters', badge: null },
      { path: '/gold-rates', icon: '🏅', label: 'Gold Rates', badge: 'LIVE' },
      { path: '/crm', icon: '🤝', label: 'CRM', badge: null },
    ]
  },
  {
    title: 'TRANSACTIONS',
    items: [
      { path: '/sales', icon: '🛍️', label: 'Sales / POS', badge: null },
      { path: '/quotations', icon: '📋', label: 'Quotations', badge: null },
      { path: '/purchase', icon: '📥', label: 'Purchase', badge: null },
      { path: '/karagir', icon: '🔧', label: 'Karagir', badge: null },
      { path: '/jobs', icon: '⚙️', label: 'Job Tracking', badge: null },
      { path: '/stock', icon: '💎', label: 'Stock', badge: null },
    ]
  },
  {
    title: 'FINANCE & GST',
    items: [
      { path: '/accounting', icon: '📒', label: 'Accounting', badge: null },
      { path: '/gst', icon: '🧾', label: 'GST Management', badge: null },
      { path: '/girvi', icon: '💰', label: 'Girvi (Pledge)', badge: null },
      { path: '/gold-scheme', icon: '🏦', label: 'Gold Scheme', badge: null },
    ]
  },
  {
    title: 'HR & ADMIN',
    items: [
      { path: '/hr', icon: '👥', label: 'HR & Payroll', badge: null },
      { path: '/permissions', icon: '🔐', label: 'Permissions', badge: null },
      { path: '/alerts', icon: '🔔', label: 'Alerts', badge: null },
    ]
  },
  {
    title: 'REPORTS & TOOLS',
    items: [
      { path: '/all-bills', icon: '📄', label: 'All Bills', badge: null },
      { path: '/reports', icon: '📈', label: 'Reports', badge: null },
      { path: '/barcode-designer', icon: '🏷️', label: 'Barcode Designer', badge: null },
      { path: '/ai-assistant', icon: '🤖', label: 'AI Assistant', badge: null },
      { path: '/data-import', icon: '📥', label: 'Data Import', badge: null },
      { path: '/sync', icon: '🔄', label: 'Sync', badge: null },
      { path: '/help', icon: '❓', label: 'Help', badge: null },
      { path: '/settings', icon: '⚙️', label: 'Settings', badge: null },
    ]
  }
];

export default function Layout() {
  const { user, logout } = useContext(AuthContext);
  const { pageTitle, notifications } = useContext(AppContext);
  const navigate = useNavigate();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="app-layout">
      <aside className={`sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo">
            {sidebarCollapsed ? 'A' : (
              <>
                <div className="logo-icon">A</div>
                <div>
                  <div className="sidebar-title">Arynoxtech ERP</div>
                  <div className="sidebar-subtitle">Jewellery Management</div>
                </div>
              </>
            )}
          </div>
          <button className="collapse-btn" onClick={() => setSidebarCollapsed(!sidebarCollapsed)}>
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </div>

        <nav className="sidebar-nav">
          {navSections.map(section => (
            <div key={section.title} className="nav-section">
              {!sidebarCollapsed && <div className="nav-section-title">{section.title}</div>}
              {section.items.map(item => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                  title={item.label}
                >
                  <span className="nav-icon">{item.icon}</span>
                  {!sidebarCollapsed && (
                    <>
                      <span className="nav-label">{item.label}</span>
                      {item.badge && <span className="nav-badge">{item.badge}</span>}
                    </>
                  )}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className={`user-info ${sidebarCollapsed ? 'collapsed' : ''}`} onClick={handleLogout} title={sidebarCollapsed ? 'Logout' : ''}>
            <div className="user-avatar">
              {user?.display_name?.charAt(0) || 'U'}
            </div>
            {!sidebarCollapsed && (
              <div>
                <div className="user-name">{user?.display_name || 'User'}</div>
                <div className="user-role">Click to logout</div>
              </div>
            )}
          </div>
        </div>
      </aside>

      <div className="main-content">
        <div className="title-bar">
          <div className="title-bar-left">
            <span className="page-title">{pageTitle}</span>
          </div>
          <div className="title-bar-right">
            <span className="date-display">
              {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
            <button className="title-btn" onClick={() => window.electronAPI?.app?.minimize()}>─</button>
            <button className="title-btn" onClick={() => window.electronAPI?.app?.maximize()}>□</button>
            <button className="title-btn close" onClick={() => window.electronAPI?.app?.close()}>✕</button>
          </div>
        </div>

        {notifications.length > 0 && (
          <div className="notification-bar">
            {notifications.slice(-3).map((n, i) => (
              <div key={i} className={`notification-item ${n.type}`}>
                {n.msg}
              </div>
            ))}
          </div>
        )}

        <div className="content-area">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
