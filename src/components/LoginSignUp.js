import React, { useState } from 'react';
import './LoginSignUp.css';
import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const PasswordInput = ({ value, onChange, placeholder }) => {
  const [show, setShow] = useState(false);

  return (
    <div className="password-input-wrapper">
      <input
        className="input-field"
        type={show ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete="current-password"
      />
      <button
        type="button"
        className="eye-icon"
        tabIndex={-1}
        onClick={() => setShow((v) => !v)}
        aria-label={show ? "Hide password" : "Show password"}
      >
        {show ? (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/>
            <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2"/>
          </svg>
        ) : (
          <svg width="22" height="22" fill="none" viewBox="0 0 24 24">
            <path stroke="currentColor" strokeWidth="2" d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12Z"/>
            <circle cx="12" cy="12" r="3.5" stroke="currentColor" strokeWidth="2"/>
            <line x1="4" y1="20" x2="20" y2="4" stroke="currentColor" strokeWidth="2"/>
          </svg>
        )}
      </button>
    </div>
  );
};

const LoginSignUp = ({ onLogin, onSignUp }) => {
  // List of workers for matching
  const workersList = [
    { name: 'Alice Margaretha Santos', type: 'Senior Supervisor'},
    { name: 'Carla Dela Peña', type: 'Scheduler'},
    { name: 'Bryan Matthew Cruz', type: 'Dock Worker'},
    { name: 'David Emmanuel Reyes', type: 'Mechanic'},
    { name: 'Junnel, Cusi', type: 'Dock Worker'},
    { name: 'Aljon, Dipasupil', type: 'Dock Worker'},
    { name: 'Phil Allen, Eje', type: 'Dock Worker'},
    { name: 'Rhed, Escalon', type: 'Dock Worker'},
    { name: 'Fortune, Garcia Jr.', type: 'Dock Worker'},
    { name: 'Keith, Javier', type: 'Dock Worker'},
    { name: 'Ericson, Mendoza', type: 'Dock Worker'},
    { name: 'Alec, Sino-ag', type: 'Dock Worker'},
    { name: 'Romeo, Velasquez', type: 'Dock Worker'},
    { name: 'Rodel, Maranan', type: 'Dock Worker'},
    { name: 'Alloi, Sino-ag', type: 'Dock Worker'},
    { name: 'Renzy, Cantos', type: 'Dock Worker'},
    { name: 'PJ, Cusi', type: 'Dock Worker'}
  ];
  const [isLogin, setIsLogin] = useState(true);
  const [loginData, setLoginData] = useState({ usernameOrEmail: '', password: '' });
  const [signUpData, setSignUpData] = useState({ username: '', email: '', phone: '', password: '', confirmPassword: '' });

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleSignUpChange = (e) => {
    setSignUpData({ ...signUpData, [e.target.name]: e.target.value });
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      // Use provided email, or fallback to username as dummy email
      let email = loginData.usernameOrEmail;
      if (!email.includes('@')) {
        email = `${loginData.usernameOrEmail}@dummy.com`;
      }
      
      // Sign in with Firebase
      const userCredential = await signInWithEmailAndPassword(auth, email, loginData.password);
      const user = userCredential.user;
      
      console.log('Debug - Login successful:', user);
      alert('Login successful!');
      if (onLogin) onLogin(loginData);
    } catch (error) {
      console.error('Debug - Login error:', error);
      alert('Login failed: ' + error.message);
    }
  };


  const handleSignUp = async (e) => {
    e.preventDefault();
    if (signUpData.password !== signUpData.confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    try {
      // Use provided email, or fallback to username as dummy email
      let email = signUpData.email;
      if (!email) {
        email = signUpData.username.includes('@') ? signUpData.username : `${signUpData.username}@dummy.com`;
      }
      // Create user in Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(auth, email, signUpData.password);
      const user = userCredential.user;
      
      // Try to match the username to a worker (by full name or first name)
      const getFirstName = name => name.split(/\s|,/)[0].toLowerCase();
      const inputFirstName = getFirstName(signUpData.username);
      const matchedWorker = workersList.find(worker =>
        worker.name.toLowerCase() === signUpData.username.toLowerCase() ||
        getFirstName(worker.name) === inputFirstName
      );
      
      // Prepare user data for Firestore
      const userData = {
        username: signUpData.username,
        email: signUpData.email,
        phone: signUpData.phone,
        password: signUpData.password, // Store password for demo (not secure)
        createdAt: new Date(),
        uid: user.uid,
        fullName: matchedWorker ? matchedWorker.name : signUpData.username,
        role: matchedWorker ? matchedWorker.type : 'Worker'
      };
      
      // Add matched worker data if found
      if (matchedWorker) {
        Object.assign(userData, matchedWorker);
      }
      
      // Save user info in Firestore
      await setDoc(doc(db, 'users', user.uid), userData);
      
      console.log('Debug - User registration successful:', userData);
      alert('Account created successfully!');
      if (onSignUp) onSignUp(signUpData);
    } catch (error) {
      console.error('Debug - Registration error:', error);
      alert(error.message);
    }
  };

  return (
    <div className="login-signup-split-bg">
      <div className="login-left-panel">
        <div className="form-section">
          <div className="logo-section">
            <img
              src={require('../assets/anchorpoint.png')}
              alt="Anchor Logo"
              className="anchor-logo hero-logo"
            />
            <h1 className="right-title hero-title">
              <span className="leo-text">Anchor</span> <span className="marines-text">Point</span>
            </h1>
            <div className="right-quote hero-quote">
              L.E.O Marines – Anchoring Trust, Navigating Excellence since 2011
            </div>
          </div>
          {isLogin ? (
            <form onSubmit={handleLogin}>
              <h2 className="login-title">Login</h2>
              <input name="usernameOrEmail" type="text" placeholder="Username or Email" value={loginData.usernameOrEmail} onChange={handleLoginChange} required className="input-field" />
              <PasswordInput
                value={loginData.password}
                onChange={e => setLoginData({ ...loginData, password: e.target.value })}
                placeholder="Password"
              />
              <button type="submit" className="main-btn login-btn">Log In</button>
              <div className="forgot-password">Forgot password?</div>
              <div className="signup-link-row">New to AnchorPoint? <span className="switch-link" onClick={() => setIsLogin(false)}>Sign up</span></div>
            </form>
          ) : (
            <form onSubmit={handleSignUp}>
              <h2 className="login-title">Sign up</h2>
              <input name="username" type="text" placeholder="Username" value={signUpData.username} onChange={handleSignUpChange} required className="input-field" />
              <input name="email" type="email" placeholder="Email" value={signUpData.email} onChange={handleSignUpChange} className="input-field" />
              <input name="phone" type="text" placeholder="Phone Number" value={signUpData.phone} onChange={handleSignUpChange} required className="input-field" />
              <PasswordInput
                value={signUpData.password}
                onChange={e => setSignUpData({ ...signUpData, password: e.target.value })}
                placeholder="Password"
              />
              <PasswordInput
                value={signUpData.confirmPassword}
                onChange={e => setSignUpData({ ...signUpData, confirmPassword: e.target.value })}
                placeholder="Confirm Password"
              />
              <button type="submit" className="main-btn login-btn">Sign up</button>
              <div className="signup-link-row">Already have an account? <span className="switch-link" onClick={() => setIsLogin(true)}>Log in</span></div>
            </form>
          )}
        </div>
      </div>
      <div className="login-right-panel">
      </div>
    </div>
  );
};

export default LoginSignUp;
