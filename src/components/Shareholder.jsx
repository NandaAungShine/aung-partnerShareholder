import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import axios from 'axios';

const NOTIFICATION_SOUND_URL = '/assets/sounds/notification.wav';

const API_BASE_URL = process.env.NODE_ENV === 'production'
  ? 'http://130.94.21.185:5000'
  : '';

const getImageUrl = (imagePath) => {
  if (!imagePath || typeof imagePath !== 'string') return null;
  const trimmed = imagePath.trim();
  if (trimmed.startsWith('data:')) return trimmed;
  if (trimmed.startsWith('http')) {
    if (process.env.NODE_ENV === 'production') return trimmed;
    try {
      const url = new URL(trimmed);
      return url.pathname;
    } catch { return trimmed; }
  }
  const cleanPath = trimmed.replace(/^\/+/, '');
  const prefixedPath = `uploads/${cleanPath}`;
  if (process.env.NODE_ENV !== 'production') return `/${prefixedPath}`;
  return `http://130.94.23.117:5000/${prefixedPath}`;
};

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

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('userRole');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

const shareClassOptions = [
  { label: "Level 1 - Basic", value: "level1" },
  { label: "Level 2 - Standard", value: "level2" },
  { label: "Level 3 - Premium", value: "level3" },
];

const getShareClassLabel = (value) => {
  const option = shareClassOptions.find(opt => opt.value === value);
  return option ? option.label : (value || 'Level 1 - Basic');
};

const getShareClassBadgeClass = (value) => {
  switch(value) {
    case 'level1': return 'share-badge level1';
    case 'level2': return 'share-badge level2';
    case 'level3': return 'share-badge level3';
    default: return 'share-badge level1';
  }
};

const playNotificationSound = () => {
  const isUnlocked = localStorage.getItem('audioUnlocked') === 'true';
  if (!isUnlocked) {
    console.log("🔇 Audio not unlocked yet – sound blocked");
    return false;
  }
  try {
    const audio = new Audio(NOTIFICATION_SOUND_URL);
    audio.volume = 1;
    audio.play().catch(err => console.warn('Audio play failed:', err));
    return true;
  } catch (err) {
    console.error('Notification sound error:', err);
    return false;
  }
};

