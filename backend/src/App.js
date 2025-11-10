import React, { useState, useEffect } from 'react';
import './App.css';
// Main App component for AnchorPoint application
import LandingPage from './components/LandingPage';
import Homepage from './components/Homepage';
import LoginSignUp from './components/LoginSignUp';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import './firebase/config';

function App() {
  const [page, setPage] = useState('landing'); // 'landing', 'auth', 'home'
  const [user, setUser] = useState(null);

  useEffect(() => {
    const auth = getAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        setPage('home');
      } else {
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