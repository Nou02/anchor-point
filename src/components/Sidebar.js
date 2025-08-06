import React from 'react';
import './Sidebar.css'; // Optional: create Sidebar.css for styles

const Sidebar = () => (
  <div className="sidebar" style={{
    width: '220px',
    background: '#253a7d',
    color: '#fff',
    height: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    paddingTop: '32px',
    boxShadow: '2px 0 8px rgba(0,0,0,0.08)'
  }}>
    <div style={{ fontSize: '2rem', marginBottom: '24px' }}>⚓</div>
    <h2 style={{ color: '#ff4d4d', marginBottom: '32px' }}>AnchorPoint</h2>
    <nav style={{ width: '100%' }}>
      <ul style={{ listStyle: 'none', padding: 0, width: '100%' }}>
        <li style={{ margin: '16px 0', padding: '8px 24px', background: '#ffe14d', color: '#222', borderRadius: '8px' }}>Scheduling</li>
        <li style={{ margin: '16px 0', padding: '8px 24px' }}>Reports</li>
        <li style={{ margin: '16px 0', padding: '8px 24px' }}>Payroll</li>
        <li style={{ margin: '16px 0', padding: '8px 24px' }}>Weather</li>
      </ul>
    </nav>
    <button style={{
      marginTop: 'auto',
      marginBottom: '32px',
      padding: '12px 32px',
      background: '#16234a',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontWeight: 'bold',
      cursor: 'pointer'
    }}>Logout</button>
  </div>
);

export default Sidebar;