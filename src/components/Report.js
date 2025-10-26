import React, { useState, useEffect, useMemo } from 'react';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import api from '../services/api';
import './Report.css';
// Using dynamic import for xlsx to handle potential module resolution issues
let XLSX;

const Report = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [yearFilter, setYearFilter] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [vesselData, setVesselData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

  // Fetch Excel data from the Vessels Log.xlsx file
  const fetchExcelData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Dynamically import xlsx library
      if (!XLSX) {
        XLSX = await import('xlsx');
      }
      
      // Fetch Excel file from public folder
      const response = await fetch('/Vessels Log.xlsx');
      if (!response.ok) throw new Error('Failed to fetch Excel file');
      
      const arrayBuffer = await response.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      
      // Process all sheets and combine data
      let allMappedRows = [];
      
      for (const sheetName of workbook.SheetNames) {
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Find the header row
        let headerRowIndex = 0;
        for (let i = 0; i < jsonData.length; i++) {
          if (jsonData[i] && jsonData[i].includes('Vessel')) {
            headerRowIndex = i;
            break;
          }
        }
        
        const headers = jsonData[headerRowIndex];
        const dataRows = jsonData.slice(headerRowIndex + 1);
        
        // Convert to objects with proper column mapping
        const mappedRows = dataRows.map(row => {
          const obj = {};
          
          // Handle different sheet structures
          if (sheetName === '2023') {
            obj['No'] = row[0] || '';
            obj['Vessel'] = row[1] || '';
            obj['Service'] = 'W/MOORING BUOY';
            obj['Control Number'] = row[2] || '';
            obj['Voyage Number'] = row[3] || '';
            obj['Date'] = row[4] || '';
          } else if (sheetName === '2024') {
            obj['No'] = row[0] || '';
            obj['Vessel'] = row[1] || '';
            obj['Service'] = 'W/MOORING BUOY';
            obj['Control Number'] = row[3] || '';
            obj['Voyage Number'] = row[4] || '';
            obj['Date'] = row[5] || '';
          } else {
            obj['No'] = row[0] || '';
            obj['Vessel'] = row[1] || '';
            obj['Service'] = row[2] || '';
            obj['Control Number'] = row[3] || '';
            obj['Voyage Number'] = row[4] || '';
            obj['Date'] = row[5] || '';
          }
          return obj;
        });
        
        allMappedRows = allMappedRows.concat(mappedRows);
      }
      
      setVesselData(allMappedRows);
      setLoading(false);
    } catch (e) {
      setError(e.message);
      setVesselData([]);
      setLoading(false);
    }
  };

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
          
          setAllTransactions(excelData);
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
      
      setAllTransactions(transactionData);
      setTransactions(transactionData);
      console.log('Loaded transactions from Firebase:', transactionData.length);
      setIsLoadingTransactions(false);
    } catch (error) {
      console.error('Error fetching transactions:', error);
      setIsLoadingTransactions(false);
    }
  };

  // Process Excel data into transaction format
  const processExcelData = () => {
    if (vesselData.length === 0) return;
    
    const processedData = vesselData.map((vessel, index) => ({
      id: `excel_${index}`,
      date: vessel['Date'] || new Date().toISOString(),
      vesselName: vessel['Vessel'] || 'N/A',
      voyageNo: vessel['Voyage Number'] || 'N/A',
      portLocation: 'Port Location', // Default value
      purposeOfCall: vessel['Service'] || 'N/A',
      controlId: vessel['Control Number'] || 'N/A',
      workActivities: [],
      lastUpdated: new Date().toISOString(),
      updatedBy: 'System'
    }));
    
    setAllTransactions(processedData);
    setTransactions(processedData);
    setIsLoadingTransactions(false);
  };

  // Extract available years from vessel data
  const extractAvailableYears = (data) => {
    const years = new Set();
    data.forEach(vessel => {
      if (vessel['Date']) {
        const date = new Date(vessel['Date']);
        if (!isNaN(date.getTime())) {
          years.add(date.getFullYear());
        }
      }
    });
    return Array.from(years).sort((a, b) => b - a); // Sort descending (newest first)
  };

  // Filter transactions based on year
  const filteredTransactions = useMemo(() => {
    if (!yearFilter) {
      return allTransactions;
    }
    
    return allTransactions.filter(transaction => {
      const transactionDate = new Date(transaction.date);
      const transactionYear = transactionDate.getFullYear();
      return transactionYear.toString() === yearFilter;
    });
  }, [allTransactions, yearFilter]);

  // Handle year filter changes
  const handleYearFilterChange = (value) => {
    setYearFilter(value);
  };

  // Clear year filter
  const clearYearFilter = () => {
    setYearFilter('');
  };

  // Load Excel data and transactions on component mount
  useEffect(() => {
    fetchExcelData();
    fetchTransactions();
  }, []);

  // Process Excel data when vesselData changes
  useEffect(() => {
    if (vesselData.length > 0) {
      processExcelData();
      const years = extractAvailableYears(vesselData);
      setAvailableYears(years);
    }
  }, [vesselData]);

  // Update transactions when filteredTransactions changes
  useEffect(() => {
    setTransactions(filteredTransactions);
  }, [filteredTransactions]);

  // Auto-refresh transactions every 30 seconds to ensure latest data
  useEffect(() => {
    const interval = setInterval(() => {
      fetchTransactions();
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="report-page-bg" style={{ minHeight: '100vh', width: '100vw', overflow: 'hidden' }}>
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-start', minHeight: '100vh', padding: '10px' }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.15)',
          backdropFilter: 'blur(25px)',
          borderRadius: '24px',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          boxShadow: '0 16px 48px rgba(0, 0, 0, 0.12), 0 4px 16px rgba(0, 0, 0, 0.08)',
          padding: '30px',
          margin: '20px auto',
          maxWidth: '1400px',
          minWidth: '1200px',
          maxHeight: 'calc(100vh - 60px)',
          overflow: 'auto',
          paddingBottom: '30px',
          position: 'relative'
        }}>
          {/* Report Header Title */}
          <div style={{
            textAlign: 'center',
            marginBottom: '20px',
            padding: '10px 0'
          }}>
            <h1 style={{
              fontSize: '2.2rem',
              fontWeight: '800',
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 12px 0',
              letterSpacing: '0.8px',
              textShadow: '0 4px 8px rgba(30, 58, 138, 0.2)',
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
            }}>
              Anchor Point Past History Reports
            </h1>
            <p style={{
              fontSize: '1.1rem',
              color: 'rgba(255, 255, 255, 0.9)',
              margin: '0',
              fontWeight: '600',
              textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              letterSpacing: '0.3px'
            }}>
              Comprehensive overview of all maritime operations and transaction history
            </p>
          </div>

          {/* Year Filter Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
            marginBottom: '20px',
            position: 'relative'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              flexWrap: 'wrap'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: 'rgba(255, 255, 255, 0.95)',
                fontWeight: '700',
                fontSize: '1.1rem',
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.2)',
                letterSpacing: '0.3px'
              }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
                </svg>
                Filter by Year:
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                flexWrap: 'wrap'
              }}>
                <div style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '4px'
                }}>
                  <label style={{
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#374151'
                  }}>
                    Select Year
                  </label>
                  <select
                    value={yearFilter}
                    onChange={(e) => handleYearFilterChange(e.target.value)}
                    style={{
                      padding: '8px 12px',
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      fontSize: '0.8rem',
                      color: '#374151',
                      background: 'white',
                      transition: 'all 0.3s ease',
                      minWidth: '120px'
                    }}
                  >
                    <option value="">All Years</option>
                    {availableYears.map(year => (
                      <option key={year} value={year.toString()}>
                        {year}
                      </option>
                    ))}
                  </select>
                </div>
                
                <button
                  onClick={clearYearFilter}
                  style={{
                    padding: '8px 16px',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '0.9rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 4px 12px rgba(59, 130, 246, 0.4)';
                  }}
                  onMouseOut={(e) => {
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 2px 8px rgba(59, 130, 246, 0.3)';
                  }}
                >
                  Clear Filter
                </button>
              </div>
              
              <div style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280',
                fontSize: '0.9rem',
                fontWeight: '500'
              }}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                </svg>
                Showing {filteredTransactions.length} of {allTransactions.length} records
                {yearFilter && (
                  <span style={{ color: '#1e40af', fontWeight: '600' }}>
                    for {yearFilter}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Report Content Container */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.2)',
            backdropFilter: 'blur(20px)',
            borderRadius: '20px',
            padding: '20px',
            border: '1px solid rgba(255, 255, 255, 0.4)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
            marginBottom: '30px',
            position: 'relative'
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
                background: 'rgba(255, 255, 255, 0.25)',
                backdropFilter: 'blur(15px)',
                borderRadius: '20px',
                border: '1px solid rgba(255, 255, 255, 0.5)',
                overflow: 'hidden',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08)',
                position: 'relative'
              }}>
                {/* Table Header */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr 1fr',
                  background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.9) 0%, rgba(59, 130, 246, 0.9) 50%, rgba(6, 182, 212, 0.9) 100%)',
                  backdropFilter: 'blur(10px)',
                  color: 'white',
                  fontWeight: '800',
                  fontSize: '0.85rem',
                  textTransform: 'uppercase',
                  letterSpacing: '0.8px',
                  position: 'relative',
                  zIndex: 2,
                  textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)'
                }}>
                  <div style={{ 
                    padding: '12px 10px', 
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
                    padding: '12px 10px', 
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
                    padding: '12px 10px', 
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
                    padding: '12px 10px', 
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
                    padding: '12px 10px', 
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
                    padding: '12px 10px', 
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
                    padding: '12px 10px',
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
                    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                    background: index % 2 === 0 ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    backdropFilter: 'blur(5px)',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      padding: '10px 8px', 
                      borderRight: '1px solid #f1f5f9',
                      color: 'rgba(255, 255, 255, 0.95)',
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
                      padding: '10px 8px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem'
                    }}>
                      {transaction.vesselName}
                    </div>
                    <div style={{ 
                      padding: '10px 8px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem'
                    }}>
                      {transaction.voyageNo}
                    </div>
                    <div style={{ 
                      padding: '10px 8px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem'
                    }}>
                      {transaction.portLocation}
                    </div>
                    <div style={{ 
                      padding: '10px 8px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem'
                    }}>
                      {transaction.purposeOfCall}
                    </div>
                    <div style={{ 
                      padding: '10px 8px', 
                      borderRight: '1px solid #f1f5f9',
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem'
                    }}>
                      {transaction.controlId}
                    </div>
                    <div style={{ 
                      padding: '10px 8px',
                      color: '#6b7280',
                      fontSize: '0.8rem',
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