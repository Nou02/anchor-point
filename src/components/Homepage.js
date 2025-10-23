import React, { useState, useEffect } from 'react';
import './Homepage.css';
import Scheduling from './Scheduling';
import Report from './Report';
import Payroll from './Payroll';
import Sidebar from './Sidebar';
import InfoContent from './InfoContent';
import NotificationContent from './NotificationContent';
import Analytics from './Analytics';
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

  // Try to get last menu from localStorage, default to 'home'
  const getInitialMenu = () => {
    return localStorage.getItem('activeMenu') || 'home';
  };
  const [activeMenu, setActiveMenu] = useState(getInitialMenu());
  const [showInfo, setShowInfo] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showInfoButton, setShowInfoButton] = useState(false);
  const [showNotificationButton, setShowNotificationButton] = useState(false);
  const [userProfile, setUserProfile] = useState(null);

  useEffect(() => {
    localStorage.setItem('activeMenu', activeMenu);
  }, [activeMenu]);

  // Fetch user profile data and show info button for specific users
  useEffect(() => {
    const checkUser = async () => {
      const auth = getAuth();
      const user = auth.currentUser;
      if (!user) {
        setShowInfoButton(false);
        setUserProfile(null);
        return;
      }
      
      // Try to get user data from Firestore
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserProfile({
            fullName: userData.fullName || user.displayName || user.email.split('@')[0],
            role: userData.role || 'Employee',
            email: userData.email || user.email
          });
          
          // Show info button for both Alice and Carla
          const displayName = userData.fullName || user.displayName || '';
          const isAlice = displayName === 'Alice Margaretha Santos' || 
                         displayName === 'Alice' ||
                         (displayName && displayName.toLowerCase().includes('alice'));
          const isCarla = displayName === 'Carla Dela Peña' || 
                         displayName === 'Carla' ||
                         (displayName && displayName.toLowerCase().includes('carla'));
          setShowInfoButton(isAlice || isCarla);
          
          // Show notification button for all users
          setShowNotificationButton(true);
        } else {
          // Fallback if no Firestore data
          setUserProfile({
            fullName: user.displayName || user.email.split('@')[0],
            role: 'Employee',
            email: user.email
          });
          setShowInfoButton(false);
          setShowNotificationButton(true);
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
        // Fallback if error
        setUserProfile({
          fullName: user.displayName || user.email.split('@')[0],
          role: 'Employee',
          email: user.email
        });
        setShowInfoButton(false);
        setShowNotificationButton(true);
      }
    };
    checkUser();
  }, []);

  const handleInfoClick = () => {
    setShowInfo(true);
    setShowNotifications(false);
  };

  const handleNotificationClick = () => {
    setShowNotifications(true);
    setShowInfo(false);
  };

  const handleMenuClick = (menu) => {
    setShowInfo(false);
    setShowNotifications(false);
    setActiveMenu(menu);
  };

  // Create menu items based on user type
  const createMenuItems = () => {
    const baseMenu = [
      { id: 'home', label: 'Home', icon: 'home' }
    ];

    if (!userProfile) {
      return baseMenu;
    }

    const displayName = userProfile.fullName || '';
    const isCarla = displayName === 'Carla Dela Peña' || 
                   displayName === 'Carla' ||
                   (displayName && displayName.toLowerCase().includes('carla'));
    const isAlice = displayName === 'Alice Margaretha Santos' || 
                   displayName === 'Alice' ||
                   (displayName && displayName.toLowerCase().includes('alice'));
    const isWorker = !isCarla && !isAlice;

    if (isCarla) {
      // Carla: Only Home and Payroll (no Scheduling, no Reports, no Analytics)
      return [
        ...baseMenu,
        { id: 'payroll', label: 'Payroll', icon: 'attach_money' }
      ];
    } else if (isWorker) {
      // Workers: Only Home, Scheduling, and Payroll (no Reports, no Analytics)
      return [
        ...baseMenu,
        { id: 'scheduling', label: 'Scheduling', icon: 'calendar_month' },
        { id: 'payroll', label: 'Payroll', icon: 'attach_money' }
      ];
    } else {
      // Alice and other users: Full access to all sections
      return [
        ...baseMenu,
        { id: 'scheduling', label: 'Scheduling', icon: 'calendar_month' },
        { id: 'reports', label: 'Reports', icon: 'description' },
        { id: 'analytics', label: 'Analytics', icon: 'analytics' },
        { id: 'payroll', label: 'Payroll', icon: 'attach_money' }
      ];
    }
  };

  const menuItems = createMenuItems();

  const renderContent = () => {
    if (showInfo) {
      return <InfoContent />;
    }
    if (showNotifications) {
      return <NotificationContent />;
    }

    // Check if user has access to the requested menu item
    const hasAccess = menuItems.some(item => item.id === activeMenu);
    
    if (!hasAccess) {
      // Redirect to home if user doesn't have access to the requested section
      setActiveMenu('home');
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

    switch (activeMenu) {
      case 'scheduling':
        return <Scheduling />;
      case 'reports':
        return <Report />;
      case 'analytics':
        return <Analytics />;
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
        activeMenu={activeMenu === 'analytics' ? 'reports' : activeMenu}
        setActiveMenu={handleMenuClick}
        menuItems={menuItems}
        handleLogout={handleLogout}
        onInfoClick={handleInfoClick}
        onNotificationClick={handleNotificationClick}
        showInfoButton={showInfoButton}
        showNotificationButton={showNotificationButton}
        userProfile={userProfile}
      />
      {renderContent()}
    </div>
  );
};

export default Homepage;
