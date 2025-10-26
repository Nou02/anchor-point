import React, { useState, useEffect } from 'react';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, getDoc } from 'firebase/firestore';
import CarlaPayroll from './CarlaPayroll';
import AlicePayroll from './AlicePayroll';
import WorkerPayroll from './WorkerPayroll';
import '../components/Payroll.css';

const Payroll = () => {
  const [user, setUser] = useState(null);
  const [userInfo, setUserInfo] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

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
    return <CarlaPayroll />;
  } else if (isAliceUser(user)) {
    return <AlicePayroll />;
  } else if (user && userInfo) {
    // Show worker payroll for all other authenticated users
    return <WorkerPayroll />;
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

export default Payroll;