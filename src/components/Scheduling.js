import React, { useState, useEffect } from 'react';
import './Scheduling.css';
import { getFirestore, collection, addDoc, query, where, getDocs, getDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import '../firebase/config'; // Make sure this imports your firebase config

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
  const [savedAvailability, setSavedAvailability] = useState({}); // Track saved availability from Firestore
  const [isSaving, setIsSaving] = useState(false); // Track save button state
  const [assignedWorkers, setAssignedWorkers] = useState({}); // Track assigned workers for each appointment
  const [currentDateIndex, setCurrentDateIndex] = useState(0); // Track which selected date is being processed
  const [isInitialLoad, setIsInitialLoad] = useState(true); // Flag to prevent saving during initial load

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

  // Helper to build availability document ID
  const buildAvailabilityDocId = (dateObj) => {
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    return `availabilityId(${month}, ${day}, ${year})`;
  };

  // Save selected dates to Firebase
  const saveSelectedDatesToFirebase = async (dates) => {
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    
    if (!user) {
      console.log('No user logged in, skipping Firebase save');
      return;
    }
    
    try {
      const userId = user.uid;
      const userEmail = user.email;
      
      // Convert dates to ISO strings for storage
      const datesData = {
        selectedDates: dates.map(date => date.toISOString()),
        userId: userId,
        userEmail: userEmail,
        lastUpdated: new Date().toISOString(),
        updatedBy: userEmail
      };
      
      // Save to user's selected dates document
      const docRef = doc(db, 'selectedDates', userId);
      await setDoc(docRef, datesData, { merge: true });
      
      console.log('Selected dates saved to Firebase for user:', userEmail);
    } catch (error) {
      console.error('Error saving selected dates to Firebase:', error);
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
        setSavedAvailability(data);
        setCrewAvailability(data);
      }
    } catch (err) {
      console.log('Error fetching saved availability:', err);
    }
  };

  // Save availability to Firestore
  const handleSaveAvailability = async () => {
    setIsSaving(true);
    const db = getFirestore();
    const auth = getAuth();
    const user = auth.currentUser;
    
    try {
      const today = new Date();
      const availabilityDocName = buildAvailabilityDocId(today);
      
      const data = {
        ...crewAvailability,
        savedBy: user ? user.email : 'guest',
        savedAt: new Date().toISOString(),
        date: today.toISOString()
      };
      
      await setDoc(doc(db, 'availability', availabilityDocName), data, { merge: true });
      setSavedAvailability(data);
      alert('Availability saved successfully!');
    } catch (err) {
      alert('Error saving availability: ' + err.message);
    } finally {
      setIsSaving(false);
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

  // Handle crew availability toggle - only Alice can change availability
  const handleAvailabilityToggle = async (workerName, dayIndex) => {
    // Only allow Alice to change availability
    if (!isAlice()) {
      alert('Only Alice can change worker availability.');
      return;
    }

    const workerKey = workerName.toLowerCase().replace(/[\s,]+/g, '_');
    const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
    const dayKey = dayNames[dayIndex];
    
    // Update local state
    setCrewAvailability(prev => {
      const currentAvailability = prev[workerKey] || {};
      return {
        ...prev,
        [workerKey]: {
          ...currentAvailability,
          [dayKey]: !currentAvailability[dayKey] // Toggle availability
        }
      };
    });

    // Immediately save to database
    try {
      const today = new Date();
      const availabilityDocName = buildAvailabilityDocId(today);
      const updatedAvailability = {
        ...crewAvailability,
        [workerKey]: {
          ...crewAvailability[workerKey],
          [dayKey]: !crewAvailability[workerKey]?.[dayKey]
        }
      };

      const data = {
        ...updatedAvailability,
        lastUpdated: new Date().toISOString(),
        updatedBy: 'Alice'
      };

      await setDoc(doc(db, 'availability', availabilityDocName), data, { merge: true });
      setSavedAvailability(data);
      console.log('Availability updated and saved to database');
    } catch (err) {
      console.error('Error saving availability:', err);
      alert('Error saving availability: ' + err.message);
    }
  };

  // Get available workers for a specific date
  const getAvailableWorkers = (date) => {
    const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
    const dayIndex = date.getDay();
    const dayKey = dayNames[dayIndex];
    
    const workers = [
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

  // Check if current user can edit a specific worker's availability
  const canEditWorkerAvailability = (workerName) => {
    // Only Alice can change worker availability
    return isAlice();
  };

  // Check if a worker row corresponds to the current logged-in user
  const isCurrentUserRow = (workerName) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const userEmail = user ? user.email : '';
    const matchName = userFullName || userName;
    
    const workerNameLower = workerName.toLowerCase();
    const matchNameLower = matchName.toLowerCase();
    const userEmailLower = userEmail.toLowerCase();
    
    // Check for exact name match
    if (workerNameLower === matchNameLower) return true;
    
    // Check for partial name match
    const workerNameParts = workerNameLower.split(/[\s,]+/);
    const matchNameParts = matchNameLower.split(/[\s,]+/);
    
    for (const workerPart of workerNameParts) {
      for (const matchPart of matchNameParts) {
        if (workerPart === matchPart && workerPart.length > 2) return true;
      }
    }
    
    // Check email matches
    if (userEmailLower.includes(workerNameLower.replace(/[\s,]+/g, ''))) return true;
    
    const emailUsername = userEmail.split('@')[0].toLowerCase();
    if (workerNameLower.includes(emailUsername)) return true;
    
    return false;
  };

  // Check if Carla can edit a specific worker's availability
  const canCarlaEditWorkerAvailability = (workerName) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const userEmail = user ? user.email : '';
    const matchName = userFullName || userName;
    
    // Check if current user is Carla
    const isCarla = 
      matchName === 'Carla Dela Peña' || 
      matchName === 'Carla' ||
      (matchName && matchName.toLowerCase().includes('carla')) ||
      (userEmail && userEmail.toLowerCase().includes('carla'));
    
    if (!isCarla) return false;
    
    // Check if worker has marked themselves as unavailable
    const workerKey = workerName.toLowerCase().replace(/[\s,]+/g, '_');
    const workerAvailability = savedAvailability[workerKey] || {};
    const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
    
    // Check if worker has marked any day as unavailable
    for (const dayKey of dayNames) {
      if (workerAvailability[dayKey] === false) {
        return false; // Carla cannot edit if worker has marked themselves unavailable
      }
    }
    
    return true; // Carla can edit if worker hasn't marked themselves unavailable
  };

  // Get availability status for a worker and day
  const getAvailabilityStatus = (workerName, dayIndex) => {
    const workerKey = workerName.toLowerCase().replace(/[\s,]+/g, '_');
    const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
    const dayKey = dayNames[dayIndex];
    
    const workerAvailability = crewAvailability[workerKey] || {};
    const isAvailable = workerAvailability[dayKey] !== false; // Default to available (true) unless explicitly set to false
    
    // Check if this day has passed
    const today = new Date();
    const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const isPastDay = dayIndex < currentDay;
    
    // Check if worker is assigned to any appointments on this day
    const isAssignedToAppointment = checkIfWorkerAssignedToAppointment(workerName, dayIndex);
    
    // Return null for past days (no highlighting) or the actual availability for current/future days
    if (isPastDay) return null;
    if (isAssignedToAppointment) return 'assigned'; // Special status for assigned workers
    return isAvailable; // true for available, false for unavailable
  };

  // Check if a worker is assigned to any appointments on a specific day
  const checkIfWorkerAssignedToAppointment = (workerName, dayIndex) => {
    const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
    const today = new Date();
    const currentDay = today.getDay();
    
    // Calculate the date for the given day index
    const targetDate = new Date(today);
    const daysToAdd = dayIndex - currentDay;
    targetDate.setDate(today.getDate() + daysToAdd);
    
    // Check if any saved entries have this worker assigned on this date
    return savedEntries.some(entry => {
      if (!entry.date || !entry.assignedWorkers) return false;
      
      const entryDate = new Date(entry.date);
      const isSameDate = entryDate.getDate() === targetDate.getDate() &&
                        entryDate.getMonth() === targetDate.getMonth() &&
                        entryDate.getFullYear() === targetDate.getFullYear();
      
      return isSameDate && entry.assignedWorkers.includes(workerName);
    });
  };

  const dayVesselTypes = getDayVesselTypes();
  const calendarDays = generateCalendarDays();

return (
  <div className="scheduling-container">
    {/* Semi-transparent overlay */}
    <div className="scheduling-overlay" />
    
    {/* Alice message at the top */}
    {isAlice() && (
      <div style={{
        backgroundColor: '#d4edda',
        border: '1px solid #c3e6cb',
        borderRadius: '8px',
        padding: '12px 16px',
        margin: '16px',
        textAlign: 'center',
        position: 'relative',
        zIndex: 10
      }}>
        <div style={{
          color: '#155724',
          fontWeight: '600',
          fontSize: '1rem'
        }}>
          Alice - You can change worker availability by clicking on the availability cells
        </div>
      </div>
    )}
    
    {/* Main content area: calendar or table */}
    <div className="scheduling-content">
      {view === 'calendar' ? (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: '32px', width: '100%' }}>
          <div className="calendar-wrapper">
            <div className="calendar-header">
              <button 
                className="nav-arrow left-arrow" 
                onClick={goToPreviousMonth}
                aria-label="Previous month"
              >
                ←
              </button>
              <h2 className="month-year">
                {monthNames[currentMonth]}, {currentYear}
              </h2>
              <button 
                className="nav-arrow right-arrow" 
                onClick={goToNextMonth}
                aria-label="Next month"
              >
                →
              </button>
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
                  if (dayData.isCurrentMonth && dayData.day) {
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
                  }

                  const isPast = dayData.isCurrentMonth && dayData.day && isPastDate(dayData.day);
                  const canClick = isAlice() && dayData.isCurrentMonth && dayData.day && !isPast;
                  
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
                        cursor: canClick ? 'pointer' : 'default'
                      }}
                      onClick={() => handleDateClick(dayData.day, dayData.isCurrentMonth)}
                      title={
                        !isAlice() && dayData.isCurrentMonth && dayData.day ? 'Only Alice can select dates' :
                        isPast ? 'This date has already passed' :
                        ''
                      }
                    >
                      <div>{dayData.day}</div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Selected date info beside calendar */}
          {selectedDates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="selected-date-info">
                <h3>Selected Date{selectedDates.length > 1 ? 's' : ''}:</h3>
                <ul>
                  {selectedDates.map((date, idx) => {
                    const dateISO = date.toISOString().slice(0, 10);
                    const appointmentsForDate = savedEntries.filter(entry => 
                      entry.date && entry.date.slice(0, 10) === dateISO
                    );
                    return (
                      <li key={idx}>
                        {date.toDateString()}
                        {appointmentsForDate.length > 0 && (
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: '#6c757d', 
                            marginLeft: '8px',
                            fontStyle: 'italic'
                          }}>
                            ({appointmentsForDate.length} appointment{appointmentsForDate.length > 1 ? 's' : ''})
                          </span>
                        )}
                      </li>
                    );
                  })}
                </ul>
                <p>You can schedule multiple appointments for each selected date.</p>
              </div>
              {/* Only show Client Information container if user is Carla Dela Peña */}
              {(() => {
                // Check if the logged-in user is Carla Dela Peña (including partial matches)
                const auth = getAuth();
                const currentUser = auth.currentUser;
                const userEmail = currentUser ? currentUser.email : '';
                
                const isCarlaDelaPena = 
                  userFullName === 'Carla Dela Peña' || 
                  userName === 'Carla Dela Peña' ||
                  userFullName === 'Carla' || 
                  userName === 'Carla' ||
                  (userFullName && userFullName.toLowerCase().includes('carla')) ||
                  (userName && userName.toLowerCase().includes('carla')) ||
                  (userEmail && userEmail.toLowerCase().includes('carla'));
                
                // Debug logging to help identify the issue
                console.log('Debug - userFullName:', userFullName);
                console.log('Debug - userName:', userName);
                console.log('Debug - userEmail:', userEmail);
                console.log('Debug - isCarlaDelaPena:', isCarlaDelaPena);
                
                // Only render the container if user is Carla Dela Peña
                if (isCarlaDelaPena) {
                  return (
                    <div className="selected-dates-container">
                      <h4>Client Information</h4>
                      
                      {/* Progress indicator */}
                      {selectedDates.length > 1 && (
                        <div style={{
                          marginBottom: '20px',
                          padding: '12px 16px',
                          background: '#e3f2fd',
                          borderRadius: '8px',
                          border: '1px solid #2196f3'
                        }}>
                          <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            marginBottom: '8px'
                          }}>
                            <span style={{
                              fontSize: '0.9rem',
                              fontWeight: '600',
                              color: '#1976d2'
                            }}>
                              Processing Date {currentDateIndex + 1} of {selectedDates.length}
                            </span>
                            <span style={{
                              fontSize: '0.8rem',
                              color: '#666'
                            }}>
                              {selectedDates.length - currentDateIndex - 1} remaining
                            </span>
                          </div>
                          <div style={{
                            width: '100%',
                            height: '6px',
                            background: '#e0e0e0',
                            borderRadius: '3px',
                            overflow: 'hidden'
                          }}>
                            <div style={{
                              width: `${((currentDateIndex + 1) / selectedDates.length) * 100}%`,
                              height: '100%',
                              background: '#2196f3',
                              transition: 'width 0.3s ease'
                            }} />
                          </div>
                        </div>
                      )}
                      
                      {/* Show form for current date only */}
                      {(() => {
                        const currentDate = selectedDates[currentDateIndex];
                        if (!currentDate) return null;
                        
                        const dateISO = currentDate.toISOString().slice(0, 10);
                        const existingAppointments = savedEntries.filter(entry => 
                          entry.date && entry.date.slice(0, 10) === dateISO
                        );
                        
                        return (
                          <div style={{ marginBottom: '24px', borderBottom: '1px solid #e0e0e0', paddingBottom: '20px' }}>
                            <div className="date-display">
                              <strong>Date:</strong> {currentDate.toDateString()}
                              {existingAppointments.length > 0 && (
                                <div style={{ 
                                  fontSize: '0.85rem', 
                                  color: '#6c757d', 
                                  marginTop: '4px',
                                  fontStyle: 'italic'
                                }}>
                                  {existingAppointments.length} appointment{existingAppointments.length > 1 ? 's' : ''} already scheduled
                                </div>
                              )}
                            </div>
                            <form onSubmit={e => handleFormSubmit(e, currentDateIndex, currentDate)}>
                              <label>
                                Name:
                                <input 
                                  type="text" 
                                  name={`clientName_${currentDateIndex}`} 
                                  value={formData[currentDateIndex]?.name || ''} 
                                  onChange={e => handleInputChange(currentDateIndex, 'name', e.target.value)} 
                                  placeholder="Enter client name" 
                                  required 
                                />
                              </label>
                              <label>
                                Time:
                                <input 
                                  type="time" 
                                  name={`clientTime_${currentDateIndex}`} 
                                  value={formData[currentDateIndex]?.time || ''} 
                                  onChange={e => handleInputChange(currentDateIndex, 'time', e.target.value)} 
                                  required 
                                />
                              </label>
                              <label>
                                Type of Service:
                                <select 
                                  name={`serviceType_${currentDateIndex}`} 
                                  value={formData[currentDateIndex]?.serviceType || 'Mooring'} 
                                  onChange={e => handleInputChange(currentDateIndex, 'serviceType', e.target.value)} 
                                  required
                                >
                                  <option value="Mooring">Mooring</option>
                                  <option value="Unmooring">Unmooring</option>
                                </select>
                              </label>
                              <label>
                                Vessel Type:
                                <select 
                                  name={`vesselType_${currentDateIndex}`} 
                                  value={formData[currentDateIndex]?.vesselType || 'Local'} 
                                  onChange={e => handleInputChange(currentDateIndex, 'vesselType', e.target.value)} 
                                  required
                                >
                                  <option value="Local">Local</option>
                                  <option value="International">International</option>
                                </select>
                              </label>
                              
                              {/* Worker Assignment Section */}
                              <div style={{ 
                                marginTop: '20px', 
                                padding: '16px', 
                                background: '#f8f9fa', 
                                borderRadius: '8px',
                                border: '1px solid #e9ecef'
                              }}>
                                <h5 style={{ 
                                  margin: '0 0 12px 0', 
                                  color: '#2F3B70', 
                                  fontSize: '1rem',
                                  fontWeight: '600'
                                }}>
                                  Assign Available Workers
                                </h5>
                                <p style={{ 
                                  fontSize: '0.9rem', 
                                  color: '#6c757d', 
                                  margin: '0 0 12px 0',
                                  fontStyle: 'italic'
                                }}>
                                  Select workers who are available for this appointment:
                                </p>
                                <div style={{ 
                                  display: 'grid', 
                                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                                  gap: '8px',
                                  maxHeight: '200px',
                                  overflowY: 'auto'
                                }}>
                                  {getAvailableWorkers(currentDate).map(workerName => (
                                    <label key={workerName} style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      padding: '8px 12px',
                                      background: 'white',
                                      borderRadius: '6px',
                                      border: '1px solid #dee2e6',
                                      cursor: 'pointer',
                                      transition: 'all 0.2s ease'
                                    }}>
                                      <input
                                        type="checkbox"
                                        checked={assignedWorkers[currentDateIndex]?.[workerName] || false}
                                        onChange={(e) => handleWorkerAssignment(currentDateIndex, workerName, e.target.checked)}
                                        style={{ marginRight: '8px' }}
                                      />
                                      <span style={{ fontSize: '0.9rem', color: '#2F3B70' }}>
                                        {workerName}
                                      </span>
                                    </label>
                                  ))}
                                </div>
                                {getAvailableWorkers(currentDate).length === 0 && (
                                  <p style={{ 
                                    fontSize: '0.9rem', 
                                    color: '#dc3545', 
                                    margin: '8px 0 0 0',
                                    fontStyle: 'italic'
                                  }}>
                                    No workers available for this date. Please check crew availability.
                                  </p>
                                )}
                              </div>
                              
                              <button type="submit">
                                {currentDateIndex < selectedDates.length - 1 ? 'Add Appointment & Continue' : 'Add Appointment & Finish'}
                              </button>
                            </form>
                          </div>
                        );
                      })()}
                    </div>
                  );
                }
                
                // Return null for all other users - no container will be rendered
                return null;
              })()}
              {/* New container: show saved entries for selected dates */}
              {savedEntries.length > 0 && (
                <div className="saved-entries-container">
                  <h4>Saved Appointments</h4>
                  <ul>
                    {savedEntries.map((entry, idx) => (
                      <li key={idx}>
                        <div><strong>Date:</strong> <span>{entry.date ? new Date(entry.date).toDateString() : ''}</span></div>
                        <div><strong>Name:</strong> <span>{entry.name || ''}</span></div>
                        <div><strong>Time:</strong> <span>{entry.time || ''}</span></div>
                        <div><strong>Type of Service:</strong> <span>{entry.serviceType || ''}</span></div>
                        <div><strong>Vessel Type:</strong> <span>{entry.vesselType || ''}</span></div>
                        <div><strong>User:</strong> <span>{entry.userEmail || ''}</span></div>
                        {entry.assignedWorkers && entry.assignedWorkers.length > 0 && (
                          <div style={{ marginTop: '8px' }}>
                            <strong>Assigned Workers:</strong>
                            <div style={{ 
                              marginTop: '4px',
                              padding: '8px',
                              background: '#e9ecef',
                              borderRadius: '4px',
                              fontSize: '0.9rem'
                            }}>
                              {entry.assignedWorkers.map((worker, workerIdx) => (
                                <span key={workerIdx} style={{ 
                                  display: 'inline-block',
                                  margin: '2px 4px 2px 0',
                                  padding: '2px 6px',
                                  background: '#2F3B70',
                                  color: 'white',
                                  borderRadius: '12px',
                                  fontSize: '0.8rem'
                                }}>
                                  {worker}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                        <button 
                          className="done-button"
                          onClick={() => handleDoneAppointment(entry.id)}
                        >
                          Done
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="crew-availability-table-wrapper">
          <table className="crew-availability-table">
            <thead>
              <tr>
                <th colSpan="8" style={{ 
                  textAlign: 'center', 
                  padding: '24px', 
                  backgroundColor: '#f8f9fa', 
                  borderBottom: '2px solid #dee2e6',
                  fontSize: '1.4rem',
                  fontWeight: '800',
                  color: '#2d3e5e',
                  textTransform: 'uppercase',
                  letterSpacing: '1px'
                }}>
                  {(() => {
                    const today = new Date();
                    const monthName = today.toLocaleDateString('en-US', { month: 'long' });
                    const year = today.getFullYear();
                    
                    // Calculate current week
                    const startOfYear = new Date(today.getFullYear(), 0, 1);
                    const days = Math.floor((today - startOfYear) / (24 * 60 * 60 * 1000));
                    const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
                    
                    return `${monthName} ${year} - Week ${weekNumber}`;
                  })()}
                </th>
              </tr>
              <tr>
                <th style={{ 
                  textAlign: 'left', 
                  padding: '20px 24px', 
                  backgroundColor: '#f8f9fa', 
                  borderBottom: '2px solid #dee2e6',
                  fontSize: '1.1rem',
                  fontWeight: '700',
                  color: '#2d3e5e',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                  minWidth: '200px'
                }}>
                  Crew
                </th>
                {(() => {
                  const today = new Date();
                  const currentDay = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
                  const dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
                  
                  // Calculate the start of the current week (Sunday)
                  const startOfWeek = new Date(today);
                  const dayOfWeek = today.getDay();
                  startOfWeek.setDate(today.getDate() - dayOfWeek);
                  
                  return dayNames.map((day, index) => {
                    const date = new Date(startOfWeek);
                    date.setDate(startOfWeek.getDate() + index);
                    const isCurrentDay = index === currentDay;
                    
                    return (
                      <th 
                        key={day}
                        className={isCurrentDay ? 'current-day-header' : ''}
                        style={{ 
                          textAlign: 'center', 
                          padding: '20px 16px', 
                          borderBottom: '2px solid #dee2e6',
                          fontSize: '1rem',
                          fontWeight: '700',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          minWidth: '120px'
                        }}
                      >
                        {day}<br />
                        <span style={{ 
                          fontSize: '1.2rem', 
                          fontWeight: '800',
                          marginTop: '4px',
                          display: 'block'
                        }}>
                          {date.getDate()}
                        </span>
                      </th>
                    );
                  });
                })()}
              </tr>
            </thead>
            <tbody>
              {/* Show ALL workers in the table regardless of login status */}
              {(() => {
                // List of all workers
                const workers = [
                  { name: 'Alice Margaretha Santos', type: 'Senior Supervisor' },
                  { name: 'Carla Dela Peña', type: 'Scheduler' },
                  { name: 'Bryan Matthew Cruz', type: 'Dock Worker' },
                  { name: 'David Emmanuel Reyes', type: 'Mechanic' },
                  { name: 'Junnel, Cusi', type: 'Dock Worker' },
                  { name: 'Aljon, Dipasupil', type: 'Dock Worker' },
                  { name: 'Phil Allen, Eje', type: 'Dock Worker' },
                  { name: 'Rhed, Escalon', type: 'Dock Worker' },
                  { name: 'Fortune, Garcia Jr.', type: 'Dock Worker' },
                  { name: 'Keith, Javier', type: 'Dock Worker' },
                  { name: 'Ericson, Mendoza', type: 'Dock Worker' },
                  { name: 'Alec, Sino-ag', type: 'Dock Worker' },
                  { name: 'Romeo, Velasquez', type: 'Dock Worker' },
                  { name: 'Rodel, Maranan', type: 'Dock Worker' },
                  { name: 'Alloi, Sino-ag', type: 'Dock Worker' },
                  { name: 'Renzy, Cantos', type: 'Dock Worker' },
                  { name: 'PJ, Cusi', type: 'Dock Worker' }
                ];
                
                // Get logged-in user's information for highlighting
                const auth = getAuth();
                const user = auth.currentUser;
                const userEmail = user ? user.email : '';
                const matchName = userFullName || userName;
                
                console.log('Debug - Crew Table - matchName:', matchName);
                console.log('Debug - Crew Table - userEmail:', userEmail);
                
                // Get today's day index (0=Sun, 1=Mon, ..., 6=Sat)
                const todayIdx = new Date().getDay();
                const dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
                
                // Show all workers in the table
                return workers.map((worker, idx) => {
                  const canEdit = canEditWorkerAvailability(worker.name);
                  const canCarlaEdit = canCarlaEditWorkerAvailability(worker.name);
                  const isCurrentUser = isCurrentUserRow(worker.name); // Highlight if it's the current user's row
                  const finalCanEdit = canEdit || canCarlaEdit; // Allow editing if either condition is met
                  
                  return (
                    <tr key={worker.name}>
                      <td style={{ 
                        fontWeight: '600', 
                        padding: '16px 20px',
                        backgroundColor: isCurrentUser ? '#f0f8ff' : '#f8f9fa',
                        borderRight: '2px solid #4156a1',
                        textAlign: 'left',
                        position: 'sticky',
                        left: 0,
                        zIndex: 10
                      }}>
                        <div style={{ fontWeight: '600', color: '#2d3e5e' }}>
                          {worker.name}
                        </div>
                        {isCurrentUser && (
                          <div className="your-row" style={{ 
                            fontSize: '0.8rem', 
                            color: '#6c757d', 
                            fontWeight: '400', 
                            marginTop: '4px',
                            fontStyle: 'italic'
                          }}>
                            ← Your row
                          </div>
                        )}
                      </td>
                      {Array(7).fill(null).map((_, i) => {
                        const availabilityStatus = getAvailabilityStatus(worker.name, i);
                        const isToday = i === todayIdx;
                        const isPastDay = i < todayIdx;
                        
                        return (
                          <td 
                            key={i} 
                            className={`${finalCanEdit ? "clickable-availability" : "non-clickable"} ${availabilityStatus === true ? "availability-available" : availabilityStatus === false ? "availability-unavailable" : availabilityStatus === 'assigned' ? "availability-assigned" : "availability-past"}`}
                            style={{ 
                              textAlign: 'center',
                              padding: '16px 12px',
                              borderRadius: '8px',
                              border: isToday ? '2px solid #2d3e5e' : '1px solid #e0e0e0',
                              cursor: finalCanEdit && !isPastDay ? 'pointer' : 'default',
                              transition: 'all 0.2s ease',
                              fontWeight: '600',
                              background: availabilityStatus === 'assigned' ? '#2F3B70' : availabilityStatus === true ? '#fff3cd' : availabilityStatus === false ? '#f8d7da' : '#f8f9fa',
                              color: availabilityStatus === 'assigned' ? 'white' : availabilityStatus === true ? '#856404' : availabilityStatus === false ? '#721c24' : '#6c757d'
                            }}
                            onClick={finalCanEdit && !isPastDay ? () => handleAvailabilityToggle(worker.name, i) : undefined}
                            title={finalCanEdit && !isPastDay ? `Click to mark ${availabilityStatus ? 'unavailable' : 'available'} for ${['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'][i]}` : isPastDay ? 'Past day - no editing allowed' : 'Only Alice can change worker availability'}
                          >
                            <div style={{ fontWeight: '700', marginBottom: '4px' }}>
                              {availabilityStatus === 'assigned' ? 'On Duty' : availabilityStatus === true ? 'Available' : availabilityStatus === false ? 'Not Available' : 'Past Day'}
                            </div>
                            {isToday && (
                              <div className="today-indicator" style={{ 
                                fontSize: '0.75rem', 
                                color: availabilityStatus === 'assigned' ? 'white' : availabilityStatus === true ? '#2d3e5e' : '#2d3e5e', 
                                fontWeight: '700', 
                                marginTop: '4px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                              }}>
                                Today
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  );
                });
              })()}
            </tbody>
          </table>
        </div>
      )}
      
      {/* Save Button - only show in table view */}
      {view === 'table' && (
        <div className="save-availability-btn">
          <button 
            onClick={handleSaveAvailability}
            disabled={isSaving}
          >
            {isSaving ? 'Saving...' : 'Save Availability'}
          </button>
        </div>
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
  </div>
)
};

export default Scheduling;