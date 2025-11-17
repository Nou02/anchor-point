// Notification Service for managing notifications across the application
import { getFirestore, collection, addDoc, query, where, getDocs, doc, updateDoc, deleteDoc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '../firebase/config';

class NotificationService {
  constructor() {
    this.notifications = [];
    this.listeners = [];
    this.firestoreUnsubscribe = null;
    this.loadNotifications();
    this.setupFirestoreListener();
    // Load existing Firestore notifications after a short delay to ensure listener is set up
    setTimeout(() => {
      this.loadFirestoreNotifications();
      // Clean up all duplicates aggressively
      this.cleanupAllDuplicates();
    }, 2000);
  }

  // Aggressively clean up all duplicate notifications from Firestore
  async cleanupAllDuplicates() {
    try {
      console.log('Starting aggressive duplicate cleanup...');
      const q = query(
        collection(db, 'notifications'),
        where('type', '==', 'payroll'),
        where('targetRole', '==', 'worker'),
        where('status', '==', 'available')
      );
      const snapshot = await getDocs(q);
      
      // Group notifications by worker and payroll date
      const grouped = new Map();
      
      snapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const payrollDate = data.payrollDate || '';
        const targetUser = data.targetUser || '';
        
        // Normalize worker name for grouping
        const normalizedUser = targetUser.trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
        const key = `${normalizedUser}_${payrollDate}`;
        
        if (!grouped.has(key)) {
          grouped.set(key, []);
        }
        
        grouped.get(key).push({
          id: docSnapshot.id,
          ...data,
          timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date()
        });
      });
      
      // For each group, keep only the most recent and delete the rest
      let totalDeleted = 0;
      for (const [key, notifications] of grouped.entries()) {
        if (notifications.length > 1) {
          // Sort by timestamp (most recent first)
          notifications.sort((a, b) => {
            const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
            const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
            return timeB - timeA;
          });
          
          // Keep the first (most recent), delete the rest
          const toDelete = notifications.slice(1);
          totalDeleted += toDelete.length;
          
          console.log(`Found ${notifications.length} duplicates for key ${key}, keeping 1, deleting ${toDelete.length}`);
          
          // Delete all duplicates
          for (const dup of toDelete) {
            await deleteDoc(doc(db, 'notifications', dup.id));
          }
        }
      }
      
      if (totalDeleted > 0) {
        console.log(`Cleaned up ${totalDeleted} duplicate notifications from Firestore`);
        // Reload notifications after cleanup
        setTimeout(() => {
          this.loadFirestoreNotifications();
        }, 1000);
      }
    } catch (error) {
      console.error('Error in aggressive duplicate cleanup:', error);
    }
  }

  // Load notifications from localStorage
  loadNotifications() {
    try {
      const saved = localStorage.getItem('anchorpoint_notifications');
      if (saved) {
        this.notifications = JSON.parse(saved);
        // Clean up duplicates on load
        this.removeDuplicateNotifications();
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      this.notifications = [];
    }
  }

  // Remove duplicate notifications
  removeDuplicateNotifications() {
    const seen = new Map();
    const uniqueNotifications = [];
    
    // Process notifications in reverse order to keep the most recent ones
    for (let i = this.notifications.length - 1; i >= 0; i--) {
      const notification = this.notifications[i];
      
      // Create a unique key based on notification type and identifying info
      let key = '';
      
      if (notification.type === 'weather') {
        // Only one weather notification should exist
        key = 'weather';
      } else if (notification.type === 'payroll') {
        // For payroll, include ID and timestamp to allow multiple notifications for same day
        // Don't check for duplicates - allow all payroll notifications
        const notificationId = notification.id || Date.now() + Math.random();
        const timestamp = notification.timestamp instanceof Date ? notification.timestamp.getTime() : new Date(notification.timestamp || 0).getTime();
        const normalizedUser = (notification.targetUser || '').trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
        key = `payroll_${notificationId}_${timestamp}_${notification.targetRole}_${notification.status}_${notification.payrollDate || ''}_${normalizedUser}`;
      } else {
        // For other types, use type + title + message
        key = `${notification.type}_${notification.title}_${notification.message}`;
      }
      
      if (!seen.has(key)) {
        seen.set(key, true);
        uniqueNotifications.unshift(notification); // Add to beginning to maintain order
      }
    }
    
    if (uniqueNotifications.length !== this.notifications.length) {
      console.log(`Removed ${this.notifications.length - uniqueNotifications.length} duplicate notifications`);
      this.notifications = uniqueNotifications;
      this.saveNotifications();
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
  async addNotification(notification) {
    const newNotification = {
      id: Date.now() + Math.random(),
      timestamp: new Date(),
      read: false,
      ...notification
    };
    
    // For payroll and scheduling notifications, save to Firestore and let the listener handle adding to local array
    // This prevents duplicates from being added locally and then again from Firestore
    // Scheduling notifications need Firestore to sync across browsers in real-time
    if (notification.type === 'payroll' || notification.type === 'scheduling') {
      try {
        const docRef = await addDoc(collection(db, 'notifications'), {
          ...newNotification,
          timestamp: Timestamp.now(),
          createdAt: Timestamp.now()
        });
        // Don't add to local array - the Firestore listener will handle it
        // This prevents duplicates
        return { id: docRef.id, ...newNotification };
      } catch (error) {
        console.error('Error saving notification to Firestore:', error);
        // If Firestore save fails, add locally as fallback
        this.notifications.unshift(newNotification);
        this.saveNotifications();
        this.notifyListeners();
        return newNotification;
      }
    } else {
      // For non-payroll/scheduling notifications, add locally
      this.notifications.unshift(newNotification);
      this.saveNotifications();
      this.notifyListeners();
      return newNotification;
    }
  }

  // Setup Firestore listener for real-time updates
  setupFirestoreListener() {
    try {
      const q = query(collection(db, 'notifications'));
      this.firestoreUnsubscribe = onSnapshot(q, async (snapshot) => {
        const firestoreNotifications = [];
        snapshot.forEach((doc) => {
          const data = doc.data();
          firestoreNotifications.push({
            id: doc.id,
            ...data,
            timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
            fromFirestore: true // Mark as from Firestore
          });
        });
        
        // For payroll and scheduling notifications, use only Firestore (remove local ones)
        // For other notifications, keep local ones
        const localNonSync = this.notifications.filter(n => n.type !== 'payroll' && n.type !== 'scheduling');
        
        // Combine Firestore notifications with local non-sync notifications
        const merged = [...firestoreNotifications, ...localNonSync];
        
        // Remove duplicates using a more robust key - keep only the most recent one
        const seen = new Map(); // Use Map to store the best version of each notification
        const duplicatesToDelete = []; // Track duplicates to delete from Firestore
        
        merged.forEach(n => {
          // Create a unique key based on notification content
          let key = '';
          if (n.type === 'payroll') {
            // For payroll notifications, include the notification ID to allow multiple notifications for same day
            // This allows multiple payroll notifications for the same date (e.g., multiple saves or approvals)
            const normalizedUser = (n.targetUser || '').trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
            const notificationId = n.id || Date.now() + Math.random();
            const timestamp = n.timestamp instanceof Date ? n.timestamp.getTime() : new Date(n.timestamp || 0).getTime();
            // Include ID and timestamp to make each notification unique - no duplicate checking for payroll
            key = `payroll_${notificationId}_${timestamp}_${n.targetRole || ''}_${n.status || ''}_${n.payrollDate || ''}_${normalizedUser}`;
          } else if (n.type === 'scheduling') {
            // For scheduling notifications, use ID and timestamp to make each unique
            const notificationId = n.id || Date.now() + Math.random();
            const timestamp = n.timestamp instanceof Date ? n.timestamp.getTime() : new Date(n.timestamp || 0).getTime();
            key = `scheduling_${notificationId}_${timestamp}`;
          } else if (n.type === 'weather') {
            // For weather, only one should exist
            key = 'weather';
          } else {
            // For other types, use type + title + message
            key = `${n.type}_${n.title || ''}_${n.message || ''}`;
          }
          
          // If we haven't seen this key, add it
          if (!seen.has(key)) {
            seen.set(key, n);
          } else {
            // We found a duplicate - keep the most recent one (only for non-payroll/scheduling types)
            // For payroll and scheduling, each notification should be unique due to ID/timestamp in key
            if (n.type !== 'payroll' && n.type !== 'scheduling') {
              const existing = seen.get(key);
              const existingTime = existing.timestamp instanceof Date ? existing.timestamp.getTime() : new Date(existing.timestamp).getTime();
              const newTime = n.timestamp instanceof Date ? n.timestamp.getTime() : new Date(n.timestamp).getTime();
              
              if (newTime > existingTime) {
                // New one is more recent - mark old one for deletion if it's from Firestore
                if (existing.fromFirestore && typeof existing.id === 'string' && existing.id.length > 10) {
                  duplicatesToDelete.push(existing.id);
                }
                seen.set(key, n);
              } else {
                // Existing one is more recent - mark new one for deletion if it's from Firestore
                if (n.fromFirestore && typeof n.id === 'string' && n.id.length > 10) {
                  duplicatesToDelete.push(n.id);
                }
              }
            } else {
              // For payroll, if key already exists, it means it's the exact same notification (same ID)
              // In this case, keep the existing one
              console.log('Payroll notification with same ID already exists:', n.id);
            }
          }
        });
        
        // Delete duplicates from Firestore immediately
        if (duplicatesToDelete.length > 0) {
          console.log(`Deleting ${duplicatesToDelete.length} duplicate notifications from Firestore`);
          // Delete all duplicates in parallel and wait for completion
          await Promise.all(
            duplicatesToDelete.map(dupId => 
              deleteDoc(doc(db, 'notifications', dupId)).catch(err => {
                console.error('Error deleting duplicate notification:', err);
              })
            )
          );
        }
        
        // Convert map values to array and sort
        const unique = Array.from(seen.values()).sort((a, b) => {
          const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
          const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
          return timeB - timeA; // Newest first
        });
        
        this.notifications = unique;
        this.saveNotifications();
        this.notifyListeners();
      }, (error) => {
        console.error('Error in Firestore notification listener:', error);
      });
    } catch (error) {
      console.error('Error setting up Firestore listener:', error);
    }
  }

  // Load notifications from Firestore on initialization
  async loadFirestoreNotifications() {
    try {
      const q = query(collection(db, 'notifications'));
      const snapshot = await getDocs(q);
      const firestoreNotifications = [];
      
      snapshot.forEach((doc) => {
        const data = doc.data();
        firestoreNotifications.push({
          id: doc.id,
          ...data,
          timestamp: data.timestamp?.toDate() || data.createdAt?.toDate() || new Date(),
          fromFirestore: true
        });
      });
      
      // For payroll and scheduling notifications, use only Firestore (remove local ones)
      // For other notifications, keep local ones
      const localNonSync = this.notifications.filter(n => n.type !== 'payroll' && n.type !== 'scheduling');
      const merged = [...firestoreNotifications, ...localNonSync];
      
      // Remove duplicates using the same logic as the listener
      const seen = new Map();
      merged.forEach(n => {
        let key = '';
        if (n.type === 'payroll') {
          // For payroll notifications, include the notification ID to allow multiple notifications for same day
          const normalizedUser = (n.targetUser || '').trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
          const notificationId = n.id || Date.now() + Math.random();
          const timestamp = n.timestamp instanceof Date ? n.timestamp.getTime() : new Date(n.timestamp || 0).getTime();
          // Include ID and timestamp to make each notification unique - no duplicate checking for payroll
          key = `payroll_${notificationId}_${timestamp}_${n.targetRole || ''}_${n.status || ''}_${n.payrollDate || ''}_${normalizedUser}`;
        } else if (n.type === 'scheduling') {
          // For scheduling notifications, use ID and timestamp to make each unique
          const notificationId = n.id || Date.now() + Math.random();
          const timestamp = n.timestamp instanceof Date ? n.timestamp.getTime() : new Date(n.timestamp || 0).getTime();
          key = `scheduling_${notificationId}_${timestamp}`;
        } else if (n.type === 'weather') {
          key = 'weather';
        } else {
          key = `${n.type}_${n.title || ''}_${n.message || ''}`;
        }
        
        // If we haven't seen this key, add it
        // For payroll and scheduling, each notification should be unique due to ID/timestamp in key, so just add it
        if (!seen.has(key)) {
          seen.set(key, n);
        } else if (n.type !== 'payroll' && n.type !== 'scheduling') {
          // Only apply duplicate logic for non-payroll types
          if (n.fromFirestore && !seen.get(key).fromFirestore) {
            // Replace local with Firestore version
            seen.set(key, n);
          } else if (n.fromFirestore && seen.get(key).fromFirestore) {
            // Both are from Firestore, keep the one with the most recent timestamp
            const existing = seen.get(key);
            const existingTime = existing.timestamp instanceof Date ? existing.timestamp.getTime() : new Date(existing.timestamp).getTime();
            const newTime = n.timestamp instanceof Date ? n.timestamp.getTime() : new Date(n.timestamp).getTime();
            if (newTime > existingTime) {
              seen.set(key, n);
            }
          }
        } else {
          // For payroll and scheduling, if key exists, it's the exact same notification (same ID) - keep existing
          console.log(`${n.type} notification with same ID already exists:`, n.id);
        }
      });
      
      const unique = Array.from(seen.values()).sort((a, b) => {
        const timeA = a.timestamp instanceof Date ? a.timestamp.getTime() : new Date(a.timestamp).getTime();
        const timeB = b.timestamp instanceof Date ? b.timestamp.getTime() : new Date(b.timestamp).getTime();
        return timeB - timeA;
      });
      
      this.notifications = unique;
      this.saveNotifications();
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading Firestore notifications:', error);
    }
  }

  // Mark notification as read
  async markAsRead(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.read = true;
      
      // Update in Firestore if it's a payroll or scheduling notification
      if ((notification.type === 'payroll' || notification.type === 'scheduling') && typeof notificationId === 'string' && notificationId.length > 10) {
        try {
          await updateDoc(doc(db, 'notifications', notificationId), {
            read: true
          });
        } catch (error) {
          console.error('Error updating notification in Firestore:', error);
        }
      }
      
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

  // Create payroll approval notification for admin (Alice)
  // Always creates a new notification - no duplicate checking to allow multiple notifications for same day
  async createPayrollApprovalNotification(fromUser, payrollDate, isUpdate = false) {
    // Always create a new notification - allow multiple notifications for the same day
    const message = isUpdate 
      ? `Payroll for ${payrollDate} has been updated and resubmitted by ${fromUser} and requires your approval.`
      : `Payroll for ${payrollDate} has been submitted by ${fromUser} and requires your approval.`;
    
    // Create a new notification with unique timestamp to ensure it's a separate notification
    return await this.addNotification({
      title: "Payroll Approval Required",
      message: message,
      type: "payroll",
      priority: "high",
      fromUser: fromUser,
      targetRole: "admin", // For Alice/Admin
      status: "pending",
      action: "approve_payroll",
      payrollDate: payrollDate,
      createdAt: new Date().toISOString() // Ensure unique timestamp
    });
  }

  // Create payroll approved notification for scheduler (Carla)
  // Always creates a new notification - no duplicate checking to allow multiple notifications for same day
  async createPayrollApprovedNotification(approvedBy, payrollDate) {
    // Always create a new notification - allow multiple notifications for the same day
    return await this.addNotification({
      title: "Payroll Approved",
      message: `Payroll for ${payrollDate} has been approved by ${approvedBy}.`,
      type: "payroll",
      priority: "medium",
      fromUser: approvedBy,
      targetRole: "scheduler", // For Carla/Scheduler
      status: "approved",
      payrollDate: payrollDate,
      createdAt: new Date().toISOString() // Ensure unique timestamp
    });
  }

  // Create payroll available notification for workers (one per worker per payroll date)
  async createPayrollAvailableNotification(payrollDate, workerName) {
    // Normalize worker name for comparison (remove commas, extra spaces, convert to lowercase)
    const normalizedWorkerName = workerName.trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
    
    // Check if notification already exists for this specific worker and payroll date
    // Use strict matching to ensure one notification per worker
    // First check local notifications
    const existingLocalNotification = this.notifications.find(n => {
      if (n.type !== 'payroll' || n.targetRole !== 'worker' || n.status !== 'available') {
        return false;
      }
      
      // Check payroll date match
      const dateMatches = (n.payrollDate && n.payrollDate === payrollDate) || 
                         (n.message && n.message.includes(payrollDate));
      
      if (!dateMatches) return false;
      
      // Check worker name match - must be exact or contained match
      if (n.targetUser) {
        const existingName = n.targetUser.trim().toLowerCase();
        // Check if names match exactly or if one contains the other
        return existingName === normalizedWorkerName || 
               existingName.includes(normalizedWorkerName) || 
               normalizedWorkerName.includes(existingName);
      }
      
      return false;
    });
    
    if (existingLocalNotification) {
      console.log('Payroll notification already exists for worker:', workerName, 'date:', payrollDate);
      return existingLocalNotification;
    }
    
    // Also check Firestore for existing notifications and delete duplicates
    try {
      const q = query(
        collection(db, 'notifications'),
        where('type', '==', 'payroll'),
        where('targetRole', '==', 'worker'),
        where('status', '==', 'available')
      );
      const snapshot = await getDocs(q);
      
      const matchingNotifications = [];
      for (const docSnapshot of snapshot.docs) {
        const data = docSnapshot.data();
        const dateMatches = (data.payrollDate && data.payrollDate === payrollDate) || 
                           (data.message && data.message.includes(payrollDate));
        
        if (dateMatches && data.targetUser) {
          const existingName = data.targetUser.trim().toLowerCase().replace(/,/g, '').replace(/\s+/g, ' ');
          // Check if names match (normalized)
          if (existingName === normalizedWorkerName || 
              existingName.includes(normalizedWorkerName) || 
              normalizedWorkerName.includes(existingName)) {
            matchingNotifications.push({ id: docSnapshot.id, ...data });
          }
        }
      }
      
      // If we found matching notifications, keep only the most recent one and delete the rest
      if (matchingNotifications.length > 0) {
        // Sort by timestamp (most recent first)
        matchingNotifications.sort((a, b) => {
          const timeA = a.timestamp?.toDate ? a.timestamp.toDate().getTime() : new Date(a.timestamp || 0).getTime();
          const timeB = b.timestamp?.toDate ? b.timestamp.toDate().getTime() : new Date(b.timestamp || 0).getTime();
          return timeB - timeA;
        });
        
        // Keep the most recent one
        const mostRecent = matchingNotifications[0];
        
        // Delete all others immediately
        if (matchingNotifications.length > 1) {
          console.log(`Deleting ${matchingNotifications.length - 1} duplicate notifications for worker:`, workerName, 'date:', payrollDate);
          await Promise.all(
            matchingNotifications.slice(1).map(dup => 
              deleteDoc(doc(db, 'notifications', dup.id)).catch(err => {
                console.error('Error deleting duplicate notification:', err);
              })
            )
          );
        }
        
        console.log('Payroll notification already exists in Firestore for worker:', workerName, 'date:', payrollDate);
        return { id: mostRecent.id, ...mostRecent };
      }
    } catch (error) {
      console.error('Error checking Firestore for existing notification:', error);
    }
    
    // Create new notification (will be saved to Firestore via addNotification)
    return await this.addNotification({
      title: "Payroll Available",
      message: `Your payroll for ${payrollDate} is now available for review.`,
      type: "payroll",
      priority: "medium",
      fromUser: "System",
      targetUser: workerName.trim(), // Store normalized worker name
      targetRole: "worker",
      status: "available",
      payrollDate: payrollDate // Store payroll date for easier checking
    });
  }

  // Create weather notification (only one at a time)
  createWeatherNotification(weatherData) {
    // Remove all existing weather notifications first to ensure only one exists
    const existingWeatherNotifications = this.notifications.filter(n => n.type === 'weather');
    
    if (existingWeatherNotifications.length > 0) {
      // Remove all existing weather notifications
      this.notifications = this.notifications.filter(n => n.type !== 'weather');
      
      // Update the most recent one (or create new if none found)
      const { condition, temperature, alert } = weatherData;
      let message = `Current weather: ${condition}, ${temperature}°C`;
      if (alert) {
        message += `. Alert: ${alert}`;
      }
      
      const updatedNotification = {
        id: existingWeatherNotifications[0].id || Date.now() + Math.random(),
        title: "Weather Update",
        message: message,
        type: "weather",
        priority: alert ? "high" : "low",
        fromUser: "Weather Service",
        targetRole: "all",
        status: "active",
        weatherData: weatherData,
        timestamp: new Date(),
        read: false
      };
      
      this.notifications.unshift(updatedNotification);
      this.saveNotifications();
      this.notifyListeners();
      return updatedNotification;
    }
    
    const { condition, temperature, alert } = weatherData;
    let message = `Current weather: ${condition}, ${temperature}°C`;
    if (alert) {
      message += `. Alert: ${alert}`;
    }
    
    return this.addNotification({
      title: "Weather Update",
      message: message,
      type: "weather",
      priority: alert ? "high" : "low",
      fromUser: "Weather Service",
      targetRole: "all", // For all users
      status: "active",
      weatherData: weatherData
    });
  }

  // Create application update notification
  createAppUpdateNotification(version, updateMessage) {
    return this.addNotification({
      title: "Application Update",
      message: `New update available (v${version}): ${updateMessage}`,
      type: "update",
      priority: "medium",
      fromUser: "System",
      targetRole: "all", // For all users
      status: "active",
      version: version
    });
  }

  // Get notifications for specific user role
  getNotificationsForRole(userRole, userEmail = null, userName = null) {
    // First, remove any duplicate worker notifications before filtering
    if (userRole === "worker") {
      this.removeDuplicateWorkerNotifications();
    }
    
    return this.notifications.filter(notification => {
      // If notification has targetRole
      if (notification.targetRole) {
        // Check if it's for all users
        if (notification.targetRole === "all") return true;
        
        // For worker role, check if notification is specifically for this worker
        if (userRole === "worker" && notification.targetRole === "worker") {
          // If notification has a targetUser, only show it to that specific worker
          if (notification.targetUser && userName) {
            const notificationName = notification.targetUser.trim().toLowerCase();
            const userNormalizedName = userName.trim().toLowerCase();
            // Check if names match exactly or if one contains the other
            return notificationName === userNormalizedName || 
                   notificationName.includes(userNormalizedName) || 
                   userNormalizedName.includes(notificationName);
          }
          // If no targetUser specified, show to all workers (backward compatibility)
          return true;
        }
        
        // For other roles, check if it matches user role
        if (notification.targetRole === userRole) return true;
        
        // Check if it's for specific user (for non-worker roles)
        if (notification.targetUser && userName) {
          return notification.targetUser.toLowerCase().includes(userName.toLowerCase());
        }
        
        return false;
      }
      
      // If no targetRole specified, show to all (backward compatibility)
      return true;
    });
  }

  // Remove duplicate worker notifications (keep only one per worker per payroll date)
  removeDuplicateWorkerNotifications() {
    const workerNotifications = this.notifications.filter(n => 
      n.type === 'payroll' && n.targetRole === 'worker' && n.status === 'available'
    );
    
    if (workerNotifications.length === 0) return;
    
    // Group by worker name and payroll date
    const seen = new Map();
    const toRemove = [];
    
    workerNotifications.forEach(notification => {
      const workerName = (notification.targetUser || '').trim().toLowerCase();
      const payrollDate = notification.payrollDate || '';
      const key = `${workerName}_${payrollDate}`;
      
      if (seen.has(key)) {
        // This is a duplicate - mark for removal
        toRemove.push(notification.id);
      } else {
        seen.set(key, notification);
      }
    });
    
    // Remove duplicates, keeping the first (most recent) one
    if (toRemove.length > 0) {
      this.notifications = this.notifications.filter(n => !toRemove.includes(n.id));
      this.saveNotifications();
      this.notifyListeners();
      console.log(`Removed ${toRemove.length} duplicate worker payroll notifications`);
    }
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

