import React, { useEffect, useState, useCallback, useMemo, useRef, memo } from 'react';
import './Payroll.css';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, collection, query, where, getDocs, getDoc, addDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import notificationService from '../services/notificationService';
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
const UltraSimpleInput = memo(({ 
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
  const lastValue = useRef(initialValue || '');
  const changeHandlerRef = useRef(null);
  const blurHandlerRef = useRef(null);
  const currentValue = useRef(initialValue || '');
  
  // Set initial value only once, never again
  useEffect(() => {
    if (inputRef.current && !isInitialized.current) {
      const value = initialValue || '';
      inputRef.current.value = value;
      lastValue.current = value;
      currentValue.current = value;
      isInitialized.current = true;
    }
  }, []); // Empty dependency array - only runs once

  // Store handlers in refs to prevent re-renders
  changeHandlerRef.current = (e) => {
    // Direct DOM manipulation - no React state updates during typing
    const value = e.target.value;
    lastValue.current = value;
    currentValue.current = value;
    
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
});

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
  // Helper functions to detect Carla and Alice users
  const isCarlaUser = (u) => {
    const name = (u && u.name) ? u.name.toString().toLowerCase() : '';
    const email = (u && u.email) ? u.email.toString().toLowerCase() : '';
    return name === 'carla dela peña' || name === 'carla' || name.includes('carla') || email.includes('carla');
  };

  const isAliceUser = (u) => {
    const name = (u && u.name) ? u.name.toString().toLowerCase() : '';
    const email = (u && u.email) ? u.email.toString().toLowerCase() : '';
    return name === 'alice margaretha santos' || name === 'alice' || name.includes('alice') || email.includes('alice');
  };
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
  const tableContainerRef = useRef(null);

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
      // Load individual payroll data for non-manager users. Carla is manager and will not use this path.
      if (user.name && !isCarlaUser(user)) {
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
    // Save Carla's preference to localStorage
    if (isCarlaUser(user)) {
      localStorage.setItem('carlaManagerView', newValue.toString());
    }
  };

  const handleBackToRegularView = () => {
    setIsManagerView(false);
    // Clear the stored preference when going back to regular view
    localStorage.removeItem('carlaManagerView');
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
    
    // Set a shorter timeout to batch updates (only when user stops typing for 1 second)
    updateTimeout.current = setTimeout(() => {
      // Preserve scroll position
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const tableScrollTop = tableContainerRef.current?.scrollTop || 0;
      
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
        
        // Restore scroll position after state update
        requestAnimationFrame(() => {
          window.scrollTo(0, scrollTop);
          if (tableContainerRef.current) {
            tableContainerRef.current.scrollTop = tableScrollTop;
          }
        });
      }
    }, 1000); // 1 second delay to batch updates
  }, []);
  
  // Handle blur to commit pending updates immediately
  const handleInputBlur = useCallback((rowIndex, field) => {
    const key = `${rowIndex}-${field}`;
    const value = pendingUpdates.current.get(key);
    
    if (value !== undefined) {
      // Preserve scroll position
      const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
      const tableScrollTop = tableContainerRef.current?.scrollTop || 0;
      
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
      
      // Restore scroll position after state update
      requestAnimationFrame(() => {
        window.scrollTo(0, scrollTop);
        if (tableContainerRef.current) {
          tableContainerRef.current.scrollTop = tableScrollTop;
        }
      });
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
      
          // Create notification for Alice about payroll approval
          if (isCarlaUser(user)) {
            console.log('Carla is saving payroll, creating notification for Alice');
            notificationService.createPayrollNotification(
              'Carla Dela Peña',
              'Carla: Payroll data for workers has been updated and is ready for your review and approval. Please check the payroll section to approve the submitted data.'
            );
          }
      
    } catch (error) {
      console.error('Error saving payroll data:', error);
      setSaveMessage('Error saving data. Please try again.');
      setTimeout(() => setSaveMessage(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Alice Approval View Component
  const AliceApprovalView = memo(() => {
    const [pendingPayrollData, setPendingPayrollData] = useState(null);
    const [isApproving, setIsApproving] = useState(false);
    const [approvalMessage, setApprovalMessage] = useState('');
    const [availablePayrollDays, setAvailablePayrollDays] = useState([]);
    const [selectedPayrollDay, setSelectedPayrollDay] = useState(null);
    const [pastApprovedPayrolls, setPastApprovedPayrolls] = useState([]);
    const [hasNewPayrollFromCarla, setHasNewPayrollFromCarla] = useState(false);

    // Memoize the payroll days to prevent unnecessary re-renders
    const memoizedPayrollDays = useMemo(() => {
      if (!availablePayrollDays || availablePayrollDays.length === 0) {
        return [];
      }
      return availablePayrollDays.map(payrollDay => ({
        ...payrollDay,
        // Ensure stable date formatting
        dateString: payrollDay.dateString || '',
        // Ensure stable lastModified
        lastModified: payrollDay.lastModified || new Date().toISOString()
      }));
    }, [availablePayrollDays]);

    // Load all available payroll days for Alice to select from
    useEffect(() => {
      let isMounted = true;
      
      const loadAvailablePayrollDays = async () => {
        if (!isMounted) return;
        
        try {
          const db = getFirestore();
          
          // Get all payroll documents
          const q = query(collection(db, 'payrolls'));
          const querySnapshot = await getDocs(q);
          
          if (!querySnapshot.empty) {
            const payrollDays = [];
            const approvedPayrolls = [];
            let hasNewFromCarla = false;
            
            querySnapshot.docs.forEach(doc => {
              const data = doc.data();
              const docId = doc.id;
              
              // Extract date from document ID (format: payroll(month,day,year))
              const match = docId.match(/payroll\((\d+),(\d+),(\d+)\)/);
              if (match) {
                const month = parseInt(match[1]);
                const day = parseInt(match[2]);
                const year = parseInt(match[3]);
                const payrollDate = new Date(year, month - 1, day);
                
                // Check if data has been edited by Carla (has meaningful data)
                const hasEditedData = data.workers && data.workers.some(worker => 
                  worker.localMooringCount > 0 || 
                  worker.localUnmooringCount > 0 || 
                  worker.foreignMooringCount > 0 || 
                  worker.foreignUnmooringCount > 0 ||
                  worker.sss > 0 ||
                  worker.pagibig > 0 ||
                  worker.philhealth > 0 ||
                  worker.cashAdvance > 0
                );
                
                if (hasEditedData) {
                  // Ensure stable date formatting to prevent re-renders
                  const stableDateString = payrollDate.toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  });
                  
                  // Ensure stable lastModified to prevent re-renders
                  const stableLastModified = data.lastModified || data.date || new Date().toISOString();
                  
                  const payrollDay = {
                    id: docId,
                    date: payrollDate,
                    dateString: stableDateString,
                    status: data.status || 'pending',
                    createdBy: data.createdByName || 'Unknown',
                    lastModified: stableLastModified,
                    data: data
                  };
                  
                  // Check if this is a new payroll from Carla (pending status and created by Carla)
                  if (data.status === 'pending' && data.createdByName && 
                      (data.createdByName.toLowerCase().includes('carla') || 
                       data.createdByName.toLowerCase().includes('carla dela peña'))) {
                    hasNewFromCarla = true;
                    payrollDays.push(payrollDay);
                  } else if (data.status === 'approved') {
                    approvedPayrolls.push(payrollDay);
                  } else if (data.status === 'pending') {
                    payrollDays.push(payrollDay);
                  }
                }
              }
            });
            
            // Sort by date (newest first)
            payrollDays.sort((a, b) => new Date(b.date) - new Date(a.date));
            approvedPayrolls.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            if (isMounted) {
              setAvailablePayrollDays(payrollDays);
              setPastApprovedPayrolls(approvedPayrolls);
              setHasNewPayrollFromCarla(hasNewFromCarla);
            }
          } else {
            if (isMounted) {
              setAvailablePayrollDays([]);
              setPastApprovedPayrolls([]);
              setHasNewPayrollFromCarla(false);
            }
          }
        } catch (error) {
          console.error('Error loading available payroll days:', error);
          if (isMounted) {
            setAvailablePayrollDays([]);
            setPastApprovedPayrolls([]);
            setHasNewPayrollFromCarla(false);
          }
        }
      };

      // Load initial data
      loadAvailablePayrollDays();
      
      return () => {
        isMounted = false;
      };
    }, []);

    const handleSelectPayrollDay = (payrollDay) => {
      setSelectedPayrollDay(payrollDay);
      setPendingPayrollData(payrollDay.data);
    };

    const handleApprovePayroll = async () => {
      if (!selectedPayrollDay || !pendingPayrollData) return;
      
      setIsApproving(true);
      setApprovalMessage('');
      
      try {
        const db = getFirestore();
        
        // Update payroll status to approved using the selected payroll day ID
        const payrollRef = doc(db, 'payrolls', selectedPayrollDay.id);
        await updateDoc(payrollRef, {
          status: 'approved',
          approvedBy: user.email,
          approvedByName: user.name,
          approvedAt: new Date().toISOString()
        });
        
        // Extract date from selected payroll day ID to update workers payroll
        const match = selectedPayrollDay.id.match(/payroll\((\d+),(\d+),(\d+)\)/);
        if (match) {
          const month = parseInt(match[1]);
          const day = parseInt(match[2]);
          const year = parseInt(match[3]);
          const workersPayrollId = `workerspayroll(${month},${day},${year})`;
          
          const workersPayrollRef = doc(db, 'workerPayrolls', workersPayrollId);
          await updateDoc(workersPayrollRef, {
            status: 'approved',
            approvedBy: user.email,
            approvedByName: user.name,
            approvedAt: new Date().toISOString()
          });
        }
        
        setApprovalMessage('Payroll approved successfully! Changes are now reflected for all workers.');
        setTimeout(() => setApprovalMessage(''), 5000);
        
        // Reload the data to show updated status
        setSelectedPayrollDay(null);
        setPendingPayrollData(null);
        
        // Refresh the available payroll days
        const loadAvailablePayrollDays = async () => {
          try {
            const q = query(collection(db, 'payrolls'));
            const querySnapshot = await getDocs(q);
            
            if (!querySnapshot.empty) {
              const payrollDays = [];
              
              querySnapshot.docs.forEach(doc => {
                const data = doc.data();
                const docId = doc.id;
                
                const match = docId.match(/payroll\((\d+),(\d+),(\d+)\)/);
                if (match) {
                  const month = parseInt(match[1]);
                  const day = parseInt(match[2]);
                  const year = parseInt(match[3]);
                  const payrollDate = new Date(year, month - 1, day);
                  
                  const hasEditedData = data.workers && data.workers.some(worker => 
                    worker.localMooringCount > 0 || 
                    worker.localUnmooringCount > 0 || 
                    worker.foreignMooringCount > 0 || 
                    worker.foreignUnmooringCount > 0 ||
                    worker.sss > 0 ||
                    worker.pagibig > 0 ||
                    worker.philhealth > 0 ||
                    worker.cashAdvance > 0
                  );
                  
                  if (hasEditedData) {
                    payrollDays.push({
                      id: docId,
                      date: payrollDate,
                      dateString: payrollDate.toLocaleDateString('en-US', { 
                        year: 'numeric', 
                        month: 'long', 
                        day: 'numeric' 
                      }),
                      status: data.status || 'pending',
                      createdBy: data.createdByName || 'Unknown',
                      lastModified: data.lastModified || data.date,
                      data: data
                    });
                  }
                }
              });
              
              payrollDays.sort((a, b) => new Date(b.date) - new Date(a.date));
              setAvailablePayrollDays(payrollDays);
            }
          } catch (error) {
            console.error('Error refreshing payroll days:', error);
          }
        };
        
        loadAvailablePayrollDays();
        
      } catch (error) {
        console.error('Error approving payroll:', error);
        setApprovalMessage('Error approving payroll. Please try again.');
        setTimeout(() => setApprovalMessage(''), 5000);
      } finally {
        setIsApproving(false);
      }
    };



    // Show tab interface if no payroll day is selected
    if (!selectedPayrollDay) {
      return (
        <div className="alice-approval-view" key="alice-approval-view">
          <div className="payroll-days-container" key="payroll-days-container">
            <div className="payroll-days-header">
              <h3>
                Available Payroll Days
              </h3>
              <p>
                Click on a day to view and approve the payroll data
              </p>
            </div>
            
            <div className="payroll-days-grid" key="payroll-days-grid">
              {/* Show pending payrolls only if Carla has sent new data */}
              {hasNewPayrollFromCarla && memoizedPayrollDays.length > 0 ? (
                memoizedPayrollDays.map((payrollDay) => {
                  // Memoize the lastModified display to prevent re-renders
                  const displayLastModified = new Date(payrollDay.lastModified).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  });
                  
                  return (
                  <div
                    key={`payroll-day-${payrollDay.id}`}
                    className={`payroll-day-card ${payrollDay.status === 'approved' ? 'approved' : 'pending'}`}
                    onClick={() => handleSelectPayrollDay(payrollDay)}
                  >
                  <div className="payroll-day-header">
                    <div className="payroll-day-date">
                      {payrollDay.dateString}
                    </div>
                    <div className={`payroll-day-status ${payrollDay.status}`}>
                      {payrollDay.status === 'approved' ? 'Approved' : 'Pending'}
                    </div>
                  </div>
                  <div className="payroll-day-info">
                    <div className="payroll-day-created-by">
                      <span className="label">Created by:</span>
                      <span className="value">{payrollDay.createdBy}</span>
                    </div>
                    <div className="payroll-day-last-modified">
                      <span className="label">Last modified:</span>
                      <span className="value">
                        {displayLastModified}
                      </span>
                    </div>
                  </div>
                  <div className="payroll-day-actions">
                    {payrollDay.status === 'approved' ? (
                      <div className="approved-indicator">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M9,12L11,14L15,10M21,12A9,9 0 0,1 12,21A9,9 0 0,1 3,12A9,9 0 0,1 12,3A9,9 0 0,1 21,12Z"/>
                        </svg>
                        Already Approved
                      </div>
                    ) : (
                      <div className="pending-indicator">
                        <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12,2A10,10 0 0,1 22,12A10,10 0 0,1 12,22A10,10 0 0,1 2,12A10,10 0 0,1 12,2M12,4A8,8 0 0,0 4,12A8,8 0 0,0 12,20A8,8 0 0,0 20,12A8,8 0 0,0 12,4M11,16.5L6.5,12L7.91,10.59L11,13.67L16.59,8.09L18,9.5L11,16.5Z"/>
                        </svg>
                        Click to Review
                      </div>
                    )}
                  </div>
                </div>
                  );
                })
              ) : pastApprovedPayrolls.length > 0 ? (
                /* Show past approved payrolls when no pending payrolls exist */
                <div className="past-approved-section">
                  <div className="past-approved-header">
                    <h3>Past Approved Payrolls</h3>
                    <p>Previously approved payroll data</p>
                  </div>
                  <div className="past-approved-grid">
                    {pastApprovedPayrolls.map((payrollDay) => {
                      const displayLastModified = new Date(payrollDay.lastModified).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      });
                      
                      return (
                        <div
                          key={`past-payroll-${payrollDay.id}`}
                          className="payroll-day-card approved"
                        >
                          <div className="payroll-day-header">
                            <div className="payroll-day-date">
                              {payrollDay.dateString}
                            </div>
                            <div className="payroll-day-status approved">
                              Approved
                            </div>
                          </div>
                          <div className="payroll-day-info">
                            <div className="payroll-day-created-by">
                              <span className="label">Created by:</span>
                              <span className="value">{payrollDay.createdBy}</span>
                            </div>
                            <div className="payroll-day-last-modified">
                              <span className="label">Last modified:</span>
                              <span className="value">
                                {displayLastModified}
                              </span>
                            </div>
                          </div>
                          <div className="payroll-day-actions">
                            <div className="approved-indicator">
                              <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                                <path d="M9,12L11,14L15,10M21,12A9,9 0 0,1 12,21A9,9 0 0,1 3,12A9,9 0 0,1 12,3A9,9 0 0,1 21,12Z"/>
                              </svg>
                              Already Approved
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="no-payroll-days-message" key="no-payroll-data">
                  <div className="no-payroll-days-icon">
                    <svg width="64" height="64" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                  </div>
                  <h3>No Payroll Data Available</h3>
                  <p>No payroll data has been created yet. Carla needs to create and save payroll data first.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="alice-approval-view" key="alice-approval-view-table">
        <div className="approval-header">
          <div className="approval-title-section">
            <button
              onClick={() => {
                setSelectedPayrollDay(null);
                setPendingPayrollData(null);
              }}
              className="back-to-days-button"
            >
              <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                <path d="M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z"/>
              </svg>
              Back to Payroll Days
            </button>
            <div className="approval-title-content">
              <h2>Payroll Approval</h2>
              <p>Review and approve the payroll data for {selectedPayrollDay.dateString}</p>
            </div>
          </div>
        </div>
        
        <div className="approval-table-container">
          <table className="approval-table">
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
              {pendingPayrollData.workers.map((worker, index) => (
                <tr key={worker.id}>
                  <td className="worker-name-cell">{worker.workerName}</td>
                  <td>{worker.localMooringCount || 'Count'}</td>
                  <td>{worker.localUnmooringCount || 'Count'}</td>
                  <td>{worker.foreignMooringCount || 'Count'}</td>
                  <td>{worker.foreignUnmooringCount || 'Count'}</td>
                  <td>{worker.totalEarnings || 0}</td>
                  <td>{worker.sss || 'Enter amount'}</td>
                  <td>{worker.pagibig || 'Enter amount'}</td>
                  <td>{worker.philhealth || 'Enter amount'}</td>
                  <td>{worker.cashAdvance || 'Enter amount'}</td>
                  <td>{worker.netTotal || 0}</td>
                </tr>
              ))}
              <tr className="grand-total-row">
                <td>GRAND TOTAL</td>
                <td>{pendingPayrollData.totals.localMooringCount}</td>
                <td>{pendingPayrollData.totals.localUnmooringCount}</td>
                <td>{pendingPayrollData.totals.foreignMooringCount}</td>
                <td>{pendingPayrollData.totals.foreignUnmooringCount}</td>
                <td>{pendingPayrollData.totals.totalEarnings}</td>
                <td>{pendingPayrollData.totals.sss}</td>
                <td>{pendingPayrollData.totals.pagibig}</td>
                <td>{pendingPayrollData.totals.philhealth}</td>
                <td>{pendingPayrollData.totals.cashAdvance}</td>
                <td>{pendingPayrollData.totals.netTotal}</td>
              </tr>
            </tbody>
          </table>
        </div>
        
        <div className="approval-actions">
          <div className="approval-actions-content">
            <div className="approval-info">
              <div className="approval-info-icon">
                <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M13,9H11V7H13M13,17H11V11H13M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2Z"/>
                </svg>
              </div>
              <div className="approval-info-text">
                <strong>Review Required</strong>
                <p>Please review all payroll data before approving. Once approved, changes cannot be undone.</p>
              </div>
            </div>
            <button
              onClick={handleApprovePayroll}
              disabled={isApproving}
              className="approve-payroll-button"
            >
              <div className="button-content">
                {isApproving ? (
                  <>
                    <div className="button-spinner"></div>
                    <span>Approving...</span>
                  </>
                ) : (
                  <>
                    <svg width="20" height="20" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9,12L11,14L15,10M21,12A9,9 0 0,1 12,21A9,9 0 0,1 3,12A9,9 0 0,1 12,3A9,9 0 0,1 21,12Z"/>
                    </svg>
                    <span>Approve Payroll</span>
                  </>
                )}
              </div>
            </button>
          </div>
          {approvalMessage && (
            <div className={`approval-message ${approvalMessage.includes('Error') ? 'error' : 'success'}`}>
              <div className="message-icon">
                {approvalMessage.includes('Error') ? (
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12,2C17.53,2 22,6.47 22,12C22,17.53 17.53,22 12,22C6.47,22 2,17.53 2,12C2,6.47 6.47,2 12,2M15.59,7L12,10.59L8.41,7L7,8.41L10.59,12L7,15.59L8.41,17L12,13.41L15.59,17L17,15.59L13.41,12L17,8.41L15.59,7Z"/>
                  </svg>
                ) : (
                  <svg width="16" height="16" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M9,12L11,14L15,10M21,12A9,9 0 0,1 12,21A9,9 0 0,1 3,12A9,9 0 0,1 12,3A9,9 0 0,1 21,12Z"/>
                  </svg>
                )}
              </div>
              <span>{approvalMessage}</span>
            </div>
          )}
        </div>
      </div>
    );
  });

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
      <div className="manager-table-container" ref={tableContainerRef}>
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
  const RegularPayrollView = () => {
    // For Carla, show the workers payroll table directly
    if (isCarlaUser(user)) {
      return <ManagerView />;
    }
    
    // For Alice, show a message that she should use the approval view
    if (isAliceUser(user)) {
      return <AliceApprovalView />;
    }
    
    // For other users, show the regular view with summary
    return (
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
  };

  return (
    <div className="payroll-center-content" key="payroll-center-content">
      {isAliceUser(user) ? (
        <AliceApprovalView key="alice-approval-view" />
      ) : (
        <RegularPayrollView key="regular-payroll-view" />
      )}
    </div>
  );
};

export default Payroll;