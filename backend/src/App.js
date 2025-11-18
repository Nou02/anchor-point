import React, { useState, useEffect } from 'react';
import './App.css';
// Main App component for AnchorPoint application
import LandingPage from './components/LandingPage';
import Homepage from './components/Homepage';
import LoginSignUp from './components/LoginSignUp';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './firebase/config';
import { getTabUser, setTabUser, getTabId, isCurrentTabOwner } from './utils/tabAuth';

function App() {
  const [page, setPage] = useState('landing'); // 'landing', 'auth', 'home'
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Initialize tab ID
    getTabId();
    
    // Check if this tab has a stored user session
    const tabUser = getTabUser();
    if (tabUser) {
      // This tab has a user session, show home page
      setUser(tabUser);
      setPage('home');
    }

    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const currentTabUser = getTabUser();
      
      if (firebaseUser) {
        // If this tab doesn't have a stored user, or if Firebase user matches this tab's user
        // Store/update user info in sessionStorage for this tab
        if (!currentTabUser || currentTabUser.uid === firebaseUser.uid) {
          setTabUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          });
          setUser(firebaseUser);
          setPage('home');
        } else {
          // Firebase user changed but this tab has a different user stored
          // Keep showing this tab's user (don't change)
          if (currentTabUser) {
            setUser(currentTabUser);
            setPage('home');
          }
        }
      } else {
        // Firebase signed out
        // If this tab has a stored session, keep it (ignore Firebase sign-out from other tabs)
        // Only clear if this tab doesn't have a stored session
        if (!currentTabUser) {
          setUser(null);
          setPage('landing');
        } else {
          // This tab has its own session, keep it even though Firebase is signed out
          // This allows multiple tabs to have different users
          setUser(currentTabUser);
          setPage('home');
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const handleEnter = () => {
    setPage('auth');
  };

  const handleLogin = (loginData) => {
    // Authentication is handled in LoginSignUp component
    // This will be called after successful login
    setPage('home');
  };

  const handleSignUp = (signUpData) => {
    // Authentication is handled in LoginSignUp component
    // This will be called after successful signup
    setPage('home');
  };

  return (
    <div className="App">
      {page === 'landing' && <LandingPage onEnter={handleEnter} />}
      {page === 'auth' && <LoginSignUp onLogin={handleLogin} onSignUp={handleSignUp} />}
      {page === 'home' && <Homepage />}
    </div>
  );
}

export default App;