import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import './LoginSignUp.css';

const LoginSignUp = ({ onLogin, onSignUp }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');

  const auth = getAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        onLogin({ email, password });
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Save user data to Firestore
        const db = getFirestore();
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          fullName: name,
          username: name, // Add username field for compatibility
          email: email,
          phone: phone,
          role: role || 'Employee',
          type: role || 'Employee', // Add type field for compatibility
          status: 'Active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        onSignUp({ name, email, phone, password });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await sendPasswordResetEmail(auth, forgotPasswordEmail);
      setSuccessMessage('Password reset email sent! Check your inbox.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
        setSuccessMessage('');
      }, 3000);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="login-signup-split-bg">
      <div className="login-signup-split-container">
        {/* Left Panel - Form */}
        <div className="login-left-panel">
          <div className="form-section">
            {/* Logo Section */}
            <div className="logo-section">
              <img src={require('../assets/anchorpoint.png')} alt="AnchorPoint Logo" className="hero-logo" />
              <h1 className="hero-title">
                <span className="leo-text">Leo</span> <span className="marines-text">Marines</span>
              </h1>
              <p className="hero-quote">"Navigating Excellence Through Innovation"</p>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Success Message */}
            {successMessage && (
              <div className="success-message">
                {successMessage}
              </div>
            )}

            {/* Main Form */}
            <form onSubmit={handleSubmit}>
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="input-field"
                  required
                />
              )}

              <input
                type="email"
                placeholder="Email Address"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input-field"
                required
              />

              {!isLogin && (
                <input
                  type="tel"
                  placeholder="Phone Number"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="input-field"
                  required
                />
              )}

              {!isLogin && (
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="input-field"
                  required
                  style={{
                    background: 'white',
                    border: '1px solid #ddd',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    fontSize: '1rem',
                    color: '#333',
                    width: '100%',
                    marginBottom: '16px'
                  }}
                >
                  <option value="">Select Role</option>
                  <option value="Manager">Manager</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Employee">Employee</option>
                  <option value="Administrator">Administrator</option>
                </select>
              )}

              <div className="password-input-wrapper">
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field"
                  required
                />
                <button
                  type="button"
                  className="eye-icon"
                  onClick={togglePasswordVisibility}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <ellipse cx="11" cy="11" rx="8" ry="5" stroke="#222" strokeWidth="2"/>
                    <circle cx="11" cy="11" r="2" fill={showPassword ? "#222" : "none"} stroke="#222" strokeWidth="2"/>
                  </svg>
                </button>
              </div>

              {!isLogin && (
                <div className="password-input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Confirm Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="input-field"
                    required
                  />
                  <button
                    type="button"
                    className="eye-icon"
                    onClick={togglePasswordVisibility}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {/* Minimalist eye SVG */}
                    <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                      <ellipse cx="11" cy="11" rx="8" ry="5" stroke="#222" strokeWidth="2"/>
                      <circle cx="11" cy="11" r="2" fill={showPassword ? "#222" : "none"} stroke="#222" strokeWidth="2"/>
                    </svg>
                  </button>
                </div>
              )}

              {isLogin && (
                <div className="forgot-password" onClick={() => setShowForgotPassword(true)}>
                  Forgot Password?
                </div>
              )}

              <button type="submit" className="main-btn login-btn" disabled={loading}>
                {loading ? 'Loading...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>


            {/* Switch between Login and Signup */}
            <div className="signup-link-row">
              {isLogin ? (
                <>
                  Don't have an account?{' '}
                  <span className="switch-link" onClick={() => setIsLogin(false)}>
                    Sign up
                  </span>
                </>
              ) : (
                <>
                  Already have an account?{' '}
                  <span className="switch-link" onClick={() => setIsLogin(true)}>
                    Sign in
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Hero Content */}
        <div className="login-right-panel">
        </div>
      </div>

      {/* Forgot Password Popup */}
      {showForgotPassword && (
        <div className="popup-overlay" onClick={() => setShowForgotPassword(false)}>
          <div className="popup-container" onClick={(e) => e.stopPropagation()}>
            <div className="popup-header">
              <h3>Reset Password</h3>
              <button 
                className="close-btn" 
                onClick={() => setShowForgotPassword(false)}
              >
                ✕
              </button>
            </div>
            
            <div className="popup-content">
              <p className="popup-message">
                Are you sure you want to reset your password? Please insert your email below, Thank You!
              </p>
              
              <form onSubmit={handleForgotPassword}>
                <div className="input-group">
                  <label htmlFor="reset-email">Email Address</label>
                  <input
                    id="reset-email"
                    type="email"
                    placeholder="Enter your email address"
                    value={forgotPasswordEmail}
                    onChange={(e) => setForgotPasswordEmail(e.target.value)}
                    className="popup-input"
                    required
                  />
                </div>
                
                {error && (
                  <div className="popup-error">
                    {error}
                  </div>
                )}
                
                {successMessage && (
                  <div className="popup-success">
                    {successMessage}
                  </div>
                )}
                
                <div className="popup-buttons">
                  <button 
                    type="button" 
                    className="popup-btn cancel-btn"
                    onClick={() => setShowForgotPassword(false)}
                  >
                    Cancel
                  </button>
                  <button 
                    type="submit" 
                    className="popup-btn submit-btn"
                    disabled={loading}
                  >
                    {loading ? 'Sending...' : 'Send Reset Email'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginSignUp;
