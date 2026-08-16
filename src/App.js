import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Register from './Register';
import Header from './components/Header';
import StatBar from './components/StatBar';
import MapArea from './components/MapArea';
import axios from 'axios';

// ============================================================
// API CONFIGURATION
// ============================================================

// Vercel Environment Variable:
// VITE_API_URL=https://disaster-app-30ll.onrender.com

const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'https://disaster-app-30ll.onrender.com';

// ============================================================
// AXIOS INSTANCE
// ============================================================

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ============================================================
// DASHBOARD COMPONENT
// ============================================================

const DashboardApp = () => {
  const { user, logout } = useAuth();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [profile, setProfile] = useState({
    username: '',
    email: '',
  });

  const [newEmail, setNewEmail] = useState('');

  const [stats, setStats] = useState({
    active_alerts: 7,
    volunteers_deployed: 210,
  });

  // ============================================================
  // LOAD USER + STATS
  // ============================================================

  React.useEffect(() => {
    if (user) {
      setProfile(user);
      setNewEmail(user.email || '');
    }

    const fetchStats = async () => {
      try {
        const res = await api.get('/stats');
        setStats(res.data);
      } catch (error) {
        console.error('Failed to fetch stats:', error);
      }
    };

    fetchStats();
  }, [user]);

  // ============================================================
  // REFRESH
  // ============================================================

  const handleRefresh = () => {
    setRefreshKey((prev) => prev + 1);
  };

  // ============================================================
  // OPERATION CENTER
  // ============================================================

  const handleOperationCenter = async () => {
    try {
      const res = await api.get('/stats');

      const data = res.data;

      alert(
        `🛰️ OPERATION CENTER\n\n` +
        `Active Incidents: ${data.active_alerts}\n` +
        `Volunteers Deployed: ${data.volunteers_deployed}\n` +
        `System Status: ${data.status || 'OPERATIONAL'}\n` +
        `Data Latency: ${data.latency || 'N/A'}`
      );
    } catch (error) {
      console.error('Operation Center error:', error);

      alert(
        '🛰️ Operation Center\n\n' +
        'Status: OPERATIONAL\n' +
        'Backend connection could not be verified.'
      );
    }
  };

  // ============================================================
  // SETTINGS
  // ============================================================

  const handleSettingsToggle = () => {
    setIsSettingsOpen((prev) => !prev);
  };

  // ============================================================
  // AVATAR / PROFILE
  // ============================================================

  const handleAvatarToggle = () => {
    alert(
      `👤 OPERATOR PROFILE\n\n` +
      `Username: ${profile.username || 'N/A'}\n` +
      `Email: ${profile.email || 'N/A'}\n` +
      `Role: Emergency Coordinator\n` +
      `Access: LEVEL 4`
    );
  };

  // ============================================================
  // UPDATE PROFILE
  // ============================================================

  const handleUpdateProfile = async () => {
    if (!newEmail.trim()) {
      alert('Please enter a valid email address.');
      return;
    }

    try {
      await api.put('/profile', {
        email: newEmail,
      });

      setProfile((prev) => ({
        ...prev,
        email: newEmail,
      }));

      setIsSettingsOpen(false);

      alert('✅ Profile updated successfully.');
    } catch (error) {
      console.error('Profile update error:', error);

      alert('❌ Failed to update profile. Please try again.');
    }
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div className="dashboard">
      <div className="bg-grid"></div>

      {/* Header */}
      <Header
        onRefresh={handleRefresh}
        onOperationCenter={handleOperationCenter}
        onSettingsToggle={handleSettingsToggle}
        onAvatarToggle={handleAvatarToggle}
      />

      {/* Stats */}
      <StatBar refreshKey={refreshKey} />

      {/* Map */}
      <MapArea refreshKey={refreshKey} />

      {/* ======================================================
          SETTINGS / PROFILE MODAL
      ====================================================== */}

      {isSettingsOpen && (
        <div
          className="modal"
          style={{
            position: 'absolute',
            top: '60px',
            right: '20px',
            width: '250px',
            zIndex: 999,
            background: '#0d1424',
            border: '1px solid #334155',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow: '0 10px 25px rgba(0,0,0,0.6)',
          }}
        >
          <button
            className="modal-close"
            onClick={() => setIsSettingsOpen(false)}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#94a3b8',
              fontSize: '14px',
              float: 'right',
              cursor: 'pointer',
            }}
          >
            ✕
          </button>

          <div className="modal-content">
            <h3
              style={{
                color: '#fff',
                marginBottom: '10px',
                fontSize: '14px',
              }}
            >
              Profile
            </h3>

            <div
              style={{
                marginBottom: '8px',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            >
              Username:{' '}
              <span style={{ color: '#fff' }}>
                {profile.username || 'N/A'}
              </span>
            </div>

            <div
              style={{
                marginBottom: '12px',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            >
              Email:
            </div>

            <input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter new email"
              style={{
                width: '100%',
                padding: '6px',
                background: '#1e293b',
                border: '1px solid #334155',
                color: '#fff',
                marginBottom: '10px',
                borderRadius: '4px',
                boxSizing: 'border-box',
              }}
            />

            <button
              onClick={handleUpdateProfile}
              style={{
                width: '100%',
                padding: '6px',
                background: '#3b82f6',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            >
              Update Email
            </button>

            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '6px',
                background: '#ef4444',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                borderRadius: '4px',
              }}
            >
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ============================================================
// MAIN APP
// ============================================================

const MainApp = () => {
  const { token } = useAuth();

  const [isLogin, setIsLogin] = useState(true);

  if (token) {
    return <DashboardApp />;
  }

  return isLogin ? (
    <Login onSwitch={() => setIsLogin(false)} />
  ) : (
    <Register onSwitch={() => setIsLogin(true)} />
  );
};

// ============================================================
// APP ENTRY
// ============================================================

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;