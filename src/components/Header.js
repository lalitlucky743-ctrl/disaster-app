import React from 'react';

const Header = ({ onRefresh, onOperationCenter, onSettingsToggle, onAvatarToggle }) => {
  return (
    <header>
      <div className="header-left">
        <div className="logo-badge">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
          </svg>
        </div>
        <div>
          <div className="header-title">GLOBAL DISASTER RELIEF SYSTEM</div>
          <div className="header-sub">3D Interactive Command and Control Dashboard</div>
        </div>
      </div>
      <div className="header-right">
        <span className="op-center-label">Operation Center</span>
        
        {/* 🔄 Refresh Button */}
        <button className="icon-btn" onClick={onRefresh} aria-label="Refresh">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M4 4v5h.582M20 20v-5h-.581M5.635 8.635A9 9 0 0119.4 15M18.4 15.4A9 9 0 014.6 9"/>
          </svg>
        </button>
        
        {/* 🛰️ Operation Center Button */}
        <button className="icon-btn" onClick={onOperationCenter} aria-label="Operation Center">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2v4M12 22v-4M4 12H2M22 12h-2M19.07 4.93l-2.83 2.83M4.93 19.07l2.83-2.83M19.07 19.07l-2.83-2.83M4.93 4.93l2.83 2.83"/>
            <circle cx="12" cy="12" r="2"/>
          </svg>
        </button>
        
        {/* ⚙️ Settings Button */}
        <button className="icon-btn" onClick={onSettingsToggle} aria-label="Settings">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3"/>
            <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
          </svg>
        </button>
        
        {/* 👤 Avatar / Profile Button */}
        <div className="avatar-btn" onClick={onAvatarToggle} style={{ cursor: 'pointer' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e2e8f0" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/>
          </svg>
        </div>
      </div>
    </header>
  );
};

export default Header;