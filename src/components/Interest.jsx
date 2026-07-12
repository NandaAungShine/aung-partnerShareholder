import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'development' ? '' : 'http://130.94.21.185:5000';

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

function Interest() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [shareholdersList, setShareholdersList] = useState([]);
  const [selectedShareholderId, setSelectedShareholderId] = useState('');
  const [selectedShareholderName, setSelectedShareholderName] = useState('');
  const [sharePrice, setSharePrice] = useState(0);
  const [currentShares, setCurrentShares] = useState(0);
  const [dividendRate, setDividendRate] = useState('');
  const [shareQuantity, setShareQuantity] = useState('');
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [apiError, setApiError] = useState('');

  const [pastTransactions, setPastTransactions] = useState([]);
  const [selectedTransaction, setSelectedTransaction] = useState(null);
  const [showTransactionDropdown, setShowTransactionDropdown] = useState(false);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeDigits, setPasscodeDigits] = useState(['', '', '', '', '', '']);
  const [passcodeError, setPasscodeError] = useState('');
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];

  useEffect(() => {
    document.body.classList.toggle('dark-mode', isDarkMode);
    document.body.classList.toggle('light-mode', !isDarkMode);
  }, [isDarkMode]);

  const handleThemeChange = (isDark) => {
    setIsDarkMode(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  const fetchShareholdersList = async () => {
    setLoading(true);
    setApiError('');
    try {
      const usersRes = await api.get('/auth/register/list');
      let users = [];
      if (usersRes.data?.success && Array.isArray(usersRes.data.data)) users = usersRes.data.data;
      else if (Array.isArray(usersRes.data)) users = usersRes.data;
      const userMap = new Map();
      users.forEach(u => { if (u.id) userMap.set(u.id, u.username || u.full_name || `User ${u.id}`); });

      const shareRes = await api.get('/api/share/list/');
      let shares = [];
      if (shareRes.data?.success && Array.isArray(shareRes.data.data)) shares = shareRes.data.data;
      else if (Array.isArray(shareRes.data)) shares = shareRes.data;

      const aggregated = new Map();
      shares.forEach(share => {
        const sid = share.shareholder_id;
        const qty = Number(share.share_quantity) || 0;
        const price = Number(share.price_per_share) || 0;
        if (!aggregated.has(sid)) {
          aggregated.set(sid, {
            id: sid,
            name: userMap.get(sid) || `User ${sid}`,
            share_quantity: qty,
            price_per_share: price,
            share_id: share.id,
          });
        } else {
          const existing = aggregated.get(sid);
          existing.share_quantity += qty;
        }
      });
      setShareholdersList(Array.from(aggregated.values()));
    } catch (error) {
      console.error(error);
      setApiError('Failed to load data from API.');
      setShareholdersList([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchShareholdersList(); }, []);

  const parseDateFixed = (dateValue) => {
    if (!dateValue) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    try {
      let d = new Date(dateValue);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      }
    } catch(e) {}
    return null;
  };

  const formatDisplayDate = (dateStr) => {
    if (!dateStr) return '-';
    const match = dateStr.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) return `${match[3]}/${match[2]}/${match[1]}`;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
  };

  const fetchTransactionsFromAPI = async (shareholderId) => {
    if (!shareholderId) return;
    setLoadingTransactions(true);
    try {
      const response = await api.get(`/api/list/buy/status/${shareholderId}`);
      let transactionsData = [];
      if (response.data?.success && Array.isArray(response.data.data)) {
        transactionsData = response.data.data;
      } else if (Array.isArray(response.data)) {
        transactionsData = response.data;
      } else if (response.data?.transactions && Array.isArray(response.data.transactions)) {
        transactionsData = response.data.transactions;
      }

      const buyTransactions = transactionsData.filter(tx => 
        tx.status && tx.status.toLowerCase() === 'buy'
      );

      const formatted = buyTransactions.map(tx => {
        let parsedDate = parseDateFixed(tx.purchase_date) ||
                         parseDateFixed(tx.date) ||
                         parseDateFixed(tx.transaction_date) ||
                         parseDateFixed(tx.created_at) ||
                         new Date().toISOString().split('T')[0];
        let shares = Number(tx.share_quantity) || Number(tx.shares) || 0;
        let price = Number(tx.share_price) || Number(tx.price) || 0;

        return {
          id: tx.id || Date.now(),
          type: 'BUY',
          shares: shares,
          price: price,
          date: parsedDate,
          totalAmount: shares * price,
          percentage: tx.percentage,
        };
      }).filter(tx => tx.shares > 0 && tx.price > 0);
      
      formatted.sort((a,b) => new Date(b.date) - new Date(a.date));
      setPastTransactions(formatted);
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setPastTransactions([]);
    } finally {
      setLoadingTransactions(false);
    }
  };

  useEffect(() => {
    if (selectedShareholderId) {
      fetchTransactionsFromAPI(selectedShareholderId);
    } else {
      setPastTransactions([]);
      setSelectedTransaction(null);
    }
  }, [selectedShareholderId]);

  const handleSelectShareholder = (id) => {
    const selected = shareholdersList.find(sh => sh.id === id);
    if (selected) {
      setSelectedShareholderId(selected.id);
      setSelectedShareholderName(selected.name);
      setSharePrice(selected.price_per_share);
      setCurrentShares(selected.share_quantity);
      setDividendRate('');
      setShareQuantity('');
      setSearchTerm('');
      setSelectedTransaction(null);
      setShowTransactionDropdown(false);
    }
  };

  const handleTransactionSelect = (tx) => {
    setSelectedTransaction(tx);
    setShowTransactionDropdown(false);
    setShareQuantity(tx.shares.toString());
    setSharePrice(tx.price);
  };

  const clearSelectedTransaction = () => {
    setSelectedTransaction(null);
    setShareQuantity('');
    setDividendRate('');
  };

  // ================================================================
  // applyDividend – Passcode sent via header only
  // ================================================================
  const applyDividend = async (passcode) => {
    if (!selectedShareholderId || !selectedTransaction) return;

    const rate = parseFloat(dividendRate);
    const baseShares = selectedTransaction.shares;
    const priceForDividend = selectedTransaction.price;

    if (isNaN(baseShares) || baseShares <= 0) {
      alert('Invalid share quantity from selected transaction.');
      setShowPasscodeModal(false);
      return;
    }
    if (isNaN(rate) || rate <= 0) {
      alert('Dividend Rate must be greater than 0');
      setShowPasscodeModal(false);
      return;
    }

    setApplying(true);
    try {
      const today = new Date().toISOString().split('T')[0];
      const passcodeNum = Number(passcode);
      const shareholderIdNum = Number(selectedShareholderId);
      
      const payload = {
        shareholder_id: shareholderIdNum,
        share_quantity: baseShares,
        share_price: priceForDividend,
        purchase_date: today,
        percentage: rate,
        status: 'dividend',
      };
      console.log('📤 Dividend payload:', payload);
      await api.post('/api/create/share/transactions', payload, {
        headers: { 'x-passcode': passcodeNum }
      });
      console.log('✅ Dividend transaction created');

      console.log('⏳ Waiting 1500ms for DB commit...');
      await new Promise(resolve => setTimeout(resolve, 1500));

      window.dispatchEvent(new CustomEvent('dividendApplied', {
        detail: { shareholderId: shareholderIdNum }
      }));
      console.log('📢 dividendApplied event dispatched for shareholder:', shareholderIdNum);

      localStorage.setItem('dividendTrigger', Date.now());
      console.log('📢 dividendTrigger set in localStorage');

      window.dispatchEvent(new CustomEvent('shareholderRefresh'));

      const profitAmount = baseShares * priceForDividend * rate / 100;
      alert(`✅ Dividend recorded for ${selectedShareholderName}\n` +
            `Base shares: ${baseShares}\n` +
            `Price per share: ${priceForDividend} MMK\n` +
            `Dividend rate: ${rate}%\n` +
            `Profit amount: ${profitAmount.toFixed(2)} MMK`);

      await fetchShareholdersList();
      await fetchTransactionsFromAPI(selectedShareholderId);

      setDividendRate('');
      setShareQuantity('');
      setSelectedShareholderId('');
      setSelectedShareholderName('');
      setSharePrice(0);
      setCurrentShares(0);
      setSearchTerm('');
      setSelectedTransaction(null);
      setShowTransactionDropdown(false);
    } catch (error) {
      console.error('❌ Dividend error:', error);
      if (error.response) {
        const errorMsg = error.response.data?.message || error.response.data?.error || JSON.stringify(error.response.data);
        alert(`Server error (${error.response.status}): ${errorMsg}`);
      } else if (error.request) {
        alert('No response from server. Check network/CORS.');
      } else {
        alert(`Error: ${error.message}`);
      }
    } finally {
      setApplying(false);
      setShowPasscodeModal(false);
      setPasscodeDigits(['','','','','','']);
    }
  };

  const handleApplyDividend = () => {
    if (!selectedShareholderId) {
      alert('Please select a shareholder first.');
      return;
    }
    if (!selectedTransaction) {
      alert('Please select a past transaction to apply dividend on.');
      return;
    }
    const rate = parseFloat(dividendRate);
    if (isNaN(rate) || rate <= 0) {
      alert('Please enter a valid Dividend Rate (%) greater than 0.');
      return;
    }
    setPasscodeDigits(['','','','','','']);
    setPasscodeError('');
    setShowPasscodeModal(true);
    setTimeout(() => inputRefs[0]?.current?.focus(), 50);
  };

  const handleDigitChange = (index, value) => {
    if (value !== '' && !/^[0-9]$/.test(value)) {
      setPasscodeError('Passcode must be number!');
      return;
    }
    setPasscodeError('');
    const newDigits = [...passcodeDigits];
    newDigits[index] = value;
    setPasscodeDigits(newDigits);
    if (value && index < 5) inputRefs[index+1]?.current?.focus();
    if (newDigits.every(d => d !== '')) {
      const fullPasscode = newDigits.join('');
      applyDividend(fullPasscode);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !passcodeDigits[index] && index > 0) {
      inputRefs[index-1]?.current?.focus();
    }
  };

  const closeModal = () => {
    setShowPasscodeModal(false);
    setPasscodeDigits(['','','','','','']);
    setPasscodeError('');
  };

  const formatCurrency = (val) => (val || 0).toLocaleString();

  const filteredList = shareholdersList.filter(sh =>
    sh.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sh.id.toString().includes(searchTerm)
  );

  if (loading && shareholdersList.length === 0) {
    return (
      <div className="dashboard-container">
        <Header title="Share Dividend Calculator" onThemeChange={handleThemeChange} />
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="spinner-border text-primary" role="status"><span className="visually-hidden">Loading...</span></div>
          <p className="ms-2">Loading shareholders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <Header title="Share Dividend Calculator" onThemeChange={handleThemeChange} />
      {/* ====== FIX: Sidebar နဲ့ ကွာနေတဲ့ နေရာလွတ် (White Gap) ကို ဖယ်ရှားပြီး width အပြည့်ယူမယ် ====== */}
      <style>{`
        /* ----- Main Layout Fix (Sidebar နဲ့ ကပ်အောင် ချိန်ညှိထား) ----- */
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

        /* မူရင်း Interest CSS အားလုံးကို အောက်မှာ ဆက်ထားမယ် */
        .dividend-container { max-width: 600px; width: 100%; margin: 2rem auto; padding: 0 1rem; }
        .dividend-card { background: var(--card-bg); border-radius: 24px; padding: 2rem; box-shadow: 0 8px 20px rgba(0,0,0,0.05); }
        .form-group { margin-bottom: 1.5rem; }
        .form-group label { display: block; font-weight: 600; margin-bottom: 0.5rem; color: var(--text-color); }
        .form-control, .form-select { width: 100%; padding: 0.75rem 1rem; border: 1px solid var(--border-color); border-radius: 12px; background: var(--input-bg); color: var(--text-color); font-size: 1rem; }
        .btn-apply { width: 100%; padding: 0.75rem; background: #198754; color: white; border: none; border-radius: 12px; font-weight: 600; cursor: pointer; }
        .btn-apply:hover { background: #157347; }
        .btn-secondary { background: #6c757d; margin-top: 0.5rem; width: 100%; padding: 0.75rem; border: none; border-radius: 12px; color: white; cursor: pointer; }
        .info-text { font-size: 0.85rem; color: #6c757d; margin-top: 0.5rem; }
        .error-message { color: #dc3545; background: #f8d7da; padding: 0.75rem; border-radius: 12px; margin-bottom: 1rem; text-align: center; }
        .modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.6); display:flex; align-items:center; justify-content:center; z-index:10000; }
        .modal-content { background: var(--card-bg); border-radius: 24px; padding: 1.5rem; max-width:450px; width:90%; }
        .passcode-digit-group { display:flex; gap:12px; justify-content:center; margin:20px 0; }
        .passcode-digit { width:60px; height:70px; text-align:center; font-size:2rem; font-weight:bold; font-family:monospace; border:2px solid #dee2e6; border-radius:12px; background:var(--input-bg); color:var(--text-color); }
        .passcode-digit:focus { border-color:#0d6efd; outline:none; }
        .passcode-error { color:#dc3545; text-align:center; margin-top:10px; }
        .close-btn { background:none; border:none; font-size:1.5rem; cursor:pointer; float:right; }
        .discard-btn { background:#6c757d; color:white; border:none; padding:0.5rem 1.5rem; border-radius:8px; cursor:pointer; }
        .searchable-select { position:relative; }
        .search-input { width:100%; padding:0.75rem 1rem; border:1px solid var(--border-color); border-radius:12px; background:var(--input-bg); color:var(--text-color); font-size:1rem; }
        .dropdown-list { position:absolute; top:100%; left:0; right:0; max-height:200px; overflow-y:auto; background:var(--card-bg); border:1px solid var(--border-color); border-radius:12px; z-index:10; list-style:none; padding:0; margin:4px 0 0; }
        .dropdown-list li { padding:10px 15px; cursor:pointer; color:var(--text-color); }
        .dropdown-list li:hover { background:rgba(13,110,253,0.1); }
        .selected-transaction-card { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 0.75rem; margin-top: 0.5rem; display: flex; justify-content: space-between; align-items: center; }
        .clear-btn { background: #dc3545; color: white; border: none; border-radius: 20px; padding: 4px 12px; cursor: pointer; }
        .form-control:disabled, .form-control[readonly] { background: var(--input-bg) !important; color: var(--text-color) !important; opacity: 0.8; }
        .dark-theme .info-text { color: #adb5bd; }
        .dark-theme .error-message { background: #2d1a1a; color: #f8a5a5; }
      `}</style>

      <div className="dividend-container">
        <div className="dividend-card">
          <h3><i className="bi bi-percent"></i> Share Dividend</h3>
          {apiError && <div className="error-message"><i className="bi bi-exclamation-triangle-fill"></i> {apiError}</div>}
          <div className="form-group">
            <label>Select Shareholder (Search by ID or Name)</label>
            <div className="searchable-select">
              <input type="text" className="search-input" placeholder="🔍 Enter ID or Name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} disabled={loading || shareholdersList.length === 0} />
              {searchTerm && !loading && shareholdersList.length > 0 && (
                <ul className="dropdown-list">
                  {filteredList.length === 0 && <li>No results found</li>}
                  {filteredList.map(sh => (<li key={sh.id} onClick={() => handleSelectShareholder(sh.id)}>#{sh.id} - {sh.name}</li>))}
                </ul>
              )}
            </div>
            {selectedShareholderId && (<div className="info-text" style={{ marginTop:'8px' }}>Selected: <strong>{selectedShareholderName}</strong> (ID: {selectedShareholderId})</div>)}
          </div>
          <div className="form-group"><label>Total Holder Shares (All Transactions)</label><input type="text" className="form-control" value={currentShares ? currentShares.toLocaleString() : '-'} disabled readOnly /></div>
          {selectedShareholderId && (
            <div className="form-group">
              <label>Past Transactions (Select one to apply dividend on)</label>
              {!selectedTransaction ? (
                <div>
                  <button type="button" className="btn-secondary" onClick={() => setShowTransactionDropdown(!showTransactionDropdown)} style={{ background:'#0d6efd', marginBottom:'0.5rem' }}>
                    {showTransactionDropdown ? 'Hide' : 'Show'} Transactions
                  </button>
                  {showTransactionDropdown && (
                    <div>
                      {loadingTransactions && <div className="info-text">Loading transactions...</div>}
                      {!loadingTransactions && pastTransactions.length > 0 && (
                        <div className="transaction-select" style={{ maxHeight:'200px', overflowY:'auto', border:'1px solid var(--border-color)', borderRadius:'12px' }}>
                          {pastTransactions.map(tx => (
                            <div key={tx.id} onClick={() => handleTransactionSelect(tx)} style={{ padding:'8px 12px', cursor:'pointer', borderBottom:'1px solid var(--border-color)' }}>
                              {tx.shares.toLocaleString()} shares @ {formatCurrency(tx.price)} MMK on {formatDisplayDate(tx.date)}
                            </div>
                          ))}
                        </div>
                      )}
                      {!loadingTransactions && pastTransactions.length === 0 && <div className="info-text">No buy transactions found.</div>}
                    </div>
                  )}
                </div>
              ) : (
                <div>
                  <div className="selected-transaction-card">
                    <div><strong>{selectedTransaction.shares.toLocaleString()} shares</strong><br />@ {formatCurrency(selectedTransaction.price)} MMK on {formatDisplayDate(selectedTransaction.date)}</div>
                    <button className="clear-btn" onClick={clearSelectedTransaction}>Clear</button>
                  </div>
                  <div className="info-text" style={{ marginTop: '8px', color: '#0d6efd' }}>Dividend will be applied on these {selectedTransaction.shares.toLocaleString()} base shares at {formatCurrency(selectedTransaction.price)} MMK per share.</div>
                </div>
              )}
            </div>
          )}
          <div className="form-group"><label>Price per Share (MMK)</label><input type="text" className="form-control" value={sharePrice ? formatCurrency(sharePrice) : '-'} disabled readOnly /></div>
          <div className="form-group"><label>Shares for Dividend (auto-filled)</label><input type="number" className="form-control" value={shareQuantity} readOnly disabled /><div className="info-text">Fixed from selected transaction.</div></div>
          <div className="form-group"><label>Dividend Rate (%)</label><input type="number" className="form-control" value={dividendRate} onChange={(e) => setDividendRate(e.target.value)} placeholder="e.g., 10" step="any" disabled={!selectedShareholderId} /><div className="info-text">Profit amount = shares × price × rate%</div></div>
          <button className="btn-apply" onClick={handleApplyDividend} disabled={!selectedShareholderId || !selectedTransaction || applying}>{applying ? <i className="bi bi-hourglass-split"></i> : <i className="bi bi-check-circle"></i>} Apply Dividend</button>
        </div>
      </div>

      {showPasscodeModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}><h3><i className="bi bi-shield-lock"></i> Security Verification</h3><button className="close-btn" onClick={closeModal}><i className="bi bi-x-lg"></i></button></div>
            <div><p style={{ textAlign:'center' }}>Enter 6‑digit passcode to apply dividend</p><div className="passcode-digit-group">{[...Array(6)].map((_, idx) => (<input key={idx} ref={inputRefs[idx]} type="password" maxLength="1" className="passcode-digit" value={passcodeDigits[idx]} onChange={(e) => handleDigitChange(idx, e.target.value)} onKeyDown={(e) => handleKeyDown(idx, e)} inputMode="numeric" autoFocus={idx === 0} />))}</div>{passcodeError && <div className="passcode-error">{passcodeError}</div>}</div>
            <div style={{ textAlign:'center', marginTop:'1rem' }}><button className="discard-btn" onClick={closeModal}>Cancel</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Interest;