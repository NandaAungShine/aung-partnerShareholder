import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Alert from './Alert'; 

import logoImage from '../assets/images/photo_2026-06-12_23-30-09.jpg';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  
  const [isLogoutAlertOpen, setIsLogoutAlertOpen] = useState(false);

  const isActive = (path) => location.pathname === path;

  
  const handleLogoutConfirm = () => {
    
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.clear();

    
    setIsLogoutAlertOpen(false);

   
    navigate('/login');
  };

  
  const handleLogoutClick = () => {
    setIsLogoutAlertOpen(true);
  };

  return (
    <div className="sidebar-container" style={{ width: '180px' }}>

      {/* Logo */}
      <div className="logo-section">
        <Link to="/shareholder" className="logo-link">
          <img
            src={logoImage}
            alt="AUNG PARTNER"
            className="logo-image"
            style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              objectFit: 'cover',
            }}
            onError={(e) => {
              console.error('Logo image failed to load');
              e.target.src = 'https://via.placeholder.com/80?text=Logo';
            }}
          />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="nav-menu">
        <ul className="nav-list">
          <li className={`nav-item ${isActive('/shareholder') ? 'active' : ''}`}>
            <Link to="/shareholder" className="nav-link">
              <div className="flex-items">
                <i className="bi bi-people-fill icon"></i>
                <span>Shareholder</span>
              </div>
            </Link>
          </li>

          <li className={`nav-item ${isActive('/shareholder-trade') ? 'active' : ''}`}>
            <Link to="/shareholder-trade" className="nav-link">
              <div className="flex-items">
                <i className="bi bi-arrow-left-right icon"></i>
                <span>Trade / History</span>
              </div>
            </Link>
          </li>

          <li className={`nav-item ${isActive('/interest') ? 'active' : ''}`}>
            <Link to="/interest" className="nav-link">
              <div className="flex-items">
                <i className="bi bi-percent icon"></i>
                <span>Interest</span>
              </div>
            </Link>
          </li>

          <li className={`nav-item ${isActive('/interest-request') ? 'active' : ''}`}>
            <Link to="/interest-request" className="nav-link">
              <div className="flex-items">
                <i className="bi bi-file-earmark-check icon"></i>
                <span>Interest Request</span>
              </div>
            </Link>
          </li>

          <li className={`nav-item ${isActive('/settings') ? 'active' : ''}`}>
            <Link to="/settings" className="nav-link">
              <div className="flex-items">
                <i className="bi bi-gear-fill icon"></i>
                <span>Settings</span>
              </div>
            </Link>
          </li>
        </ul>
      </nav>

      {/* Logout Button */}
      <div className="logout-section" style={{ width: '180px' }}>
        <button className="logout-btn" onClick={handleLogoutClick}>
          <i className="bi bi-box-arrow-right"></i>
          <span>Log Out</span>
        </button>
      </div>

     
      <Alert
        isOpen={isLogoutAlertOpen}
        title="Logout Confirmation"
        message="Are you sure you want to log out?"
        isInput={false}          
        showCancel={true}        
        onClose={() => setIsLogoutAlertOpen(false)} 
        onSubmit={handleLogoutConfirm}               
      />

    </div>
  );
}

export default Sidebar;