function Shareholder() {
  const [isDarkMode, setIsDarkMode] = useState(() => localStorage.getItem('theme') === 'dark');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedShareholderId, setSelectedShareholderId] = useState(null);
  const [selectedShareholderForView, setSelectedShareholderForView] = useState(null);
  const [selectedShareholderForEdit, setSelectedShareholderForEdit] = useState(null);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterShareClass, setFilterShareClass] = useState('all');
  const [filterDateRange, setFilterDateRange] = useState('all');
  const [loading, setLoading] = useState(true);
  const [apiError, setApiError] = useState('');
  const [shareholders, setShareholders] = useState([]);
  const [statusMap, setStatusMap] = useState({});
  const [lastAmounts, setLastAmounts] = useState({});
  const [sortById, setSortById] = useState('newest');
  const [sortByLevel, setSortByLevel] = useState('none');
  const [showPasscodeModal, setShowPasscodeModal] = useState(false);
  const [passcodeDigits, setPasscodeDigits] = useState(['', '', '', '', '', '']);
  const [passcodeError, setPasscodeError] = useState('');
  const [pendingAction, setPendingAction] = useState(null);
  const [pendingActionParams, setPendingActionParams] = useState(null);
  const inputRefs = [useRef(), useRef(), useRef(), useRef(), useRef(), useRef()];
  const [editFormData, setEditFormData] = useState({ shareClass: 'level1' });
  
  const previousPendingIdsRef = useRef(new Set());
  const pollingIntervalRef = useRef(null);
  const firstLoadRef = useRef(true);

  useEffect(() => {
    const unlockAudio = () => {
      if (localStorage.getItem('audioUnlocked') === 'true') return;
      const audio = new Audio(NOTIFICATION_SOUND_URL);
      audio.volume = 0;
      audio.play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          localStorage.setItem('audioUnlocked', 'true');
          console.log("🔓 Audio unlocked (user gesture)");
        })
        .catch(() => {});
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
    window.addEventListener('click', unlockAudio);
    window.addEventListener('keydown', unlockAudio);
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const fetchLastAmounts = async () => {
    try {
      let response;
      try { response = await api.get('/api/list/last-amount/'); }
      catch { response = await api.get('/api/v1/list/last-amount'); }
      let data = [];
      if (response.data?.success && Array.isArray(response.data.data)) data = response.data.data;
      else if (Array.isArray(response.data)) data = response.data;
      const amountMap = {};
      data.forEach(item => {
        const sid = item.shareholder_id || item.user_id || item.id;
        const amount = item.last_amount || item.amount || 0;
        if (sid) amountMap[sid] = amount;
      });
      setLastAmounts(amountMap);
      return amountMap;
    } catch (err) { return {}; }
  };

  const fetchTransactionsForShareholder = async (shareholderId) => {
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

      const sorted = [...transactionsData].sort((a, b) => {
        const dateA = a.purchase_date || a.date || a.transaction_date || a.created_at;
        const dateB = b.purchase_date || b.date || b.transaction_date || b.created_at;
        return new Date(dateA) - new Date(dateB);
      });

      let totalShares = 0;
      let totalInvestment = 0;

      for (const tx of sorted) {
        let status = (tx.status || '').toLowerCase();
        let shares = Number(tx.share_quantity) || Number(tx.shares) || 0;
        let price = Number(tx.share_price) || Number(tx.price) || 0;

        if (status === 'buy') {
          totalShares += shares;
          totalInvestment += shares * price;
        } else if (status === 'sell') {
          totalShares -= shares;
        }
        // dividend: ignored for totals
      }

      return { totalShares, totalInvestment };
    } catch (error) {
      console.error(`Failed to fetch transactions for shareholder ${shareholderId}:`, error);
      return { totalShares: 0, totalInvestment: 0 };
    }
  };

  const fetchUsersAndShares = async () => {
    setLoading(true);
    setApiError('');
    try {
      const usersResponse = await api.get('/auth/register/list');
      let users = [];
      if (usersResponse.data?.success && usersResponse.data.data) users = Array.isArray(usersResponse.data.data) ? usersResponse.data.data : (usersResponse.data.data.data || []);
      else if (Array.isArray(usersResponse.data)) users = usersResponse.data;
      const uniqueUsersMap = new Map();
      users.forEach(user => { if (user.id && !uniqueUsersMap.has(user.id)) uniqueUsersMap.set(user.id, user); });
      const uniqueUsers = Array.from(uniqueUsersMap.values());

      const currentPendingIds = new Set(
        uniqueUsers
          .filter(u => {
            const status = (u.status || '').toString().toLowerCase().trim();
            return status === 'pending';
          })
          .map(u => u.id)
      );
      const previousPendingIds = previousPendingIdsRef.current;
      let hasNewPending = false;
      for (let id of currentPendingIds) {
        if (!previousPendingIds.has(id)) {
          hasNewPending = true;
          break;
        }
      }
      if (hasNewPending) {
        console.log('🔄 New pending user detected during fetch, playing sound...');
        playNotificationSound(); 
      }
      previousPendingIdsRef.current = currentPendingIds;

      const shareResponse = await api.get('/api/share/list/');
      let shareData = [];
      if (shareResponse.data?.success && Array.isArray(shareResponse.data.data)) shareData = shareResponse.data.data;
      else if (Array.isArray(shareResponse.data)) shareData = shareResponse.data;
      const shareMap = new Map();
      shareData.forEach(share => {
        const sid = share.shareholder_id;
        if (!shareMap.has(sid)) {
          shareMap.set(sid, {
            pricePerShare: Number(share.price_per_share) || 10000,
            shareClass: (share.share_class || 'level1').toLowerCase(),
            shareId: share.id,
            nominee_name: share.nominee_name || '',
            relationship: share.relationship || '',
            nominee_phone: share.phone || '',
            bank_name1: share.bank_name1 || '',
            account_name1: share.account_name1 || '',
            account_number1: share.account_number1 || '',
            bank_name2: share.bank_name2 || '',
            account_name2: share.account_name2 || '',
            account_number2: share.account_number2 || '',
            kpay: share.kpay || '',
            wave: share.wave || '',
            tax: share.tax || '',
            profileImageFromShare: share.profile_image || share.profile || share.avatar || share.image || share.photo || null,
          });
        }
        let level = 1;
        if (share.share_class === 'level2') level = 2;
        if (share.share_class === 'level3') level = 3;
        const existing = shareMap.get(sid);
        const currentLevel = existing.shareClass === 'level1' ? 1 : existing.shareClass === 'level2' ? 2 : 3;
        if (level > currentLevel) existing.shareClass = share.share_class.toLowerCase();
      });

      const lastAmountMap = await fetchLastAmounts();
      const userPromises = uniqueUsers.map(async (user) => {
        const userId = user.id;
        const userStatus = user.status === 'approved' ? 'Approved' : user.status === 'pending' ? 'Pending' : 'Rejected';
        const agg = shareMap.get(userId);
        const { totalShares, totalInvestment } = await fetchTransactionsForShareholder(userId);
        let rawImage = null;
        if (user.profile_image) rawImage = user.profile_image;
        else if (user.profile) rawImage = user.profile;
        else if (user.avatar) rawImage = user.avatar;
        else if (user.image) rawImage = user.image;
        else if (user.photo) rawImage = user.photo;
        else if (user.photo_url) rawImage = user.photo_url;
        else if (user.avatar_url) rawImage = user.avatar_url;
        else if (user.image_url) rawImage = user.image_url;
        if (!rawImage && agg?.profileImageFromShare) rawImage = agg.profileImageFromShare;
        let profileImage = getImageUrl(rawImage);
        const base = {
          shareholder_id: userId,
          fullName: user.username || user.full_name || 'N/A',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || '',
          nrc: user.nrc || '',
          dateOfBirth: user.dateOfBirth || user.date_of_birth || '',
          status: userStatus,
          joinedDate: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          nominee_name: agg?.nominee_name || user.nominee_name || '',
          relationship: agg?.relationship || user.relationship || '',
          nominee_phone: agg?.nominee_phone || user.nominee_phone || '',
          bank_name1: agg?.bank_name1 || user.bank_name1 || '',
          account_name1: agg?.account_name1 || user.account_name1 || '',
          account_number1: agg?.account_number1 || user.account_number1 || '',
          bank_name2: agg?.bank_name2 || user.bank_name2 || '',
          account_name2: agg?.account_name2 || user.account_name2 || '',
          account_number2: agg?.account_number2 || user.account_number2 || '',
          kpay: agg?.kpay || user.kpay || '',
          wave: agg?.wave || user.wave || '',
          tax: agg?.tax || user.tax || '',
          profileImage,
          lastAmount: lastAmountMap[userId] || 0,
        };
        if (totalShares === 0 && totalInvestment === 0) {
          return {
            id: `user_${userId}`,
            ...base,
            shareClass: 'level1',
            shareQuantity: 0,
            sharePrice: agg?.pricePerShare || 10000,
            totalInvestment: 0
          };
        } else {
          return {
            id: agg?.shareId || `user_${userId}`,
            ...base,
            shareClass: agg?.shareClass || 'level1',
            shareQuantity: totalShares,
            sharePrice: agg?.pricePerShare || 10000,
            totalInvestment: totalInvestment
          };
        }
      });
      const merged = await Promise.all(userPromises);
      setShareholders([...merged].sort((a,b) => b.shareholder_id - a.shareholder_id));
      const newStatusMap = {};
      uniqueUsers.forEach(u => { newStatusMap[u.id] = u.status === 'approved' ? 'Approved' : u.status === 'pending' ? 'Pending' : 'Rejected'; });
      setStatusMap(newStatusMap);
    } catch (error) {
      console.error(error);
      setApiError('Failed to load data.');
    } finally { setLoading(false); }
  };

  const pollForPendingUsers = async () => {
    try {
      console.log("🔄 polling running...");
      const response = await api.get('/auth/register/list');
      let users = [];
      if (response.data?.success && Array.isArray(response.data.data)) {
        users = response.data.data;
      } else if (Array.isArray(response.data)) {
        users = response.data;
      }
      const currentPendingIds = new Set(
        users
          .filter(u => {
            const status = (u.status || '').toString().toLowerCase().trim();
            return status === 'pending';
          })
          .map(u => u.id)
      );
      if (firstLoadRef.current) {
        previousPendingIdsRef.current = currentPendingIds;
        firstLoadRef.current = false;
        console.log("🟡 first load initialized, pending IDs:", [...currentPendingIds]);
        return;
      }
      const hasNew = [...currentPendingIds].some(id => !previousPendingIdsRef.current.has(id));
      if (hasNew) {
        console.log("🚨 NEW PENDING USER DETECTED", [...currentPendingIds]);
        previousPendingIdsRef.current = currentPendingIds;
        playNotificationSound();  
        setTimeout(() => {
          localStorage.setItem('lastPendingRefresh', Date.now());
          window.location.reload();
        }, 1500);
        return;
      }
      previousPendingIdsRef.current = currentPendingIds;
    } catch (err) {
      console.warn("Polling error:", err);
    }
  };
  
  useEffect(() => {
    pollForPendingUsers();
    pollingIntervalRef.current = setInterval(pollForPendingUsers, 60000);
    return () => {
      if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    };
  }, []);

  useEffect(() => {
    fetchUsersAndShares();
    const handleStorage = (e) => { if (e.key === 'shareholderDataUpdate') fetchUsersAndShares(); };
    const handleCustom = () => fetchUsersAndShares();
    window.addEventListener('storage', handleStorage);
    window.addEventListener('shareholderRefresh', handleCustom);
    window.addEventListener('profileUpdate', handleCustom);
    return () => {
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('shareholderRefresh', handleCustom);
      window.removeEventListener('profileUpdate', handleCustom);
    };
  }, []);

  // ================== API calls with passcode in header ==================

  const createShareAPI = async (shareData, passcode) => {
    setLoading(true);
    try {
      const validPasscode = Number(passcode);
      const shareQuantity = Number(shareData.share_quantity) || 0;
      const pricePerShare = Number(shareData.price_per_share) || 10000;
      const totalInvestment = shareQuantity * pricePerShare;
      const payload = {
        shareholder_id: shareData.shareholder_id,
        share_class: shareData.share_class || 'level1',
        share_quantity: shareQuantity,
        price_per_share: pricePerShare,
        total_investment: totalInvestment,
      };
      const response = await api.post('/api/share/create', payload, {
        headers: { 'x-passcode': validPasscode }
      });
      if (response.status === 200 || response.status === 201) {
        await fetchUsersAndShares();
        return true;
      }
      return false;
    } catch (error) {
      alert(error.response?.data?.message || 'Create failed');
      return false;
    } finally { setLoading(false); }
  };

  const updateShareClassOnlyAPI = async (shareId, shareClass, passcode) => {
    setLoading(true);
    try {
      if (!shareId || shareId.toString().startsWith('user_')) {
        alert('Invalid share ID. Cannot update.');
        return false;
      }
      const existingShare = shareholders.find(s => s.id === shareId);
      if (!existingShare) {
        alert('Share record not found');
        return false;
      }
      const validPasscode = Number(passcode);
      const payload = {
        share_class: shareClass,
        share_quantity: existingShare.shareQuantity,
        price_per_share: existingShare.sharePrice,
        total_investment: existingShare.shareQuantity * existingShare.sharePrice,
      };
      const response = await api.put(`/api/share/update/${shareId}`, payload, {
        headers: { 'x-passcode': validPasscode }
      });
      if (response.status === 200 || response.status === 201) {
        await fetchUsersAndShares();
        return true;
      }
      return false;
    } catch (error) {
      alert(error.response?.data?.message || 'Update failed');
      return false;
    } finally { setLoading(false); }
  };

  const approveUserAPI = async (shareholderId, passcode) => {
    setLoading(true);
    try {
      const validPasscode = Number(passcode);
      const response = await api.put(`/auth/approved/user/${shareholderId}`, {}, {
        headers: { 'x-passcode': validPasscode }
      });
      if (response.status === 200 || response.status === 201) {
        await fetchUsersAndShares();
        return true;
      }
      return false;
    } catch (error) {
      alert(error.response?.data?.message || 'Approve failed');
      return false;
    } finally { setLoading(false); }
  };

  const rejectUserAPI = async (shareholderId, passcode) => {
    setLoading(true);
    try {
      const validPasscode = Number(passcode);
      const response = await api.put(`/auth/cancelled/user/${shareholderId}`, {}, {
        headers: { 'x-passcode': validPasscode }
      });
      if (response.status === 200 || response.status === 201) {
        await fetchUsersAndShares();
        return true;
      }
      return false;
    } catch (error) {
      alert(error.response?.data?.message || 'Reject failed');
      return false;
    } finally { setLoading(false); }
  };

  const deleteShareholderAPI = async (shareId, passcode) => {
    setLoading(true);
    try {
      const validPasscode = Number(passcode);
      const response = await api.delete(`/api/share/delete/${shareId}`, {
        headers: { 'x-passcode': validPasscode }
      });
      if (response.status === 200 || response.status === 201 || response.status === 204) {
        await fetchUsersAndShares();
        return true;
      }
      return false;
    } catch (error) {
      alert(error.response?.data?.message || 'Delete failed');
      return false;
    } finally { setLoading(false); }
  };

  // ================== Passcode Modal Flow ==================

  const requestPasscode = (action, params) => {
    setPasscodeDigits(['','','','','','']);
    setPasscodeError('');
    setPendingAction(action);
    setPendingActionParams(params);
    setShowPasscodeModal(true);
    setTimeout(() => { if (inputRefs[0]?.current) inputRefs[0].current.focus(); }, 50);
  };
  const handleDigitChange = (index, value) => {
    if (value !== '' && !/^[0-9]$/.test(value)) { setPasscodeError('Must be number'); return; }
    setPasscodeError('');
    const newDigits = [...passcodeDigits];
    newDigits[index] = value;
    setPasscodeDigits(newDigits);
    if (value && index < 5) inputRefs[index+1]?.current?.focus();
    if (newDigits.every(d => d !== '')) verifyAndExecute(newDigits.join(''));
  };
  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !passcodeDigits[index] && index > 0) inputRefs[index-1]?.current?.focus();
  };
  const verifyAndExecute = async (passcode) => {
    setPasscodeError('');
    const action = pendingAction;
    const params = pendingActionParams;
    try {
      if (action === 'approve') {
        await approveUserAPI(params.shareholderId, passcode);
      } else if (action === 'reject') {
        await rejectUserAPI(params.shareholderId, passcode);
      } else if (action === 'delete') {
        await deleteShareholderAPI(params.shareId, passcode);
      } else if (action === 'update') {
        const { shareholder, newShareClass } = params;
        await updateShareClassOnlyAPI(shareholder.id, newShareClass, passcode);
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

  const handleApprove = (s) => requestPasscode('approve', { shareholderId: s.shareholder_id });
  const handleReject = (s) => requestPasscode('reject', { shareholderId: s.shareholder_id });
  const handleDelete = (s) => {
    if (!s.id || s.id.toString().startsWith('user_')) {
      alert('No share record to delete');
      return;
    }
    requestPasscode('delete', { shareId: s.id });
  };
  const handleEditShareholder = (s) => {
    setSelectedShareholderForEdit(s);
    setEditFormData({ shareClass: s.shareClass });
    setShowEditModal(true);
  };
  const handleUpdateWithPasscode = () => {
    if (!selectedShareholderForEdit) return;
    requestPasscode('update', {
      shareholder: selectedShareholderForEdit,
      newShareClass: editFormData.shareClass
    });
  };
  const handleViewDetails = (s) => {
    setSelectedShareholderForView(s);
    setShowViewModal(true);
  };

  // ================== Sorting and Filtering ==================

  const getSortedShareholders = (list) => {
    let result = [...list];
    if (sortById === 'newest') {
      result.sort((a, b) => Number(b.shareholder_id) - Number(a.shareholder_id));
    } else if (sortById === 'oldest') {
      result.sort((a, b) => Number(a.shareholder_id) - Number(b.shareholder_id));
    }
    if (sortByLevel === 'highest') {
      const levelOrder = { level3: 3, level2: 2, level1: 1 };
      result.sort((a, b) => (levelOrder[b.shareClass] || 0) - (levelOrder[a.shareClass] || 0));
    } else if (sortByLevel === 'lowest') {
      const levelOrder = { level1: 1, level2: 2, level3: 3 };
      result.sort((a, b) => (levelOrder[a.shareClass] || 0) - (levelOrder[b.shareClass] || 0));
    }
    return result;
  };

  const isWithinDateRange = (joinedDate, range) => {
    if (range === 'all') return true;
    if (!joinedDate) return false;
    const date = new Date(joinedDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    switch(range) {
      case 'daily': return date.toDateString() === today.toDateString();
      case 'weekly': return date >= startOfWeek;
      case 'monthly': return date >= startOfMonth;
      case 'yearly': return date >= startOfYear;
      default: return true;
    }
  };

  const [stats, setStats] = useState({
    totalApproved: 0, rejected: 0, pending: 0,
    totalInvestment: 0, totalDividend: 0, totalShares: 0
  });

  useEffect(() => {
    const calculateStats = () => {
      const filtered = shareholders.filter(s => isWithinDateRange(s.joinedDate, filterDateRange));
      const approved = filtered.filter(s => s.status === 'Approved');
      setStats({
        totalApproved: approved.length,
        pending: filtered.filter(s => s.status === 'Pending').length,
        rejected: filtered.filter(s => s.status === 'Rejected').length,
        totalInvestment: approved.reduce((sum, s) => sum + (s.totalInvestment || 0), 0),
        totalDividend: approved.reduce((sum, s) => sum + (s.dividendEarned || 0), 0),
        totalShares: approved.reduce((sum, s) => sum + (s.shareQuantity || 0), 0)
      });
    };
    calculateStats();
  }, [shareholders, filterDateRange]);

  const handleThemeChange = (isDark) => {
    setIsDarkMode(isDark);
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  };

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      document.body.classList.remove('light-mode');
    } else {
      document.body.classList.add('light-mode');
      document.body.classList.remove('dark-mode');
    }
  }, [isDarkMode]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditFormData(prev => ({ ...prev, [name]: value }));
  };

  const getDateFilterLabel = () => {
    switch(filterDateRange) {
      case 'daily': return 'Today';
      case 'weekly': return 'This Week';
      case 'monthly': return 'This Month';
      case 'yearly': return 'This Year';
      default: return 'All Time';
    }
  };

  const filteredShareholders = shareholders.filter(s => {
    const matchesSearch = (s.fullName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.phone || '').includes(searchTerm);
    const matchesStatus = filterStatus === 'all' || s.status === filterStatus;
    const matchesShareClass = filterShareClass === 'all' || s.shareClass === filterShareClass;
    const matchesDate = isWithinDateRange(s.joinedDate, filterDateRange);
    return matchesSearch && matchesStatus && matchesShareClass && matchesDate;
  });

  const finalSortedShareholders = getSortedShareholders(filteredShareholders);
  const formatCurrency = (value) => value?.toLocaleString() || '0';

  const handleImageError = (e, shareholder) => {
    const img = e.target;
    const currentSrc = img.src;
    if (img.dataset.fallbackAttempted === 'true') {
      console.warn(`Image failed for ${shareholder.fullName}: ${currentSrc}`);
      img.onerror = null;
      img.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
      return;
    }
    img.dataset.fallbackAttempted = 'true';
    let alternativeUrl = null;
    try {
      const url = new URL(currentSrc);
      const path = url.pathname;
      if (path.startsWith('/uploads/')) {
        alternativeUrl = path.replace('/uploads/', '/');
      } else if (!path.startsWith('/uploads/') && path.match(/\.(webp|png|jpg|jpeg|gif|svg|ico)$/i)) {
        alternativeUrl = `/uploads${path}`;
      }
    } catch(e) { console.warn(e); }
    if (alternativeUrl) {
      console.log(`🔄 Retrying ${shareholder.fullName} with: ${alternativeUrl}`);
      img.src = alternativeUrl;
    } else {
      img.onerror = null;
      img.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
    }
  };

  if (loading && shareholders.length === 0) {
    return (
      <div className="dashboard-container">
        <Header title="Shareholder Management" onThemeChange={handleThemeChange} />
        <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="ms-2">Loading shareholders from server...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`dashboard-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <Header title="Shareholder Management" onThemeChange={handleThemeChange} />
      <style>{`
        .stat-card-mini {
          flex: 1;
          min-width: 0;
          background: var(--card-bg);
          border-radius: 16px;
          padding: 1rem;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.2s;
        }
        .main-stats-cards .stat-card-mini:nth-child(2),
        .main-stats-cards .stat-card-mini:nth-child(3) { flex: 0.7; min-width: 120px; }
        .main-stats-cards .stat-card-mini:nth-child(4) { flex: 1.3; min-width: 180px; }
        .actions-cell { white-space: nowrap; display: flex; gap: 6px; align-items: center; }
        .action-icon {
          width: 32px; height: 32px; font-size: 14px;
          display: inline-flex; align-items: center; justify-content: center;
          border-radius: 8px; background: var(--btn-bg); transition: all 0.2s;
          flex-shrink: 0; cursor: pointer; border: none;
        }
        .action-icon.delete {
          color: #dc3545;
          background: rgba(220, 53, 69, 0.1);
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
        }
        .action-icon.delete:hover {
          background: #dc3545;
          color: white;
        }
        .dark-theme .action-icon.delete {
          color: #ff6b6b;
          background: rgba(255, 107, 107, 0.15);
        }
        .shareholder-data-table th:nth-child(5), .shareholder-data-table td:nth-child(5) { min-width: 140px; width: 140px; }
        .shareholder-table-wrapper { overflow-x: auto; }
        .shareholder-data-table { min-width: 800px; }
        .modal-overlay {
          position: fixed; top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(0, 0, 0, 0.6); display: flex; align-items: center; justify-content: center;
          z-index: 10000;
        }
        .passcode-modal-overlay { z-index: 10002 !important; }
        .modal-content {
          background: var(--card-bg); border-radius: 24px; padding: 0;
          max-width: 90%; max-height: 90vh; overflow-y: auto;
          box-shadow: 0 20px 40px rgba(0,0,0,0.2); z-index: 10001;
        }
        .passcode-digit-group { display: flex; justify-content: center; gap: 12px; margin: 20px 0; }
        .passcode-digit {
          width: 60px; height: 70px; text-align: center; font-size: 2rem; font-weight: bold;
          font-family: monospace; border: 2px solid #dee2e6; border-radius: 12px;
          background: var(--input-bg); color: var(--text-color); transition: all 0.2s;
        }
        .passcode-digit:focus { border-color: #0d6efd; outline: none; box-shadow: 0 0 0 3px rgba(13,110,253,0.25); }
        .dark-theme .passcode-digit { background: #2d2d2d; border-color: #4a4a4a; color: #fff; }
        .passcode-error { color: #dc3545; text-align: center; margin-top: 10px; }
        .form-row { display: flex; gap: 1rem; margin-bottom: 1rem; }
        .form-group { flex: 1; }
        .form-group label { display: block; margin-bottom: 0.25rem; font-weight: 500; }
        .form-group select, .form-group input {
          width: 100%; padding: 8px 12px; border-radius: 8px;
          border: 1px solid var(--border-color); background: var(--input-bg); color: var(--text-color);
        }
        .readonly-input { background: #f5f5f5; cursor: not-allowed; border-color: var(--border-color); }
        .dark-theme .readonly-input { background: #2d2d2d !important; color: #e0e0e0; border-color: #4a4a4a; }
        .alert-info { background: #cfe2ff; color: #084298; padding: 0.75rem; border-radius: 12px; margin-bottom: 1rem; }
        .detail-section { margin-top: 1.5rem; }
        .detail-section h4 { font-size: 1.1rem; font-weight: 600; margin-bottom: 1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem; }
        .detail-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 0.75rem; }
        .detail-grid div { padding: 0.25rem 0; }
        .detail-grid strong { font-weight: 600; margin-right: 0.5rem; }
        .detail-header { display: flex; gap: 1.5rem; align-items: center; margin-bottom: 1.5rem; }
        .detail-avatar-large { width: 80px; height: 80px; display: flex; align-items: center; justify-content: center; background: var(--card-bg); border-radius: 50%; overflow: hidden; }
        .detail-basic h3 { margin: 0 0 0.25rem 0; }
        .detail-badges { display: flex; gap: 0.5rem; margin-top: 0.5rem; }
        .shareholder-avatar {
          width: 40px; height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--card-bg);
          border-radius: 50%;
          overflow: hidden;
        }
        .shareholder-avatar img { width: 100%; height: 100%; object-fit: cover; }
        .shareholder-avatar i { font-size: 28px; color: #0d6efd; }
        @media (max-width: 768px) {
          .shareholder-avatar i { font-size: 24px !important; }
          .detail-avatar-large i { font-size: 48px !important; }
        }
        .search-bar-wrapper {
          position: relative;
          display: flex;
          align-items: center;
          flex: 1;
        }
        .search-icon {
          position: absolute;
          left: 12px;
          top: 50%;
          transform: translateY(-50%);
          color: #6c757d;
          font-size: 1rem;
          pointer-events: none;
          z-index: 1;
        }
        .search-input-full {
          width: 100%;
          padding: 8px 35px 8px 35px !important;
          border-radius: 40px;
          border: 1px solid var(--border-color);
          background: var(--input-bg);
          color: var(--text-color);
          font-size: 0.9rem;
        }
        .search-input-full:focus {
          outline: none;
          border-color: #0d6efd;
          box-shadow: 0 0 0 2px rgba(13,110,253,0.25);
        }
      `}</style>

      {apiError && (
        <div className="alert alert-warning m-3">
          <i className="bi bi-exclamation-triangle-fill"></i> {apiError}
        </div>
      )}

      <div className="date-range-filter-section">
        <div className="date-range-buttons">
          <button className={`date-range-btn ${filterDateRange === 'daily' ? 'active' : ''}`} onClick={() => setFilterDateRange('daily')}><i className="bi bi-calendar-day"></i> Daily</button>
          <button className={`date-range-btn ${filterDateRange === 'weekly' ? 'active' : ''}`} onClick={() => setFilterDateRange('weekly')}><i className="bi bi-calendar-week"></i> Weekly</button>
          <button className={`date-range-btn ${filterDateRange === 'monthly' ? 'active' : ''}`} onClick={() => setFilterDateRange('monthly')}><i className="bi bi-calendar-month"></i> Monthly</button>
          <button className={`date-range-btn ${filterDateRange === 'yearly' ? 'active' : ''}`} onClick={() => setFilterDateRange('yearly')}><i className="bi bi-calendar-year"></i> Yearly</button>
          <button className={`date-range-btn ${filterDateRange === 'all' ? 'active' : ''}`} onClick={() => setFilterDateRange('all')}><i className="bi bi-calendar"></i> All</button>
        </div>
        <div className="date-range-info"><span className="info-badge"><i className="bi bi-funnel"></i> Showing: {getDateFilterLabel()}</span></div>
      </div>

      <div className="main-stats-cards">
        <div className="stat-card-mini"><div className="stat-icon-mini total"><i className="bi bi-people-fill"></i></div><div className="stat-info-mini"><h3>{stats.totalApproved}</h3><p>Total Shareholder</p></div></div>
        <div className="stat-card-mini"><div className="stat-icon-mini rejected"><i className="bi bi-x-circle-fill"></i></div><div className="stat-info-mini"><h3>{stats.rejected}</h3><p>Rejected</p></div></div>
        <div className="stat-card-mini"><div className="stat-icon-mini pending"><i className="bi bi-clock-history"></i></div><div className="stat-info-mini"><h3>{stats.pending}</h3><p>Pending</p></div></div>
        <div className="stat-card-mini"><div className="stat-icon-mini investment"><i className="bi bi-currency-dollar"></i></div><div className="stat-info-mini"><h3>{formatCurrency(stats.totalInvestment)}</h3><p>Total Investment</p></div></div>
        <div className="stat-card-mini"><div className="stat-icon-mini dividend"><i className="bi bi-gift-fill"></i></div><div className="stat-info-mini"><h3>{formatCurrency(stats.totalDividend)}</h3><p>Dividend Paid</p></div></div>
        <div className="stat-card-mini"><div className="stat-icon-mini shares"><i className="bi bi-pie-chart-fill"></i></div><div className="stat-info-mini"><h3>{formatCurrency(stats.totalShares)}</h3><p>Total Shares</p></div></div>
      </div>

      <div className="search-actions-row">
        <div className="search-bar-wrapper">
          <i className="bi bi-search search-icon"></i>
          <input
            type="text"
            placeholder="Search by name, email or phone..."
            className="search-input-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ paddingRight: '35px' }}
          />
        </div>
        <div className="filter-group-simple">
          <select className="filter-select-simple" value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)}>
            <option value="all">All Status</option>
            <option value="Approved">Approved</option>
            <option value="Pending">Pending</option>
            <option value="Rejected">Rejected</option>
          </select>
          <select className="filter-select-simple" value={filterShareClass} onChange={(e) => setFilterShareClass(e.target.value)}>
            <option value="all">All Share Classes</option>
            {shareClassOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <select className="filter-select-simple" value={sortById} onChange={(e) => setSortById(e.target.value)}>
            <option value="newest">ID: Newest First</option>
            <option value="oldest">ID: Oldest First</option>
          </select>
          <select className="filter-select-simple" value={sortByLevel} onChange={(e) => setSortByLevel(e.target.value)}>
            <option value="none">Level: None</option>
            <option value="highest">Level: Highest First</option>
            <option value="lowest">Level: Lowest First</option>
          </select>
        </div>
        <button className="action-btn add-btn" onClick={() => setShowAddModal(true)}>
          <i className="bi bi-person-plus-fill"></i> New Shareholder
        </button>
      </div>

      <div className="shareholder-table-container">
        <div className="shareholder-table-wrapper">
          <table className="shareholder-data-table">
            <thead>
              <tr>
                <th className="serial-col">No.</th>
                <th>Shareholder</th>
                <th>Contact</th>
                <th>Shares</th>
                <th style={{ minWidth: '140px' }}>Investment (MMK)</th>
                <th>Share Class</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {finalSortedShareholders.length > 0 ? (
                finalSortedShareholders.map((shareholder, index) => (
                  <tr key={shareholder.id} onClick={() => setSelectedShareholderId(shareholder.id)}>
                    <td className="serial-col">{index + 1}</td>
                    <td className="shareholder-cell">
                      <div className="shareholder-info">
                        <div className="shareholder-avatar">
                          {shareholder.profileImage ? (
                            <img 
                              src={shareholder.profileImage} 
                              alt={shareholder.fullName}
                              onError={(e) => handleImageError(e, shareholder)}
                            />
                          ) : (
                            <i className="bi bi-person-circle"></i>
                          )}
                        </div>
                        <div className="shareholder-details">
                          <div className="shareholder-name">{shareholder.fullName}</div>
                          <div className="shareholder-id">ID: {shareholder.shareholder_id}</div>
                        </div>
                      </div>
                    </td>
                    <td className="contact-cell">
                      <div className="contact-email">{shareholder.email}</div>
                      <div className="contact-phone">{shareholder.phone}</div>
                    </td>
                    <td className="shares-cell">
                      <div className="shares-quantity">{shareholder.shareQuantity.toLocaleString()}</div>
                      <div className="shares-price">@ {formatCurrency(shareholder.sharePrice)}/share</div>
                    </td>
                    <td className="investment-cell">
                      <div className="investment-amount">{formatCurrency(shareholder.totalInvestment)} MMK</div>
                    </td>
                    <td className="share-class-cell">
                      <span className={getShareClassBadgeClass(shareholder.shareClass)}>{getShareClassLabel(shareholder.shareClass)}</span>
                    </td>
                    <td className="status-cell">
                      <span className={shareholder.status === 'Approved' ? 'status-badge approved' : shareholder.status === 'Pending' ? 'status-badge pending' : 'status-badge rejected'}>
                        {shareholder.status}
                      </span>
                    </td>
                    <td className="actions-cell" onClick={(e) => e.stopPropagation()}>
                      {shareholder.status === 'Pending' && (
                        <>
                          <button className="action-icon approve" title="Approve" onClick={() => handleApprove(shareholder)}><i className="bi bi-check-lg"></i></button>
                          <button className="action-icon reject" title="Reject" onClick={() => handleReject(shareholder)}><i className="bi bi-x-lg"></i></button>
                        </>
                      )}
                      <button className="action-icon edit" title="Edit" onClick={() => handleEditShareholder(shareholder)}><i className="bi bi-pencil-square"></i></button>
                      <button className="action-icon view" title="View" onClick={() => handleViewDetails(shareholder)}><i className="bi bi-eye"></i></button>
                      <button className="action-icon delete" title="Delete" onClick={() => handleDelete(shareholder)}><i className="bi bi-trash"></i></button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8" className="text-center py-5">No shareholders found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Passcode Modal */}
      {showPasscodeModal && (
        <div className="modal-overlay passcode-modal-overlay" onClick={() => setShowPasscodeModal(false)}>
          <div className="modal-content passcode-modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '450px' }}>
            <div className="modal-header">
              <h2><i className="bi bi-shield-lock"></i> Security Verification</h2>
              <button className="close-btn" onClick={() => setShowPasscodeModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <p style={{ textAlign: 'center' }}>Enter 6‑digit passcode to <strong>{pendingAction}</strong></p>
              <div className="passcode-digit-group">
                {[0,1,2,3,4,5].map((idx) => (
                  <input
                    key={idx}
                    ref={inputRefs[idx]}
                    type="password"
                    maxLength="1"
                    className="passcode-digit"
                    value={passcodeDigits[idx]}
                    onChange={(e) => handleDigitChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    inputMode="numeric"
                    autoFocus={idx === 0}
                  />
                ))}
              </div>
              {passcodeError && <div className="passcode-error">{passcodeError}</div>}
            </div>
            <div className="modal-footer justify-content-center">
              <button className="discard-btn" onClick={() => setShowPasscodeModal(false)}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      {/* Add Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Create New Share</h2>
              <button className="close-btn" onClick={() => setShowAddModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <p>Please use the "Edit" button on an approved user to create their share record.</p>
            </div>
            <div className="modal-footer">
              <button className="discard-btn" onClick={() => setShowAddModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {showViewModal && selectedShareholderForView && (
        <div className="modal-overlay" onClick={() => setShowViewModal(false)}>
          <div className="modal-content large-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="bi bi-person-badge"></i> Shareholder Details</h2>
              <button className="close-btn" onClick={() => setShowViewModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <div className="shareholder-detail-view">
                <div className="detail-header">
                  <div className="detail-avatar-large">
                    {selectedShareholderForView.profileImage ? (
                      <img
                        src={selectedShareholderForView.profileImage}
                        alt={selectedShareholderForView.fullName}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        onError={(e) => handleImageError(e, selectedShareholderForView)}
                      />
                    ) : (
                      <i className="bi bi-person-circle" style={{ fontSize: '64px', color: '#0d6efd' }}></i>
                    )}
                  </div>
                  <div className="detail-basic">
                    <h3>{selectedShareholderForView.fullName}</h3>
                    <p>ID: {selectedShareholderForView.shareholder_id}</p>
                    <div className="detail-badges">
                      <span className={selectedShareholderForView.status === 'Approved' ? 'status-badge approved' : selectedShareholderForView.status === 'Pending' ? 'status-badge pending' : 'status-badge rejected'}>
                        {selectedShareholderForView.status}
                      </span>
                      <span className={getShareClassBadgeClass(selectedShareholderForView.shareClass)}>{getShareClassLabel(selectedShareholderForView.shareClass)}</span>
                    </div>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><i className="bi bi-person-badge"></i> Personal Information</h4>
                  <div className="detail-grid">
                    <div><strong>Email:</strong> {selectedShareholderForView.email || '-'}</div>
                    <div><strong>Phone:</strong> {selectedShareholderForView.phone || '-'}</div>
                    <div><strong>Address:</strong> {selectedShareholderForView.address || '-'}</div>
                    <div><strong>NRC:</strong> {selectedShareholderForView.nrc || '-'}</div>
                    <div><strong>Date of Birth:</strong> {selectedShareholderForView.dateOfBirth || '-'}</div>
                    <div><strong>Joined Date:</strong> {selectedShareholderForView.joinedDate}</div>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><i className="bi bi-pie-chart"></i> Share Information</h4>
                  <div className="detail-grid">
                    <div><strong>Share Class:</strong> {getShareClassLabel(selectedShareholderForView.shareClass)}</div>
                    <div><strong>Share Quantity:</strong> {selectedShareholderForView.shareQuantity.toLocaleString()}</div>
                    <div><strong>Price per Share:</strong> {formatCurrency(selectedShareholderForView.sharePrice)} MMK</div>
                    <div><strong>Total Investment:</strong> {formatCurrency(selectedShareholderForView.totalInvestment)} MMK</div>
                    <div><strong>Last Amount:</strong> {selectedShareholderForView.lastAmount ? formatCurrency(selectedShareholderForView.lastAmount) + ' MMK' : '-'}</div>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><i className="bi bi-person-heart"></i> Nominee Information</h4>
                  <div className="detail-grid">
                    <div><strong>Name:</strong> {selectedShareholderForView.nominee_name || '-'}</div>
                    <div><strong>Relationship:</strong> {selectedShareholderForView.relationship || '-'}</div>
                    <div><strong>Phone:</strong> {selectedShareholderForView.nominee_phone || '-'}</div>
                  </div>
                </div>
                <div className="detail-section">
                  <h4><i className="bi bi-bank"></i> Banking Info</h4>
                  <div className="detail-grid">
                    <div><strong>Bank 1:</strong> {selectedShareholderForView.bank_name1 ? `${selectedShareholderForView.bank_name1} - ${selectedShareholderForView.account_number1}` : '-'}</div>
                    <div><strong>Bank 2:</strong> {selectedShareholderForView.bank_name2 ? `${selectedShareholderForView.bank_name2} - ${selectedShareholderForView.account_number2}` : '-'}</div>
                    <div><strong>KBZ Pay:</strong> {selectedShareholderForView.kpay || '-'}</div>
                    <div><strong>Wave Pay:</strong> {selectedShareholderForView.wave || '-'}</div>
                    <div><strong>Tax ID:</strong> {selectedShareholderForView.tax || '-'}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="discard-btn" onClick={() => setShowViewModal(false)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {showEditModal && selectedShareholderForEdit && (
        <div className="modal-overlay" onClick={() => setShowEditModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <div className="modal-header">
              <h2><i className="bi bi-pencil-square"></i> Edit Share Class</h2>
              <button className="close-btn" onClick={() => setShowEditModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <div className="alert alert-info mb-3">
                Editing share class for <strong>{selectedShareholderForEdit.fullName}</strong>
              </div>
              <div className="form-group mb-3">
                <label>Share Class</label>
                <select name="shareClass" className="form-select" value={editFormData.shareClass} onChange={handleInputChange}>
                  {shareClassOptions.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                </select>
              </div>
              <div className="alert alert-secondary mt-3">
                <small>Note: Only the share class (Level) will be updated. Share quantity and price remain unchanged.</small>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleUpdateWithPasscode} disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Shareholder;