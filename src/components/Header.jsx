import React, { useState, useEffect } from 'react';

function Header({ title, onThemeChange }) {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  const [userName, setUserName] = useState('Admin User');
  const [profileImage, setProfileImage] = useState('');

  const loadUserData = () => {
    const storedUser = localStorage.getItem('user') || localStorage.getItem('profile');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const name = user.username || user.full_name || user.name || 'Admin User';
        setUserName(name);
        const image = user.profile_image || user.avatar || '';
        setProfileImage(image);
      } catch (e) {
        console.error('Failed to parse user from localStorage', e);
        setProfileImage('');
      }
    } else {
      setProfileImage('');
    }
  };

  useEffect(() => {
    loadUserData();


    const handleStorageChange = (e) => {
      if (e.key === 'user' || e.key === 'profile') {
        loadUserData();
      }
    };
    window.addEventListener('storage', handleStorageChange);
   
    const handleProfileUpdate = () => loadUserData();
    window.addEventListener('profileUpdate', handleProfileUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('profileUpdate', handleProfileUpdate);
    };
  }, []);


  useEffect(() => {
    if (isDarkMode) {
      document.body.setAttribute('data-theme', 'dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.setAttribute('data-theme', 'light');
      localStorage.setItem('theme', 'light');
    }
    if (onThemeChange) {
      onThemeChange(isDarkMode);
    }
  }, [isDarkMode, onThemeChange]);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
  };

  return (
    <header className="dashboard-header">
      <div className="header-left">
        <h1 className="header-title">{title}</h1>
      </div>
      <div className="header-right">
      
        <button
          className="theme-toggle"
          onClick={toggleDarkMode}
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontSize: '1.6rem',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.3s ease',
            marginRight: '1rem',
          }}
        >
          <i
            className={`bi ${isDarkMode ? 'bi-sun-fill' : 'bi-moon-fill'}`}
            style={{
              color: isDarkMode ? '#ffcc00' : '#6c757d',
              filter: isDarkMode ? 'drop-shadow(0 0 4px #ffcc00)' : 'none',
              transition: 'all 0.3s ease',
            }}
          ></i>
        </button>

        
        <div className="user-info">
          <div className="user-avatar">
            {profileImage ? (
              <img src={profileImage} alt="Profile" className="avatar-image" />
            ) : (
              <img src="https://via.placeholder.com/40" alt="Profile" className="avatar-image" />
            )}
          </div>
          <div className="user-details">
            <span className="user-name">{userName}</span>
            <span className="user-role">Admin</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;