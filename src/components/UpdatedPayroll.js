import React, { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { getFirestore, collection, addDoc, query, where, getDocs, getDoc, updateDoc, doc, setDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import '../components/UpdatedPayroll.css';

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

const UpdatedPayroll = () => {
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

  // Alice-specific states
  const [payrollData, setPayrollData] = useState([]);
  const [approvedPayrolls, setApprovedPayrolls] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'

  // Worker payroll states
  const [userInfo, setUserInfo] = useState(null);
  const [isManagerView, setIsManagerView] = useState(false);

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

  // Check if current user is Alice
  const isAliceUser = (currentUser) => {
    if (!currentUser) return false;
    const email = currentUser.email || '';
    const name = currentUser.displayName || '';
    return email.toLowerCase().includes('alice') || 
           name.toLowerCase().includes('alice') ||
           name.toLowerCase().includes('alice margaretha santos');
  };

  // Load user data
  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
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

        // Load user info from Firestore
        try {
          const db = getFirestore();
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserInfo(userDoc.data());
          }
        } catch (error) {
          console.error('Error loading user info:', error);
        }
      } else {
        setUser(null);
        setUserInfo(null);
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

  // Load payroll data from Carla (for Alice)
  useEffect(() => {
    const loadPayrollData = async () => {
      if (!user) return;
      
      try {
        const db = getFirestore();
        const q = query(collection(db, 'payrolls'));
        const querySnapshot = await getDocs(q);
        
        const pendingPayrolls = [];
        const approvedPayrolls = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.createdByName && 
              (data.createdByName.toLowerCase().includes('carla') || 
               data.createdByName.toLowerCase().includes('carla dela peña'))) {
            
            // Extract date from document ID
            const match = doc.id.match(/payroll\((\d+),(\d+),(\d+)\)/);
            if (match) {
              const month = parseInt(match[1]);
              const day = parseInt(match[2]);
              const year = parseInt(match[3]);
              const payrollDate = new Date(year, month - 1, day);
              
              const payrollItem = {
                id: doc.id,
                date: payrollDate,
                dateString: payrollDate.toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }),
                data: data,
                createdBy: data.createdByName,
                lastModified: data.lastModified || data.createdAt
              };
              
              if (data.status === 'pending') {
                pendingPayrolls.push(payrollItem);
              } else if (data.status === 'approved') {
                approvedPayrolls.push(payrollItem);
              }
            }
          }
        });
        
        // Sort by date (newest first)
        pendingPayrolls.sort((a, b) => new Date(b.date) - new Date(a.date));
        approvedPayrolls.sort((a, b) => new Date(b.date) - new Date(a.date));
        
        setPayrollData(pendingPayrolls);
        setApprovedPayrolls(approvedPayrolls);
      } catch (error) {
        console.error('Error loading payroll data:', error);
      }
    };

    if (user && isAliceUser(user)) {
      loadPayrollData();
    }
  }, [user]);

  // Load worker's payroll data (for workers)
  useEffect(() => {
    const loadWorkerPayroll = async () => {
      if (!user) return;
      
      try {
        const db = getFirestore();
        
        // Get user info from users collection
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserInfo(userDoc.data());
        }

        // Get approved payrolls for this worker
        const q = query(
          collection(db, 'workerPayrolls'),
          where('status', '==', 'approved')
        );
        const querySnapshot = await getDocs(q);
        
        let workerData = null;
        let mostRecentApproval = null;
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          if (data.workers && data.workers[user.uid]) {
            const approvalDate = new Date(data.approvedAt || data.createdAt);
            if (!mostRecentApproval || approvalDate > new Date(mostRecentApproval.approvedAt)) {
              workerData = {
                id: doc.id,
                ...data.workers[user.uid],
                approvedAt: data.approvedAt,
                approvedBy: data.approvedBy || data.approvedByName
              };
              mostRecentApproval = workerData;
            }
          }
        });
        
        setPayrollData(workerData);
      } catch (error) {
        console.error('Error loading worker payroll:', error);
      }
    };

    if (user && !isCarlaUser(user) && !isAliceUser(user)) {
      loadWorkerPayroll();
    }
  }, [user]);

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

  // Handle payroll approval
  const handleApprovePayroll = async (payrollId) => {
    setIsApproving(true);
    setApprovalMessage('');
    
    try {
      const db = getFirestore();
      
      // Update payroll status to approved
      const payrollRef = doc(db, 'payrolls', payrollId);
      await updateDoc(payrollRef, {
        status: 'approved',
        approvedBy: user.email,
        approvedByName: user.displayName || user.email,
        approvedAt: new Date().toISOString()
      });
      
      // Extract date from payroll ID to update workers payroll
      const match = payrollId.match(/payroll\((\d+),(\d+),(\d+)\)/);
      if (match) {
        const month = parseInt(match[1]);
        const day = parseInt(match[2]);
        const year = parseInt(match[3]);
        const workersPayrollId = `workerspayroll(${month},${day},${year})`;
        
        const workersPayrollRef = doc(db, 'workerPayrolls', workersPayrollId);
        await updateDoc(workersPayrollRef, {
          status: 'approved',
          approvedBy: user.email,
          approvedByName: user.displayName || user.email,
          approvedAt: new Date().toISOString()
        });
      }
      
      setApprovalMessage('Payroll approved successfully!');
      setTimeout(() => setApprovalMessage(''), 5000);
      
      // Remove approved payroll from list
      setPayrollData(prev => prev.filter(payroll => payroll.id !== payrollId));
      setSelectedPayroll(null);
      
    } catch (error) {
      console.error('Error approving payroll:', error);
      setApprovalMessage('Error approving payroll. Please try again.');
      setTimeout(() => setApprovalMessage(''), 5000);
    } finally {
      setIsApproving(false);
    }
  };

  // Utility functions for worker payroll
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-PH', {
      style: 'currency',
      currency: 'PHP'
    }).format(amount || 0);
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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

  // Route to appropriate component based on user
  if (isCarlaUser(user)) {
    return (
      <div className="payroll-center-content">
        <div className="manager-view">
          <div className="manager-header">
            <h2>Worker Payroll Management</h2>
            <div className="manager-controls">
              <button
                onClick={() => setShowPricingConfig(!showPricingConfig)}
                className="pricing-config-button"
              >
                Pricing Configuration
              </button>
            </div>
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
  } else if (isAliceUser(user)) {
    // If a specific payroll is selected, show detailed validation view
    if (selectedPayroll) {
      const { data } = selectedPayroll;
      
      return (
        <div className="payroll-center-content">
          <div className="alice-payroll-validation">
            <div className="validation-header">
              <button
                onClick={() => setSelectedPayroll(null)}
                className="back-button"
              >
                ← Back to Payroll List
              </button>
              <h2>Payroll Validation - {selectedPayroll.dateString}</h2>
              <p>Review and approve payroll data submitted by {selectedPayroll.createdBy}</p>
            </div>
            
            <div className="validation-table-container">
              <table className="validation-table">
                <thead>
                  <tr>
                    <th>Worker Name</th>
                    <th>Gross Earnings</th>
                    <th>SSS Deduction</th>
                    <th>PAG-IBIG Deduction</th>
                    <th>PhilHealth Deduction</th>
                    <th>Cash Advance</th>
                    <th>Total Deductions</th>
                    <th>Net Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.workers.map((worker, index) => {
                    const grossEarnings = worker.totalEarnings || 0;
                    const sss = worker.sss || 0;
                    const pagibig = worker.pagibig || 0;
                    const philhealth = worker.philhealth || 0;
                    const cashAdvance = worker.cashAdvance || 0;
                    const totalDeductions = sss + pagibig + philhealth + cashAdvance;
                    const netAmount = grossEarnings - totalDeductions;
                    
                    return (
                      <tr key={index}>
                        <td className="worker-name">{worker.workerName}</td>
                        <td className="earnings">₱{grossEarnings.toLocaleString()}</td>
                        <td className="deduction">₱{sss.toLocaleString()}</td>
                        <td className="deduction">₱{pagibig.toLocaleString()}</td>
                        <td className="deduction">₱{philhealth.toLocaleString()}</td>
                        <td className="deduction">₱{cashAdvance.toLocaleString()}</td>
                        <td className="total-deductions">₱{totalDeductions.toLocaleString()}</td>
                        <td className={`net-amount ${netAmount < 0 ? 'negative' : ''}`}>
                          ₱{netAmount.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                  <tr className="grand-total-row">
                    <td><strong>GRAND TOTAL</strong></td>
                    <td><strong>₱{data.totals.totalEarnings.toLocaleString()}</strong></td>
                    <td><strong>₱{data.totals.sss.toLocaleString()}</strong></td>
                    <td><strong>₱{data.totals.pagibig.toLocaleString()}</strong></td>
                    <td><strong>₱{data.totals.philhealth.toLocaleString()}</strong></td>
                    <td><strong>₱{data.totals.cashAdvance.toLocaleString()}</strong></td>
                    <td><strong>₱{(data.totals.sss + data.totals.pagibig + data.totals.philhealth + data.totals.cashAdvance).toLocaleString()}</strong></td>
                    <td><strong>₱{data.totals.netTotal.toLocaleString()}</strong></td>
                  </tr>
                </tbody>
              </table>
            </div>
            
            <div className="validation-actions">
              <div className="validation-summary">
                <h3>Payroll Summary</h3>
                <div className="summary-grid">
                  <div className="summary-item">
                    <span className="label">Total Workers:</span>
                    <span className="value">{data.workers.length}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Total Gross Earnings:</span>
                    <span className="value">₱{data.totals.totalEarnings.toLocaleString()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Total Deductions:</span>
                    <span className="value">₱{(data.totals.sss + data.totals.pagibig + data.totals.philhealth + data.totals.cashAdvance).toLocaleString()}</span>
                  </div>
                  <div className="summary-item">
                    <span className="label">Net Payroll Amount:</span>
                    <span className="value">₱{data.totals.netTotal.toLocaleString()}</span>
                  </div>
                </div>
              </div>
              
              <div className="action-buttons">
                <button
                  onClick={() => handleApprovePayroll(selectedPayroll.id)}
                  disabled={isApproving}
                  className="approve-button"
                >
                  {isApproving ? 'Approving...' : 'Approve Payroll'}
                </button>
              </div>
            </div>
            
            {approvalMessage && (
              <div className={`approval-message ${approvalMessage.includes('Error') ? 'error' : 'success'}`}>
                {approvalMessage}
              </div>
            )}
          </div>
        </div>
      );
    }

    // Show list of pending payrolls
    return (
      <div className="payroll-center-content">
        <div className="alice-payroll-list">
          <div className="payroll-list-header">
            <h2>Payroll Management</h2>
            <p>Review and manage payroll data submitted by Carla</p>
          </div>
          
          {/* Tab Navigation */}
          <div className="payroll-tabs">
            <button 
              className={`tab-button ${activeTab === 'pending' ? 'active' : ''}`}
              onClick={() => setActiveTab('pending')}
            >
              Pending Approvals ({payrollData.length})
            </button>
            <button 
              className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
              onClick={() => setActiveTab('history')}
            >
              Past History ({approvedPayrolls.length})
            </button>
          </div>
          
          {/* Pending Payrolls Tab */}
          {activeTab === 'pending' && (
            <div className="payroll-tab-content">
              {payrollData.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="60" height="60" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M14,2H6A2,2 0 0,0 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2M18,20H6V4H13V9H18V20Z"/>
                    </svg>
                  </div>
                  <h3>No Pending Payrolls</h3>
                  <p>No payroll data has been submitted by Carla for review.</p>
                </div>
              ) : (
                <div className="payroll-list-grid">
                  {payrollData.map((payroll) => (
                    <div
                      key={payroll.id}
                      className="payroll-card"
                      onClick={() => setSelectedPayroll(payroll)}
                    >
                      <div className="payroll-card-header">
                        <h3>{payroll.dateString}</h3>
                        <span className="status-badge pending">Pending</span>
                      </div>
                      <div className="payroll-card-content">
                        <div className="payroll-info">
                          <span className="label">Created by:</span>
                          <span className="value">{payroll.createdBy}</span>
                        </div>
                        <div className="payroll-info">
                          <span className="label">Workers:</span>
                          <span className="value">{payroll.data.workers.length}</span>
                        </div>
                        <div className="payroll-info">
                          <span className="label">Total Amount:</span>
                          <span className="value">₱{payroll.data.totals.netTotal.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="payroll-card-actions">
                        <span className="review-text">Click to Review & Approve</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          
          {/* Past History Tab */}
          {activeTab === 'history' && (
            <div className="payroll-tab-content">
              {approvedPayrolls.length === 0 ? (
                <div className="empty-state">
                  <div className="empty-icon">
                    <svg width="60" height="60" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9,20.42L2.79,14.21L4.21,12.79L9,17.58L19.59,7L21,8.41L9,20.42Z"/>
                    </svg>
                  </div>
                  <h3>No Approved Payrolls</h3>
                  <p>No payroll data has been approved yet.</p>
                </div>
              ) : (
                <div className="payroll-list-grid">
                  {approvedPayrolls.map((payroll) => (
                    <div
                      key={payroll.id}
                      className="payroll-card history-card"
                      onClick={() => setSelectedPayroll(payroll)}
                    >
                      <div className="payroll-card-header">
                        <h3>{payroll.dateString}</h3>
                        <span className="status-badge approved">Approved</span>
                      </div>
                      <div className="payroll-card-content">
                        <div className="payroll-info">
                          <span className="label">Created by:</span>
                          <span className="value">{payroll.createdBy}</span>
                        </div>
                        <div className="payroll-info">
                          <span className="label">Approved by:</span>
                          <span className="value">{payroll.data.approvedByName || 'Alice'}</span>
                        </div>
                        <div className="payroll-info">
                          <span className="label">Workers:</span>
                          <span className="value">{payroll.data.workers.length}</span>
                        </div>
                        <div className="payroll-info">
                          <span className="label">Total Amount:</span>
                          <span className="value">₱{payroll.data.totals.netTotal.toLocaleString()}</span>
                        </div>
                        <div className="payroll-info">
                          <span className="label">Approved on:</span>
                          <span className="value">
                            {payroll.data.approvedAt ? 
                              new Date(payroll.data.approvedAt).toLocaleDateString() : 
                              'Unknown'
                            }
                          </span>
                        </div>
                      </div>
                      <div className="payroll-card-actions">
                        <span className="review-text">Click to View Details</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    );
  } else if (user && userInfo) {
    // Show worker payroll for all other authenticated users
    // If no payroll data found
    if (!payrollData) {
      return (
        <div className="payroll-center-content">
          <div className="worker-payroll-container">
            <div className="worker-payroll-header">
              <div className="worker-avatar">
                {(userInfo?.fullName || userInfo?.username || user.displayName || 'U').charAt(0).toUpperCase()}
              </div>
              <h2 className="worker-name">{userInfo?.fullName || userInfo?.username || user.displayName || 'Worker'}</h2>
              <p className="worker-email">{user.email}</p>
              <p className="billing-date">No approved payroll available</p>
            </div>
            
            <div className="no-payroll-message">
              <p>Your payroll has not been approved yet. Please check back later.</p>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="payroll-center-content">
        <div className="worker-payroll-container">
          {/* User Information Header */}
          <div className="worker-payroll-header">
            <div className="worker-avatar">
              {(userInfo?.fullName || userInfo?.username || user.displayName || 'U').charAt(0).toUpperCase()}
            </div>
            <h2 className="worker-name">{userInfo?.fullName || userInfo?.username || user.displayName || 'Worker'}</h2>
            <p className="worker-email">{user.email}</p>
            <p className="billing-date">Billing of this day ({formatDate(payrollData.approvedAt)})</p>
          </div>

          {/* Toggle Manager View Button */}
          <div className="manager-toggle-container">
            <button 
              className="manager-toggle-btn"
              onClick={() => setIsManagerView(!isManagerView)}
            >
              Toggle Manager View
            </button>
          </div>

          {/* Payroll Details */}
          <div className="worker-payroll-details">
            <div className="payroll-item">
              <span className="payroll-label">LOCAL:</span>
              <span className="payroll-value">{formatCurrency(payrollData.localMooringCount * 100 + payrollData.localUnmooringCount * 100)}</span>
            </div>
            
            <div className="payroll-item">
              <span className="payroll-label">FOREIGN:</span>
              <span className="payroll-value">{formatCurrency(payrollData.foreignMooringCount * 150 + payrollData.foreignUnmooringCount * 150)}</span>
            </div>
            
            <div className="payroll-item">
              <span className="payroll-label">TOTAL:</span>
              <span className="payroll-value">{formatCurrency(payrollData.totalEarnings)}</span>
            </div>
            
            <div className="payroll-item">
              <span className="payroll-label">PAG-IBIG LOAN:</span>
              <span className="payroll-value">{formatCurrency(payrollData.pagibig)}</span>
            </div>
            
            <div className="payroll-item">
              <span className="payroll-label">CASH ADVANCE:</span>
              <span className="payroll-value">{formatCurrency(payrollData.cashAdvance)}</span>
            </div>
            
            <div className="payroll-item">
              <span className="payroll-label">BALANCE:</span>
              <span className="payroll-value">{formatCurrency(payrollData.totalEarnings - payrollData.pagibig - payrollData.cashAdvance)}</span>
            </div>
            
            <div className="payroll-item">
              <span className="payroll-label">SSS/PI/PH:</span>
              <span className="payroll-value">{formatCurrency(payrollData.sss + payrollData.philhealth)}</span>
            </div>
            
            <div className="payroll-item">
              <span className="payroll-label">TOTAL DEDUCTIONS:</span>
              <span className="payroll-value">{formatCurrency(payrollData.sss + payrollData.philhealth + payrollData.pagibig + payrollData.cashAdvance)}</span>
            </div>
            
            {/* Final Total */}
            <div className="payroll-item payroll-total">
              <span className="payroll-label">TOTAL:</span>
              <span className="payroll-value">{formatCurrency(payrollData.netTotal)}</span>
            </div>
          </div>

          {/* Manager View Details */}
          {isManagerView && (
            <div className="manager-view-details">
              <h3>Manager View Details</h3>
              <div className="manager-details-grid">
                <div className="detail-item">
                  <span className="detail-label">Local Mooring:</span>
                  <span className="detail-value">{payrollData.localMooringCount} operations</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Local Unmooring:</span>
                  <span className="detail-value">{payrollData.localUnmooringCount} operations</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Foreign Mooring:</span>
                  <span className="detail-value">{payrollData.foreignMooringCount} operations</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Foreign Unmooring:</span>
                  <span className="detail-value">{payrollData.foreignUnmooringCount} operations</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">SSS:</span>
                  <span className="detail-value">{formatCurrency(payrollData.sss)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">PhilHealth:</span>
                  <span className="detail-value">{formatCurrency(payrollData.philhealth)}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Approved By:</span>
                  <span className="detail-value">{payrollData.approvedBy || 'Alice Margaretha Santos'}</span>
                </div>
                <div className="detail-item">
                  <span className="detail-label">Approved At:</span>
                  <span className="detail-value">{formatDate(payrollData.approvedAt)}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    );
  } else {
    return (
      <div className="payroll-center-content">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>This section is only accessible to authorized users.</p>
        </div>
      </div>
    );
  }
};

export default UpdatedPayroll;

