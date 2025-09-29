import React, { useState, useEffect } from 'react';
import './Homepage.css';
import Scheduling from './Scheduling';
import Weather from './Weather';
import Report from './Report';
import Payroll from './Payroll';
import Sidebar from './Sidebar';
import InfoContent from './InfoContent';
import { getAuth } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/config';

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
  const [showInfo, setShowInfo] = useState(false);
  const [showInfoButton, setShowInfoButton] = useState(false);

  useEffect(() => {
    localStorage.setItem('activeMenu', activeMenu);
  }, [activeMenu]);

  // Only show info button for Alice Margaretha Santos
  useEffect(() => {
    const checkUser = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setShowInfoButton(false);
        return;
      }
      // Try to get displayName from auth, or fullName from Firestore
      let displayName = user.displayName;
      if (!displayName) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            const data = userDoc.data();
            displayName = data.fullName || data.username || '';
          }
        } catch {}
      }
      setShowInfoButton(displayName === 'Alice Margaretha Santos');
    };
    checkUser();
  }, []);

  const handleInfoClick = () => {
    setShowInfo(true);
  };

  const handleMenuClick = (menu) => {
    setShowInfo(false);
    setActiveMenu(menu);
  };

  const menuItems = [
    { id: 'home', label: 'Home'},
    { id: 'scheduling', label: 'Scheduling'},
    { id: 'reports', label: 'Reports'},
    { id: 'payroll', label: 'Payroll'},
    { id: 'weather', label: 'Weather'}
  ];

  const renderContent = () => {
    if (showInfo) {
      return <InfoContent />;
    }
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
          <div className="main-content" style={{ position: 'relative', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', overflow: 'hidden' }}>
            <video autoPlay loop muted playsInline style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover', zIndex: 0 }}>
              <source src={require('../assets/lnding.mp4')} type="video/mp4" />
              Your browser does not support the video tag.
            </video>
            <div className="content-overlay" style={{ width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', position: 'relative', zIndex: 1 }}>
              <div className="hero-text">
                <h1 className="center-title"></h1>
              </div>
            </div>
          </div>
        );
    }
  };

  return (
    <div className="homepage">
      <Sidebar
        activeMenu={activeMenu}
        setActiveMenu={handleMenuClick}
        menuItems={menuItems}
        handleLogout={handleLogout}
        onInfoClick={handleInfoClick}
        showInfoButton={showInfoButton}
      />
      {renderContent()}
    </div>
  );
};

export default Homepage;
