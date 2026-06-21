import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';

import logoImage from '../assets/images/photo_2026-06-12_23-30-09.jpg';

function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    const confirmLogout = window.confirm(
      'Are you sure you want to log out?'
    );

    if (confirmLogout) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      sessionStorage.clear();

      alert('You have been logged out successfully!');

      navigate('/login');
    }
  };

  return (
    <div className="sidebar-container">

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
              objectFit: 'cover'
            }}
            onError={(e) => {
              console.error('Logo image failed to load');

              e.target.src =
                'https://via.placeholder.com/80?text=Logo';
            }}
          />
        </Link>


      </div>

      {/* Navigation */}
      <nav className="nav-menu">
        <ul className="nav-list">

          <li
            className={`nav-item ${
              isActive('/shareholder') ? 'active' : ''
            }`}
          >
            <Link
              to="/shareholder"
              className="nav-link"
            >
              <div className="flex-items">
                <i className="bi bi-people-fill icon"></i>
                <span>Shareholder</span>
              </div>
            </Link>
          </li>

          <li
            className={`nav-item ${
              isActive('/shareholder-trade')
                ? 'active'
                : ''
            }`}
          >
            <Link
              to="/shareholder-trade"
              className="nav-link"
            >
              <div className="flex-items">
                <i className="bi bi-arrow-left-right icon"></i>
                <span>Trade / History</span>
              </div>
            </Link>
          </li>

          <li
            className={`nav-item ${
              isActive('/interest') ? 'active' : ''
            }`}
          >
            <Link
              to="/interest"
              className="nav-link"
            >
              <div className="flex-items">
                <i className="bi bi-percent icon"></i>
                <span>Interest</span>
              </div>
            </Link>
          </li>

          <li
            className={`nav-item ${
              isActive('/settings') ? 'active' : ''
            }`}
          >
            <Link
              to="/settings"
              className="nav-link"
            >
              <div className="flex-items">
                <i className="bi bi-gear-fill icon"></i>
                <span>Settings</span>
              </div>
            </Link>
          </li>

        </ul>
      </nav>

      {/* Logout */}
      <div className="logout-section">
        <button
          className="logout-btn"
          onClick={handleLogout}
        >
          <i className="bi bi-box-arrow-right"></i>
          <span>Log Out</span>
        </button>
      </div>

    </div>
  );
}

export default Sidebar;