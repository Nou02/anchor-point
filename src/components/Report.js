import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './Report.css';

const Report = () => {
  const [activeContainer, setActiveContainer] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAliceAuthorized, setIsAliceAuthorized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [selectedDates, setSelectedDates] = useState([]);
  const [selectedDate, setSelectedDate] = useState(null);
  const [tableData, setTableData] = useState({
    portLocation: '',
    voyageNo: '',
    vesselName: '',
    purposeOfCall: '',
    workActivities: [
      { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' },
      { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' },
      { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' }
    ]
  });

  const checkAliceAuthorization = (user) => {
    if (!user) return false;
    const userName = user.displayName || user.email?.split('@')[0] || '';
    const userEmail = user.email || '';
    return userName === 'Alice Margaretha Santos' || 
           userName.toLowerCase().includes('alice') ||
           userEmail.toLowerCase().includes('alice');
  };

  const clearWorkActivityData = () => {
    setTableData({
      portLocation: '',
      voyageNo: '',
      vesselName: '',
      purposeOfCall: '',
      workActivities: [
        { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' },
        { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' },
        { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' }
      ]
    });
    setSaveMessage('Form cleared successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  const saveWorkActivityData = async (date, data) => {
    try {
      const db = getFirestore();
      const dateString = date.toISOString().split('T')[0];
      const docRef = doc(db, 'workActivities', dateString);
      await setDoc(docRef, {
        date: dateString,
        portLocation: data.portLocation,
        voyageNo: data.voyageNo,
        vesselName: data.vesselName,
        purposeOfCall: data.purposeOfCall,
        workActivities: data.workActivities,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser?.email || currentUser?.displayName || 'Unknown'
      });
      return true;
    } catch (error) {
      console.error('Error saving work activity data:', error);
      return false;
    }
  };

  // Load work activity data from database
  const loadWorkActivityData = async (date) => {
    try {
      const db = getFirestore();
      const dateString = date.toISOString().split('T')[0];
      const docRef = doc(db, 'workActivities', dateString);
      const docSnap = await getDoc(docRef);
      
      if (docSnap.exists()) {
        const data = docSnap.data();
        setTableData({
          portLocation: data.portLocation || '',
          voyageNo: data.voyageNo || '',
          vesselName: data.vesselName || '',
          purposeOfCall: data.purposeOfCall || '',
          workActivities: data.workActivities || [
            { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' },
            { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' },
            { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' }
          ]
        });
        console.log('Work activity data loaded successfully for date:', dateString);
        return true;
      } else {
        // Reset to default if no data found
        setTableData({
          portLocation: '',
          voyageNo: '',
          vesselName: '',
          purposeOfCall: '',
          workActivities: [
            { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' },
            { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' },
            { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' }
          ]
        });
        return false;
      }
    } catch (error) {
      console.error('Error loading work activity data:', error);
      return false;
    }
  };

  // Auto-save function that saves data whenever tableData changes
  const autoSaveData = async (data) => {
    if (!selectedDate) return;
    
    try {
      const db = getFirestore();
      const dateString = selectedDate.toISOString().split('T')[0];
      const docRef = doc(db, 'workActivities', dateString);
      
      await setDoc(docRef, {
        date: dateString,
        portLocation: data.portLocation,
        voyageNo: data.voyageNo,
        vesselName: data.vesselName,
        purposeOfCall: data.purposeOfCall,
        workActivities: data.workActivities,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser?.email || currentUser?.displayName || 'Unknown'
      });
      
      console.log('Data auto-saved for date:', dateString);
    } catch (error) {
      console.error('Error auto-saving data:', error);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const isAlice = checkAliceAuthorization(user);
        setIsAliceAuthorized(isAlice);
      } else {
        setCurrentUser(null);
        setIsAliceAuthorized(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const loadSelectedDates = () => {
      try {
        const savedDates = localStorage.getItem('schedulingSelectedDates');
        if (savedDates) {
          const parsedDates = JSON.parse(savedDates).map(dateStr => new Date(dateStr));
          setSelectedDates(parsedDates);
        }
      } catch (error) {
        console.error('Error loading selected dates:', error);
      }
    };
    
    loadSelectedDates();
    const interval = setInterval(loadSelectedDates, 2000);
    return () => clearInterval(interval);
  }, []);

  // Load work activity data when a date is selected
  useEffect(() => {
    if (selectedDate) {
      loadWorkActivityData(selectedDate);
    }
  }, [selectedDate]);

  // Auto-save data whenever tableData changes
  useEffect(() => {
    if (selectedDate && tableData) {
      const timeoutId = setTimeout(() => {
        autoSaveData(tableData);
      }, 1000); // Debounce auto-save by 1 second

      return () => clearTimeout(timeoutId);
    }
  }, [tableData, selectedDate]);

  return (
    <div className="report-page-bg" style={{ minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: '20px' }}>
        {activeContainer === 0 && (
          <div style={{
            background: 'white',
            borderRadius: '20px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            padding: '50px',
            margin: '40px auto',
            maxWidth: '1400px',
            minWidth: '1200px',
            height: 'calc(100vh - 80px)',
            overflow: 'auto'
          }}>
            {/* Selected Dates from Scheduling */}
            {selectedDates.length > 0 ? (
              <div style={{
                background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                borderRadius: '16px',
                padding: '30px',
                border: '1px solid #dee2e6',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)',
                marginBottom: '30px'
              }}>
                <h3 style={{
                  color: '#2F3B70',
                  fontSize: '1.4rem',
                  fontWeight: '700',
                  marginBottom: '25px',
                  textAlign: 'center',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}>
                  Selected Dates from Scheduling
                </h3>
                
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                  gap: '15px'
                }}>
                  {selectedDates.map((date, index) => (
                    <div
                      key={index}
                      style={{
                        background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                        borderRadius: '12px',
                        padding: '20px',
                        border: '2px solid #2196f3',
                        boxShadow: '0 4px 15px rgba(33, 150, 243, 0.15)',
                        textAlign: 'center',
                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                        cursor: 'pointer',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onClick={() => setSelectedDate(date)}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-4px) scale(1.02)';
                        e.target.style.boxShadow = '0 8px 25px rgba(33, 150, 243, 0.25)';
                        e.target.style.borderColor = '#1976d2';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0) scale(1)';
                        e.target.style.boxShadow = '0 4px 15px rgba(33, 150, 243, 0.15)';
                        e.target.style.borderColor = '#2196f3';
                      }}
                    >
                      <div style={{
                        fontSize: '1.2rem',
                        fontWeight: '700',
                        color: '#1976d2',
                        marginBottom: '10px',
                        textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                      }}>
                        {date.toDateString()}
                      </div>
                      <div style={{
                        fontSize: '0.95rem',
                        color: '#6c757d',
                        fontWeight: '500',
                        lineHeight: '1.4'
                      }}>
                        {date.toLocaleDateString('en-US', { 
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                background: 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)',
                borderRadius: '16px',
                border: '2px solid #ffc107',
                boxShadow: '0 4px 20px rgba(255, 193, 7, 0.2)',
                marginBottom: '30px'
              }}>
                <div style={{
                  fontSize: '1.6rem',
                  color: '#856404',
                  marginBottom: '20px',
                  fontWeight: '700',
                  textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                }}>
                  No Dates Selected
                </div>
                <div style={{
                  fontSize: '1.1rem',
                  color: '#856404',
                  lineHeight: '1.6',
                  fontWeight: '500'
                }}>
                  Please select dates in the Scheduling tab first.
                </div>
              </div>
            )}

            {/* Work Activity Table - appears when a date is selected */}
            {selectedDate && (
              <div style={{
                background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                borderRadius: '16px',
                padding: '30px',
                marginTop: '20px',
                border: '1px solid #dee2e6',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h3 style={{
                    color: '#2F3B70',
                    fontSize: '1.4rem',
                    fontWeight: '700',
                    margin: 0,
                    textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)'
                  }}>
                    Work Activity for {selectedDate.toDateString()}
                  </h3>
                  <button
                    onClick={() => setSelectedDate(null)}
                    style={{
                      background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 20px',
                      cursor: 'pointer',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      boxShadow: '0 4px 12px rgba(220, 53, 69, 0.3)',
                      transition: 'all 0.3s ease'
                    }}
                  >
                    Close
                  </button>
                </div>

                {/* General Information Fields */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '20px',
                  marginBottom: '30px'
                }}>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#2F3B70',
                      marginBottom: '8px'
                    }}>
                      PORT LOCATION
                    </label>
                    <input
                      type="text"
                      value={tableData.portLocation}
                      onChange={(e) => setTableData({...tableData, portLocation: e.target.value})}
                      style={{ 
                        width: '100%', 
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}
                      placeholder="Enter port location"
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#2F3B70',
                      marginBottom: '8px'
                    }}>
                      VOYAGE NO.
                    </label>
                    <input
                      type="text"
                      value={tableData.voyageNo}
                      onChange={(e) => setTableData({...tableData, voyageNo: e.target.value})}
                      style={{ 
                        width: '100%', 
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}
                      placeholder="Enter voyage number"
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#2F3B70',
                      marginBottom: '8px'
                    }}>
                      VESSEL NAME
                    </label>
                    <input
                      type="text"
                      value={tableData.vesselName}
                      onChange={(e) => setTableData({...tableData, vesselName: e.target.value})}
                      style={{ 
                        width: '100%', 
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}
                      placeholder="Enter vessel name"
                    />
                  </div>
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '0.9rem',
                      fontWeight: '600',
                      color: '#2F3B70',
                      marginBottom: '8px'
                    }}>
                      PURPOSE OF CALL
                    </label>
                    <input
                      type="text"
                      value={tableData.purposeOfCall}
                      onChange={(e) => setTableData({...tableData, purposeOfCall: e.target.value})}
                      style={{ 
                        width: '100%', 
                        padding: '12px',
                        border: '1px solid #ddd',
                        borderRadius: '8px',
                        fontSize: '0.9rem'
                      }}
                      placeholder="Enter purpose of call"
                    />
                  </div>
                </div>

                {/* WORK ACTIVITY Banner */}
                <div style={{
                  background: '#2F3B70',
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '25px',
                  textAlign: 'center',
                  position: 'relative',
                  boxShadow: '0 4px 20px rgba(47, 59, 112, 0.3)',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    color: '#FFD700',
                    fontSize: '1.3rem',
                    fontWeight: '700', 
                    textTransform: 'uppercase',
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    letterSpacing: '1px'
                  }}>
                    WORK ACTIVITY
                  </div>
                  <div style={{
                    position: 'absolute',
                    bottom: '0',
                    left: '0',
                    right: '0',
                    height: '3px',
                    background: '#FFD700',
                    boxShadow: '0 2px 8px rgba(255, 215, 0, 0.5)'
                  }}></div>
                </div>

                {/* Work Activity Table */}
                <div style={{
                  background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                  borderRadius: '12px',
                  border: '1px solid #dee2e6',
                  overflow: 'hidden',
                  boxShadow: '0 4px 15px rgba(0, 0, 0, 0.08)'
                }}>
                  {/* Table Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '3fr 1fr 1fr 1fr 80px',
                    background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    <div style={{
                      padding: '18px 15px',
                      fontWeight: '700', 
                      color: '#2F3B70',
                      textAlign: 'left',
                      borderRight: '1px solid #dee2e6',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                      fontSize: '0.95rem'
                    }}>
                      WORK ACTIVITY
                    </div>
                    <div style={{
                      padding: '18px 15px',
                      fontWeight: '700', 
                      color: '#2F3B70',
                      textAlign: 'center',
                      borderRight: '1px solid #dee2e6',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                      fontSize: '0.95rem'
                    }}>
                      TIME SCHEDULED
                    </div>
                    <div style={{
                      padding: '18px 15px',
                      fontWeight: '700', 
                      color: '#2F3B70',
                      textAlign: 'center',
                      borderRight: '1px solid #dee2e6',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                      fontSize: '0.95rem'
                    }}>
                      TIME STARTED
                    </div>
                    <div style={{
                      padding: '18px 15px',
                      fontWeight: '700', 
                      color: '#2F3B70',
                      textAlign: 'center',
                      borderRight: '1px solid #dee2e6',
                      textShadow: '0 1px 2px rgba(0, 0, 0, 0.1)',
                      fontSize: '0.95rem'
                    }}>
                      TIME DONE
                    </div>
                    <div style={{
                      padding: '18px 15px',
                      minWidth: '80px'
                    }}>
                    </div>
                  </div>

                  {/* Work Activity Rows */}
                  {tableData.workActivities.map((activity, index) => (
                    <div key={index} style={{
                      display: 'grid',
                      gridTemplateColumns: '3fr 1fr 1fr 1fr 80px',
                      borderBottom: '1px solid #dee2e6',
                      background: index % 2 === 0 ? 'rgba(248, 249, 250, 0.5)' : 'white',
                      transition: 'all 0.2s ease'
                    }}>
                      <div style={{
                        padding: '18px 15px',
                        borderRight: '1px solid #dee2e6',
                        display: 'flex',
                        alignItems: 'flex-start',
                        minHeight: '80px'
                      }}>
                        <select
                          value={activity.activity}
                          onChange={(e) => {
                            const newActivities = [...tableData.workActivities];
                            newActivities[index].activity = e.target.value;
                            setTableData({...tableData, workActivities: newActivities});
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '12px',
                            border: '2px solid #e9ecef',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            whiteSpace: 'normal',
                            wordWrap: 'break-word',
                            overflow: 'visible',
                            textOverflow: 'unset',
                            height: 'auto',
                            minHeight: '60px',
                            lineHeight: '1.4',
                            resize: 'vertical',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            color: '#333',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                          }}
                        >
                          <option value="">Select work activity...</option>
                          <option value="Vessel arrival and berthing">Vessel arrival and berthing</option>
                          <option value="Cargo loading/unloading operations">Cargo loading/unloading operations</option>
                          <option value="Port clearance procedures">Port clearance procedures</option>
                          <option value="Customs and immigration">Customs and immigration</option>
                          <option value="Fuel bunkering">Fuel bunkering</option>
                          <option value="Fresh water supply">Fresh water supply</option>
                          <option value="Waste disposal">Waste disposal</option>
                          <option value="Crew change operations">Crew change operations</option>
                          <option value="Maintenance and repairs">Maintenance and repairs</option>
                          <option 
                            value={`Awaiting port authorities due to attending to other vessel's arrived ahead of ${tableData.vesselName}`}
                            style={{ 
                              whiteSpace: 'normal', 
                              wordWrap: 'break-word',
                              padding: '5px',
                              lineHeight: '1.4'
                            }}
                          >
                            Awaiting port authorities due to attending to other vessel's arrived ahead of {tableData.vesselName}
                          </option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div style={{
                        padding: '18px 15px',
                        borderRight: '1px solid #dee2e6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <input
                          type="time"
                          value={activity.timeScheduled}
                          onChange={(e) => {
                            const newActivities = [...tableData.workActivities];
                            newActivities[index].timeScheduled = e.target.value;
                            setTableData({...tableData, workActivities: newActivities});
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '10px',
                            border: '2px solid #e9ecef',
                            borderRadius: '8px',
                            fontSize: '0.9rem',
                            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                            transition: 'all 0.3s ease',
                            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
                          }}
                          placeholder="--:--"
                        />
                        <span style={{ color: '#6c757d', fontSize: '1.2rem' }}></span>
                      </div>
                      <div style={{
                        padding: '18px 15px',
                        borderRight: '1px solid #dee2e6',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <input
                          type="time"
                          value={activity.timeStarted}
                          onChange={(e) => {
                            const newActivities = [...tableData.workActivities];
                            newActivities[index].timeStarted = e.target.value;
                            setTableData({...tableData, workActivities: newActivities});
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
                          }}
                          placeholder="--:--"
                        />
                        <span style={{ color: '#6c757d' }}></span>
                      </div>
                      <div style={{
                        padding: '15px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                      }}>
                        <input
                          type="time"
                          value={activity.timeDone}
                          onChange={(e) => {
                            const newActivities = [...tableData.workActivities];
                            newActivities[index].timeDone = e.target.value;
                            setTableData({...tableData, workActivities: newActivities});
                          }}
                          style={{ 
                            width: '100%', 
                            padding: '8px',
                            border: '1px solid #ddd',
                            borderRadius: '6px',
                            fontSize: '0.9rem'
                          }}
                          placeholder="--:--"
                        />
                        <span style={{ color: '#6c757d' }}></span>
                      </div>
                      <div style={{
                        padding: '18px 10px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        borderLeft: '1px solid #dee2e6'
                      }}>
                        <button
                          onClick={() => {
                            const newActivities = tableData.workActivities.filter((_, i) => i !== index);
                            setTableData({...tableData, workActivities: newActivities});
                          }}
                          style={{
                            background: 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)',
                            color: 'white',
                            border: 'none',
                            borderRadius: '6px',
                            padding: '8px 12px',
                            cursor: 'pointer',
                            fontSize: '0.8rem',
                            fontWeight: '600',
                            boxShadow: '0 2px 8px rgba(220, 53, 69, 0.3)',
                            transition: 'all 0.3s ease',
                            minWidth: '60px'
                          }}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Action Buttons */}
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '30px',
                  gap: '20px'
                }}>
                  {/* Left spacer */}
                  <div style={{ flex: 1 }}></div>
                  
                  {/* Add Button - Center */}
                  <button
                    onClick={() => {
                      const newActivities = [...tableData.workActivities];
                      newActivities.push({ activity: '', timeScheduled: '', timeStarted: '', timeDone: '' });
                      setTableData({...tableData, workActivities: newActivities});
                    }}
                    style={{
                      background: '#FFD700',
                      color: 'white',
                      border: 'none',
                      borderRadius: '50%',
                      width: '60px',
                      height: '60px',
                      cursor: 'pointer',
                      fontSize: '1.8rem',
                      fontWeight: 'bold',
                      boxShadow: '0 4px 15px rgba(255, 215, 0, 0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.3s ease',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.transform = 'translateY(-3px) scale(1.05)';
                      e.target.style.boxShadow = '0 6px 20px rgba(255, 215, 0, 0.6)';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.transform = 'translateY(0) scale(1)';
                      e.target.style.boxShadow = '0 4px 15px rgba(255, 215, 0, 0.4)';
                    }}
                  >
                    +
                  </button>
                
                  {/* Action Buttons Group - Right */}
                  <div style={{ 
                    display: 'flex', 
                    gap: '15px',
                    alignItems: 'center',
                    flex: 1,
                    justifyContent: 'flex-end'
                  }}>
                    <button
                      onClick={clearWorkActivityData}
                      style={{
                        background: '#dc3545',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '14px 28px',
                        cursor: 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: '0 6px 20px rgba(220, 53, 69, 0.4)',
                        transition: 'all 0.3s ease',
                        minWidth: '150px',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.transform = 'translateY(-2px)';
                        e.target.style.boxShadow = '0 8px 25px rgba(220, 53, 69, 0.5)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 6px 20px rgba(220, 53, 69, 0.4)';
                      }}
                    >
                      CLEAR
                    </button>
                    
                    <button
                      onClick={async () => {
                        if (!selectedDate) {
                          alert('Please select a date first');
                          return;
                        }
                        
                        setIsSaving(true);
                        try {
                          await autoSaveData(tableData);
                          setSaveMessage('Data saved successfully!');
                          setTimeout(() => setSaveMessage(''), 3000);
                        } catch (error) {
                          console.error('Error saving data:', error);
                          alert('Failed to save data. Please try again.');
                        } finally {
                          setIsSaving(false);
                        }
                      }}
                      style={{
                        background: isSaving ? '#6c757d' : '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        padding: '14px 28px',
                        cursor: isSaving ? 'not-allowed' : 'pointer',
                        fontSize: '0.95rem',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px',
                        boxShadow: isSaving 
                          ? '0 4px 15px rgba(108, 117, 125, 0.3)'
                          : '0 6px 20px rgba(40, 167, 69, 0.4)',
                        opacity: isSaving ? 0.7 : 1,
                        minWidth: '180px',
                        transition: 'all 0.3s ease',
                        position: 'relative',
                        overflow: 'hidden'
                      }}
                      disabled={isSaving}
                      onMouseEnter={(e) => {
                        if (!isSaving) {
                          e.target.style.transform = 'translateY(-2px)';
                          e.target.style.boxShadow = '0 8px 25px rgba(40, 167, 69, 0.5)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSaving) {
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 6px 20px rgba(40, 167, 69, 0.4)';
                        }
                      }}
                    >
                      {isSaving ? 'SAVING...' : 'SAVE REPORT'}
                    </button>
                  </div>
                </div>
                
                {saveMessage && (
                  <div style={{
                    position: 'fixed',
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    padding: '20px 30px',
                    background: 'linear-gradient(135deg, #d4edda, #c3e6cb)',
                    color: '#155724',
                    borderRadius: '12px',
                    fontSize: '1.1rem',
                    fontWeight: '600',
                    textAlign: 'center',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.2)',
                    border: '2px solid #c3e6cb',
                    zIndex: 1000,
                    minWidth: '300px',
                    animation: 'fadeInOut 3s ease-in-out'
                  }}>
                    {saveMessage}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default Report;
