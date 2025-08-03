import React from 'react';
import './LandingPage.css';

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
          <div className="anchor-icon">⚓</div>
          <div className="logo-text">
            <span className="anchor-text">Anchor</span>
            <span className="point-text">Point</span>
          </div>
        </div>
        
        <div className="taglines">
          <p className="tagline-1">Schedule your next mooring and unmooring services.</p>
          <p className="tagline-2">Easily reserve and manage your appointments with L.E.O Marines</p>
        </div>
        
        <div className="click-hint">
          <span>Click anywhere to enter</span>
        </div>
      </div>
    </div>
  );
};

export default LandingPage; 