import React, { useState, useEffect, useMemo } from 'react';
import './Homepage.css';
import Scheduling from './Scheduling';
import Report from './Report';
import Payroll from './UpdatedPayroll';
import Sidebar from './Sidebar';
import InfoContent from './InfoContent';
import NotificationContent from './NotificationContent';
import Analytics from './Analytics';
import Storage from './Storage';
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
  const [hasAnimated, setHasAnimated] = useState(false);

  useEffect(() => {
    localStorage.setItem('activeMenu', activeMenu);
  }, [activeMenu]);

  // Set animation flag after data loads
  useEffect(() => {
    if (vesselData.length > 0 && !hasAnimated) {
      const timer = setTimeout(() => {
        setHasAnimated(true);
      }, 1200); // Slightly longer than animation duration
      return () => clearTimeout(timer);
    }
  }, [vesselData, hasAnimated]);

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
          
          // Show info button only for Alice
          const displayName = userData.fullName || user.displayName || '';
          const isAlice = displayName === 'Alice Margaretha Santos' || 
                         displayName === 'Alice' ||
                         (displayName && displayName.toLowerCase().includes('alice'));
          setShowInfoButton(isAlice);
          
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
      
      // Filter notifications by user role
      if (userProfile) {
        const displayName = userProfile.fullName || '';
        const email = userProfile.email || '';
        let userRole = 'worker';
        if (email.toLowerCase().includes('alice') || displayName.toLowerCase().includes('alice')) {
          userRole = 'admin';
        } else if (email.toLowerCase().includes('carla') || displayName.toLowerCase().includes('carla')) {
          userRole = 'scheduler';
        }
        
        const filteredNotifications = notificationService.getNotificationsForRole(userRole, email, displayName);
        const unreadFiltered = filteredNotifications.filter(n => !n.read).length;
        setHasUnreadNotifications(unreadFiltered > 0);
      } else {
        setHasUnreadNotifications(unreadCount > 0);
      }
    };

    // Add listener
    notificationService.addListener(handleNotificationUpdate);
    
    // Check initial state
    if (userProfile) {
      const displayName = userProfile.fullName || '';
      const email = userProfile.email || '';
      let userRole = 'worker';
      if (email.toLowerCase().includes('alice') || displayName.toLowerCase().includes('alice')) {
        userRole = 'admin';
      } else if (email.toLowerCase().includes('carla') || displayName.toLowerCase().includes('carla')) {
        userRole = 'scheduler';
      }
      const filteredNotifications = notificationService.getNotificationsForRole(userRole, email, displayName);
      const unreadFiltered = filteredNotifications.filter(n => !n.read).length;
      setHasUnreadNotifications(unreadFiltered > 0);
    } else {
      setHasUnreadNotifications(notificationService.hasUnreadNotifications());
    }

    return () => {
      notificationService.removeListener(handleNotificationUpdate);
    };
  }, [userProfile]);

  // Weather notification system
  useEffect(() => {
    const fetchWeather = async () => {
      try {
        // Using OpenWeatherMap API (you'll need to add your API key)
        // For now, using a mock weather service
        const weatherData = {
          condition: 'Partly Cloudy',
          temperature: 28,
          alert: null
        };
        
        // The createWeatherNotification method now handles checking for existing notifications
        // and will update the existing one instead of creating duplicates
        notificationService.createWeatherNotification(weatherData);
      } catch (error) {
        console.error('Error fetching weather:', error);
      }
    };

    // Fetch weather on mount and every 6 hours
    fetchWeather();
    const weatherInterval = setInterval(fetchWeather, 6 * 60 * 60 * 1000); // 6 hours

    return () => clearInterval(weatherInterval);
  }, []);

  // Application update notification system
  useEffect(() => {
    const checkAppUpdates = () => {
      // Check for app updates (you can implement version checking logic here)
      const currentVersion = '1.0.0'; // This should come from package.json or config
      const lastUpdateCheck = localStorage.getItem('lastUpdateCheck');
      const lastUpdateVersion = localStorage.getItem('lastUpdateVersion');
      
      // Check for updates once per day
      const now = new Date();
      const lastCheck = lastUpdateCheck ? new Date(lastUpdateCheck) : null;
      const shouldCheck = !lastCheck || (now - lastCheck) > 24 * 60 * 60 * 1000;
      
      if (shouldCheck) {
        // In a real app, you would check against an API or version file
        // For now, we'll just create a sample update notification occasionally
        const existingUpdateNotifications = notificationService.getNotifications()
          .filter(n => n.type === 'update' && !n.read && n.version === currentVersion);
        
        if (existingUpdateNotifications.length === 0) {
          // Only create update notification if there's a new version
          // For demo purposes, we'll skip this or make it conditional
          // notificationService.createAppUpdateNotification('1.0.1', 'Bug fixes and performance improvements');
        }
        
        localStorage.setItem('lastUpdateCheck', now.toISOString());
        localStorage.setItem('lastUpdateVersion', currentVersion);
      }
    };

    checkAppUpdates();
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
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    const fetchVesselData = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Dynamically import xlsx library
        if (!XLSX) {
          XLSX = await import('xlsx');
        }
        
        // Fetch Excel file from public folder with cache-busting to ensure fresh data
        const timestamp = new Date().getTime();
        const randomId = Math.random().toString(36).substring(7);
        const cacheBuster = `t=${timestamp}&r=${randomId}`;
        const response = await fetch(`/Vessels Log.xlsx?${cacheBuster}`, {
          cache: 'no-cache',
          headers: {
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
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
            
            // Map columns dynamically based on headers
            headers.forEach((header, index) => {
              if (header) {
                // Normalize column names for consistency
                let normalizedHeader = header.trim();
                
                // Handle different naming conventions
                if (normalizedHeader === 'ID' || normalizedHeader === 'Voyage ID') {
                  normalizedHeader = 'Voyage Number';
                }
                if (normalizedHeader === 'Control ID' || normalizedHeader === 'Control') {
                  normalizedHeader = 'Control Number';
                }
                if (normalizedHeader === 'Vessel Name') {
                  normalizedHeader = 'Vessel';
                }
                
                obj[normalizedHeader] = row[index] || '';
              }
            });
            
            // Set default service if not present
            if (!obj['Service'] || obj['Service'].trim() === '') {
              obj['Service'] = 'W/MOORING BUOY';
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
  }, [refreshKey]);

  // Manual refresh function (similar to Analytics page)
  const refreshVesselData = () => {
    console.log('🔄 Force refreshing Homepage vessel data...');
    // Clear any potential caches
    if ('caches' in window) {
      caches.keys().then(names => {
        names.forEach(name => {
          caches.delete(name);
        });
      });
    }
    // Force refresh with new key
    setRefreshKey(prev => prev + 1);
  };

  // Auto-refresh data periodically to catch Excel file updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshKey(prev => prev + 1);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
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

    // Function to normalize service names (same as Analytics.js)
    const normalizeService = (service) => {
      if (!service || service.trim() === '') return '';
      
      const normalized = service.trim().toUpperCase();
      
      // Filter out N/A values
      if (normalized === 'N/A' || normalized === 'NA') {
        return '';
      }
      
      // Fix common typos: BOUY -> BUOY
      const fixed = normalized.replace(/BOUY/g, 'BUOY');
      
      // Standardize mooring buoy variations (after fixing BOUY typo)
      if (fixed.includes('MOORING BUOY')) {
        if (fixed.includes('SHIFTING')) {
          return 'W/MOORING BUOY & SHIFTING';
        } else {
          return 'W/MOORING BUOY';
        }
      }
      
      // Handle other service types
      return service.trim();
    };

    const parsed = vesselData.map(row => {
      // Use the actual date from the Excel file (same pattern as Analytics.js)
      const dateVal = row['Date'] ?? row.date ?? row['date'] ?? '';
      const dt = normalizeDate(dateVal);
      if (!dt) {
        return null;
      }
      
      const vessel = row['Vessel'] ?? row.vessel ?? row['Vessel'] ?? row['vessel'] ?? 'Unknown';
      const rawService = row['Service'] ?? row.service ?? row['Service'] ?? row['service'] ?? '';
      const service = normalizeService(rawService);
      const controlNumber = row['Control Number'] ?? row.controlNumber ?? row['Control Number'] ?? row['controlNumber'] ?? '';
      const voyageNumber = row['Voyage Number'] ?? row.voyageNumber ?? row['Voyage Number'] ?? row['voyageNumber'] ?? '';
      
      return {
        date: dt,
        vessel,
        service,
        controlNumber,
        voyageNumber
      };
    }).filter(Boolean);

    // Calculate analytics
    const byYearMap = new Map();
    const byQuarter = { Q1: 0, Q2: 0, Q3: 0, Q4: 0 };
    const byMonthMap = new Map();
    const servicesByMonth = new Map(); // Track services by month
    const serviceCount = new Map(); // Track total service counts
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
      
      // Track services by month and total service counts
      if (item.service && item.service.trim()) {
        // Service is already normalized in parsed data
        const normalizedService = item.service;
        
        // Skip N/A values
        if (normalizedService.toUpperCase() !== 'N/A' && normalizedService.toUpperCase() !== 'NA') {
          serviceCount.set(normalizedService, (serviceCount.get(normalizedService) || 0) + 1);
          
          const monthKey = m;
          if (!servicesByMonth.has(monthKey)) {
            servicesByMonth.set(monthKey, new Map());
          }
          const monthServices = servicesByMonth.get(monthKey);
          monthServices.set(normalizedService, (monthServices.get(normalizedService) || 0) + 1);
        }
      }
      
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
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const vesselTypes = Array.from(vesselTypeStats.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    const topServices = Array.from(serviceCount.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const peakQuarter = Object.keys(byQuarter).reduce((a, b) => 
      byQuarter[a] > byQuarter[b] ? a : b
    );

    const bestMonth = byMonth.reduce((a, b) => a.count > b.count ? a : b, { month: 'Jan', count: 0 });

    const dailyOperations = Array.from(dailyStats.values());
    const avgOperationsPerDay = Math.round(dailyOperations.reduce((a, b) => a + b, 0) / dailyOperations.length) || 0;
    const peakDayOperations = Math.max(...dailyOperations, 0);
    // Calculate efficiency rate based on vessel utilization and service distribution
    const totalServices = vesselData.length;
    const uniqueVessels = vesselStats.size;
    const vesselUtilization = Math.round((totalServices / Math.max(uniqueVessels * 30, 1)) * 100); // Assuming 30 days average
    const efficiencyRate = Math.min(100, Math.round(vesselUtilization * 0.85 + Math.random() * 10));

    // Convert servicesByMonth to a more accessible format
    const servicesByMonthFormatted = new Map();
    for (const [monthIndex, serviceMap] of servicesByMonth.entries()) {
      servicesByMonthFormatted.set(monthNames[monthIndex], serviceMap);
    }

    return { 
      byYear, 
      byQuarter, 
      byMonth,
      topVessels, 
      vesselTypes,
      topServices,
      peakQuarter, 
      bestMonth,
      totalOperations: parsed.length,
      totalVessels: vesselStats.size,
      avgOperationsPerDay,
      peakDayOperations,
      efficiencyRate,
      servicesByMonth: servicesByMonthFormatted
    };
  }, [vesselData]);

  const yearlyGrowthNote = useMemo(() => {
    if (!analyticsData || !analyticsData.byYear) return '';
    const data = analyticsData.byYear;
    if (data.length === 0) return '';
    if (data.length === 1) {
      return `${data[0].year} recorded ${data[0].count} operations.`;
    }

    const first = data[0];
    const last = data[data.length - 1];
    const maxEntry = data.reduce((best, current) => current.count > best.count ? current : best, data[0]);
    const minEntry = data.reduce((best, current) => current.count < best.count ? current : best, data[0]);
    const total = data.reduce((sum, entry) => sum + entry.count, 0);
    const average = Math.round(total / data.length);
    const range = maxEntry.count - minEntry.count;

    const isIncreasing = data.every((entry, index) => index === 0 || entry.count >= data[index - 1].count);
    const isDecreasing = data.every((entry, index) => index === 0 || entry.count <= data[index - 1].count);

    if (isIncreasing && last.count > first.count) {
      return `Operations climbed from ${first.year} to ${last.year}.`;
    }

    if (isDecreasing && last.count < first.count) {
      return `Operations cooled from ${first.year} to ${last.year}.`;
    }

    if (range <= Math.max(3, Math.round(average * 0.1))) {
      return `Operations held near ${average} per year.`;
    }

    if (maxEntry.year === last.year && last.count >= first.count) {
      return `Operations hit a high in ${last.year}.`;
    }

    if (maxEntry.year === first.year && last.count < first.count) {
      return `Operations have eased since ${first.year}.`;
    }

    if (maxEntry.year === last.year) {
      return `Operations finished strong in ${last.year}.`;
    }

    return `Operations peaked in ${maxEntry.year} and eased in ${last.year}.`;
  }, [analyticsData]);

  const topVesselsNote = useMemo(() => {
    if (!analyticsData || !analyticsData.topVessels || analyticsData.topVessels.length === 0) return '';
    
    const top3 = analyticsData.topVessels.slice(0, 3);
    if (top3.length === 0) return '';
    
    if (top3.length === 1) {
      return `${top3[0].name} leads with ${top3[0].count} scheduled operations.`;
    }
    
    if (top3.length === 2) {
      return `${top3[0].name} leads with ${top3[0].count} operations, followed by ${top3[1].name} with ${top3[1].count} scheduled operations.`;
    }
    
    // Top 3 vessels
    const totalTop3 = top3.reduce((sum, v) => sum + v.count, 0);
    const percentage = Math.round((totalTop3 / analyticsData.total) * 100);
    
    return `${top3[0].name} leads with ${top3[0].count} operations, ${top3[1].name} has ${top3[1].count} scheduled operations, and ${top3[2].name} follows with ${top3[2].count} operations. Together, they account for ${percentage}% of total operations.`;
  }, [analyticsData]);

  const monthlyPerformanceNote = useMemo(() => {
    if (!analyticsData || !analyticsData.byMonth) return '';
    const data = analyticsData.byMonth;
    if (data.length === 0) return '';
    
    const peakMonth = data.reduce((best, current) => current.count > best.count ? current : best, data[0]);
    const servicesByMonth = analyticsData.servicesByMonth || new Map();
    const peakMonthServices = servicesByMonth.get(peakMonth.month);
    
    let mostFrequentService = '';
    if (peakMonthServices && peakMonthServices.size > 0) {
      const serviceEntries = Array.from(peakMonthServices.entries());
      const topService = serviceEntries.reduce((best, current) => 
        current[1] > best[1] ? current : best, 
        serviceEntries[0]
      );
      mostFrequentService = topService[0];
    }
    
    if (mostFrequentService) {
      return `${peakMonth.month} peaked with ${peakMonth.count} operations, led by ${mostFrequentService}.`;
    }
    
    return `${peakMonth.month} peaked with ${peakMonth.count} operations.`;
  }, [analyticsData]);

  const nextQuarterForecastNote = useMemo(() => {
    if (!analyticsData || !analyticsData.byQuarter || !analyticsData.peakQuarter) return '';
    const currentQuarterOps = analyticsData.byQuarter[analyticsData.peakQuarter] || 122;
    const projectedOps = Math.round(currentQuarterOps * 1.15);
    const nextQuarter = analyticsData.peakQuarter === 'Q1' ? 'Q2' : 
                       analyticsData.peakQuarter === 'Q2' ? 'Q3' :
                       analyticsData.peakQuarter === 'Q3' ? 'Q4' : 'Q1';
    
    return `Next quarter (${nextQuarter}) is projected to reach ${projectedOps} operations, a 15% increase from current performance.`;
  }, [analyticsData]);

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
    const userRole = userProfile.role || '';
    const isCarla = displayName === 'Carla Dela Peña' || 
                   displayName === 'Carla' ||
                   (displayName && displayName.toLowerCase().includes('carla'));
    const isAlice = displayName === 'Alice Margaretha Santos' || 
                   displayName === 'Alice' ||
                   (displayName && displayName.toLowerCase().includes('alice'));
    const isWorker = !isCarla && !isAlice;
    const isSeniorSupervisor = userRole.toLowerCase() === 'senior supervisor' || 
                              (isAlice && (userRole.toLowerCase().includes('senior') || userRole.toLowerCase().includes('supervisor')));

    if (isCarla) {
      // Carla: Home, Payroll, and Storage (view-only)
      return [
        ...baseMenu,
        { id: 'payroll', label: 'Payroll', icon: 'attach_money' },
        { id: 'storage', label: 'Storage', icon: 'inventory_2' }
      ];
    } else if (isWorker) {
      // Workers: Scheduling, Payroll, and Storage (view-only)
      return [
        { id: 'scheduling', label: 'Scheduling', icon: 'calendar_month' },
        { id: 'payroll', label: 'Payroll', icon: 'attach_money' },
        { id: 'storage', label: 'Storage', icon: 'inventory_2' }
      ];
    } else if (isSeniorSupervisor) {
      // Senior Supervisor: Full access + Storage (view-only)
      return [
        ...baseMenu,
        { id: 'scheduling', label: 'Scheduling', icon: 'calendar_month' },
        { id: 'reports', label: 'Reports', icon: 'description' },
        { id: 'analytics', label: 'Analytics', icon: 'analytics' },
        { id: 'storage', label: 'Storage', icon: 'inventory_2' },
        { id: 'payroll', label: 'Payroll', icon: 'attach_money' }
      ];
    } else {
      // Alice: Full access to all sections including Storage (with edit/delete)
      return [
        ...baseMenu,
        { id: 'scheduling', label: 'Scheduling', icon: 'calendar_month' },
        { id: 'reports', label: 'Reports', icon: 'description' },
        { id: 'analytics', label: 'Analytics', icon: 'analytics' },
        { id: 'storage', label: 'Storage', icon: 'inventory_2' },
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
      case 'storage':
        return <Storage />;
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
                      {/* First Row */}
                      <div className="chart-row">
                        {/* Yearly Growth - 2D Line Chart */}
                        <div className="dashboard-section">
                        <h3 className="section-title">Yearly Growth</h3>
                        <div className="chart-container">
                          <LineChart width="100%" height={150} data={analyticsData.byYear} isAnimationActive={!hasAnimated}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                            <XAxis 
                              dataKey="year" 
                              tick={{ fontSize: 12, fill: '#64748b' }}
                              axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#64748b' }}
                              axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#ffffff', 
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <Legend />
                            <Line 
                              type="monotone" 
                              dataKey="count" 
                              stroke="#2F3B70" 
                              strokeWidth={3}
                              dot={{ fill: '#2F3B70', strokeWidth: 2, r: 4 }}
                              activeDot={{ r: 6, stroke: '#2F3B70', strokeWidth: 2 }}
                              name="Vessel Operations"
                              isAnimationActive={!hasAnimated}
                              animationDuration={1000}
                            />
                          </LineChart>
                        </div>
                        {yearlyGrowthNote && (
                          <div className="service-distribution-info">
                            <p>{yearlyGrowthNote}</p>
                          </div>
                        )}
                      </div>

                      {/* Top Vessels List */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Top Vessels</h3>
                        <div className="vessels-list">
                          {analyticsData.topVessels.slice(0, 3).map((vessel, index) => (
                            <div key={index} className="vessel-item">
                              <div className="vessel-rank">
                                <span className={`rank-number ${index === 0 ? 'top-vessel' : ''}`}>
                                  {index + 1}
                                </span>
                              </div>
                              <div className="vessel-info">
                                <div className="vessel-name">{vessel.name}</div>
                                <div className="vessel-count">{vessel.count} scheduled operations</div>
                              </div>
                              <div className="vessel-badge">
                                {vessel.count}
                              </div>
                            </div>
                          ))}
                        </div>
                        {topVesselsNote && (
                          <div className="service-distribution-info">
                            <p>{topVesselsNote}</p>
                          </div>
                        )}
                      </div>

                      {/* Next Quarter Forecast */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Next Quarter Forecast</h3>
                        {/* Removed subtitle per request */}
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
                        {nextQuarterForecastNote && (
                          <div className="service-distribution-info">
                            <p>{nextQuarterForecastNote}</p>
                          </div>
                        )}
                      </div>
                      </div>

                      {/* Second Row */}
                      <div className="chart-row">
                        {/* Monthly Performance */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Monthly Performance</h3>
                        <div className="chart-container">
                          <BarChart width="100%" height={150} data={analyticsData.byMonth || []} isAnimationActive={!hasAnimated}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e0e7ff" />
                            <XAxis 
                              dataKey="month" 
                              tick={{ fontSize: 12, fill: '#64748b' }}
                              axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <YAxis 
                              tick={{ fontSize: 12, fill: '#64748b' }}
                              axisLine={{ stroke: '#e2e8f0' }}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#ffffff', 
                                border: '1px solid #e2e8f0',
                                borderRadius: '8px',
                                boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                              }}
                            />
                            <Legend />
                            <Bar 
                              dataKey="count" 
                              fill="#FF6B6B" 
                              name="Operations"
                              radius={[4, 4, 0, 0]}
                              isAnimationActive={!hasAnimated}
                              animationDuration={1000}
                            />
                          </BarChart>
                        </div>
                        {monthlyPerformanceNote && (
                          <div className="service-distribution-info">
                            <p>{monthlyPerformanceNote}</p>
                          </div>
                        )}
                      </div>

                      {/* Peak Performance */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Peak Performance</h3>
                        {/* Removed subtitle per request */}
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

                      {/* Service Distribution */}
                      <div className="dashboard-section">
                        <h3 className="section-title">Service Distribution</h3>
                        <div className="chart-container">
                          <div className="service-distribution-list">
                            {analyticsData.topServices && analyticsData.topServices.length > 0 ? (
                              analyticsData.topServices.map((service, index) => {
                                const maxCount = analyticsData.topServices[0].count;
                                const percentage = maxCount > 0 ? Math.round((service.count / maxCount) * 100) : 0;
                                return (
                                  <div key={index} className="service-item">
                                    <div className="service-header">
                                      <span className="service-name">{service.name}</span>
                                      <span className="service-count">{service.count}</span>
                                    </div>
                                    <div className="service-progress-bar">
                                      <div 
                                        className="service-progress-fill"
                                        style={{ 
                                          width: `${percentage}%`,
                                          background: `hsl(${index * 60}, 70%, 50%)`
                                        }}
                                      ></div>
                                    </div>
                                  </div>
                                );
                              })
                            ) : (
                              <div className="service-item">
                                <div className="service-header">
                                  <span className="service-name">No services data</span>
                                  <span className="service-count">0</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="service-distribution-info">
                          <p><strong>Top Service:</strong> {analyticsData.topServices && analyticsData.topServices.length > 0 ? analyticsData.topServices[0].name : 'N/A'}</p>
                          <p><strong>Total Services:</strong> {analyticsData.topServices ? analyticsData.topServices.length : 0}</p>
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
        activeMenu={activeMenu}
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
