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

  // The following states were missing in your code but are referenced later:
  const [availableWorkers, setAvailableWorkers] = useState([]);
  const [showWorkerDropdown, setShowWorkerDropdown] = useState(false);
  const [selectedWorker, setSelectedWorker] = useState('');
  const [individualPayrollData, setIndividualPayrollData] = useState({});

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
    if (user.name === "Alice Margaretha Santos") {
      localStorage.setItem('aliceManagerView', newValue.toString());
    }
  };

  const handleBackToRegularView = () => {
    setIsManagerView(false);
    // Clear the stored preference when going back to regular view
    localStorage.removeItem('aliceManagerView');
  };

  // Modify the handleCellEdit function
  const handleCellEdit = (rowIndex, field, value) => {
    setTableData(prevData => {
      const newTableData = [...prevData];
      newTableData[rowIndex] = {
        ...newTableData[rowIndex],
        [field]: value
      };
      return newTableData;
    });
  };

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
    // Determine available column indices dynamically for the current row
    const rowInputs = Array.from(document.querySelectorAll(`input[data-row="${rowIndex}"][data-col]`));
    const colIndices = rowInputs.map(input => parseInt(input.getAttribute('data-col'), 10)).filter(n => !Number.isNaN(n));
    const minCol = colIndices.length ? Math.min(...colIndices) : 1;
    const maxCol = colIndices.length ? Math.max(...colIndices) : colIndex;

    const focusCell = (r, c) => {
      const input = document.querySelector(`input[data-row="${r}"][data-col="${c}"]`);
      if (input) {
        input.focus();
        if (!input.value) input.select();
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
  };

  // Handle input focus (no auto-select, allow continuous typing)
  const handleInputFocus = (e) => {
    // No auto-select to allow continuous typing
  };

  // Handle input blur to ensure data is saved
  const handleInputBlur = (e, rowIndex, field) => {
    const value = e.target.value;
    handleCellEdit(rowIndex, field, value);
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
              <th>Local Vessel</th>
              <th>Foreign Vessel</th>
              <th>TOTAL</th>
              <th>SSS</th>
              <th>PAG-IBIG</th>
              <th>PhilHealth</th>
              <th>Cash Advance</th>
              <th>NET TOTAL</th>
            </tr>
          </thead>
          <tbody>
            {tableData.map((row, rowIndex) => (
              <tr key={row.id}>
                <td className="worker-name-cell">{row.workerName}</td>
                {/* Local Vessel */}
                <td style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*"
                      value={row.localVess}
                      onChange={e => handleCellEdit(rowIndex, 'localVess', e.target.value)}
                      onFocus={handleInputFocus}
                      onKeyDown={e => handleTableKeyDown(e, rowIndex, 1)}
                      data-row={rowIndex}
                      data-col={1}
                      className="table-input vess-input"
                      placeholder="Enter num"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="dropdown-arrow-btn"
                      style={{
                        marginLeft: 2,
                        minWidth: 0,
                        padding: "0 10px",
                        background: "transparent",
                        border: "none",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 22,
                        lineHeight: 1,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onClick={() => toggleDropdown(rowIndex, 'localVessType')}
                      aria-label="Select Local Vessel Type"
                    >
                      ▼
                    </button>
                  </div>
                  {activeDropdownRow === rowIndex && activeDropdownColumn === 'localVessType' && (
                    <div
                      className="dropdown-menu improved-dropdown"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "110%",
                        zIndex: 10,
                        minWidth: 120,
                        background: "#fff",
                        border: "1px solid #bfc8e2",
                        borderRadius: 8,
                        boxShadow: "0 4px 16px 0 rgba(0,0,0,0.10)",
                        padding: "4px 0"
                      }}
                    >
                      <div
                        className="dropdown-item improved-dropdown-item"
                        style={{
                          color: "#232f4b",
                          padding: "10px 18px",
                          cursor: "pointer",
                          fontWeight: row.localVessType === "Mooring" ? 700 : 400,
                          background: row.localVessType === "Mooring" ? "#e6f0ff" : "transparent",
                          borderRadius: 6,
                          transition: "background 0.15s"
                        }}
                        onClick={() => handleVessTypeChange(rowIndex, 'localVessType', 'Mooring')}
                      >
                        Mooring
                      </div>
                      <div
                        className="dropdown-item improved-dropdown-item"
                        style={{
                          color: "#232f4b",
                          padding: "10px 18px",
                          cursor: "pointer",
                          fontWeight: row.localVessType === "Unmooring" ? 700 : 400,
                          background: row.localVessType === "Unmooring" ? "#e6f0ff" : "transparent",
                          borderRadius: 6,
                          transition: "background 0.15s"
                        }}
                        onClick={() => handleVessTypeChange(rowIndex, 'localVessType', 'Unmooring')}
                      >
                        Unmooring
                      </div>
                    </div>
                  )}
                  {row.localVess && row.localVessType && (
                    <div style={{ fontStyle: 'italic', color: '#b0b8d1', fontSize: 13, marginTop: 2 }}>
                      {row.localVess}, {row.localVessType}
                    </div>
                  )}
                </td>
                {/* Foreign Vessel */}
                <td style={{ position: "relative" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    <input
                      type="text"
                      inputMode="decimal"
                      pattern="[0-9]*"
                      value={row.foreignVess}
                      onChange={e => handleCellEdit(rowIndex, 'foreignVess', e.target.value)}
                      onFocus={handleInputFocus}
                      onKeyDown={e => handleTableKeyDown(e, rowIndex, 2)}
                      data-row={rowIndex}
                      data-col={2}
                      className="table-input vess-input"
                      placeholder="Enter num"
                      style={{ flex: 1 }}
                    />
                    <button
                      type="button"
                      className="dropdown-arrow-btn"
                      style={{
                        marginLeft: 2,
                        minWidth: 0,
                        padding: "0 10px",
                        background: "transparent",
                        border: "none",
                        color: "#fff",
                        fontWeight: 700,
                        fontSize: 22,
                        lineHeight: 1,
                        cursor: "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                      }}
                      onClick={() => toggleDropdown(rowIndex, 'foreignVessType')}
                      aria-label="Select Foreign Vessel Type"
                    >
                      ▼
                    </button>
                  </div>
                  {activeDropdownRow === rowIndex && activeDropdownColumn === 'foreignVessType' && (
                    <div
                      className="dropdown-menu improved-dropdown"
                      style={{
                        position: "absolute",
                        left: 0,
                        top: "110%",
                        zIndex: 10,
                        minWidth: 120,
                        background: "#fff",
                        border: "1px solid #bfc8e2",
                        borderRadius: 8,
                        boxShadow: "0 4px 16px 0 rgba(0,0,0,0.10)",
                        padding: "4px 0"
                      }}
                    >
                      <div
                        className="dropdown-item improved-dropdown-item"
                        style={{
                          color: "#232f4b",
                          padding: "10px 18px",
                          cursor: "pointer",
                          fontWeight: row.foreignVessType === "Mooring" ? 700 : 400,
                          background: row.foreignVessType === "Mooring" ? "#e6f0ff" : "transparent",
                          borderRadius: 6,
                          transition: "background 0.15s"
                        }}
                        onClick={() => handleVessTypeChange(rowIndex, 'foreignVessType', 'Mooring')}
                      >
                        Mooring
                      </div>
                      <div
                        className="dropdown-item improved-dropdown-item"
                        style={{
                          color: "#232f4b",
                          padding: "10px 18px",
                          cursor: "pointer",
                          fontWeight: row.foreignVessType === "Unmooring" ? 700 : 400,
                          background: row.foreignVessType === "Unmooring" ? "#e6f0ff" : "transparent",
                          borderRadius: 6,
                          transition: "background 0.15s"
                        }}
                        onClick={() => handleVessTypeChange(rowIndex, 'foreignVessType', 'Unmooring')}
                      >
                        Unmooring
                      </div>
                    </div>
                  )}
                  {row.foreignVess && row.foreignVessType && (
                    <div style={{ fontStyle: 'italic', color: '#b0b8d1', fontSize: 13, marginTop: 2 }}>
                      {row.foreignVess}, {row.foreignVessType}
                    </div>
                  )}
                </td>
                {/* TOTAL */}
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={
                      (parseFloat(row.localVess) || 0) + (parseFloat(row.foreignVess) || 0)
                    }
                    readOnly
                    className="table-input"
                    tabIndex={-1}
                  />
                </td>
                {/* SSS */}
                <td>
                  <input
                    type="number"
                    value={row.sss}
                    onChange={e => handleCellEdit(rowIndex, 'sss', e.target.value)}
                    onFocus={handleInputFocus}
                    onKeyDown={e => handleTableKeyDown(e, rowIndex, 4)}
                    data-row={rowIndex}
                    data-col={4}
                    className="table-input"
                    placeholder="Enter num"
                  />
                </td>
                {/* PAG-IBIG */}
                <td>
                  <input
                    type="number"
                    value={row.pagibig}
                    onChange={e => handleCellEdit(rowIndex, 'pagibig', e.target.value)}
                    onFocus={handleInputFocus}
                    onKeyDown={e => handleTableKeyDown(e, rowIndex, 5)}
                    data-row={rowIndex}
                    data-col={5}
                    className="table-input"
                    placeholder="Enter num"
                  />
                </td>
                {/* PhilHealth */}
                <td>
                  <input
                    type="number"
                    value={row.philhealth}
                    onChange={e => handleCellEdit(rowIndex, 'philhealth', e.target.value)}
                    onFocus={handleInputFocus}
                    onKeyDown={e => handleTableKeyDown(e, rowIndex, 6)}
                    data-row={rowIndex}
                    data-col={6}
                    className="table-input"
                    placeholder="Enter num"
                  />
                </td>
<<<<<<< HEAD
                {/* Cash Advance */}
                <td>
                  <input
                    type="number"
                    value={row.cashAdvance}
                    onChange={e => handleCellEdit(rowIndex, 'cashAdvance', e.target.value)}
                    onFocus={handleInputFocus}
=======
                {/* PAG-IBIG */}
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={row.pagibig}
                    onChange={e => handleCellEdit(rowIndex, 'pagibig', e.target.value)}
>>>>>>> 470a10269181dcd1ccfb3c50e7cbd3d036921eac
                    onKeyDown={e => handleTableKeyDown(e, rowIndex, 7)}
                    data-row={rowIndex}
                    data-col={7}
                    className="table-input"
                    placeholder="Enter num"
                  />
                </td>
<<<<<<< HEAD
=======
                {/* PhilHealth */}
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={row.philhealth}
                    onChange={e => handleCellEdit(rowIndex, 'philhealth', e.target.value)}
                    onKeyDown={e => handleTableKeyDown(e, rowIndex, 8)}
                    data-row={rowIndex}
                    data-col={8}
                    className="table-input"
                    placeholder="Enter num"
                  />
                </td>
                {/* Cash Advance */}
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={row.cashAdvance}
                    onChange={e => handleCellEdit(rowIndex, 'cashAdvance', e.target.value)}
                    onKeyDown={e => handleTableKeyDown(e, rowIndex, 9)}
                    data-row={rowIndex}
                    data-col={9}
                    className="table-input"
                    placeholder="Enter num"
                  />
                </td>
>>>>>>> 470a10269181dcd1ccfb3c50e7cbd3d036921eac
                {/* NET TOTAL */}
                <td>
                  <input
                    type="text"
                    inputMode="decimal"
                    pattern="[0-9]*"
                    value={
                    (
                      (parseFloat(row.localVess) || 0) +
                      (parseFloat(row.foreignVess) || 0)
                    ) - (
                      (parseFloat(row.sss) || 0) +
                      (parseFloat(row.pagibig) || 0) +
                      (parseFloat(row.philhealth) || 0) +
                      (parseFloat(row.tal) || 0) +
                      (parseFloat(row.cashAdvance) || 0)
                    )
                  }
                  readOnly
                  className="table-input"
                  tabIndex={-1}
                />
                </td>
              </tr>
            ))}
            <tr className="grand-total-row">
              <td colSpan="1">GRAND TOTAL</td>
              <td></td>
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
<<<<<<< HEAD
}
=======
};

>>>>>>> 470a10269181dcd1ccfb3c50e7cbd3d036921eac
export default Payroll;