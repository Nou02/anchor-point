import React, { useState, useEffect, useMemo } from 'react';
import { getFirestore, doc, setDoc, getDoc, collection, query, orderBy, getDocs } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import api from '../services/api';
import './Report.css';

const Report = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);
  const [transactions, setTransactions] = useState([]);
  const [allTransactions, setAllTransactions] = useState([]);
  const [yearFilter, setYearFilter] = useState('');
  const [availableYears, setAvailableYears] = useState([]);
  const [availableSheets, setAvailableSheets] = useState([]);
  const [vesselData, setVesselData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Search filter states
  const [vesselNameFilter, setVesselNameFilter] = useState('');
  const [voyageIdFilter, setVoyageIdFilter] = useState('');
  const [controlIdFilter, setControlIdFilter] = useState('');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

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

  // Fetch vessel data from the backend API
  const fetchExcelData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('Fetching vessel data from backend API...');
      const response = await api.get('/excel/vessels-log');
      
      if (response.data.success && response.data.vessels) {
        console.log(`📊 API response: Found ${response.data.vessels.length} vessels`);
        
        // Convert API data to the format expected by the reports page
        const mappedRows = response.data.vessels.map((vessel, index) => {
          // Determine sheet name from date
          let sheetName = 'Unknown';
          if (vessel.date) {
            try {
              const date = new Date(vessel.date);
              if (!isNaN(date.getTime())) {
                sheetName = date.getFullYear().toString();
              }
            } catch (e) {
              console.warn('Could not parse date for sheet name:', vessel.date);
            }
          }
          
          // Only log problematic entries
          if (!vessel.vessel || vessel.vessel.trim() === '' || vessel.vessel === 'N/A') {
            console.log(`⚠️ Problematic vessel entry ${index + 1}:`, {
              original: vessel,
              mapped: {
                'Date': vessel.date || '',
                'Vessel': vessel.vessel || '',
                'Voyage Number': vessel.voyage || '',
                'Service': vessel.purpose || '',
                'Control Number': vessel.controlId || '',
                'Vessel Type': vessel.vesselType || 'Local',
                'SheetName': sheetName
              }
            });
          }
          
          return {
            'Date': vessel.date || '',
            'Vessel': vessel.vessel || '',
            'Voyage Number': vessel.voyage || '',
            'Service': vessel.purpose || '',
            'Control Number': vessel.controlId || '',
            'Vessel Type': vessel.vesselType || 'Local',
            'Time': vessel.time || '',
            'Time Finished': vessel.timeFinished || '',
            'SheetName': sheetName
          };
        });
        
        console.log('Mapped rows from API:', mappedRows.slice(0, 3));
        
        // Extract available sheet names for dropdown
        const sheetNames = [...new Set(mappedRows.map(row => row.SheetName))].filter(name => name !== 'Unknown');
        setAvailableSheets(sheetNames);
        
        // Filter out empty rows and invalid data - be more lenient
        const validRows = mappedRows.filter(row => {
          const vesselName = row['Vessel'];
          const trimmedName = vesselName ? vesselName.trim() : '';
          const isValid = trimmedName !== '' &&
                          trimmedName !== 'N/A';
          
          if (!isValid) {
            console.log('❌ Filtering out invalid row:', {
              vessel: trimmedName,
              date: row['Date'],
              reason: !trimmedName ? 'Empty vessel name' :
                      trimmedName === 'N/A' ? 'N/A vessel name' : 'Unknown'
            });
          }
          
          return isValid;
        });
        
        console.log(`📊 Data Summary:
          - Total vessels from API: ${response.data.vessels.length}
          - Mapped rows: ${mappedRows.length}
          - Valid rows after filtering: ${validRows.length}
          - Filtered out: ${mappedRows.length - validRows.length}`);
        
        setVesselData(validRows);
        setLoading(false);
      } else {
        console.error('API response failed or no vessels found:', response.data);
        setVesselData([]);
        setLoading(false);
      }
    } catch (e) {
      console.error('Error fetching vessel data from API:', e);
      setError(e.message);
      
      // Retry up to 3 times
      if (retryCount < 3) {
        console.log(`Retrying API fetch (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => {
          fetchExcelData(retryCount + 1);
        }, 2000 * (retryCount + 1));
      } else {
        console.error('Failed to fetch vessel data after 3 attempts');
        setVesselData([]);
        setLoading(false);
      }
    }
  };

  // Fetch transaction data from Excel file
  const fetchTransactions = async () => {
    try {
      setIsLoadingTransactions(true);
      
      // Process Excel data that was already loaded
      if (vesselData.length > 0) {
        
        // Check if we have any data at all
        const hasValidData = vesselData.some(vessel => 
          vessel['Vessel'] && 
          vessel['Vessel'].trim() !== ''
        );
        
        if (!hasValidData) {
          console.warn('No valid vessel data found, showing empty state');
          setAllTransactions([]);
          setTransactions([]);
          setIsLoadingTransactions(false);
          setLoading(false);
          return;
        }
        
        const excelData = vesselData.map((vessel, index) => {
          // Parse date properly - handle YYYY-MM-DD format from Excel
          let parsedDate = new Date().toISOString();
          if (vessel['Date']) {
            const dateStr = vessel['Date'].toString().trim();
            console.log(`Processing date: "${dateStr}" for vessel: ${vessel['Vessel']}`);
            
            // First try YYYY-MM-DD format (what we're actually saving to Excel)
            if (dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) {
              const parts = dateStr.split('-');
              const year = parseInt(parts[0]);
              const month = parseInt(parts[1]) - 1; // Month is 0-indexed
              const day = parseInt(parts[2]);
              
              const parsed = new Date(year, month, day);
              
              if (!isNaN(parsed.getTime())) {
                const yearStr = parsed.getFullYear();
                const monthStr = String(parsed.getMonth() + 1).padStart(2, '0');
                const dayStr = String(parsed.getDate()).padStart(2, '0');
                parsedDate = `${yearStr}-${monthStr}-${dayStr}T00:00:00.000Z`;
                console.log(`Successfully parsed YYYY-MM-DD date: "${dateStr}" -> ${parsed.toLocaleDateString()} -> ${parsedDate}`);
              } else {
                console.error(`Failed to parse YYYY-MM-DD date: "${dateStr}"`);
              }
            }
            // Try parsing "Month DD, YYYY" format for legacy data
            else {
              const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                               'July', 'August', 'September', 'October', 'November', 'December'];
              
              // Try parsing "Month DD,YYYY" format first (no space after comma)
              let monthNameMatch = dateStr.match(/^(\w+)\s+(\d{1,2}),(\d{4})$/);
              if (!monthNameMatch) {
                // Try parsing "Month DD, YYYY" format (with space after comma)
                monthNameMatch = dateStr.match(/^(\w+)\s+(\d{1,2}),\s+(\d{4})$/);
              }
              
              if (monthNameMatch) {
                const [, monthName, day, year] = monthNameMatch;
                const monthIndex = monthNames.indexOf(monthName);
                
                if (monthIndex !== -1) {
                  const parsed = new Date(parseInt(year), monthIndex, parseInt(day));
                  
                  if (!isNaN(parsed.getTime())) {
                    const yearStr = parsed.getFullYear();
                    const monthStr = String(parsed.getMonth() + 1).padStart(2, '0');
                    const dayStr = String(parsed.getDate()).padStart(2, '0');
                    parsedDate = `${yearStr}-${monthStr}-${dayStr}T00:00:00.000Z`;
                    console.log(`Successfully parsed Month DD, YYYY date: "${dateStr}" -> ${parsed.toLocaleDateString()} -> ${parsedDate}`);
                  } else {
                    console.error(`Failed to parse date: "${dateStr}"`);
                  }
                } else {
                  console.error(`Invalid month name: "${monthName}"`);
                }
              } else {
                // Fallback to MM/DD/YYYY format for backward compatibility
                const parts = dateStr.split('/');
                if (parts.length === 3) {
                  const year = parseInt(parts[2]);
                  const month = parseInt(parts[0]) - 1; // Month is 0-indexed
                  const day = parseInt(parts[1]);
                  
                  const parsed = new Date(year, month, day);
                  
                  if (!isNaN(parsed.getTime())) {
                    const yearStr = parsed.getFullYear();
                    const monthStr = String(parsed.getMonth() + 1).padStart(2, '0');
                    const dayStr = String(parsed.getDate()).padStart(2, '0');
                    parsedDate = `${yearStr}-${monthStr}-${dayStr}T00:00:00.000Z`;
                    console.log(`Successfully parsed MM/DD/YYYY date: "${dateStr}" -> ${parsed.toLocaleDateString()} -> ${parsedDate}`);
                  } else {
                    console.error(`Failed to parse date: "${dateStr}"`);
                  }
                } else {
                  console.error(`Invalid date format: "${dateStr}"`);
                }
              }
            }
          } else {
            console.log('No date found for vessel:', vessel['Vessel']);
          }
          
          const mappedTransaction = {
            id: `excel_${index}`,
            date: parsedDate,
            time: vessel['Time'] || '',
            timeFinished: vessel['Time Finished'] || '',
            vesselName: vessel['Vessel'] || 'N/A',
            voyageNo: vessel['Voyage Number'] || 'N/A',
            purposeOfCall: vessel['Service'] || 'N/A',
            controlId: vessel['Control Number'] || 'N/A',
            vesselType: vessel['Vessel Type'] || 'Local',
            workActivities: [],
            lastUpdated: new Date().toISOString(),
            updatedBy: 'system@anchorpoint.com',
            sheetName: vessel['SheetName'] || 'Unknown' // Add sheet name to track which sheet this came from
          };
          console.log(`Transaction ${index}:`, {
            originalDate: vessel['Date'],
            parsedDate: parsedDate,
            vessel: vessel['Vessel'],
            voyageNumber: vessel['Voyage Number'],
            controlId: vessel['Control Number']
          });
          return mappedTransaction;
        });
        
        // Sort Excel data by date (newest first)
        const sortedExcelData = excelData.sort((a, b) => {
          const dateA = new Date(a.date);
          const dateB = new Date(b.date);
          return dateB - dateA; // Descending order (newest first)
        });
        
        setAllTransactions(sortedExcelData);
        setTransactions(sortedExcelData);
        console.log('Loaded transactions from Excel file:', sortedExcelData.length);
        setIsLoadingTransactions(false);
        return;
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
          time: data.time || '',
          timeFinished: data.timeFinished || '',
        vesselName: data.vesselName || 'N/A',
        voyageNo: data.voyageNo || 'N/A',
        purposeOfCall: data.purposeOfCall || 'N/A',
        controlId: data.controlId || 'N/A',
        vesselType: data.vesselType || 'Local',
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
      time: vessel['Time'] || '',
      timeFinished: vessel['Time Finished'] || '',
      vesselName: vessel['Vessel'] || 'N/A',
      voyageNo: vessel['Voyage Number'] || 'N/A',
      purposeOfCall: vessel['Service'] || 'N/A',
      controlId: vessel['Control Number'] || 'N/A',
      vesselType: vessel['Vessel Type'] || 'Local',
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

  // Filter transactions based on all filters and sort by date (newest first)
  const filteredTransactions = useMemo(() => {
    let filtered = allTransactions;
    
    // Filter by sheet name
    if (yearFilter) {
      filtered = filtered.filter(transaction => {
        return transaction.sheetName === yearFilter;
      });
    }
    
    // Filter by vessel name
    if (vesselNameFilter) {
      filtered = filtered.filter(transaction => {
        return transaction.vesselName.toLowerCase().includes(vesselNameFilter.toLowerCase());
      });
    }
    
    // Filter by voyage ID
    if (voyageIdFilter) {
      filtered = filtered.filter(transaction => {
        return transaction.voyageNo.toLowerCase().includes(voyageIdFilter.toLowerCase());
      });
    }
    
    
    // Filter by control ID
    if (controlIdFilter) {
      filtered = filtered.filter(transaction => {
        return transaction.controlId.toLowerCase().includes(controlIdFilter.toLowerCase());
      });
    }
    
    // Filter by date range
    if (dateFromFilter) {
      const fromDate = new Date(dateFromFilter);
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate >= fromDate;
      });
    }
    
    if (dateToFilter) {
      const toDate = new Date(dateToFilter);
      toDate.setHours(23, 59, 59, 999); // Include the entire day
      filtered = filtered.filter(transaction => {
        const transactionDate = new Date(transaction.date);
        return transactionDate <= toDate;
      });
    }
    
    // Sort by date in descending order (newest first)
    return filtered.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return dateB - dateA; // Descending order (newest first)
    });
  }, [allTransactions, yearFilter, vesselNameFilter, voyageIdFilter, controlIdFilter, dateFromFilter, dateToFilter]);

  // Handle year filter changes
  const handleYearFilterChange = (value) => {
    setYearFilter(value);
  };

  // Clear all filters
  const clearAllFilters = () => {
    setYearFilter('');
    setVesselNameFilter('');
    setVoyageIdFilter('');
    setControlIdFilter('');
    setDateFromFilter('');
    setDateToFilter('');
  };

  // Clear year filter
  const clearYearFilter = () => {
    setYearFilter('');
  };

  // Load Excel data and transactions on component mount
  useEffect(() => {
    // Clear any existing data first and show loading state
    setVesselData([]);
    setAllTransactions([]);
    setTransactions([]);
    setLoading(true);
    setIsLoadingTransactions(true);
    
    const loadData = async () => {
      try {
        console.log('Loading data on component mount...');
        // Fetch Excel data - fetchTransactions will be called automatically
        // when vesselData state is updated via the useEffect hook
        await fetchExcelData();
      } catch (error) {
        console.error('Error loading data:', error);
        // Show empty state on error
        setVesselData([]);
        setAllTransactions([]);
        setTransactions([]);
        setLoading(false);
        setIsLoadingTransactions(false);
        // Retry after 2 seconds
        setTimeout(() => {
          loadData();
        }, 2000);
      }
    };
    
    // Load data immediately on mount
    loadData();
  }, []);


  // Process Excel data when vesselData changes
  useEffect(() => {
    if (vesselData.length > 0) {
      processExcelData();
      const years = extractAvailableYears(vesselData);
      setAvailableYears(years);
      // Automatically fetch transactions when vesselData is loaded
      fetchTransactions();
    }
  }, [vesselData]);

  // Update transactions when filteredTransactions changes
  useEffect(() => {
    setTransactions(filteredTransactions);
  }, [filteredTransactions]);



  return (
    <div className="report-page-bg" style={{ minHeight: '100vh', width: '100vw', overflow: 'auto', margin: 0, padding: 0 }}>
      <div style={{ 
        display: 'flex', 
        justifyContent: 'flex-start', 
        alignItems: 'flex-start', 
        minHeight: '100vh', 
        padding: '0', 
        margin: 0,
        maxWidth: '100vw',
        overflow: 'hidden'
      }}>
        <div style={{
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(20px)',
          borderRadius: '16px',
          border: '1px solid rgba(255, 255, 255, 0.8)',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.15), 0 8px 24px rgba(0, 0, 0, 0.1)',
          padding: '20px',
          margin: '10px 10px 10px 10px',
          maxWidth: 'calc(100vw - 260px)',
          width: 'calc(100vw - 260px)',
          height: 'calc(100vh - 20px)',
          overflow: 'hidden',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          zIndex: 1,
          minHeight: 0
        }}>
          {/* Report Header Title */}
          <div style={{
            textAlign: 'center',
            marginBottom: '24px',
            padding: '16px 0',
            flexShrink: 0,
            background: 'linear-gradient(135deg, rgba(30, 58, 138, 0.05) 0%, rgba(59, 130, 246, 0.05) 50%, rgba(6, 182, 212, 0.05) 100%)',
            borderRadius: '12px',
            border: '1px solid rgba(30, 58, 138, 0.1)'
          }}>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              color: '#1e2a5e',
              margin: '0 0 8px 0',
              letterSpacing: '0.5px'
            }}>
              Anchor Point Past History Reports
            </h1>
            <p style={{
              fontSize: '1rem',
              color: '#64748b',
              margin: '0',
              fontWeight: '500',
              letterSpacing: '0.3px'
            }}>
              Comprehensive overview of all maritime operations and transaction history
            </p>
          </div>

          {/* Year Filter Section */}
          <div style={{
            background: 'rgba(255, 255, 255, 0.8)',
            backdropFilter: 'blur(20px)',
            borderRadius: '12px',
            padding: '16px',
            border: '1px solid rgba(30, 58, 138, 0.2)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1), 0 2px 8px rgba(0, 0, 0, 0.05)',
            marginBottom: '20px',
            position: 'relative',
            flexShrink: 0
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '20px',
              flexWrap: 'wrap',
              justifyContent: 'space-between',
              width: '100%'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#1e3a8a',
                fontWeight: '700',
                fontSize: '1.1rem',
                letterSpacing: '0.3px',
                flexShrink: 0
              }}>
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M19,3H18V1H16V3H8V1H6V3H5A2,2 0 0,0 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5A2,2 0 0,0 19,3M19,19H5V8H19V19Z"/>
                </svg>
                Filter:
              </div>
              
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
                flex: '1'
              }}>
                {/* First Row - Sheet Filter, Action Buttons, and Advanced Filter Toggle */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap',
                  justifyContent: 'center'
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'flex-end',
                    gap: '8px'
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
                          fontSize: '0.9rem',
                          color: '#374151',
                          background: 'white',
                          transition: 'all 0.3s ease',
                          width: '140px',
                          minWidth: '140px',
                          maxWidth: '140px'
                        }}
                      >
                        <option value="">All Years</option>
                        {availableSheets.map(sheet => (
                          <option key={sheet} value={sheet}>
                            {sheet}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                    <button
                      onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(107, 114, 128, 0.3)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      Advanced Filters
                      <svg 
                        width="12" 
                        height="12" 
                        fill="currentColor" 
                        viewBox="0 0 24 24"
                        style={{
                          transform: showAdvancedFilters ? 'rotate(180deg)' : 'rotate(0deg)',
                          transition: 'transform 0.3s ease'
                        }}
                      >
                        <path d="M7.41,8.58L12,13.17L16.59,8.58L18,10L12,16L6,10L7.41,8.58Z"/>
                      </svg>
                    </button>
                    
                    <button
                      onClick={clearAllFilters}
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
                    >
                      Clear All
                    </button>
                    
                    <button
                      onClick={async () => {
                        console.log('🔄 Force refreshing data...');
                        setVesselData([]);
                        setAllTransactions([]);
                        setTransactions([]);
                        setLoading(true);
                        setIsLoadingTransactions(true);
                        
                        try {
                          await new Promise(resolve => setTimeout(resolve, 100));
                          await fetchExcelData();
                          setTimeout(async () => {
                            await fetchTransactions();
                          }, 200);
                        } catch (error) {
                          console.error('Error refreshing data:', error);
                          setLoading(false);
                          setIsLoadingTransactions(false);
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '0.9rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: '0 2px 8px rgba(16, 185, 129, 0.3)'
                      }}
                    >
                      Refresh Data
                    </button>
                  </div>
                </div>

                {/* Second Row - Advanced Search Filters (Conditionally Shown) */}
                {showAdvancedFilters && (
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                    gap: '12px',
                    alignItems: 'end',
                    padding: '16px',
                    background: 'rgba(249, 250, 251, 0.8)',
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    animation: 'slideDown 0.3s ease-out'
                  }}>
                    {/* Vessel Name Filter */}
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
                        Vessel Name
                      </label>
                      <input
                        type="text"
                        placeholder="Search vessel..."
                        value={vesselNameFilter}
                        onChange={(e) => setVesselNameFilter(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          color: '#374151',
                          background: 'white',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </div>

                    {/* Voyage ID Filter */}
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
                        Voyage ID
                      </label>
                      <input
                        type="text"
                        placeholder="Search voyage..."
                        value={voyageIdFilter}
                        onChange={(e) => setVoyageIdFilter(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          color: '#374151',
                          background: 'white',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </div>

                    {/* Control ID Filter */}
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
                        Control ID
                      </label>
                      <input
                        type="text"
                        placeholder="Search control ID..."
                        value={controlIdFilter}
                        onChange={(e) => setControlIdFilter(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          color: '#374151',
                          background: 'white',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </div>

                    {/* Date From Filter */}
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
                        Date From
                      </label>
                      <input
                        type="date"
                        value={dateFromFilter}
                        onChange={(e) => setDateFromFilter(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          color: '#374151',
                          background: 'white',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </div>

                    {/* Date To Filter */}
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
                        Date To
                      </label>
                      <input
                        type="date"
                        value={dateToFilter}
                        onChange={(e) => setDateToFilter(e.target.value)}
                        style={{
                          padding: '8px 12px',
                          border: '2px solid #e5e7eb',
                          borderRadius: '8px',
                          fontSize: '0.9rem',
                          color: '#374151',
                          background: 'white',
                          transition: 'all 0.3s ease'
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>
              
              <div style={{
                marginLeft: 'auto',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280',
                fontSize: '0.9rem',
                fontWeight: '500',
                whiteSpace: 'nowrap',
                flexShrink: 0
              }}>
                <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                </svg>
                <span>Showing {filteredTransactions.length} of {allTransactions.length} records</span>
                {yearFilter && (
                  <span style={{ color: '#1e40af', fontWeight: '600' }}>
                    for {yearFilter}
                  </span>
                )}
                {loading && (
                  <span style={{ color: '#059669', fontWeight: '600', marginLeft: '8px' }}>
                    🔄 Reading Excel...
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Report Content Container */}
          <div style={{
            background: 'white',
            borderRadius: '16px',
            padding: '0',
            border: '1px solid rgba(30, 58, 138, 0.2)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.15), 0 4px 16px rgba(0, 0, 0, 0.08)',
            marginBottom: '0',
            position: 'relative',
            flex: 1,
            overflow: 'visible',
            display: 'flex',
            flexDirection: 'column',
            zIndex: 2,
            minHeight: 0,
            width: '100%',
            boxSizing: 'border-box',
            maxHeight: 'calc(100vh - 20px)',
            height: 'calc(100vh - 20px)'
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
              <>
                {/* Scrollable Table Container */}
                <div className="report-table-container-scrollable" style={{
                  overflowX: 'auto',
                  overflowY: 'auto',
                  flex: 1,
                  width: '100%',
                  maxWidth: '100%',
                  position: 'relative',
                  maxHeight: 'calc(100vh - 150px)',
                  minHeight: '500px',
                  height: 'calc(100vh - 200px)',
                  borderRadius: '16px',
                  border: '1px solid #e5e7eb',
                  boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    background: 'white',
                    borderRadius: '16px',
                    overflow: 'hidden'
                  }}>
                    <thead>
                      <tr style={{
                        background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
                        color: 'white',
                        fontWeight: '700',
                        fontSize: '0.85rem',
                        position: 'sticky',
                        top: 0,
                        zIndex: 10
                      }}>
                        <th style={{ 
                          padding: '16px 12px',
                          textAlign: 'center',
                          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                          width: '15%'
                        }}>
                          DATE
                        </th>
                        <th style={{ 
                          padding: '16px 12px',
                          textAlign: 'center',
                          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                          width: '12%'
                        }}>
                          TIME
                        </th>
                        <th style={{ 
                          padding: '16px 12px',
                          textAlign: 'center',
                          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                          width: '12%'
                        }}>
                          TIME FINISHED
                        </th>
                        <th style={{ 
                          padding: '16px 12px',
                          textAlign: 'center',
                          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                          width: '18%'
                        }}>
                          VESSEL
                        </th>
                        <th style={{ 
                          padding: '16px 12px',
                          textAlign: 'center',
                          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                          width: '12%'
                        }}>
                          VOYAGE
                        </th>
                        <th style={{ 
                          padding: '16px 12px',
                          textAlign: 'center',
                          borderRight: '1px solid rgba(255, 255, 255, 0.2)',
                          width: '23%'
                        }}>
                          PURPOSE
                        </th>
                        <th style={{ 
                          padding: '16px 12px',
                          textAlign: 'center',
                          width: '14%'
                        }}>
                          CONTROL ID
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {transactions.map((transaction, index) => {
                        return (
                          <tr key={transaction.id} style={{
                            background: index % 2 === 0 ? 'white' : 'rgba(248, 250, 252, 0.5)',
                            borderBottom: '1px solid #e5e7eb',
                            transition: 'all 0.3s ease',
                            ':hover': {
                              background: 'rgba(59, 130, 246, 0.05)',
                              transform: 'translateY(-1px)',
                              boxShadow: '0 4px 12px rgba(59, 130, 246, 0.1)'
                            }
                          }}>
                            <td style={{ 
                              padding: '12px',
                              color: '#1e40af',
                              fontWeight: '600',
                              borderRight: '1px solid #e5e7eb'
                            }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{
                                  width: '8px',
                                  height: '8px',
                                  borderRadius: '50%',
                                  background: '#3b82f6',
                                  flexShrink: 0
                                }}></div>
                                {(() => {
                                  try {
                                    const date = new Date(transaction.date);
                                    if (isNaN(date.getTime())) {
                                      return 'Invalid Date';
                                    }
                                    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                                     'July', 'August', 'September', 'October', 'November', 'December'];
                                    const month = monthNames[date.getUTCMonth()];
                                    const day = String(date.getUTCDate()).padStart(2, '0');
                                    const year = date.getUTCFullYear();
                                    return `${month} ${day}, ${year}`;
                                  } catch (e) {
                                    return 'Error';
                                  }
                                })()}
                              </div>
                            </td>
                            <td style={{ 
                              padding: '12px',
                              color: '#1f2937',
                              fontWeight: '500',
                              textAlign: 'center',
                              borderRight: '1px solid #e5e7eb'
                            }}>
                              {(() => {
                                if (!transaction.time || transaction.time === 'N/A' || transaction.time === '') {
                                  return '-';
                                }
                                
                                try {
                                  let timeStr = transaction.time.trim();
                                  
                                  if (timeStr.includes('AM') || timeStr.includes('PM')) {
                                    return timeStr;
                                  }
                                  
                                  if (timeStr.includes(':')) {
                                    const [hours, minutes] = timeStr.split(':');
                                    const hour24 = parseInt(hours, 10);
                                    const mins = minutes || '00';
                                    
                                    if (hour24 === 0) {
                                      return `12:${mins} AM`;
                                    } else if (hour24 < 12) {
                                      return `${hour24}:${mins} AM`;
                                    } else if (hour24 === 12) {
                                      return `12:${mins} PM`;
                                    } else {
                                      return `${hour24 - 12}:${mins} PM`;
                                    }
                                  }
                                  
                                  return timeStr;
                                } catch (e) {
                                  return transaction.time;
                                }
                              })()}
                            </td>
                            <td style={{ 
                              padding: '12px',
                              color: '#1f2937',
                              fontWeight: '500',
                              textAlign: 'center',
                              borderRight: '1px solid #e5e7eb'
                            }}>
                              {(() => {
                                if (!transaction.timeFinished || transaction.timeFinished === 'N/A' || transaction.timeFinished === '') {
                                  return '-';
                                }
                                
                                try {
                                  let timeStr = transaction.timeFinished.trim();
                                  
                                  if (timeStr.includes('AM') || timeStr.includes('PM')) {
                                    return timeStr;
                                  }
                                  
                                  if (timeStr.includes(':')) {
                                    const [hours, minutes] = timeStr.split(':');
                                    const hour24 = parseInt(hours, 10);
                                    const mins = minutes || '00';
                                    
                                    if (hour24 === 0) {
                                      return `12:${mins} AM`;
                                    } else if (hour24 < 12) {
                                      return `${hour24}:${mins} AM`;
                                    } else if (hour24 === 12) {
                                      return `12:${mins} PM`;
                                    } else {
                                      return `${hour24 - 12}:${mins} PM`;
                                    }
                                  }
                                  
                                  return timeStr;
                                } catch (e) {
                                  return transaction.timeFinished;
                                }
                              })()}
                            </td>
                            <td style={{ 
                              padding: '12px',
                              color: '#1f2937',
                              fontWeight: '500',
                              borderRight: '1px solid #e5e7eb'
                            }}>
                              {transaction.vesselName}
                            </td>
                            <td style={{ 
                              padding: '12px',
                              color: '#1f2937',
                              fontWeight: '500',
                              textAlign: 'center',
                              borderRight: '1px solid #e5e7eb'
                            }}>
                              {transaction.voyageNo}
                            </td>
                            <td style={{ 
                              padding: '12px',
                              color: '#1f2937',
                              fontWeight: '500',
                              textAlign: 'center',
                              borderRight: '1px solid #e5e7eb',
                              maxWidth: '200px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={transaction.purposeOfCall}>
                              {transaction.purposeOfCall}
                            </td>
                            <td style={{ 
                              padding: '12px',
                              color: '#1f2937',
                              fontWeight: '500',
                              textAlign: 'center'
                            }}>
                              {transaction.controlId}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </>
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
