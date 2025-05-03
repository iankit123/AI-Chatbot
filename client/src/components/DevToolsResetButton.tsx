import React from 'react';

export const DevToolsResetButton = () => {
  const handleReset = () => {
    // Try to get the current companion id from localStorage
    let companionId = 'priya';
    try {
      const saved = localStorage.getItem('selectedCompanion');
      if (saved) companionId = JSON.parse(saved).id;
    } catch {}
    localStorage.removeItem('guestProfile');
    localStorage.setItem(`messageCount_${companionId}`, '0');
    window.location.reload();
  };

  return (
    <button
      style={{
        position: 'fixed',
        bottom: 16,
        right: 16,
        zIndex: 9999,
        background: '#f44336',
        color: 'white',
        border: 'none',
        borderRadius: 8,
        padding: '10px 18px',
        fontWeight: 'bold',
        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
        cursor: 'pointer',
        display: 'none', // Hide the button but keep functionality
      }}
      onClick={handleReset}
      title="Reset localStorage for first-message test"
    >
      Reset Chat State
    </button>
  );
}; 