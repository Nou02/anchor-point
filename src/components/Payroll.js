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

  // Handle input focus to maintain focus
  const handleInputFocus = (e) => {
    // Only select all text if the field is empty or contains placeholder
    if (!e.target.value || e.target.value === '') {
      e.target.select();
    }
  };

  // Handle input blur to ensure data is saved
  const handleInputBlur = (e, rowIndex, field) => {
    const value = e.target.value;
    setTableData(prevData => {
      const newTableData = [...prevData];
      newTableData[rowIndex] = {
        ...newTableData[rowIndex],
        [field]: value
      };
      return newTableData;
    });
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
        <div className="table-instructions">
          <p><strong>💡 Tip:</strong> Use Tab, Enter, or Arrow keys to navigate between cells for continuous input! 
          <br /><small>• Tab/Enter/→: Next cell • ←: Previous cell • ↑/↓: Same column, different row</small></p>
        </div>
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
                      type="number"
                      value={row.localVess}
                      onChange={(e) => handleCellEdit(index, 'localVess', e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={(e) => handleInputBlur(e, index, 'localVess')}
                      onKeyDown={(e) => handleKeyDown(e, index, 'localVess')}
                      data-row={index}
                      data-field="localVess"
                      className="table-input vess-input"
                      placeholder="Enter number"
                      step="any"
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
                      type="number"
                      value={row.foreignVess}
                      onChange={(e) => handleCellEdit(index, 'foreignVess', e.target.value)}
                      onFocus={handleInputFocus}
                      onBlur={(e) => handleInputBlur(e, index, 'foreignVess')}
                      onKeyDown={(e) => handleKeyDown(e, index, 'foreignVess')}
                      data-row={index}
                      data-field="foreignVess"
                      className="table-input vess-input"
                      placeholder="Enter number"
                      step="any"
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
                    type="number"
                    value={row.tal}
                    onChange={(e) => handleCellEdit(index, 'tal', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'tal')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'tal')}
                    data-row={index}
                    data-field="tal"
                    className="table-input"
                    step="any"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={row.sss}
                    onChange={(e) => handleCellEdit(index, 'sss', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'sss')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'sss')}
                    data-row={index}
                    data-field="sss"
                    className="table-input"
                    step="any"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={row.pagibig}
                    onChange={(e) => handleCellEdit(index, 'pagibig', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'pagibig')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'pagibig')}
                    data-row={index}
                    data-field="pagibig"
                    className="table-input"
                    step="any"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={row.philhealth}
                    onChange={(e) => handleCellEdit(index, 'philhealth', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'philhealth')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'philhealth')}
                    data-row={index}
                    data-field="philhealth"
                    className="table-input"
                    step="any"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={row.cashAdvance}
                    onChange={(e) => handleCellEdit(index, 'cashAdvance', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'cashAdvance')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'cashAdvance')}
                    data-row={index}
                    data-field="cashAdvance"
                    className="table-input"
                    step="any"
                  />
                </td>
                <td>
                  <input
                    type="number"
                    value={row.netTotal}
                    onChange={(e) => handleCellEdit(index, 'netTotal', e.target.value)}
                    onFocus={handleInputFocus}
                    onBlur={(e) => handleInputBlur(e, index, 'netTotal')}
                    onKeyDown={(e) => handleKeyDown(e, index, 'netTotal')}
                    data-row={index}
                    data-field="netTotal"
                    className="table-input"
                    step="any"
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
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
      padding: '40px 20px'
    }}>
      {/* User Profile Section */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        marginBottom: '32px',
        textAlign: 'center'
      }}>
        <div style={{
          width: '80px',
          height: '80px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, #ff6b9d 0%, #ff8fab 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          boxShadow: '0 4px 16px rgba(255, 107, 157, 0.3)',
          fontSize: '24px',
          fontWeight: '700',
          color: 'white'
        }}>
          {user.initials || 'U'}
        </div>
        <h2 style={{
          fontSize: '1.8rem',
          fontWeight: '700',
          color: '#2d3e5e',
          margin: '0 0 8px 0',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          {user.name && user.name.trim() !== "" ? user.name : "Your Name"}
        </h2>
        <p style={{
          fontSize: '1rem',
          color: '#6c757d',
          margin: '0 0 4px 0',
          fontWeight: '500'
        }}>
          {user.email}
        </p>
        <p style={{
          fontSize: '0.9rem',
          color: '#8e9aaf',
          margin: '0',
          fontStyle: 'italic'
        }}>
          Billing of this day <span style={{ fontWeight: '600', color: '#2d3e5e' }}>({user.date})</span>
        </p>
        
        {/* Worker Selection Dropdown */}
        {availableWorkers.length > 0 && (
          <div style={{
            marginTop: '24px',
            width: '100%',
            maxWidth: '300px'
          }}>
            <div style={{
              position: 'relative',
              width: '100%'
            }}>
              <button 
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: 'white',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  color: '#2d3e5e',
                  cursor: 'pointer',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
                }}
                onClick={() => setShowWorkerDropdown(!showWorkerDropdown)}
                onMouseEnter={(e) => {
                  e.target.style.borderColor = '#2F3B70';
                  e.target.style.boxShadow = '0 4px 12px rgba(47,59,112,0.15)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.borderColor = '#e9ecef';
                  e.target.style.boxShadow = '0 2px 8px rgba(0,0,0,0.08)';
                }}
              >
                {selectedWorker || 'Select Worker'}
                <span style={{ fontSize: '0.8rem', color: '#6c757d' }}>▼</span>
              </button>
              {showWorkerDropdown && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: '0',
                  right: '0',
                  background: 'white',
                  border: '2px solid #e9ecef',
                  borderRadius: '12px',
                  marginTop: '4px',
                  boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
                  zIndex: 1000,
                  maxHeight: '200px',
                  overflowY: 'auto'
                }}>
                  {availableWorkers.map((workerName, index) => (
                    <div 
                      key={index}
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        borderBottom: index < availableWorkers.length - 1 ? '1px solid #f8f9fa' : 'none',
                        transition: 'all 0.2s ease',
                        fontWeight: '500',
                        color: '#2d3e5e'
                      }}
                      onClick={() => handleWorkerSelection(workerName)}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f8f9fa';
                        e.target.style.color = '#2F3B70';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = 'white';
                        e.target.style.color = '#2d3e5e';
                      }}
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
          <div style={{ marginTop: "24px" }}>
            <button
              onClick={handleToggleManagerView}
              style={{
                background: 'linear-gradient(135deg, #2F3B70 0%, #4156a1 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                padding: '12px 24px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(47,59,112,0.3)',
                transition: 'all 0.2s ease',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 16px rgba(47,59,112,0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 12px rgba(47,59,112,0.3)';
              }}
            >
              Toggle Manager View
            </button>
          </div>
        )}
      </div>

      {/* Payroll Details Card - Removed container constraints */}
      <div style={{
        background: 'white',
        borderRadius: '20px',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12)',
        padding: '40px',
        width: '100%',
        position: 'relative',
        overflow: 'visible'
      }}>
        {/* Card Header */}
        <div style={{
          marginBottom: '32px',
          textAlign: 'center',
          borderBottom: '2px solid #f8f9fa',
          paddingBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '1.4rem',
            fontWeight: '700',
            color: '#2d3e5e',
            margin: '0',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            Payroll Summary
          </h3>
        </div>

        {/* Payroll Details Grid - Removed maxWidth constraint */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
          gap: '20px',
          width: '100%'
        }}>
          {/* First Group: LOCAL, FOREIGN, TOTAL */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              left: '-8px',
              top: '0',
              bottom: '0',
              width: '4px',
              background: 'linear-gradient(135deg, #2F3B70 0%, #4156a1 100%)',
              borderRadius: '2px'
            }} />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#2d3e5e',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                LOCAL
              </span>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#2d3e5e'
              }}>
                {individualPayrollData.local || '0'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#2d3e5e',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                FOREIGN
              </span>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#2d3e5e'
              }}>
                {individualPayrollData.foreign || '0'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#e3f2fd',
              borderRadius: '8px',
              border: '1px solid #2196f3'
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#1976d2',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                TOTAL
              </span>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#1976d2'
              }}>
                {individualPayrollData.total || '0'}
              </span>
            </div>
          </div>

          {/* Second Group: PAG-IBIG LOAN, CASH ADVANCE, BALANCE */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              left: '-8px',
              top: '0',
              bottom: '0',
              width: '4px',
              background: 'linear-gradient(135deg, #ff6b9d 0%, #ff8fab 100%)',
              borderRadius: '2px'
            }} />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#2d3e5e',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                PAG-IBIG LOAN
              </span>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#2d3e5e'
              }}>
                {individualPayrollData.pagibigLoan || '0'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#2d3e5e',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                CASH ADVANCE
              </span>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#2d3e5e'
              }}>
                {individualPayrollData.cashAdvance || '0'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#fff3cd',
              borderRadius: '8px',
              border: '1px solid #ffc107'
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#856404',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                BALANCE
              </span>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#856404'
              }}>
                {individualPayrollData.balance || '0'}
              </span>
            </div>
          </div>

          {/* Third Group: SSS/PI/PH, TOTAL DEDUCTIONS */}
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            position: 'relative'
          }}>
            <div style={{
              position: 'absolute',
              left: '-8px',
              top: '0',
              bottom: '0',
              width: '4px',
              background: 'linear-gradient(135deg, #28a745 0%, #20c997 100%)',
              borderRadius: '2px'
            }} />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#f8f9fa',
              borderRadius: '8px',
              border: '1px solid #e9ecef'
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#2d3e5e',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                SSS/PI/PH
              </span>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#2d3e5e'
              }}>
                {individualPayrollData.sssPiPh || '0'}
              </span>
            </div>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              padding: '12px 16px',
              background: '#d4edda',
              borderRadius: '8px',
              border: '1px solid #c3e6cb'
            }}>
              <span style={{
                fontSize: '0.9rem',
                fontWeight: '600',
                color: '#155724',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                TOTAL DEDUCTIONS
              </span>
              <span style={{
                fontSize: '1.1rem',
                fontWeight: '700',
                color: '#155724'
              }}>
                {individualPayrollData.totalDeductions || '0'}
              </span>
            </div>
          </div>
        </div>

        {/* Final Total */}
        <div style={{
          marginTop: '32px',
          padding: '20px',
          background: 'linear-gradient(135deg, #2F3B70 0%, #4156a1 100%)',
          borderRadius: '12px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          boxShadow: '0 4px 16px rgba(47,59,112,0.3)'
        }}>
          <span style={{
            fontSize: '1.2rem',
            fontWeight: '700',
            color: 'white',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}>
            TOTAL
          </span>
          <span style={{
            fontSize: '1.4rem',
            fontWeight: '800',
            color: 'white'
          }}>
            {individualPayrollData.finalTotal || '0'}
          </span>
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
