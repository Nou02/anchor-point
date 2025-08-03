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
            <svg viewBox="0 0 24 24" fill="currentColor">
              <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.34-.42-.6-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v2H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.48.26-.6.5s-.15.52-.06.78L3.95 19zM6 6h12v3.97L12 8 6 9.97V6z"/>
            </svg>
            <span>Shipping Portal</span>
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