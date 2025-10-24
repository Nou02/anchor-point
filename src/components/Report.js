import React, { useState, useEffect } from 'react';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import api from '../services/api';
import './Report.css';

const Report = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactions, setTransactions] = useState([]);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
      } else {
        setCurrentUser(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Fetch transaction data from both Firebase and Excel
  const fetchTransactions = async () => {
    try {
      setIsLoadingTransactions(true);
      
      // First, try to get data from Excel file
      try {
        const excelResponse = await api.get('/excel/vessels-log');
        if (excelResponse.data.success && excelResponse.data.vessels) {
          const excelData = excelResponse.data.vessels.map((vessel, index) => ({
            id: `excel_${index}`,
            date: vessel.date,
            vesselName: vessel.vessel,
            voyageNo: vessel.voyage,
            portLocation: vessel.port,
            purposeOfCall: vessel.purpose,
            controlId: vessel.controlId,
            workActivities: [],
            lastUpdated: new Date().toISOString(),
            updatedBy: vessel.updatedBy
          }));
          
          setTransactions(excelData);
          console.log('Loaded transactions from Excel file:', excelData.length);
          setIsLoadingTransactions(false);
          return;
        }
      } catch (excelError) {
        console.log('Excel data not available, falling back to Firebase:', excelError.message);
      }
      
      // Fallback to Firebase data
      const db = getFirestore();
      const transactionsRef = collection(db, 'workActivities');
      const q = query(transactionsRef, orderBy('date', 'desc'));
      const querySnapshot = await getDocs(q);
      
      const transactionData = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        transactionData.push({
          id: doc.id,
          date: data.date,
          vesselName: data.vesselName || 'N/A',
          voyageNo: data.voyageNo || 'N/A',
          portLocation: data.portLocation || 'N/A',
          purposeOfCall: data.purposeOfCall || 'N/A',
          controlId: data.controlId || 'N/A',
          workActivities: data.workActivities || [],
          lastUpdated: data.lastUpdated,
          updatedBy: data.updatedBy || 'Unknown'
        });
      });
      
      setTransactions(transactionData);
      console.log('Loaded transactions from Firebase:', transactionData.length);
      setIsLoadingTransactions(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setIsLoadingTransactions(false);
    }
  };

  // Load transactions on component mount and ensure they're refreshed
  useEffect(() => {
    fetchTransactions();
  }, []);

  // Auto-refresh transactions every 30 seconds to ensure latest data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="report-page-bg" style={{ minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: '20px' }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
          padding: '50px',
          margin: '40px auto',
          maxWidth: '1400px',
          minWidth: '1200px',
          height: 'calc(100vh - 80px)',
          overflow: 'auto',
          paddingBottom: '200px'
        }}>
          {/* Report Header Title */}
          <div style={{
            textAlign: 'center',
            marginBottom: '40px',
            padding: '20px 0'
          }}>
            <h1 style={{
              fontSize: '2.5rem',
              fontWeight: '700',
              color: '#1e3a8a',
              margin: '0 0 12px 0',
              letterSpacing: '0.5px',
              textShadow: '0 2px 4px rgba(30, 58, 138, 0.1)'
            }}>
              Anchor Point Past History Reports
            </h1>
            <p style={{
              fontSize: '1.2rem',
              color: '#64748b',
              margin: '0',
              fontWeight: '500'
            }}>
              Comprehensive overview of all maritime operations and transaction history
            </p>
          </div>

          {/* Report Content Container */}
          <div style={{
            background: 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
            borderRadius: '16px',
            padding: '30px',
            border: '1px solid #dee2e6',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
            marginBottom: '30px'
          }}>
            {isLoadingTransactions ? (
              <div style={{
                textAlign: 'center',
                padding: '80px 40px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '50%',
                  zIndex: 1
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '80px',
                  height: '80px',
                  background: 'rgba(59, 130, 246, 0.05)',
                  borderRadius: '50%',
                  zIndex: 1
                }}></div>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{
                    width: '60px',
                    height: '60px',
                    border: '4px solid #e5e7eb',
                    borderTop: '4px solid #3b82f6',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                    margin: '0 auto 24px',
                    display: 'block'
                  }}></div>
                  <div style={{
                    fontSize: '1.3rem',
                    color: '#1e40af',
                    marginBottom: '12px',
                    fontWeight: '600',
                    letterSpacing: '0.5px'
                  }}>
                    Loading Transaction Reports...
                  </div>
                  <div style={{
                    fontSize: '1rem',
                    color: '#64748b',
                    lineHeight: '1.6'
                  }}>
                    Fetching the latest maritime operations data
                  </div>
                </div>
              </div>
            ) : transactions.length > 0 ? (
              <div style={{
                background: 'white',
                borderRadius: '16px',
                border: '1px solid #e8f0fe',
                overflow: 'hidden',
                boxShadow: '0 8px 32px rgba(47, 59, 112, 0.12)',
                position: 'relative'
              }}>
                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                  background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 100%)',
                  color: 'white',
                  fontWeight: '700',
                  fontSize: '0.95rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  position: 'relative',
                  zIndex: 2
                }}>
                  <div style={{ 
                    padding: '20px 15px', 
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V7H5V5H19M5,19V9H19V19H5Z"/>
                    </svg>
                    Date
                  </div>
                  <div style={{ 
                    padding: '20px 15px', 
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                    </svg>
                    Vessel
                  </div>
                  <div style={{ 
                    padding: '20px 15px', 
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                    </svg>
                    Voyage
                  </div>
                  <div style={{ 
                    padding: '20px 15px', 
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                    </svg>
                    Port
                  </div>
                  <div style={{ 
                    padding: '20px 15px', 
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                    </svg>
                    Purpose
                  </div>
                  <div style={{ 
                    padding: '20px 15px', 
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                    </svg>
                    Control ID
                  </div>
                  <div style={{ 
                    padding: '20px 15px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                    </svg>
                    Updated By
                  </div>
                </div>

                {/* Transaction Rows */}
                {transactions.map((transaction, index) => (
                  <div key={transaction.id} style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                    borderBottom: '1px solid #f1f5f9',
                    background: index % 2 === 0 ? 'rgba(248, 250, 252, 0.5)' : 'white',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      padding: '18px 15px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1e40af',
                      fontWeight: '600',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        borderRadius: '50%',
                        background: '#3b82f6',
                        flexShrink: 0
                      }}></div>
                      {new Date(transaction.date).toLocaleDateString()}
                    </div>
                    <div style={{ 
                      padding: '18px 15px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem'
                    }}>
                      {transaction.vesselName}
                    </div>
                    <div style={{ 
                      padding: '18px 15px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem'
                    }}>
                      {transaction.voyageNo}
                    </div>
                    <div style={{ 
                      padding: '18px 15px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem'
                    }}>
                      {transaction.portLocation}
                    </div>
                    <div style={{ 
                      padding: '18px 15px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem'
                    }}>
                      {transaction.purposeOfCall}
                    </div>
                    <div style={{ 
                      padding: '18px 15px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem'
                    }}>
                      {transaction.controlId}
                    </div>
                    <div style={{ 
                      padding: '18px 15px',
                      color: '#6b7280',
                      fontSize: '0.9rem',
                      fontWeight: '400',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '32px',
                        height: '32px',
                        borderRadius: '50%',
                        background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        flexShrink: 0
                      }}>
                        {transaction.updatedBy.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontSize: '0.85rem' }}>
                        {transaction.updatedBy}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '80px 40px',
                background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 16px rgba(0, 0, 0, 0.05)',
                position: 'relative',
                overflow: 'hidden'
              }}>
                <div style={{
                  position: 'absolute',
                  top: '-20px',
                  right: '-20px',
                  width: '100px',
                  height: '100px',
                  background: 'rgba(59, 130, 246, 0.1)',
                  borderRadius: '50%',
                  zIndex: 1
                }}></div>
                <div style={{
                  position: 'absolute',
                  bottom: '-30px',
                  left: '-30px',
                  width: '80px',
                  height: '80px',
                  background: 'rgba(59, 130, 246, 0.05)',
                  borderRadius: '50%',
                  zIndex: 1
                }}></div>
                <div style={{ position: 'relative', zIndex: 2 }}>
                  <div style={{
                    width: '80px',
                    height: '80px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    boxShadow: '0 8px 24px rgba(59, 130, 246, 0.3)'
                  }}>
                    <svg width="40" height="40" fill="white" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                  </div>
                  <div style={{
                    fontSize: '1.5rem',
                    color: '#1e40af',
                    marginBottom: '12px',
                    fontWeight: '700',
                    letterSpacing: '0.5px'
                  }}>
                    No Transaction Data Available
                  </div>
                  <div style={{
                    fontSize: '1.1rem',
                    color: '#64748b',
                    lineHeight: '1.6',
                    maxWidth: '400px',
                    margin: '0 auto'
                  }}>
                    Transaction reports will appear here once work activities are recorded and submitted by the team.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Report;