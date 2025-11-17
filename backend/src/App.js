import React, { useState, useEffect } from 'react';
import './App.css';
// Main App component for AnchorPoint application
import LandingPage from './components/LandingPage';
import Homepage from './components/Homepage';
import LoginSignUp from './components/LoginSignUp';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './firebase/config';
import { getTabId, setTabUser, getTabUser, hasTabSession } from './utils/tabAuth';

function App() {
  const [page, setPage] = useState('landing'); // 'landing', 'auth', 'home'
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    
    // Check if this tab already has a user stored
    const tabUser = getTabUser();
    if (tabUser) {
      // This tab has a stored user, check if Firebase auth matches
      if (auth.currentUser && auth.currentUser.uid === tabUser.uid) {
        // Firebase auth matches this tab's user, restore it
        setUser(auth.currentUser);
        setPage('home');
      } else if (!auth.currentUser) {
        // Firebase auth is null but this tab has a session
        // This means another tab logged out, but this tab should stay logged in
        // Create a mock user object from stored data
        setUser({
          uid: tabUser.uid,
          email: tabUser.email,
          displayName: tabUser.displayName,
          // Mark as tab-specific session
          _tabSession: true
        });
        setPage('home');
      }
    }
    
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      const currentTabUser = getTabUser();
      
      if (firebaseUser) {
        // Store the user for this tab
        setTabUser(firebaseUser);
        setUser(firebaseUser);
        setPage('home');
      } else {
        // Firebase auth was cleared
        if (!currentTabUser) {
          // This tab doesn't have a stored user, so redirect to landing
          setUser(null);
          setPage('landing');
        } else {
          // This tab has a stored user, so maintain the session
          // Create a mock user object from stored data
          setUser({
            uid: currentTabUser.uid,
            email: currentTabUser.email,
            displayName: currentTabUser.displayName,
            _tabSession: true
          });
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