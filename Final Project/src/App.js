
import React, { useState } from 'react';
import './App.css';
import LandingPage from './components/LandingPage';
import Homepage from './components/Homepage';
import LoginSignUp from './components/LoginSignUp';

function App() {
  const [page, setPage] = useState('landing'); // 'landing', 'auth', 'home'

  const handleEnter = () => {
    setPage('auth');
  };

  const handleLogin = (loginData) => {
    // TODO: Add real authentication logic
    setPage('home');
  };

  const handleSignUp = (signUpData) => {
    // TODO: Add real sign-up logic
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