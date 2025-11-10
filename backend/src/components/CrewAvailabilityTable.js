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

  // Initialize Firestore database
  const db = getFirestore();

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

  // Handle crew availability toggle - workers can mark themselves unavailable, Alice can change anyone
  const handleAvailabilityToggle = async (workerName, dayIndex) => {
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
    
    // Check if current user is the worker themselves
    const isCurrentWorker = isCurrentUserRow(workerName);
    
    // Allow editing if Alice (can change anyone) or if it's the worker themselves (can mark themselves unavailable)
    if (!isAliceUser && !isCurrentWorker) {
      alert('Only Alice can change worker availability, or workers can mark themselves as unavailable.');
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
        updatedBy: isAliceUser ? 'Alice' : matchName
      };

      await setDoc(doc(db, 'availability', availabilityDocName), data, { merge: true });
      setSavedAvailability(data);
      console.log('Availability updated and saved to database');
    } catch (err) {
      console.error('Error saving availability:', err);
      alert('Error saving availability: ' + err.message);
    }
  };

  // Check if current user can edit a specific worker's availability
  const canEditWorkerAvailability = (workerName) => {
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

  // Check if Alice can edit a specific worker's availability (Alice has full control)
  const canAliceEditWorkerAvailability = (workerName) => {
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
    
    // Alice has full control over all worker availability
    return isAliceUser;
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
                You can view and manage your own availability schedule below.
              </div>
            </div>
          );
        }
        return null;
      })()}

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
            {/* Show workers based on user role - Alice sees all, others see only their row */}
            {(() => {
              // List of all workers
              const allWorkers = [
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
              
              // Get logged-in user's information for filtering
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
              
              // Filter workers based on user role
              let workersToShow;
              if (isAliceUser) {
                // Alice sees only her own row in the table
                const aliceWorker = allWorkers.find(worker => 
                  worker.name === 'Alice Margaretha Santos' || 
                  worker.name.toLowerCase().includes('alice')
                );
                workersToShow = aliceWorker ? [aliceWorker] : [];
              } else {
                // Regular workers see only their own row
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
                  if (userEmailLower.includes(workerNameLower.replace(/[\s,]+/g, ''))) return true;
                  
                  const emailUsername = userEmail.split('@')[0].toLowerCase();
                  if (workerNameLower.includes(emailUsername)) return true;
                  
                  return false;
                });
                
                // Show only the current worker's row, or empty array if not found
                workersToShow = currentWorker ? [currentWorker] : [];
              }
              
              // Get today's day index (0=Sun, 1=Mon, ..., 6=Sat)
              const todayIdx = new Date().getDay();
              const dayNames = ['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'];
              
              // Show filtered workers in the table
              return workersToShow.map((worker, idx) => {
                const canEdit = canEditWorkerAvailability(worker.name);
                const canAliceEdit = canAliceEditWorkerAvailability(worker.name);
                const isCurrentUser = isCurrentUserRow(worker.name); // Highlight if it's the current user's row
                const finalCanEdit = canEdit || canAliceEdit; // Allow editing if either condition is met
                
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
                      const isToday = i === todayIdx;
                      const isPastDay = i < todayIdx;
                      
                      return (
                        <td 
                          key={i} 
                          className={`availability-cell ${finalCanEdit ? "clickable-availability" : "non-clickable"} ${availabilityStatus === true ? "availability-available" : availabilityStatus === false ? "availability-unavailable" : availabilityStatus === 'assigned' ? "availability-assigned" : "availability-past"}`}
                          onClick={finalCanEdit && !isPastDay ? () => handleAvailabilityToggle(worker.name, i) : undefined}
                          title={finalCanEdit && !isPastDay ? `Click to mark ${availabilityStatus ? 'unavailable' : 'available'} for ${['Sun', 'Mon', 'Tues', 'Wed', 'Thurs', 'Fri', 'Sat'][i]}` : isPastDay ? 'Past day - no editing allowed' : 'Only Alice can change worker availability'}
                        >
                          <div className="availability-status">
                            {availabilityStatus === 'assigned' ? 'On Duty' : availabilityStatus === true ? 'Available' : availabilityStatus === false ? 'Not Available' : 'Past Day'}
                          </div>
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

      {/* Comprehensive Worker Details Container - Only for Alice */}
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
        
        if (isAliceUser) {
          // List of all workers
          const allWorkers = [
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
              
              <div className="worker-cards-container">
                {allWorkers.map((worker, idx) => {
                  const workerKey = worker.name.toLowerCase().replace(/[\s,]+/g, '_');
                  const workerAvailability = crewAvailability[workerKey] || {};
                  
                  // Calculate availability stats
                  const availabilityStats = dayNames.map((day, dayIndex) => {
                    const dayKey = day.toLowerCase().replace(/[\s,]+/g, '_');
                    const isAvailable = workerAvailability[dayKey] !== false;
                    const isPastDay = dayIndex < currentDay;
                    const isAssigned = checkIfWorkerAssignedToAppointment(worker.name, dayIndex);
                    
                    return {
                      day,
                      dayIndex,
                      isAvailable: isPastDay ? null : isAvailable,
                      isAssigned,
                      isPastDay,
                      isToday: dayIndex === currentDay
                    };
                  });

                  const availableDays = availabilityStats.filter(stat => stat.isAvailable === true).length;
                  const unavailableDays = availabilityStats.filter(stat => stat.isAvailable === false).length;
                  const assignedDays = availabilityStats.filter(stat => stat.isAssigned).length;
                  const totalActiveDays = availableDays + unavailableDays + assignedDays;

                  // Calculate overall status
                  let statusIndicator = '';
                  let statusClass = '';
                  if (assignedDays > 0) {
                    statusIndicator = 'On Duty';
                    statusClass = 'status-on-duty';
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
                      className={`worker-card ${selectedWorker === worker.name ? 'selected' : ''}`}
                      onClick={() => setSelectedWorker(selectedWorker === worker.name ? null : worker.name)}
                    >
                      {selectedWorker === worker.name ? (
                        <>
                          <div className="worker-card-header">
                            <div className="worker-name-and-status">
                              <h4 className="worker-name">{worker.name}</h4>
                              <span className={`status-indicator ${statusClass}`}>{statusIndicator}</span>
                            </div>
                            <span className="worker-type">{worker.type}</span>
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
                            <div className="schedule-grid">
                              {availabilityStats.slice(0, 7).map((stat, dayIdx) => {
                                const date = new Date(startOfWeek);
                                date.setDate(startOfWeek.getDate() + dayIdx);
                                
                                let statusClass = '';
                                
                                if (stat.isPastDay) {
                                  statusClass = 'past-day';
                                } else if (stat.isAssigned) {
                                  statusClass = 'assigned';
                                } else if (stat.isAvailable === true) {
                                  statusClass = 'available';
                                } else if (stat.isAvailable === false) {
                                  statusClass = 'unavailable';
                                }

                                return (
                                  <div key={dayIdx} className={`schedule-day ${statusClass} ${stat.isToday ? 'today' : ''}`}>
                                    <div className="day-name">{stat.day.substring(0, 3)}</div>
                                    <div className="day-date">{date.getDate()}</div>
                                    {stat.isToday && <div className="today-badge">TODAY</div>}
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
                })}
              </div>
            </div>
          );
        }
        return null;
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
