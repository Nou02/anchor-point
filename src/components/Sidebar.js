import React from 'react';
import './Sidebar.css';

const menu = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'scheduling', label: 'Scheduling', icon: 'calendar_month' },
  { id: 'reports', label: 'Reports', icon: 'description' },
  { id: 'payroll', label: 'Payroll', icon: 'attach_money' },
];

const Sidebar = ({ activeMenu, setActiveMenu, handleLogout, onInfoClick, onNotificationClick, showInfoButton, showNotificationButton, userProfile }) => (
  <aside className="sidebar">
    <div className="sidebar-logo-container">
      {/* Anchor SVG */}
      <div className="sidebar-anchor-svg">
        <svg viewBox="-12.8 -12.8 153.60 153.60" width="54" height="54" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" fill="#707070" stroke="#707070">
          <g>
            <path d="M119.58 71.09c-.35-3.54-2-3.21-3.51-1.96c0 0-12.71 13-15.69 15.21c-2.61 1.93-1.4 3.78.02 4.54c0 0 .65.41 2 1.08c-3.88 4.93-11.29 10.74-25.2 12.78c-1.55.23-2.96-.95-3.03-2.51l-3.23-41.18l12.76-2.14c1.79-.3 3.1-1.85 3.1-3.66s-1.31-3.36-3.1-3.66L70.02 47.3l-1.11-14.1c6-1.95 10.35-7.59 10.35-14.23C79.26 10.71 72.54 4 64.29 4s-14.97 6.71-14.97 14.97c0 6.65 4.37 12.3 10.38 14.24l-.94 14.06l-13.89 2.33c-1.79.3-3.1 1.85-3.1 3.66s1.31 3.36 3.1 3.66l13.1 2.19l-2.77 41.53a2.651 2.651 0 0 1-3.03 2.51c-14.72-2.17-22.42-8.67-26.33-13.88c1.6-1.03 2.39-1.74 2.39-1.74c1.42-.75 2.62-2.61.02-4.54c-2.98-2.21-16.69-13.86-16.69-13.86c-1.51-1.26-3.16-1.59-3.51 1.96c-.32 3.24-.58 12.26 2.01 22.15c.38 1.46 1.13 2.11 3.37 1.46c1.68-.48 3.2-1.01 4.59-1.54C26.39 109.15 41.44 124 64.29 124c22.78 0 38.7-14.6 46.69-30.58c1.27.43 2.64.86 4.16 1.3c2.24.65 2.99-.01 3.37-1.46c2.6-9.9 1.39-18.93 1.07-22.17zM57.4 18.97c0-3.8 3.09-6.89 6.89-6.89s6.89 3.09 6.89 6.89s-3.09 6.89-6.89 6.89s-6.89-3.09-6.89-6.89z" fill="#fafafa"></path>
            <path d="M57.6 21.19c-.01-.7-.2-1.5-.2-2.22c0-3.51 2.64-6.41 6.04-6.83c0 0 .3-.05.38-.06c1.11-.18 1.53-.63 1.53-1.44s-.88-1.34-1.44-1.4c-3.26-.32-6.52 1.49-8.07 4c-1.68 2.7-1.89 5.26-.98 7.7c.35.93 1.08 1.29 1.63 1.23c.51-.05 1.12-.29 1.11-.98z" fill="#1a1a1a"></path>
            <path d="M64.29 113.42s-4.71-9.06-12.11-10.26c-14.4-2.34-22.1-8.42-26.08-13.56l-.43-.19L15.58 76.5s8.37 33.8 48.71 36.92z" fill="#fafafa"></path>
            <path d="M77 112.99c-8.04 2.34-11.25 10.93-11.25 10.93s8.06-.23 15.34-2.82c13.93-5.03 24.04-15.99 29.89-27.69c0-.01 2.55-6.88 3.08-12.14c.01.01-5.33 22.48-37.06 31.72z" fill="#1a1a1a" opacity=".89"></path>
            <path d="M41.82 52.87h20.8c.62 0 .93-.75.49-1.18l-4.42-4.4l-13.8 2.31c-1.67.27-2.9 1.63-3.07 3.27z" fill="#fafafa"></path>
            <path d="M86.77 53.62l-20.25-.7c-.63-.02-.96.74-.51 1.18l4.96 4.92L83.7 56.9c1.66-.28 2.89-1.64 3.07-3.28z" fill="#1a1a1a"></path>
          </g>
        </svg>
      </div>
      <div className="sidebar-title">
        <span style={{ color: '#FF4B2B', fontWeight: 700 }}>Anchor</span>
        <span style={{ color: '#fff', fontWeight: 700 }}>Point</span>
      </div>
    </div>
    <nav className="sidebar-nav">
      {(typeof menuItems !== 'undefined' ? menuItems : menu).map(item => (
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

      {/* Notification and Information Buttons */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        margin: '32px auto 16px auto',
        width: '90%'
      }}>
        {/* Notification Button */}
        {showNotificationButton && (
          <button
            className="sidebar-notification-btn"
            onClick={onNotificationClick}
            aria-label="Notifications"
            type="button"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.3s ease',
              color: 'white',
              width: '100%'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #FF6B6B, #FF8E8E)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
              </svg>
            </div>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              flex: 1,
              textAlign: 'left'
            }}>
              Notifications
            </span>
          </button>
        )}

        {/* Information Button */}
        {showInfoButton && (
          <button
            className="sidebar-info-btn"
            onClick={onInfoClick}
            aria-label="Information"
            type="button"
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '12px',
              padding: '12px 16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              transition: 'all 0.3s ease',
              color: 'white',
              width: '100%'
            }}
            onMouseOver={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.2)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseOut={e => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'linear-gradient(135deg, #1976d2, #42a5f5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0
            }}>
              <svg width="18" height="18" fill="white" viewBox="0 0 24 24">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-6h2v6zm0-8h-2V7h2v2z"/>
              </svg>
            </div>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              flex: 1,
              textAlign: 'left'
            }}>
              Information Content
            </span>
          </button>
        )}
      </div>

    {/* User Profile Section */}
    {userProfile && (
      <div className="user-profile-section" style={{
        margin: '32px auto 16px auto',
        padding: '16px',
        background: 'rgba(255, 255, 255, 0.1)',
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.2)',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        width: '90%',
        transition: 'all 0.3s ease'
      }}>
        {/* User Avatar */}
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontSize: '18px',
          fontWeight: 'bold',
          flexShrink: 0,
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)'
        }}>
          {userProfile.fullName ? userProfile.fullName.charAt(0).toUpperCase() : 'U'}
        </div>
        
        {/* User Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            color: '#fff',
            fontSize: '14px',
            fontWeight: '600',
            marginBottom: '2px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {userProfile.fullName || 'User'}
          </div>
          <div style={{
            color: 'rgba(255, 255, 255, 0.7)',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}>
            {userProfile.role || 'Employee'}
          </div>
        </div>
      </div>
    )}

    <button
      className="logout-btn"
      style={{
        width: '90%',
        margin: '0 auto 16px auto',
        display: 'block',
        background: '#fff',
        color: '#0a2240',
        border: 'none',
        borderRadius: '6px',
        padding: '10px 0',
        fontWeight: 'bold',
        fontSize: '1rem',
        cursor: 'pointer',
        boxShadow: '0 1px 4px rgba(0,0,0,0.08)'
      }}
      onClick={handleLogout}
    >
      Logout
    </button>
  </aside>
);

export default Sidebar;