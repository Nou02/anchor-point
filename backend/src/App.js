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
    
    // Check if this tab has a stored user session
    const tabUser = getTabUser();
    if (tabUser) {
      // This tab has a user session, show home page
      setUser(tabUser);
      setPage('home');
    }

    const auth = getAuth();
    let isInitialLoad = true;
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const currentTabUser = getTabUser();
      const tabHasExplicitLogin = hasExplicitLogin();
      
      if (firebaseUser) {
        // Only accept Firebase user if:
        // 1. This tab has explicitly logged in (not just received a change from another tab)
        // 2. OR this tab's stored user matches the Firebase user (same user logging in again)
        // 3. OR this is the initial load and tab has no user (first time opening - new tab inherits login)
        if (tabHasExplicitLogin) {
          // This tab explicitly logged in, accept the Firebase user
          setTabUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          }, true);
          setUser(firebaseUser);
          setPage('home');
        } else if (currentTabUser && currentTabUser.uid === firebaseUser.uid) {
          // Same user, just update the stored user info
          setTabUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          }, false);
          setUser(firebaseUser);
          setPage('home');
        } else if (isInitialLoad && !currentTabUser) {
          // Initial load with no stored user - new tab inherits the Firebase login
          setTabUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email,
            displayName: firebaseUser.displayName,
            photoURL: firebaseUser.photoURL
          }, false);
          setUser(firebaseUser);
          setPage('home');
        } else if (currentTabUser) {
          // This tab has a different user stored, keep it (ignore Firebase change from another tab)
          setUser(currentTabUser);
          setPage('home');
        }
        // If tab has no user and this is not initial load, ignore the Firebase change
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
      
      isInitialLoad = false;
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