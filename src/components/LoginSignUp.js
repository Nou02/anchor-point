
import React, { useState } from 'react';
import './LoginSignUp.css';
import { auth, db } from '../firebase/config';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';

const LoginSignUp = ({ onLogin, onSignUp }) => {
  // List of workers for matching
  const workersList = [
    { name: 'Alice Margaretha Santos', type: 'Senior Supervisor', age: 34, info: 'Alice is a senior supervisor with 10 years of experience.', phone: '0917-123-4567' },
    { name: 'Carla Dela Peña', type: 'Scheduler', age: 29, info: 'Carla manages all schedules and logistics.', phone: '0917-123-4567' },
    { name: 'Bryan Matthew Cruz', type: 'Dock Worker', age: 26, info: 'Bryan is responsible for loading and unloading cargo.', phone: '0917-123-4567' },
    { name: 'David Emmanuel Reyes', type: 'Mechanic', age: 31, info: 'David maintains and repairs all dock equipment.', phone: '0917-123-4567' },
    { name: 'Junnel, Cusi', type: 'Dock Worker', age: 28, info: 'Junnel is known for his efficiency and teamwork on the docks.', phone: '0917-123-4567' },
    { name: 'Aljon, Dipasupil', type: 'Dock Worker', age: 27, info: 'Aljon specializes in cargo organization and safety procedures.', phone: '0917-123-4567' },
    { name: 'Phil Allen, Eje', type: 'Dock Worker', age: 30, info: 'Phil Allen is a reliable worker with a keen eye for detail.', phone: '0917-123-4567' },
    { name: 'Rhed, Escalon', type: 'Dock Worker', age: 25, info: 'Rhed is always ready to assist and ensures smooth dock operations.', phone: '0917-123-4567' },
    { name: 'Fortune, Garcia Jr.', type: 'Dock Worker', age: 32, info: 'Fortune brings years of experience and leadership to the team.', phone: '0917-123-4567' },
    { name: 'Keith, Javier', type: 'Dock Worker', age: 26, info: 'Keith is skilled in operating heavy machinery and equipment.', phone: '0917-123-4567' },
    { name: 'Ericson, Mendoza', type: 'Dock Worker', age: 29, info: 'Ericson is dedicated to maintaining safety and order on the docks.', phone: '0917-123-4567' },
    { name: 'Alec, Sino-ag', type: 'Dock Worker', age: 24, info: 'Alec is a fast learner and always eager to take on new tasks.', phone: '0917-123-4567' },
    { name: 'Romeo, Velasquez', type: 'Dock Worker', age: 31, info: 'Romeo is respected for his hard work and positive attitude.', phone: '0917-123-4567' },
    { name: 'Rodel, Maranan', type: 'Dock Worker', age: 28, info: 'Rodel is dependable and ensures all shipments are handled properly.', phone: '0917-123-4567' },
    { name: 'Alloi, Sino-ag', type: 'Dock Worker', age: 23, info: 'Alloi is energetic and helps keep the workflow efficient.', phone: '0917-123-4567' },
    { name: 'Renzy, Cantos', type: 'Dock Worker', age: 27, info: 'Renzy is known for his punctuality and strong work ethic.', phone: '0917-123-4567' },
    { name: 'PJ, Cusi', type: 'Dock Worker', age: 25, info: 'PJ is a team player who always supports his fellow workers.', phone: '0917-123-4567' }
  ];
  const [isLogin, setIsLogin] = useState(true);
  const [loginData, setLoginData] = useState({ username: '', password: '' });
  // ...existing code...
  const [signUpData, setSignUpData] = useState({ username: '', email: '', phone: '', password: '', confirmPassword: '' });

  const handleLoginChange = (e) => {
    setLoginData({ ...loginData, [e.target.name]: e.target.value });
  };

  const handleSignUpChange = (e) => {
    setSignUpData({ ...signUpData, [e.target.name]: e.target.value });
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (onLogin) onLogin(loginData);
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
      // Save user info in Firestore, including all fields and worker info if matched
      await setDoc(doc(db, 'users', user.uid), {
        username: signUpData.username,
        email: signUpData.email,
        phone: signUpData.phone,
        createdAt: new Date(),
        uid: user.uid,
        ...(matchedWorker ? matchedWorker : {})
      });
      alert('Account created successfully!');
      if (onSignUp) onSignUp(signUpData);
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="login-signup-split-bg">
      <div className="login-signup-split-container">
        <div className="login-left-panel">
          {isLogin ? (
            <form className="form-section" onSubmit={handleLogin}>
              <h2 className="login-title">Log in to your account</h2>
              <input name="username" type="text" placeholder="Username" value={loginData.username} onChange={handleLoginChange} required className="input-field" />
              <input name="email" type="email" placeholder="Email" value={loginData.email || ''} onChange={handleLoginChange} className="input-field" />
              <div className="password-input-wrapper">
                <input name="password" type="password" placeholder="Password" value={loginData.password} onChange={handleLoginChange} required className="input-field" />
                <span className="eye-icon">👁️</span>
              </div>
              <button type="submit" className="main-btn login-btn">Log In</button>
              <div className="forgot-password">Forgot password?</div>
              <div className="signup-link-row">New to AnchorPoint? <span className="switch-link" onClick={() => setIsLogin(false)}>Sign up</span></div>
            </form>
          ) : (
            <form className="form-section" onSubmit={handleSignUp}>
              <h2 className="login-title">Sign up</h2>
              <input name="username" type="text" placeholder="Username" value={signUpData.username} onChange={handleSignUpChange} required className="input-field" />
              <input name="email" type="email" placeholder="Email" value={signUpData.email} onChange={handleSignUpChange} className="input-field" />
              <input name="phone" type="text" placeholder="Phone Number" value={signUpData.phone} onChange={handleSignUpChange} required className="input-field" />
              <input name="password" type="password" placeholder="Password" value={signUpData.password} onChange={handleSignUpChange} required className="input-field" />
              <input name="confirmPassword" type="password" placeholder="Confirm Password" value={signUpData.confirmPassword} onChange={handleSignUpChange} required className="input-field" />
              <button type="submit" className="main-btn login-btn">Sign up</button>
              <div className="signup-link-row">Already have an account? <span className="switch-link" onClick={() => setIsLogin(true)}>Log in</span></div>
            </form>
          )}
        </div>
        <div className="login-right-panel">
          <div className="right-content">
            <div className="right-logo">{/* You can add a logo here if needed */}</div>
            <div className="right-title">Idea to app, fast</div>
            {/* Optionally add more content here */}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginSignUp;
