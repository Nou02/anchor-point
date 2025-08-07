import React from 'react';
import './Sidebar.css';

const menu = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'scheduling', label: 'Scheduling', icon: 'event' },
  { id: 'reports', label: 'Reports', icon: 'description' },
  { id: 'payroll', label: 'Payroll', icon: 'payments' },
  { id: 'weather', label: 'Weather', icon: 'cloud' }
];

const Sidebar = ({ activeMenu, setActiveMenu, handleLogout }) => (
  <aside className="sidebar">
    <div className="sidebar-header">
      <span className="sidebar-anchor-logo" aria-label="Anchor Logo">
        {/* SVG Anchor Icon */}
        <svg width="40" height="38" viewBox="0 0 40 38" fill="none" xmlns="http://www.w3.org/2000/svg">
          <circle cx="20" cy="8" r="4" stroke="#F8F1F1" strokeWidth="2" fill="none"/>
          <path d="M20 12V28" stroke="#F8F1F1" strokeWidth="2" strokeLinecap="round"/>
          <path d="M12 20H28" stroke="#F8F1F1" strokeWidth="2" strokeLinecap="round"/>
          <path d="M10 28C10 32 16 36 20 36C24 36 30 32 30 28" stroke="#F8F1F1" strokeWidth="2"/>
          <path d="M20 28L16 32" stroke="#F8F1F1" strokeWidth="2" strokeLinecap="round"/>
          <path d="M20 28L24 32" stroke="#F8F1F1" strokeWidth="2" strokeLinecap="round"/>
        </svg>
      </span>
      <span className="sidebar-title-minimal">
        <span className="sidebar-title-red">A</span>nchor
        <span className="sidebar-title-red">P</span>oint
      </span>
    </div>
    <nav className="sidebar-nav">
      {menu.map(item => (
        <button
          key={item.id}
          className={`sidebar-nav-item${activeMenu === item.id ? ' active' : ''}`}
          onClick={() => setActiveMenu(item.id)}
          type="button"
        >
          <span className="material-symbols-outlined sidebar-nav-icon">{item.icon}</span>
          <span className="sidebar-nav-label">{item.label}</span>
        </button>
      ))}
    </nav>
    <button className="sidebar-logout-btn-minimal" onClick={handleLogout}>
      Logout
    </button>
  </aside>
);

export default Sidebar;