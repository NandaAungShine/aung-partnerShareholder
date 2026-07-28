import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

import Alert from '../components/Alert'; 

import logoImage from '../assets/images/photo_2026-06-12_23-30-09.jpg';

const API_BASE_URL = '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();


  const [alert, setAlert] = useState({
    isOpen: false,
    title: '',
    message: '',
  });

  const showErrorAlert = (message) => {
    setAlert({
      isOpen: true,
      title: 'Login Error',
      message: message,
    });
  };

  const closeAlert = () => {
    setAlert(prev => ({ ...prev, isOpen: false }));
  };

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) navigate('/shareholder');
  }, [navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    if (!email.trim() || !password.trim()) {
      showErrorAlert('Please enter email and password');
      setLoading(false);
      return;
    }

    try {
      const response = await api.post('/auth/login', {
        email: email.trim(),
        password: password.trim(),
      });

      if (response.data?.success && response.data.token) {
        localStorage.setItem('token', response.data.token);
        localStorage.setItem('user', JSON.stringify(response.data.user));
        navigate('/shareholder');
      } else {
        showErrorAlert(response.data?.message || 'Login failed');
      }
    } catch (error) {
      if (error.response?.status === 401) {
        showErrorAlert('Invalid email or password');
      } else {
        showErrorAlert(error.response?.data?.message || 'Login failed');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <div className="login-logo-icon">
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
                e.target.onerror = null;
                e.target.src = '/images/photo_2026-06-12_23-30-09.jpg';
              }}
            />
          </div>
          <h1 className="login-logo">Aung Partner</h1>
          <p className="login-subtitle">Admin Dashboard Login</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          <div className="login-form-group">
            <label>Email Address</label>
            <div className="login-input-wrapper">
              <i className="bi bi-envelope-fill"></i>
              <input
                type="email"
                placeholder="admin@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoFocus
              />
            </div>
          </div>

          <div className="login-form-group">
            <label>Password</label>
            <div className="login-input-wrapper">
              <i className="bi bi-lock-fill"></i>
              <input
                type={showPassword ? 'text' : 'password'}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
              >
                <i
                  className={`bi ${
                    showPassword ? 'bi-eye-slash-fill' : 'bi-eye-fill'
                  }`}
                ></i>
              </button>
            </div>
          </div>

          <button type="submit" className="login-btn" disabled={loading}>
            {loading ? (
              <>
                <i className="bi bi-arrow-repeat spin"></i>
                <span>Logging in...</span>
              </>
            ) : (
              <>
                <i className="bi bi-box-arrow-in-right"></i>
                <span>Login</span>
              </>
            )}
          </button>
        </form>
      </div>

      <Alert
        isOpen={alert.isOpen}
        title={alert.title}
        message={alert.message}
        isInput={false} 
        onClose={closeAlert}
      />
    </div>
  );
}

export default Login;