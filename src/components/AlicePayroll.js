import React, { useState, useEffect, memo } from 'react';
import { getFirestore, collection, query, getDocs, updateDoc, doc } from 'firebase/firestore';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import '../components/Payroll.css';

const AlicePayroll = () => {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [payrollData, setPayrollData] = useState([]);
  const [approvedPayrolls, setApprovedPayrolls] = useState([]);
  const [selectedPayroll, setSelectedPayroll] = useState(null);
  const [isApproving, setIsApproving] = useState(false);
  const [approvalMessage, setApprovalMessage] = useState('');
  const [activeTab, setActiveTab] = useState('pending'); // 'pending' or 'history'

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
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      if (currentUser) {
        setUser(currentUser);
      } else {
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Load payroll data from Carla
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

    if (user) {
      loadPayrollData();
    }
  }, [user]);

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

  if (!isAliceUser(user)) {
    return (
      <div className="payroll-center-content">
        <div className="access-denied">
          <h2>Access Denied</h2>
          <p>This section is only accessible to Alice.</p>
        </div>
      </div>
    );
  }

  // Always show the tab navigation, even when there are no pending payrolls
  // This allows Alice to access the history section

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
};

export default AlicePayroll;