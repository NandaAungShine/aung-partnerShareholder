import React, { useState, useEffect, useRef } from 'react';
import Header from './Header';
import axios from 'axios';

const API_BASE_URL = process.env.NODE_ENV === 'development' ? '' : 'http://130.94.21.185:5000';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

function Settings() {
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const savedTheme = localStorage.getItem('theme');
    return savedTheme === 'dark';
  });

  const [activeTab, setActiveTab] = useState('general');
  const [showSuccessMessage, setShowSuccessMessage] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [isEditingGeneral, setIsEditingGeneral] = useState(false);
  const [isEditingTerms, setIsEditingTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showDeleteContactConfirm, setShowDeleteContactConfirm] = useState(false);
  const [showDeleteTermsConfirm, setShowDeleteTermsConfirm] = useState(false);

  // ========== PROFILE DATA ==========
  const [adminProfile, setAdminProfile] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
    nrc: '',
    dateOfBirth: '',
    joinedDate: '',
    profileImage: '',    
  });
  const [tempProfile, setTempProfile] = useState({ ...adminProfile });
  const [profileImageFile, setProfileImageFile] = useState(null);
  const [uploadingImage, setUploadingImage] = useState(false);
  const fileInputRef = useRef(null);

  // ========== PASSCODE STATUS ==========
  const [hasPasscode, setHasPasscode] = useState(false);

  // ========== PASSWORD MODAL STATE ==========
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordLoading, setPasswordLoading] = useState(false);

  // ========== PASSCODE MODALS ==========
  const [showCreatePasscodeModal, setShowCreatePasscodeModal] = useState(false);
  const [showChangePasscodeModal, setShowChangePasscodeModal] = useState(false);
  const [currentPasscodeForCreate, setCurrentPasscodeForCreate] = useState('');
  const [newPasscode, setNewPasscode] = useState('');
  const [confirmPasscode, setConfirmPasscode] = useState('');
  const [currentPasscodeForHeader, setCurrentPasscodeForHeader] = useState('');
  
  // Eye toggle states
  const [showCurrentPasscode, setShowCurrentPasscode] = useState(false);
  const [showNewPasscode, setShowNewPasscode] = useState(false);
  const [showConfirmPasscode, setShowConfirmPasscode] = useState(false);
  const [passcodeLoading, setPasscodeLoading] = useState(false);

  // ============================================================
  // ✅ API ENDPOINTS
  // ============================================================
  // Password အတွက် URL: /auth/admin/change/password/{id}
  const PASSWORD_CHANGE_URL = '/auth/admin/change/password';
  const PASSCODE_CHECK_URL = '/api/get/passcode';
  const PASSCODE_CREATE_URL = '/api/create/passcode';
  const PASSCODE_CHANGE_URL = '/api/change/passcode';

  const getCurrentUserId = () => {
    const storedUser = localStorage.getItem('user') || localStorage.getItem('profile');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        return user.id || user.userId || 1;
      } catch (e) {
        return 1;
      }
    }
    return 1;
  };

  // ========== CONTACT SETTINGS ==========
  const [contactSettings, setContactSettings] = useState({
    id: null,
    name: '',
    email: '',
    phone1: '',
    phone2: '',
    telegram_channel1: '',
    telegram_channel2: '',
    telegram_name1: '',
    telegram_name2: '',
    viber_phone1: '',
    viber_phone2: '',
  });
  const [tempContactSettings, setTempContactSettings] = useState({ ...contactSettings });

  // ========== TERMS & CONDITION ==========
  const [termsData, setTermsData] = useState({
    id: null,
    title: '',
    content: '',
  });
  const [tempTermsData, setTempTermsData] = useState({ ...termsData });

  // ========== BACKUP SETTINGS ==========
  const [backupSettings, setBackupSettings] = useState({
    autoBackup: true,
    backupFrequency: 'daily',
    backupTime: '02:00',
    backupLocation: 'local',
    lastBackup: '2024-03-23 02:00 AM',
    backupSize: '245 MB',
  });

  // ========== PROFILE FUNCTIONS ==========
  const loadProfileFromStorage = () => {
    const storedUser = localStorage.getItem('user') || localStorage.getItem('profile');
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        const profileData = {
          fullName: user.username || user.full_name || user.name || 'Admin User',
          email: user.email || '',
          phone: user.phone || '',
          address: user.address || '',
          nrc: user.nrc || '',
          dateOfBirth: user.dateOfBirth || user.date_of_birth || '',
          joinedDate: user.created_at ? new Date(user.created_at).toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          profileImage: user.profile_image || user.avatar || '',   
        };
        setAdminProfile(profileData);
        setTempProfile(profileData);
      } catch (e) {
        console.error('Failed to parse user', e);
        useFallbackProfile();
      }
    } else {
      useFallbackProfile();
    }
  };

  const useFallbackProfile = () => {
    const fallback = {
      fullName: 'Admin User',
      email: 'admin@example.com',
      phone: '09685774940',
      address: 'Default Address',
      nrc: 'N/A',
      dateOfBirth: '',
      joinedDate: new Date().toISOString().split('T')[0],
      profileImage: '',
    };
    setAdminProfile(fallback);
    setTempProfile(fallback);
  };

  const updateProfileAPI = async (updatedData) => {
    const userId = getCurrentUserId();
    const payload = {
      username: updatedData.fullName,
      email: updatedData.email,
      phone: updatedData.phone,
      address: updatedData.address,
      nrc: updatedData.nrc,
      date_of_birth: updatedData.dateOfBirth,
    };
    const response = await api.put(`/auth/admin/update/profile/${userId}`, payload);
    if (response.data?.success === true) return true;
    throw new Error(response.data?.message || 'Update failed');
  };

  const uploadProfileImage = async (file) => {
    const userId = getCurrentUserId();
    const formData = new FormData();
    formData.append('profile_image', file);
    const response = await api.put(`/auth/admin/update/profile/${userId}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    if (response.data?.success === true) {
      const newImage = response.data.data?.profile_image || response.data.profile_image || '';
      return newImage;
    }
    throw new Error(response.data?.message || 'Image upload failed');
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      setTempProfile(prev => ({ ...prev, profileImage: reader.result })); 
    };
    reader.readAsDataURL(file);
    setProfileImageFile(file);
  };

  const saveProfileImage = async () => {
    if (!profileImageFile) return;
    setUploadingImage(true);
    try {
      const newImageFilename = await uploadProfileImage(profileImageFile);
      if (newImageFilename) {
        setAdminProfile(prev => ({ ...prev, profileImage: newImageFilename }));
        setTempProfile(prev => ({ ...prev, profileImage: newImageFilename }));
        const storedUser = localStorage.getItem('user') || localStorage.getItem('profile');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.profile_image = newImageFilename;
          localStorage.setItem('user', JSON.stringify(user));
        }
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        window.dispatchEvent(new CustomEvent('shareholderRefresh'));
        window.dispatchEvent(new CustomEvent('profileUpdate'));
      } else {
        console.warn('Upload succeeded but no filename returned');
      }
      setProfileImageFile(null);
    } catch (error) {
      console.error('Upload error:', error);
      const base64Image = tempProfile.profileImage;
      if (base64Image && base64Image.startsWith('data:image')) {
        const storedUser = localStorage.getItem('user') || localStorage.getItem('profile');
        if (storedUser) {
          const user = JSON.parse(storedUser);
          user.profile_image = base64Image;
          localStorage.setItem('user', JSON.stringify(user));
          console.log('Saved base64 image to localStorage as fallback');
          setAdminProfile(prev => ({ ...prev, profileImage: base64Image }));
          setShowSuccessMessage(true);
          setTimeout(() => setShowSuccessMessage(false), 3000);
          window.dispatchEvent(new CustomEvent('shareholderRefresh'));
          window.dispatchEvent(new CustomEvent('profileUpdate'));
        }
      }
      setProfileImageFile(null);
    } finally {
      setUploadingImage(false);
    }
  };

  const handleSaveProfile = async () => {
    setLoading(true);
    try {
      await updateProfileAPI(tempProfile);
      setAdminProfile(prev => ({ ...prev, ...tempProfile }));
      const storedUser = localStorage.getItem('user') || localStorage.getItem('profile');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        user.username = tempProfile.fullName;
        user.email = tempProfile.email;
        user.phone = tempProfile.phone;
        user.address = tempProfile.address;
        user.nrc = tempProfile.nrc;
        user.date_of_birth = tempProfile.dateOfBirth;
        if (!user.profile_image && adminProfile.profileImage) {
          user.profile_image = adminProfile.profileImage;
        }
        localStorage.setItem('user', JSON.stringify(user));
      }
      if (profileImageFile) {
        await saveProfileImage();
      }
      window.dispatchEvent(new CustomEvent('shareholderRefresh'));
      window.dispatchEvent(new CustomEvent('profileUpdate'));
      setIsEditingProfile(false);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      alert('Profile updated successfully!');
    } catch (error) {
      console.error('Profile update failed', error);
      alert('Failed to update: ' + (error.response?.data?.message || error.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelEdit = () => {
    setTempProfile({ ...adminProfile });
    setProfileImageFile(null);
    setIsEditingProfile(false);
  };

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setTempProfile((prev) => ({ ...prev, [name]: value }));
  };

  // ============================================================
  // ✅ PASSWORD CHANGE (PUT /auth/admin/change/password/:id)
  //    Body: { "password": "...", "confirmPassword": "..." }
  //    Response: { "success": true, "message": "Password Change Success!" }
  // ============================================================
  const changePassword = async (userId, password, confirmPassword) => {
    const url = `${PASSWORD_CHANGE_URL}/${userId}`; // /auth/admin/change/password/1
    try {
      const response = await api.put(url, { password, confirmPassword });
      if (response.data?.success === true) return true;
      throw new Error(response.data?.message || 'Password change failed');
    } catch (error) {
      console.error('❌ Password API call failed:', error);
      throw error;
    }
  };

  const handleChangePassword = async () => {
    if (newPassword !== confirmPassword) {
      alert('Password and Confirm Password do not match.');
      return;
    }
    if (newPassword.length < 6) {
      alert('Password must be at least 6 characters.');
      return;
    }
    setPasswordLoading(true);
    try {
      const userId = getCurrentUserId();
      await changePassword(userId, newPassword, confirmPassword);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      alert('Password changed successfully!');
      setNewPassword('');
      setConfirmPassword('');
      setShowPassword(false);
      setShowConfirmPassword(false);
      setShowPasswordModal(false);
    } catch (error) {
      alert(`❌ Failed to change password. ${error.response?.data?.message || error.message}`);
    } finally {
      setPasswordLoading(false);
    }
  };

  // ============================================================
  // ✅ PASSCODE - CHECK (GET /api/get/passcode)
  // ============================================================
  const checkPasscodeExists = async () => {
    try {
      const response = await api.get(PASSCODE_CHECK_URL);
      if (response.data?.success === true) {
        setHasPasscode(response.data.exists === true);
      } else {
        setHasPasscode(false);
      }
    } catch (error) {
      if (error.response?.status === 404) {
        setHasPasscode(false);
        return;
      }
      console.warn('Passcode check failed, assuming no passcode exists.', error);
      setHasPasscode(false);
    }
  };

  // ============================================================
  // ✅ PASSCODE - CREATE (POST /api/create/passcode)
  // ============================================================
  const createPasscode = async (passcode, confirmPasscode, currentPasscode) => {
    try {
      const response = await api.post(
        PASSCODE_CREATE_URL,
        { passcode, confirmPasscode },
        {
          headers: { 'x-passcode': currentPasscode }
        }
      );
      if (response.data?.success === true) return true;
      throw new Error(response.data?.message || 'Passcode creation failed');
    } catch (error) {
      console.error('❌ Passcode create API call failed:', error.response?.data);
      throw error;
    }
  };

  const handleCreatePasscode = async () => {
    if (!currentPasscodeForCreate || !/^\d{6}$/.test(currentPasscodeForCreate)) {
      alert('Please enter your current 6-digit passcode.');
      return;
    }
    if (newPasscode !== confirmPasscode) {
      alert('New Passcode and Confirm Passcode do not match.');
      return;
    }
    if (!/^\d{6}$/.test(newPasscode)) {
      alert('New Passcode must be exactly 6 digits (numbers only).');
      return;
    }
    setPasscodeLoading(true);
    try {
      await createPasscode(newPasscode, confirmPasscode, currentPasscodeForCreate);
      
      localStorage.setItem('passcode', newPasscode);
      
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      alert('Passcode created successfully!');
      setHasPasscode(true);
      setCurrentPasscodeForCreate('');
      setNewPasscode('');
      setConfirmPasscode('');
      setShowCurrentPasscode(false);
      setShowNewPasscode(false);
      setShowConfirmPasscode(false);
      setShowCreatePasscodeModal(false);
    } catch (error) {
      alert(`❌ Failed to create passcode. ${error.response?.data?.message || error.message}`);
    } finally {
      setPasscodeLoading(false);
    }
  };

  // ============================================================
  // ✅ PASSCODE - CHANGE (PUT /api/change/passcode/{userId})
  // ============================================================
  const changePasscode = async (userId, passcode, confirmPasscode, currentPasscode) => {
    const url = `${PASSCODE_CHANGE_URL}/${userId}`;
    try {
      const response = await api.put(
        url,
        { passcode, confirmPasscode },
        {
          headers: { 'x-passcode': currentPasscode }
        }
      );
      if (response.data?.success === true) return true;
      throw new Error(response.data?.message || 'Passcode change failed');
    } catch (error) {
      console.error('❌ Passcode API call failed:', error.response?.data);
      throw error;
    }
  };

  const handleChangePasscode = async () => {
    if (!currentPasscodeForHeader || !/^\d{6}$/.test(currentPasscodeForHeader)) {
      alert('Please enter your current 6-digit passcode.');
      return;
    }
    if (newPasscode !== confirmPasscode) {
      alert('New Passcode and Confirm Passcode do not match.');
      return;
    }
    if (!/^\d{6}$/.test(newPasscode)) {
      alert('New Passcode must be exactly 6 digits (numbers only).');
      return;
    }
    setPasscodeLoading(true);
    try {
      const userId = getCurrentUserId();
      await changePasscode(userId, newPasscode, confirmPasscode, currentPasscodeForHeader);
      
      localStorage.setItem('passcode', newPasscode);
      
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      alert('Passcode changed successfully!');
      setCurrentPasscodeForHeader('');
      setNewPasscode('');
      setConfirmPasscode('');
      setShowCurrentPasscode(false);
      setShowNewPasscode(false);
      setShowConfirmPasscode(false);
      setShowChangePasscodeModal(false);
    } catch (error) {
      alert(`❌ Failed to change passcode. ${error.response?.data?.message || error.message}`);
    } finally {
      setPasscodeLoading(false);
    }
  };

  // ========== CONTACT SETTINGS ==========
  const fetchContactSettings = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/admin/contact/list');
      if (response.data?.success === true && response.data.data) {
        const data = Array.isArray(response.data.data) ? response.data.data[0] : response.data.data;
        if (data) {
          setContactSettings({
            id: data.id,
            name: data.name || '',
            email: data.email || '',
            phone1: data.phone1 || '',
            phone2: data.phone2 || '',
            telegram_channel1: data.telegram_channel1 || '',
            telegram_channel2: data.telegram_channel2 || '',
            telegram_name1: data.telegram_name1 || '',
            telegram_name2: data.telegram_name2 || '',
            viber_phone1: data.viber_phone1 || '',
            viber_phone2: data.viber_phone2 || '',
          });
          setTempContactSettings({ ...contactSettings });
        }
      }
    } catch (error) {
      console.error('Fetch contact settings error:', error);
    } finally {
      setLoading(false);
    }
  };

  const createContactSettings = async (data) => {
    const payload = { ...data };
    const response = await api.post('/api/admin/contact/create', payload);
    if (response.data?.success === true) return response.data.data;
    throw new Error(response.data?.message || 'Create failed');
  };

  const updateContactSettings = async (id, data) => {
    const payload = { ...data };
    const response = await api.put(`/api/admin/contact/update/${id}`, payload);
    if (response.data?.success === true) return true;
    throw new Error(response.data?.message || 'Update failed');
  };

  const deleteContactSettings = async (id) => {
    const response = await api.delete(`/api/admin/contact/delete/${id}`);
    if (response.data?.success === true) return true;
    throw new Error(response.data?.message || 'Delete failed');
  };

  const saveGeneralSettings = async () => {
    setLoading(true);
    try {
      let success = false;
      if (contactSettings.id) {
        await updateContactSettings(contactSettings.id, tempContactSettings);
        success = true;
      } else {
        const result = await createContactSettings(tempContactSettings);
        if (result && result.id) {
          setContactSettings((prev) => ({ ...prev, id: result.id }));
          success = true;
        }
      }
      if (success) {
        setContactSettings({ ...tempContactSettings });
        setShowSuccessMessage(true);
        setTimeout(() => setShowSuccessMessage(false), 3000);
        setIsEditingGeneral(false);
        await fetchContactSettings();
      } else {
        alert('Failed to save settings');
      }
    } catch (error) {
      console.error('Save error:', error);
      alert(`Error: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteContact = async () => {
    if (!contactSettings.id) return;
    setLoading(true);
    try {
      await deleteContactSettings(contactSettings.id);
      const emptySettings = {
        id: null,
        name: '',
        email: '',
        phone1: '',
        phone2: '',
        telegram_channel1: '',
        telegram_channel2: '',
        telegram_name1: '',
        telegram_name2: '',
        viber_phone1: '',
        viber_phone2: '',
      };
      setContactSettings(emptySettings);
      setTempContactSettings(emptySettings);
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      setShowDeleteContactConfirm(false);
      setIsEditingGeneral(false);
    } catch (error) {
      console.error('Delete error:', error);
      alert(`Delete failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleGeneralInputChange = (e) => {
    const { name, value } = e.target;
    setTempContactSettings((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditGeneral = () => {
    setTempContactSettings({ ...contactSettings });
    setIsEditingGeneral(true);
  };

  const handleCancelGeneral = () => {
    setTempContactSettings({ ...contactSettings });
    setIsEditingGeneral(false);
  };

  // ========== TERMS & CONDITION ==========
  const fetchTerms = async () => {
    setLoading(true);
    try {
      const response = await api.get('/api/list/condition');
      let conditions = [];
      if (response.data?.success && Array.isArray(response.data.data)) conditions = response.data.data;
      else if (Array.isArray(response.data)) conditions = response.data;
      if (conditions.length > 0) {
        const term = conditions[0];
        setTermsData({
          id: term.id,
          title: term.title || '',
          content: term.content || term.message || '',
        });
        setTempTermsData({
          id: term.id,
          title: term.title || '',
          content: term.content || term.message || '',
        });
      } else {
        setTermsData({ id: null, title: '', content: '' });
        setTempTermsData({ id: null, title: '', content: '' });
      }
    } catch (error) {
      console.error('Fetch terms error:', error);
      setTermsData({ id: null, title: '', content: '' });
      setTempTermsData({ id: null, title: '', content: '' });
    } finally {
      setLoading(false);
    }
  };

  const createTerms = async (data) => {
    const payload = { title: data.title || '', content: data.content || '', message: data.content || '' };
    const response = await api.post('/api/create/condition', payload);
    if (response.data?.success === true) return response.data.data;
    throw new Error(response.data?.message || 'Create failed');
  };

  const updateTerms = async (id, data) => {
    const payload = { title: data.title || '', content: data.content || '', message: data.content || '' };
    const response = await api.put(`/api/update/condition/${id}`, payload);
    if (response.data?.success === true) return true;
    throw new Error(response.data?.message || 'Update failed');
  };

  const deleteTerms = async (id) => {
    const response = await api.delete(`/api/delete/condition/${id}`);
    if (response.data?.success === true) return true;
    throw new Error(response.data?.message || 'Delete failed');
  };

  const handleSaveTerms = async () => {
    setLoading(true);
    try {
      if (termsData.id) {
        await updateTerms(termsData.id, tempTermsData);
        setTermsData({ ...tempTermsData });
      } else {
        const newTerm = await createTerms(tempTermsData);
        setTermsData({ id: newTerm.id, title: newTerm.title, content: newTerm.content });
        setTempTermsData({ id: newTerm.id, title: newTerm.title, content: newTerm.content });
      }
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      setIsEditingTerms(false);
      await fetchTerms();
    } catch (error) {
      console.error('Save terms error:', error);
      alert(`Save failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTerms = async () => {
    if (!termsData.id) return;
    setLoading(true);
    try {
      await deleteTerms(termsData.id);
      setTermsData({ id: null, title: '', content: '' });
      setTempTermsData({ id: null, title: '', content: '' });
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
      setShowDeleteTermsConfirm(false);
      setIsEditingTerms(false);
      await fetchTerms();
    } catch (error) {
      console.error('Delete terms error:', error);
      alert(`Delete failed: ${error.response?.data?.message || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEditTerms = () => {
    setTempTermsData({ ...termsData });
    setIsEditingTerms(true);
  };

  const handleCancelTerms = () => {
    setTempTermsData({ ...termsData });
    setIsEditingTerms(false);
  };

  const handleResetTerms = () => {
    setTempTermsData({ id: null, title: '', content: '' });
    if (!isEditingTerms) {
      setTermsData({ id: null, title: '', content: '' });
      setShowSuccessMessage(true);
      setTimeout(() => setShowSuccessMessage(false), 3000);
    }
  };

  const handleTermsInputChange = (e) => {
    const { name, value } = e.target;
    setTempTermsData((prev) => ({ ...prev, [name]: value }));
  };

  // ========== THEME & INIT ==========
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

  useEffect(() => {
    loadProfileFromStorage();
    fetchContactSettings();
    fetchTerms();
    checkPasscodeExists();
  }, []);

  const handleResetSettings = () => setShowResetConfirm(true);
  const confirmReset = () => setShowResetConfirm(false);
  const performBackup = () => alert('Backup initiated.');
  const handleSaveSettings = () => {
    setShowSuccessMessage(true);
    setTimeout(() => setShowSuccessMessage(false), 3000);
  };

  const getTabClass = (tabName) => `settings-tab ${activeTab === tabName ? 'active' : ''}`;
  const getStatusBadgeClass = (status) => `status-badge ${status === 'Active' ? 'active' : 'inactive'}`;

  const SwitchButton = ({ checked, onChange, label }) => (
    <label className="switch-button">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="switch-slider"></span>
      <span className="switch-label">{label}</span>
    </label>
  );

  const getDisplayImageUrl = (imageValue) => {
    if (!imageValue) return null;
    if (imageValue.startsWith('data:') || imageValue.startsWith('http')) return imageValue;
    return `/uploads/${imageValue}`;
  };

  // ========== RENDER ==========
  return (
    <div className={`dashboard-container ${isDarkMode ? 'dark-theme' : 'light-theme'}`}>
      <Header title="Settings" onThemeChange={handleThemeChange} />

      {showSuccessMessage && (
        <div className="success-message">
          <i className="bi bi-check-circle-fill"></i> Settings saved successfully!
        </div>
      )}

      {showResetConfirm && (
        <div className="modal-overlay" onClick={() => setShowResetConfirm(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reset All Settings</h2>
              <button className="close-btn" onClick={() => setShowResetConfirm(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to reset all settings to default values?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="discard-btn" onClick={() => setShowResetConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={confirmReset}>Reset All</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteContactConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteContactConfirm(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="close-btn" onClick={() => setShowDeleteContactConfirm(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the contact settings?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="discard-btn" onClick={() => setShowDeleteContactConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteContact}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {showDeleteTermsConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeleteTermsConfirm(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Confirm Delete</h2>
              <button className="close-btn" onClick={() => setShowDeleteTermsConfirm(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to delete the Terms & Condition?</p>
              <p className="warning-text">This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="discard-btn" onClick={() => setShowDeleteTermsConfirm(false)}>Cancel</button>
              <button className="btn-danger" onClick={handleDeleteTerms}>Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ====== CHANGE PASSWORD MODAL ====== */}
      {showPasswordModal && (
        <div className="modal-overlay" onClick={() => setShowPasswordModal(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="bi bi-lock-fill"></i> Change Password</h2>
              <button className="close-btn" onClick={() => setShowPasswordModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>New Password</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="form-control"
                    placeholder="Enter new password (min 6 chars)"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: 'var(--text-color)',
                      opacity: 0.7,
                      padding: '4px 8px'
                    }}
                  >
                    <i className={showPassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"}></i>
                  </button>
                </div>
              </div>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Confirm New Password</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="form-control"
                    placeholder="Re-enter new password"
                    style={{ flex: 1 }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: 'var(--text-color)',
                      opacity: 0.7,
                      padding: '4px 8px'
                    }}
                  >
                    <i className={showConfirmPassword ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"}></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="discard-btn" onClick={() => setShowPasswordModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleChangePassword} disabled={passwordLoading}>
                {passwordLoading ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== CREATE PASSCODE MODAL ====== */}
      {showCreatePasscodeModal && (
        <div className="modal-overlay" onClick={() => setShowCreatePasscodeModal(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="bi bi-shield-lock-fill"></i> Create Passcode</h2>
              <button className="close-btn" onClick={() => setShowCreatePasscodeModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Current Passcode <span style={{ color: 'red' }}>*</span></label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type={showCurrentPasscode ? "text" : "password"}
                    maxLength="6"
                    value={currentPasscodeForCreate}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCurrentPasscodeForCreate(value);
                    }}
                    className="form-control"
                    placeholder="Enter current 6-digit passcode"
                    style={{ flex: 1 }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPasscode(!showCurrentPasscode)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: 'var(--text-color)',
                      opacity: 0.7,
                      padding: '4px 8px'
                    }}
                  >
                    <i className={showCurrentPasscode ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"}></i>
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label>New Passcode (6-digit number)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type={showNewPasscode ? "text" : "password"}
                    maxLength="6"
                    value={newPasscode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setNewPasscode(value);
                    }}
                    className="form-control"
                    placeholder="Enter new 6-digit passcode"
                    style={{ flex: 1 }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasscode(!showNewPasscode)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: 'var(--text-color)',
                      opacity: 0.7,
                      padding: '4px 8px'
                    }}
                  >
                    <i className={showNewPasscode ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"}></i>
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Confirm New Passcode</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type={showConfirmPasscode ? "text" : "password"}
                    maxLength="6"
                    value={confirmPasscode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setConfirmPasscode(value);
                    }}
                    className="form-control"
                    placeholder="Re-enter passcode"
                    style={{ flex: 1 }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPasscode(!showConfirmPasscode)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: 'var(--text-color)',
                      opacity: 0.7,
                      padding: '4px 8px'
                    }}
                  >
                    <i className={showConfirmPasscode ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"}></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="discard-btn" onClick={() => setShowCreatePasscodeModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreatePasscode} disabled={passcodeLoading}>
                {passcodeLoading ? 'Creating...' : 'Create Passcode'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ====== CHANGE PASSCODE MODAL ====== */}
      {showChangePasscodeModal && (
        <div className="modal-overlay" onClick={() => setShowChangePasscodeModal(false)}>
          <div className="modal-content-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2><i className="bi bi-shield-lock-fill"></i> Change Passcode</h2>
              <button className="close-btn" onClick={() => setShowChangePasscodeModal(false)}><i className="bi bi-x-lg"></i></button>
            </div>
            <div className="modal-body">
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Current Passcode (6-digit number)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type={showCurrentPasscode ? "text" : "password"}
                    maxLength="6"
                    value={currentPasscodeForHeader}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setCurrentPasscodeForHeader(value);
                    }}
                    className="form-control"
                    placeholder="Enter current 6-digit passcode"
                    style={{ flex: 1 }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPasscode(!showCurrentPasscode)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: 'var(--text-color)',
                      opacity: 0.7,
                      padding: '4px 8px'
                    }}
                  >
                    <i className={showCurrentPasscode ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"}></i>
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem', borderTop: '1px solid var(--border-color)', paddingTop: '1rem' }}>
                <label>New Passcode (6-digit number)</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type={showNewPasscode ? "text" : "password"}
                    maxLength="6"
                    value={newPasscode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setNewPasscode(value);
                    }}
                    className="form-control"
                    placeholder="Enter new 6-digit passcode"
                    style={{ flex: 1 }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPasscode(!showNewPasscode)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: 'var(--text-color)',
                      opacity: 0.7,
                      padding: '4px 8px'
                    }}
                  >
                    <i className={showNewPasscode ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"}></i>
                  </button>
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label>Confirm New Passcode</label>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <input
                    type={showConfirmPasscode ? "text" : "password"}
                    maxLength="6"
                    value={confirmPasscode}
                    onChange={(e) => {
                      const value = e.target.value.replace(/\D/g, '').slice(0, 6);
                      setConfirmPasscode(value);
                    }}
                    className="form-control"
                    placeholder="Re-enter new passcode"
                    style={{ flex: 1 }}
                    inputMode="numeric"
                    pattern="[0-9]*"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPasscode(!showConfirmPasscode)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '1.2rem',
                      color: 'var(--text-color)',
                      opacity: 0.7,
                      padding: '4px 8px'
                    }}
                  >
                    <i className={showConfirmPasscode ? "bi bi-eye-slash-fill" : "bi bi-eye-fill"}></i>
                  </button>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <button className="discard-btn" onClick={() => setShowChangePasscodeModal(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleChangePasscode} disabled={passcodeLoading}>
                {passcodeLoading ? 'Changing...' : 'Change Passcode'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="settings-two-columns">
        {/* LEFT - PROFILE CARD */}
        <div className="admin-profile-card">
          <div className="profile-header">
            <div className="profile-image-section">
              <div className="profile-avatar-large">
                {tempProfile.profileImage ? (
                  <img 
                    src={getDisplayImageUrl(tempProfile.profileImage)} 
                    alt="Profile" 
                    className="profile-img"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = 'https://cdn-icons-png.flaticon.com/512/149/149071.png';
                    }}
                  />
                ) : (
                  <span className="avatar-emoji">👤</span>
                )}
              </div>
              {isEditingProfile && (
                <div className="profile-image-edit">
                  <button type="button" className="image-edit-btn" onClick={() => fileInputRef.current.click()} disabled={uploadingImage}>
                    <i className="bi bi-camera-fill"></i> Change Photo
                  </button>
                  <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleImageChange} />
                  {profileImageFile && (
                    <button type="button" className="image-save-btn" onClick={saveProfileImage} disabled={uploadingImage}>
                      {uploadingImage ? 'Uploading...' : 'Save Photo'}
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="profile-info">
              {isEditingProfile ? (
                <input type="text" name="fullName" value={tempProfile.fullName} onChange={handleProfileChange} className="profile-name-input" />
              ) : (
                <h2>{adminProfile.fullName || 'Admin User'}</h2>
              )}
              <span className={getStatusBadgeClass('Active')}>Active</span>
            </div>
          </div>

          <div className="profile-details">
            <div className="detail-item">
              <i className="bi bi-envelope-fill"></i>
              <div className="detail-content">
                <span className="detail-label">Email</span>
                {isEditingProfile ? (
                  <input type="email" name="email" value={tempProfile.email} onChange={handleProfileChange} className="detail-input" />
                ) : (
                  <span className="detail-value">{adminProfile.email || '-'}</span>
                )}
              </div>
            </div>
            <div className="detail-item">
              <i className="bi bi-telephone-fill"></i>
              <div className="detail-content">
                <span className="detail-label">Phone</span>
                {isEditingProfile ? (
                  <input type="text" name="phone" value={tempProfile.phone} onChange={handleProfileChange} className="detail-input" />
                ) : (
                  <span className="detail-value">{adminProfile.phone || '-'}</span>
                )}
              </div>
            </div>
            <div className="detail-item">
              <i className="bi bi-geo-alt-fill"></i>
              <div className="detail-content">
                <span className="detail-label">Address</span>
                {isEditingProfile ? (
                  <input type="text" name="address" value={tempProfile.address} onChange={handleProfileChange} className="detail-input" />
                ) : (
                  <span className="detail-value">{adminProfile.address || '-'}</span>
                )}
              </div>
            </div>
            <div className="detail-item">
              <i className="bi bi-card-text"></i>
              <div className="detail-content">
                <span className="detail-label">NRC</span>
                {isEditingProfile ? (
                  <input type="text" name="nrc" value={tempProfile.nrc} onChange={handleProfileChange} className="detail-input" />
                ) : (
                  <span className="detail-value">{adminProfile.nrc || '-'}</span>
                )}
              </div>
            </div>
            <div className="detail-item">
              <i className="bi bi-calendar-date"></i>
              <div className="detail-content">
                <span className="detail-label">Date of Birth</span>
                {isEditingProfile ? (
                  <input type="date" name="dateOfBirth" value={tempProfile.dateOfBirth} onChange={handleProfileChange} className="detail-input" />
                ) : (
                  <span className="detail-value">{adminProfile.dateOfBirth || '-'}</span>
                )}
              </div>
            </div>
            <div className="detail-item">
              <i className="bi bi-calendar-check-fill"></i>
              <div className="detail-content">
                <span className="detail-label">Joined Date</span>
                <span className="detail-value">{adminProfile.joinedDate || '-'}</span>
              </div>
            </div>
          </div>

          {isEditingProfile ? (
            <div className="profile-edit-actions">
              <button className="cancel-edit-btn" onClick={handleCancelEdit}>Cancel</button>
              <button className="save-profile-btn" onClick={handleSaveProfile} disabled={loading || uploadingImage}>
                {loading ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <button className="edit-profile-btn" onClick={() => setIsEditingProfile(true)}>
                <i className="bi bi-pencil-square"></i> Edit Profile
              </button>
              <button className="edit-profile-btn" style={{ background: '#0d6efd', marginTop: '0' }} onClick={() => setShowPasswordModal(true)}>
                <i className="bi bi-lock-fill"></i> Change Password
              </button>
              {!hasPasscode ? (
                <button className="edit-profile-btn" style={{ background: '#28a745', marginTop: '0' }} onClick={() => setShowCreatePasscodeModal(true)}>
                  <i className="bi bi-plus-circle-fill"></i> Create Passcode
                </button>
              ) : (
                <button className="edit-profile-btn" style={{ background: '#6f42c1', marginTop: '0' }} onClick={() => setShowChangePasscodeModal(true)}>
                  <i className="bi bi-shield-lock-fill"></i> Change Passcode
                </button>
              )}
            </div>
          )}
        </div>

        {/* RIGHT - SETTINGS TABS */}
        <div className="settings-right-column">
          <div className="settings-tabs-container">
            <div className="settings-tabs">
              <button className={getTabClass('general')} onClick={() => setActiveTab('general')}>
                <i className="bi bi-telephone-fill"></i> Contact
              </button>
              <button className={getTabClass('terms')} onClick={() => setActiveTab('terms')}>
                <i className="bi bi-file-text-fill"></i> Terms & Condition
              </button>
              <button className={getTabClass('backup')} onClick={() => setActiveTab('backup')}>
                <i className="bi bi-database-fill"></i> Backup
              </button>
            </div>
          </div>

          <div className="settings-content">
            {/* GENERAL TAB */}
            {activeTab === 'general' && (
              <div className="settings-section">
                <h2 className="section-title"><i className="bi bi-telephone-fill"></i> Contact Settings</h2>
                <div className="settings-form">
                  <div className="form-row">
                    <div className="form-group"><label>Name</label><input type="text" name="name" value={tempContactSettings.name} onChange={handleGeneralInputChange} disabled={!isEditingGeneral} placeholder="Contact person name" /></div>
                    <div className="form-group"><label>Email</label><input type="email" name="email" value={tempContactSettings.email} onChange={handleGeneralInputChange} disabled={!isEditingGeneral} placeholder="contact@example.com" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>📞 Phone 1</label><input type="text" name="phone1" value={tempContactSettings.phone1} onChange={handleGeneralInputChange} disabled={!isEditingGeneral} placeholder="+959xxxxxxxx" /></div>
                    <div className="form-group"><label>📞 Phone 2</label><input type="text" name="phone2" value={tempContactSettings.phone2} onChange={handleGeneralInputChange} disabled={!isEditingGeneral} placeholder="+959xxxxxxxx" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>📢 Telegram Channel 1</label><input type="url" name="telegram_channel1" value={tempContactSettings.telegram_channel1} onChange={handleGeneralInputChange} disabled={!isEditingGeneral} placeholder="https://t.me/..." /></div>
                    <div className="form-group"><label>📢 Telegram Channel 2</label><input type="url" name="telegram_channel2" value={tempContactSettings.telegram_channel2} onChange={handleGeneralInputChange} disabled={!isEditingGeneral} placeholder="https://t.me/..." /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>📱 Telegram Username 1</label><input type="text" name="telegram_name1" value={tempContactSettings.telegram_name1} onChange={handleGeneralInputChange} disabled={!isEditingGeneral} placeholder="@username" /></div>
                    <div className="form-group"><label>📱 Telegram Username 2</label><input type="text" name="telegram_name2" value={tempContactSettings.telegram_name2} onChange={handleGeneralInputChange} disabled={!isEditingGeneral} placeholder="@username" /></div>
                  </div>
                  <div className="form-row">
                    <div className="form-group"><label>💬 Viber Phone 1</label><input type="text" name="viber_phone1" value={tempContactSettings.viber_phone1} onChange={handleGeneralInputChange} disabled={!isEditingGeneral} placeholder="+959xxxxxxxx" /></div>
                    <div className="form-group"><label>💬 Viber Phone 2</label><input type="text" name="viber_phone2" value={tempContactSettings.viber_phone2} onChange={handleGeneralInputChange} disabled={!isEditingGeneral} placeholder="+959xxxxxxxx" /></div>
                  </div>
                </div>
                <div className="settings-actions">
                  {!isEditingGeneral ? (
                    <>
                      <button className="btn-primary" onClick={handleEditGeneral} disabled={loading}><i className="bi bi-pencil-square"></i> Edit</button>
                      {contactSettings.id && (<button className="btn-danger" onClick={() => setShowDeleteContactConfirm(true)} disabled={loading}><i className="bi bi-trash-fill"></i> Delete</button>)}
                    </>
                  ) : (
                    <>
                      <button className="btn-secondary" onClick={handleCancelGeneral}><i className="bi bi-x-lg"></i> Cancel</button>
                      <button className="btn-primary" onClick={saveGeneralSettings} disabled={loading}>{loading ? <i className="bi bi-arrow-repeat spin"></i> : <i className="bi bi-check-lg"></i>} Save Changes</button>
                    </>
                  )}
                  <button className="btn-secondary" onClick={handleResetSettings}><i className="bi bi-arrow-repeat"></i> Reset to Default</button>
                </div>
              </div>
            )}

            {/* TERMS TAB */}
            {activeTab === 'terms' && (
              <div className="settings-section">
                <h2 className="section-title"><i className="bi bi-file-text-fill"></i> Terms & Condition</h2>
                <div className="settings-form">
                  <div className="form-group">
                    <label>Title (Optional)</label>
                    {isEditingTerms ? (
                      <input type="text" name="title" value={tempTermsData.title} onChange={handleTermsInputChange} className="form-control" placeholder="e.g., Terms of Service" />
                    ) : (
                      <div className="terms-preview-title" style={{ padding: '0.5rem 0', fontWeight: 'bold' }}>{termsData.title || '(No title)'}</div>
                    )}
                  </div>
                  <div className="form-group">
                    <label>Content (Required)</label>
                    {isEditingTerms ? (
                      <textarea name="content" rows="12" value={tempTermsData.content} onChange={handleTermsInputChange} className="form-control" placeholder="Enter the full terms and conditions here..." style={{ width: '100%', fontFamily: 'inherit' }} />
                    ) : (
                      <div className="terms-preview" style={{ background: 'var(--card-bg)', padding: '1rem', borderRadius: '12px', border: '1px solid var(--border-color)', maxHeight: '400px', overflowY: 'auto' }}>
                        {termsData.content ? <div dangerouslySetInnerHTML={{ __html: termsData.content.replace(/\n/g, '<br/>') }} /> : <p className="text-muted">No content yet.</p>}
                      </div>
                    )}
                  </div>
                </div>
                <div className="settings-actions">
                  {!isEditingTerms ? (
                    <>
                      <button className="btn-primary" onClick={handleEditTerms} disabled={loading}><i className="bi bi-pencil-square"></i> Edit</button>
                      {termsData.id && (<button className="btn-danger" onClick={() => setShowDeleteTermsConfirm(true)} disabled={loading}><i className="bi bi-trash-fill"></i> Delete</button>)}
                    </>
                  ) : (
                    <>
                      <button className="btn-secondary" onClick={handleCancelTerms}><i className="bi bi-x-lg"></i> Cancel</button>
                      <button className="btn-primary" onClick={handleSaveTerms} disabled={loading}>{loading ? <i className="bi bi-arrow-repeat spin"></i> : <i className="bi bi-check-lg"></i>} Save Changes</button>
                    </>
                  )}
                  <button className="btn-secondary" onClick={handleResetTerms}><i className="bi bi-arrow-repeat"></i> Reset to Default</button>
                </div>
              </div>
            )}

            {/* BACKUP TAB */}
            {activeTab === 'backup' && (
              <div className="settings-section">
                <h2 className="section-title"><i className="bi bi-database-fill"></i> Backup Settings</h2>
                <div className="settings-form">
                  <div className="backup-info-card">
                    <div className="backup-info-row"><span>Last Backup:</span><strong>{backupSettings.lastBackup}</strong></div>
                    <div className="backup-info-row"><span>Backup Size:</span><strong>{backupSettings.backupSize}</strong></div>
                  </div>
                  <div className="switch-group">
                    <SwitchButton checked={backupSettings.autoBackup} onChange={(checked) => setBackupSettings((prev) => ({ ...prev, autoBackup: checked }))} label="Enable Automatic Backups" />
                  </div>
                  {backupSettings.autoBackup && (
                    <>
                      <div className="form-row">
                        <div className="form-group"><label>Backup Frequency</label><select value={backupSettings.backupFrequency} onChange={(e) => setBackupSettings((prev) => ({ ...prev, backupFrequency: e.target.value }))}><option value="daily">Daily</option><option value="weekly">Weekly</option><option value="monthly">Monthly</option></select></div>
                        <div className="form-group"><label>Backup Time</label><input type="time" value={backupSettings.backupTime} onChange={(e) => setBackupSettings((prev) => ({ ...prev, backupTime: e.target.value }))} /></div>
                      </div>
                      <div className="form-group"><label>Backup Location</label><select value={backupSettings.backupLocation} onChange={(e) => setBackupSettings((prev) => ({ ...prev, backupLocation: e.target.value }))}><option value="local">Local Server</option><option value="cloud">Cloud Storage</option><option value="both">Both</option></select></div>
                    </>
                  )}
                  <div className="backup-actions">
                    <button className="btn-secondary" onClick={performBackup}><i className="bi bi-cloud-upload"></i> Backup Now</button>
                    <button className="btn-secondary"><i className="bi bi-download"></i> Download Latest Backup</button>
                  </div>
                </div>
                <div className="settings-actions">
                  <button className="btn-secondary" onClick={handleResetSettings}><i className="bi bi-arrow-repeat"></i> Reset to Default</button>
                  <button className="btn-primary" onClick={handleSaveSettings}><i className="bi bi-check-lg"></i> Save Changes</button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default Settings;