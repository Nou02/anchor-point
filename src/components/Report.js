import React, { useEffect, useState } from 'react';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
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







return (
  <div style={{ minHeight: '100vh', width: '100vw', background: 'linear-gradient(135deg, #dbeafe 0%, #eaf3ff 100%)' }}>
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div style={{ width: '100%', maxWidth: '900px' }}>
        {activeContainer === 0 && (
          <table className="report-table" style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 0, borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 24px rgba(44,62,80,0.10)', margin: '0 auto' }}>
            <tbody>
              <tr>
                <th style={{ background: '#5c6ab0', color: '#fff', fontWeight: 'bold', fontSize: '1.15rem', borderTopLeftRadius: '18px' }}>Port Location</th>
                <td style={{ background: '#fff' }}></td>
                <th style={{ background: '#5c6ab0', color: '#fff', fontWeight: 'bold', fontSize: '1.15rem' }}>Voyage No.:</th>
                <td style={{ background: '#fff', borderTopRightRadius: '18px' }}></td>
              </tr>
              <tr>
                <th style={{ background: '#5c6ab0', color: '#fff', fontWeight: 'bold', fontSize: '1.15rem' }}>Vessel Name:</th>
                <td style={{ background: '#f7f9fc' }}></td>
                <th style={{ background: '#5c6ab0', color: '#fff', fontWeight: 'bold', fontSize: '1.15rem' }}>Purpose of Call:</th>
                <td style={{ background: '#f7f9fc' }}></td>
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
              {[...Array(7)].map((_, i) => (
                <tr key={i}>
                  <td style={{ background: i % 2 === 0 ? '#f5f7fa' : '#fff', height: '38px' }}></td>
                  <td style={{ background: i % 2 === 0 ? '#f5f7fa' : '#fff' }}></td>
                  <td style={{ background: i % 2 === 0 ? '#f5f7fa' : '#fff' }}></td>
                  <td style={{ background: i % 2 === 0 ? '#f5f7fa' : '#fff' }}></td>
                </tr>
              ))}
            </tbody>
          </table>
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
