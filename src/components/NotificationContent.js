import React, { useState, useEffect } from 'react';
import './NotificationContent.css';

const NotificationContent = () => {
  const [notifications, setNotifications] = useState([
    {
      id: 1,
      title: "Vessel Arrival Alert",
      message: "MV Ocean Star has arrived at Berth 3. Mooring operations are ready to commence.",
      timestamp: new Date(),
      type: "arrival",
      priority: "high",
      read: false,
      status: "active"
    },
    {
      id: 2,
      title: "Weather Advisory",
      message: "Heavy rain and strong winds forecasted for tomorrow (Oct 24). All outdoor operations should be rescheduled.",
      timestamp: new Date(Date.now() - 1 * 60 * 60 * 1000), // 1 hour ago
      type: "weather",
      priority: "high",
      read: false,
      status: "active"
    },
    {
      id: 3,
      title: "Crew Assignment Update",
      message: "Bryan Matthew Cruz and David Emmanuel Reyes have been assigned to mooring operations for October 24th, 2025.",
      timestamp: new Date(Date.now() - 3 * 60 * 60 * 1000), // 3 hours ago
      type: "assignment",
      priority: "medium",
      read: true,
      status: "completed"
    },
    {
      id: 4,
      title: "System Maintenance Notice",
      message: "Scheduled system maintenance will occur tonight from 11:00 PM to 1:00 AM. Please save your work.",
      timestamp: new Date(Date.now() - 5 * 60 * 60 * 1000), // 5 hours ago
      type: "system",
      priority: "medium",
      read: true,
      status: "scheduled"
    },
    {
      id: 5,
      title: "Payroll Processing Reminder",
      message: "Monthly payroll processing deadline is tomorrow at 5:00 PM. Please ensure all timesheets are submitted.",
      timestamp: new Date(Date.now() - 7 * 60 * 60 * 1000), // 7 hours ago
      type: "payroll",
      priority: "high",
      read: false,
      status: "pending"
    },
    {
      id: 6,
      title: "Safety Protocol Update",
      message: "New safety protocols have been implemented. All crew members must complete the updated training by Friday.",
      timestamp: new Date(Date.now() - 9 * 60 * 60 * 1000), // 9 hours ago
      type: "safety",
      priority: "medium",
      read: true,
      status: "active"
    }
  ]);

  const [filter, setFilter] = useState('all'); // all, unread, read
  const [sortBy, setSortBy] = useState('newest'); // newest, oldest

  // Mark notification as read
  const markAsRead = (id) => {
    setNotifications(prev => 
      prev.map(notification => 
        notification.id === id 
          ? { ...notification, read: true }
          : notification
      )
    );
  };

  // Mark all as read
  const markAllAsRead = () => {
    setNotifications(prev => 
      prev.map(notification => ({ ...notification, read: true }))
    );
  };

  // Delete notification
  const deleteNotification = (id) => {
    setNotifications(prev => prev.filter(notification => notification.id !== id));
  };

  // Format time for display
  const formatTime = (timestamp) => {
    const now = new Date();
    const notificationTime = new Date(timestamp);
    const diffInMinutes = Math.floor((now - notificationTime) / (1000 * 60));
    
    if (diffInMinutes < 1) {
      return 'Just now';
    } else if (diffInMinutes < 60) {
      return `${diffInMinutes}m ago`;
    } else if (diffInMinutes < 1440) { // Less than 24 hours
      const hours = Math.floor(diffInMinutes / 60);
      return `${hours}h ago`;
    } else {
      const days = Math.floor(diffInMinutes / 1440);
      return `${days}d ago`;
    }
  };

  // Get notification icon based on type
  const getNotificationIcon = (type) => {
    switch (type) {
      case 'arrival':
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M20 21c-1.39 0-2.78-.47-4-1.32-2.44 1.71-5.56 1.71-8 0C6.78 20.53 5.39 21 4 21H2v2h2c1.38 0 2.74-.35 4-.99 2.52 1.29 5.48 1.29 8 0 1.26.65 2.62.99 4 .99h2v-2h-2zM3.95 19H4c1.6 0 3.02-.88 4-2 .98 1.12 2.4 2 4 2s3.02-.88 4-2c.98 1.12 2.4 2 4 2h.05l1.89-6.68c.08-.26.06-.54-.06-.78s-.32-.42-.58-.5L20 10.62V6c0-1.1-.9-2-2-2h-3V1H9v3H6c-1.1 0-2 .9-2 2v4.62l-1.29.42c-.26.08-.45.28-.58.5s-.14.52-.06.78L3.95 19zM6 6h12v3.97L12 8l-6 1.97V6z"/>
          </svg>
        );
      case 'weather':
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M6.76 4.84l-1.8-1.79-1.41 1.41 1.79 1.79 1.42-1.41zM1 10.5h3v2H1v-2zm11-9h2v3h-2v-3zm8.04 2.88l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8zm-1.8 13.12l1.41 1.41 1.79-1.8-1.41-1.41-1.79 1.8zM20 10.5h3v2h-3v-2zm-2-5c0 3.04-2.46 5.5-5.5 5.5S7 8.54 7 5.5 9.46 0 12.5 0 18 2.46 18 5.5zm-2 0c0-1.93-1.57-3.5-3.5-3.5S9 3.57 9 5.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5zM5.64 16.36l1.41-1.41 1.41 1.41-1.41 1.41-1.41-1.41zM12 20.5c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5-1.57 3.5-3.5 3.5-3.5-1.57-3.5-3.5z"/>
          </svg>
        );
      case 'assignment':
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16c-.8 0-1.54.37-2.01.99L12 11l-1.99-2.01A2.5 2.5 0 0 0 8 8H5.46c-.8 0-1.54.37-2.01.99L1 14.37V22h2v-6h2.5l2.54-7.63A1.5 1.5 0 0 1 9.46 8H12c.8 0 1.54.37 2.01.99L16 11l1.99-2.01A2.5 2.5 0 0 1 20.54 8H22c.8 0 1.54.37 2.01.99L26.5 16H24v6h2z"/>
          </svg>
        );
      case 'system':
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M19.14,12.94c0.04-0.3,0.06-0.61,0.06-0.94c0-0.32-0.02-0.64-0.07-0.94l2.03-1.58c0.18-0.14,0.23-0.41,0.12-0.61 l-1.92-3.32c-0.12-0.22-0.37-0.29-0.59-0.22l-2.39,0.96c-0.5-0.38-1.03-0.7-1.62-0.94L14.4,2.81c-0.04-0.24-0.24-0.41-0.48-0.41 h-3.84c-0.24,0-0.43,0.17-0.47,0.41L9.25,5.35C8.66,5.59,8.12,5.92,7.63,6.29L5.24,5.33c-0.22-0.08-0.47,0-0.59,0.22L2.74,8.87 C2.62,9.08,2.66,9.34,2.86,9.48l2.03,1.58C4.84,11.36,4.8,11.69,4.8,12s0.02,0.64,0.07,0.94l-2.03,1.58 c-0.18,0.14-0.23,0.41-0.12,0.61l1.92,3.32c0.12,0.22,0.37,0.29,0.59,0.22l2.39-0.96c0.5,0.38,1.03,0.7,1.62,0.94l0.36,2.54 c0.05,0.24,0.24,0.41,0.48,0.41h3.84c0.24,0,0.44-0.17,0.47-0.41l0.36-2.54c0.59-0.24,1.13-0.56,1.62-0.94l2.39,0.96 c0.22,0.08,0.47,0,0.59-0.22l1.92-3.32c0.12-0.22,0.07-0.47-0.12-0.61L19.14,12.94z M12,15.6c-1.98,0-3.6-1.62-3.6-3.6 s1.62-3.6,3.6-3.6s3.6,1.62,3.6,3.6S13.98,15.6,12,15.6z"/>
          </svg>
        );
      case 'payroll':
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/>
          </svg>
        );
      case 'safety':
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12,1L3,5V11C3,16.55 6.84,21.74 12,23C17.16,21.74 21,16.55 21,11V5L12,1M12,7C13.4,7 14.8,8.6 14.8,10V11.5C15.4,11.5 16,12.4 16,13V16C16,16.6 15.6,17 15,17H9C8.4,17 8,16.6 8,16V13C8,12.4 8.4,11.5 9,11.5V10C9,8.6 10.6,7 12,7M12,8.2C11.2,8.2 10.2,9.2 10.2,10V11.5H13.8V10C13.8,9.2 12.8,8.2 12,8.2Z"/>
          </svg>
        );
      default:
        return (
          <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
        );
    }
  };

  // Get notification color based on type
  const getNotificationColor = (type) => {
    switch (type) {
      case 'arrival':
        return '#4CAF50';
      case 'weather':
        return '#FF9800';
      case 'assignment':
        return '#2196F3';
      case 'system':
        return '#9C27B0';
      case 'payroll':
        return '#F44336';
      case 'safety':
        return '#FF5722';
      default:
        return '#607D8B';
    }
  };

  // Get priority indicator
  const getPriorityIndicator = (priority) => {
    switch (priority) {
      case 'high':
        return { color: '#F44336', text: 'High Priority', icon: '🔴' };
      case 'medium':
        return { color: '#FF9800', text: 'Medium Priority', icon: '🟡' };
      case 'low':
        return { color: '#4CAF50', text: 'Low Priority', icon: '🟢' };
      default:
        return { color: '#607D8B', text: 'Normal', icon: '⚪' };
    }
  };

  // Get status indicator
  const getStatusIndicator = (status) => {
    switch (status) {
      case 'active':
        return { color: '#4CAF50', text: 'Active', icon: '●' };
      case 'completed':
        return { color: '#2196F3', text: 'Completed', icon: '✓' };
      case 'pending':
        return { color: '#FF9800', text: 'Pending', icon: '⏳' };
      case 'scheduled':
        return { color: '#9C27B0', text: 'Scheduled', icon: '📅' };
      default:
        return { color: '#607D8B', text: 'Unknown', icon: '?' };
    }
  };

  // Filter and sort notifications
  const filteredNotifications = notifications
    .filter(notification => {
      if (filter === 'unread') return !notification.read;
      if (filter === 'read') return notification.read;
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'newest') return b.timestamp - a.timestamp;
      return a.timestamp - b.timestamp;
    });

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div className="notification-content">
      <div className="notification-header">
        <h2 className="notification-title">NOTIFICATIONS</h2>
        <div className="notification-controls">
          <div className="notification-filters">
            <button 
              className={`filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button 
              className={`filter-btn ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
            <button 
              className={`filter-btn ${filter === 'read' ? 'active' : ''}`}
              onClick={() => setFilter('read')}
            >
              Read ({notifications.length - unreadCount})
            </button>
          </div>
          <div className="notification-actions">
            <select 
              value={sortBy} 
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              <option value="newest">Newest First</option>
              <option value="oldest">Oldest First</option>
            </select>
            {unreadCount > 0 && (
              <button 
                className="mark-all-read-btn"
                onClick={markAllAsRead}
              >
                Mark All Read
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="notification-list">
        {filteredNotifications.length === 0 ? (
          <div className="no-notifications">
            <div className="no-notifications-icon">📭</div>
            <p>No notifications found</p>
          </div>
        ) : (
          filteredNotifications.map(notification => {
            const priorityInfo = getPriorityIndicator(notification.priority);
            const statusInfo = getStatusIndicator(notification.status);
            const typeColor = getNotificationColor(notification.type);
            
            return (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.read ? 'unread' : ''}`}
                onClick={() => markAsRead(notification.id)}
              >
                <div className="notification-icon" style={{ backgroundColor: typeColor }}>
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="notification-content-main">
                  <div className="notification-item-header">
                    <div className="notification-title-section">
                      <h3 className="notification-item-title">{notification.title}</h3>
                      <div className="notification-badges">
                        <span 
                          className="priority-badge" 
                          style={{ backgroundColor: priorityInfo.color }}
                          title={priorityInfo.text}
                        >
                          {priorityInfo.icon}
                        </span>
                        <span 
                          className="status-badge" 
                          style={{ backgroundColor: statusInfo.color }}
                          title={statusInfo.text}
                        >
                          {statusInfo.icon}
                        </span>
                      </div>
                    </div>
                    <div className="notification-item-actions">
                      <span className="notification-time">
                        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" style={{ marginRight: '4px' }}>
                          <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.9L16.2,16.2Z"/>
                        </svg>
                        {formatTime(notification.timestamp)}
                      </span>
                      <button 
                        className="delete-notification-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteNotification(notification.id);
                        }}
                        title="Delete notification"
                      >
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="notification-message">{notification.message}</p>
                  <div className="notification-footer">
                    <span className="notification-type" style={{ color: typeColor }}>
                      {notification.type.charAt(0).toUpperCase() + notification.type.slice(1)}
                    </span>
                    {!notification.read && <div className="unread-indicator"></div>}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};

export default NotificationContent;
