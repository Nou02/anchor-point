import React, { useState, useEffect } from 'react';
import './CrewAvailabilityTable.css';
import { getFirestore, doc, getDoc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import '../firebase/config';

const CrewAvailabilityTable = ({ crewAvailability, setCrewAvailability }) => {
  const [savedAvailability, setSavedAvailability] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [savedEntries, setSavedEntries] = useState([]);
  const [userName, setUserName] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [selectedWorker, setSelectedWorker] = useState(null);
  const [allWorkers, setAllWorkers] = useState([]);
  const [timeModalOpen, setTimeModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedWorkerForTime, setSelectedWorkerForTime] = useState(null);
  const [unavailableTimes, setUnavailableTimes] = useState([]);

  // Initialize Firestore database
  const db = getFirestore();

  // Convert 24-hour format to AM/PM format
  const convertToAMPM = (time24) => {
    if (!time24) return '';
    
    // Handle already formatted times (if it contains AM/PM, return as is)
    if (time24.includes('AM') || time24.includes('PM')) {
      return time24;
    }
    
    // Parse 24-hour format (HH:MM)
    const [hours, minutes] = time24.split(':');
    const hour24 = parseInt(hours, 10);
    const minute = minutes || '00';
    
    if (isNaN(hour24)) return time24;
    
    // Convert to 12-hour format
    let hour12 = hour24 % 12;
    if (hour12 === 0) hour12 = 12;
    
    const ampm = hour24 >= 12 ? 'PM' : 'AM';
    return `${hour12}:${minute} ${ampm}`;
  };

  // Check if current user is Alice
  const isAlice = () => {
    const auth = getAuth();
    const user = auth.currentUser;
    const userEmail = user ? user.email : '';
    const matchName = userFullName || userName;
    
    // Check for Alice Margaretha Santos (handle both "Alice Margaretha Santos" and "Santos, Alice Margaretha" formats)
    const isAliceUser = 
      matchName === 'Alice Margaretha Santos' || 
      matchName === 'Santos, Alice Margaretha' ||
      matchName === 'Alice' ||
      (matchName && matchName.toLowerCase().includes('alice')) ||
      (userEmail && userEmail.toLowerCase().includes('alice'));
    
    return isAliceUser;
  };

  // Helper to build availability document ID
  const buildAvailabilityDocId = (dateObj) => {
    const month = dateObj.getMonth() + 1;
    const day = dateObj.getDate();
    const year = dateObj.getFullYear();
    return `availabilityId(${month}, ${day}, ${year})`;
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

  // Prevent body scroll when modal is open
  useEffect(() => {
    if (timeModalOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      
      // Prevent scrolling
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position when modal closes
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        window.scrollTo(0, scrollY);
      };
    }
  }, [timeModalOpen]);

  // Open time input modal
  const handleDayClick = (workerName, dayIndex) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const userEmail = user ? user.email : '';
    const matchName = userFullName || userName;
    
    // Check if current user is Alice
    const isAliceUser = 
      matchName === 'Alice Margaretha Santos' || 
      matchName === 'Santos, Alice Margaretha' ||
      matchName === 'Alice' ||
      (matchName && matchName.toLowerCase().includes('alice')) ||
      (userEmail && userEmail.toLowerCase().includes('alice'));
    
    // Check if current user is the worker themselves
    const isCurrentWorker = isCurrentUserRow(workerName);
    
    // Allow editing if Alice (can change anyone) or if it's the worker themselves
    if (!isAliceUser && !isCurrentWorker) {
      alert('Only Alice can change worker availability, or workers can mark themselves as unavailable.');
      return;
    }

    // Check if this is a past day
    const today = new Date();
    const currentDay = today.getDay();
    if (dayIndex < currentDay) {
      alert('Cannot edit past days.');
      return;
    }

    // Load existing unavailable times for this day
    const workerKey = workerName.toLowerCase().replace(/[\s,]+/g, '_');
    const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
    const dayKey = dayNames[dayIndex];
    
    const workerAvailability = crewAvailability[workerKey] || {};
    const dayAvailability = workerAvailability[dayKey] || {};
    const existingTimes = dayAvailability.unavailableTimes || [];
    
    setSelectedWorkerForTime(workerName);
    setSelectedDay(dayIndex);
    setUnavailableTimes(existingTimes.length > 0 ? existingTimes : [{ startTime: '09:00', endTime: '17:00' }]);
    setTimeModalOpen(true);
  };

  // Save unavailable times
  const handleSaveUnavailableTimes = async () => {
    if (!selectedWorkerForTime || selectedDay === null) return;

    const workerKey = selectedWorkerForTime.toLowerCase().replace(/[\s,]+/g, '_');
    const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
    const dayKey = dayNames[selectedDay];
    
    // Validate times
    const validTimes = unavailableTimes.filter(time => {
      if (!time.startTime || !time.endTime) return false;
      return time.startTime < time.endTime;
    });

    // Update local state
    setCrewAvailability(prev => {
      const currentAvailability = prev[workerKey] || {};
      return {
        ...prev,
        [workerKey]: {
          ...currentAvailability,
          [dayKey]: {
            unavailableTimes: validTimes,
            isAvailable: validTimes.length === 0
          }
        }
      };
    });

    // Save to database
    try {
      const today = new Date();
      const availabilityDocName = buildAvailabilityDocId(today);
      const updatedAvailability = {
        ...crewAvailability,
        [workerKey]: {
          ...(crewAvailability[workerKey] || {}),
          [dayKey]: {
            unavailableTimes: validTimes,
            isAvailable: validTimes.length === 0
          }
        }
      };

      const auth = getAuth();
      const user = auth.currentUser;
      const userEmail = user ? user.email : '';
      const matchName = userFullName || userName;
      const isAliceUser = 
        matchName === 'Alice Margaretha Santos' || 
        matchName === 'Santos, Alice Margaretha' ||
        matchName === 'Alice' ||
        (matchName && matchName.toLowerCase().includes('alice')) ||
        (userEmail && userEmail.toLowerCase().includes('alice'));

      const data = {
        ...updatedAvailability,
        lastUpdated: new Date().toISOString(),
        updatedBy: isAliceUser ? 'Alice' : matchName
      };

      await setDoc(doc(db, 'availability', availabilityDocName), data, { merge: true });
      setSavedAvailability(data);
      setTimeModalOpen(false);
      setSelectedDay(null);
      setSelectedWorkerForTime(null);
      setUnavailableTimes([]);
    } catch (err) {
      console.error('Error saving availability:', err);
      alert('Error saving availability: ' + err.message);
    }
  };

  // Add new time range
  const handleAddTimeRange = () => {
    setUnavailableTimes([...unavailableTimes, { startTime: '09:00', endTime: '17:00' }]);
  };

  // Remove time range
  const handleRemoveTimeRange = (index) => {
    setUnavailableTimes(unavailableTimes.filter((_, i) => i !== index));
  };

  // Update time range
  const handleTimeChange = (index, field, value) => {
    const updated = [...unavailableTimes];
    updated[index] = { ...updated[index], [field]: value };
    setUnavailableTimes(updated);
  };

  // Check if current user can edit a specific worker's availability
  const canEditWorkerAvailability = (workerName) => {
    const auth = getAuth();
    const user = auth.currentUser;
    const userEmail = user ? user.email : '';
    const matchName = userFullName || userName;
    
    // Check if current user is Alice (handle both name formats)
    const isAliceUser = 
      matchName === 'Alice Margaretha Santos' || 
      matchName === 'Santos, Alice Margaretha' ||
      matchName === 'Alice' ||
      (matchName && matchName.toLowerCase().includes('alice')) ||
      (userEmail && userEmail.toLowerCase().includes('alice'));
    
    // Check if current user is the worker themselves
    const isCurrentWorker = isCurrentUserRow(workerName);
    
    // Allow editing if Alice (can change anyone) or if it's the worker themselves
    return isAliceUser || isCurrentWorker;
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

  // Get availability status for a worker and day
  const getAvailabilityStatus = (workerName, dayIndex) => {
    const workerKey = workerName.toLowerCase().replace(/[\s,]+/g, '_');
    const dayNames = ['sun', 'mon', 'tues', 'wed', 'thurs', 'fri', 'sat'];
    const dayKey = dayNames[dayIndex];
    
    const workerAvailability = crewAvailability[workerKey] || {};
    const dayAvailability = workerAvailability[dayKey] || {};
    const unavailableTimes = dayAvailability.unavailableTimes || [];
    
    // Check if this day has passed
    const today = new Date();
    const currentDay = today.getDay();
    const isPastDay = dayIndex < currentDay;
    
    // Check if worker is assigned to any appointments on this day
    const isAssignedToAppointment = checkIfWorkerAssignedToAppointment(workerName, dayIndex);
    
    // Return null for past days (no highlighting) or the actual availability for current/future days
    if (isPastDay) return null;
    if (isAssignedToAppointment) return 'assigned';
    
    // If there are unavailable times, the worker is partially unavailable
    if (unavailableTimes.length > 0) {
      return { unavailableTimes, isPartiallyUnavailable: true };
    }
    
    return true; // Fully available
  };

  // Get unavailable times for display
  const getUnavailableTimesDisplay = (workerName, dayIndex) => {
    const status = getAvailabilityStatus(workerName, dayIndex);
    if (status && typeof status === 'object' && status.unavailableTimes) {
      return status.unavailableTimes;
    }
    return [];
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

  // Load saved selected dates from Firebase and localStorage on component mount
  useEffect(() => {
    const loadSavedDates = async () => {
      try {
        fetchSavedAvailability();
      } catch (error) {
        console.error('Error loading saved dates:', error);
      }
    };
    loadSavedDates();
  }, []);

  // Fetch all users from Firebase to populate workers list
  useEffect(() => {
    const fetchWorkers = async () => {
      try {
        const db = getFirestore();
        const q = query(collection(db, 'users'));
        const querySnapshot = await getDocs(q);
        
        const workers = [];
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          // Get firstName and lastName from database
          const firstName = data.firstName || '';
          const lastName = data.lastName || '';
          
          // Convert "Employee" to "Crew" for backward compatibility
          let role = data.role || data.type || 'Crew';
          if (role === 'Employee') role = 'Crew';
          
          // Format name as "LastName, FirstName" or fallback to fullName
          let name = '';
          if (firstName && lastName) {
            name = `${lastName}, ${firstName}`.trim();
          } else if (data.fullName) {
            name = data.fullName;
          } else if (data.username) {
            name = data.username;
          } else {
            name = data.name || 'Unknown';
          }
          
          // Map role to type for display
          let type = role;
          if (role === 'HR') {
            type = 'HR';
          } else if (role === 'Manager' || role === 'Admin') {
            type = 'Senior Supervisor';
          } else if (role === 'Scheduler') {
            type = 'Scheduler';
          } else {
            type = 'Dock Worker';
          }
          
          // Special handling for Alice - always set as Senior Supervisor
          const firstNameLower = firstName.toLowerCase();
          const lastNameLower = lastName.toLowerCase();
          const fullNameLower = name.toLowerCase();
          const emailLower = (data.email || '').toLowerCase();
          
          const isAlice = 
            firstNameLower.includes('alice') ||
            lastNameLower.includes('alice') ||
            fullNameLower.includes('alice') ||
            emailLower.includes('alice') ||
            (lastNameLower.includes('santos') && firstNameLower.includes('alice')) ||
            (fullNameLower.includes('santos') && fullNameLower.includes('alice'));
          
          if (isAlice) {
            type = 'Senior Supervisor';
          }
          
          workers.push({
            name: name,
            type: type,
            firstName: firstName,
            lastName: lastName,
            email: data.email || '',
            role: role
          });
        });
        
        // Sort workers alphabetically by last name, then first name
        workers.sort((a, b) => {
          const lastNameA = a.lastName || '';
          const lastNameB = b.lastName || '';
          if (lastNameA === lastNameB) {
            const firstNameA = a.firstName || '';
            const firstNameB = b.firstName || '';
            return firstNameA.localeCompare(firstNameB);
          }
          return lastNameA.localeCompare(lastNameB);
        });
        
        setAllWorkers(workers);
      } catch (error) {
        console.error('Error fetching workers:', error);
        // Fallback to empty array or default workers if needed
        setAllWorkers([]);
      }
    };
    
    fetchWorkers();
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
            // Prefer firstName + lastName, fallback to fullName
            // Format as "LastName, FirstName" to match worker name format
            let fullName = '';
            if (userData.firstName && userData.lastName) {
              fullName = `${userData.lastName}, ${userData.firstName}`.trim();
            } else if (userData.fullName) {
              fullName = userData.fullName;
            } else {
              fullName = name;
            }
            setUserFullName(fullName);
            console.log('Debug - set userFullName to:', fullName);
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

  return (
    <div className="crew-availability-container">
      {/* User-specific message */}
      {(() => {
        const auth = getAuth();
        const user = auth.currentUser;
        const userEmail = user ? user.email : '';
        const matchName = userFullName || userName;
        
        // Check if current user is Alice
        const isAliceUser = 
          matchName === 'Alice Margaretha Santos' || 
          matchName === 'Alice' ||
          (matchName && matchName.toLowerCase().includes('alice')) ||
          (userEmail && userEmail.toLowerCase().includes('alice'));
        
        if (!isAliceUser) {
          return (
            <div className="user-message">
              <div className="user-message-text">
                You can view and manage your own availability schedule below. Click on a day to set times when you are not available.
              </div>
            </div>
          );
        }
        return null;
      })()}

      {/* Time Input Modal */}
      {timeModalOpen && (
        <div className="time-modal-overlay" onClick={() => setTimeModalOpen(false)}>
          <div className="time-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="time-modal-header">
              <h3>Set Unavailable Times</h3>
              <button className="time-modal-close" onClick={() => setTimeModalOpen(false)}>×</button>
            </div>
            <div className="time-modal-body">
              <p className="time-modal-instruction">
                Enter the times when you are <strong>not available</strong> on {selectedWorkerForTime && (() => {
                  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                  return dayNames[selectedDay];
                })()}.
              </p>
              <p className="time-modal-note">
                If you remove all time ranges, you will be marked as available for the entire day. Click "Remove" on a time range to delete it.
              </p>
              
              {unavailableTimes.map((time, index) => (
                <div key={index} className="time-range-input">
                  <div className="time-input-group">
                    <label>From:</label>
                    <input
                      type="time"
                      value={time.startTime}
                      onChange={(e) => handleTimeChange(index, 'startTime', e.target.value)}
                    />
                  </div>
                  <div className="time-input-group">
                    <label>To:</label>
                    <input
                      type="time"
                      value={time.endTime}
                      onChange={(e) => handleTimeChange(index, 'endTime', e.target.value)}
                    />
                  </div>
                  <button
                    className="remove-time-btn"
                    onClick={() => handleRemoveTimeRange(index)}
                  >
                    Remove
                  </button>
                </div>
              ))}
              
              <button className="add-time-btn" onClick={handleAddTimeRange}>
                + Add Another Time Range
              </button>
            </div>
            <div className="time-modal-footer">
              <button className="cancel-btn" onClick={() => setTimeModalOpen(false)}>
                Cancel
              </button>
              <button className="save-time-btn" onClick={handleSaveUnavailableTimes}>
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="crew-availability-table-wrapper">
        <table className="crew-availability-table">
          <thead>
            <tr>
              <th colSpan="8" className="table-title">
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
              <th className="crew-header">
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
                    >
                      {day}<br />
                      <span className="date-number">
                        {date.getDate()}
                      </span>
                    </th>
                  );
                });
              })()}
            </tr>
          </thead>
          <tbody>
            {/* Show only the current user's row */}
            {(() => {
              // Get logged-in user's information for filtering
              const auth = getAuth();
              const user = auth.currentUser;
              const userEmail = user ? user.email : '';
              const matchName = userFullName || userName;
              
              // Find the current user in the workers list (all users see only their own row)
              const currentWorker = allWorkers.find(worker => {
                const workerNameLower = worker.name.toLowerCase();
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
                if (userEmailLower && worker.email && userEmailLower === worker.email.toLowerCase()) return true;
                if (userEmailLower.includes(workerNameLower.replace(/[\s,]+/g, ''))) return true;
                
                const emailUsername = userEmail.split('@')[0].toLowerCase();
                if (workerNameLower.includes(emailUsername)) return true;
                
                return false;
              });
              
              // Show only the current worker's row, or empty array if not found
              const workersToShow = currentWorker ? [currentWorker] : [];
              
              // Get today's day index (0=Sun, 1=Mon, ..., 6=Sat)
              const todayIdx = new Date().getDay();
              const dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
              
              // Show filtered workers in the table
              return workersToShow.map((worker, idx) => {
                const canEdit = canEditWorkerAvailability(worker.name);
                const isCurrentUser = isCurrentUserRow(worker.name);
                
                return (
                  <tr key={worker.name}>
                    <td className={`crew-name-cell ${isCurrentUser ? 'current-user' : ''}`}>
                      <div className="crew-name">
                        {worker.name}
                      </div>
                      {isCurrentUser && (
                        <div className="your-row">
                          Current User
                        </div>
                      )}
                    </td>
                    {Array(7).fill(null).map((_, i) => {
                      const availabilityStatus = getAvailabilityStatus(worker.name, i);
                      const unavailableTimes = getUnavailableTimesDisplay(worker.name, i);
                      const isToday = i === todayIdx;
                      const isPastDay = i < todayIdx;
                      
                      let statusClass = '';
                      let statusText = '';
                      
                      if (isPastDay) {
                        statusClass = 'availability-past';
                        statusText = 'Past Day';
                      } else if (availabilityStatus === 'assigned') {
                        statusClass = 'availability-assigned';
                        statusText = 'On Duty';
                      } else if (availabilityStatus && typeof availabilityStatus === 'object' && availabilityStatus.unavailableTimes) {
                        statusClass = 'availability-partial';
                        statusText = unavailableTimes.length > 0 ? `${unavailableTimes.length} Block${unavailableTimes.length > 1 ? 's' : ''}` : 'Available';
                      } else if (availabilityStatus === true) {
                        statusClass = 'availability-available';
                        statusText = 'Available';
                      } else {
                        statusClass = 'availability-unavailable';
                        statusText = 'Unavailable';
                      }
                      
                      return (
                        <td 
                          key={i} 
                          className={`availability-cell ${canEdit && !isPastDay ? "clickable-availability" : "non-clickable"} ${statusClass}`}
                          onClick={canEdit && !isPastDay ? () => handleDayClick(worker.name, i) : undefined}
                          title={canEdit && !isPastDay ? `Click to set unavailable times for ${dayNames[i]}` : isPastDay ? 'Past day - no editing allowed' : 'Only Alice can change worker availability'}
                        >
                          <div className="availability-status">
                            {statusText}
                          </div>
                          {unavailableTimes.length > 0 && !isPastDay && (
                            <div className="unavailable-times-list">
                              {unavailableTimes.slice(0, 2).map((time, idx) => (
                                <div key={idx} className="time-range-display">
                                  {convertToAMPM(time.startTime)} - {convertToAMPM(time.endTime)}
                                </div>
                              ))}
                              {unavailableTimes.length > 2 && (
                                <div className="time-range-display more-times">
                                  +{unavailableTimes.length - 2} more
                                </div>
                              )}
                            </div>
                          )}
                          {isToday && (
                            <div className="today-indicator">
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

      {/* All Workers Availability Overview - Only visible to Alice */}
      {(() => {
        // Check if current user is Alice
        const auth = getAuth();
        const user = auth.currentUser;
        const userEmail = user ? user.email : '';
        const matchName = userFullName || userName;
        
        const isAliceUser = 
          matchName === 'Alice Margaretha Santos' || 
          matchName === 'Santos, Alice Margaretha' ||
          matchName === 'Santos, Alice Margaretha' ||
          matchName === 'Alice' ||
          (matchName && matchName.toLowerCase().includes('alice')) ||
          (userEmail && userEmail.toLowerCase().includes('alice'));
        
        // Only show if user is Alice
        if (!isAliceUser) {
          return null;
        }
        
        const today = new Date();
        const currentDay = today.getDay();
        const dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
        
        // Calculate the start of the current week (Sunday)
        const startOfWeek = new Date(today);
        const dayOfWeek = today.getDay();
        startOfWeek.setDate(today.getDate() - dayOfWeek);

        return (
          <div className="comprehensive-worker-details">
            <div className="details-header">
              <h3>All Workers Availability Overview</h3>
              <p>Comprehensive view of all crew members' availability for the current week</p>
            </div>
            
            <div className={`worker-cards-container ${selectedWorker ? 'has-selected' : ''}`}>
              {allWorkers && allWorkers.length > 0 ? (
                allWorkers.map((worker, idx) => {
                  // Hide other cards when one is selected
                  const isSelected = selectedWorker === worker.name;
                  const shouldShow = !selectedWorker || isSelected;
                  
                  return (
                    <div key={worker.name || idx} className={shouldShow ? '' : 'hidden-worker-card'}>
                    {(() => {
                      const workerKey = worker.name.toLowerCase().replace(/[\s,]+/g, '_');
                      const workerAvailability = crewAvailability[workerKey] || {};
                      
                      // Calculate availability stats
                      const availabilityStats = dayNames.map((day, dayIndex) => {
                        const dayKey = day.toLowerCase().replace(/[\s,]+/g, '_');
                        const dayAvailability = workerAvailability[dayKey] || {};
                        const unavailableTimes = dayAvailability.unavailableTimes || [];
                        const isAvailable = unavailableTimes.length === 0;
                        const isPastDay = dayIndex < currentDay;
                        const isAssigned = checkIfWorkerAssignedToAppointment(worker.name, dayIndex);
                        
                        return {
                          day,
                          dayIndex,
                          isAvailable: isPastDay ? null : isAvailable,
                          unavailableTimes,
                          isAssigned,
                          isPastDay,
                          isToday: dayIndex === currentDay
                        };
                      });

                      // Count only future days (exclude past days)
                      const futureDays = availabilityStats.filter(stat => !stat.isPastDay);
                      const availableDays = futureDays.filter(stat => stat.isAvailable === true && !stat.isAssigned).length;
                      const unavailableDays = futureDays.filter(stat => stat.isAvailable === false || (stat.unavailableTimes && stat.unavailableTimes.length > 0)).length;
                      const assignedDays = availabilityStats.filter(stat => stat.isAssigned).length;
                      const totalFutureDays = futureDays.length;

                      // Calculate overall status
                      // If no unavailable times logged for any future day, treat all future days as available
                      const hasAnyUnavailableTimes = futureDays.some(stat => stat.unavailableTimes && stat.unavailableTimes.length > 0);
                      
                      let statusIndicator = '';
                      let statusClass = '';
                      if (assignedDays > 0) {
                        statusIndicator = 'On Duty';
                        statusClass = 'status-on-duty';
                      } else if (!hasAnyUnavailableTimes && totalFutureDays >= 5) {
                        // If no unavailable times logged and 5+ future days, show as Highly Available
                        statusIndicator = 'Highly Available';
                        statusClass = 'status-highly-available';
                      } else if (!hasAnyUnavailableTimes && totalFutureDays >= 3) {
                        // If no unavailable times logged and 3+ future days, show as Available
                        statusIndicator = 'Available';
                        statusClass = 'status-available';
                      } else if (!hasAnyUnavailableTimes && totalFutureDays >= 1) {
                        // If no unavailable times logged but only 1-2 future days, show as Available (not Limited)
                        statusIndicator = 'Available';
                        statusClass = 'status-available';
                      } else if (availableDays >= 5) {
                        statusIndicator = 'Highly Available';
                        statusClass = 'status-highly-available';
                      } else if (availableDays >= 3) {
                        statusIndicator = 'Available';
                        statusClass = 'status-available';
                      } else if (availableDays >= 1) {
                        statusIndicator = 'Limited Availability';
                        statusClass = 'status-limited';
                      } else {
                        statusIndicator = 'Unavailable';
                        statusClass = 'status-unavailable';
                      }

                      return (
                        <div 
                          key={worker.name} 
                          className={`worker-card ${isSelected ? 'selected' : ''}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedWorker(isSelected ? null : worker.name);
                          }}
                        >
                          {selectedWorker === worker.name ? (
                            <>
                              <div className="worker-card-header">
                                <div className="worker-name-and-status">
                                  <h4 className="worker-name">{worker.name}</h4>
                                  <span className={`status-indicator ${statusClass}`}>{statusIndicator}</span>
                                </div>
                                <div className="worker-header-right">
                                  <span className="worker-type">{worker.type}</span>
                                  <button 
                                    className="close-worker-details-btn"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setSelectedWorker(null);
                                    }}
                                    title="Close and view all workers"
                                  >
                                    × Close
                                  </button>
                                </div>
                              </div>
                              
                              {/* Quick Stats - Always Visible */}
                              <div className="quick-stats">
                                <div className="quick-stat">
                                  <span className="quick-stat-number">{availableDays}</span>
                                  <span className="quick-stat-label">Available</span>
                                </div>
                                <div className="quick-stat">
                                  <span className="quick-stat-number">{assignedDays}</span>
                                  <span className="quick-stat-label">On Duty</span>
                                </div>
                                <div className="quick-stat">
                                  <span className="quick-stat-number">{unavailableDays}</span>
                                  <span className="quick-stat-label">Unavailable</span>
                                </div>
                              </div>
                              
                              <div className="worker-details">
                              <div className="availability-summary">
                                <div className="summary-stats">
                                  <div className="stat-item available">
                                    <span className="stat-number">{availableDays}</span>
                                    <span className="stat-label">Available</span>
                                  </div>
                                  <div className="stat-item unavailable">
                                    <span className="stat-number">{unavailableDays}</span>
                                    <span className="stat-label">Unavailable</span>
                                  </div>
                                  <div className="stat-item assigned">
                                    <span className="stat-number">{assignedDays}</span>
                                    <span className="stat-label">On Duty</span>
                                  </div>
                                </div>
                              </div>

                              <div className="weekly-schedule">
                                <div className="schedule-header">
                                  Weekly Schedule Details
                                </div>
                                <div className="calendar-grid-container">
                                  {availabilityStats.slice(0, 7).map((stat, dayIdx) => {
                                    const date = new Date(startOfWeek);
                                    date.setDate(startOfWeek.getDate() + dayIdx);
                                    const fullDayName = stat.day;
                                    
                                    let statusClass = '';
                                    let statusText = '';
                                    
                                    if (stat.isPastDay) {
                                      statusClass = 'past-day';
                                      statusText = 'Past Day';
                                    } else if (stat.isAssigned) {
                                      statusClass = 'assigned';
                                      statusText = 'On Duty';
                                    } else if (stat.isAvailable === true) {
                                      statusClass = 'available';
                                      statusText = 'Available All Day';
                                    } else if (stat.unavailableTimes && stat.unavailableTimes.length > 0) {
                                      statusClass = 'partial-unavailable';
                                      statusText = 'Partially Available';
                                    } else {
                                      statusClass = 'unavailable';
                                      statusText = 'Unavailable All Day';
                                    }

                                    // Calculate available times (complement of unavailable times)
                                    const calculateAvailableTimes = () => {
                                      if (!stat.unavailableTimes || stat.unavailableTimes.length === 0) {
                                        return stat.isAvailable ? [{ start: '00:00', end: '23:59', label: `${convertToAMPM('00:00')} - ${convertToAMPM('23:59')}` }] : [];
                                      }
                                      
                                      const unavailable = stat.unavailableTimes
                                        .map(t => ({ start: t.startTime, end: t.endTime }))
                                        .sort((a, b) => a.start.localeCompare(b.start));
                                      
                                      const available = [];
                                      let currentTime = '00:00';
                                      
                                      unavailable.forEach(block => {
                                        if (currentTime < block.start) {
                                          available.push({
                                            start: currentTime,
                                            end: block.start,
                                            label: `${convertToAMPM(currentTime)} - ${convertToAMPM(block.start)}`
                                          });
                                        }
                                        currentTime = block.end > currentTime ? block.end : currentTime;
                                      });
                                      
                                      if (currentTime < '23:59') {
                                        available.push({
                                          start: currentTime,
                                          end: '23:59',
                                          label: `${convertToAMPM(currentTime)} - ${convertToAMPM('23:59')}`
                                        });
                                      }
                                      
                                      return available;
                                    };

                                    const availableTimes = calculateAvailableTimes();

                                    return (
                                      <div key={dayIdx} className={`calendar-day-cell ${statusClass} ${stat.isToday ? 'today-cell' : ''}`}>
                                        <div className="calendar-cell-header">
                                          <div className="calendar-day-name">{fullDayName.substring(0, 3)}</div>
                                          <div className="calendar-day-date">{date.getDate()}</div>
                                          {stat.isToday && <div className="calendar-today-badge">TODAY</div>}
                                        </div>
                                        
                                        <div className="calendar-cell-status">
                                          <span className={`calendar-status-badge ${statusClass}`}>{statusText}</span>
                                        </div>
                                        
                                        <div className="calendar-cell-content">
                                          {stat.isPastDay ? (
                                            <div className="calendar-past-message">Past</div>
                                          ) : stat.isAssigned ? (
                                            <div className="calendar-assigned-message">
                                              <span className="calendar-icon">✓</span>
                                              <span>On Duty</span>
                                            </div>
                                          ) : (
                                            <>
                                              {stat.unavailableTimes && stat.unavailableTimes.length > 0 && (
                                                <div className="calendar-time-block unavailable-block">
                                                  <div className="calendar-block-label">✕ Unavailable</div>
                                                  <div className="calendar-time-list">
                                                    {stat.unavailableTimes.map((time, timeIdx) => (
                                                      <div key={timeIdx} className="calendar-time-item unavailable-time">
                                                        {convertToAMPM(time.startTime)} - {convertToAMPM(time.endTime)}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {availableTimes.length > 0 && (
                                                <div className="calendar-time-block available-block">
                                                  <div className="calendar-block-label">✓ Available</div>
                                                  <div className="calendar-time-list">
                                                    {availableTimes.map((time, timeIdx) => (
                                                      <div key={timeIdx} className="calendar-time-item available-time">
                                                        {time.label}
                                                      </div>
                                                    ))}
                                                  </div>
                                                </div>
                                              )}
                                              
                                              {(!stat.unavailableTimes || stat.unavailableTimes.length === 0) && stat.isAvailable === false && (
                                                <div className="calendar-no-available">
                                                  <span className="calendar-icon">✕</span>
                                                  <span>Unavailable</span>
                                                </div>
                                              )}
                                            </>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              <div className="worker-actions">
                                <button 
                                  className="edit-availability-btn"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    // Scroll to table and highlight this worker's row
                                    const tableWrapper = document.querySelector('.crew-availability-table-wrapper');
                                    if (tableWrapper) {
                                      tableWrapper.scrollIntoView({ behavior: 'smooth' });
                                    }
                                  }}
                                >
                                  Edit Availability
                                </button>
                              </div>
                              </div>
                            </>
                          ) : (
                            <div className="worker-name-only">
                              <h4 className="worker-name">{worker.name}</h4>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                  );
                })
              ) : (
                <div className="no-workers-message">
                  <p>No workers found. Workers will appear here once they are added to the system.</p>
                </div>
              )}
            </div>
          </div>
        );
      })()}
      
      {/* Save Button */}
      <div className="save-availability-btn">
        <button 
          onClick={handleSaveAvailability}
          disabled={isSaving}
        >
          {isSaving ? 'Saving...' : 'Save Availability'}
        </button>
      </div>
    </div>
  );
};

export default CrewAvailabilityTable;
