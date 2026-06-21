import React, { useState, useEffect, useRef, useCallback } from 'react';
import Header from './Header';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'development' ? '' : 'http://130.94.23.117:5000';

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

function ShareholderTrade() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [accounts, setAccounts] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');

  const [transactionType, setTransactionType] = useState('buy');
  const [shareAmount, setShareAmount] = useState('');
  const [sharePrice, setSharePrice] = useState('');
  const [transactionDateDisplay, setTransactionDateDisplay] = useState(() => {
    const today = new Date();
    return `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;
  });
  const [transactionDateApi, setTransactionDateApi] = useState(() => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  });
  const [dateError, setDateError] = useState('');
  const [error, setError] = useState('');

  const [transactions, setTransactions] = useState([]);
  const [filterType, setFilterType] = useState('ALL');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeDigits, setPasscodeDigits] = useState(['', '', '', '', '', '']);
  const [passcodeError, setPasscodeError] = useState('');
  const [pendingTransaction, setPendingTransaction] = useState(null);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const hiddenDateInputRef = useRef(null);

  const [totals, setTotals] = useState({
    totalShares: 0,
    totalInvestment: 0,
    totalDividendProfit: 0,
    lastInterestEntries: [],
  });

  const lastSentPayloadRef = useRef({
    shareholder_id: null,
    quantity: null,
    amount: null,
    revenue: null,
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const handleThemeChange = (isDark) => {
    setIsDarkMode(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  // Date display only - no picker interaction
  const apiToDisplayDate = (apiDate) => {
    if (!apiDate) return '';
    const [year, month, day] = apiDate.split('-');
    return `${day}/${month}/${year}`;
  };

  // No longer used for picking, but keep for initial display
  const handleNativeDateChange = (e) => {
    // Disabled – do nothing
  };

  const openDatePicker = () => {
    // Disabled – do nothing
  };

  const fetchShareRecord = async (shareholderId) => {
    try {
      const shareResponse = await api.get('/api/share/list/');
      let shareData = [];
      if (shareResponse.data?.success && Array.isArray(shareResponse.data.data)) {
        shareData = shareResponse.data.data;
      } else if (Array.isArray(shareResponse.data)) {
        shareData = shareResponse.data;
      }
      const userShares = shareData.filter(s => Number(s.shareholder_id) === Number(shareholderId));
      let totalShares = 0;
      let totalInvestment = 0;
      let shareClass = 'level1';
      let pricePerShare = 0;
      let shareId = null;
      userShares.forEach(share => {
        totalShares += Number(share.share_quantity) || 0;
        totalInvestment += Number(share.total_investment) || 0;
        if (!shareId) shareId = share.id;
        if (share.price_per_share) pricePerShare = Number(share.price_per_share);
        if (share.share_class) shareClass = share.share_class;
      });
      return { totalShares, totalInvestment, shareClass, pricePerShare, shareId };
    } catch (err) {
      console.error('Failed to fetch share record:', err);
      return { totalShares: 0, totalInvestment: 0, shareClass: 'level1', pricePerShare: 0, shareId: null };
    }
  };

  const fetchAccountsList = async () => {
    setApiError('');
    try {
      const usersResponse = await api.get('/auth/register/list');
      let users = [];
      if (usersResponse.data?.success && usersResponse.data.data) {
        users = Array.isArray(usersResponse.data.data) ? usersResponse.data.data : (usersResponse.data.data.data || []);
      } else if (Array.isArray(usersResponse.data)) {
        users = usersResponse.data;
      }
      const activeUsers = users.filter(u => u.status !== 'rejected' && u.status !== 'cancelled');

      const shareResponse = await api.get('/api/share/list/');
      let shareData = [];
      if (shareResponse.data?.success && Array.isArray(shareResponse.data.data)) {
        shareData = shareResponse.data.data;
      } else if (Array.isArray(shareResponse.data)) {
        shareData = shareResponse.data;
      }

      const shareMap = new Map();
      shareData.forEach(share => {
        const sid = share.shareholder_id;
        if (!shareMap.has(sid)) {
          shareMap.set(sid, {
            shareId: share.id,
            shareClass: share.share_class || 'level1',
            pricePerShare: Number(share.price_per_share) || 0,
            totalShares: Number(share.share_quantity) || 0,
            totalInvestment: Number(share.total_investment) || 0,
          });
        } else {
          const existing = shareMap.get(sid);
          existing.totalShares += Number(share.share_quantity) || 0;
          existing.totalInvestment += Number(share.total_investment) || 0;
        }
      });

      const accountList = activeUsers.map(u => {
        const shareInfo = shareMap.get(u.id) || {
          shareId: null,
          shareClass: 'level1',
          pricePerShare: 0,
          totalShares: 0,
          totalInvestment: 0,
        };
        return {
          id: u.id,
          name: u.username || u.full_name || `User ${u.id}`,
          shareId: shareInfo.shareId,
          shareClass: shareInfo.shareClass,
          pricePerShare: shareInfo.pricePerShare,
          totalSharesFromRecord: shareInfo.totalShares,
          totalInvestmentFromRecord: shareInfo.totalInvestment,
        };
      });
      return accountList;
    } catch (error) {
      console.error('Fetch accounts error:', error);
      setApiError('Failed to load shareholder list.');
      return [];
    }
  };

  const parseDateFixed = (dateValue) => {
    if (!dateValue) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) return dateValue;
    const isoMatch = dateValue.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;
    try {
      let d = new Date(dateValue);
      if (!isNaN(d.getTime())) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      }
    } catch (e) {}
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

  const fetchDividendTransactions = async (shareholderId) => {
    try {
      const response = await api.get(`/api/list/dividend/status/${shareholderId}`);
      let dividendData = [];
      if (response.data?.success && Array.isArray(response.data.data)) {
        dividendData = response.data.data;
      } else if (Array.isArray(response.data)) {
        dividendData = response.data;
      } else if (response.data?.transactions && Array.isArray(response.data.transactions)) {
        dividendData = response.data.transactions;
      }
      return dividendData.map(tx => {
        let parsedDate = parseDateFixed(tx.purchase_date) ||
                         parseDateFixed(tx.date) ||
                         parseDateFixed(tx.transaction_date) ||
                         parseDateFixed(tx.created_at) ||
                         new Date().toISOString().split('T')[0];
        let shares = Number(tx.share_quantity) || Number(tx.shares) || 0;
        let price = Number(tx.share_price) || Number(tx.price) || 0;
        let percentage = Number(tx.percentage) || 0;
        const profitAmount = shares * price * (percentage / 100);
        return {
          id: tx.id || Date.now(),
          type: 'DIVIDEND',
          shares: shares,
          price: price,
          date: parsedDate,
          percentage: percentage,
          totalAmount: shares * price,
          profitAmount: profitAmount,
        };
      }).filter(tx => tx.shares > 0);
    } catch (err) {
      console.warn('Failed to fetch dividend transactions:', err.message);
      return [];
    }
  };

  const sendTotalsToMobile = useCallback(async (shareholderId, totalShares, totalInvestment, totalDividendProfit) => {
    if (!shareholderId) return;

    const currentPayload = {
      shareholder_id: shareholderId,
      quantity: totalShares,
      amount: totalInvestment,
      revenue: totalDividendProfit,
    };

    const last = lastSentPayloadRef.current;
    if (
      last.shareholder_id === currentPayload.shareholder_id &&
      last.quantity === currentPayload.quantity &&
      last.amount === currentPayload.amount &&
      last.revenue === currentPayload.revenue
    ) {
      console.log('⏭️ Skipping duplicate totals POST (data unchanged)');
      return;
    }

    try {
      await api.post('/api/insert/last-amount/', currentPayload);
      console.log('✅ Totals sent to mobile successfully');
      lastSentPayloadRef.current = currentPayload;
    } catch (error) {
      console.error('❌ Failed to send totals to mobile:', error.response?.data || error.message);
    }
  }, []);

  const fetchAllTransactions = useCallback(async (shareholderId) => {
    console.log('🔄 fetchAllTransactions started');
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

      const formattedMain = transactionsData.map(tx => {
        let parsedDate = parseDateFixed(tx.purchase_date) ||
                         parseDateFixed(tx.date) ||
                         parseDateFixed(tx.transaction_date) ||
                         parseDateFixed(tx.created_at) ||
                         new Date().toISOString().split('T')[0];
        let type = 'BUY';
        if (tx.status === 'sell') type = 'SELL';
        if (tx.status === 'dividend') return null;

        let shares = Number(tx.share_quantity) || Number(tx.shares) || 0;
        let price = Number(tx.share_price) || Number(tx.price) || 0;
        return {
          id: tx.id || Date.now(),
          type,
          shares,
          price,
          date: parsedDate,
          totalAmount: shares * price,
          percentage: tx.percentage || 0,
        };
      }).filter(tx => tx !== null && (tx.type === 'BUY' || tx.type === 'SELL') && tx.shares > 0);

      const dividendFromApi = await fetchDividendTransactions(shareholderId);

      const allMap = new Map();
      formattedMain.forEach(tx => allMap.set(tx.id, tx));
      dividendFromApi.forEach(tx => allMap.set(tx.id, tx));

      const unique = Array.from(allMap.values());
      unique.sort((a, b) => new Date(b.date) - new Date(a.date));
      setTransactions(unique);

      let totalShares = 0;
      let baseInvestment = 0;
      let totalDividendProfit = 0;

      unique.forEach(tx => {
        if (tx.type === 'BUY') {
          totalShares += tx.shares;
          baseInvestment += tx.shares * tx.price;
        } else if (tx.type === 'SELL') {
          totalShares -= tx.shares;
          baseInvestment -= tx.shares * tx.price;
        } else if (tx.type === 'DIVIDEND') {
          const profit = tx.profitAmount || 0;
          totalDividendProfit += profit;
        }
      });

      const totalInvestment = baseInvestment + totalDividendProfit;

      const dividendTxs = unique.filter(tx => tx.type === 'DIVIDEND');
      const lastInterestEntries = dividendTxs.map(tx => ({
        name: `${tx.shares} shares @ ${formatCurrency(tx.price)} MMK`,
        totalBalance: tx.totalAmount,
        interest: tx.profitAmount,
      }));

      setTotals({
        totalShares,
        totalInvestment,
        totalDividendProfit,
        lastInterestEntries,
      });

      console.log('🧮 Totals recalculated', { totalShares, totalInvestment, totalDividendProfit });

      await sendTotalsToMobile(shareholderId, totalShares, totalInvestment, totalDividendProfit);

      return { totalShares, totalInvestment, totalDividendProfit, lastInterestEntries };
    } catch (error) {
      console.error('Failed to fetch transactions:', error);
      setTransactions([]);
      setTotals({
        totalShares: 0,
        totalInvestment: 0,
        totalDividendProfit: 0,
        lastInterestEntries: [],
      });
      return { totalShares: 0, totalInvestment: 0, totalDividendProfit: 0, lastInterestEntries: [] };
    } finally {
      setLoadingTransactions(false);
    }
  }, [sendTotalsToMobile]);

  const fetchTransactionsWithDelay = useCallback((shareholderId, isDividendTrigger = false, retryCount = 0) => {
    const doFetch = async () => {
      try {
        await fetchAllTransactions(shareholderId);
        console.log(`✅ fetchAllTransactions completed successfully (attempt ${retryCount + 1})`);
      } catch (error) {
        console.error(`❌ fetchAllTransactions failed on attempt ${retryCount + 1}:`, error);
      }
    };

    if (isDividendTrigger) {
      const delay = 1500 + (retryCount * 500);
      console.log(`⏳ Dividend trigger, waiting ${delay}ms (attempt ${retryCount + 1})...`);
      setTimeout(() => {
        doFetch();
        if (retryCount < 2) {
          setTimeout(() => {
            fetchTransactionsWithDelay(shareholderId, true, retryCount + 1);
          }, 500);
        }
      }, delay);
    } else {
      doFetch();
    }
  }, [fetchAllTransactions]);

  // ========== useEffect ==========

  useEffect(() => {
    if (selectedAccount) {
      fetchAllTransactions(selectedAccount.id);
    } else {
      setTransactions([]);
      setTotals({
        totalShares: 0,
        totalInvestment: 0,
        totalDividendProfit: 0,
        lastInterestEntries: [],
      });
    }
  }, [selectedAccount, fetchAllTransactions]);

  useEffect(() => {
    if (!selectedAccount) return;
    const intervalId = setInterval(() => {
      fetchAllTransactions(selectedAccount.id);
    }, 10000);
    return () => clearInterval(intervalId);
  }, [selectedAccount, fetchAllTransactions]);

  useEffect(() => {
    if (!selectedAccount) return;
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchAllTransactions(selectedAccount.id);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [selectedAccount, fetchAllTransactions]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'dividendTrigger' && selectedAccount) {
        console.log('📢 Storage event detected (dividendTrigger), refreshing with delay...');
        fetchTransactionsWithDelay(selectedAccount.id, true);
      }
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, [selectedAccount, fetchTransactionsWithDelay]);

  useEffect(() => {
    const handleDividendApplied = async (event) => {
      console.log("🔥 dividendApplied received", event.detail);
      if (!selectedAccount) {
        console.warn("⚠️ No selected account, skipping refresh");
        return;
      }
      const eventShareholderId = Number(event.detail?.shareholderId);
      const currentId = Number(selectedAccount.id);
      
      if (eventShareholderId !== currentId) {
        console.log(`⏭️ Skipping (event ID: ${eventShareholderId}, current ID: ${currentId})`);
        return;
      }

      fetchTransactionsWithDelay(currentId, true);
    };
    window.addEventListener('dividendApplied', handleDividendApplied);
    return () => window.removeEventListener('dividendApplied', handleDividendApplied);
  }, [selectedAccount, fetchTransactionsWithDelay]);

  useEffect(() => {
    const refreshHandler = () => {
      if (selectedAccount) {
        fetchAllTransactions(selectedAccount.id);
      }
    };
    window.addEventListener('shareholderRefresh', refreshHandler);
    return () => window.removeEventListener('shareholderRefresh', refreshHandler);
  }, [selectedAccount, fetchAllTransactions]);

  useEffect(() => {
    if (!selectedAccount) return;
    const trigger = localStorage.getItem('dividendTrigger');
    if (trigger) {
      const time = parseInt(trigger, 10);
      if (Date.now() - time < 10000) {
        console.log('📢 Mount: dividendTrigger found, refreshing with retry...');
        fetchTransactionsWithDelay(selectedAccount.id, true);
        localStorage.removeItem('dividendTrigger');
        return;
      }
      localStorage.removeItem('dividendTrigger');
    }
  }, []);

  const loadAccounts = async () => {
    setLoading(true);
    const accountList = await fetchAccountsList();
    setAccounts(accountList);
    setLoading(false);
  };

  useEffect(() => { loadAccounts(); }, []);

  const recalcAndUpdateShareRecord = async (shareholderId, passcodeNum) => {
    const response = await api.get(`/api/list/buy/status/${shareholderId}`);
    let transactionsData = [];
    if (response.data?.success && Array.isArray(response.data.data)) {
      transactionsData = response.data.data;
    } else if (Array.isArray(response.data)) {
      transactionsData = response.data;
    } else if (response.data?.transactions && Array.isArray(response.data.transactions)) {
      transactionsData = response.data.transactions;
    }

    let totalShares = 0;
    let totalInvestment = 0;
    let firstBuyPrice = 0;

    for (const tx of transactionsData) {
      let status = (tx.status || '').toLowerCase();
      let shares = Number(tx.share_quantity) || 0;
      let price = Number(tx.share_price) || 0;
      if (status === 'buy') {
        totalShares += shares;
        totalInvestment += shares * price;
        if (firstBuyPrice === 0 && shares > 0) firstBuyPrice = price;
      } else if (status === 'sell') {
        totalShares -= shares;
      }
    }

    const shareRecord = await fetchShareRecord(shareholderId);
    const shareClass = shareRecord.shareClass || 'level1';
    const priceToKeep = firstBuyPrice > 0 ? firstBuyPrice : (shareRecord.pricePerShare || 10000);

    const existing = accounts.find(acc => acc.id === shareholderId);
    const hasExisting = existing && existing.shareId && !existing.shareId.toString().startsWith('user_');

    const payload = {
      share_class: shareClass,
      share_quantity: totalShares,
      price_per_share: priceToKeep,
      total_investment: totalInvestment,
      passcode: Number(passcodeNum),
    };

    if (hasExisting) {
      await api.put(`/api/share/update/${existing.shareId}`, payload);
    } else {
      const createPayload = { shareholder_id: shareholderId, ...payload };
      await api.post('/api/share/create', createPayload);
    }
    return { totalShares, totalInvestment };
  };

  const executeTransaction = async (passcode) => {
    if (passcode !== '123456') {
      setPasscodeError('Invalid passcode');
      setPasscodeDigits(['', '', '', '', '', '']);
      inputRefs[0]?.current?.focus();
      return;
    }
    if (!pendingTransaction) return;

    const { type, shares, price } = pendingTransaction;

    let quantity, priceNum, shareholderIdNum, passcodeNum, apiDate;
    try {
      quantity = Number(shares);
      priceNum = Number(price);
      shareholderIdNum = Number(selectedAccount.id);
      passcodeNum = Number(passcode);
      apiDate = transactionDateApi; // still using the stored date

      if (isNaN(quantity) || quantity <= 0) throw new Error('Invalid share amount');
      if (isNaN(priceNum) || priceNum <= 0) throw new Error('Invalid price');
      if (isNaN(shareholderIdNum)) throw new Error('Invalid shareholder ID');
      if (isNaN(passcodeNum)) throw new Error('Invalid passcode');
      if (!apiDate || !/^\d{4}-\d{2}-\d{2}$/.test(apiDate)) {
        apiDate = new Date().toISOString().split('T')[0];
      }
      quantity = Math.floor(quantity);
      priceNum = Math.floor(priceNum);
      shareholderIdNum = Math.floor(shareholderIdNum);
      passcodeNum = Math.floor(passcodeNum);
    } catch (err) {
      alert(err.message);
      setShowPasscodeModal(false);
      return;
    }

    try {
      if (type === 'buy') {
        const transactionPayload = {
          passcode: passcodeNum,
          shareholder_id: shareholderIdNum,
          share_quantity: quantity,
          share_price: priceNum,
          purchase_date: apiDate,
          status: 'buy',
        };
        await api.post('/api/create/share/transactions', transactionPayload);
        console.log('✅ Buy transaction recorded');

        const shareRecord = await fetchShareRecord(shareholderIdNum);
        const newTotalShares = (shareRecord.totalShares || 0) + quantity;
        const newTotalInvestment = (shareRecord.totalInvestment || 0) + (quantity * priceNum);
        const shareClass = shareRecord.shareClass || 'level1';
        const priceToKeep = shareRecord.pricePerShare || priceNum;

        if (!shareRecord.shareId) {
          const createPayload = {
            shareholder_id: shareholderIdNum,
            share_class: shareClass,
            share_quantity: newTotalShares,
            price_per_share: priceToKeep,
            total_investment: newTotalInvestment,
            passcode: passcodeNum,
          };
          await api.post('/api/share/create', createPayload);
          console.log('✅ Share record created');
        } else {
          const updatePayload = {
            share_class: shareClass,
            share_quantity: newTotalShares,
            price_per_share: priceToKeep,
            total_investment: newTotalInvestment,
            passcode: passcodeNum,
          };
          await api.put(`/api/share/update/${shareRecord.shareId}`, updatePayload);
          console.log('✅ Share record updated');
        }

        await fetchAllTransactions(shareholderIdNum);

      } else if (type === 'sell') {
        const sellPayload = {
          passcode: passcodeNum,
          shareholder_id: shareholderIdNum,
          share_quantity: quantity,
          share_price: priceNum,
          purchase_date: apiDate,
          percentage: 0,
          status: 'sell',
        };
        await api.post('/api/create/share/transactions', sellPayload);
        console.log('✅ Sell transaction recorded');

        await recalcAndUpdateShareRecord(shareholderIdNum, passcodeNum);
        await fetchAllTransactions(shareholderIdNum);

      } else {
        throw new Error('Invalid transaction type');
      }

      const refreshed = await fetchAccountsList();
      setAccounts(refreshed);
      const updatedSelected = refreshed.find(acc => acc.id === shareholderIdNum);
      if (updatedSelected) setSelectedAccount(updatedSelected);
      window.dispatchEvent(new CustomEvent('shareholderRefresh'));

      alert(`✅ ${type === 'buy' ? 'Bought' : 'Sold'} ${quantity} shares successfully!`);
    } catch (err) {
      console.error("Transaction error:", err);
      alert(err.response?.data?.message || err.message || 'Transaction failed');
    } finally {
      setShareAmount('');
      setSharePrice('');
      setError('');
      setShowPasscodeModal(false);
      setPendingTransaction(null);
    }
  };

  const handleTransactionSubmit = () => {
    if (!selectedAccount) {
      setError('Please select an account.');
      return;
    }
    if (!transactionDateApi) {
      setDateError('Please select a date');
      return;
    }
    const amount = parseFloat(shareAmount);
    const price = parseFloat(sharePrice);
    if (isNaN(amount) || amount <= 0) {
      setError('Valid share amount required');
      return;
    }
    if (isNaN(price) || price <= 0) {
      setError('Valid price required');
      return;
    }
    if (transactionType === 'sell' && amount > totals.totalShares) {
      setError(`Cannot sell more than ${totals.totalShares} shares`);
      return;
    }
    setPendingTransaction({
      type: transactionType,
      shares: amount,
      price: price,
    });
    setPasscodeDigits(['', '', '', '', '', '']);
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
    if (value && index < 5) inputRefs[index + 1]?.current?.focus();
    if (newDigits.every(d => d !== '')) executeTransaction(newDigits.join(''));
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !passcodeDigits[index] && index > 0) {
      inputRefs[index - 1]?.current?.focus();
    }
  };

  const filteredAccounts = accounts.filter(acc =>
    acc.name.toLowerCase().includes(searchTerm.toLowerCase()) || acc.id.toString().includes(searchTerm)
  );

  const formatCurrency = (val) => (val || 0).toLocaleString();

  const getFilteredTransactions = () => {
    if (filterType === 'ALL') return transactions;
    return transactions.filter(tx => tx.type === filterType);
  };
  const displayedTransactions = getFilteredTransactions();

  if (loading) {
    return (
      <div className="dashboard-container">
        <Header title="Trade Center" onThemeChange={handleThemeChange} />
        <div style={{ textAlign: 'center', padding: '3rem' }}>Loading accounts...</div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <style>{`
        :root { --card-bg: #ffffff; --text-color: #212529; --border-color: #dee2e6; --input-bg: #ffffff; --hover-bg: #f8f9fa; }
        .dark-theme { --card-bg: #1e1e2f; --text-color: #e9ecef; --border-color: #444; --input-bg: #2a2a35; --hover-bg: #2d3d3d; }
        .trade-container { max-width: 1400px; margin: 0 auto; padding: 1rem; }
        .two-columns { display: flex; gap: 1.5rem; flex-wrap: wrap; }
        .left-column { flex: 1.2; min-width: 280px; max-height: 75vh; display: flex; flex-direction: column; overflow: hidden; }
        .account-list-scroll { flex: 1; overflow-y: auto; padding-right: 6px; }
        .right-column { flex: 2; min-width: 380px; max-height: 75vh; overflow-y: auto; padding-right: 6px; }
        @media (max-width: 768px) { .two-columns { flex-direction: column; } .left-column, .right-column { max-height: none; height: auto; } .account-list-scroll { max-height: 50vh; } }
        .account-card { background: var(--card-bg); border-radius: 20px; padding: 1rem 1.2rem; margin-bottom: 0.75rem; cursor: pointer; transition: all 0.2s; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; }
        .account-card:hover { transform: translateX(5px); border-color: #0d6efd; box-shadow: 0 4px 12px rgba(13,110,253,0.15); }
        .account-card.selected { border-color: #0d6efd; background: rgba(13,110,253,0.05); }
        .account-name { font-weight: 600; margin-bottom: 0.25rem; }
        .account-id { font-size: 0.75rem; color: #6c757d; }
        .info-card { background: var(--card-bg); border-radius: 20px; padding: 1.2rem; margin-bottom: 1.5rem; border: 1px solid var(--border-color); }
        .form-group { margin-bottom: 1rem; }
        .form-group label { display: block; margin-bottom: 0.4rem; font-weight: 500; }
        .form-control { width: 100%; padding: 10px 14px; border-radius: 12px; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-color); }
        .btn-group { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .btn-type { flex: 1; padding: 10px; border-radius: 40px; border: none; cursor: pointer; font-weight: 600; transition: 0.2s; }
        .btn-type.buy { background: #19875420; color: #198754; }
        .btn-type.buy.active { background: #198754; color: white; }
        .btn-type.sell { background: #dc354520; color: #dc3545; }
        .btn-type.sell.active { background: #dc3545; color: white; }
        .btn-submit { width: 100%; padding: 12px; border-radius: 40px; border: none; font-weight: 600; cursor: pointer; }
        .btn-submit.buy { background: #198754; color: white; }
        .btn-submit.sell { background: #dc3545; color: white; }
        .error-message { color: #dc3545; font-size: 0.85rem; margin-top: 0.5rem; }
        .history-wrapper { max-height: 400px; overflow-y: auto; }
        .history-table { width: 100%; border-collapse: collapse; }
        .history-table thead th { position: sticky; top: 0; background: var(--card-bg); z-index: 10; padding: 10px 8px; border-bottom: 2px solid var(--border-color); color: #6c757d; font-weight: 500; }
        .history-table td { padding: 10px 8px; border-bottom: 1px solid var(--border-color); }
        .badge-buy { display: inline-block; padding: 2px 10px; border-radius: 20px; background: #19875420; color: #198754; font-size: 0.75rem; font-weight: 600; }
        .badge-sell { display: inline-block; padding: 2px 10px; border-radius: 20px; background: #dc354520; color: #dc3545; font-size: 0.75rem; font-weight: 600; }
        .badge-dividend { display: inline-block; padding: 2px 10px; border-radius: 20px; background: #ffc10720; color: #d39e00; font-size: 0.75rem; font-weight: 600; }
        .filter-tabs { display: flex; gap: 12px; margin-bottom: 16px; flex-wrap: wrap; justify-content: flex-end; }
        .filter-tab { padding: 6px 16px; border-radius: 40px; background: var(--input-bg); border: 1px solid var(--border-color); cursor: pointer; font-weight: 500; transition: 0.2s; font-size: 0.8rem; }
        .filter-tab.active { background: #0d6efd; color: white; border-color: #0d6efd; }
        .search-input { width: 100%; padding: 10px 14px; border-radius: 40px; border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-color); margin-bottom: 1rem; }
        .modal-overlay { position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center; z-index: 10000; }
        .modal-content { background: var(--card-bg); border-radius: 24px; padding: 1.5rem; max-width: 450px; width: 90%; text-align: center; }
        .passcode-digit-group { display: flex; gap: 12px; justify-content: center; margin: 20px 0; }
        .passcode-digit { width: 55px; height: 70px; text-align: center; font-size: 2rem; font-family: monospace; border: 2px solid var(--border-color); border-radius: 14px; background: var(--input-bg); color: var(--text-color); }
        .error-banner { background: #f8d7da; color: #721c24; padding: 12px; border-radius: 12px; margin-bottom: 1rem; text-align: center; }
        .date-picker-wrapper { display: flex; align-items: center; gap: 8px; }
        .date-picker-wrapper .form-control { flex: 1; cursor: pointer; background-color: var(--input-bg); }
        .calendar-icon { background: var(--card-bg); border: 1px solid var(--border-color); border-radius: 12px; padding: 8px 12px; cursor: pointer; font-size: 1.2rem; display: inline-flex; align-items: center; transition: 0.2s; }
        .calendar-icon:hover { background: var(--hover-bg); }
        .hidden-date-input { position: absolute; opacity: 0; pointer-events: none; width: 0; height: 0; }
        .totals-row { display: flex; justify-content: space-between; align-items: center; background: var(--card-bg); border-radius: 16px; padding: 0.75rem 1rem; margin-bottom: 1rem; border: 1px solid var(--border-color); flex-wrap: wrap; gap: 10px; }
        .totals-item { text-align: center; flex: 1; min-width: 80px; }
        .totals-label { font-size: 0.75rem; color: #6c757d; }
        .totals-value { font-size: 1.25rem; font-weight: 700; color: var(--text-color); }
        .totals-value.dividend-profit { color: #d39e00; }
        .interest-entries {
          margin-top: 12px;
          padding-top: 12px;
          border-top: 1px solid var(--border-color);
          width: 100%;
          max-height: 150px;
          overflow-y: auto;
        }
        .interest-label {
          font-size: 0.75rem;
          color: #6c757d;
          font-weight: 500;
          margin-bottom: 6px;
          position: sticky;
          top: 0;
          background: var(--card-bg);
          z-index: 2;
          padding: 4px 0 6px 0;
        }
        .interest-entry {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 4px 0;
          font-size: 0.85rem;
        }
        .interest-entry .entry-name {
          color: var(--text-color);
        }
        .interest-entry .entry-balance {
          font-weight: 500;
        }
        .interest-entry .entry-profit {
          color: #d39e00;
          font-weight: 600;
        }
        .refresh-btn { background: #0d6efd; color: white; border: none; border-radius: 8px; padding: 4px 12px; cursor: pointer; margin-left: 10px; font-size: 0.8rem; }
      `}</style>

      <Header title="Trade Center" onThemeChange={handleThemeChange} />

      <div className="trade-container">
        {apiError && <div className="error-banner"><i className="bi bi-exclamation-triangle-fill"></i> {apiError}</div>}

        <div className="two-columns">
          <div className="left-column">
            <input type="text" className="search-input" placeholder="🔍 Search by name or ID..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <div style={{ fontWeight: 500, marginBottom: '0.5rem', color: '#6c757d' }}>{filteredAccounts.length} shareholders</div>
            <div className="account-list-scroll">
              {filteredAccounts.map(acc => (
                <div key={acc.id} className={`account-card ${selectedAccount?.id === acc.id ? 'selected' : ''}`} onClick={() => setSelectedAccount(acc)}>
                  <div><div className="account-name">{acc.name}</div><div className="account-id">ID: {acc.id}</div></div>
                </div>
              ))}
              {filteredAccounts.length === 0 && !apiError && <div style={{ textAlign: 'center', padding: '2rem', color: '#6c757d' }}>No active shareholders found</div>}
            </div>
          </div>

          <div className="right-column">
            {selectedAccount ? (
              <>
                <div className="info-card">
                  <h3 style={{ marginBottom: '1rem' }}>
                    {selectedAccount.name}
                    <button className="refresh-btn" onClick={() => fetchAllTransactions(selectedAccount.id)}>
                      <i className="bi bi-arrow-repeat"></i> Refresh
                    </button>
                  </h3>
                  <div className="totals-row">
                    <div className="totals-item">
                      <div className="totals-label">Total Shares</div>
                      <div className="totals-value">{totals.totalShares.toLocaleString()}</div>
                    </div>
                    <div className="totals-item">
                      <div className="totals-label">Total Balance (MMK)</div>
                      <div className="totals-value">{formatCurrency(totals.totalInvestment)} MMK</div>
                    </div>
                    <div className="totals-item">
                      <div className="totals-label">Dividend Profit (MMK)</div>
                      <div className="totals-value dividend-profit">+ {formatCurrency(totals.totalDividendProfit)} MMK</div>
                    </div>
                  </div>

                  {totals.lastInterestEntries.length > 0 && (
                    <div className="interest-entries">
                      <div className="interest-label">📈 Latest Interest Entries</div>
                      {totals.lastInterestEntries.map((entry, idx) => (
                        <div key={idx} className="interest-entry">
                          <span className="entry-name">{entry.name}</span>
                          <span className="entry-balance">{formatCurrency(entry.totalBalance)} MMK</span>
                          <span className="entry-profit">+{formatCurrency(entry.interest)} MMK</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="info-card">
                  <div className="btn-group">
                    <button className={`btn-type buy ${transactionType === 'buy' ? 'active' : ''}`} onClick={() => setTransactionType('buy')}>Buy</button>
                    <button className={`btn-type sell ${transactionType === 'sell' ? 'active' : ''}`} onClick={() => setTransactionType('sell')}>Sell</button>
                  </div>
                  <div className="form-group"><label>Share Amount</label><input type="number" className="form-control" value={shareAmount} onChange={e => setShareAmount(e.target.value)} placeholder="Number of shares" /></div>
                  <div className="form-group"><label>Price per Share (MMK)</label><input type="number" className="form-control" value={sharePrice} onChange={e => setSharePrice(e.target.value)} placeholder="Price per share" /></div>
                  <div className="form-group">
                    <label>Transaction Date</label>
                    <div className="date-picker-wrapper">
                      <input 
                        type="text" 
                        className="form-control" 
                        value={transactionDateDisplay} 
                        readOnly 
                        disabled 
                      />
                      <div className="calendar-icon" style={{ opacity: 0.5, cursor: 'default' }}>
                        📅
                      </div>
                      <input ref={hiddenDateInputRef} type="date" className="hidden-date-input" value={transactionDateApi} onChange={handleNativeDateChange} disabled />
                    </div>
                    {dateError && <div className="error-message">{dateError}</div>}
                  </div>
                  {error && <div className="error-message">{error}</div>}
                  <button className={`btn-submit ${transactionType === 'buy' ? 'buy' : 'sell'}`} onClick={handleTransactionSubmit}>Confirm {transactionType === 'buy' ? 'Buy' : 'Sell'}</button>
                </div>

                <div className="info-card">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                    <h4 style={{ margin: 0 }}>Transaction History</h4>
                    <div className="filter-tabs">
                      <button className={`filter-tab ${filterType === 'ALL' ? 'active' : ''}`} onClick={() => setFilterType('ALL')}>All</button>
                      <button className={`filter-tab ${filterType === 'BUY' ? 'active' : ''}`} onClick={() => setFilterType('BUY')}>Buy</button>
                      <button className={`filter-tab ${filterType === 'SELL' ? 'active' : ''}`} onClick={() => setFilterType('SELL')}>Sell</button>
                      <button className={`filter-tab ${filterType === 'DIVIDEND' ? 'active' : ''}`} onClick={() => setFilterType('DIVIDEND')}>Dividend</button>
                    </div>
                  </div>
                  {loadingTransactions ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>Loading transactions...</div>
                  ) : displayedTransactions.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '1rem' }}>No transactions found</div>
                  ) : (
                    <div className="history-wrapper">
                      <table className="history-table">
                        <thead>
                          <tr>
                            <th>Type</th>
                            <th>Shares</th>
                            <th>Price (MMK)</th>
                            <th>Total (MMK)</th>
                            <th>Date</th>
                            <th>Rate</th>
                          </tr>
                        </thead>
                        <tbody>
                          {displayedTransactions.map(tx => {
                            let badgeClass = tx.type === 'BUY' ? 'badge-buy' : (tx.type === 'SELL' ? 'badge-sell' : 'badge-dividend');
                            const displayTotal = tx.type === 'DIVIDEND' ? (tx.profitAmount || 0) : tx.totalAmount;
                            return (
                              <tr key={tx.id}>
                                <td><span className={badgeClass}>{tx.type}</span></td>
                                <td>{tx.shares.toLocaleString()}</td>
                                <td>{formatCurrency(tx.price)}</td>
                                <td>{formatCurrency(displayTotal)}</td>
                                <td>{formatDisplayDate(tx.date)}</td>
                                <td>{tx.type === 'DIVIDEND' ? tx.percentage + '%' : '-'}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="info-card" style={{ textAlign: 'center', padding: '3rem' }}>
                <i className="bi bi-person-circle" style={{ fontSize: '3rem', color: '#6c757d' }}></i>
                <p style={{ marginTop: '1rem' }}>Select a shareholder from the left to start trading</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {showPasscodeModal && (
        <div className="modal-overlay" onClick={() => setShowPasscodeModal(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()}>
            <h3><i className="bi bi-shield-lock"></i> Security Verification</h3>
            <p>Enter 6‑digit passcode to confirm {pendingTransaction?.type}</p>
            <div className="passcode-digit-group">
              {[...Array(6)].map((_, i) => (
                <input
                  key={i}
                  ref={inputRefs[i]}
                  type="password"
                  maxLength="1"
                  className="passcode-digit"
                  value={passcodeDigits[i]}
                  onChange={e => handleDigitChange(i, e.target.value)}
                  onKeyDown={e => handleKeyDown(i, e)}
                  inputMode="numeric"
                  autoFocus={i === 0}
                />
              ))}
            </div>
            {passcodeError && <div style={{ color: '#dc3545', marginBottom: '1rem' }}>{passcodeError}</div>}
            <button className="btn-submit" style={{ background: '#6c757d', marginTop: '0.5rem' }} onClick={() => setShowPasscodeModal(false)}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default ShareholderTrade;