import React, { useState, useEffect } from 'react';
import './App.css';
// Main App component for AnchorPoint application
import LandingPage from './components/LandingPage';
import Homepage from './components/Homepage';
import LoginSignUp from './components/LoginSignUp';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './firebase/config';
import { getTabUser, setTabUser, getTabId, isCurrentTabOwner, hasExplicitLogin } from './utils/tabAuth';

function App() {
  const [page, setPage] = useState('landing'); // 'landing', 'auth', 'home'
  const [user, setUser] = useState(null);

  useEffect(() => {
    // Initialize tab ID
    getTabId();
    
    // Check sessionStorage first - this is the source of truth for this tab
    const checkTabSession = () => {
      const tabUser = getTabUser();
      if (tabUser) {
        // This tab has a user session, show home page
        setUser(tabUser);
        setPage('home');
        return true; // Has session
      }
      return false; // No session
    };
    
    // Check on mount - this is the PRIMARY check
    const hasSession = checkTabSession();
    
    if (hasSession) {
      // Tab has session, don't set up Firebase listener at all
      // sessionStorage is the source of truth - completely ignore Firebase
      // Set up a periodic check to ensure sessionStorage is still valid
      // This protects against logout scenarios where sessionStorage is cleared
      const intervalId = setInterval(() => {
        // Only check this tab's sessionStorage - it's tab-specific
        const currentTabUser = getTabUser();
        if (!currentTabUser) {
          // Session was cleared (e.g., by logout in this tab), redirect to landing
          setUser(null);
          setPage('landing');
          clearInterval(intervalId);
        }
        // If session exists, keep showing home - don't update state unnecessarily
      }, 500); // Check every 500ms for responsive logout detection
      
      return () => clearInterval(intervalId);
    }

    // Only set up Firebase listener if this tab doesn't have a session
    // This listener is ONLY for detecting when a user logs in through LoginSignUp
    // It should NOT affect tabs that already have a session
    const auth = getAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      // CRITICAL: ALWAYS check sessionStorage first on EVERY Firebase auth change
      // If this tab has a session, completely ignore Firebase and return immediately
      const currentTabUser = getTabUser();
      if (currentTabUser) {
        // This tab has its own session, completely ignore Firebase auth changes
        // This prevents other tabs' logins/logouts from affecting this tab
        // Update state to ensure we're showing the correct user
        setUser(currentTabUser);
        setPage('home');
        return;
      }
      
      // Only process Firebase auth if this tab has no session in sessionStorage
      // This means the user is either:
      // 1. On the landing page (no session)
      // 2. Just logged in through LoginSignUp (which sets sessionStorage)
      if (firebaseUser) {
        // Firebase user exists, but we don't have it in sessionStorage yet
        // This happens when LoginSignUp component calls signInWithEmailAndPassword
        // The LoginSignUp component will set sessionStorage, so we don't need to do anything here
        // Just wait for the page to refresh or the state to update
      } else {
        // Firebase is signed out and this tab has no session
        setUser(null);
        setPage('landing');
      }
    });
    
    return () => unsubscribe();
  }, []);

  const handleEnter = () => {
    setPage('auth');
  };

  const handleLogin = (loginData) => {
    // Authentication is handled in LoginSignUp component
    // LoginSignUp has already set sessionStorage via setTabUser()
    // Check sessionStorage to get the user and update state
    const tabUser = getTabUser();
    if (tabUser) {
      setUser(tabUser);
    }
    setPage('home');
  };

  const handleSignUp = (signUpData) => {
    // Authentication is handled in LoginSignUp component
    // LoginSignUp has already set sessionStorage via setTabUser()
    // Check sessionStorage to get the user and update state
    const tabUser = getTabUser();
    if (tabUser) {
      setUser(tabUser);
    }
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