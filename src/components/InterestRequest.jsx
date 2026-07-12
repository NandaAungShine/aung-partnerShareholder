import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://130.94.21.185:5000'
  : '';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function InterestRequest() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  
  // ===== Passcode Modal State =====
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeDigits, setPasscodeDigits] = useState(['', '', '', '', '', '']);
  const [passcodeError, setPasscodeError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingActionParams, setPendingActionParams] = useState(null);
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  // ===== Filter & Search =====
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // ============================================================
  // 1. FETCH WITHDRAW REQUESTS FROM API
  // ============================================================
  const fetchWithdrawRequests = async () => {
    setLoading(true);
    setApiError('');
    try {
      const response = await api.get('/api/withdraw/list');
      let data = [];
      if (response.data?.success && Array.isArray(response.data.data)) {
        data = response.data.data;
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      
      const formatted = data.map((item) => ({
        id: item.id,
        shareholder_id: item.shareholder_id,
        fullName: item.username || item.full_name || `User ${item.shareholder_id}`,
        interestRequestAmount: item.amount || 0,
        status: item.status || 'pending',
        requestDate: item.created_at || new Date().toISOString().split('T')[0],
      }));
      
      setRequests(formatted);
    } catch (error) {
      console.error('❌ Failed to fetch withdraw requests:', error);
      setApiError('Failed to load withdraw requests from server.');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWithdrawRequests();
  }, []);

  // ============================================================
  // 2. THEME HANDLING
  // ============================================================
  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
  }, [isDarkMode]);

  const handleThemeChange = (isDark) => {
    setIsDarkMode(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  // ============================================================
  // 3. UPDATE STATUS API + UPDATE last-amount
  // ============================================================
  const updateRequestStatus = async (requestId, status, passcode, shareholderId, withdrawAmount) => {
    try {
      const passcodeNum = Number(passcode);
      
      // 1) Update withdraw status
      const response = await api.put(
        `/api/withdraw/change/status/${requestId}`,
        { status, shareholder_id: shareholderId },
        { headers: { 'x-passcode': passcodeNum } }
      );
      
      if (response.data?.success !== true) {
        throw new Error(response.data?.message || 'Status update failed');
      }

      // 2) 🔥 Update /api/insert/last-amount/ to reduce revenue
      if (status === 'approved' && withdrawAmount > 0) {
        try {
          // Get current totals
          const totalsResponse = await api.get(`/api/insert/last-amount/${shareholderId}`);
          let currentRevenue = 0;
          let currentQuantity = 0;
          let currentAmount = 0;
          if (totalsResponse.data?.success && totalsResponse.data.data) {
            const data = totalsResponse.data.data;
            currentRevenue = Number(data.revenue) || 0;
            currentQuantity = Number(data.quantity) || 0;
            currentAmount = Number(data.amount) || 0;
          }
          
          const newRevenue = Math.max(0, currentRevenue - withdrawAmount);
          await api.post('/api/insert/last-amount/', {
            shareholder_id: shareholderId,
            quantity: currentQuantity,
            amount: currentAmount,
            revenue: newRevenue,
          });
          console.log(`✅ Updated /api/insert/last-amount/ for shareholder ${shareholderId}, new revenue: ${newRevenue}`);
        } catch (totalsErr) {
          console.warn('⚠️ Could not update /api/insert/last-amount/:', totalsErr.message);
        }
      }
      
      return true;
    } catch (error) {
      console.error('❌ Status update error:', error);
      if (error.response) {
        console.error('Response data:', error.response.data);
        console.error('Response status:', error.response.status);
      }
      throw error;
    }
  };

  // ============================================================
  // 4. PASSCODE MODAL FLOW
  // ============================================================
  const requestPasscode = (action, params) => {
    setPasscodeDigits(['', '', '', '', '', '']);
    setPasscodeError('');
    setPendingAction(action);
    setPendingActionParams(params);
    setShowPasscodeModal(true);
    setTimeout(() => inputRefs[0]?.current?.focus(), 50);
  };

  const handleDigitChange = (index, value) => {
    if (value !== '' && !/^[0-9]$/.test(value)) {
      setPasscodeError('Must be number');
      return;
    }
    setPasscodeError('');
    const newDigits = [...passcodeDigits];
    newDigits[index] = value;
    setPasscodeDigits(newDigits);
    if (value && index < 5) inputRefs[index + 1]?.current?.focus();
    if (newDigits.every(d => d !== '')) {
      verifyAndExecute(newDigits.join(''));
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !passcodeDigits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const verifyAndExecute = async (passcode) => {
    setPasscodeError('');
    const action = pendingAction;
    const params = pendingActionParams;

    try {
      if (action === 'approve') {
        const withdrawAmount = params.interestRequestAmount || 0;
        await updateRequestStatus(
          params.requestId,
          'approved',
          passcode,
          params.shareholderId,
          withdrawAmount
        );
        
        // 🔥 Save to localStorage as withdraw history
        const withdrawKey = `withdrawHistory_${params.shareholderId}`;
        const stored = JSON.parse(localStorage.getItem(withdrawKey) || '[]');
        const newWithdraw = {
          id: params.requestId || `withdraw_${Date.now()}`,
          amount: withdrawAmount,
          date: new Date().toISOString().split('T')[0],
          timestamp: Date.now()
        };
        stored.push(newWithdraw);
        localStorage.setItem(withdrawKey, JSON.stringify(stored));
        
        // Dispatch event for real-time update
        window.dispatchEvent(new CustomEvent('withdrawApproved', {
          detail: {
            shareholderId: params.shareholderId,
            amount: withdrawAmount,
            requestId: params.requestId,
          }
        }));
        
        // Trigger for other tabs
        localStorage.setItem('withdrawTrigger', JSON.stringify({
          shareholderId: params.shareholderId,
          amount: withdrawAmount,
          requestId: params.requestId,
          timestamp: Date.now()
        }));
        
        await fetchWithdrawRequests();
        alert(`✅ Withdraw request #${params.requestId} approved successfully!`);
        
      } else if (action === 'reject') {
        await updateRequestStatus(
          params.requestId,
          'cancel',
          passcode,
          params.shareholderId,
          0
        );
        await fetchWithdrawRequests();
        alert(`❌ Withdraw request #${params.requestId} rejected.`);
      }
      
      setShowPasscodeModal(false);
      setPasscodeDigits(['', '', '', '', '', '']);
      setPendingAction(null);
      setPendingActionParams(null);
      
    } catch (error) {
      const backendMsg = error.response?.data?.message || error.message;
      setPasscodeError(backendMsg || 'Invalid passcode or server error.');
      setPasscodeDigits(['', '', '', '', '', '']);
      if (inputRefs[0]?.current) inputRefs[0].current.focus();
    }
  };

  const closeModal = () => {
    setShowPasscodeModal(false);
    setPasscodeDigits(['', '', '', '', '', '']);
    setPasscodeError('');
    setPendingAction(null);
    setPendingActionParams(null);
  };

  // ============================================================
  // 5. HANDLERS FOR APPROVE / REJECT
  // ============================================================
  const handleApprove = (request) => {
    requestPasscode('approve', {
      requestId: request.id,
      shareholderId: request.shareholder_id,
      interestRequestAmount: request.interestRequestAmount,
    });
  };

  const handleReject = (request) => {
    requestPasscode('reject', {
      requestId: request.id,
      shareholderId: request.shareholder_id,
    });
  };

  // ============================================================
  // 6. FORMATTING HELPERS
  // ============================================================
  const formatCurrency = (val) => (val || 0).toLocaleString();

  const getStatusBadgeClass = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved': return 'status-badge approved';
      case 'cancel': return 'status-badge rejected';
      case 'pending': return 'status-badge pending';
      default: return 'status-badge pending';
    }
  };

  const getStatusLabel = (status) => {
    switch(status?.toLowerCase()) {
      case 'approved': return 'Approved';
      case 'cancel': return 'Rejected';
      case 'pending': return 'Pending';
      default: return status || 'Pending';
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  // ============================================================
  // 7. FILTER & SEARCH
  // ============================================================
  const filteredRequests = requests.filter(req => {
    const matchesSearch = 
      (req.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.id?.toString().includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || req.status?.toLowerCase() === filterStatus.toLowerCase();
    return matchesSearch && matchesStatus;
  });

  // ============================================================
  // 8. RENDER
  // ============================================================
  if (loading && requests.length === 0) {
    return (
      <div className="dashboard-container">
        <Header title="Interest Withdraw Requests" onThemeChange={handleThemeChange} />
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="ms-2">Loading withdraw requests...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <style>{`
        /* ----- Main Layout Fix ----- */
        .App {
          display: flex !important;
          width: 100% !important;
          min-height: 100vh !important;
          overflow-x: hidden !important;
        }
        
        .App .main-content {
          flex: 1 !important;
          min-width: 0 !important;
          width: auto !important;
          margin-left: 0 !important;
          padding-left: 0 !important;
          padding-right: 16px !important;
          box-sizing: border-box !important;
          transition: flex 0.3s ease;
        }

        .dashboard-container {
          margin-left: 170px !important;
          padding: 24px 32px !important;
          min-height: 100vh !important;
          transition: all 0.3s ease !important;
          width: calc(100vw - 170px) !important;
          max-width: 100% !important;
          box-sizing: border-box !important;
          position: relative !important;
          overflow-x: hidden !important;
          flex: 1 !important;
        }

        /* ----- Interest Request Custom Styles ----- */
        .interest-request-container {
          max-width: 1400px;
          margin: 0 auto;
          padding: 1rem 0;
        }

        .interest-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          margin-bottom: 24px;
          padding-bottom: 16px;
          border-bottom: 2px solid var(--border-color);
        }

        .interest-title {
          font-size: 24px;
          font-weight: 700;
          color: var(--text-color);
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .interest-title small {
          background: #eef6ff;
          color: #1a6bc4;
          font-size: 14px;
          font-weight: 600;
          padding: 4px 16px;
          border-radius: 40px;
        }

        .pending-badge {
          background: #e6f0fa;
          color: #1a4b7a;
          padding: 8px 22px;
          border-radius: 40px;
          font-size: 14px;
          font-weight: 600;
        }

        .pending-badge span {
          background: #1a6bc4;
          color: white;
          padding: 1px 12px;
          border-radius: 30px;
          margin-left: 8px;
        }

        /* ----- Stats Cards ----- */
        .stats-row {
          display: flex;
          gap: 16px;
          flex-wrap: wrap;
          margin-bottom: 24px;
        }

        .stat-card-mini {
          flex: 1;
          min-width: 120px;
          background: var(--card-bg);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          border: 1px solid var(--border-color);
        }

        .stat-icon-mini {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 1.2rem;
        }

        .stat-icon-mini.total { background: #e3f5ec; color: #0d7a4a; }
        .stat-icon-mini.pending { background: #fff3cd; color: #856404; }
        .stat-icon-mini.approved { background: #cce5ff; color: #004085; }
        .stat-icon-mini.rejected { background: #f8d7da; color: #721c24; }

        .stat-info-mini h3 {
          font-size: 1.2rem;
          font-weight: 700;
          margin: 0;
          color: var(--text-color);
        }
        .stat-info-mini p {
          font-size: 0.75rem;
          margin: 0;
          color: #6c757d;
        }

        /* ----- Search & Filter Row ----- */
        .search-actions-row {
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          margin-bottom: 20px;
          align-items: center;
        }

        .search-bar-wrapper {
          flex: 1;
          min-width: 200px;
          position: relative;
        }

        .search-input-full {
          width: 100%;
          padding: 10px 16px 10px 40px;
          border-radius: 40px;
          border: 1px solid var(--border-color);
          background: var(--input-bg);
          color: var(--text-color);
          font-size: 0.9rem;
        }

        .search-input-full:focus {
          outline: none;
          border-color: #0d6efd;
          box-shadow: 0 0 0 2px rgba(13,110,253,0.2);
        }

        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
        }

        .filter-group-simple {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .filter-select-simple {
          padding: 9px 14px;
          border-radius: 40px;
          border: 1px solid var(--border-color);
          background: var(--input-bg);
          color: var(--text-color);
          font-size: 0.85rem;
          cursor: pointer;
        }

        /* ----- Table ----- */
        .table-responsive {
          overflow-x: auto;
          border-radius: 16px;
          border: 1px solid var(--border-color);
        }

        table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
          min-width: 700px;
        }

        thead {
          background: var(--card-bg);
          border-bottom: 2px solid var(--border-color);
        }

        thead th {
          padding: 14px 16px;
          text-align: left;
          font-weight: 600;
          color: #6c757d;
          font-size: 12px;
          letter-spacing: 0.3px;
          text-transform: uppercase;
          white-space: nowrap;
        }

        tbody tr {
          border-bottom: 1px solid var(--border-color);
          transition: background 0.15s ease;
        }

        tbody tr:hover {
          background: var(--hover-bg);
        }

        tbody td {
          padding: 14px 16px;
          vertical-align: middle;
        }

        /* ----- Avatar ----- */
        .avatar-small {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          background: linear-gradient(135deg, #1a6bc4, #3b8bdb);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 16px;
          text-transform: uppercase;
          flex-shrink: 0;
        }

        .avatar-small img {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .shareholder-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .shareholder-name {
          font-weight: 600;
          color: var(--text-color);
        }

        .shareholder-id {
          font-size: 12px;
          color: #6c757d;
        }

        .amount-cell {
          font-weight: 600;
          color: var(--text-color);
        }

        /* ----- Status Badge ----- */
        .status-badge {
          display: inline-block;
          padding: 4px 14px;
          border-radius: 30px;
          font-size: 12px;
          font-weight: 600;
        }

        .status-badge.approved {
          background: #e3f5ec;
          color: #0d7a4a;
        }

        .status-badge.pending {
          background: #fff3cd;
          color: #856404;
        }

        .status-badge.rejected {
          background: #f8d7da;
          color: #721c24;
        }

        /* ----- Actions ----- */
        .actions-cell {
          display: flex;
          flex-direction: column;
          gap: 6px;
          align-items: flex-start;
          min-width: 140px;
        }

        .action-group {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .action-icon {
          width: 32px;
          height: 32px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 8px;
          border: none;
          cursor: pointer;
          font-size: 14px;
          transition: all 0.2s;
          background: var(--card-bg);
          color: var(--text-color);
          border: 1px solid var(--border-color);
        }

        .action-icon:hover {
          transform: translateY(-2px);
        }

        .action-icon.approve {
          color: #0d7a4a;
          background: #e3f5ec;
          border-color: #0d7a4a;
        }

        .action-icon.approve:hover {
          background: #0d7a4a;
          color: #fff;
        }

        .action-icon.reject {
          color: #b33c3c;
          background: #fde8e8;
          border-color: #b33c3c;
        }

        .action-icon.reject:hover {
          background: #b33c3c;
          color: #fff;
        }

        .action-icon.view {
          color: #0d6efd;
          background: #cce5ff;
          border-color: #0d6efd;
        }

        .action-icon.view:hover {
          background: #0d6efd;
          color: #fff;
        }

        /* ----- Modal ----- */
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100%;
          height: 100%;
          background: rgba(0, 0, 0, 0.6);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 10000;
        }

        .modal-content {
          background: var(--card-bg);
          border-radius: 24px;
          padding: 0;
          max-width: 450px;
          width: 90%;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2);
        }

        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 1.2rem 1.5rem;
          border-bottom: 1px solid var(--border-color);
        }

        .modal-header h2 {
          font-size: 1.2rem;
          margin: 0;
          color: var(--text-color);
        }

        .close-btn {
          background: none;
          border: none;
          font-size: 1.5rem;
          cursor: pointer;
          color: #6c757d;
        }

        .modal-body {
          padding: 1.5rem;
        }

        .modal-footer {
          padding: 1rem 1.5rem;
          border-top: 1px solid var(--border-color);
          display: flex;
          justify-content: center;
          gap: 12px;
        }

        .passcode-digit-group {
          display: flex;
          gap: 12px;
          justify-content: center;
          margin: 20px 0;
        }

        .passcode-digit {
          width: 55px;
          height: 65px;
          text-align: center;
          font-size: 2rem;
          font-weight: bold;
          font-family: monospace;
          border: 2px solid var(--border-color);
          border-radius: 12px;
          background: var(--input-bg);
          color: var(--text-color);
        }

        .passcode-digit:focus {
          border-color: #0d6efd;
          outline: none;
          box-shadow: 0 0 0 3px rgba(13,110,253,0.2);
        }

        .passcode-error {
          color: #dc3545;
          text-align: center;
          margin-top: 10px;
          font-size: 0.9rem;
        }

        .discard-btn {
          padding: 8px 24px;
          border-radius: 30px;
          border: none;
          background: #6c757d;
          color: #fff;
          cursor: pointer;
          font-weight: 600;
        }

        .discard-btn:hover {
          background: #5a6268;
        }

        .empty-row td {
          text-align: center;
          padding: 40px 0;
          color: #6c757d;
          font-size: 16px;
        }

        .error-banner {
          background: #f8d7da;
          color: #721c24;
          padding: 12px 20px;
          border-radius: 12px;
          margin-bottom: 1rem;
          text-align: center;
        }

        /* Dark theme overrides */
        .dark-theme .stat-card-mini {
          background: #1e1e2f;
          border-color: #444;
        }

        .dark-theme .avatar-small {
          background: linear-gradient(135deg, #2d4b7a, #4b7db3);
        }

        .dark-theme .search-input-full {
          background: #2a2a35;
          border-color: #444;
          color: #e9ecef;
        }

        .dark-theme .filter-select-simple {
          background: #2a2a35;
          border-color: #444;
          color: #e9ecef;
        }

        .dark-theme thead {
          background: #1a1a28;
        }

        .dark-theme table td {
          color: #e9ecef;
        }

        .dark-theme .action-icon {
          background: #2a2a35;
          border-color: #444;
          color: #e9ecef;
        }

        .dark-theme .modal-content {
          background: #1e1e2f;
        }

        .dark-theme .passcode-digit {
          background: #2a2a35;
          border-color: #444;
          color: #fff;
        }

        @media (max-width: 768px) {
          .dashboard-container {
            padding: 16px !important;
            margin-left: 60px !important;
            width: calc(100vw - 60px) !important;
          }
          .stat-card-mini {
            min-width: 80px;
            padding: 0.75rem;
          }
          .stat-info-mini h3 {
            font-size: 1rem;
          }
          .search-actions-row {
            flex-direction: column;
          }
          .filter-group-simple {
            width: 100%;
          }
          .filter-select-simple {
            flex: 1;
            min-width: 0;
          }
        }
      `}</style>

      <Header title="Interest Withdraw Requests" onThemeChange={handleThemeChange} />

      <div className="interest-request-container">
        {apiError && (
          <div className="error-banner">
            <i className="bi bi-exclamation-triangle-fill"></i> {apiError}
          </div>
        )}

        {/* ===== HEADER ===== */}
        <div className="interest-header">
          <div className="interest-title">
            Interest Withdraw Requests
            <small>Shareholder</small>
          </div>
          <div className="pending-badge">
            Pending <span>{requests.filter(r => r.status?.toLowerCase() === 'pending').length}</span>
          </div>
        </div>

        {/* ===== STATS ===== */}
        <div className="stats-row">
          <div className="stat-card-mini">
            <div className="stat-icon-mini total"><i className="bi bi-people-fill"></i></div>
            <div className="stat-info-mini">
              <h3>{requests.length}</h3>
              <p>Total Requests</p>
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="stat-icon-mini pending"><i className="bi bi-clock-history"></i></div>
            <div className="stat-info-mini">
              <h3>{requests.filter(r => r.status?.toLowerCase() === 'pending').length}</h3>
              <p>Pending</p>
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="stat-icon-mini approved"><i className="bi bi-check-circle-fill"></i></div>
            <div className="stat-info-mini">
              <h3>{requests.filter(r => r.status?.toLowerCase() === 'approved').length}</h3>
              <p>Approved</p>
            </div>
          </div>
          <div className="stat-card-mini">
            <div className="stat-icon-mini rejected"><i className="bi bi-x-circle-fill"></i></div>
            <div className="stat-info-mini">
              <h3>{requests.filter(r => r.status?.toLowerCase() === 'cancel').length}</h3>
              <p>Rejected</p>
            </div>
          </div>
        </div>

        {/* ===== SEARCH & FILTER ===== */}
        <div className="search-actions-row">
          <div className="search-bar-wrapper">
            <i className="bi bi-search search-icon"></i>
            <input
              type="text"
              placeholder="Search by name or ID..."
              className="search-input-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="filter-group-simple">
            <select
              className="filter-select-simple"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="cancel">Rejected</option>
            </select>
          </div>
        </div>

        {/* ===== TABLE ===== */}
        <div className="table-responsive">
          <table>
            <thead>
              <tr>
                <th>No.</th>
                <th>Shareholder</th>
                <th>Request Amount (MMK)</th>
                <th>Request Date</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRequests.length === 0 ? (
                <tr className="empty-row">
                  <td colSpan="6">📭 No withdraw requests found.</td>
                </tr>
              ) : (
                filteredRequests.map((req, index) => (
                  <tr key={req.id}>
                    <td>{index + 1}</td>
                    <td>
                      <div className="shareholder-cell">
                        <div className="avatar-small">
                          {req.fullName?.charAt(0).toUpperCase() || 'U'}
                        </div>
                        <div>
                          <div className="shareholder-name">{req.fullName}</div>
                          <div className="shareholder-id">ID: {req.shareholder_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="amount-cell">{formatCurrency(req.interestRequestAmount)}</td>
                    <td>{formatDate(req.requestDate)}</td>
                    <td>
                      <span className={getStatusBadgeClass(req.status)}>
                        {getStatusLabel(req.status)}
                      </span>
                    </td>
                    <td className="actions-cell">
                      {req.status?.toLowerCase() === 'pending' ? (
                        <>
                          <div className="action-group">
                            <button
                              className="action-icon approve"
                              title="Approve"
                              onClick={() => handleApprove(req)}
                            >
                              <i className="bi bi-check-lg"></i>
                            </button>
                            <button
                              className="action-icon reject"
                              title="Reject"
                              onClick={() => handleReject(req)}
                            >
                              <i className="bi bi-x-lg"></i>
                            </button>
                          </div>
                          <div className="action-group" style={{ fontSize: '11px', color: '#6c757d' }}>
                            <i className="bi bi-info-circle"></i> Passcode required
                          </div>
                        </>
                      ) : (
                        <div className="action-group">
                          <button
                            className="action-icon view"
                            title="View Details"
                            onClick={() => alert(`Request #${req.id}\nShareholder: ${req.fullName}\nAmount: ${formatCurrency(req.interestRequestAmount)} MMK\nStatus: ${getStatusLabel(req.status)}`)}
                          >
                            <i className="bi bi-eye"></i>
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ===== PASSCODE MODAL ===== */}
      {showPasscodeModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="bi bi-shield-lock"></i> Security Verification</h2>
              <button className="close-btn" onClick={closeModal}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <p style={{ textAlign: 'center' }}>
                Enter 6‑digit passcode to <strong>{pendingAction === 'approve' ? 'Approve' : 'Reject'}</strong> this request
              </p>
              <div className="passcode-digit-group">
                {[0, 1, 2, 3, 4, 5].map((idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="password"
                    maxLength="1"
                    className="passcode-digit"
                    value={passcodeDigits[idx] || ''}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    inputMode="numeric"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
              {passcodeError && <div className="passcode-error">{passcodeError}</div>}
            </div>
            <div className="modal-footer">
              <button className="discard-btn" onClick={closeModal}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InterestRequest;