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

  // Fetch Excel data from the Vessels Log.xlsx file
  const fetchExcelData = async (retryCount = 0) => {
    try {
      setLoading(true);
      setError(null);
      
      // Dynamically import xlsx library
      if (!XLSX) {
        XLSX = await import('xlsx');
      }
      
      // Fetch Excel file from public folder with cache busting
      const cacheBuster = `?t=${Date.now()}`;
      console.log('Fetching Excel file from /Vessels Log.xlsx' + cacheBuster);
      const response = await fetch('/Vessels Log.xlsx' + cacheBuster);
      if (!response.ok) {
        console.error('Failed to fetch Excel file:', response.status, response.statusText);
        throw new Error(`Failed to fetch Excel file: ${response.status} ${response.statusText}`);
      }
      console.log('Excel file fetched successfully, status:', response.status);
      
      const arrayBuffer = await response.arrayBuffer();
      console.log('Excel file loaded, size:', arrayBuffer.byteLength);
      const workbook = XLSX.read(arrayBuffer, { type: 'array' });
      console.log('Workbook loaded, sheets:', workbook.SheetNames);
      
      // Store available sheet names for dropdown
      console.log('Detected sheets:', workbook.SheetNames);
      setAvailableSheets(workbook.SheetNames);
      
      // Process all sheets and combine data
      let allMappedRows = [];
      
      for (const sheetName of workbook.SheetNames) {
        console.log(`Processing sheet: ${sheetName}`);
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // Debug: Log first few rows of each sheet
        console.log(`Sheet ${sheetName} - First 3 rows:`, jsonData.slice(0, 3));
        
        // Find the header row - look for 'Vessel' column
        let headerRowIndex = 0; // Start from row 0 (index 0) as headers are in row 1
        for (let i = 0; i < jsonData.length; i++) {
          if (jsonData[i] && jsonData[i].includes('Vessel')) {
            headerRowIndex = i;
            break;
          }
        }
        
        console.log(`Sheet ${sheetName} - Found header at row index:`, headerRowIndex);
        
        const headers = jsonData[headerRowIndex];
        const dataRows = jsonData.slice(headerRowIndex + 1);
        
        console.log(`Sheet ${sheetName} - Headers:`, headers);
        console.log(`Sheet ${sheetName} - First data row:`, dataRows[0]);
        console.log(`Sheet ${sheetName} - Total data rows:`, dataRows.length);
        console.log(`Sheet ${sheetName} - Raw JSON data:`, jsonData.slice(0, 5));
        
        // Convert to objects using actual headers from Excel
        const mappedRows = dataRows.map((row, rowIndex) => {
          const obj = {};
          headers.forEach((header, index) => {
            if (header) {
              obj[header] = row[index] || '';
            }
          });
          
          // Normalize column names for different sheet structures
          if (obj['ID'] && !obj['Voyage Number']) {
            obj['Voyage Number'] = obj['ID'];
            delete obj['ID'];
          }
          
          // Add sheet name to each row
          obj['SheetName'] = sheetName;
          
        // Debug first few rows
        if (rowIndex < 3) {
          console.log(`Sheet ${sheetName} - Row ${rowIndex + 1} mapped:`, obj);
          console.log(`Sheet ${sheetName} - Row ${rowIndex + 1} date value:`, obj['Date']);
        }
          
          return obj;
        });
        
        allMappedRows = allMappedRows.concat(mappedRows);
      }
      
      console.log('Final mapped data sample:', allMappedRows.slice(0, 3));
      console.log('Total mapped rows:', allMappedRows.length);
      console.log(`Successfully processed ${workbook.SheetNames.length} sheets:`, workbook.SheetNames);
      
      // Check if we have any data with dates
      const rowsWithDates = allMappedRows.filter(row => row['Date'] && row['Date'].toString().trim() !== '');
      console.log('Rows with dates:', rowsWithDates.length);
      console.log('Sample rows with dates:', rowsWithDates.slice(0, 3));
      
      // Debug: Check if we're getting any data at all
      if (allMappedRows.length === 0) {
        console.error('No data mapped from Excel!');
      } else {
        console.log('Excel data loaded successfully, processing...');
      }
      
      // Filter out empty rows and invalid data
      console.log('All mapped rows before filtering:', allMappedRows.length);
      console.log('Sample rows before filtering:', allMappedRows.slice(0, 3));
      
      const validRows = allMappedRows.filter(row => {
        // Only exclude obvious header rows and completely empty rows
        const isValid = row['Vessel'] && 
                       row['Vessel'].trim() !== '' && 
                       row['Vessel'] !== 'Vessel' && // Exclude header row
                       row['Vessel'] !== 'No.'; // Exclude header row
        if (!isValid) {
          console.log('Filtering out invalid row:', row);
        }
        return isValid;
      });
      
      console.log('Valid rows after filtering:', validRows.length);
      console.log('Sample valid rows:', validRows.slice(0, 3));
      
      setVesselData(validRows);
      setLoading(false);
    } catch (e) {
      console.error('Error fetching Excel data:', e);
      setError(e.message);
      
      // Retry up to 3 times
      if (retryCount < 3) {
        console.log(`Retrying Excel data fetch (attempt ${retryCount + 1}/3)...`);
        setTimeout(() => {
          fetchExcelData(retryCount + 1);
        }, 2000 * (retryCount + 1)); // Exponential backoff
      } else {
        console.error('Failed to fetch Excel data after 3 attempts');
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
        console.log('Sample vessel data:', vesselData[0]);
        console.log('Total vessel data rows:', vesselData.length);
        console.log('First 3 vessel data rows:', vesselData.slice(0, 3));
        
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
          // Parse date properly - now using MM/DD/YYYY format
          let parsedDate = new Date().toISOString();
          if (vessel['Date']) {
            const dateStr = vessel['Date'].toString().trim();
            console.log(`Processing date: "${dateStr}" for vessel: ${vessel['Vessel']}`);
            
            // Parse "Month DD, YYYY" format - avoid timezone issues by using local date
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
                  // Format as YYYY-MM-DD to avoid timezone issues
                  const yearStr = parsed.getFullYear();
                  const monthStr = String(parsed.getMonth() + 1).padStart(2, '0');
                  const dayStr = String(parsed.getDate()).padStart(2, '0');
                  parsedDate = `${yearStr}-${monthStr}-${dayStr}T00:00:00.000Z`;
                  console.log(`Successfully parsed date: "${dateStr}" -> ${parsed.toLocaleDateString()} -> ${parsedDate}`);
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
                  console.log(`Successfully parsed date (fallback): "${dateStr}" -> ${parsed.toLocaleDateString()} -> ${parsedDate}`);
                } else {
                  console.error(`Failed to parse date: "${dateStr}"`);
                }
              } else {
                console.error(`Invalid date format: "${dateStr}"`);
              }
            }
          } else {
            console.log('No date found for vessel:', vessel['Vessel']);
          }
          
          const mappedTransaction = {
            id: `excel_${index}`,
            date: parsedDate,
            vesselName: vessel['Vessel'] || 'N/A',
            voyageNo: vessel['Voyage Number'] || 'N/A',
            purposeOfCall: vessel['Service'] || 'N/A',
            controlId: vessel['Control Number'] || 'N/A',
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
        vesselName: data.vesselName || 'N/A',
        voyageNo: data.voyageNo || 'N/A',
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
        await fetchExcelData();
        // Wait a bit for vesselData to be set
        setTimeout(async () => {
          await fetchTransactions();
        }, 100);
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
    
    loadData();
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
              background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
              margin: '0 0 8px 0',
              letterSpacing: '0.5px',
              textShadow: '0 4px 8px rgba(30, 58, 138, 0.2)',
              filter: 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.1))'
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
                        console.log('Force refreshing data...');
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
                  position: 'relative',
                  maxHeight: 'calc(100vh - 150px)',
                  minHeight: '500px',
                  height: 'calc(100vh - 200px)'
                }}>
                  {/* Table Header */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.5fr 0.8fr 1.8fr 1fr',
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #3b82f6 50%, #06b6d4 100%)',
                    backdropFilter: 'blur(10px)',
                    color: 'white',
                    fontWeight: '700',
                    fontSize: '0.85rem',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
                    flexShrink: 0,
                    width: '100%',
                    minWidth: '600px',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    borderRadius: '16px 16px 0 0',
                    overflow: 'hidden'
                  }}>
                  <div style={{ 
                    padding: '8px 6px', 
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V7H5V5H19M5,19V9H19V19H5Z"/>
                    </svg>
                    Date
                  </div>
                  <div style={{ 
                    padding: '8px 6px', 
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                    </svg>
                    Vessel
                  </div>
                  <div style={{ 
                    padding: '8px 6px', 
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                    </svg>
                    Voyage
                  </div>
                  <div style={{ 
                    padding: '8px 6px', 
                    borderRight: '1px solid rgba(255,255,255,0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                    </svg>
                    Purpose
                  </div>
                  <div style={{ 
                    padding: '8px 6px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M12,4A8,8 0 0,1 20,12A8,8 0 0,1 12,20A8,8 0 0,1 4,12A8,8 0 0,1 12,4M12,6A6,6 0 0,0 6,12A6,6 0 0,0 12,18A6,6 0 0,0 18,12A6,6 0 0,0 12,6M12,8A4,4 0 0,1 16,12A4,4 0 0,1 12,16A4,4 0 0,1 8,12A4,4 0 0,1 12,8Z"/>
                    </svg>
                    Control ID
                  </div>
                  </div>

                  {/* Table Body Container */}
                  <div className="report-table-body" style={{
                    background: 'white',
                    borderRadius: '0 0 16px 16px',
                    overflow: 'hidden'
                  }}>
                  {/* Transaction Rows */}
                  {transactions.map((transaction, index) => {
                  console.log(`Rendering transaction ${index}:`, {
                    id: transaction.id,
                    date: transaction.date,
                    vesselName: transaction.vesselName,
                    controlId: transaction.controlId
                  });
                  return (
                    <div key={transaction.id} className="report-table-row" style={{
                    display: 'grid',
                    gridTemplateColumns: '1.2fr 1.5fr 0.8fr 1.8fr 1fr',
                    borderBottom: '1px solid #f1f5f9',
                    background: index % 2 === 0 ? 'white' : 'rgba(248, 250, 252, 0.5)',
                    transition: 'all 0.3s ease',
                    position: 'relative',
                    width: '100%',
                    minWidth: '600px',
                    maxWidth: '100%',
                    boxSizing: 'border-box',
                    alignItems: 'center'
                  }}>
                    <div className="report-table-cell" style={{ 
                      color: '#1e40af',
                      fontWeight: '600',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '6px 8px'
                    }}>
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
                          console.log(`Displaying date for transaction ${transaction.id}:`, {
                            originalDate: transaction.date,
                            parsedDate: date,
                            isValid: !isNaN(date.getTime()),
                            displayString: date.toLocaleDateString()
                          });
                          if (isNaN(date.getTime())) {
                            console.error('Invalid date for transaction:', transaction.id, transaction.date);
                            return 'Invalid Date';
                          }
                          // Use UTC methods to avoid timezone issues and format month as word
                          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                                           'July', 'August', 'September', 'October', 'November', 'December'];
                          const month = monthNames[date.getUTCMonth()];
                          const day = String(date.getUTCDate()).padStart(2, '0');
                          const year = date.getUTCFullYear();
                          const displayString = `${month} ${day}, ${year}`;
                          console.log(`Display string: ${displayString}`);
                          return displayString;
                        } catch (e) {
                          console.error('Error displaying date:', e, 'for transaction:', transaction.id);
                          return 'Error';
                        }
                      })()}
                    </div>
                    <div className="report-table-cell" style={{ 
                      color: '#1f2937',
                      fontWeight: '500',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      display: 'flex',
                      alignItems: 'center',
                      padding: '6px 8px'
                    }}>
                      {transaction.vesselName}
                    </div>
                    <div className="report-table-cell" style={{ 
                      color: '#1f2937',
                      fontWeight: '500',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '6px 8px'
                    }}>
                      <span style={{ 
                        width: '100%', 
                        textAlign: 'center'
                      }}>
                        {transaction.voyageNo}
                      </span>
                    </div>
                    <div
                      className="report-table-cell"
                      style={{ 
                        color: '#1f2937',
                        fontWeight: '500',
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        cursor: 'help',
                        textAlign: 'center',
                        padding: '6px 8px'
                      }}
                      title={transaction.purposeOfCall}
                    >
                      {transaction.purposeOfCall}
                    </div>
                    <div className="report-table-cell" style={{ 
                      color: '#1f2937',
                      fontWeight: '500',
                      fontSize: '0.95rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '6px 8px'
                    }}>
                      <span style={{ 
                        width: '100%', 
                        textAlign: 'center'
                      }}>
                        {transaction.controlId}
                      </span>
                    </div>
                  </div>
                  );
                })}
                  </div>
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