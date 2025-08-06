import React, { useState, useEffect } from 'react';
import './Homepage.css';
import Scheduling from './Scheduling';
import Weather from './Weather';
import Report from './Report';
import Payroll from './Payroll';



const Homepage = () => {
  // Logout handler
  const handleLogout = async () => {
    try {
      const { getAuth, signOut } = await import('firebase/auth');
      const auth = getAuth();
      await signOut(auth);
      window.location.href = '/login'; // Redirect to login page
    } catch (err) {
      alert('Logout failed: ' + err.message);
    }
  };
  // Try to get last menu from localStorage, default to 'weather'
  const getInitialMenu = () => {
    return localStorage.getItem('activeMenu') || 'weather';
  };
  const [activeMenu, setActiveMenu] = useState(getInitialMenu());

  useEffect(() => {
    localStorage.setItem('activeMenu', activeMenu);
  }, [activeMenu]);

  const menuItems = [
    { id: 'home', label: 'Home', icon: '🏠' },
    { id: 'scheduling', label: 'Scheduling', icon: '📅' },
    { id: 'reports', label: 'Reports', icon: '📋' },
    { id: 'payroll', label: 'Payroll', icon: '💰' },
    { id: 'weather', label: 'Weather', icon: '☁️' }
  ];

  const renderContent = () => {
    switch (activeMenu) {
      case 'scheduling':
        return <Scheduling />;
      case 'weather':
        return <Weather />;
      case 'reports':
        return <Report />;
      case 'payroll':
        return <Payroll />;
      case 'home':
      default:
        return (
          <div className="main-content">
            <div className="content-overlay">
              <div className="hero-text">
                <h1>
                  View Ship Schedules,<br />
                  Crew Assignments, and<br />
                  Docking Times.
                </h1>
              </div>
              <div className="cta-button">
                <span className="arrow-icon">→</span>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="homepage">
      {/* Left Sidebar */}
      <div className="sidebar">
        <div className="logo-section">
          <div className="anchor-icon">⚓</div>
          <div className="logo-text">
            <span className="anchor-text">Anchor</span>
            <span className="point-text">Point</span>
            <span className="red-dot">•</span>
          </div>
        </div>
        <nav className="navigation">
          {menuItems.map((item) => (
            <div
              key={item.id}
              className={`nav-item ${activeMenu === item.id ? 'active' : ''}`}
              onClick={() => setActiveMenu(item.id)}
            >
              <span className="nav-icon">{item.icon}</span>
              <span className="nav-label">{item.label}</span>
            </div>
          ))}
        </nav>
        {/* Logout button at the bottom of the sidebar */}
        <div className="logout-section">
          <button className="logout-btn" onClick={handleLogout}>
            Logout
          </button>
        </div>
      </div>
      {/* Main Content Area */}
      {renderContent()}
    </div>
  );
};

export default Homepage;