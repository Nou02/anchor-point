import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { getFirestore, collection, addDoc, query, where, getDocs, getDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import '../components/Payroll.css';

// Ultra Simple Input Component for better UX
const UltraSimpleInput = ({ initialValue, onValueChange, onBlur, className, placeholder }) => {
  const [value, setValue] = useState(initialValue || '');
  const [isEditing, setIsEditing] = useState(false);

  const handleBlur = () => {
    setIsEditing(false);
    if (onBlur) onBlur(value);
  };

  const handleFocus = () => {
    setIsEditing(true);
  };

  const handleChange = (e) => {
    const newValue = e.target.value;
    setValue(newValue);
    if (onValueChange) onValueChange(newValue);
  };

  return (
    <input
      type="text"
      value={value}
      onChange={handleChange}
      onBlur={handleBlur}
      onFocus={handleFocus}
      className={className}
      placeholder={placeholder}
      style={{
        border: isEditing ? '2px solid #3b82f6' : '2px solid #e5e7eb',
        borderRadius: '6px',
        padding: '8px 12px',
        fontSize: '1rem',
        transition: 'all 0.2s ease',
        width: '100%',
        boxSizing: 'border-box'
      }}
    />
  );
};

const CarlaPayroll = () => {
  const [user, setUser] = useState(null);
  const [userName, setUserName] = useState('');
  const [userFullName, setUserFullName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState('');
  const [userDate, setUserDate] = useState('');
  const [userInitials, setUserInitials] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [showPricingConfig, setShowPricingConfig] = useState(false);
  const [pricingConfig, setPricingConfig] = useState({
    localMooringPrice: 500,
    localUnmooringPrice: 500,
    foreignMooringPrice: 1000,
    foreignUnmooringPrice: 1000
  });
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [tableContainerRef] = useState(React.createRef());

  // Worker data state - comprehensive payroll data
  const [workers, setWorkers] = useState([]);
  const [workerPayrollData, setWorkerPayrollData] = useState({});
  const [workerAvailability, setWorkerAvailability] = useState({});
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  // Check if current user is Carla
  const isCarlaUser = (currentUser) => {
    if (!currentUser) return false;
    const email = currentUser.email || '';
    const name = currentUser.displayName || '';
    return email.toLowerCase().includes('carla') || 
           name.toLowerCase().includes('carla') ||
           email.toLowerCase().includes('carla.delapena') ||
           name.toLowerCase().includes('carla dela peña');
  };

  // Load user data
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
        setUserName(currentUser.displayName || '');
        setUserFullName(currentUser.displayName || '');
        setUserEmail(currentUser.email || '');
        setUserRole('Manager');
        setUserDate(new Date().toLocaleDateString());
        
        // Generate initials
        const name = currentUser.displayName || '';
        const nameParts = name.split(' ');
        const initials = nameParts.map(part => part.charAt(0)).join('').toUpperCase();
        setUserInitials(initials);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load workers data
  useEffect(() => {
    const loadWorkers = async () => {
      try {
        // Hardcoded list of workers to ensure they appear in payroll
        const hardcodedWorkers = [
          { id: '1', name: 'Bryan Matthew Cruz', email: '', role: 'Worker' },
          { id: '2', name: 'David Emmanuel Reyes', email: '', role: 'Worker' },
          { id: '3', name: 'Junnel, Cusi', email: '', role: 'Worker' },
          { id: '4', name: 'Aljon, Dipasupil', email: '', role: 'Worker' },
          { id: '5', name: 'Phil Allen, Eje', email: '', role: 'Worker' },
          { id: '6', name: 'Rhed, Escalon', email: '', role: 'Worker' },
          { id: '7', name: 'Fortune, Garcia Jr.', email: '', role: 'Worker' },
          { id: '8', name: 'Keith, Javier', email: '', role: 'Worker' },
          { id: '9', name: 'Ericson, Mendoza', email: '', role: 'Worker' },
          { id: '10', name: 'Alec, Sino-ag', email: '', role: 'Worker' },
          { id: '11', name: 'Romeo, Velasquez', email: '', role: 'Worker' },
          { id: '12', name: 'Rodel, Maranan', email: '', role: 'Worker' },
          { id: '13', name: 'Alloi, Sino-ag', email: '', role: 'Worker' }
        ];

        // Try to load additional workers from Firebase
        let firebaseWorkers = [];
        try {
          const db = getFirestore();
          const q = query(collection(db, 'users'));
          const querySnapshot = await getDocs(q);
          
          querySnapshot.forEach((doc) => {
            const data = doc.data();
            if (data.role === 'Worker' || data.type === 'Worker') {
              firebaseWorkers.push({
                id: doc.id,
                name: data.name || data.fullName || data.username || 'Unknown',
                email: data.email || '',
                role: data.role || data.type || 'Worker'
              });
            }
          });
        } catch (firebaseError) {
          console.warn('Could not load workers from Firebase:', firebaseError);
        }

        // Combine hardcoded workers with Firebase workers, avoiding duplicates
        const allWorkers = [...hardcodedWorkers];
        firebaseWorkers.forEach(firebaseWorker => {
          const exists = allWorkers.some(worker => 
            worker.name.toLowerCase() === firebaseWorker.name.toLowerCase()
          );
          if (!exists) {
            allWorkers.push(firebaseWorker);
          }
        });
        
        setWorkers(allWorkers);
        
        // Initialize payroll data for each worker
        const initialPayrollData = {};
        allWorkers.forEach(worker => {
          initialPayrollData[worker.id] = {
            localMooringCount: 0,
            localUnmooringCount: 0,
            foreignMooringCount: 0,
            foreignUnmooringCount: 0,
            totalEarnings: 0,
            sss: 0,
            pagibig: 0,
            philhealth: 0,
            cashAdvance: 0,
            netTotal: 0
          };
        });
        setWorkerPayrollData(initialPayrollData);
      } catch (error) {
        console.error('Error loading workers:', error);
      }
    };

    if (user) {
      loadWorkers();
    }
  }, [user]);

  // Load pricing configuration
  useEffect(() => {
    const loadPricingConfig = async () => {
      try {
        const db = getFirestore();
        const pricingDoc = await getDoc(doc(db, 'pricing', 'vesselPricing'));
        
        if (pricingDoc.exists()) {
          const data = pricingDoc.data();
          setPricingConfig({
            localMooringPrice: data.localMooringPrice || 500,
            localUnmooringPrice: data.localUnmooringPrice || 500,
            foreignMooringPrice: data.foreignMooringPrice || 1000,
            foreignUnmooringPrice: data.foreignUnmooringPrice || 1000
          });
        }
      } catch (error) {
        console.error('Error loading pricing config:', error);
      }
    };

    loadPricingConfig();
  }, []);

  // Handle pricing input changes
  const handlePricingInputChange = (field, value) => {
    setPricingConfig(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  // Handle pricing input blur (save to Firebase)
  const handlePricingInputBlur = async (field) => {
    try {
      const db = getFirestore();
      await setDoc(doc(db, 'pricing', 'vesselPricing'), {
        [field]: pricingConfig[field],
        lastUpdated: new Date().toISOString(),
        updatedBy: user.email
      }, { merge: true });
    } catch (error) {
      console.error('Error saving pricing config:', error);
    }
  };

  // Handle worker availability toggle
  const handleWorkerAvailabilityToggle = async (workerName, date, isAvailable) => {
    if (!isCarlaUser(user)) return;
    
    setIsSavingAvailability(true);
    try {
      const db = getFirestore();
      const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      const availabilityRef = doc(db, 'workerAvailability', `${workerName}_${dayKey}`);
      
      await setDoc(availabilityRef, {
        workerName,
        date: dayKey,
        isAvailable,
        updatedBy: user.email,
        updatedAt: new Date().toISOString()
      });
      
      setWorkerAvailability(prev => ({
        ...prev,
        [`${workerName}_${dayKey}`]: isAvailable
      }));
    } catch (error) {
      console.error('Error updating worker availability:', error);
    } finally {
      setIsSavingAvailability(false);
    }
  };

  // Get worker availability for a specific date
  const getWorkerAvailability = (workerName, date) => {
    const dayKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return workerAvailability[`${workerName}_${dayKey}`] !== false;
  };

  // Handle payroll input changes
  const handlePayrollInputChange = (workerId, field, value) => {
    const numericValue = parseFloat(value) || 0;
    
    setWorkerPayrollData(prev => {
      const updated = {
        ...prev,
        [workerId]: {
          ...prev[workerId],
          [field]: numericValue
        }
      };
      
      // Recalculate total earnings
      const workerData = updated[workerId];
      const totalEarnings = 
        (workerData.localMooringCount * pricingConfig.localMooringPrice) +
        (workerData.localUnmooringCount * pricingConfig.localUnmooringPrice) +
        (workerData.foreignMooringCount * pricingConfig.foreignMooringPrice) +
        (workerData.foreignUnmooringCount * pricingConfig.foreignUnmooringPrice);
      
      // Recalculate net total
      const netTotal = totalEarnings - workerData.sss - workerData.pagibig - workerData.philhealth - workerData.cashAdvance;
      
      return {
        ...updated,
        [workerId]: {
          ...workerData,
          totalEarnings,
          netTotal
        }
      };
    });
  };

  // Calculate totals
  const calculateTotals = useMemo(() => {
    const totals = {
      localMooringCount: 0,
      localUnmooringCount: 0,
      foreignMooringCount: 0,
      foreignUnmooringCount: 0,
      totalEarnings: 0,
      sss: 0,
      pagibig: 0,
      philhealth: 0,
      cashAdvance: 0,
      netTotal: 0
    };

    Object.values(workerPayrollData).forEach(workerData => {
      totals.localMooringCount += workerData.localMooringCount || 0;
      totals.localUnmooringCount += workerData.localUnmooringCount || 0;
      totals.foreignMooringCount += workerData.foreignMooringCount || 0;
      totals.foreignUnmooringCount += workerData.foreignUnmooringCount || 0;
      totals.totalEarnings += workerData.totalEarnings || 0;
      totals.sss += workerData.sss || 0;
      totals.pagibig += workerData.pagibig || 0;
      totals.philhealth += workerData.philhealth || 0;
      totals.cashAdvance += workerData.cashAdvance || 0;
      totals.netTotal += workerData.netTotal || 0;
    });

    return totals;
  }, [workerPayrollData]);

  // Save payroll data
  const handleSavePayroll = async () => {
    if (!isCarlaUser(user)) return;
    
    setIsSaving(true);
    setSaveMessage('');
    
    try {
      const db = getFirestore();
      const today = new Date();
      const month = today.getMonth() + 1;
      const day = today.getDate();
      const year = today.getFullYear();
      
      const payrollId = `payroll(${month},${day},${year})`;
      const workersPayrollId = `workerspayroll(${month},${day},${year})`;
      
      // Prepare workers data with actual calculated values
      const workersData = workers.map(worker => {
        const workerData = workerPayrollData[worker.id] || {};
        return {
          workerName: worker.name,
          localMooringCount: workerData.localMooringCount || 0,
          localUnmooringCount: workerData.localUnmooringCount || 0,
          foreignMooringCount: workerData.foreignMooringCount || 0,
          foreignUnmooringCount: workerData.foreignUnmooringCount || 0,
          totalEarnings: workerData.totalEarnings || 0,
          sss: workerData.sss || 0,
          pagibig: workerData.pagibig || 0,
          philhealth: workerData.philhealth || 0,
          cashAdvance: workerData.cashAdvance || 0,
          netTotal: workerData.netTotal || 0
        };
      });
      
      // Save main payroll document
      await setDoc(doc(db, 'payrolls', payrollId), {
        workers: workersData,
        totals: calculateTotals,
        status: 'pending',
        createdBy: user.email,
        createdByName: user.displayName || user.email,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      
      // Save workers payroll document
      await setDoc(doc(db, 'workerPayrolls', workersPayrollId), {
        workers: workersData,
        totals: calculateTotals,
        status: 'pending',
        createdBy: user.email,
        createdByName: user.displayName || user.email,
        createdAt: new Date().toISOString(),
        lastModified: new Date().toISOString()
      });
      
      setSaveMessage('Payroll data saved successfully!');
      setTimeout(() => setSaveMessage(''), 5000);
      
    } catch (error) {
      console.error('Error saving payroll:', error);
      setSaveMessage('Error saving payroll data. Please try again.');
      setTimeout(() => setSaveMessage(''), 5000);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearTable = () => {
    const clearedData = {};
    workers.forEach(worker => {
      clearedData[worker.id] = {
        localMooringCount: 0,
        localUnmooringCount: 0,
        foreignMooringCount: 0,
        foreignUnmooringCount: 0,
        totalEarnings: 0,
        sss: 0,
        pagibig: 0,
        philhealth: 0,
        cashAdvance: 0,
        netTotal: 0
      };
    });
    setWorkerPayrollData(clearedData);
    setSaveMessage('Table cleared successfully!');
    setTimeout(() => setSaveMessage(''), 3000);
  };

  if (isLoading) {
    return (
      <div className="payroll-center-content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading payroll data...</p>
        </div>
      </div>
    );
  }

  if (!isCarlaUser(user)) {
    return (
      <div className="payroll-center-content">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>This section is only accessible to Carla.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="payroll-center-content">
      <div className="manager-view">
        <div className="manager-header">
          <div className="manager-controls">
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
              {workers.map((worker, index) => {
                const workerData = workerPayrollData[worker.id] || {};
                return (
                  <tr key={worker.id}>
                    <td className="worker-name-cell">{worker.name}</td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        className="count-input"
                        placeholder="0"
                        value={workerData.localMooringCount || ''}
                        onChange={(e) => handlePayrollInputChange(worker.id, 'localMooringCount', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        className="count-input"
                        placeholder="0"
                        value={workerData.localUnmooringCount || ''}
                        onChange={(e) => handlePayrollInputChange(worker.id, 'localUnmooringCount', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        className="count-input"
                        placeholder="0"
                        value={workerData.foreignMooringCount || ''}
                        onChange={(e) => handlePayrollInputChange(worker.id, 'foreignMooringCount', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        className="count-input"
                        placeholder="0"
                        value={workerData.foreignUnmooringCount || ''}
                        onChange={(e) => handlePayrollInputChange(worker.id, 'foreignUnmooringCount', e.target.value)}
                      />
                    </td>
                    <td className="total-cell">₱{(workerData.totalEarnings || 0).toLocaleString()}</td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        className="amount-input"
                        placeholder="0"
                        value={workerData.sss || ''}
                        onChange={(e) => handlePayrollInputChange(worker.id, 'sss', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        className="amount-input"
                        placeholder="0"
                        value={workerData.pagibig || ''}
                        onChange={(e) => handlePayrollInputChange(worker.id, 'pagibig', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        className="amount-input"
                        placeholder="0"
                        value={workerData.philhealth || ''}
                        onChange={(e) => handlePayrollInputChange(worker.id, 'philhealth', e.target.value)}
                      />
                    </td>
                    <td>
                      <input 
                        type="number" 
                        min="0" 
                        className="amount-input"
                        placeholder="0"
                        value={workerData.cashAdvance || ''}
                        onChange={(e) => handlePayrollInputChange(worker.id, 'cashAdvance', e.target.value)}
                      />
                    </td>
                    <td className="net-total-cell">₱{(workerData.netTotal || 0).toLocaleString()}</td>
                  </tr>
                );
              })}
              <tr className="grand-total-row">
                <td>GRAND TOTAL</td>
                <td>{calculateTotals.localMooringCount}</td>
                <td>{calculateTotals.localUnmooringCount}</td>
                <td>{calculateTotals.foreignMooringCount}</td>
                <td>{calculateTotals.foreignUnmooringCount}</td>
                <td>₱{calculateTotals.totalEarnings.toLocaleString()}</td>
                <td>₱{calculateTotals.sss.toLocaleString()}</td>
                <td>₱{calculateTotals.pagibig.toLocaleString()}</td>
                <td>₱{calculateTotals.philhealth.toLocaleString()}</td>
                <td>₱{calculateTotals.cashAdvance.toLocaleString()}</td>
                <td>₱{calculateTotals.netTotal.toLocaleString()}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="manager-actions">
        <button
          onClick={handleSavePayroll}
          disabled={isSaving}
          className="save-payroll-button"
        >
          {isSaving ? 'Saving...' : 'Save Payroll Data'}
        </button>
        <button
          onClick={handleClearTable}
          className="clear-table-button"
        >
          Clear Table
        </button>
        {saveMessage && (
          <div className={`save-message ${saveMessage.includes('Error') ? 'error' : 'success'}`}>
            {saveMessage}
          </div>
        )}
      </div>
    </div>
  );
};

export default CarlaPayroll;