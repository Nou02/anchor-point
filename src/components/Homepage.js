import React, { useState, useEffect, useMemo } from 'react';
import './Homepage.css';
import Scheduling from './Scheduling';
import Report from './Report';
import Payroll from './Payroll';
import Sidebar from './Sidebar';
import InfoContent from './InfoContent';
import NotificationContent from './NotificationContent';
import Analytics from './Analytics';
import { getAuth } from 'firebase/auth';
import { doc, getDoc, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '../firebase/config';
import notificationService from '../services/notificationService';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, BarChart, Bar } from 'recharts';
// Using dynamic import for xlsx to handle potential module resolution issues
let XLSX;

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
  const [currentTime, setCurrentTime] = useState(new Date());
  const [upcomingEvents, setUpcomingEvents] = useState([]);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [vesselData, setVesselData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [registeredUsers, setRegisteredUsers] = useState([]);

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

  // Working watch - update time every second
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Set up notification listener
  useEffect(() => {
    const handleNotificationUpdate = (notifications, unreadCount) => {
      console.log('Notification update received:', { notifications, unreadCount });
      setHasUnreadNotifications(unreadCount > 0);
    };

    // Add listener
    notificationService.addListener(handleNotificationUpdate);
    
    // Check initial state
    setHasUnreadNotifications(notificationService.hasUnreadNotifications());

    return () => {
      notificationService.removeListener(handleNotificationUpdate);
    };
  }, []);

  // Fetch registered users from Firestore
  useEffect(() => {
    const fetchRegisteredUsers = async () => {
      try {
        const usersRef = collection(db, 'users');
        const querySnapshot = await getDocs(usersRef);
        
        const users = [];
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          users.push({
            id: doc.id,
            fullName: userData.fullName || 'Unknown User',
            role: userData.role || 'Employee',
            email: userData.email || '',
            initial: (userData.fullName || userData.email || 'U').charAt(0).toUpperCase()
          });
        });
        
        // Sort users by full name
        users.sort((a, b) => a.fullName.localeCompare(b.fullName));
        setRegisteredUsers(users);
      } catch (error) {
        console.error('Error fetching registered users:', error);
        // Fallback to default users if there's an error
        setRegisteredUsers([
          {
            id: 'default1',
            fullName: 'Alice Margaretha Santos',
            role: 'Senior Supervisor',
            email: 'alice@anchorpoint.com',
            initial: 'A'
          },
          {
            id: 'default2',
            fullName: 'Carla Dela Peña',
            role: 'Scheduler',
            email: 'carla@anchorpoint.com',
            initial: 'C'
          },
          {
            id: 'default3',
            fullName: 'Bryan Matthew Cruz',
            role: 'Dock Worker',
            email: 'bryan@anchorpoint.com',
            initial: 'B'
          },
          {
            id: 'default4',
            fullName: 'David Emmanuel Reyes',
            role: 'Mechanic',
            email: 'david@anchorpoint.com',
            initial: 'D'
          }
        ]);
      }
    };

    fetchRegisteredUsers();
  }, []);

  // Set initial menu for workers when user profile is loaded
  useEffect(() => {
    if (userProfile) {
      const displayName = userProfile.fullName || '';
      const isCarla = displayName === 'Carla Dela Peña' || 
                     displayName === 'Carla' ||
                     (displayName && displayName.toLowerCase().includes('carla'));
      const isAlice = displayName === 'Alice Margaretha Santos' || 
                     displayName === 'Alice' ||
                     (displayName && displayName.toLowerCase().includes('alice'));
      const isWorker = !isCarla && !isAlice;
      
      // If worker and current menu is 'home', set to 'scheduling'
      if (isWorker && activeMenu === 'home') {
        setActiveMenu('scheduling');
      }
    }
  }, [userProfile, activeMenu]);

  // Fetch vessel data from Excel file
  useEffect(() => {
    const fetchVesselData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Dynamically import xlsx library
        if (!XLSX) {
          XLSX = await import('xlsx');
        }
        
        // Fetch Excel file from public folder
        const response = await fetch('/Vessels Log.xlsx');
        if (!response.ok) throw new Error('Failed to fetch Excel file');
        
        const arrayBuffer = await response.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: 'array' });
        
        // Process all sheets and combine data
        let allMappedRows = [];
        
        for (const sheetName of workbook.SheetNames) {
          const worksheet = workbook.Sheets[sheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
          
          // Find the header row
          let headerRowIndex = 0;
          for (let i = 0; i < jsonData.length; i++) {
            if (jsonData[i] && jsonData[i].includes('Vessel')) {
              headerRowIndex = i;
              break;
            }
          }
          
          const headers = jsonData[headerRowIndex];
          const dataRows = jsonData.slice(headerRowIndex + 1);
          
          // Convert to objects with proper column mapping
          const mappedRows = dataRows.map(row => {
            const obj = {};
            
            // Handle different sheet structures
            if (sheetName === '2023') {
              obj['No'] = row[0] || '';
              obj['Vessel'] = row[1] || '';
              obj['Service'] = 'W/MOORING BUOY';
              obj['Control Number'] = row[2] || '';
              obj['Voyage Number'] = row[3] || '';
              obj['Date'] = row[4] || '';
            } else if (sheetName === '2024') {
              obj['No'] = row[0] || '';
              obj['Vessel'] = row[1] || '';
              obj['Service'] = 'W/MOORING BUOY';
              obj['Control Number'] = row[3] || '';
              obj['Voyage Number'] = row[4] || '';
              obj['Date'] = row[5] || '';
            } else {
              obj['No'] = row[0] || '';
              obj['Vessel'] = row[1] || '';
              obj['Service'] = row[2] || '';
              obj['Control Number'] = row[3] || '';
              obj['Voyage Number'] = row[4] || '';
              obj['Date'] = row[5] || '';
            }
            return obj;
          });
          
          allMappedRows = allMappedRows.concat(mappedRows);
        }
        
        setVesselData(allMappedRows);
      } catch (e) {
        setError(e.message);
        setVesselData([]);
      } finally {
        setLoading(false);
      }
    };
    
    fetchVesselData();
  }, []);

  // Process vessel data for analytics
  const analyticsData = useMemo(() => {
    const normalizeDate = (v) => {
      if (!v) return null;
      if (v instanceof Date) return v;
      const tryParse = new Date(v);
      if (!isNaN(tryParse.getTime())) return tryParse;
      return null;
    };

    const parsed = vesselData.map(row => {
      const dateVal = row['Date'] || '';
      const dt = normalizeDate(dateVal);
      if (!dt) return null;
      
      return {
        date: dt,
        vessel: row['Vessel'] || 'Unknown',
        service: row['Service'] || '',
        controlNumber: row['Control Number'] || '',
        voyageNumber: row['Voyage Number'] || ''
      };
    }).filter(Boolean);

    // Calculate analytics
    const byYearMap = new Map();
    const byQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const byMonthMap = new Map();
    const vesselStats = new Map();
    const vesselTypeStats = new Map();
    const dailyStats = new Map();

    const quarterOf = (m) => {
      if ([0,1,2].includes(m)) return 'Q1';
      if ([3,4,5].includes(m)) return 'Q2';
      if ([6,7,8].includes(m)) return 'Q3';
      return 'Q4';
    };

    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    for (const item of parsed) {
      const m = item.date.getMonth();
      const y = item.date.getFullYear();
      const dayKey = item.date.toDateString();

      byQuarter[quarterOf(m)]++;
      byYearMap.set(y, (byYearMap.get(y) || 0) + 1);
      byMonthMap.set(m, (byMonthMap.get(m) || 0) + 1);
      dailyStats.set(dayKey, (dailyStats.get(dayKey) || 0) + 1);
      
      if (item.vessel) {
        const currentStats = vesselStats.get(item.vessel) || { count: 0, latestDate: new Date(0) };
        currentStats.count++;
        if (item.date > currentStats.latestDate) {
          currentStats.latestDate = item.date;
        }
        vesselStats.set(item.vessel, currentStats);
      }

      // Categorize vessel types based on vessel name patterns
      const vesselName = (item.vessel || '').toLowerCase();
      let vesselType = 'General Cargo';
      if (vesselName.includes('container') || vesselName.includes('cargo')) vesselType = 'Container/Cargo';
      else if (vesselName.includes('tanker') || vesselName.includes('oil')) vesselType = 'Tanker';
      else if (vesselName.includes('bulk') || vesselName.includes('carrier')) vesselType = 'Bulk Carrier';
      else if (vesselName.includes('ferry') || vesselName.includes('passenger')) vesselType = 'Passenger';
      
      vesselTypeStats.set(vesselType, (vesselTypeStats.get(vesselType) || 0) + 1);
    }

    const byYear = Array.from(byYearMap.entries())
      .sort((a,b) => a[0] - b[0])
      .map(([year, count]) => ({ year, count }));

    const byMonth = Array.from(byMonthMap.entries())
      .sort((a,b) => a[0] - b[0])
      .map(([month, count]) => ({ month: monthNames[month], count }));

    const topVessels = Array.from(vesselStats.entries())
      .map(([name, stats]) => ({ name, count: stats.count, latestDate: stats.latestDate }))
      .sort((a, b) => {
        if (b.latestDate.getTime() !== a.latestDate.getTime()) {
          return b.latestDate.getTime() - a.latestDate.getTime();
        }
        return b.count - a.count;
      })
      .slice(0, 5);

    const vesselTypes = Array.from(vesselTypeStats.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const peakQuarter = Object.keys(byQuarter).reduce((a, b) => 
      byQuarter[a] > byQuarter[b] ? a : b
    );

    const bestMonth = byMonth.reduce((a, b) => a.count > b.count ? a : b, { month: 'Jan', count: 0 });

    const dailyOperations = Array.from(dailyStats.values());
    const avgOperationsPerDay = Math.round(dailyOperations.reduce((a, b) => a + b, 0) / dailyOperations.length) || 0;
    const peakDayOperations = Math.max(...dailyOperations, 0);
    const efficiencyRate = Math.round((avgOperationsPerDay / Math.max(peakDayOperations, 1)) * 100);

    return { 
      byYear, 
      byQuarter, 
      byMonth,
      topVessels, 
      vesselTypes,
      peakQuarter, 
      bestMonth,
      totalOperations: parsed.length,
      totalVessels: vesselStats.size,
      avgOperationsPerDay,
      peakDayOperations,
      efficiencyRate
    };
  }, [vesselData]);

  // Fetch upcoming events from appointments
  useEffect(() => {
    const fetchUpcomingEvents = async () => {
      try {
        const appointmentsRef = collection(db, 'appointments');
        const q = query(appointmentsRef, orderBy('date', 'asc'));
        const querySnapshot = await getDocs(q);
        
        const events = [];
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          const appointmentDate = new Date(data.date);
          appointmentDate.setHours(0, 0, 0, 0);
          
          // Get events for the next 7 days or past completed events
          const daysDiff = Math.ceil((appointmentDate - today) / (1000 * 60 * 60 * 24));
          
          if (daysDiff >= 0 && daysDiff <= 7) {
            // Future events
            events.push({
              id: doc.id,
              title: data.title || 'Appointment',
              date: data.date,
              time: data.time || 'All Day',
              status: 'upcoming',
              isCompleted: false
            });
          } else if (daysDiff < 0 && daysDiff >= -7) {
            // Past events (last 7 days)
            events.push({
              id: doc.id,
              title: data.title || 'Appointment',
              date: data.date,
              time: data.time || 'All Day',
              status: 'completed',
              isCompleted: true
            });
          }
        });
        
        // Sort by date and limit to 5 events
        events.sort((a, b) => new Date(a.date) - new Date(b.date));
        setUpcomingEvents(events.slice(0, 5));
        
      } catch (error) {
        console.error('Error fetching upcoming events:', error);
        // Fallback to default events if no appointments found
        setUpcomingEvents([
          {
            id: 'default1',
            title: 'Vessel Docking',
            date: new Date().toISOString().split('T')[0],
            time: '2:00 PM',
            status: 'upcoming',
            isCompleted: false
          },
          {
            id: 'default2',
            title: 'Crew Briefing',
            date: new Date().toISOString().split('T')[0],
            time: '3:30 PM',
            status: 'upcoming',
            isCompleted: false
          },
          {
            id: 'default3',
            title: 'Maintenance Check',
            date: new Date().toISOString().split('T')[0],
            time: '5:00 PM',
            status: 'upcoming',
            isCompleted: false
          }
        ]);
      }
    };

    fetchUpcomingEvents();
  }, []);

  const handleInfoClick = () => {
    setShowInfo(true);
    setShowNotifications(false);
  };

  const handleNotificationClick = () => {
    setShowNotifications(true);
    setShowInfo(false);
    // Mark all notifications as read when opening notifications
    notificationService.markAllAsRead();
  };

  // Test function for notifications (temporary)
  const testNotification = () => {
    console.log('Creating test notification');
    notificationService.createTestNotification();
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
      // Workers: Only Scheduling and Payroll (no Home, no Reports, no Analytics)
      return [
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
      // Redirect to first available menu item if user doesn't have access to the requested section
      const firstMenuItem = menuItems.length > 0 ? menuItems[0].id : 'home';
      setActiveMenu(firstMenuItem);
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
          <div className="dashboard-container">
            {/* Background Video with Semi-Transparent Overlay */}
            <div className="background-video-container">
              <video autoPlay loop muted playsInline className="background-video">
                <source src={require('../assets/lnding.mp4')} type="video/mp4" />
                Your browser does not support the video tag.
              </video>
              <div className="video-overlay"></div>
            </div>

            {/* Header Section */}
            <div className="dashboard-header">
              <div className="header-content">
                <div className="header-text">
                  <h1 className="welcome-title">Welcome to Anchor Point</h1>
                  <h2 className="system-subtitle">Maritime Operation Management System</h2>
                </div>
                <div className="header-time-date">
                  <div className="current-time-display">
                    {currentTime.toLocaleTimeString('en-US', { 
                      hour: '2-digit', 
                      minute: '2-digit',
                      second: '2-digit',
                      hour12: true 
                    })}
                  </div>
                  <div className="current-date-display">
                    {currentTime.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </div>
                </div>
              </div>
            </div>

            {/* Analytics Dashboard Container */}
            <div className="analytics-dashboard-container">
              {loading ? (
                <div className="loading-container">
                  <div className="loading-spinner"></div>
                  <p>Loading vessel data...</p>
                </div>
              ) : error ? (
                <div className="error-container">
                  <p>Error loading data: {error}</p>
                </div>
              ) : (
                <div className="dashboard-layout">
                  {/* Analytics Dashboard Content */}
                  <div className="dashboard-container">
                    <h2 className="dashboard-main-title">Analytics Dashboard</h2>
                    
                    <div className="dashboard-sections">
                      {/* Yearly Growth - 2D Line Chart */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Yearly Growth</h3>
                        <div className="chart-container">
                          <LineChart width={400} height={250} data={analyticsData.byYear}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="year" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="count" 
                              stroke="#2F3B70" 
                              strokeWidth={3}
                              name="Vessel Operations"
                            />
                          </LineChart>
                        </div>
                      </div>

                      {/* Peak Quarter - 3D Column Chart */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Peak Quarter</h3>
                        <div className="chart-container">
                          <BarChart width={400} height={250} data={[
                            { quarter: 'Q1', count: analyticsData.byQuarter.Q1 },
                            { quarter: 'Q2', count: analyticsData.byQuarter.Q2 },
                            { quarter: 'Q3', count: analyticsData.byQuarter.Q3 },
                            { quarter: 'Q4', count: analyticsData.byQuarter.Q4 }
                          ]}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="quarter" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar 
                              dataKey="count" 
                              fill="#4A90E2" 
                              name="Vessel Operations"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </div>
                        <div className="peak-quarter-info">
                          <p><strong>Peak Quarter:</strong> {analyticsData.peakQuarter}</p>
                          <p><strong>Operations:</strong> {analyticsData.byQuarter[analyticsData.peakQuarter]}</p>
                        </div>
                      </div>

                      {/* Top Vessels List */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Top Vessels</h3>
                        <div className="vessels-list">
                          {analyticsData.topVessels.map((vessel, index) => (
                            <div key={index} className="vessel-item">
                              <div className="vessel-rank">
                                <span className={`rank-number ${index === 0 ? 'top-vessel' : ''}`}>
                                  {index + 1}
                                </span>
                              </div>
                              <div className="vessel-info">
                                <div className="vessel-name">{vessel.name}</div>
                                <div className="vessel-count">{vessel.count} operations</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Monthly Performance */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Monthly Performance</h3>
                        <div className="chart-container">
                          <BarChart width={280} height={180} data={analyticsData.byMonth || []}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="month" />
                            <YAxis />
                            <Tooltip />
                            <Legend />
                            <Bar 
                              dataKey="count" 
                              fill="#FF6B6B" 
                              name="Operations"
                              radius={[4, 4, 0, 0]}
                            />
                          </BarChart>
                        </div>
                        <div className="performance-summary">
                          <p><strong>Best Month:</strong> {analyticsData.bestMonth?.month || 'N/A'}</p>
                          <p><strong>Total Operations:</strong> {analyticsData.totalOperations}</p>
                        </div>
                      </div>

                      {/* Peak Performance */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Peak Performance</h3>
                        <p className="section-subtitle">Operational Insights</p>
                        <div className="peak-performance-metrics">
                          <div className="performance-item">
                            <div className="performance-label">Busiest Month</div>
                            <div className="performance-value">
                              <span className="performance-month">{analyticsData.bestMonth?.month || 'Aug'}</span>
                              <span className="performance-count">{analyticsData.bestMonth?.count || analyticsData.peakDayOperations || 48} vessels</span>
                            </div>
                          </div>
                          <div className="performance-item">
                            <div className="performance-label">Peak Day</div>
                            <div className="performance-value">
                              <span className="performance-day">Thursday</span>
                              <span className="performance-count">{analyticsData.peakDayOperations || 53} vessels</span>
                            </div>
                          </div>
                          <div className="performance-item">
                            <div className="performance-label">Peak Quarter</div>
                            <div className="performance-value">
                              <span className="performance-quarter">{analyticsData.peakQuarter || 'Q3'}</span>
                              <span className="performance-count">{analyticsData.byQuarter[analyticsData.peakQuarter] || 122} vessels</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Next Quarter Forecast */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Next Quarter Forecast</h3>
                        <p className="section-subtitle">Predictive Analytics</p>
                        <div className="forecast-content">
                          <div className="forecast-metrics">
                            <div className="forecast-item">
                              <div className="forecast-label">Projected Operations</div>
                              <div className="forecast-value">{Math.round((analyticsData.byQuarter[analyticsData.peakQuarter] || 122) * 1.15)}</div>
                              <div className="forecast-trend">+15% from current quarter</div>
                            </div>
                            <div className="forecast-item">
                              <div className="forecast-label">Expected Peak Days</div>
                              <div className="forecast-value">{Math.round((analyticsData.peakDayOperations || 53) * 1.1)}</div>
                              <div className="forecast-trend">+10% daily capacity</div>
                            </div>
                            <div className="forecast-item">
                              <div className="forecast-label">Resource Utilization</div>
                              <div className="forecast-value">{Math.min(100, Math.round((analyticsData.efficiencyRate || 85) * 1.05))}%</div>
                              <div className="forecast-trend">Optimized efficiency</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* System Capabilities Container - New Dedicated Container */}
            <div className="system-capabilities-main-container">
              <div className="system-capabilities-content">
                <h2 className="capabilities-title">System Capabilities</h2>
                <div className="capabilities-grid">
                  <div className="capability-card">
                    <div className="capability-icon">
                      <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/>
                      </svg>
                    </div>
                    <h3 className="capability-title">Ship Schedules</h3>
                    <p className="capability-description">
                      View and manage vessel schedules, docking times, and port operations with real-time updates and notifications.
                    </p>
                    <div className="capability-features">
                      <span className="feature-tag">Vessel Tracking</span>
                      <span className="feature-tag">Docking Times</span>
                      <span className="feature-tag">Real-time Updates</span>
                    </div>
                  </div>

                  <div className="capability-card">
                    <div className="capability-icon">
                      <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M16 4c0-1.11.89-2 2-2s2 .89 2 2-.89 2-2 2-2-.89-2-2zm4 18v-6h2.5l-2.54-7.63A1.5 1.5 0 0 0 18.54 8H16c-.8 0-1.54.37-2.01.99L12 11l-1.99-2.01A2.5 2.5 0 0 0 8 8H5.46c-.8 0-1.54.37-2.01.99L1 14.37V22h2v-6h2.5l2.54-7.63A1.5 1.5 0 0 1 9.46 8H12c.8 0 1.54.37 2.01.99L16 11l1.99-2.01A2.5 2.5 0 0 1 20.54 8H22c.8 0 1.54.37 2.01.99L26.5 16H24v6h2z"/>
                      </svg>
                    </div>
                    <h3 className="capability-title">Crew Assignments</h3>
                    <p className="capability-description">
                      Manage crew availability, assignments, and scheduling with comprehensive workforce management tools.
                    </p>
                    <div className="capability-features">
                      <span className="feature-tag">Crew Management</span>
                      <span className="feature-tag">Scheduling</span>
                      <span className="feature-tag">Workforce Tools</span>
                    </div>
                  </div>

                  <div className="capability-card">
                    <div className="capability-icon">
                      <svg width="48" height="48" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
                      </svg>
                    </div>
                    <h3 className="capability-title">Docking Operations</h3>
                    <p className="capability-description">
                      Coordinate vessel docking, mooring operations, and port logistics with precision and efficiency.
                    </p>
                    <div className="capability-features">
                      <span className="feature-tag">Vessel Docking</span>
                      <span className="feature-tag">Mooring Operations</span>
                      <span className="feature-tag">Port Logistics</span>
                    </div>
                  </div>
                </div>
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
        hasUnreadNotifications={hasUnreadNotifications}
      />
      <div className="homepage-main-content">
        {renderContent()}
      </div>
    </div>
  );
};

export default Homepage;
