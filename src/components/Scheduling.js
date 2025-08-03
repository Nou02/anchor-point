import React, { useState, useEffect } from 'react';
import './Scheduling.css';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import '../firebase/config'; // Make sure this imports your firebase config


const Scheduling = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDates, setSelectedDates] = useState([]); // Array of selected dates
  const [view, setView] = useState('calendar'); // 'calendar' or 'table'
  const [formData, setFormData] = useState({});
  const [savedEntries, setSavedEntries] = useState([]);
  const [userName, setUserName] = useState('');
  const [userFullName, setUserFullName] = useState('');

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

  // Navigate to previous month
  const goToPreviousMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth - 1, 1));
  };

  // Navigate to next month
  const goToNextMonth = () => {
    setCurrentDate(new Date(currentYear, currentMonth + 1, 1));
  };

  // Handle date selection (toggle multiple)
  const handleDateClick = (day, isCurrentMonth) => {
    if (isCurrentMonth && day) {
      const clickedDate = new Date(currentYear, currentMonth, day);
      setSelectedDates(prev => {
        const exists = prev.some(date =>
          date.getDate() === clickedDate.getDate() &&
          date.getMonth() === clickedDate.getMonth() &&
          date.getFullYear() === clickedDate.getFullYear()
        );
        if (exists) {
          // Remove if already selected
          return prev.filter(date =>
            !(date.getDate() === clickedDate.getDate() &&
              date.getMonth() === clickedDate.getMonth() &&
              date.getFullYear() === clickedDate.getFullYear())
          );
        } else {
          // Add new selected date
          return [...prev, clickedDate];
        }
      });
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
    // Ensure all fields are present and defaulted
    const data = {
      name: formData[idx]?.name || '',
      time: formData[idx]?.time || '',
      serviceType: formData[idx]?.serviceType || 'Mooring',
      vesselType: formData[idx]?.vesselType || 'Local',
      date: date.toISOString(),
      userEmail: user ? user.email : 'guest',
      timestamp: new Date().toISOString()
    };
    try {
      await addDoc(collection(db, 'appointments'), data);
      fetchSavedEntries();
      alert('Appointment saved!');
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
  // Mark appointment as done
  const handleDoneAppointment = async (id) => {
    const db = getFirestore();
    try {
      const appointmentRef = doc(db, 'appointments', id);
      await updateDoc(appointmentRef, { status: 'done' });
      setSavedEntries(prev => prev.filter(entry => entry.id !== id)); // Remove from local state instantly
      fetchSavedEntries();
    } catch (err) {
      alert('Error marking appointment as done: ' + err.message);
    }
  };

  useEffect(() => {
    fetchSavedEntries();
    // eslint-disable-next-line
  }, [selectedDates]);

  // Get logged-in user's name and full name from Firestore if needed
  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    const unsubscribe = auth.onAuthStateChanged(async user => {
      if (user) {
        let name = user.displayName || (user.email ? user.email.split('@')[0] : '');
        setUserName(name);
        // Try to get full name from Firestore if displayName is missing or is just email username
        if (!user.displayName || name === user.email.split('@')[0]) {
          // Query Firestore for user info by email
          const q = query(collection(db, 'users'), where('email', '==', user.email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            if (userData.fullName) {
              setUserFullName(userData.fullName);
            } else {
              setUserFullName(name);
            }
          } else {
            setUserFullName(name);
          }
        } else {
          setUserFullName(name);
        }
      } else {
        setUserName('');
        setUserFullName('');
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

  const dayVesselTypes = getDayVesselTypes();
  const calendarDays = generateCalendarDays();

return (
    <div className="scheduling-container" style={{ flexDirection: 'column', alignItems: 'center', gap: '24px', maxHeight: '100vh', overflowY: 'auto' }}>
      {/* Main content area: calendar or table */}
      {view === 'calendar' ? (
        <div style={{ display: 'flex', flexDirection: 'row', justifyContent: 'center', alignItems: 'flex-start', gap: '32px', width: '100%' }}>
          <div className="calendar-wrapper" style={{ margin: '0', flex: '0 0 600px' }}>
            <div className="calendar-header" style={{ position: 'sticky', top: 0, background: '#eaf3ff', zIndex: 20, paddingTop: '8px', boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
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
              {/* Weekday headers - sticky below calendar header */}
              <div className="weekday-header" style={{ position: 'sticky', top: 56, background: '#eaf3ff', zIndex: 15, boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
                <div className="weekday">Sun</div>
                <div className="weekday">Mon</div>
                <div className="weekday">Tues</div>
                <div className="weekday">Wed</div>
                <div className="weekday">Thurs</div>
                <div className="weekday">Fri</div>
                <div className="weekday">Sat</div>
              </div>
              {/* Calendar days */}
              <div className="calendar-days" style={{ marginTop: '88px', minHeight: '420px', display: 'grid', gridTemplateRows: 'repeat(6, 1fr)', gridTemplateColumns: 'repeat(7, 1fr)', gap: '2px' }}>
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
                  return (
                    <div
                      key={index}
                      className={`calendar-day ${
                        dayData.isCurrentMonth ? 'current-month' : 'other-month'
                      } ${dayData.isToday ? 'today' : ''} ${
                        dayData.isSelected ? 'selected' : ''
                      }`}
                      style={{ ...bgColor ? { background: bgColor } : {}, minHeight: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      onClick={() => handleDateClick(dayData.day, dayData.isCurrentMonth)}
                    >
                      {dayData.day}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
          {/* Selected date info beside calendar */}
          {selectedDates.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="selected-date-info" style={{ minWidth: '260px', maxWidth: '320px', marginTop: 0, background: '#f5f7fa', paddingTop: '8px' }}>
                <h3>Selected Date{selectedDates.length > 1 ? 's' : ''}:</h3>
                <ul style={{ paddingLeft: '18px', margin: 0 }}>
                  {selectedDates.map((date, idx) => (
                    <li key={idx}>{date.toDateString()}</li>
                  ))}
                </ul>
                <p>No appointments scheduled for this date.</p>
              </div>
              {/* Only show one form at a time for selected dates */}
              <div className="selected-dates-container" style={{ background: '#f5f7fa', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
                <h4>Client Information</h4>
                {(() => {
                  // Find the first selected date that is not yet saved
                  const savedISO = savedEntries.map(e => e.date && e.date.slice(0, 10));
                  const firstUnfilledIdx = selectedDates.findIndex((date, idx) => {
                    const iso = date.toISOString().slice(0, 10);
                    return !savedISO.includes(iso);
                  });
                  if (firstUnfilledIdx === -1) {
                    return <p>All selected dates have saved appointments.</p>;
                  }
                  const date = selectedDates[firstUnfilledIdx];
                  return (
                    <div key={firstUnfilledIdx} style={{ marginBottom: '24px', borderBottom: '1px solid #e0e0e0', paddingBottom: '16px' }}>
                      <strong>Date:</strong> {date.toDateString()}
                      <form style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginTop: '8px' }} onSubmit={e => handleFormSubmit(e, firstUnfilledIdx, date)}>
                        <label>
                          Name:
                          <input type="text" name={`clientName_${firstUnfilledIdx}`} value={formData[firstUnfilledIdx]?.name || ''} onChange={e => handleInputChange(firstUnfilledIdx, 'name', e.target.value)} style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        </label>
                        <label>
                          Time:
                          <input type="time" name={`clientTime_${firstUnfilledIdx}`} value={formData[firstUnfilledIdx]?.time || ''} onChange={e => handleInputChange(firstUnfilledIdx, 'time', e.target.value)} style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }} required />
                        </label>
                        <label>
                          Type of Service:
                          <select name={`serviceType_${firstUnfilledIdx}`} value={formData[firstUnfilledIdx]?.serviceType || 'Mooring'} onChange={e => handleInputChange(firstUnfilledIdx, 'serviceType', e.target.value)} style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }} required>
                            <option value="Mooring">Mooring</option>
                            <option value="Unmooring">Unmooring</option>
                          </select>
                        </label>
                        <label>
                          Vessel Type:
                          <select name={`vesselType_${firstUnfilledIdx}`} value={formData[firstUnfilledIdx]?.vesselType || 'Local'} onChange={e => handleInputChange(firstUnfilledIdx, 'vesselType', e.target.value)} style={{ marginLeft: '8px', padding: '4px 8px', borderRadius: '4px', border: '1px solid #ccc' }} required>
                            <option value="Local">Local</option>
                            <option value="International">International</option>
                          </select>
                        </label>
                        <button type="submit" style={{ marginTop: '8px', padding: '6px 16px', borderRadius: '4px', background: '#2d3e5e', color: '#fff', border: 'none', cursor: 'pointer', alignSelf: 'flex-start' }}>Save</button>
                      </form>
                    </div>
                  );
                })()}
              </div>
              {/* New container: show saved entries for selected dates */}
              {savedEntries.length > 0 && (
                <div className="saved-entries-container" style={{ background: '#fff', borderRadius: '8px', padding: '16px', marginTop: '16px', boxShadow: '0 2px 8px rgba(0,0,0,0.04)', maxHeight: '220px', overflowY: 'auto' }}>
                  <h4>Saved Appointments</h4>
                  <ul style={{ paddingLeft: '18px', margin: 0 }}>
                    {savedEntries.map((entry, idx) => (
                      <li key={idx} style={{ marginBottom: '12px' }}>
                        <strong>Date:</strong> {entry.date ? new Date(entry.date).toDateString() : ''}<br />
                        <strong>Name:</strong> {entry.name || ''}<br />
                        <strong>Time:</strong> {entry.time || ''}<br />
                        <strong>Type of Service:</strong> {entry.serviceType || ''}<br />
                        <strong>Vessel Type:</strong> {entry.vesselType || ''}<br />
                        <strong>User:</strong> {entry.userEmail || ''}<br />
                        <button onClick={() => handleDoneAppointment(entry.id)} style={{ marginTop: '6px', padding: '4px 12px', borderRadius: '4px', background: '#28a745', color: '#fff', border: 'none', cursor: 'pointer' }}>Done</button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <div className="crew-availability-table-wrapper" style={{ margin: '0 auto' }}>
          <table className="crew-availability-table">
            <thead>
              <tr>
                <th>Crew</th>
                <th>Sun</th>
                <th>Mon</th>
                <th>Tues</th>
                <th>Wed</th>
                <th>Thurs</th>
                <th>Fri</th>
                <th>Sat</th>
              </tr>
            </thead>
            <tbody>
              {/* Only show the logged-in user's row if their name or email matches the provided workers list */}
              {(() => {
                // List of workers provided by the user
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
                // Get logged-in user's email from Firebase Auth
                const auth = getAuth();
                const user = auth.currentUser;
                const userEmail = user ? user.email : '';
                // Use full name for matching if available
                const matchName = userFullName || userName;
                // Match by full name, first name, or Gmail
                const getFirstName = name => name.split(/\s|,/)[0].toLowerCase();
                const userFirstName = getFirstName(matchName);
                const matched = workers.filter(row => {
                  const workerFirstName = getFirstName(row.name);
                  return (
                    row.name.toLowerCase() === matchName.toLowerCase() ||
                    workerFirstName === userFirstName ||
                    (userEmail && row.name.toLowerCase() === userEmail.toLowerCase())
                  );
                });
                // Get today's day index (0=Sun, 1=Mon, ..., 6=Sat)
                const todayIdx = new Date().getDay();
                return matched.length > 0
                  ? matched.map((row, idx) => (
                      <tr key={row.name}>
                        <td>{`${row.name} (${row.type})`}</td>
                        {Array(7).fill(null).map((_, i) => (
                          i === todayIdx
                            ? <td key={i} className="available" style={{ background: '#ffe066', color: '#2d3e5e', fontWeight: 'bold', textAlign: 'center' }}>Available</td>
                            : <td key={i}></td>
                        ))}
                      </tr>
                    ))
                  : (
                      <tr><td colSpan={8} style={{ textAlign: 'center', color: '#888' }}>No crew availability for your account.</td></tr>
                    );
              })()}
            </tbody>
          </table>
        </div>
      )}
      {/* Navigation buttons below */}
      <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginTop: '16px' }}>
        <button
          className="nav-arrow left-arrow"
          onClick={() => setView('calendar')}
          disabled={view === 'calendar'}
          style={{ opacity: view === 'calendar' ? 0.5 : 1 }}
        >
          ◀
        </button>
        <button
          className="nav-arrow right-arrow"
          onClick={() => setView('table')}
          disabled={view === 'table'}
          style={{ opacity: view === 'table' ? 0.5 : 1 }}
        >
          ▶
        </button>
      </div>
    </div>
  );
};

export default Scheduling; 