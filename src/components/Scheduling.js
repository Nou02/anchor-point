import React, { useState, useEffect } from 'react';
import './Scheduling.css';
import { getFirestore, collection, addDoc, query, where, getDocs, getDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import '../firebase/config'; // Make sure this imports your firebase config
import { getWeatherForecast, getMockWeatherData } from '../services/weatherService';
import CrewAvailabilityTable from './CrewAvailabilityTable';

const Scheduling = () => {
  // Initialize Firestore database
  const db = getFirestore();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState([]); // Array of selected dates
  const [view, setView] = useState('calendar'); // 'calendar' or 'table'
  const [formData, setFormData] = useState({});
  const [savedEntries, setSavedEntries] = useState([]);
  const [userName, setUserName] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [crewAvailability, setCrewAvailability] = useState({}); // Track availability for each worker
  const [assignedWorkers, setAssignedWorkers] = useState({}); // Track assigned workers for each appointment
  const [currentDateIndex, setCurrentDateIndex] = useState(0); // Track which selected date is being processed
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Flag to prevent saving during initial load
  const [weatherData, setWeatherData] = useState({}); // Store weather data for calendar dates
  const [weatherLoading, setWeatherLoading] = useState(false); // Track weather loading state
  const [selectedDateForAI, setSelectedDateForAI] = useState(null); // Track selected date for AI recommendation
  const [showCreateDropdown, setShowCreateDropdown] = useState(false); // Track create dropdown visibility
  const [showAppointmentModal, setShowAppointmentModal] = useState(false); // Track appointment modal visibility
  const [appointmentFormData, setAppointmentFormData] = useState({
    time: '',
    serviceType: 'Mooring',
    vesselType: 'Local',
    selectedWorkers: []
  }); // Track appointment form data

  // Get current month and year
  const currentMonth = currentDate.getMonth();
  const currentYear = currentDate.getFullYear();

  // Month names
  const monthNames = [
    'JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'
  ];

  // Get the first day of the month and number of days
  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);
  const daysInMonth = lastDayOfMonth.getDate();
  const firstDayIndex = firstDayOfMonth.getDay();

  // Generate calendar days
  const generateCalendarDays = () => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: '', isCurrentMonth: false });
    }
    
    // Add days of the current month
    for (let day = 1; day <= daysInMonth; day++) {
      days.push({ 
        day, 
        isCurrentMonth: true,
        isToday: isToday(day),
        isSelected: isSelected(day)
      });
    }
    
    // Add days from next month to complete the grid
    const remainingCells = 42 - days.length; // 6 rows * 7 days = 42
    for (let day = 1; day <= remainingCells; day++) {
      days.push({ day, isCurrentMonth: false });
    }
    
    return days;
  };

  // Check if a day is today
  const isToday = (day) => {
    const today = new Date();
    return day === today.getDate() && 
           currentMonth === today.getMonth() && 
           currentYear === today.getFullYear();
  };

  // Check if a day is selected (multiple selection)
  const isSelected = (day) => {
    return selectedDates.some(date =>
      day === date.getDate() &&
      currentMonth === date.getMonth() &&
      currentYear === date.getFullYear()
    );
  };

  // Check if a day is in the past
  const isPastDate = (day) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const checkDate = new Date(currentYear, currentMonth, day);
    checkDate.setHours(0, 0, 0, 0);
    return checkDate < today;
  };

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Check if current user is Alice
  const isAlice = () => {
    const auth = getAuth();
    const user = auth.currentUser;
    const userEmail = user ? user.email : '';
    const matchName = userFullName || userName;
    
    // Check for Alice Margaretha Santos
    const isAliceUser = 
      matchName === 'Alice Margaretha Santos' || 
      matchName === 'Alice' ||
      (matchName && matchName.toLowerCase().includes('alice')) ||
      (userEmail && userEmail.toLowerCase().includes('alice'));
    
    return isAliceUser;
  };

  // Handle date selection (toggle multiple) - only allow Alice to select dates
  const handleDateClick = (day, isCurrentMonth) => {
    if (isCurrentMonth && day && isAlice()) {
      const clickedDate = new Date(currentYear, currentMonth, day);
      
      // Check if the clicked date is in the past
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      clickedDate.setHours(0, 0, 0, 0);
      
      if (clickedDate < today) {
        // Don't allow selection of past dates
        alert('Cannot select dates that have already passed');
        return;
      }
      
      setSelectedDates(prev => {
        const exists = prev.some(date =>
          date.getDate() === clickedDate.getDate() &&
          date.getMonth() === clickedDate.getMonth() &&
          date.getFullYear() === clickedDate.getFullYear()
        );
        if (exists) {
          // Remove if already selected
          const newDates = prev.filter(date =>
            !(date.getDate() === clickedDate.getDate() &&
              date.getMonth() === clickedDate.getMonth() &&
              date.getFullYear() === clickedDate.getFullYear())
          );
          // If all dates are cleared, also clear from Firebase
          if (newDates.length === 0) {
            saveSelectedDatesToFirebase([]);
          }
          return newDates;
        } else {
          // Add new selected date
          return [...prev, clickedDate];
        }
      });
      // Set selected date for AI recommendation
      setSelectedDateForAI(clickedDate);
      // Reset current date index when selection changes
      setCurrentDateIndex(0);
    }
  };

  // Handle form input change
  const handleInputChange = (idx, field, value) => {
    setFormData(prev => ({
      ...prev,
      [idx]: {
        ...prev[idx],
        [field]: value
      }
    }));
  };

  // Save form data to Firestore
  const handleFormSubmit = async (e, idx, date) => {
    e.preventDefault();
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    
    // Get assigned workers for this appointment
    const assignedWorkersList = getAssignedWorkersForAppointment(idx);
    
    // Ensure all fields are present and defaulted
    const data = {
      name: formData[idx]?.name || '',
      time: formData[idx]?.time || '',
      serviceType: formData[idx]?.serviceType || 'Mooring',
      vesselType: formData[idx]?.vesselType || 'Local',
      date: date.toISOString(),
      userEmail: user ? user.email : 'guest',
      timestamp: new Date().toISOString(),
      assignedWorkers: assignedWorkersList // Add assigned workers to the appointment
    };
    try {
      await addDoc(collection(db, 'appointments'), data);
      // Clear the form data and assigned workers for this specific date index
      setFormData(prev => {
        const newFormData = { ...prev };
        delete newFormData[idx];
        return newFormData;
      });
      setAssignedWorkers(prev => {
        const newAssignedWorkers = { ...prev };
        delete newAssignedWorkers[idx];
        return newAssignedWorkers;
      });
      fetchSavedEntries();
      alert('Appointment saved successfully!');
      moveToNextDate(); // Move to the next selected date after saving
    } catch (err) {
      alert('Error saving appointment: ' + err.message);
    }
  };

  // Fetch saved entries for selected dates
  const fetchSavedEntries = async () => {
    const db = getFirestore();
    if (selectedDates.length === 0) {
      setSavedEntries([]);
      return;
    }
    // Get ISO strings for selected dates
    const selectedISO = selectedDates.map(d => d.toISOString().slice(0, 10));
    const q = query(collection(db, 'appointments'));
    const querySnapshot = await getDocs(q);
    const entries = [];
    querySnapshot.forEach(docSnap => {
      const entry = docSnap.data();
      // Only match if entry.date exists and not marked as done
      if (entry.date && selectedISO.includes(entry.date.slice(0, 10)) && entry.status !== 'done') {
        entries.push({ ...entry, id: docSnap.id });
      }
    });
    setSavedEntries(entries);
  };

  // Fetch saved availability from Firestore
  const fetchSavedAvailability = async () => {
    const db = getFirestore();
    try {
      const today = new Date();
      const availabilityDocName = buildAvailabilityDocId(today);
      const docRef = doc(db, 'availability', availabilityDocName);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        setCrewAvailability(data);
      }
    } catch (err) {
      console.log('Error fetching saved availability:', err);
    }
  };

  // Load selected dates from Firebase
  const loadSelectedDatesFromFirebase = async () => {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('No user logged in, skipping Firebase load');
      return [];
    }
    
    try {
      const userId = user.uid;
      const docRef = doc(db, 'selectedDates', userId);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.selectedDates && Array.isArray(data.selectedDates)) {
          // Convert ISO strings back to Date objects
          const parsedDates = data.selectedDates.map(dateStr => new Date(dateStr));
          console.log('Selected dates loaded from Firebase for user:', user.email);
          return parsedDates;
        }
      }
      
      console.log('No selected dates found in Firebase for user:', user.email);
      return [];
    } catch (error) {
      console.error('Error loading selected dates from Firebase:', error);
      return [];
    }
  };

  // Check and remove passed dates
  const removePassedDates = (dates) => {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Set to start of today for accurate comparison
    
    const validDates = dates.filter(date => {
      const dateOnly = new Date(date);
      dateOnly.setHours(0, 0, 0, 0); // Set to start of day for accurate comparison
      return dateOnly >= today; // Keep dates that are today or in the future
    });
    
    const removedCount = dates.length - validDates.length;
    if (removedCount > 0) {
      console.log(`Removed ${removedCount} passed date(s) from selection`);
    }
    
    return validDates;
  };

  // Save selected dates to Firebase
  const saveSelectedDatesToFirebase = async (dates) => {
    const user = getAuth().currentUser;
    if (!user) {
      console.log('No user logged in, cannot save selected dates');
      return;
    }

    try {
      const db = getFirestore();
      const userId = user.uid;
      const docRef = doc(db, 'selectedDates', userId);
      
      // Convert Date objects to ISO strings for storage
      const datesToSave = dates.map(date => date.toISOString());
      
      await setDoc(docRef, {
        selectedDates: datesToSave,
        lastUpdated: new Date().toISOString(),
        userId: userId
      }, { merge: true });
      
      console.log('Selected dates saved to Firebase for user:', user.email);
    } catch (error) {
      console.error('Error saving selected dates to Firebase:', error);
    }
  };


  // Mark appointment as done
  const handleDoneAppointment = async (id) => {
    const db = getFirestore();
    try {
      const appointmentRef = doc(db, 'appointments', id);
      await updateDoc(appointmentRef, { status: 'done' });
      
      // Find the appointment to get assigned workers
      const appointment = savedEntries.find(entry => entry.id === id);
      if (appointment && appointment.assignedWorkers && appointment.assignedWorkers.length > 0) {
        // Update crew availability to mark these workers as available again
        const updatedCrewAvailability = { ...crewAvailability };
        
        // For each assigned worker, ensure they are marked as available
        appointment.assignedWorkers.forEach(workerName => {
          const workerKey = workerName.toLowerCase().replace(/[\s,]+/g, '_');
          const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
          
          // Get the day of the week for this appointment
          const appointmentDate = new Date(appointment.date);
          const dayIndex = appointmentDate.getDay();
          const dayKey = dayNames[dayIndex];
          
          // Ensure the worker is marked as available (not false) for this day
          if (!updatedCrewAvailability[workerKey]) {
            updatedCrewAvailability[workerKey] = {};
          }
          updatedCrewAvailability[workerKey][dayKey] = true; // Mark as available
        });
        
        // Update local state
        setCrewAvailability(updatedCrewAvailability);
        
        // Save updated availability to Firestore
        const today = new Date();
        const availabilityDocName = buildAvailabilityDocId(today);
        
        const data = {
          ...updatedCrewAvailability,
          savedBy: 'system',
          savedAt: new Date().toISOString(),
          date: today.toISOString()
        };
        
        await setDoc(doc(db, 'availability', availabilityDocName), data, { merge: true });
      }
      
      setSavedEntries(prev => prev.filter(entry => entry.id !== id)); // Remove from local state instantly
      fetchSavedEntries();
    } catch (err) {
      alert('Error marking appointment as done: ' + err.message);
    }
  };

  // Load saved selected dates from Firebase and localStorage on component mount
  useEffect(() => {
    const loadSavedDates = async () => {
      try {
        // First try to load from Firebase
        const firebaseDates = await loadSelectedDatesFromFirebase();
        
        let datesToSet = [];
        
        if (firebaseDates.length > 0) {
          // Use Firebase data if available
          datesToSet = firebaseDates;
          console.log('Loaded selected dates from Firebase');
        } else {
          // Fallback to localStorage if no Firebase data
          const savedDates = localStorage.getItem('schedulingSelectedDates');
          if (savedDates) {
            const parsedDates = JSON.parse(savedDates).map(dateStr => new Date(dateStr));
            datesToSet = parsedDates;
            console.log('Loaded selected dates from localStorage');
          }
        }
        
        // Clean up passed dates before setting
        const cleanedDates = removePassedDates(datesToSet);
        
        // If dates were cleaned up, save the cleaned version back to Firebase
        if (cleanedDates.length !== datesToSet.length) {
          setSelectedDates(cleanedDates);
          await saveSelectedDatesToFirebase(cleanedDates);
          // Also update localStorage
          localStorage.setItem('schedulingSelectedDates', JSON.stringify(cleanedDates));
        } else {
          setSelectedDates(cleanedDates);
        }
        
        setIsInitialLoad(false); // Mark initial load as complete
      } catch (error) {
        console.error('Error loading saved dates:', error);
        setIsInitialLoad(false);
      }
    };
    loadSavedDates();
  }, []);

  // Save selected dates to Firebase and localStorage whenever they change
  useEffect(() => {
    if (isInitialLoad) {
      return; // Don't save during initial load
    }
    
    const saveDates = async () => {
      try {
        // Save to localStorage (for backward compatibility)
        localStorage.setItem('schedulingSelectedDates', JSON.stringify(selectedDates));
        
        // Save to Firebase
        await saveSelectedDatesToFirebase(selectedDates);
      } catch (error) {
        console.error('Error saving dates:', error);
      }
    };
    
    saveDates();
  }, [selectedDates, isInitialLoad]);

  useEffect(() => {
    fetchSavedEntries();
    fetchSavedAvailability();
    // eslint-disable-next-line
  }, [selectedDates]);

  // Periodic cleanup of passed dates
  useEffect(() => {
    const cleanupPassedDates = () => {
      setSelectedDates(prev => {
        const cleanedDates = removePassedDates(prev);
        if (cleanedDates.length !== prev.length) {
          // Save cleaned dates to Firebase and localStorage
          saveSelectedDatesToFirebase(cleanedDates);
          localStorage.setItem('schedulingSelectedDates', JSON.stringify(cleanedDates));
        }
        return cleanedDates;
      });
    };

    // Run cleanup immediately
    cleanupPassedDates();

    // Set up interval to check every hour
    const interval = setInterval(cleanupPassedDates, 60 * 60 * 1000); // 1 hour

    return () => clearInterval(interval);
  }, []);

  // Get logged-in user's name and full name from Firestore if needed
  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (user) {
        console.log('Debug - Firebase user:', user);
        console.log('Debug - user.displayName:', user.displayName);
        console.log('Debug - user.email:', user.email);
        
        let name = user.displayName || (user.email ? user.email.split('@')[0] : '');
        setUserName(name);
        console.log('Debug - set userName to:', name);
        
        // Try to get full name from Firestore if displayName is missing or is just email username
        if (!user.displayName || name === user.email.split('@')[0]) {
          // Query Firestore for user info by email
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          console.log('Debug - Firestore query result:', querySnapshot.empty ? 'No user found' : 'User found');
          
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            console.log('Debug - Firestore userData:', userData);
            if (userData.fullName) {
              setUserFullName(userData.fullName);
              console.log('Debug - set userFullName to:', userData.fullName);
            } else {
              setUserFullName(name);
              console.log('Debug - set userFullName to name:', name);
            }
          } else {
            setUserFullName(name);
            console.log('Debug - set userFullName to name (no Firestore data):', name);
          }
        } else {
          setUserFullName(name);
          console.log('Debug - set userFullName to name (has displayName):', name);
        }
      } else {
        setUserName('');
        setUserFullName('');
        console.log('Debug - No user logged in');
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch weather data for calendar
  useEffect(() => {
    const fetchWeatherData = async () => {
      setWeatherLoading(true);
      try {
        // Try to get real weather data first
        const forecast = await getWeatherForecast();
        if (Object.keys(forecast).length > 0) {
          setWeatherData(forecast);
          console.log('Weather data loaded:', forecast);
        } else {
          // Fallback to mock data if API fails
          const mockData = getMockWeatherData();
          setWeatherData(mockData);
          console.log('Using mock weather data:', mockData);
        }
      } catch (error) {
        console.error('Error fetching weather data:', error);
        // Use mock data as fallback
        const mockData = getMockWeatherData();
        setWeatherData(mockData);
        console.log('Using mock weather data due to error:', mockData);
      } finally {
        setWeatherLoading(false);
      }
    };

    fetchWeatherData();
  }, [currentDate]); // Refetch when month changes

  // Helper: get vessel type info for each day in current month
  const getDayVesselTypes = () => {
    const vesselMap = {};
    savedEntries.forEach(entry => {
      if (entry.date && entry.vesselType) {
        const d = new Date(entry.date);
        if (d.getMonth() === currentMonth && d.getFullYear() === currentYear) {
          const day = d.getDate();
          if (!vesselMap[day]) vesselMap[day] = new Set();
          vesselMap[day].add(entry.vesselType);
        }
      }
    });
    return vesselMap;
  };

  // Helper: get weather data for a specific date
  const getWeatherForDate = (day) => {
    if (!day || !day.isCurrentMonth) return null;
    
    const date = new Date(currentYear, currentMonth, day.day);
    const dateKey = date.toISOString().split('T')[0];
    return weatherData[dateKey] || null;
  };

  // Generate AI recommendation based on weather
  const generateAIRecommendation = (weatherInfo, date) => {
    if (!weatherInfo) {
      return {
        title: "No Weather Data Available",
        message: "Weather forecast is not available for this date. Please proceed with caution and monitor local weather conditions.",
        type: "warning",
        color: "#FF9800"
      };
    }

    const condition = weatherInfo.condition.toLowerCase();
    const temperature = weatherInfo.temperature;
    const windSpeed = weatherInfo.windSpeed || 0;

    // Generate recommendations based on weather conditions
    if (condition.includes('clear') || condition.includes('sunny')) {
      return {
        title: "✅ Optimal Conditions for Operations",
        message: `Perfect weather for mooring activities! Clear skies and ${temperature}°C temperature provide excellent visibility and safe working conditions. All outdoor operations can proceed as scheduled.`,
        type: "success",
        color: "#4CAF50"
      };
    } else if (condition.includes('cloud')) {
      return {
        title: "✅ Good Conditions for Operations",
        message: `Cloudy weather with ${temperature}°C is suitable for mooring activities. Visibility may be slightly reduced, but operations can proceed safely. Monitor conditions throughout the day.`,
        type: "success",
        color: "#4CAF50"
      };
    } else if (condition.includes('light rain')) {
      return {
        title: "⚠️ Proceed with Caution",
        message: `Light rain conditions with ${temperature}°C require extra safety measures. Ensure all workers have proper rain gear and non-slip footwear. Consider shorter work shifts and increased supervision.`,
        type: "warning",
        color: "#FF9800"
      };
    } else if (condition.includes('rain')) {
      return {
        title: "⚠️ High Risk - Consider Rescheduling",
        message: `Rainy conditions with ${temperature}°C pose safety risks for mooring operations. Wet surfaces increase slip hazards. Consider rescheduling non-critical activities or implement enhanced safety protocols.`,
        type: "warning",
        color: "#FF5722"
      };
    } else if (condition.includes('heavy rain')) {
      return {
        title: "❌ Not Recommended for Operations",
        message: `Heavy rain with ${temperature}°C creates dangerous working conditions. Strongly recommend rescheduling all outdoor mooring activities. Safety of personnel is the top priority.`,
        type: "danger",
        color: "#F44336"
      };
    } else if (condition.includes('storm') || condition.includes('thunderstorm')) {
      return {
        title: "❌ Operations Suspended",
        message: `Storm conditions with ${temperature}°C are extremely dangerous. All outdoor operations must be suspended immediately. Ensure all personnel are in safe locations and equipment is secured.`,
        type: "danger",
        color: "#D32F2F"
      };
    } else if (windSpeed > 30) {
      return {
        title: "⚠️ High Wind Warning",
        message: `High wind speeds (${windSpeed} km/h) create dangerous conditions for mooring operations. Consider postponing activities until wind conditions improve.`,
        type: "warning",
        color: "#FF9800"
      };
    } else {
      return {
        title: "ℹ️ Weather Advisory",
        message: `Current conditions: ${weatherInfo.condition} with ${temperature}°C. Please assess local conditions and proceed with appropriate safety measures.`,
        type: "info",
        color: "#2196F3"
      };
    }
  };


  // Get available workers for a specific date
  const getAvailableWorkers = (date) => {
    const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
    const dayIndex = date.getDay();
    const dayKey = dayNames[dayIndex];
    
    const workers = [
      'Alice Margaretha Santos',
      'Carla Dela Peña',
      'Bryan Matthew Cruz',
      'David Emmanuel Reyes',
      'Junnel, Cusi',
      'Aljon, Dipasupil',
      'Phil Allen, Eje',
      'Rhed, Escalon',
      'Fortune, Garcia Jr.',
      'Keith, Javier',
      'Ericson, Mendoza',
      'Alec, Sino-ag',
      'Romeo, Velasquez',
      'Rodel, Maranan',
      'Alloi, Sino-ag',
      'Renzy, Cantos',
      'PJ, Cusi'
    ];
    
    return workers.filter(workerName => {
      const workerKey = workerName.toLowerCase().replace(/[\s,]+/g, '_');
      const workerAvailability = crewAvailability[workerKey] || {};
      const isAvailable = workerAvailability[dayKey] !== false; // Available if not explicitly set to false
      
      // Check if worker is already assigned to an appointment on this date
      const dateISO = date.toISOString().slice(0, 10);
      const isAlreadyAssigned = savedEntries.some(entry => {
        if (!entry.date || !entry.assignedWorkers) return false;
        const entryDate = entry.date.slice(0, 10);
        return entryDate === dateISO && entry.assignedWorkers.includes(workerName);
      });
      
      return isAvailable && !isAlreadyAssigned; // Only show if available AND not already assigned
    });
  };

  // Handle worker assignment for an appointment
  const handleWorkerAssignment = (dateIdx, workerName, isAssigned) => {
    setAssignedWorkers(prev => ({
      ...prev,
      [dateIdx]: {
        ...prev[dateIdx],
        [workerName]: isAssigned
      }
    }));
  };

  // Get assigned workers for a specific appointment
  const getAssignedWorkersForAppointment = (dateIdx) => {
    const assigned = assignedWorkers[dateIdx] || {};
    return Object.keys(assigned).filter(worker => assigned[worker]);
  };

  // Move to next selected date after appointment is saved
  const moveToNextDate = () => {
    if (currentDateIndex < selectedDates.length - 1) {
      setCurrentDateIndex(currentDateIndex + 1);
      // Clear form data for the new date
      setFormData(prev => {
        const newFormData = { ...prev };
        delete newFormData[currentDateIndex];
        return newFormData;
      });
      setAssignedWorkers(prev => {
        const newAssignedWorkers = { ...prev };
        delete newAssignedWorkers[currentDateIndex];
        return newAssignedWorkers;
      });
    } else {
      // All dates processed, reset to first date and clear selection
      setCurrentDateIndex(0);
      setSelectedDates([]);
      setFormData({});
      setAssignedWorkers({});
      // Clear from Firebase as well
      saveSelectedDatesToFirebase([]);
    }
  };


  const dayVesselTypes = getDayVesselTypes();
  const calendarDays = generateCalendarDays();

return (
  <div className="scheduling-container">
    {/* Semi-transparent overlay */}
    <div className="scheduling-overlay" />
    
    {/* Alice message at the top */}

    
    {/* Calendar header removed */}

    {/* Main content area: calendar or table */}
    <div className="scheduling-content">
      {view === 'calendar' ? (
        <div className="calendar-wrapper" style={{ width: '100%', maxWidth: '800px' }}>
          <div className="calendar-header">
            <div className="calendar-header-left">
              <div className="calendar-title">
                <div className="calendar-icon">27</div>
                Calendar
              </div>
              <button className="today-button">
                Today
              </button>
              <div className="create-button-container">
                <button 
                  className="create-button"
                  onClick={() => setShowCreateDropdown(!showCreateDropdown)}
                >
                  <span className="create-icon">+</span>
                  Create
                  <span className="dropdown-arrow">▼</span>
                </button>
                {showCreateDropdown && (
                  <div className="create-dropdown">
                    <div 
                      className="dropdown-item"
                      onClick={() => {
                        setShowAppointmentModal(true);
                        setShowCreateDropdown(false);
                      }}
                    >
                      Appointment Schedule
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="calendar-navigation">
              <button 
                className="nav-arrow left-arrow" 
                onClick={goToPreviousMonth}
                aria-label="Previous month"
              >
                ←
              </button>
              <h2 className="month-year">
                {monthNames[currentMonth]} {currentYear}
              </h2>
              <button 
                className="nav-arrow right-arrow" 
                onClick={goToNextMonth}
                aria-label="Next month"
              >
                →
              </button>
            </div>
          </div>
          <div className="calendar-grid">
            {/* Weekday headers */}
            <div className="weekday-header">
              {['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'].map((day, index) => {
                const today = new Date();
                const isCurrentDay = today.getDay() === index;
                return (
                  <div 
                    key={day}
                    className={`weekday ${isCurrentDay ? 'current-day' : ''}`}
                  >
                    {day}
                  </div>
                );
              })}
            </div>
            {/* Calendar days */}
            <div className="calendar-days">
              {calendarDays.map((dayData, index) => {
                let bgColor = '';
                let weatherInfo = null;
                
                if (dayData.isCurrentMonth && dayData.day) {
                  // Get vessel types for background color
                  const vesselTypes = dayVesselTypes[dayData.day];
                  if (vesselTypes) {
                    if (vesselTypes.has('Local') && vesselTypes.has('International')) {
                      bgColor = '#e6d6ff'; // light purple
                    } else if (vesselTypes.has('Local')) {
                      bgColor = '#d6f5d6'; // light green
                    } else if (vesselTypes.has('International')) {
                      bgColor = '#d6eaff'; // light blue
                    }
                  }
                  
                  // Get weather data for this date
                  weatherInfo = getWeatherForDate(dayData);
                }

                const isPast = dayData.isCurrentMonth && dayData.day && isPastDate(dayData.day);
                const canClick = isAlice() && dayData.isCurrentMonth && dayData.day && !isPast;
                
                // Create title with weather information
                let titleText = '';
                if (!isAlice() && dayData.isCurrentMonth && dayData.day) {
                  titleText = 'Only Alice can select dates';
                } else if (isPast) {
                  titleText = 'This date has already passed';
                } else if (weatherInfo) {
                  titleText = `Weather: ${weatherInfo.condition} - ${weatherInfo.temperature}°C`;
                }
                
                return (
                  <div
                    key={index}
                    className={`calendar-day ${
                      dayData.isCurrentMonth ? 'current-month' : 'other-month'
                    } ${dayData.isToday ? 'today' : ''} ${
                      dayData.isSelected ? 'selected' : ''
                    } ${!canClick && dayData.isCurrentMonth && dayData.day ? 'non-clickable' : ''} ${
                      isPast ? 'past-date' : ''
                    }`}
                    style={{ 
                      ...bgColor ? { background: bgColor } : {},
                      ...weatherInfo ? { 
                        background: weatherInfo.color,
                        color: weatherInfo.color === '#FFD700' || weatherInfo.color === '#FFFFFF' ? '#000' : '#fff',
                        fontWeight: 'bold'
                      } : {},
                      cursor: canClick ? 'pointer' : 'default'
                    }}
                    onClick={() => handleDateClick(dayData.day, dayData.isCurrentMonth)}
                    title={titleText}
                  >
                    <div>{dayData.day}</div>
                    {weatherInfo && (
                      <div style={{ 
                        fontSize: '0.7rem', 
                        marginTop: '2px',
                        opacity: 0.8
                      }}>
                        {weatherInfo.temperature}°C
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            
            {/* AI Weather Recommendation Section - Now inside calendar */}
            {selectedDateForAI && (
              <div className="ai-recommendation-section" style={{ marginTop: '20px', width: '100%' }}>
                <div className="ai-recommendation-header" style={{ padding: '12px 16px', marginBottom: '8px' }}>
                  <div className="date-badge" style={{ fontSize: '0.8rem', padding: '6px 12px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' }}>
                    <div style={{ fontSize: '0.7rem', fontWeight: 'bold' }}>
                      {selectedDateForAI.toLocaleDateString('en-US', { 
                        weekday: 'short', 
                        month: 'short', 
                        day: 'numeric' 
                      })}
                    </div>
                    <div style={{ fontSize: '0.6rem', textAlign: 'center', lineHeight: '1.2' }}>
                      AI Weather Recommendation
                    </div>
                  </div>
                </div>
                
                {(() => {
                  const dateKey = selectedDateForAI.toISOString().split('T')[0];
                  const weatherInfo = weatherData[dateKey];
                  const recommendation = generateAIRecommendation(weatherInfo, selectedDateForAI);
                  
                  return (
                    <div className="ai-recommendation-card" style={{ padding: '16px' }}>
                      <div className="recommendation-header">
                        <div className="status-indicator">
                          <div className="status-text">
                            <h4 style={{ fontSize: '1rem', margin: '0 0 8px 0' }}>{recommendation.title}</h4>
                            <div className="priority-badge" style={{ fontSize: '0.7rem', padding: '4px 8px' }}>
                              {recommendation.type === 'success' ? 'OPTIMAL' : 
                               recommendation.type === 'warning' ? 'CAUTION' : 
                               recommendation.type === 'danger' ? 'CRITICAL' : 'ADVISORY'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="recommendation-content">
                        <p className="recommendation-message" style={{ fontSize: '0.9rem', margin: '8px 0' }}>
                          {recommendation.message}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
          
          {/* Weather Legend - Below Calendar */}
          <div className="weather-legend-section">
            <div className="weather-legend">
              <span className="weather-legend-title">Weather:</span>
              <div className="weather-legend-items">
                <div className="weather-item">
                  <div className="weather-indicator sunny"></div>
                  <span className="weather-text">Sunny</span>
                </div>
                <div className="weather-item">
                  <div className="weather-indicator cloudy"></div>
                  <span className="weather-text">Cloudy</span>
                </div>
                <div className="weather-item">
                  <div className="weather-indicator light-rain"></div>
                  <span className="weather-text">Light Rain</span>
                </div>
                <div className="weather-item">
                  <div className="weather-indicator rain"></div>
                  <span className="weather-text">Rain</span>
                </div>
                <div className="weather-item">
                  <div className="weather-indicator heavy-rain"></div>
                  <span className="weather-text">Heavy Rain</span>
                </div>
                <div className="weather-item">
                  <div className="weather-indicator storm"></div>
                  <span className="weather-text">Storm</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <CrewAvailabilityTable 
          crewAvailability={crewAvailability}
          setCrewAvailability={setCrewAvailability}
        />
      )}

      {/* Navigation buttons - positioned at lower right */}
      <div className="report-nav-btns">
        <button
          className="report-nav-btn"
          onClick={() => setView('calendar')}
          disabled={view === 'calendar'}
        >
          &#8592; Previous
        </button>
        <button
          className="report-nav-btn"
          onClick={() => setView('table')}
          disabled={view === 'table'}
        >
          Next &#8594;
        </button>
      </div>
    </div>

    {/* Appointment Creation Modal */}
    {showAppointmentModal && (
      <div className="modal-overlay" onClick={() => setShowAppointmentModal(false)}>
        <div className="appointment-modal" onClick={(e) => e.stopPropagation()}>
          <div className="modal-header">
            <h2>Create Appointment</h2>
            <button 
              className="close-button"
              onClick={() => setShowAppointmentModal(false)}
            >
              ×
            </button>
          </div>
          
          <div className="modal-content">
            <div className="form-group">
              <label>TIME:</label>
              <div className="time-input-container">
                <input
                  type="time"
                  value={appointmentFormData.time}
                  onChange={(e) => setAppointmentFormData(prev => ({...prev, time: e.target.value}))}
                  className="time-input"
                />
                <span className="clock-icon">🕐</span>
              </div>
            </div>

            <div className="form-group">
              <label>TYPE OF SERVICE:</label>
              <select
                value={appointmentFormData.serviceType}
                onChange={(e) => setAppointmentFormData(prev => ({...prev, serviceType: e.target.value}))}
                className="form-select"
              >
                <option value="Mooring">Mooring</option>
                <option value="Unmooring">Unmooring</option>
              </select>
            </div>

            <div className="form-group">
              <label>VESSEL TYPE:</label>
              <select
                value={appointmentFormData.vesselType}
                onChange={(e) => setAppointmentFormData(prev => ({...prev, vesselType: e.target.value}))}
                className="form-select"
              >
                <option value="Local">Local</option>
                <option value="International">International</option>
              </select>
            </div>

            <div className="workers-section">
              <h3>Assign Available Workers</h3>
              <p>Select workers who are available for this appointment:</p>
              <div className="workers-list">
                {[
                  'Bryan Matthew Cruz',
                  'David Emmanuel Reyes',
                  'Junnel, Cusi',
                  'Aljon, Dipasupil',
                  'Phil Allen, Eje',
                  'Rhed, Escalon',
                  'Fortune, Garcia Jr.',
                  'Keith, Javier',
                  'Ericson, Mendoza',
                  'Alec, Sino-ag',
                  'Romeo, Velasquez',
                  'Rodel, Maranan',
                  'Alloi, Sino-ag',
                  'Renzy, Cantos',
                  'PJ, Cusi'
                ].map(worker => (
                  <label key={worker} className="worker-checkbox">
                    <input
                      type="checkbox"
                      checked={appointmentFormData.selectedWorkers.includes(worker)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setAppointmentFormData(prev => ({
                            ...prev,
                            selectedWorkers: [...prev.selectedWorkers, worker]
                          }));
                        } else {
                          setAppointmentFormData(prev => ({
                            ...prev,
                            selectedWorkers: prev.selectedWorkers.filter(w => w !== worker)
                          }));
                        }
                      }}
                    />
                    <span>{worker}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="modal-actions">
              <button 
                className="add-appointment-button"
                onClick={() => {
                  // Handle appointment creation logic here
                  console.log('Creating appointment:', appointmentFormData);
                  setShowAppointmentModal(false);
                  setAppointmentFormData({
                    time: '',
                    serviceType: 'Mooring',
                    vesselType: 'Local',
                    selectedWorkers: []
                  });
                }}
              >
                ADD APPOINTMENT & FINISH
              </button>
            </div>
          </div>
        </div>
      </div>
    )}
  </div>
)
};

export default Scheduling;