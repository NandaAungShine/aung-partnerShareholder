import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import Login from './components/Login';
import Shareholder from './components/Shareholder';
import Settings from './components/Settings';
import Interest from './components/Interest';
import ShareholderTrade from './components/ShareholderTrade';  
import './index.css';
 
const ProtectedRoute = ({ children }) => {
  const token = localStorage.getItem('token');
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
};
 
const MainLayout = ({ children }) => {
  return (
    <div className="App">
      <Sidebar />
      <div className="main-content">
        {children}
      </div>
    </div>
  );
};

function App() {
  return (
    <Router>
      <Routes> 
        <Route path="/login" element={<Login />} /> 
        <Route 
          path="/" 
          element={
            (() => {
              const token = localStorage.getItem('token');
              if (token) {
                return <Navigate to="/shareholder" replace />;
              } else {
                return <Navigate to="/login" replace />;
              }
            })()
          } 
        />
 
        <Route 
          path="/shareholder" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Shareholder />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
         
        <Route 
          path="/shareholder-trade" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <ShareholderTrade />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
 
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Settings />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
 
        <Route 
          path="/interest" 
          element={
            <ProtectedRoute>
              <MainLayout>
                <Interest />
              </MainLayout>
            </ProtectedRoute>
          } 
        />
 
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;