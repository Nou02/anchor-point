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

  return (
    <div style={{ minHeight: '100vh', width: '100vw', background: 'linear-gradient(135deg, #dbeafe 0%, #eaf3ff 100%)' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <div style={{ width: '100%', maxWidth: '900px' }}>
          {activeContainer === 0 && (
            <>
              <table className="report-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(44,62,80,0.10)', margin: '0 auto' }}>
                <tbody>
                  <tr>
                    <th style={{ background: '#5c6ab0', color: '#fff', fontWeight: 'bold', fontSize: '1.15rem', borderTopLeftRadius: '18px' }}>Port Location</th>
                    <td style={{ background: '#fff', padding: '8px 12px' }}>
                      {isAliceAuthorized ? (
                        <input
                          type="text"
                          value={tableData.portLocation}
                          onChange={(e) => handleInputChange(e, 'portLocation')}
                          onFocus={handleInputFocus}
                          onBlur={(e) => handleInputBlur(e, 'portLocation')}
                          style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px' }}
                          placeholder="Enter port location"
                        />
                      ) : (
                        <span>{tableData.portLocation || ''}</span>
                      )}
                    </td>
                    <th style={{ background: '#5c6ab0', color: '#fff', fontWeight: 'bold', fontSize: '1.15rem' }}>Voyage No.:</th>
                    <td style={{ background: '#fff', borderTopRightRadius: '18px', padding: '8px 12px' }}>
                      {isAliceAuthorized ? (
                        <input
                          type="text"
                          value={tableData.voyageNo}
                          onChange={(e) => handleInputChange(e, 'voyageNo')}
                          onFocus={handleInputFocus}
                          onBlur={(e) => handleInputBlur(e, 'voyageNo')}
                          style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px' }}
                          placeholder="Enter voyage number"
                        />
                      ) : (
                        <span>{tableData.voyageNo || ''}</span>
                      )}
                    </td>
                  </tr>
                  <tr>
                    <th style={{ background: '#5c6ab0', color: '#fff', fontWeight: 'bold', fontSize: '1.15rem' }}>Vessel Name:</th>
                    <td style={{ background: '#f7f9fc', padding: '8px 12px' }}>
                      {isAliceAuthorized ? (
                        <input
                          type="text"
                          value={tableData.vesselName}
                          onChange={(e) => handleInputChange(e, 'vesselName')}
                          onFocus={handleInputFocus}
                          onBlur={(e) => handleInputBlur(e, 'vesselName')}
                          style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px' }}
                          placeholder="Enter vessel name"
                        />
                      ) : (
                        <span>{tableData.vesselName || ''}</span>
                      )}
                    </td>
                    <th style={{ background: '#5c6ab0', color: '#fff', fontWeight: 'bold', fontSize: '1.15rem' }}>Purpose of Call:</th>
                    <td style={{ background: '#f7f9fc', padding: '8px 12px' }}>
                      {isAliceAuthorized ? (
                        <input
                          type="text"
                          value={tableData.purposeOfCall}
                          onChange={(e) => handleInputChange(e, 'purposeOfCall')}
                          onFocus={handleInputFocus}
                          onBlur={(e) => handleInputBlur(e, 'purposeOfCall')}
                          style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px' }}
                          placeholder="Enter purpose of call"
                        />
                      ) : (
                        <span>{tableData.purposeOfCall || ''}</span>
                      )}
                    </td>
                  </tr>
                  <tr className="work-header">
                    <th colSpan="4" style={{ background: '#5c6ab0', color: '#ffe14d', fontWeight: 'bold', fontSize: '1.3rem', textAlign: 'center', letterSpacing: '1px', borderTopLeftRadius: 0, borderTopRightRadius: 0, borderBottom: '3px solid #ffe14d' }}>
                      Work Activity
                    </th>
                  </tr>
                  <tr className="work-subheader">
                    <th style={{ background: '#eaf3ff', color: '#2d3e5e', fontWeight: 'bold', fontSize: '1.08rem', textAlign: 'center' }}>Work Activity</th>
                    <th style={{ background: '#eaf3ff', color: '#2d3e5e', fontWeight: 'bold', fontSize: '1.08rem', textAlign: 'center' }}>Time Scheduled</th>
                    <th style={{ background: '#eaf3ff', color: '#2d3e5e', fontWeight: 'bold', fontSize: '1.08rem', textAlign: 'center' }}>Time Started</th>
                    <th style={{ background: '#eaf3ff', color: '#2d3e5e', fontWeight: 'bold', fontSize: '1.08rem', textAlign: 'center' }}>Time Done</th>
                  </tr>
                  {tableData.workActivities.map((activity, index) => (
                    <tr key={index}>
                      <td style={{ background: index % 2 === 0 ? '#f5f7fa' : '#fff', height: '38px', padding: '8px 12px' }}>
                        {isAliceAuthorized ? (
                          <input
                            type="text"
                            value={activity.activity}
                            onChange={(e) => handleInputChange(e, 'activity', index)}
                            onFocus={handleInputFocus}
                            onBlur={(e) => handleInputBlur(e, 'activity', index)}
                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' }}
                            placeholder="Enter work activity"
                          />
                        ) : (
                          <span>{activity.activity || ''}</span>
                        )}
                      </td>
                      <td style={{ background: index % 2 === 0 ? '#f5f7fa' : '#fff', padding: '8px 12px' }}>
                        {isAliceAuthorized ? (
                          <input
                            type="time"
                            value={activity.timeScheduled}
                            onChange={(e) => handleInputChange(e, 'timeScheduled', index)}
                            onFocus={handleInputFocus}
                            onBlur={(e) => handleInputBlur(e, 'timeScheduled', index)}
                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' }}
                          />
                        ) : (
                          <span>{activity.timeScheduled || ''}</span>
                        )}
                      </td>
                      <td style={{ background: index % 2 === 0 ? '#f5f7fa' : '#fff', padding: '8px 12px' }}>
                        {isAliceAuthorized ? (
                          <input
                            type="time"
                            value={activity.timeStarted}
                            onChange={(e) => handleInputChange(e, 'timeStarted', index)}
                            onFocus={handleInputFocus}
                            onBlur={(e) => handleInputBlur(e, 'timeStarted', index)}
                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' }}
                          />
                        ) : (
                          <span>{activity.timeStarted || ''}</span>
                        )}
                      </td>
                      <td style={{ background: index % 2 === 0 ? '#f5f7fa' : '#fff', padding: '8px 12px' }}>
                        {isAliceAuthorized ? (
                          <input
                            type="time"
                            value={activity.timeDone}
                            onChange={(e) => handleInputChange(e, 'timeDone', index)}
                            onFocus={handleInputFocus}
                            onBlur={(e) => handleInputBlur(e, 'timeDone', index)}
                            style={{ width: '100%', border: 'none', outline: 'none', fontSize: '14px', background: 'transparent' }}
                          />
                        ) : (
                          <span>{activity.timeDone || ''}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {/* Save Button */}
              <div style={{ marginTop: '20px', textAlign: 'center' }}>
                <button
                  onClick={saveReportData}
                  disabled={isSaving || !isAliceAuthorized}
                  style={{
                    background: isAliceAuthorized ? '#28a745' : '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '12px 24px',
                    fontWeight: 'bold',
                    fontSize: '16px',
                    cursor: isAliceAuthorized && !isSaving ? 'pointer' : 'not-allowed',
                    opacity: isAliceAuthorized && !isSaving ? 1 : 0.6,
                    boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                    transition: 'all 0.3s ease'
                  }}
                  onMouseEnter={(e) => {
                    if (isAliceAuthorized && !isSaving) {
                      e.target.style.transform = 'translateY(-2px)';
                      e.target.style.boxShadow = '0 4px 12px rgba(0,0,0,0.15)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (isAliceAuthorized && !isSaving) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
                    }
                  }}
                >
                  {isSaving ? '💾 Saving...' : '💾 Save Report'}
                </button>
                
                {/* Save Message */}
                {saveMessage && (
                  <div style={{
                    marginTop: '12px',
                    padding: '8px 16px',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    background: saveMessage.includes('✅') ? '#d4edda' : '#f8d7da',
                    color: saveMessage.includes('✅') ? '#155724' : '#721c24',
                    border: `1px solid ${saveMessage.includes('✅') ? '#c3e6cb' : '#f5c6cb'}`
                  }}>
                    {saveMessage}
                  </div>
                )}
              </div>
            </>
          )}
          {activeContainer === 1 && (
            <div className="report-details-row" style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '32px' }}>
              <div className="suggested-files-container">
                <h3 className="suggested-files-title">Suggested files</h3>
                {Object.keys(grouped).length === 0 ? (
                  <div className="suggested-files-empty">No appointments found.</div>
                ) : (
                  Object.keys(grouped).sort((a, b) => new Date(b) - new Date(a)).map(dayKey => (
                    <div key={dayKey} className="suggested-file-card">
                      <div className="suggested-file-header">
                        <span role="img" aria-label="file" className="suggested-file-icon">📄</span>
                        <div>
                          <div className="suggested-file-date">{formatDay(dayKey)}</div>
                          <div className="suggested-file-meta">You modified • {new Date(dayKey).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' })}</div>
                        </div>
                      </div>
                      <div className="suggested-file-divider"></div>
                      <div className="suggested-file-list">
                        <ul className="suggested-file-ul">
                          {grouped[dayKey].map((app, idx) => (
                            <li key={app.id} className="suggested-file-li">
                              <span role="img" aria-label="doc" className="suggested-file-doc-icon">📄</span>
                              <span className="suggested-file-appointment">Appointment {idx + 1}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  ))
                )}
              </div>
              <div className="additional-container">
                <div className="analytics-title">Analytics</div>
                <div className="analytics-chart-area">
                  <svg width="220" height="220" viewBox="0 0 220 220">
                    <circle r="100" cx="110" cy="110" fill="#2d3e5e" />
                    <path d="M110,10 A100,100 0 1,1 207.78,62.22 L110,110 Z" fill="#ff3c3c" />
                    <text x="60" y="120" textAnchor="middle" fontSize="2rem" fill="#fff" fontWeight="bold">23</text>
                    <text x="160" y="140" textAnchor="middle" fontSize="2rem" fill="#fff" fontWeight="bold">34</text>
                  </svg>
                  <div className="analytics-legend">
                    <div className="analytics-legend-item">
                      <span className="analytics-legend-dot" style={{ background: '#2d3e5e' }}></span>
                      <span className="analytics-legend-label">Foreign Vessel</span>
                    </div>
                    <div className="analytics-legend-item">
                      <span className="analytics-legend-dot" style={{ background: '#ff3c3c' }}></span>
                      <span className="analytics-legend-label">Local Vessel</span>
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
