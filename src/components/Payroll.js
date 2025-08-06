import React, { useEffect, useState } from 'react';
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
  const [tableData, setTableData] = useState([
    { id: 1, workerName: 'Bryan Matthew Cruz', localVess: '1', localVessType: 'Mooring', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 2, workerName: 'David Emmanuel Reyes', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 3, workerName: 'Junnel, Cusi', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 4, workerName: 'Aljon, Dipasupil', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 5, workerName: 'Phil Allen, Eje', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 6, workerName: 'Rhed, Escalon', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 7, workerName: 'Fortune, Garcia Jr.', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 8, workerName: 'Keith, Javier', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 9, workerName: 'Ericson, Mendoza', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 10, workerName: 'Alec, Sino-ag', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 11, workerName: 'Romeo, Velasquez', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 12, workerName: 'Rodel, Maranan', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' },
    { id: 13, workerName: 'Alloi, Sino-ag', localVess: '', localVessType: '', foreignVess: '', foreignVessType: '', tal: '', sss: '', pagibig: '', philhealth: '', cashAdvance: '', netTotal: '' }
  ]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [individualPayrollData, setIndividualPayrollData] = useState({
    local: '',
    foreign: '',
    total: '',
    pagibigLoan: '',
    cashAdvance: '',
    balance: '',
    sssPiPh: '',
    totalDeductions: '',
    finalTotal: ''
  });
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);

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

  // Check for Alice's manager view preference after user is loaded
  useEffect(() => {
    if (user.name === "Alice Margaretha Santos") {
      const savedPreference = localStorage.getItem('aliceManagerView');
      if (savedPreference === 'true') {
        setIsManagerView(true);
      }
    } else {
      // Reset manager view for non-Alice users
      setIsManagerView(false);
    }
  }, [user.name]);

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
    if (user.name === "Alice Margaretha Santos") {
      localStorage.setItem('aliceManagerView', newValue.toString());
    }
  };

  const handleBackToRegularView = () => {
    setIsManagerView(false);
    // Clear the stored preference when going back to regular view
    localStorage.removeItem('aliceManagerView');
  };

  function computeRow(row) {
    const local = parseFloat(row.localVess) || 0;
    const foreign = parseFloat(row.foreignVess) || 0;
    const tal = parseFloat(row.tal) || 0;
    const sss = parseFloat(row.sss) || 0;
    const pagibig = parseFloat(row.pagibig) || 0;
    const philhealth = parseFloat(row.philhealth) || 0;
    const cashAdvance = parseFloat(row.cashAdvance) || 0;

    const total = local + foreign;
    const sssPiPh = sss + philhealth;
    const totalDeductions = sss + pagibig + philhealth + tal;
    const balance = total - cashAdvance;
    const finalTotal = total - (totalDeductions + cashAdvance);

    return {
      ...row,
      total: total.toFixed(2),
      sssPiPh: sssPiPh.toFixed(2),
      totalDeductions: totalDeductions.toFixed(2),
      balance: balance.toFixed(2),
      netTotal: finalTotal.toFixed(2)
    };
  }

  // Improved handleCellEdit function for continuous typing
  const handleCellEdit = (rowIndex, field, value) => {
    setTableData(prevData => {
      const newTableData = [...prevData];
      newTableData[rowIndex] = computeRow({
        ...newTableData[rowIndex],
        [field]: value
      });
      return newTableData;
    });
  };

  // Improved keyboard navigation that doesn't interfere with normal typing
  const handleKeyDown = (e, rowIndex, field) => {
    const currentRow = rowIndex;
    const fields = ['localVess', 'foreignVess', 'tal', 'sss', 'pagibig', 'philhealth', 'cashAdvance'];
    const currentFieldIndex = fields.indexOf(field);
    
    // Only handle navigation on Enter or Tab, not on regular typing
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault();
      
      // Move to next field in same row
      if (currentFieldIndex < fields.length - 1) {
        const nextField = fields[currentFieldIndex + 1];
        const nextInput = document.querySelector(`input[data-row="${currentRow}"][data-field="${nextField}"]`);
        if (nextInput && !nextInput.readOnly) {
          nextInput.focus();
          // Position cursor at the end for continuous typing
          setTimeout(() => {
            nextInput.setSelectionRange(nextInput.value.length, nextInput.value.length);
          }, 0);
        }
      } else {
        // Move to first field of next row
        if (currentRow < tableData.length - 1) {
          const nextRowInput = document.querySelector(`input[data-row="${currentRow + 1}"][data-field="localVess"]`);
          if (nextRowInput) {
            nextRowInput.focus();
            setTimeout(() => {
              nextRowInput.setSelectionRange(nextRowInput.value.length, nextRowInput.value.length);
            }, 0);
          }
        }
      }
    }
    // Allow all other keys (numbers, backspace, etc.) to work normally without interference
  };

  // Simplified input focus handler - no automatic text selection
  const handleInputFocus = (e) => {
    // Don't automatically select text - let user continue typing naturally
    // Just ensure the input is focused
    e.target.focus();
  };

  // Simplified input blur handler
  const handleInputBlur = (e, rowIndex, field) => {
    // Data is already saved through onChange, no need to do it again here
  };

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
        workers: tableData.map(row => ({
          id: row.id,
          workerName: row.workerName,
          localVess: row.localVess || '',
          localVessType: row.localVessType || '',
          foreignVess: row.foreignVess || '',
          foreignVessType: row.foreignVessType || '',
          tal: row.tal || '',
          sss: row.sss || '',
          pagibig: row.pagibig || '',
          philhealth: row.philhealth || '',
          cashAdvance: row.cashAdvance || '',
          netTotal: row.netTotal || ''
        })),
        totals: {
          localVess: tableData.reduce((sum, row) => sum + (parseFloat(row.localVess) || 0), 0),
          foreignVess: tableData.reduce((sum, row) => sum + (parseFloat(row.foreignVess) || 0), 0),
          tal: tableData.reduce((sum, row) => sum + (parseFloat(row.tal) || 0), 0),
          sss: tableData.reduce((sum, row) => sum + (parseFloat(row.sss) || 0), 0),
          pagibig: tableData.reduce((sum, row) => sum + (parseFloat(row.pagibig) || 0), 0),
          philhealth: tableData.reduce((sum, row) => sum + (parseFloat(row.philhealth) || 0), 0),
          cashAdvance: tableData.reduce((sum, row) => sum + (parseFloat(row.cashAdvance) || 0), 0),
          netTotal: tableData.reduce((sum, row) => sum + (parseFloat(row.netTotal) || 0), 0)
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
            local: worker.localVess || '',
            foreign: worker.foreignVess || '',
            total: (parseFloat(worker.localVess) || 0) + (parseFloat(worker.foreignVess) || 0),
            pagibigLoan: worker.pagibig || '',
            cashAdvance: worker.cashAdvance || '',
            balance: ((parseFloat(worker.localVess) || 0) + (parseFloat(worker.foreignVess) || 0)) - (parseFloat(worker.cashAdvance) || 0),
            sssPiPh: (parseFloat(worker.sss) || 0) + (parseFloat(worker.philhealth) || 0),
            totalDeductions: (parseFloat(worker.sss) || 0) + (parseFloat(worker.pagibig) || 0) + (parseFloat(worker.philhealth) || 0) + (parseFloat(worker.tal) || 0),
            finalTotal: ((parseFloat(worker.localVess) || 0) + (parseFloat(worker.foreignVess) || 0)) - ((parseFloat(worker.sss) || 0) + (parseFloat(worker.pagibig) || 0) + (parseFloat(worker.philhealth) || 0) + (parseFloat(worker.tal) || 0) + (parseFloat(worker.cashAdvance) || 0))
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
        </div>
        <h2>Worker Payroll Management</h2>
      </div>
      
      <div className="manager-table-container">
        <table className="manager-table">
          <thead>
            <tr>
              <th>Workers</th>
              <th>Local Vess</th>
              <th>Foreign Vess</th>
              <th>TAL</th>
              <th>SSS</th>
              <th>PAG-IBIG</th>
              <th>PhilHealth</th>
              <th>Cash Advance</th>
              <th>NET TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, index) => (
              <tr key={row.id}>
                <td className="worker-name-cell">{row.workerName}</td>
                <td className="vess-cell">
                  <div className="vess-input-container">
                    <input
                      type="text"
                      value={row.localVess}
                      onChange={(e) => {
                        // Allow only numbers and decimal points
                        const value = e.target.value.replace(/[^\d.-]/g, '');
                        handleCellEdit(index, 'localVess', value);
                      }}
                      onFocus={handleInputFocus}
                      onBlur={(e) => handleInputBlur(e, index, 'localVess')}
                      onKeyDown={(e) => handleKeyDown(e, index, 'localVess')}
                      data-row={index}
                      data-field="localVess"
                      className="table-input vess-input"
                      placeholder="Enter number"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                    <button 
                      className="cell-dropdown-button"
                      onClick={() => toggleDropdown(index, 'localVessType')}
                    >
                      {row.localVessType || '▼'}
                    </button>
                    {activeDropdownRow === index && activeDropdownColumn === 'localVessType' && (
                      <div className="cell-dropdown-menu">
                        <div 
                          className="dropdown-item"
                          onClick={() => handleVessTypeChange(index, 'localVessType', 'Mooring')}
                        >
                          Mooring
                        </div>
                        <div 
                          className="dropdown-item"
                          onClick={() => handleVessTypeChange(index, 'localVessType', 'Unmooring')}
                        >
                          Unmooring
                        </div>
                      </div>
                    )}
                  </div>
                  {row.localVess && row.localVessType && (
                    <div className="vess-display">
                      {row.localVess}, {row.localVessType}
                    </div>
                  )}
                </td>
                <td className="vess-cell">
                  <div className="vess-input-container">
                    <input
                      type="text"
                      value={row.foreignVess}
                      onChange={(e) => {
                        // Allow only numbers and decimal points
                        const value = e.target.value.replace(/[^\d.-]/g, '');
                        handleCellEdit(index, 'foreignVess', value);
                      }}
                      onFocus={handleInputFocus}
                      onBlur={(e) => handleInputBlur(e, index, 'foreignVess')}
                      onKeyDown={(e) => handleKeyDown(e, index, 'foreignVess')}
                      data-row={index}
                      data-field="foreignVess"
                      className="table-input vess-input"
                      placeholder="Enter number"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck="false"
                    />
                    <button 
                      className="cell-dropdown-button"
                      onClick={() => toggleDropdown(index, 'foreignVessType')}
                    >
                      {row.foreignVessType || '▼'}
                    </button>
                    {activeDropdownRow === index && activeDropdownColumn === 'foreignVessType' && (
                      <div className="cell-dropdown-menu">
                        <div 
                          className="dropdown-item"
                          onClick={() => handleVessTypeChange(index, 'foreignVessType', 'Mooring')}
                        >
                          Mooring
                        </div>
                        <div 
                          className="dropdown-item"
                          onClick={() => handleVessTypeChange(index, 'foreignVessType', 'Unmooring')}
                        >
                          Unmooring
                        </div>
                      </div>
                    )}
                  </div>
                  {row.foreignVess && row.foreignVessType && (
                    <div className="vess-display">
                      {row.foreignVess}, {row.foreignVessType}
                    </div>
                  )}
                </td>
                <td>
                  <input
                    type="text"
                    value={row.tal}
                    onChange={(e) => {
                      // Allow only numbers and decimal points
                      const value = e.target.value.replace(/[^\d.-]/g, '');
                      handleCellEdit(index, 'tal', value);
                    }}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'tal')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'tal')}
                    data-row={index}
                    data-field="tal"
                    className="table-input"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.sss}
                    onChange={(e) => {
                      // Allow only numbers and decimal points
                      const value = e.target.value.replace(/[^\d.-]/g, '');
                      handleCellEdit(index, 'sss', value);
                    }}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'sss')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'sss')}
                    data-row={index}
                    data-field="sss"
                    className="table-input"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.pagibig}
                    onChange={(e) => {
                      // Allow only numbers and decimal points
                      const value = e.target.value.replace(/[^\d.-]/g, '');
                      handleCellEdit(index, 'pagibig', value);
                    }}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'pagibig')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'pagibig')}
                    data-row={index}
                    data-field="pagibig"
                    className="table-input"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.philhealth}
                    onChange={(e) => {
                      // Allow only numbers and decimal points
                      const value = e.target.value.replace(/[^\d.-]/g, '');
                      handleCellEdit(index, 'philhealth', value);
                    }}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'philhealth')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'philhealth')}
                    data-row={index}
                    data-field="philhealth"
                    className="table-input"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.cashAdvance}
                    onChange={(e) => {
                      // Allow only numbers and decimal points
                      const value = e.target.value.replace(/[^\d.-]/g, '');
                      handleCellEdit(index, 'cashAdvance', value);
                    }}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'cashAdvance')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'cashAdvance')}
                    data-row={index}
                    data-field="cashAdvance"
                    className="table-input"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck="false"
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.total}
                    readOnly
                    className="table-input table-input-readonly"
                    tabIndex={-1}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.sssPiPh}
                    readOnly
                    className="table-input table-input-readonly"
                    tabIndex={-1}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.totalDeductions}
                    readOnly
                    className="table-input table-input-readonly"
                    tabIndex={-1}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.balance}
                    readOnly
                    className="table-input table-input-readonly"
                    tabIndex={-1}
                  />
                </td>
                <td>
                  <input
                    type="text"
                    value={row.netTotal}
                    readOnly
                    className="table-input table-input-readonly"
                    tabIndex={-1}
                  />
                </td>
              </tr>
            ))}
            <tr className="grand-total-row">
              <td colSpan="2">GRAND TOTAL</td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
              <td></td>
            </tr>
          </tbody>
        </table>
        
        <div className="save-section">
          <button
            onClick={handleSaveToFirestore}
            disabled={isSaving}
            className="save-button"
          >
            {isSaving ? 'Saving...' : 'Save Payroll Data'}
          </button>
          {saveMessage && (
            <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
              {saveMessage}
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
        {user.name === "Alice Margaretha Santos" && (
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
              <span className="payroll-details-value">{individualPayrollData.local || '0'}</span>
            </div>
            <div className="payroll-details-row">
              <span className="payroll-details-label">FOREIGN</span>
              <span className="payroll-details-value">{individualPayrollData.foreign || '0'}</span>
            </div>
            <div className="payroll-details-row payroll-details-row-total">
              <span className="payroll-details-label payroll-details-label-total">TOTAL</span>
              <span className="payroll-details-value payroll-details-value-total">{individualPayrollData.total || '0'}</span>
            </div>
          </div>
          {/* Second Group */}
          <div className="payroll-details-group payroll-details-group-loan">
            <div className="payroll-details-group-bar payroll-details-group-bar-loan" />
            <div className="payroll-details-row">
              <span className="payroll-details-label">PAG-IBIG LOAN</span>
              <span className="payroll-details-value">{individualPayrollData.pagibigLoan || '0'}</span>
            </div>
            <div className="payroll-details-row">
              <span className="payroll-details-label">CASH ADVANCE</span>
              <span className="payroll-details-value">{individualPayrollData.cashAdvance || '0'}</span>
            </div>
            <div className="payroll-details-row payroll-details-row-balance">
              <span className="payroll-details-label payroll-details-label-balance">BALANCE</span>
              <span className="payroll-details-value payroll-details-value-balance">{individualPayrollData.balance || '0'}</span>
            </div>
          </div>
          {/* Third Group */}
          <div className="payroll-details-group payroll-details-group-deductions">
            <div className="payroll-details-group-bar payroll-details-group-bar-deductions" />
            <div className="payroll-details-row">
              <span className="payroll-details-label">SSS/PI/PH</span>
              <span className="payroll-details-value">{individualPayrollData.sssPiPh || '0'}</span>
            </div>
            <div className="payroll-details-row payroll-details-row-deductions">
              <span className="payroll-details-label payroll-details-label-deductions">TOTAL DEDUCTIONS</span>
              <span className="payroll-details-value payroll-details-value-deductions">{individualPayrollData.totalDeductions || '0'}</span>
            </div>
          </div>
        </div>
        <div className="payroll-details-final-total">
          <span className="payroll-details-final-label">TOTAL</span>
          <span className="payroll-details-final-value">{individualPayrollData.finalTotal || '0'}</span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="payroll-center-content">
      {isManagerView && user.name === "Alice Margaretha Santos" ? (
        <ManagerView />
      ) : (
        <RegularPayrollView />
      )}
    </div>
  );
};

export default Payroll;
