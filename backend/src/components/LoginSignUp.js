import React, { useState } from 'react';
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { getFirestore, doc, setDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { setTabUser } from '../utils/tabAuth';
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
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState('');

  const auth = getAuth();

  // Generate a simple user ID based on date and order
  const generateUserId = async (db) => {
    const now = new Date();
    const year = now.getFullYear().toString().slice(-2); // Last 2 digits of year
    const month = String(now.getMonth() + 1).padStart(2, '0'); // Month (01-12)
    const day = String(now.getDate()).padStart(2, '0'); // Day (01-31)
    const datePrefix = `${year}${month}${day}`; // Format: YYMMDD
    
    try {
      // Get all users and filter by date prefix in userId or createdAt
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      
      // Find the highest order number for today
      let maxOrder = 0;
      querySnapshot.forEach((doc) => {
        const userData = doc.data();
        // Check if user has userId with today's date prefix
        if (userData.userId && userData.userId.startsWith(datePrefix)) {
          const orderPart = userData.userId.split('-')[1];
          if (orderPart) {
            const orderNum = parseInt(orderPart, 10);
            if (!isNaN(orderNum) && orderNum > maxOrder) {
              maxOrder = orderNum;
            }
          }
        }
        // Also check users created today without userId (for backward compatibility)
        else if (userData.createdAt) {
          const createdDate = new Date(userData.createdAt);
          if (createdDate.getFullYear() === now.getFullYear() &&
              createdDate.getMonth() === now.getMonth() &&
              createdDate.getDate() === now.getDate()) {
            // This user was created today but doesn't have userId yet
            // We'll count them too to avoid conflicts
          }
        }
      });
      
      // Generate next order number
      const nextOrder = maxOrder + 1;
      const orderSuffix = String(nextOrder).padStart(3, '0'); // Format: 001, 002, etc.
      
      return `${datePrefix}-${orderSuffix}`;
    } catch (error) {
      console.error('Error generating user ID:', error);
      // Fallback: use timestamp-based ID
      const timestamp = Date.now().toString().slice(-6);
      return `${datePrefix}-${timestamp}`;
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      if (isLogin) {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Mark this as an explicit login from this tab
        setTabUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }, true); // true = explicit login
        
        onLogin({ email, password });
      } else {
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match');
        }
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // Mark this as an explicit login from this tab
        setTabUser({
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          photoURL: user.photoURL
        }, true); // true = explicit login
        
        // Save user data to Firestore
        const db = getFirestore();
        const fullName = `${firstName} ${lastName}`.trim();
        
        // Generate simple user ID based on date and order
        const userId = await generateUserId(db);
        
        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          userId: userId, // Simple user ID: YYMMDD-XXX
          firstName: firstName,
          lastName: lastName,
          fullName: fullName, // Keep for backward compatibility
          username: fullName, // Add username field for compatibility
          email: email,
          phone: phone,
          role: role || 'Crew',
          type: role || 'Crew', // Add type field for compatibility
          status: 'Active',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
        
        onSignUp({ name: fullName, email, phone, password });
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
                <span className="leo-text">L.E.O.</span> <span className="marines-text">MARINES</span>
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
                <>
                  <input
                    type="text"
                    placeholder="First Name"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="input-field"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Last Name"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="input-field"
                    required
                  />
                </>
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
                  className="input-field select-field"
                  required
                >
                  <option value="">Select Role</option>
                  <option value="Manager">Manager</option>
                  <option value="Supervisor">Supervisor</option>
                  <option value="Crew">Crew</option>
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
          <video
            className="login-bg-video"
            autoPlay
            loop
            muted
            playsInline
          >
            <source src={require('../assets/lnding.mp4')} type="video/mp4" />
            Your browser does not support the video tag.
          </video>
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
