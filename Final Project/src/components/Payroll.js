import React, { useEffect, useState } from 'react';
import './Payroll.css';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

function getInitials(name, email) {
  if (name) {
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0][0].toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  if (email) return email[0].toUpperCase();
  return '?';
}

const Payroll = () => {
  const [user, setUser] = useState({
    name: '',
    email: '',
    initials: '',
    date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  });

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const name = firebaseUser.displayName || '';
        const email = firebaseUser.email || '';
        setUser({
          name: name || email,
          email: email,
          initials: getInitials(name, email),
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        });
      } else {
        setUser({
          name: 'Guest',
          email: '',
          initials: 'G',
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
        });
      }
    });
    return () => unsubscribe();
  }, []);

  return (
    <div className="payroll-center-content">
      <div className="payroll-card">
        <div className="payroll-profile">
          <div className="payroll-avatar">{user.initials}</div>
          <div className="payroll-name">{user.name}</div>
          <div className="payroll-email">{user.email}</div>
          <div className="payroll-date">Billing of this day <span className="payroll-date-value">({user.date})</span></div>
        </div>
        <div className="payroll-table-container">
          <table className="payroll-table">
            <tbody>
              <tr><td className="payroll-label">LOCAL</td><td></td></tr>
              <tr><td className="payroll-label">FOREIGN</td><td></td></tr>
              <tr><td className="payroll-label">TOTAL</td><td></td></tr>
              <tr><td className="payroll-label">PAG-IBIG LOAN</td><td></td></tr>
              <tr><td className="payroll-label">CASH ADVANCE</td><td></td></tr>
              <tr><td className="payroll-label">BALANCE</td><td></td></tr>
              <tr><td className="payroll-label">SSS/PI/PH</td><td></td></tr>
              <tr><td className="payroll-label">TOTAL DEDUCTIONS</td><td></td></tr>
              <tr><td className="payroll-label">TOTAL</td><td></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default Payroll;
