import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import { getTabUser, clearTabUser, setTabUser } from '../utils/tabAuth';
import './Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setTabUser(user);
        setUser(user);
      } else {
        // Check if this tab has a stored user
        const tabUser = getTabUser();
        if (!tabUser) {
          // Redirect to login if not authenticated
          window.location.href = '/';
        } else {
          // This tab has a session, maintain it
          setUser({
            uid: tabUser.uid,
            email: tabUser.email,
            displayName: tabUser.displayName,
            _tabSession: true
          });
        }
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      // Get tab user BEFORE clearing
      const tabUser = getTabUser();
      const currentUser = auth.currentUser;
      
      // Only sign out from Firebase if this tab owns the Firebase session
      if (tabUser && currentUser && tabUser.uid === currentUser.uid) {
        await signOut(auth);
      }
      
      // Clear this tab's user session
      clearTabUser();
      window.location.href = '/';
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-loading">
        <div className="loading-spinner"></div>
        <p>Loading...</p>
      </div>
    );
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-content">
          <div className="logo">
            <span className="logo-icon">⚓</span>
            <span>Anchor Point</span>
          </div>
          <div className="user-info">
            <span>Welcome, {user?.displayName || user?.email}</span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="dashboard-main">
        {/* Empty main content - just the background */}
      </main>
    </div>
  );
};

export default Dashboard;