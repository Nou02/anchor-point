import React from 'react';
import './LandingPage.css';
import anchorLogo from '../assets/anchorpoint.png';

const LandingPage = ({ onEnter }) => {
  const handleClick = () => {
    if (onEnter) {
      onEnter();
    }
  };

  return (
    <div className="landing-page" onClick={handleClick}>
      <div className="landing-content">
        <div className="logo-section">
          <div className="anchor-icon" style={{ marginBottom: '1rem' }}>
            <img src={anchorLogo} alt="Anchor Logo" width={64} height={64} />
          </div>
          <div className="logo-text">
            <span className="logo-letter logo-red">A</span>
            <span className="logo-letter logo-white">nchor</span>
            <span style={{ margin: '0 0.2rem' }}></span>
            <span className="logo-letter logo-red">P</span>
            <span className="logo-letter logo-white">oint</span>
          </div>
        </div>
        
        <div className="taglines">
          <p className="tagline-1">Book with the professionals on mooring and unmooring services with ease of scheduling and handling your appointment with L.E.O Marines. </p>
        </div>
        
        <div className="click-hint">
          <span>Click anywhere to enter</span>
        </div>
      </div>
    </div>
  );
};

export default LandingPage;