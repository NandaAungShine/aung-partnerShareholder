import React, { useState, useEffect } from 'react';

export default function Alert({ 
  isOpen, 
  title, 
  message, 
  isInput = false, 
  inputType = "password", 
  showCancel = false,  
  onClose, 
  onSubmit 
}) {
  const [inputValue, setInputValue] = useState('');

  // Alert ပွင့်တိုင်း input ကို ရှင်းပေး
  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  // Alert ပိတ်နေရင် ဘာမှမပြန်ပါနဲ့
  if (!isOpen) return null;

  // ★★★★★ အဓိက အချက် - OK နှိပ်ရင် ဘယ်လိုပဲဖြစ်ဖြစ် ပိတ်သွားအောင် အတင်းသတ်မှတ်ထား ★★★★★
  const handleSubmit = (e) => {
    e.preventDefault();
    
    try {
      // ၁။ သင့်ရဲ့ လုပ်ဆောင်ချက် (Logout / Success) ကို Run ပါ
      if (isInput) {
        onSubmit(inputValue);
      } else {
        onSubmit();
      }
    } catch (error) {
      // Error ဖြစ်ရင်လည်း ဘာမှမလုပ်ပါနဲ့
      console.error('Alert onSubmit error:', error);
    } finally {
      // ၂။ ဘယ်လိုပဲဖြစ်ဖြစ် Alert ကို သေချာပိတ်လိုက်မယ် (ဒီနေရာက အဓိက)
      onClose();
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.modal}>
        {title && <h3 style={styles.title}>{title}</h3>}
        <p style={styles.text}>{message}</p>

        <form onSubmit={handleSubmit}>
          {isInput && (
            <input
              type={inputType}
              placeholder="Enter passcode..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={styles.input}
              autoFocus
              required
            />
          )}

          <div style={styles.buttonGroup}>
            {(isInput || showCancel) && (
              <button type="button" style={styles.cancelBtn} onClick={onClose}>
                Cancel
              </button>
            )}
            <button type="submit" style={styles.submitBtn}>
              OK
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ★★★★★ နောက်ခံ #3c434d နဲ့ စာသားအဖြူ အတိုင်းထားထား ★★★★★
const styles = {
  overlay: {
    position: 'fixed', 
    top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex', 
    justifyContent: 'center', 
    alignItems: 'center',
    zIndex: 9999
  },
  modal: {
    background: '#3c434d', // သင်လိုချင်တဲ့ နောက်ခံအရောင်
    padding: '24px', 
    borderRadius: '12px',
    textAlign: 'center', 
    minWidth: '280px', 
    maxWidth: '80%',
    boxShadow: '0 20px 60px rgba(0,0,0,0.5)'
  },
  title: { 
    margin: '0 0 10px 0', 
    fontSize: '18px', 
    color: '#ffffff' // ခေါင်းစဉ် အဖြူ
  },
  text: { 
    margin: '0 0 16px 0', 
    fontSize: '14px', 
    color: '#f0f4f8' // စာသား အဖြူနု
  },
  input: {
    width: '100%', 
    padding: '10px', 
    fontSize: '16px',
    borderRadius: '6px', 
    background: '#2a3038',
    color: '#ffffff', 
    border: '1px solid #5a6268',
    marginBottom: '16px', 
    boxSizing: 'border-box', 
    textAlign: 'center',
    outline: 'none'
  },
  buttonGroup: { 
    display: 'flex', 
    justifyContent: 'flex-end', 
    gap: '8px' 
  },
  submitBtn: {
    flex: 1, 
    padding: '10px', 
    background: '#4F46E5', // OK ခလုတ် Indigo ရောင်
    color: '#ffffff',
    border: 'none', 
    borderRadius: '6px', 
    cursor: 'pointer', 
    fontWeight: 'bold'
  },
  cancelBtn: {
    flex: 1, 
    padding: '10px', 
    background: '#5a6268',
    color: '#ffffff',
    border: 'none', 
    borderRadius: '6px', 
    cursor: 'pointer'
  }
};