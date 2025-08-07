import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs, doc, setDoc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './Report.css';

const containers = [
  {
    key: 'report',
    label: 'Report Table',
  },
  {
    key: 'details',
    label: 'Suggested Files',
  },
];

const Report = () => {
  const [appointments, setAppointments] = useState([]);
  const [expandedId, setExpandedId] = useState(null);
  const [activeContainer, setActiveContainer] = useState(0);
  const [currentUser, setCurrentUser] = useState(null);
  const [isAliceAuthorized, setIsAliceAuthorized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentDetails, setShowAppointmentDetails] = useState(false);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth());
  const [showYearDropdown, setShowYearDropdown] = useState(false);
  const [showMonthDropdown, setShowMonthDropdown] = useState(false);
  
  // Editable table data
  const [tableData, setTableData] = useState({
    portLocation: '',
    voyageNo: '',
    vesselName: '',
    purposeOfCall: '',
    workActivities: Array(7).fill().map(() => ({
      activity: '',
      timeScheduled: '',
      timeStarted: '',
      timeDone: ''
    }))
  });

  // Check if current user is Alice Santos
  const checkAliceAuthorization = (user) => {
    if (!user) return false;
    
    const userName = user.displayName || user.email?.split('@')[0] || '';
    const userEmail = user.email || '';
    
    // Check for exact name match
    if (userName === 'Alice Margaretha Santos') return true;
    
    // Check for partial name matches
    const nameContainsAlice = userName.toLowerCase().includes('alice');
    const emailContainsAlice = userEmail.toLowerCase().includes('alice');
    
    return nameContainsAlice || emailContainsAlice || 
           userEmail.toLowerCase().includes('alice.margaretha') ||
           userEmail.toLowerCase().includes('alice_margaretha') ||
           userEmail.toLowerCase().includes('alice.santos') ||
           userEmail.toLowerCase().includes('alice_santos');
  };

  // Get current date in MM-DD-YYYY format for document ID
  const getCurrentDateId = () => {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const year = now.getFullYear();
    return `${month}-${day}-${year}`;
  };

  // Load data from Firestore
  const loadReportData = async () => {
    try {
      const db = getFirestore();
      const currentDateId = getCurrentDateId();
      const reportDoc = doc(db, 'reports', currentDateId);
      const reportSnapshot = await getDoc(reportDoc);
      
      if (reportSnapshot.exists()) {
        const data = reportSnapshot.data();
        setTableData({
          portLocation: data.portLocation || '',
          voyageNo: data.voyageNo || '',
          vesselName: data.vesselName || '',
          purposeOfCall: data.purposeOfCall || '',
          workActivities: data.workActivities || Array(7).fill().map(() => ({
            activity: '',
            timeScheduled: '',
            timeStarted: '',
            timeDone: ''
          }))
        });
      }
    } catch (error) {
      console.error('Error loading report data:', error);
    }
  };

  // Save data to Firestore
  const saveReportData = async () => {
    if (!isAliceAuthorized) {
      setSaveMessage('❌ Only Alice Santos is authorized to save data.');
      setTimeout(() => setSaveMessage(''), 3000);
      return;
    }

    setIsSaving(true);
    setSaveMessage('');

    try {
      const db = getFirestore();
      const currentDateId = getCurrentDateId();
      const reportDoc = doc(db, 'reports', currentDateId);
      
      await setDoc(reportDoc, {
        ...tableData,
        date: currentDateId,
        lastUpdated: new Date().toISOString(),
        updatedBy: currentUser.email || currentUser.displayName || 'Unknown'
      });

      setSaveMessage(`✅ Report data saved successfully for ${currentDateId}!`);
      setTimeout(() => setSaveMessage(''), 3000);
    } catch (error) {
      console.error('Error saving report data:', error);
      setSaveMessage('❌ Error saving data. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        const isAlice = checkAliceAuthorization(user);
        setIsAliceAuthorized(isAlice);
        console.log('Current user:', user.displayName || user.email);
        console.log('Is Alice authorized:', isAlice);
        
        // Load data after user authentication
        await loadReportData();
      } else {
        setCurrentUser(null);
        setIsAliceAuthorized(false);
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchAppointments = async () => {
      const db = getFirestore();
      const q = collection(db, 'appointments');
      const querySnapshot = await getDocs(q);
      const entries = [];
      querySnapshot.forEach(doc => {
        entries.push({ id: doc.id, ...doc.data() });
      });
      setAppointments(entries);
    };
    fetchAppointments();
  }, []);

  // Group appointments by day (YYYY-MM-DD)
  const grouped = {};
  appointments.forEach(app => {
    if (app.date) {
      const d = new Date(app.date);
      const key = d.toISOString().slice(0, 10);
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push(app);
    }
  });

  // Helper to format date as 'Month DD, YYYY'
  const formatDay = dateStr => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'long', day: '2-digit', year: 'numeric' });
  };

  // Handle input field changes
  const handleInputChange = (e, field, index = null) => {
    const value = e.target.value;
    
    if (!isAliceAuthorized) {
      alert('Only Alice Santos is authorized to edit this table.');
      return;
    }

    if (index !== null) {
      // Update work activity row
      setTableData(prev => ({
        ...prev,
        workActivities: prev.workActivities.map((activity, i) => 
          i === index ? { ...activity, [field]: value } : activity
        )
      }));
    } else {
      // Update main fields
      setTableData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle input focus to maintain focus
  const handleInputFocus = (e) => {
    e.target.select();
  };

  // Handle input blur to save data
  const handleInputBlur = (e, field, index = null) => {
    const value = e.target.value;
    if (index !== null) {
      setTableData(prev => ({
        ...prev,
        workActivities: prev.workActivities.map((activity, i) => 
          i === index ? { ...activity, [field]: value } : activity
        )
      }));
    } else {
      setTableData(prev => ({
        ...prev,
        [field]: value
      }));
    }
  };

  // Handle appointment click to show details
  const handleAppointmentClick = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentDetails(true);
  };

  // Close appointment details
  const closeAppointmentDetails = () => {
    setShowAppointmentDetails(false);
    setSelectedAppointment(null);
  };

  // Handle year selection
  const handleYearSelect = (year) => {
    setSelectedYear(year);
    setShowYearDropdown(false);
    setSelectedMonth(0); // Reset to January when year changes
  };

  // Handle month selection
  const handleMonthSelect = (month) => {
    setSelectedMonth(month);
    setShowMonthDropdown(false);
  };

  // Get filtered appointments based on selected year and month
  const getFilteredAppointments = () => {
    return appointments.filter(appointment => {
      if (!appointment.date) return false;
      const appointmentDate = new Date(appointment.date);
      return appointmentDate.getFullYear() === selectedYear && 
             appointmentDate.getMonth() === selectedMonth;
    });
  };

  // Get available years (show 2025 to 2030 for example)
  const getAvailableYears = () => {
    const startYear = 2025;
    const endYear = 2030;
    const years = [];
    for (let y = startYear; y <= endYear; y++) {
      years.push(y);
    }
    return years;
  };

  // Get available months (always show all months)
  const getAvailableMonths = () => {
    return Array.from({ length: 12 }, (_, i) => i); // 0 to 11
  };

  // Month names for display
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  // Count Foreign and Local vessels for the selected month/year
  const getVesselCounts = () => {
    const filteredAppointments = getFilteredAppointments();
    let foreign = 0;
    let local = 0;
    filteredAppointments.forEach(app => {
      if (app.vesselType && app.vesselType.toLowerCase().includes('foreign')) {
        foreign++;
      } else if (app.vesselType && app.vesselType.toLowerCase().includes('local')) {
        local++;
      }
    });
    return { foreign, local };
  };

  // Handle add row button click
  const handleAddRow = () => {
    if (!isAliceAuthorized) {
      alert('Only Alice Santos is authorized to add rows.');
      return;
    }
    
    setTableData(prev => ({
      ...prev,
      workActivities: [...prev.workActivities, { activity: '', timeScheduled: '', timeStarted: '', timeDone: '' }]
    }));
  };

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: 'linear-gradient(135deg, #dbeafe 0%, #eaf3ff 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', padding: '20px' }}>
        <div style={{ width: '100%', maxWidth: '1200px' }}>
          {activeContainer === 0 && (
            <>
              <div className="report-main-container">
                <div style={{ 
                  background: 'white', 
                  borderRadius: '20px', 
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)', 
                  padding: '40px',
                  margin: '0 auto',
                  maxWidth: '1000px'
                }}>
                  {/* Add scrollable wrapper here */}
                  <div style={{
                    maxHeight: '420px', // adjust as needed
                    overflowY: 'auto',
                    marginBottom: '16px'
                  }}>
                    <table className="report-table" style={{ 
                      width: '100%', 
                      borderCollapse: 'separate', 
                      borderSpacing: 0, 
                      borderRadius: '16px', 
                      overflow: 'hidden', 
                      boxShadow: '0 4px 24px rgba(44,62,80,0.10)', 
                      margin: '0 auto',
                      background: 'white'
                    }}>
                      <tbody>
                        <tr>
                          <th style={{ 
                            background: '#5c6ab0', 
                            color: '#fff', 
                            fontWeight: '700', 
                            fontSize: '1.1rem', 
                            borderTopLeftRadius: '16px',
                            padding: '16px 20px',
                            textAlign: 'left',
                            letterSpacing: '0.5px'
                          }}>Port Location</th>
                          <td style={{ 
                            background: '#fff', 
                            padding: '16px 20px',
                            border: '1px solid #e9ecef'
                          }}>
                            {isAliceAuthorized ? (
                              <input
                                type="text"
                                value={tableData.portLocation}
                                onChange={(e) => handleInputChange(e, 'portLocation')}
                                onFocus={handleInputFocus}
                                onBlur={(e) => handleInputBlur(e, 'portLocation')}
                                style={{ 
                                  width: '100%', 
                                  border: 'none', 
                                  outline: 'none', 
                                  fontSize: '1rem',
                                  background: 'transparent',
                                  color: '#2F3B70'
                                }}
                                placeholder="Enter port location"
                              />
                            ) : (
                              <span style={{ color: '#2F3B70' }}>{tableData.portLocation || ''}</span>
                            )}
                          </td>
                          <th style={{ 
                            background: '#5c6ab0', 
                            color: '#fff', 
                            fontWeight: '700', 
                            fontSize: '1.1rem',
                            padding: '16px 20px',
                            textAlign: 'left',
                            letterSpacing: '0.5px'
                          }}>Voyage No.:</th>
                          <td style={{ 
                            background: '#fff', 
                            borderTopRightRadius: '16px', 
                            padding: '16px 20px',
                            border: '1px solid #e9ecef'
                          }}>
                            {isAliceAuthorized ? (
                              <input
                                type="text"
                                value={tableData.voyageNo}
                                onChange={(e) => handleInputChange(e, 'voyageNo')}
                                onFocus={handleInputFocus}
                                onBlur={(e) => handleInputBlur(e, 'voyageNo')}
                                style={{ 
                                  width: '100%', 
                                  border: 'none', 
                                  outline: 'none', 
                                  fontSize: '1rem',
                                  background: 'transparent',
                                  color: '#2F3B70'
                                }}
                                placeholder="Enter voyage number"
                              />
                            ) : (
                              <span style={{ color: '#2F3B70' }}>{tableData.voyageNo || ''}</span>
                            )}
                          </td>
                        </tr>
                        <tr>
                          <th style={{ 
                            background: '#5c6ab0', 
                            color: '#fff', 
                            fontWeight: '700', 
                            fontSize: '1.1rem',
                            padding: '16px 20px',
                            textAlign: 'left',
                            letterSpacing: '0.5px'
                          }}>Vessel Name:</th>
                          <td style={{ 
                            background: '#f8f9fa', 
                            padding: '16px 20px',
                            border: '1px solid #e9ecef'
                          }}>
                            {isAliceAuthorized ? (
                              <input
                                type="text"
                                value={tableData.vesselName}
                                onChange={(e) => handleInputChange(e, 'vesselName')}
                                onFocus={handleInputFocus}
                                onBlur={(e) => handleInputBlur(e, 'vesselName')}
                                style={{ 
                                  width: '100%', 
                                  border: 'none', 
                                  outline: 'none', 
                                  fontSize: '1rem',
                                  background: 'transparent',
                                  color: '#2F3B70'
                                }}
                                placeholder="Enter vessel name"
                              />
                            ) : (
                              <span style={{ color: '#2F3B70' }}>{tableData.vesselName || ''}</span>
                            )}
                          </td>
                          <th style={{ 
                            background: '#5c6ab0', 
                            color: '#fff', 
                            fontWeight: '700', 
                            fontSize: '1.1rem',
                            padding: '16px 20px',
                            textAlign: 'left',
                            letterSpacing: '0.5px'
                          }}>Purpose of Call:</th>
                          <td style={{ 
                            background: '#f8f9fa', 
                            padding: '16px 20px',
                            border: '1px solid #e9ecef'
                          }}>
                            {isAliceAuthorized ? (
                              <input
                                type="text"
                                value={tableData.purposeOfCall}
                                onChange={(e) => handleInputChange(e, 'purposeOfCall')}
                                onFocus={handleInputFocus}
                                onBlur={(e) => handleInputBlur(e, 'purposeOfCall')}
                                style={{ 
                                  width: '100%', 
                                  border: 'none', 
                                  outline: 'none', 
                                  fontSize: '1rem',
                                  background: 'transparent',
                                  color: '#2F3B70'
                                }}
                                placeholder="Enter purpose of call"
                              />
                            ) : (
                              <span style={{ color: '#2F3B70' }}>{tableData.purposeOfCall || ''}</span>
                            )}
                          </td>
                        </tr>
                        <tr className="work-header">
                          <th colSpan="4" style={{ 
                            background: '#5c6ab0', 
                            color: '#ffe14d', 
                            fontWeight: '800', 
                            fontSize: '1.3rem', 
                            textAlign: 'center', 
                            letterSpacing: '1px', 
                            padding: '20px',
                            textTransform: 'uppercase'
                          }}>
                            Work Activity
                          </th>
                        </tr>
                        <tr className="work-subheader">
                          <th style={{ 
                            background: '#eaf3ff', 
                            color: '#2d3e5e', 
                            fontWeight: '700', 
                            fontSize: '1rem', 
                            textAlign: 'center',
                            padding: '16px 12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Work Activity</th>
                          <th style={{ 
                            background: '#eaf3ff', 
                            color: '#2d3e5e', 
                            fontWeight: '700', 
                            fontSize: '1rem', 
                            textAlign: 'center',
                            padding: '16px 12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Time Scheduled</th>
                          <th style={{ 
                            background: '#eaf3ff', 
                            color: '#2d3e5e', 
                            fontWeight: '700', 
                            fontSize: '1rem', 
                            textAlign: 'center',
                            padding: '16px 12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Time Started</th>
                          <th style={{ 
                            background: '#eaf3ff', 
                            color: '#2d3e5e', 
                            fontWeight: '700', 
                            fontSize: '1rem', 
                            textAlign: 'center',
                            padding: '16px 12px',
                            textTransform: 'uppercase',
                            letterSpacing: '0.5px'
                          }}>Time Done</th>
                        </tr>
                        {tableData.workActivities.map((activity, index) => (
                          <tr key={index} style={{ 
                            background: index % 2 === 0 ? '#f8f9fa' : '#fff',
                            borderBottom: '1px solid #e9ecef'
                          }}>
                            <td style={{ 
                              padding: '16px 20px',
                              borderRight: '1px solid #e9ecef'
                            }}>
                              {isAliceAuthorized ? (
                                <input
                                  type="text"
                                  value={activity.activity}
                                  onChange={(e) => handleInputChange(e, 'activity', index)}
                                  onFocus={handleInputFocus}
                                  onBlur={(e) => handleInputBlur(e, 'activity', index)}
                                  style={{ 
                                    width: '100%', 
                                    border: 'none', 
                                    outline: 'none', 
                                    fontSize: '1rem', 
                                    background: 'transparent',
                                    color: '#2F3B70'
                                  }}
                                  placeholder="Enter work activity"
                                />
                              ) : (
                                <span style={{ color: '#2F3B70' }}>{activity.activity || ''}</span>
                              )}
                            </td>
                            <td style={{ 
                              padding: '16px 20px',
                              borderRight: '1px solid #e9ecef'
                            }}>
                              {isAliceAuthorized ? (
                                <input
                                  type="time"
                                  value={activity.timeScheduled}
                                  onChange={(e) => handleInputChange(e, 'timeScheduled', index)}
                                  onFocus={handleInputFocus}
                                  onBlur={(e) => handleInputBlur(e, 'timeScheduled', index)}
                                  style={{ 
                                    width: '100%', 
                                    border: 'none', 
                                    outline: 'none', 
                                    fontSize: '1rem', 
                                    background: 'transparent',
                                    color: '#2F3B70'
                                  }}
                                />
                              ) : (
                                <span style={{ color: '#2F3B70' }}>{activity.timeScheduled || ''}</span>
                              )}
                            </td>
                            <td style={{ 
                              padding: '16px 20px',
                              borderRight: '1px solid #e9ecef'
                            }}>
                              {isAliceAuthorized ? (
                                <input
                                  type="time"
                                  value={activity.timeStarted}
                                  onChange={(e) => handleInputChange(e, 'timeStarted', index)}
                                  onFocus={handleInputFocus}
                                  onBlur={(e) => handleInputBlur(e, 'timeStarted', index)}
                                  style={{ 
                                    width: '100%', 
                                    border: 'none', 
                                    outline: 'none', 
                                    fontSize: '1rem', 
                                    background: 'transparent',
                                    color: '#2F3B70'
                                  }}
                                />
                              ) : (
                                <span style={{ color: '#2F3B70' }}>{activity.timeStarted || ''}</span>
                              )}
                            </td>
                            <td style={{ 
                              padding: '16px 20px'
                            }}>
                              {isAliceAuthorized ? (
                                <input
                                  type="time"
                                  value={activity.timeDone}
                                  onChange={(e) => handleInputChange(e, 'timeDone', index)}
                                  onFocus={handleInputFocus}
                                  onBlur={(e) => handleInputBlur(e, 'timeDone', index)}
                                  style={{ 
                                    width: '100%', 
                                    border: 'none', 
                                    outline: 'none', 
                                    fontSize: '1rem', 
                                    background: 'transparent',
                                    color: '#2F3B70'
                                  }}
                                />
                              ) : (
                                <span style={{ color: '#2F3B70' }}>{activity.timeDone || ''}</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  
                  <div style={{ marginTop: '16px', textAlign: 'center' }}>
                    <button className="add-row-btn" onClick={handleAddRow}>+</button>
                  </div>
                  

                  <div style={{ marginTop: '32px', textAlign: 'center' }}>
                    <button
                      onClick={saveReportData}
                      disabled={isSaving || !isAliceAuthorized}
                      className="report-save-btn"
                    >
                      {isSaving ? 'Saving...' : 'Save Report'}
                    </button>
                    
                    {/* Save Message */}
                    {saveMessage && (
                      <div
                        className={`report-save-message ${saveMessage.includes('✅') ? 'success' : 'error'}`}
                      >
                        {saveMessage}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
          {activeContainer === 1 && (
            <div className="report-details-row" style={{ 
              display: 'flex', 
              flexDirection: 'row', 
              alignItems: 'flex-start', 
              gap: '32px',
              justifyContent: 'center',
              padding: '20px'
            }}>
              <div className="suggested-files-container" style={{
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                padding: '40px',
                maxWidth: '500px',
                minHeight: '600px',
                margin: '0',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                flex: '1',
                height: '600px', // fixed height for scroll
                overflowY: 'auto' // enable vertical scroll
              }}>
                <h3 className="suggested-files-title" style={{
                  color: '#2F3B70',
                  fontWeight: '800',
                  fontSize: '1.5rem',
                  marginBottom: '32px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}>Suggested files</h3>

                {/* Year and Month Selection Filters */}
                <div style={{
                  marginBottom: '24px',
                  padding: '20px',
                  background: '#f8f9fa',
                  borderRadius: '12px',
                  border: '1px solid #e9ecef'
                }}>
                  <h4 style={{
                    color: '#2F3B70',
                    fontWeight: '600',
                    fontSize: '1rem',
                    marginBottom: '16px',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Filter by Period
                  </h4>
                  
                  <div style={{
                    display: 'flex',
                    gap: '12px',
                    flexWrap: 'wrap'
                  }}>
                    {/* Year Selection */}
                    <div style={{
                      position: 'relative',
                      minWidth: '120px'
                    }}>
                      <button
                        onClick={() => setShowYearDropdown(!showYearDropdown)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'white',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#2F3B70',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = '#2F3B70';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = '#e9ecef';
                        }}
                      >
                        {selectedYear}
                        <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>▼</span>
                      </button>
                      {showYearDropdown && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: '0',
                          right: '0',
                          background: 'white',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          marginTop: '4px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          zIndex: 1000,
                          maxHeight: '150px',
                          overflowY: 'auto'
                        }}>
                          {getAvailableYears().map((year) => (
                            <div
                              key={year}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f8f9fa',
                                transition: 'all 0.2s ease',
                                fontWeight: year === selectedYear ? '600' : '400',
                                color: year === selectedYear ? '#2F3B70' : '#6c757d',
                                background: year === selectedYear ? '#e3f2fd' : 'transparent'
                              }}
                              onClick={() => handleYearSelect(year)}
                              onMouseEnter={(e) => {
                                e.target.style.background = '#f8f9fa';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = year === selectedYear ? '#e3f2fd' : 'transparent';
                              }}
                            >
                              {year}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Month Selection */}
                    <div style={{
                      position: 'relative',
                      minWidth: '140px'
                    }}>
                      <button
                        onClick={() => setShowMonthDropdown(!showMonthDropdown)}
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          background: 'white',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          fontWeight: '600',
                          color: '#2F3B70',
                          cursor: 'pointer',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.borderColor = '#2F3B70';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.borderColor = '#e9ecef';
                        }}
                      >
                        {monthNames[selectedMonth]}
                        <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>▼</span>
                      </button>
                      {showMonthDropdown && (
                        <div style={{
                          position: 'absolute',
                          top: '100%',
                          left: '0',
                          right: '0',
                          background: 'white',
                          border: '2px solid #e9ecef',
                          borderRadius: '8px',
                          marginTop: '4px',
                          boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
                          zIndex: 1000,
                          maxHeight: '200px',
                          overflowY: 'auto'
                        }}>
                          {getAvailableMonths().map((month) => (
                            <div
                              key={month}
                              style={{
                                padding: '8px 12px',
                                cursor: 'pointer',
                                borderBottom: '1px solid #f8f9fa',
                                transition: 'all 0.2s ease',
                                fontWeight: month === selectedMonth ? '600' : '400',
                                color: month === selectedMonth ? '#2F3B70' : '#6c757d',
                                background: month === selectedMonth ? '#e3f2fd' : 'transparent'
                              }}
                              onClick={() => handleMonthSelect(month)}
                              onMouseEnter={(e) => {
                                e.target.style.background = '#f8f9fa';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = month === selectedMonth ? '#e3f2fd' : 'transparent';
                              }}
                            >
                              {monthNames[month]}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {Object.keys(grouped).length === 0 ? (
                  <div className="suggested-files-empty" style={{
                    color: '#6c757d',
                    fontSize: '1.1rem',
                    textAlign: 'center',
                    marginTop: '40px',
                    fontStyle: 'italic'
                  }}>No appointments found.</div>
                ) : (
                  (() => {
                    // Filter appointments based on selected year and month
                    const filteredAppointments = getFilteredAppointments();
                    
                    // Group filtered appointments by date
                    const filteredGrouped = filteredAppointments.reduce((acc, appointment) => {
                      const date = appointment.date ? appointment.date.split('T')[0] : '';
                      if (!acc[date]) {
                        acc[date] = [];
                      }
                      acc[date].push(appointment);
                      return acc;
                    }, {});
                    
                    return Object.keys(filteredGrouped).length === 0 ? (
                      <div className="suggested-files-empty" style={{
                        color: '#6c757d',
                        fontSize: '1.1rem',
                        textAlign: 'center',
                        marginTop: '40px',
                        fontStyle: 'italic'
                      }}>
                        No appointments found for {monthNames[selectedMonth]} {selectedYear}.
                      </div>
                    ) : (
                      Object.keys(filteredGrouped).sort((a, b) => new Date(b) - new Date(a)).map(dayKey => (
                        <div key={dayKey} className="suggested-file-card" style={{
                          background: '#f8f9fa',
                          borderRadius: '16px',
                          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.08)',
                          padding: '0',
                          marginBottom: '24px',
                          maxWidth: '100%',
                          marginLeft: '0',
                          marginRight: '0',
                          position: 'relative',
                          overflow: 'hidden',
                          border: '1px solid #e9ecef'
                        }}>
                          <div className="suggested-file-header" style={{
                            padding: '24px 28px 16px 28px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '16px'
                          }}>
                            <span role="img" aria-label="file" className="suggested-file-icon" style={{
                              fontSize: '2.5rem',
                              color: '#2F3B70',
                              flexShrink: '0'
                            }}>📄</span>
                            <div>
                              <div className="suggested-file-date" style={{
                                fontWeight: '700',
                                fontSize: '1.2rem',
                                color: '#2F3B70',
                                marginBottom: '4px'
                              }}>{formatDay(dayKey)}</div>
                              <div className="suggested-file-meta" style={{
                                color: '#6c757d',
                                fontSize: '1rem',
                                fontWeight: '500'
                              }}>You modified • {new Date(dayKey).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                          </div>
                        </div>
                        <div className="suggested-file-divider" style={{
                          height: '2px',
                          background: '#2F3B70',
                          width: '100%',
                          opacity: '0.3'
                        }}></div>
                        <div className="suggested-file-list" style={{
                          padding: '16px 28px 24px 28px'
                        }}>
                          <ul className="suggested-file-ul" style={{
                            listStyle: 'none',
                            margin: '0',
                            padding: '0'
                          }}>
                            {filteredGrouped[dayKey].map((app, idx) => (
                              <li key={app.id} className="suggested-file-li" style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '12px',
                                color: '#2F3B70',
                                fontSize: '1.1rem',
                                gap: '12px',
                                padding: '8px 12px',
                                borderRadius: '8px',
                                transition: 'all 0.2s ease',
                                cursor: 'pointer'
                              }}
                              onClick={() => handleAppointmentClick(app)}
                              onMouseEnter={(e) => {
                                e.target.style.background = '#e9ecef';
                                e.target.style.transform = 'translateX(4px)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = 'transparent';
                                e.target.style.transform = 'translateX(0)';
                              }}>
                                <span role="img" aria-label="doc" className="suggested-file-doc-icon" style={{
                                  fontSize: '1.4rem',
                                  color: '#5c6ab0'
                                }}>📄</span>
                                <span className="suggested-file-appointment" style={{
                                  fontWeight: '600'
                                }}>Appointment {idx + 1}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    ))
                    );
                  })()
                )}
              </div>
              <div className="additional-container" style={{
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                minWidth: '400px',
                minHeight: '600px',
                padding: '40px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'flex-start',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                flex: '1'
              }}>
                <div className="analytics-title" style={{
                  fontSize: '1.5rem',
                  fontWeight: '800',
                  color: '#2F3B70',
                  marginBottom: '32px',
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}>Analytics</div>
                <div className="analytics-chart-area" style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '40px',
                  justifyContent: 'center',
                  width: '100%'
                }}>
                  {(() => {
                    const { foreign, local } = getVesselCounts();
                    const total = foreign + local;
                    const foreignPercent = total ? (foreign / total) * 100 : 0;
                    const localPercent = total ? (local / total) * 100 : 0;
                    // Pie chart math
                    const radius = 120;
                    const cx = 140;
                    const cy = 140;
                    const foreignAngle = (foreignPercent / 100) * 360;
                    const localAngle = (localPercent / 100) * 360;
                    // Foreign arc
                    const foreignRadians = (foreignAngle - 90) * Math.PI / 180;
                    const fx = cx + radius * Math.cos(foreignRadians);
                    const fy = cy + radius * Math.sin(foreignRadians);
                    // Local arc
                    const localRadians = (localAngle - 90) * Math.PI / 180;
                    const lx = cx + radius * Math.cos(localRadians);
                    const ly = cy + radius * Math.sin(localRadians);
                    // Large arc flag
                    const largeArcFlag = foreignPercent > 50 ? 1 : 0;
                    // Pie path for local vessel
                    const localPath = total === 0
                      ? ''
                      : `M${cx},${cy} L${cx},${cy - radius} A${radius},${radius} 0 ${largeArcFlag},1 ${fx},${fy} Z`;
                    return (
                      <svg width="280" height="280" viewBox="0 0 280 280" style={{
                        filter: 'drop-shadow(0 4px 16px rgba(47, 59, 112, 0.2))'
                      }}>
                        {/* Foreign Vessel Pie */}
                        <circle r={radius} cx={cx} cy={cy} fill="#2F3B70" />
                        {/* Local Vessel Pie */}
                        {local > 0 && (
                          <path
                            d={`M${cx},${cy} L${cx},${cy - radius} A${radius},${radius} 0 ${localPercent > 50 ? 1 : 0},1 ${cx + radius * Math.cos((localAngle - 90) * Math.PI / 180)},${cy + radius * Math.sin((localAngle - 90) * Math.PI / 180)} Z`}
                            fill="#ff3c3c"
                          />
                        )}
                        {/* Foreign count */}
                        <text x={cx - 60} y={cy + 10} textAnchor="middle" fontSize="2.5rem" fill="#fff" fontWeight="bold">{foreign}</text>
                        {/* Local count */}
                        <text x={cx + 60} y={cy + 40} textAnchor="middle" fontSize="2.5rem" fill="#fff" fontWeight="bold">{local}</text>
                      </svg>
                    );
                  })()}
                  <div className="analytics-legend" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                  }}>
                    <div className="analytics-legend-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      fontSize: '1.1rem',
                      color: '#2F3B70',
                      fontWeight: '600',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef'
                    }}>
                      <span className="analytics-legend-dot" style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#2F3B70',
                        display: 'inline-block',
                        boxShadow: '0 2px 8px rgba(47, 59, 112, 0.3)'
                      }}></span>
                      <span className="analytics-legend-label" style={{
                        color: '#2F3B70',
                        fontWeight: '600',
                        fontSize: '1.1rem'
                      }}>Foreign Vessel</span>
                    </div>
                    <div className="analytics-legend-item" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px',
                      fontSize: '1.1rem',
                      color: '#2F3B70',
                      fontWeight: '600',
                      padding: '12px 16px',
                      borderRadius: '12px',
                      background: '#f8f9fa',
                      border: '1px solid #e9ecef'
                    }}>
                      <span className="analytics-legend-dot" style={{
                        width: '20px',
                        height: '20px',
                        borderRadius: '50%',
                        background: '#ff3c3c',
                        display: 'inline-block',
                        boxShadow: '0 2px 8px rgba(255, 60, 60, 0.3)'
                      }}></span>
                      <span className="analytics-legend-label" style={{
                        color: '#2F3B70',
                        fontWeight: '600',
                        fontSize: '1.1rem'
                      }}>Local Vessel</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Appointment Details Modal */}
          {showAppointmentDetails && selectedAppointment && (
            <div style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              zIndex: 1000,
              padding: '20px'
            }}>
              <div style={{
                background: 'white',
                borderRadius: '20px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
                padding: '40px',
                maxWidth: '800px',
                width: '100%',
                maxHeight: '80vh',
                overflowY: 'auto',
                position: 'relative'
              }}>
                {/* Close Button */}
                <button
                  onClick={closeAppointmentDetails}
                  style={{
                    position: 'absolute',
                    top: '20px',
                    right: '20px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: '40px',
                    height: '40px',
                    fontSize: '1.2rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#5a6268';
                    e.target.style.transform = 'scale(1.1)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#6c757d';
                    e.target.style.transform = 'scale(1)';
                  }}
                >
                  ×
                </button>

                {/* Modal Header */}
                <div style={{
                  marginBottom: '32px',
                  borderBottom: '2px solid #e9ecef',
                  paddingBottom: '20px'
                }}>
                  <h2 style={{
                    color: '#2F3B70',
                    fontSize: '1.8rem',
                    fontWeight: '800',
                    margin: '0 0 8px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '1px'
                  }}>
                    Appointment Details
                  </h2>
                  <p style={{
                    color: '#6c757d',
                    fontSize: '1.1rem',
                    margin: '0',
                    fontWeight: '500'
                  }}>
                    {selectedAppointment.date ? new Date(selectedAppointment.date).toDateString() : 'No date specified'}
                  </p>
                </div>

                {/* Client Information Section */}
                <div style={{
                  marginBottom: '32px',
                  background: '#f8f9fa',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #e9ecef'
                }}>
                  <h3 style={{
                    color: '#2F3B70',
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    margin: '0 0 20px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Client Information
                  </h3>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px'
                  }}>
                    <div>
                      <strong style={{ color: '#2F3B70', display: 'block', marginBottom: '8px' }}>Name:</strong>
                      <span style={{ color: '#2F3B70' }}>{selectedAppointment.name || 'Not specified'}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#2F3B70', display: 'block', marginBottom: '8px' }}>Time:</strong>
                      <span style={{ color: '#2F3B70' }}>{selectedAppointment.time || 'Not specified'}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#2F3B70', display: 'block', marginBottom: '8px' }}>Type of Service:</strong>
                      <span style={{ color: '#2F3B70' }}>{selectedAppointment.serviceType || 'Not specified'}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#2F3B70', display: 'block', marginBottom: '8px' }}>Vessel Type:</strong>
                      <span style={{ color: '#2F3B70' }}>{selectedAppointment.vesselType || 'Not specified'}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#2F3B70', display: 'block', marginBottom: '8px' }}>Created By:</strong>
                      <span style={{ color: '#2F3B70' }}>{selectedAppointment.userEmail || 'Not specified'}</span>
                    </div>
                    {selectedAppointment.assignedWorkers && selectedAppointment.assignedWorkers.length > 0 && (
                      <div style={{ gridColumn: '1 / -1' }}>
                        <strong style={{ color: '#2F3B70', display: 'block', marginBottom: '8px' }}>Assigned Workers:</strong>
                        <div style={{ 
                          display: 'flex',
                          flexWrap: 'wrap',
                          gap: '8px',
                          marginTop: '4px'
                        }}>
                          {selectedAppointment.assignedWorkers.map((worker, workerIdx) => (
                            <span key={workerIdx} style={{ 
                              display: 'inline-block',
                              padding: '6px 12px',
                              background: '#2F3B70',
                              color: 'white',
                              borderRadius: '16px',
                              fontSize: '0.9rem',
                              fontWeight: '500'
                            }}>
                              {worker}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Report Information Section */}
                <div style={{
                  background: '#f8f9fa',
                  borderRadius: '16px',
                  padding: '24px',
                  border: '1px solid #e9ecef'
                }}>
                  <h3 style={{
                    color: '#2F3B70',
                    fontSize: '1.3rem',
                    fontWeight: '700',
                    margin: '0 0 20px 0',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>
                    Report Information
                  </h3>
                  
                  {/* Basic Information */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
                    gap: '20px',
                    marginBottom: '24px'
                  }}>
                    <div>
                      <strong style={{ color: '#2F3B70', display: 'block', marginBottom: '8px' }}>Port Location:</strong>
                      <span style={{ color: '#2F3B70' }}>{tableData.portLocation || 'Not specified'}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#2F3B70', display: 'block', marginBottom: '8px' }}>Voyage No.:</strong>
                      <span style={{ color: '#2F3B70' }}>{tableData.voyageNo || 'Not specified'}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#2F3B70', display: 'block', marginBottom: '8px' }}>Vessel Name:</strong>
                      <span style={{ color: '#2F3B70' }}>{tableData.vesselName || 'Not specified'}</span>
                    </div>
                    <div>
                      <strong style={{ color: '#2F3B70', display: 'block', marginBottom: '8px' }}>Purpose of Call:</strong>
                      <span style={{ color: '#2F3B70' }}>{tableData.purposeOfCall || 'Not specified'}</span>
                    </div>
                  </div>

                  {/* Work Activities Table */}
                  <div>
                    <h4 style={{
                      color: '#2F3B70',
                      fontSize: '1.1rem',
                      fontWeight: '600',
                      margin: '0 0 16px 0',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      Work Activities
                    </h4>
                    <div style={{
                      background: 'white',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      border: '1px solid #e9ecef'
                    }}>
                      <table style={{
                        width: '100%',
                        borderCollapse: 'collapse'
                      }}>
                        <thead>
                          <tr style={{
                            background: '#eaf3ff'
                          }}>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'left',
                              fontWeight: '600',
                              color: '#2F3B70',
                              borderBottom: '1px solid #e9ecef'
                            }}>Work Activity</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontWeight: '600',
                              color: '#2F3B70',
                              borderBottom: '1px solid #e9ecef'
                            }}>Time Scheduled</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontWeight: '600',
                              color: '#2F3B70',
                              borderBottom: '1px solid #e9ecef'
                            }}>Time Started</th>
                            <th style={{
                              padding: '12px 16px',
                              textAlign: 'center',
                              fontWeight: '600',
                              color: '#2F3B70',
                              borderBottom: '1px solid #e9ecef'
                            }}>Time Done</th>
                          </tr>
                        </thead>
                        <tbody>
                          {tableData.workActivities.map((activity, index) => (
                            <tr key={index} style={{
                              background: index % 2 === 0 ? '#f8f9fa' : 'white'
                            }}>
                              <td style={{
                                padding: '12px 16px',
                                borderBottom: '1px solid #e9ecef',
                                color: '#2F3B70'
                              }}>{activity.activity || 'Not specified'}</td>
                              <td style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                borderBottom: '1px solid #e9ecef',
                                color: '#2F3B70'
                              }}>{activity.timeScheduled || 'Not specified'}</td>
                              <td style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                borderBottom: '1px solid #e9ecef',
                                color: '#2F3B70'
                              }}>{activity.timeStarted || 'Not specified'}</td>
                              <td style={{
                                padding: '12px 16px',
                                textAlign: 'center',
                                borderBottom: '1px solid #e9ecef',
                                color: '#2F3B70'
                              }}>{activity.timeDone || 'Not specified'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          <div className="report-nav-btns" style={{ marginTop: '18px', textAlign: 'right' }}>
            <button
              className="report-nav-btn"
              onClick={() => setActiveContainer((activeContainer - 1 + containers.length) % containers.length)}
              disabled={activeContainer === 0}
              style={{
                background: '#eaf3ff',
                color: '#b0b7d1',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                fontWeight: 'bold',
                fontSize: '1rem',
                marginRight: '8px',
                cursor: activeContainer === 0 ? 'not-allowed' : 'pointer',
                opacity: activeContainer === 0 ? 0.6 : 1,
              }}
            >
              &#8592; Previous
            </button>
            <button
              className="report-nav-btn"
              onClick={() => setActiveContainer((activeContainer + 1) % containers.length)}
              disabled={activeContainer === containers.length - 1}
              style={{
                background: '#ffe14d',
                color: '#222',
                border: 'none',
                borderRadius: '6px',
                padding: '8px 18px',
                fontWeight: 'bold',
                fontSize: '1rem',
                cursor: activeContainer === containers.length - 1 ? 'not-allowed' : 'pointer',
                opacity: activeContainer === containers.length - 1 ? 0.6 : 1,
              }}
            >
              Next &#8594;
            </button>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Report;
