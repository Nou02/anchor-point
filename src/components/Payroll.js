import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import './Payroll.css';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import '../firebase/config';

function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

const WORKERS_LIST = [
  "Bryan Matthew Cruz",
  "David Emmanuel Reyes",
  "Junnel, Cusi",
  "Aljon, Dipasupil",
  "Phil Allen, Eje",
  "Rhed, Escalon",
  "Fortune, Garcia Jr.",
  "Keith, Javier",
  "Ericson, Mendoza",
  "Alec, Sino-ag",
  "Romeo, Velasquez",
  "Rodel, Maranan",
  "Alloi, Sino-ag"
];

// Ultra-stable input that NEVER re-renders - Complete React bypass
const UltraSimpleInput = ({ 
  initialValue, 
  onValueChange, 
  onBlur,
  placeholder, 
  className, 
  dataRow, 
  dataCol 
}) => {
  const inputRef = useRef(null);
  const isInitialized = useRef(false);
  const lastValue = useRef(initialValue);
  const changeHandlerRef = useRef(null);
  const blurHandlerRef = useRef(null);
  
  // Set initial value only once, never again
  useEffect(() => {
    if (inputRef.current && initialValue !== undefined && !isInitialized.current) {
      inputRef.current.value = initialValue;
      lastValue.current = initialValue;
      isInitialized.current = true;
    }
  }, []); // Empty dependency array - only runs once

  // Store handlers in refs to prevent re-renders
  changeHandlerRef.current = (e) => {
    // Direct DOM manipulation - no React state updates during typing
    const value = e.target.value;
    lastValue.current = value;
    
    // Call onChange immediately without any delays
    if (onValueChange) {
      onValueChange(value);
    }
  };

  blurHandlerRef.current = (e) => {
    // Call onBlur to commit the value
    if (onBlur) {
      onBlur();
    }
  };

  // Use direct event listeners to prevent re-renders
  useEffect(() => {
    const input = inputRef.current;
    if (input) {
      const handleChange = (e) => changeHandlerRef.current?.(e);
      const handleBlur = (e) => blurHandlerRef.current?.(e);
      
      input.addEventListener('input', handleChange);
      input.addEventListener('blur', handleBlur);
      
      return () => {
        input.removeEventListener('input', handleChange);
        input.removeEventListener('blur', handleBlur);
      };
    }
  }, []);

  return (
    <input
      ref={inputRef}
      type="text"
      data-row={dataRow}
      data-col={dataCol}
      className={className}
      placeholder={placeholder}
      autoComplete="off"
      spellCheck="false"
      style={{ 
        background: 'transparent',
        border: 'none',
        outline: 'none',
        width: '100%',
        height: '100%'
      }}
    />
  );
};

const TABLE_FIELDS = [
  'localVess', 'foreignVess', 'tal', 'sss', 'pagibig', 'philhealth', 'cashAdvance', 'netTotal'
];

