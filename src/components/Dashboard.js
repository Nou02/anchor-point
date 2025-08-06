import React, { useState, useEffect } from 'react';
import { auth } from '../firebase/config';
import { signOut } from 'firebase/auth';
import './Dashboard.css';

const Dashboard = () => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((user) => {
      if (user) {
        setUser(user);
      } else {
        // Redirect to login if not authenticated
        window.location.href = '/';
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
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
            <span style={{ fontSize: '24px', marginRight: '8px' }}>⚓</span>
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
        <div className="dashboard-content">
          <h1>Welcome to Your Shipping Dashboard</h1>
          
          <div className="dashboard-grid">
            <div className="dashboard-card">
              <h3>Shipments</h3>
              <p>Track your shipments and view delivery status</p>
              <button className="card-btn">View Shipments</button>
            </div>

            <div className="dashboard-card">
              <h3>Orders</h3>
              <p>Manage your orders and create new shipments</p>
              <button className="card-btn">Manage Orders</button>
            </div>

            <div className="dashboard-card">
              <h3>Analytics</h3>
              <p>View shipping analytics and reports</p>
              <button className="card-btn">View Analytics</button>
            </div>

            <div className="dashboard-card">
              <h3>Settings</h3>
              <p>Update your profile and preferences</p>
              <button className="card-btn">Settings</button>
            </div>
          </div>

          <div className="recent-activity">
            <h2>Recent Activity</h2>
            <div className="activity-list">
              <div className="activity-item">
                <div className="activity-icon">📦</div>
                <div className="activity-content">
                  <h4>Shipment Delivered</h4>
                  <p>Order #12345 has been successfully delivered</p>
                  <span className="activity-time">2 hours ago</span>
                </div>
              </div>

              <div className="activity-item">
                <div className="activity-icon">🚢</div>
                <div className="activity-content">
                  <h4>New Shipment Created</h4>
                  <p>Order #12346 has been created and is in transit</p>
                  <span className="activity-time">1 day ago</span>
                </div>
              </div>

              <div className="activity-item">
                <div className="activity-icon">📊</div>
                <div className="activity-content">
                  <h4>Monthly Report Generated</h4>
                  <p>Your monthly shipping report is ready for review</p>
                  <span className="activity-time">3 days ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default Dashboard; 