// Notification Service for managing notifications across the application
class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.loadNotifications();
  }

  // Load notifications from localStorage
  loadNotifications() {
    try {
      const saved = localStorage.getItem('anchorpoint_notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
    }
  }

  // Save notifications to localStorage
  saveNotifications() {
    try {
      localStorage.setItem('anchorpoint_notifications', JSON.stringify(this.notifications));
    } catch (error) {
      console.error('Error saving notifications:', error);
    }
  }

  // Add a new notification
  addNotification(notification) {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
      ...notification
    };
    
    this.notifications.unshift(newNotification);
    this.saveNotifications();
    this.notifyListeners();
    return newNotification;
  }

  // Mark notification as read
  markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      this.saveNotifications();
      this.notifyListeners();
    }
  }

  // Mark all notifications as read
  markAllAsRead() {
    this.notifications.forEach(notification => {
      notification.read = true;
    });
    this.saveNotifications();
    this.notifyListeners();
  }

  // Delete notification
  deleteNotification(notificationId) {
    this.notifications = this.notifications.filter(n => n.id !== notificationId);
    this.saveNotifications();
    this.notifyListeners();
  }

  // Get all notifications
  getNotifications() {
    return [...this.notifications];
  }

  // Get unread notifications count
  getUnreadCount() {
    return this.notifications.filter(n => !n.read).length;
  }

  // Check if there are unread notifications
  hasUnreadNotifications() {
    return this.getUnreadCount() > 0;
  }

  // Add listener for notification changes
  addListener(callback) {
    this.listeners.push(callback);
  }

  // Remove listener
  removeListener(callback) {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  // Notify all listeners
  notifyListeners() {
    this.listeners.forEach(callback => {
      try {
        callback(this.notifications, this.getUnreadCount());
      } catch (error) {
        console.error('Error in notification listener:', error);
      }
    });
  }

  // Create payroll notification for Alice
  createPayrollNotification(fromUser, message) {
    console.log('Creating payroll notification:', { fromUser, message });
    const notification = this.addNotification({
      title: "Payroll Approval Required",
      message: message,
      type: "payroll",
      priority: "high",
      fromUser: fromUser,
      status: "pending"
    });
    console.log('Notification created:', notification);
    return notification;
  }

  // Clear all notifications
  clearAllNotifications() {
    this.notifications = [];
    this.saveNotifications();
    this.notifyListeners();
  }

  // Test function to create a sample notification
  createTestNotification() {
    return this.addNotification({
      title: "Test Notification",
      message: "This is a test notification to verify the system is working.",
      type: "system",
      priority: "medium",
      fromUser: "System",
      status: "active"
    });
  }
}

// Create singleton instance
const notificationService = new NotificationService();

export default notificationService;