const Payroll = () => {
  const [user, setUser] = useState({
    name: '',
    email: '',
    initials: '',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  });
  const [isManagerView, setIsManagerView] = useState(false);
  const [localVessType, setLocalVessType] = useState('Mooring');
  const [foreignVessType, setForeignVessType] = useState('Mooring');
  const [showLocalDropdown, setShowLocalDropdown] = useState(false);
  const [showForeignDropdown, setShowForeignDropdown] = useState(false);
  const [activeDropdownRow, setActiveDropdownRow] = useState(null);
  const [activeDropdownColumn, setActiveDropdownColumn] = useState(null);
  // Default table data
  const defaultTableData = [
    { id: 1, workerName: 'Bryan Matthew Cruz', localMooringCount: '1', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 2, workerName: 'David Emmanuel Reyes', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 3, workerName: 'Junnel, Cusi', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 4, workerName: 'Aljon, Dipasupil', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 5, workerName: 'Phil Allen, Eje', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 6, workerName: 'Rhed, Escalon', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 7, workerName: 'Fortune, Garcia Jr.', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 8, workerName: 'Keith, Javier', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 9, workerName: 'Ericson, Mendoza', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 10, workerName: 'Alec, Sino-ag', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 11, workerName: 'Romeo, Velasquez', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 12, workerName: 'Rodel, Maranan', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 13, workerName: 'Alloi, Sino-ag', localMooringCount: '', localUnmooringCount: '', foreignMooringCount: '', foreignUnmooringCount: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' }
  ];

  const [tableData, setTableData] = useState(defaultTableData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [autoSaveStatus, setAutoSaveStatus] = useState('');
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Pricing configuration for Alice's account
  const [pricingConfig, setPricingConfig] = useState({
    localMooringPrice: 500,
    localUnmooringPrice: 500,
    foreignMooringPrice: 800,
    foreignUnmooringPrice: 800
  });
  const [showPricingConfig, setShowPricingConfig] = useState(false);

  // The following states were missing in your code but are referenced later:
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [individualPayrollData, setIndividualPayrollData] = useState({});

  // Load data from localStorage on component mount
  useEffect(() => {
    const loadSavedData = () => {
      try {
        const savedTableData = localStorage.getItem('payrollTableData');
        const savedPricingConfig = localStorage.getItem('payrollPricingConfig');
        
        if (savedTableData) {
          const parsedData = JSON.parse(savedTableData);
          setTableData(parsedData);
          console.log('Loaded saved table data:', parsedData);
        }
        
        if (savedPricingConfig) {
          const parsedPricing = JSON.parse(savedPricingConfig);
          setPricingConfig(parsedPricing);
          console.log('Loaded saved pricing config:', parsedPricing);
        }
        
        // Mark initial load as complete
        setIsInitialLoad(false);
      } catch (error) {
        console.error('Error loading saved data:', error);
        setIsInitialLoad(false);
      }
    };

    loadSavedData();
  }, []);

  // Save data to localStorage whenever tableData or pricingConfig changes
  useEffect(() => {
    // Don't save during initial load to prevent overwriting saved data
    if (isInitialLoad) {
      return;
    }

    const saveData = () => {
      try {
        localStorage.setItem('payrollTableData', JSON.stringify(tableData));
        localStorage.setItem('payrollPricingConfig', JSON.stringify(pricingConfig));
        setAutoSaveStatus('Auto-saved');
        setTimeout(() => setAutoSaveStatus(''), 2000);
        console.log('Saved table data to localStorage:', tableData);
      } catch (error) {
        console.error('Error saving data:', error);
        setAutoSaveStatus('Save failed');
        setTimeout(() => setAutoSaveStatus(''), 3000);
      }
    };

    // Only save if we have actual data (not just the initial state)
    if (tableData.length > 0) {
      saveData();
    }
  }, [tableData, pricingConfig, isInitialLoad]);

  // Function to clear all saved data
  const clearSavedData = () => {
    try {
      localStorage.removeItem('payrollTableData');
      localStorage.removeItem('payrollPricingConfig');
      setTableData(defaultTableData);
      setPricingConfig({
        localMooringPrice: 500,
        localUnmooringPrice: 500,
        foreignMooringPrice: 800,
        foreignUnmooringPrice: 800
      });
      setAutoSaveStatus('Data cleared');
      setTimeout(() => setAutoSaveStatus(''), 2000);
    } catch (error) {
      console.error('Error clearing data:', error);
    }
  };


  useEffect(() => {
    const auth = getAuth();
    const db = getFirestore();
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const email = firebaseUser.email || '';
        let name = '';
        try {
          // Always try to get name from Firestore first
          const q = query(collection(db, 'users'), where('email', '==', email));
          const querySnapshot = await getDocs(q);
          if (!querySnapshot.empty) {
            const userData = querySnapshot.docs[0].data();
            if (userData.fullName) {
              name = userData.fullName;
            } else if (userData.name) {
              name = userData.name;
            }
          }
          // If Firestore name not found, fallback to displayName or email username
          if (!name) {
            name = firebaseUser.displayName || (email ? email.split('@')[0] : '');
          }
        } catch (error) {
          name = firebaseUser.displayName || (email ? email.split('@')[0] : '');
        }
        // Final fallback: if name is still empty, use "User"
        if (!name) name = "User";
        setUser({
          name: name,
          email: email,
          initials: getInitials(name, email),
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        });
      } else {
        setUser({
          name: '',
          email: '',
          initials: '',
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        });
      }
    });
    return () => unsubscribe();
  }, []);

  // Load individual worker payroll data
  useEffect(() => {
    const loadIndividualPayrollData = async () => {
      if (user.name && user.name !== "Alice Margaretha Santos") {
        try {
          const db = getFirestore();
          
          // Get current date for workers payroll ID
          const currentDate = new Date();
          const month = currentDate.getMonth() + 1;
          const date = currentDate.getDate();
          const year = currentDate.getFullYear();
          const workersPayrollId = `workerspayroll(${month},${date},${year})`;
          
          // Try to get today's workers payroll data first
          const workersPayrollRef = doc(db, 'workerPayrolls', workersPayrollId);
          const workersPayrollDoc = await getDoc(workersPayrollRef);
          
          if (workersPayrollDoc.exists()) {
            const workersData = workersPayrollDoc.data();
            if (workersData.workers) {
              // Set available workers for dropdown
              setAvailableWorkers(workersData.workers.map(w => w.workerName));
              
              // Find current user's data
              const currentWorkerData = workersData.workers.find(w => w.workerName === user.name);
              if (currentWorkerData && currentWorkerData.payrollData) {
                setIndividualPayrollData(currentWorkerData.payrollData);
                setSelectedWorker(user.name);
                return;
              }
            }
          }
          
          // If today's data doesn't exist, get the most recent data
          const q = query(collection(db, 'workerPayrolls'));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            // Sort by date to get the most recent
            const sortedDocs = querySnapshot.docs.sort((a, b) => 
              new Date(b.data().date) - new Date(a.data().date)
            );
            const latestData = sortedDocs[0].data();
            if (latestData.workers) {
              setAvailableWorkers(latestData.workers.map(w => w.workerName));
              
              // Find current user's data
              const currentWorkerData = latestData.workers.find(w => w.workerName === user.name);
              if (currentWorkerData && currentWorkerData.payrollData) {
                setIndividualPayrollData(currentWorkerData.payrollData);
                setSelectedWorker(user.name);
              }
            }
          }
        } catch (error) {
          console.error('Error loading individual payroll data:', error);
        }
      }
    };

    loadIndividualPayrollData();
  }, [user.name]);

  const handleToggleManagerView = () => {
    const newValue = !isManagerView;
    setIsManagerView(newValue);
    // Save Alice's preference to localStorage
    if (user.name === "Alice Margaretha Santos" || user.email === "aliceleo@gmail.com") {
      localStorage.setItem('aliceManagerView', newValue.toString());
    }
  };

  const handleBackToRegularView = () => {
    setIsManagerView(false);
    // Clear the stored preference when going back to regular view
    localStorage.removeItem('aliceManagerView');
  };

  // Calculate total earnings based on operation counts and pricing
  const calculateTotalEarnings = (row) => {
    const localMooringCount = parseFloat(row.localMooringCount) || 0;
    const localUnmooringCount = parseFloat(row.localUnmooringCount) || 0;
    const foreignMooringCount = parseFloat(row.foreignMooringCount) || 0;
    const foreignUnmooringCount = parseFloat(row.foreignUnmooringCount) || 0;

    const localMooringEarnings = localMooringCount * pricingConfig.localMooringPrice;
    const localUnmooringEarnings = localUnmooringCount * pricingConfig.localUnmooringPrice;
    const foreignMooringEarnings = foreignMooringCount * pricingConfig.foreignMooringPrice;
    const foreignUnmooringEarnings = foreignUnmooringCount * pricingConfig.foreignUnmooringPrice;

    return localMooringEarnings + localUnmooringEarnings + foreignMooringEarnings + foreignUnmooringEarnings;
  };

  // Calculate net total after deductions
  const calculateNetTotal = (row) => {
    const totalEarnings = calculateTotalEarnings(row);
    const sss = parseFloat(row.sss) || 0;
    const pagibig = parseFloat(row.pagibig) || 0;
    const philhealth = parseFloat(row.philhealth) || 0;
    const tal = parseFloat(row.tal) || 0;
    const cashAdvance = parseFloat(row.cashAdvance) || 0;

    const totalDeductions = sss + pagibig + philhealth + tal + cashAdvance;
    return totalEarnings - totalDeductions;
  };

  // Calculate current user's payroll data from table
  const getCurrentUserPayrollData = () => {
    const currentUserRow = tableData.find(row => row.workerName === user.name);
    if (!currentUserRow) {
      return {
        local: '0',
        foreign: '0',
        total: '0',
        pagibigLoan: '0',
        cashAdvance: '0',
        balance: '0',
        sssPiPh: '0',
        totalDeductions: '0',
        finalTotal: '0'
      };
    }

    const localMooringCount = parseFloat(currentUserRow.localMooringCount) || 0;
    const localUnmooringCount = parseFloat(currentUserRow.localUnmooringCount) || 0;
    const foreignMooringCount = parseFloat(currentUserRow.foreignMooringCount) || 0;
    const foreignUnmooringCount = parseFloat(currentUserRow.foreignUnmooringCount) || 0;

    const localEarnings = (localMooringCount + localUnmooringCount) * pricingConfig.localMooringPrice;
    const foreignEarnings = (foreignMooringCount + foreignUnmooringCount) * pricingConfig.foreignMooringPrice;
    const totalEarnings = localEarnings + foreignEarnings;

    const sss = parseFloat(currentUserRow.sss) || 0;
    const pagibig = parseFloat(currentUserRow.pagibig) || 0;
    const philhealth = parseFloat(currentUserRow.philhealth) || 0;
    const tal = parseFloat(currentUserRow.tal) || 0;
    const cashAdvance = parseFloat(currentUserRow.cashAdvance) || 0;

    const totalDeductions = sss + pagibig + philhealth + tal;
    const netTotal = totalEarnings - totalDeductions - cashAdvance;

    return {
      local: localEarnings.toFixed(2),
      foreign: foreignEarnings.toFixed(2),
      total: totalEarnings.toFixed(2),
      pagibigLoan: pagibig.toFixed(2),
      cashAdvance: cashAdvance.toFixed(2),
      balance: (totalEarnings - cashAdvance).toFixed(2),
      sssPiPh: (sss + philhealth).toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      finalTotal: netTotal.toFixed(2)
    };
  };

  // Store pending updates in a Map to avoid React re-renders
  const pendingUpdates = useRef(new Map());
  const updateTimeout = useRef(null);
  
  // Store pricing updates in a separate Map to avoid React re-renders
  const pendingPricingUpdates = useRef(new Map());
  const pricingUpdateTimeout = useRef(null);
  
  // Ultra-simple input handler that NEVER causes re-renders
  const handleInputChange = useCallback((rowIndex, field, value) => {
    // Store the value in a Map instead of React state
    const key = `${rowIndex}-${field}`;
    pendingUpdates.current.set(key, value);
    
    // Clear any existing timeout
    if (updateTimeout.current) {
      clearTimeout(updateTimeout.current);
    }
    
    // Set a very long timeout to batch updates (only when user stops typing for 5 seconds)
    updateTimeout.current = setTimeout(() => {
      // Batch commit all pending updates
      const updates = Array.from(pendingUpdates.current.entries());
      if (updates.length > 0) {
        setTableData(prevData => {
          const newData = [...prevData];
          updates.forEach(([key, value]) => {
            const [rowIndexStr, field] = key.split('-');
            const rowIndex = parseInt(rowIndexStr);
            if (newData[rowIndex]) {
              newData[rowIndex] = {
                ...newData[rowIndex],
                [field]: value
              };
            }
          });
          return newData;
        });
        pendingUpdates.current.clear();
      }
    }, 5000); // 5 second delay to batch updates
  }, []);
  
  // Handle blur to commit pending updates immediately
  const handleInputBlur = useCallback((rowIndex, field) => {
    const key = `${rowIndex}-${field}`;
    const value = pendingUpdates.current.get(key);
    
    if (value !== undefined) {
      setTableData(prevData => {
        const newData = [...prevData];
        if (newData[rowIndex]) {
          newData[rowIndex] = {
            ...newData[rowIndex],
            [field]: value
          };
        }
        return newData;
      });
      pendingUpdates.current.delete(key);
    }
  }, []);

  // Pricing input handler that NEVER causes re-renders
  const handlePricingInputChange = useCallback((field, value) => {
    // Store the value in a Map instead of React state
    pendingPricingUpdates.current.set(field, value);
    
    // Clear any existing timeout
    if (pricingUpdateTimeout.current) {
      clearTimeout(pricingUpdateTimeout.current);
    }
    
    // Set a very long timeout to batch updates (only when user stops typing for 5 seconds)
    pricingUpdateTimeout.current = setTimeout(() => {
      // Batch commit all pending pricing updates
      const updates = Array.from(pendingPricingUpdates.current.entries());
      if (updates.length > 0) {
        setPricingConfig(prevConfig => {
          const newConfig = { ...prevConfig };
          updates.forEach(([field, value]) => {
            newConfig[field] = parseFloat(value) || 0;
          });
          return newConfig;
        });
        pendingPricingUpdates.current.clear();
      }
    }, 5000); // 5 second delay to batch updates
  }, []);

  // Handle pricing blur to commit pending updates immediately
  const handlePricingInputBlur = useCallback((field) => {
    const value = pendingPricingUpdates.current.get(field);
    
    if (value !== undefined) {
      setPricingConfig(prevConfig => ({
        ...prevConfig,
        [field]: parseFloat(value) || 0
      }));
      pendingPricingUpdates.current.delete(field);
    }
  }, []);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (updateTimeout.current) {
        clearTimeout(updateTimeout.current);
      }
      if (pricingUpdateTimeout.current) {
        clearTimeout(pricingUpdateTimeout.current);
      }
    };
  }, []);

  // Handle keyboard navigation for continuous input
  const handleKeyDown = (e, rowIndex, field) => {
    const currentRow = rowIndex;
    const fields = ['localVess', 'foreignVess', 'tal', 'sss', 'pagibig', 'philhealth', 'cashAdvance', 'netTotal'];
    const currentFieldIndex = fields.indexOf(field);
    
    if (e.key === 'Enter' || e.key === 'Tab' || e.key === 'ArrowRight') {
      e.preventDefault();
      
      // Move to next field in same row
      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        const nextInput = document.querySelector(`input[data-row="${currentRow}"][data-field="${nextField}"]`);
        if (nextInput) {
          nextInput.focus();
          // Only select if empty
          if (!nextInput.value || nextInput.value === '') {
            nextInput.select();
          }
          // Add visual feedback
          nextInput.style.backgroundColor = '#fff3cd';
          setTimeout(() => {
            nextInput.style.backgroundColor = '';
          }, 200);
        }
      } else {
        // Move to first field of next row
        if (currentRow < tableData.length - 1) {
          const nextRowInput = document.querySelector(`input[data-row="${currentRow + 1}"][data-field="localVess"]`);
          if (nextRowInput) {
            nextRowInput.focus();
            // Only select if empty
            if (!nextRowInput.value || nextRowInput.value === '') {
              nextRowInput.select();
            }
            // Add visual feedback
            nextRowInput.style.backgroundColor = '#fff3cd';
            setTimeout(() => {
              nextRowInput.style.backgroundColor = '';
            }, 200);
          }
        }
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      
      // Move to previous field in same row
      if (currentFieldIndex > 0) {
        const prevField = fields[currentFieldIndex - 1];
        const prevInput = document.querySelector(`input[data-row="${currentRow}"][data-field="${prevField}"]`);
        if (prevInput) {
          prevInput.focus();
          // Only select if empty
          if (!prevInput.value || prevInput.value === '') {
            prevInput.select();
          }
          // Add visual feedback
          prevInput.style.backgroundColor = '#fff3cd';
          setTimeout(() => {
            prevInput.style.backgroundColor = '';
          }, 200);
        }
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      
      // Move to same field in previous row
      if (currentRow > 0) {
        const prevRowInput = document.querySelector(`input[data-row="${currentRow - 1}"][data-field="${field}"]`);
        if (prevRowInput) {
          prevRowInput.focus();
          // Only select if empty
          if (!prevRowInput.value || prevRowInput.value === '') {
            prevRowInput.select();
          }
          // Add visual feedback
          prevRowInput.style.backgroundColor = '#fff3cd';
          setTimeout(() => {
            prevRowInput.style.backgroundColor = '';
          }, 200);
        }
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      
      // Move to same field in next row
      if (currentRow < tableData.length - 1) {
        const nextRowInput = document.querySelector(`input[data-row="${currentRow + 1}"][data-field="${field}"]`);
        if (nextRowInput) {
          nextRowInput.focus();
          // Only select if empty
          if (!nextRowInput.value || nextRowInput.value === '') {
            nextRowInput.select();
          }
          // Add visual feedback
          nextRowInput.style.backgroundColor = '#fff3cd';
          setTimeout(() => {
            nextRowInput.style.backgroundColor = '';
          }, 200);
        }
      }
    }
  };

  const handleTableKeyDown = (e, rowIndex, colIndex) => {
    // Only handle navigation keys, allow normal typing
    if (['Enter', 'Tab', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      // Determine available column indices dynamically for the current row
      const rowInputs = Array.from(document.querySelectorAll(`input[data-row="${rowIndex}"][data-col]`));
      const colIndices = rowInputs.map(input => parseInt(input.getAttribute('data-col'), 10)).filter(n => !Number.isNaN(n));
      const minCol = colIndices.length ? Math.min(...colIndices) : 1;
      const maxCol = colIndices.length ? Math.max(...colIndices) : colIndex;

      const focusCell = (r, c) => {
        const input = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
        if (input) {
          input.focus();
          // Don't auto-select to allow continuous typing
          input.style.backgroundColor = '#fff3cd';
          setTimeout(() => { input.style.backgroundColor = ''; }, 200);
        }
      };

      if (['Enter', 'ArrowDown'].includes(e.key)) {
        e.preventDefault();
        if (rowIndex < tableData.length - 1) {
          focusCell(rowIndex + 1, colIndex);
        }
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (rowIndex > 0) {
          focusCell(rowIndex - 1, colIndex);
        }
      } else if (e.key === 'Tab' || e.key === 'ArrowRight') {
        e.preventDefault();
        // Move to the next existing column in the same row, skipping gaps
        let nextCol = colIndex + 1;
        while (nextCol <= maxCol && !document.querySelector(`input[data-row="${rowIndex}"][data-col="${nextCol}"]`)) {
          nextCol += 1;
        }
        if (nextCol <= maxCol) {
          focusCell(rowIndex, nextCol);
        } else if (rowIndex < tableData.length - 1) {
          // Wrap to the first column on the next row
          focusCell(rowIndex + 1, minCol);
        }
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        // Move to the previous existing column in the same row, skipping gaps
        let prevCol = colIndex - 1;
        while (prevCol >= minCol && !document.querySelector(`input[data-row="${rowIndex}"][data-col="${prevCol}"]`)) {
          prevCol -= 1;
        }
        if (prevCol >= minCol) {
          focusCell(rowIndex, prevCol);
        } else if (rowIndex > 0) {
          // Wrap to the last column on the previous row
          const prevRowInputs = Array.from(document.querySelectorAll(`input[data-row="${rowIndex - 1}"][data-col]`));
          const prevRowCols = prevRowInputs.map(input => parseInt(input.getAttribute('data-col'), 10)).filter(n => !Number.isNaN(n));
          const prevRowMax = prevRowCols.length ? Math.max(...prevRowCols) : colIndex;
          focusCell(rowIndex - 1, prevRowMax);
        }
      }
    }
    // Allow all other keys (letters, numbers, etc.) to work normally
  };

  // Handle input focus (no auto-select, allow continuous typing)
  const handleInputFocus = useCallback((e) => {
    // Store the current cursor position to maintain it
    const input = e.target;
    const cursorPosition = input.selectionStart;
    
    // Use setTimeout to ensure the cursor position is maintained after re-render
    setTimeout(() => {
      if (input && input.setSelectionRange) {
        input.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  }, []);


  const handleVessTypeChange = (rowIndex, column, type) => {
    const newTableData = [...tableData];
    if (column === 'localVessType') {
      newTableData[rowIndex] = {
        ...newTableData[rowIndex],
        localVessType: type
      };
    } else if (column === 'foreignVessType') {
      newTableData[rowIndex] = {
        ...newTableData[rowIndex],
        foreignVessType: type
      };
    }
    setTableData(newTableData);
    setActiveDropdownRow(null);
    setActiveDropdownColumn(null);
  };

  const toggleDropdown = (rowIndex, column) => {
    if (activeDropdownRow === rowIndex && activeDropdownColumn === column) {
      setActiveDropdownRow(null);
      setActiveDropdownColumn(null);
    } else {
      setActiveDropdownRow(rowIndex);
      setActiveDropdownColumn(column);
    }
  };

  const handleWorkerSelection = async (workerName) => {
    setSelectedWorker(workerName);
    setShowWorkerDropdown(false);
    
    try {
      const db = getFirestore();
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1;
      const date = currentDate.getDate();
      const year = currentDate.getFullYear();
      const workersPayrollId = `workerspayroll(${month},${date},${year})`;
      
      // Try to get today's data first
      const workersPayrollRef = doc(db, 'workerPayrolls', workersPayrollId);
      const workersPayrollDoc = await getDoc(workersPayrollRef);
      
      if (workersPayrollDoc.exists()) {
        const workersData = workersPayrollDoc.data();
        if (workersData.workers) {
          const selectedWorkerData = workersData.workers.find(w => w.workerName === workerName);
          if (selectedWorkerData && selectedWorkerData.payrollData) {
            setIndividualPayrollData(selectedWorkerData.payrollData);
            return;
          }
        }
      }
      
      // If today's data doesn't exist, get the most recent data
      const q = query(collection(db, 'workerPayrolls'));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
        const sortedDocs = querySnapshot.docs.sort((a, b) => 
          new Date(b.data().date) - new Date(a.data().date)
        );
        const latestData = sortedDocs[0].data();
        if (latestData.workers) {
          const selectedWorkerData = latestData.workers.find(w => w.workerName === workerName);
          if (selectedWorkerData && selectedWorkerData.payrollData) {
            setIndividualPayrollData(selectedWorkerData.payrollData);
          }
        }
      }
    } catch (error) {
      console.error('Error loading worker data:', error);
    }
  };

  const handleSaveToFirestore = async () => {
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const db = getFirestore();
      const auth = getAuth();
      
      if (!auth.currentUser) {
        throw new Error('User not authenticated');
      }

      // Create the payroll data structure
      const payrollData = {
        date: new Date().toISOString(),
        createdBy: auth.currentUser.email,
        createdByName: user.name,
        localVessType: localVessType,
        foreignVessType: foreignVessType,
        workers: tableData.map(row => {
          const localMooringCount = parseFloat(row.localMooringCount) || 0;
          const localUnmooringCount = parseFloat(row.localUnmooringCount) || 0;
          const foreignMooringCount = parseFloat(row.foreignMooringCount) || 0;
          const foreignUnmooringCount = parseFloat(row.foreignUnmooringCount) || 0;
          
          const localMooringEarnings = localMooringCount * pricingConfig.localMooringPrice;
          const localUnmooringEarnings = localUnmooringCount * pricingConfig.localUnmooringPrice;
          const foreignMooringEarnings = foreignMooringCount * pricingConfig.foreignMooringPrice;
          const foreignUnmooringEarnings = foreignUnmooringCount * pricingConfig.foreignUnmooringPrice;
          
          const totalEarnings = localMooringEarnings + localUnmooringEarnings + foreignMooringEarnings + foreignUnmooringEarnings;
          
          const sss = parseFloat(row.sss) || 0;
          const pagibig = parseFloat(row.pagibig) || 0;
          const philhealth = parseFloat(row.philhealth) || 0;
          const tal = parseFloat(row.tal) || 0;
          const cashAdvance = parseFloat(row.cashAdvance) || 0;
          
          const totalDeductions = sss + pagibig + philhealth + tal + cashAdvance;
          const netTotal = totalEarnings - totalDeductions;
          
          return {
            id: row.id,
            workerName: row.workerName,
            localMooringCount: row.localMooringCount || '',
            localUnmooringCount: row.localUnmooringCount || '',
            foreignMooringCount: row.foreignMooringCount || '',
            foreignUnmooringCount: row.foreignUnmooringCount || '',
            localMooringEarnings: localMooringEarnings,
            localUnmooringEarnings: localUnmooringEarnings,
            foreignMooringEarnings: foreignMooringEarnings,
            foreignUnmooringEarnings: foreignUnmooringEarnings,
            totalEarnings: totalEarnings,
            tal: row.tal || '',
            sss: row.sss || '',
            pagibig: row.pagibig || '',
            philhealth: row.philhealth || '',
            cashAdvance: row.cashAdvance || '',
            netTotal: netTotal
          };
        }),
        totals: {
          localMooringCount: tableData.reduce((sum, row) => sum + (parseFloat(row.localMooringCount) || 0), 0),
          localUnmooringCount: tableData.reduce((sum, row) => sum + (parseFloat(row.localUnmooringCount) || 0), 0),
          foreignMooringCount: tableData.reduce((sum, row) => sum + (parseFloat(row.foreignMooringCount) || 0), 0),
          foreignUnmooringCount: tableData.reduce((sum, row) => sum + (parseFloat(row.foreignUnmooringCount) || 0), 0),
          totalEarnings: tableData.reduce((sum, row) => {
            const localMooringCount = parseFloat(row.localMooringCount) || 0;
            const localUnmooringCount = parseFloat(row.localUnmooringCount) || 0;
            const foreignMooringCount = parseFloat(row.foreignMooringCount) || 0;
            const foreignUnmooringCount = parseFloat(row.foreignUnmooringCount) || 0;
            return sum + (localMooringCount * pricingConfig.localMooringPrice) + 
                   (localUnmooringCount * pricingConfig.localUnmooringPrice) + 
                   (foreignMooringCount * pricingConfig.foreignMooringPrice) + 
                   (foreignUnmooringCount * pricingConfig.foreignUnmooringPrice);
          }, 0),
          tal: tableData.reduce((sum, row) => sum + (parseFloat(row.tal) || 0), 0),
          sss: tableData.reduce((sum, row) => sum + (parseFloat(row.sss) || 0), 0),
          pagibig: tableData.reduce((sum, row) => sum + (parseFloat(row.pagibig) || 0), 0),
          philhealth: tableData.reduce((sum, row) => sum + (parseFloat(row.philhealth) || 0), 0),
          cashAdvance: tableData.reduce((sum, row) => sum + (parseFloat(row.cashAdvance) || 0), 0),
          netTotal: tableData.reduce((sum, row) => {
            const localMooringCount = parseFloat(row.localMooringCount) || 0;
            const localUnmooringCount = parseFloat(row.localUnmooringCount) || 0;
            const foreignMooringCount = parseFloat(row.foreignMooringCount) || 0;
            const foreignUnmooringCount = parseFloat(row.foreignUnmooringCount) || 0;
            const totalEarnings = (localMooringCount * pricingConfig.localMooringPrice) + 
                                 (localUnmooringCount * pricingConfig.localUnmooringPrice) + 
                                 (foreignMooringCount * pricingConfig.foreignMooringPrice) + 
                                 (foreignUnmooringCount * pricingConfig.foreignUnmooringPrice);
            const totalDeductions = (parseFloat(row.sss) || 0) + (parseFloat(row.pagibig) || 0) + 
                                   (parseFloat(row.philhealth) || 0) + (parseFloat(row.tal) || 0) + 
                                   (parseFloat(row.cashAdvance) || 0);
            return sum + (totalEarnings - totalDeductions);
          }, 0)
        },
        status: 'active',
        lastModified: new Date().toISOString()
      };

      // Generate payroll ID based on current date
      const currentDate = new Date();
      const month = currentDate.getMonth() + 1; // getMonth() returns 0-11
      const date = currentDate.getDate();
      const year = currentDate.getFullYear();
      const payrollId = `payroll(${month},${date},${year})`;
      
      // Save to Firestore with custom document ID
      const payrollRef = doc(db, 'payrolls', payrollId);
      await setDoc(payrollRef, payrollData);
      
      // Save all workers data to a single document with workerspayroll format
      const workersPayrollId = `workerspayroll(${month},${date},${year})`;
      const workersPayrollData = {
        payrollId: payrollId,
        date: new Date().toISOString(),
        createdBy: auth.currentUser.email,
        createdByName: user.name,
        workers: payrollData.workers.map(worker => ({
          workerName: worker.workerName,
          email: `${worker.workerName.toLowerCase().replace(/\s+/g, '')}@gmail.com`,
          payrollData: {
            localMooringCount: worker.localMooringCount || '',
            localUnmooringCount: worker.localUnmooringCount || '',
            foreignMooringCount: worker.foreignMooringCount || '',
            foreignUnmooringCount: worker.foreignUnmooringCount || '',
            localMooringEarnings: worker.localMooringEarnings || 0,
            localUnmooringEarnings: worker.localUnmooringEarnings || 0,
            foreignMooringEarnings: worker.foreignMooringEarnings || 0,
            foreignUnmooringEarnings: worker.foreignUnmooringEarnings || 0,
            total: worker.totalEarnings || 0,
            pagibigLoan: worker.pagibig || '',
            cashAdvance: worker.cashAdvance || '',
            balance: (worker.totalEarnings || 0) - (parseFloat(worker.cashAdvance) || 0),
            sssPiPh: (parseFloat(worker.sss) || 0) + (parseFloat(worker.philhealth) || 0),
            totalDeductions: (parseFloat(worker.sss) || 0) + (parseFloat(worker.pagibig) || 0) + (parseFloat(worker.philhealth) || 0) + (parseFloat(worker.tal) || 0),
            finalTotal: worker.netTotal || 0
          }
        })),
        lastUpdated: new Date().toISOString()
      };
      
      // Save to workers payroll collection
      const workersPayrollRef = doc(db, 'workerPayrolls', workersPayrollId);
      await setDoc(workersPayrollRef, workersPayrollData);
      
      setSaveMessage('Payroll data saved successfully!');
      setTimeout(() => setSaveMessage(''), 3000);
      
    } catch (error) {
      console.error('Error saving payroll data:', error);
      setSaveMessage('Error saving data. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Manager View Component
  const ManagerView = () => (
    <div className="manager-view">
      <div className="manager-header">
        <div className="manager-controls">
          <button
            onClick={handleBackToRegularView}
            className="back-button"
          >
            ← Back to Regular View
          </button>
          <button
            onClick={() => setShowPricingConfig(!showPricingConfig)}
            className="pricing-config-button"
          >
            Pricing Configuration
          </button>
        </div>
        <h2>Worker Payroll Management</h2>
      </div>
      
      {/* Pricing Configuration Panel */}
      {showPricingConfig && (
        <div className="pricing-config-panel">
          <h3>Vessel Pricing Configuration</h3>
          <div className="pricing-config-grid">
            <div className="pricing-config-group">
              <h4>Local Vessel Pricing</h4>
              <div className="pricing-input-group">
                <label>Mooring Price (₱):</label>
                <UltraSimpleInput
                  initialValue={pricingConfig.localMooringPrice}
                  onValueChange={(value) => handlePricingInputChange('localMooringPrice', value)}
                  onBlur={() => handlePricingInputBlur('localMooringPrice')}
                  className="pricing-input"
                  placeholder="Enter price"
                />
              </div>
              <div className="pricing-input-group">
                <label>Unmooring Price (₱):</label>
                <UltraSimpleInput
                  initialValue={pricingConfig.localUnmooringPrice}
                  onValueChange={(value) => handlePricingInputChange('localUnmooringPrice', value)}
                  onBlur={() => handlePricingInputBlur('localUnmooringPrice')}
                  className="pricing-input"
                  placeholder="Enter price"
                />
              </div>
            </div>
            
            <div className="pricing-config-group">
              <h4>Foreign Vessel Pricing</h4>
              <div className="pricing-input-group">
                <label>Mooring Price (₱):</label>
                <UltraSimpleInput
                  initialValue={pricingConfig.foreignMooringPrice}
                  onValueChange={(value) => handlePricingInputChange('foreignMooringPrice', value)}
                  onBlur={() => handlePricingInputBlur('foreignMooringPrice')}
                  className="pricing-input"
                  placeholder="Enter price"
                />
              </div>
              <div className="pricing-input-group">
                <label>Unmooring Price (₱):</label>
                <UltraSimpleInput
                  initialValue={pricingConfig.foreignUnmooringPrice}
                  onValueChange={(value) => handlePricingInputChange('foreignUnmooringPrice', value)}
                  onBlur={() => handlePricingInputBlur('foreignUnmooringPrice')}
                  className="pricing-input"
                  placeholder="Enter price"
                />
              </div>
            </div>
          </div>
          <div className="pricing-config-actions">
            <button
              onClick={() => setShowPricingConfig(false)}
              className="pricing-save-button"
            >
              Save & Close
            </button>
          </div>
        </div>
      )}
      <div className="manager-table-container">
        <table className="manager-table">
          <thead>
            <tr>
              <th rowSpan="2">Workers</th>
              <th colSpan="2">Local Vessel</th>
              <th colSpan="2">Foreign Vessel</th>
              <th rowSpan="2">TOTAL</th>
              <th rowSpan="2">SSS</th>
              <th rowSpan="2">PAG-IBIG</th>
              <th rowSpan="2">PhilHealth</th>
              <th rowSpan="2">Cash Advance</th>
              <th rowSpan="2">NET TOTAL</th>
            </tr>
            <tr>
              <th>Mooring</th>
              <th>Unmooring</th>
              <th>Mooring</th>
              <th>Unmooring</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={row.id}>
                <td className="worker-name-cell">{row.workerName}</td>
                {/* Local Vessel - Mooring */}
                <td>
                  <UltraSimpleInput
                    initialValue={row.localMooringCount}
                    onValueChange={(value) => handleInputChange(rowIndex, 'localMooringCount', value)}
                    onBlur={() => handleInputBlur(rowIndex, 'localMooringCount')}
                    dataRow={rowIndex}
                    dataCol={1}
                    className="table-input vess-input"
                    placeholder="Count"
                  />
                </td>
                {/* Local Vessel - Unmooring */}
                <td>
                  <UltraSimpleInput
                    initialValue={row.localUnmooringCount}
                    onValueChange={(value) => handleInputChange(rowIndex, 'localUnmooringCount', value)}
                    onBlur={() => handleInputBlur(rowIndex, 'localUnmooringCount')}
                    dataRow={rowIndex}
                    dataCol={2}
                    className="table-input vess-input"
                    placeholder="Count"
                  />
                </td>
                {/* Foreign Vessel - Mooring */}
                <td>
                  <UltraSimpleInput
                    initialValue={row.foreignMooringCount}
                    onValueChange={(value) => handleInputChange(rowIndex, 'foreignMooringCount', value)}
                    onBlur={() => handleInputBlur(rowIndex, 'foreignMooringCount')}
                    dataRow={rowIndex}
                    dataCol={3}
                    className="table-input vess-input"
                    placeholder="Count"
                  />
                </td>
                {/* Foreign Vessel - Unmooring */}
                <td>
                  <UltraSimpleInput
                    initialValue={row.foreignUnmooringCount}
                    onValueChange={(value) => handleInputChange(rowIndex, 'foreignUnmooringCount', value)}
                    onBlur={() => handleInputBlur(rowIndex, 'foreignUnmooringCount')}
                    dataRow={rowIndex}
                    dataCol={4}
                    className="table-input vess-input"
                    placeholder="Count"
                  />
                </td>
                {/* TOTAL */}
                <td>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={(() => {
                      const localMooringCount = parseFloat(row.localMooringCount) || 0;
                      const localUnmooringCount = parseFloat(row.localUnmooringCount) || 0;
                      const foreignMooringCount = parseFloat(row.foreignMooringCount) || 0;
                      const foreignUnmooringCount = parseFloat(row.foreignUnmooringCount) || 0;
                      return (localMooringCount * pricingConfig.localMooringPrice) + 
                             (localUnmooringCount * pricingConfig.localUnmooringPrice) + 
                             (foreignMooringCount * pricingConfig.foreignMooringPrice) + 
                             (foreignUnmooringCount * pricingConfig.foreignUnmooringPrice);
                    })()}
                    readOnly
                    className="table-input"
                    tabIndex={-1}
                  />
                </td>
                {/* SSS */}
                <td>
                  <UltraSimpleInput
                    initialValue={row.sss}
                    onValueChange={(value) => handleInputChange(rowIndex, 'sss', value)}
                    onBlur={() => handleInputBlur(rowIndex, 'sss')}
                    dataRow={rowIndex}
                    dataCol={6}
                    className="table-input vess-input"
                    placeholder="Enter amount"
                  />
                </td>
                {/* PAG-IBIG */}
                <td>
                  <UltraSimpleInput
                    initialValue={row.pagibig}
                    onValueChange={(value) => handleInputChange(rowIndex, 'pagibig', value)}
                    onBlur={() => handleInputBlur(rowIndex, 'pagibig')}
                    dataRow={rowIndex}
                    dataCol={7}
                    className="table-input vess-input"
                    placeholder="Enter amount"
                  />
                </td>
                {/* PhilHealth */}
                <td>
                  <UltraSimpleInput
                    initialValue={row.philhealth}
                    onValueChange={(value) => handleInputChange(rowIndex, 'philhealth', value)}
                    onBlur={() => handleInputBlur(rowIndex, 'philhealth')}
                    dataRow={rowIndex}
                    dataCol={8}
                    className="table-input vess-input"
                    placeholder="Enter amount"
                  />
                </td>
                {/* Cash Advance */}
                <td>
                  <UltraSimpleInput
                    initialValue={row.cashAdvance}
                    onValueChange={(value) => handleInputChange(rowIndex, 'cashAdvance', value)}
                    onBlur={() => handleInputBlur(rowIndex, 'cashAdvance')}
                    dataRow={rowIndex}
                    dataCol={9}
                    className="table-input vess-input"
                    placeholder="Enter amount"
                  />
                </td>
                {/* NET TOTAL */}
                <td>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={(() => {
                      const localMooringCount = parseFloat(row.localMooringCount) || 0;
                      const localUnmooringCount = parseFloat(row.localUnmooringCount) || 0;
                      const foreignMooringCount = parseFloat(row.foreignMooringCount) || 0;
                      const foreignUnmooringCount = parseFloat(row.foreignUnmooringCount) || 0;
                      const totalEarnings = (localMooringCount * pricingConfig.localMooringPrice) + 
                                           (localUnmooringCount * pricingConfig.localUnmooringPrice) + 
                                           (foreignMooringCount * pricingConfig.foreignMooringPrice) + 
                                           (foreignUnmooringCount * pricingConfig.foreignUnmooringPrice);
                      const totalDeductions = (parseFloat(row.sss) || 0) + (parseFloat(row.pagibig) || 0) + 
                                             (parseFloat(row.philhealth) || 0) + (parseFloat(row.tal) || 0) + 
                                             (parseFloat(row.cashAdvance) || 0);
                      return totalEarnings - totalDeductions;
                    })()}
                    readOnly
                    className="table-input"
                    tabIndex={-1}
                  />
                </td>
              </tr>
            ))}
            <tr className="grand-total-row">
              <td>GRAND TOTAL</td>
              <td>{tableData.reduce((sum, row) => sum + (parseFloat(row.localMooringCount) || 0), 0)}</td>
              <td>{tableData.reduce((sum, row) => sum + (parseFloat(row.localUnmooringCount) || 0), 0)}</td>
              <td>{tableData.reduce((sum, row) => sum + (parseFloat(row.foreignMooringCount) || 0), 0)}</td>
              <td>{tableData.reduce((sum, row) => sum + (parseFloat(row.foreignUnmooringCount) || 0), 0)}</td>
              <td>{tableData.reduce((sum, row) => {
                const localMooringCount = parseFloat(row.localMooringCount) || 0;
                const localUnmooringCount = parseFloat(row.localUnmooringCount) || 0;
                const foreignMooringCount = parseFloat(row.foreignMooringCount) || 0;
                const foreignUnmooringCount = parseFloat(row.foreignUnmooringCount) || 0;
                return sum + (localMooringCount * pricingConfig.localMooringPrice) + 
                       (localUnmooringCount * pricingConfig.localUnmooringPrice) + 
                       (foreignMooringCount * pricingConfig.foreignMooringPrice) + 
                       (foreignUnmooringCount * pricingConfig.foreignUnmooringPrice);
              }, 0)}</td>
              <td>{tableData.reduce((sum, row) => sum + (parseFloat(row.sss) || 0), 0)}</td>
              <td>{tableData.reduce((sum, row) => sum + (parseFloat(row.pagibig) || 0), 0)}</td>
              <td>{tableData.reduce((sum, row) => sum + (parseFloat(row.philhealth) || 0), 0)}</td>
              <td>{tableData.reduce((sum, row) => sum + (parseFloat(row.cashAdvance) || 0), 0)}</td>
              <td>{tableData.reduce((sum, row) => {
                const localMooringCount = parseFloat(row.localMooringCount) || 0;
                const localUnmooringCount = parseFloat(row.localUnmooringCount) || 0;
                const foreignMooringCount = parseFloat(row.foreignMooringCount) || 0;
                const foreignUnmooringCount = parseFloat(row.foreignUnmooringCount) || 0;
                const totalEarnings = (localMooringCount * pricingConfig.localMooringPrice) + 
                                     (localUnmooringCount * pricingConfig.localUnmooringPrice) + 
                                     (foreignMooringCount * pricingConfig.foreignMooringPrice) + 
                                     (foreignUnmooringCount * pricingConfig.foreignUnmooringPrice);
                const totalDeductions = (parseFloat(row.sss) || 0) + (parseFloat(row.pagibig) || 0) + 
                                       (parseFloat(row.philhealth) || 0) + (parseFloat(row.tal) || 0) + 
                                       (parseFloat(row.cashAdvance) || 0);
                return sum + (totalEarnings - totalDeductions);
              }, 0)}</td>
            </tr>
          </tbody>
        </table>
        <div className="save-section">
          <div className="save-controls">
            <button
              onClick={handleSaveToFirestore}
              disabled={isSaving}
              className="save-button"
            >
              {isSaving ? 'Saving...' : 'Save Payroll Data'}
            </button>
            <button
              onClick={clearSavedData}
              className="clear-data-button"
              title="Clear all saved data and reset to defaults"
            >
              Clear Saved Data
            </button>
          </div>
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
              {saveMessage}
            </div>
          )}
          {autoSaveStatus && (
            <div className={`auto-save-status ${autoSaveStatus.includes('failed') ? 'error' : 'success'}`}>
              {autoSaveStatus}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // Regular Payroll View
  const RegularPayrollView = () => (
    <div className="payroll-regular-bg">
      {/* User Profile Section */}
      <div className="payroll-profile-section">
        <div className="payroll-profile-avatar">
          {user.initials || 'U'}
        </div>
        <h2 className="payroll-profile-name">
          {user.name && user.name.trim() !== "" ? user.name : "Your Name"}
        </h2>
        <p className="payroll-profile-email">
          {user.email}
        </p>
        <p className="payroll-profile-date">
          Billing of this day <span className="payroll-profile-date-highlight">({user.date})</span>
        </p>
        {/* Worker Selection Dropdown */}
        {availableWorkers.length > 0 && (
          <div className="payroll-worker-dropdown-container">
            <div className="payroll-worker-dropdown">
              <button
                className="payroll-worker-dropdown-btn"
                onClick={() => setShowWorkerDropdown(!showWorkerDropdown)}
              >
                {selectedWorker || 'Select Worker'}
                <span className="payroll-worker-dropdown-arrow">▼</span>
              </button>
              {showWorkerDropdown && (
                <div className="payroll-worker-dropdown-menu">
                  {availableWorkers.map((workerName, index) => (
                    <div
                      key={index}
                      className="payroll-worker-dropdown-item"
                      onClick={() => handleWorkerSelection(workerName)}
                    >
                      {workerName}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
        {(user.name === "Alice Margaretha Santos" || user.email === "aliceleo@gmail.com") && (
          <div className="payroll-manager-toggle">
            <button className="manager-toggle-btn" onClick={handleToggleManagerView}>
              Proceed
            </button>
          </div>
        )}
      </div>
      {/* Payroll Details Card */}
      <div className="payroll-details-card">
        <div className="payroll-details-header">
          <h3 className="payroll-details-title">
            Payroll Summary
          </h3>
        </div>
        <div className="payroll-details-grid">
          {/* First Group */}
          <div className="payroll-details-group payroll-details-group-local">
            <div className="payroll-details-group-bar payroll-details-group-bar-local" />
            <div className="payroll-details-row">
              <span className="payroll-details-label">LOCAL</span>
              <span className="payroll-details-value">₱{getCurrentUserPayrollData().local}</span>
            </div>
            <div className="payroll-details-row">
              <span className="payroll-details-label">FOREIGN</span>
              <span className="payroll-details-value">₱{getCurrentUserPayrollData().foreign}</span>
            </div>
            <div className="payroll-details-row payroll-details-row-total">
              <span className="payroll-details-label payroll-details-label-total">TOTAL</span>
              <span className="payroll-details-value payroll-details-value-total">₱{getCurrentUserPayrollData().total}</span>
            </div>
          </div>
          {/* Second Group */}
          <div className="payroll-details-group payroll-details-group-loan">
            <div className="payroll-details-group-bar payroll-details-group-bar-loan" />
            <div className="payroll-details-row">
              <span className="payroll-details-label">PAG-IBIG LOAN</span>
              <span className="payroll-details-value">₱{getCurrentUserPayrollData().pagibigLoan}</span>
            </div>
            <div className="payroll-details-row">
              <span className="payroll-details-label">CASH ADVANCE</span>
              <span className="payroll-details-value">₱{getCurrentUserPayrollData().cashAdvance}</span>
            </div>
            <div className="payroll-details-row payroll-details-row-balance">
              <span className="payroll-details-label payroll-details-label-balance">BALANCE</span>
              <span className="payroll-details-value payroll-details-value-balance">₱{getCurrentUserPayrollData().balance}</span>
            </div>
          </div>
          {/* Third Group */}
          <div className="payroll-details-group payroll-details-group-deductions">
            <div className="payroll-details-group-bar payroll-details-group-bar-deductions" />
            <div className="payroll-details-row">
              <span className="payroll-details-label">SSS/PI/PH</span>
              <span className="payroll-details-value">₱{getCurrentUserPayrollData().sssPiPh}</span>
            </div>
            <div className="payroll-details-row payroll-details-row-deductions">
              <span className="payroll-details-label payroll-details-label-deductions">TOTAL DEDUCTIONS</span>
              <span className="payroll-details-value payroll-details-value-deductions">₱{getCurrentUserPayrollData().totalDeductions}</span>
            </div>
          </div>
        </div>
        <div className="payroll-details-final-total">
          <span className="payroll-details-final-label">TOTAL</span>
          <span className="payroll-details-final-value">₱{getCurrentUserPayrollData().finalTotal}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="payroll-center-content">
      {isManagerView && (user.name === "Alice Margaretha Santos" || user.email === "aliceleo@gmail.com") ? (
        <ManagerView />
      ) : (
        <RegularPayrollView />
      )}
    </div>
  );
};

export default Payroll;