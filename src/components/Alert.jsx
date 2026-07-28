import React, { useState, useEffect } from 'react';

export default function Alert({ isOpen, title, message, isInput = false, inputType = "password", onClose, onSubmit }) {
  const [inputValue, setInputValue] = useState('');

  useEffect(() => {
    if (isOpen) setInputValue('');
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (isInput) {
      onSubmit(inputValue); 
    }
    onClose();
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
            
            {isInput && (
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

const styles = {
  overlay: {
    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    display: 'flex', justifyContent: 'center', alignItems: 'center',
    zIndex: 9999
  },
  modal: {
    background: '#fff', padding: '24px', borderRadius: '12px',
    textAlign: 'center', minWidth: '280px', maxWidth: '80%',
    boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
  },
  title: { margin: '0 0 10px 0', fontSize: '18px', color: '#111' },
  text: { margin: '0 0 16px 0', fontSize: '14px', color: '#555' },
  input: {
    width: '100%', padding: '10px', fontSize: '16px',
    borderRadius: '6px', border: '1px solid #ccc',
    marginBottom: '16px', boxSizing: 'border-box', textAlign: 'center'
  },
  buttonGroup: { display: 'flex', justifyContent: 'flex-end', gap: '8px' },
  submitBtn: {
    flex: 1, padding: '10px', background: '#007bff', color: '#fff',
    border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 'bold'
  },
  cancelBtn: {
    flex: 1, padding: '10px', background: '#e0e0e0', color: '#333',
    border: 'none', borderRadius: '6px', cursor: 'pointer'
  }
};