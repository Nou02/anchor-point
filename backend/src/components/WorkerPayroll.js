import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getTabUser } from '../utils/tabAuth';
import '../components/Payroll.css';

const WorkerPayroll = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payrollData, setPayrollData] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isManagerView, setIsManagerView] = useState(false);

  // Load user data - use tab-specific sessionStorage instead of Firebase auth
  const userRef = React.useRef(null);
  
  useEffect(() => {
    const loadUserData = () => {
      // Get user from tab-specific sessionStorage
      const tabUser = getTabUser();
      
      if (tabUser) {
        userRef.current = tabUser;
        setUser(tabUser);
      } else {
        userRef.current = null;
        setUser(null);
      }
      setIsLoading(false);
    };

    // Load user data on mount
    loadUserData();

    // Set up periodic check to detect if user changes (but ignore Firebase auth changes)
    // The interval checks sessionStorage directly and compares with ref
    const intervalId = setInterval(() => {
      const currentTabUser = getTabUser();
      const currentUserId = userRef.current?.uid;
      
      if (currentTabUser && currentTabUser.uid !== currentUserId) {
        // User changed in this tab, reload data
        loadUserData();
      } else if (!currentTabUser && currentUserId) {
        // User logged out in this tab
        userRef.current = null;
        setUser(null);
      }
    }, 500);

    return () => clearInterval(intervalId);
  }, []); // Empty dependency array - only run on mount

  // Load worker's payroll data
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

    loadWorkerPayroll();
  }, [user]);

  if (isLoading) {
    return (
      <div className="payroll-center-content">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading your payroll data...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="payroll-center-content">
        <div className="access-denied">
          <h2>Please log in</h2>
          <p>You need to be logged in to view your payroll.</p>
        </div>
      </div>
    );
  }

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
};

export default WorkerPayroll;
