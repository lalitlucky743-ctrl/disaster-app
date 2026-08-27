import React, { useEffect, useState } from 'react';
import axios from 'axios';

import { AuthProvider, useAuth } from './AuthContext';

import Login from './Login';
import Register from './Register';

import Header from './components/Header';
import StatBar from './components/StatBar';
import MapArea from './components/MapArea';


// ============================================================
// API CONFIG
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL?.replace(/\/+$/, '') ||
  'https://disaster-app-uhi7.onrender.com';


// ============================================================
// AXIOS INSTANCE
// ============================================================

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});


// ============================================================
// DASHBOARD
// ============================================================

const DashboardApp = () => {
  const { user, token, logout } = useAuth();

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0);

  const [profile, setProfile] = useState({
    username: '',
    email: '',
  });

  const [newEmail, setNewEmail] = useState('');

  const [stats, setStats] = useState(null);

  const [statsLoading, setStatsLoading] = useState(true);

  const [statsError, setStatsError] = useState('');

  // ==========================================================
  // AUTH HEADER
  // ==========================================================

  const authConfig = token
    ? {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    : {};

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      try {
        // First use authenticated backend profile.
        const response = await api.get(
          '/profile',
          authConfig
        );

        if (!mounted) return;

        const backendUser = response?.data;

        if (backendUser) {
          setProfile({
            username: backendUser.username || '',
            email: backendUser.email || '',
          });

          setNewEmail(
            backendUser.email || ''
          );
        }
      } catch (error) {
        console.error(
          'Profile fetch failed:',
          error
        );

        // Do NOT break dashboard if profile endpoint
        // temporarily fails. Use AuthContext user only.
        if (!mounted && !user) return;

        if (user) {
          setProfile({
            username: user.username || '',
            email: user.email || '',
          });

          setNewEmail(
            user.email || ''
          );
        }
      }
    };

    if (token) {
      loadProfile();
    } else if (user) {
      setProfile({
        username: user.username || '',
        email: user.email || '',
      });

      setNewEmail(
        user.email || ''
      );
    }

    return () => {
      mounted = false;
    };
  }, [token, user]);


  // ==========================================================
  // LOAD REAL STATS
  // ==========================================================

  useEffect(() => {
    let mounted = true;

    const fetchStats = async () => {
      try {
        setStatsLoading(true);
        setStatsError('');

        const response = await api.get(
          '/stats'
        );

        if (!mounted) return;

        const data = response?.data;

        if (
          !data ||
          typeof data !== 'object'
        ) {
          throw new Error(
            'Invalid stats response'
          );
        }

        setStats({
          active_alerts:
            Number.isFinite(
              Number(data.active_alerts)
            )
              ? Number(data.active_alerts)
              : null,

          volunteers_deployed:
            Number.isFinite(
              Number(
                data.volunteers_deployed
              )
            )
              ? Number(
                  data.volunteers_deployed
                )
              : null,

          available_volunteers:
            Number.isFinite(
              Number(
                data.available_volunteers
              )
            )
              ? Number(
                  data.available_volunteers
                )
              : null,

          status:
            data.status || 'UNKNOWN',

          latency:
            data.latency || null,

          server_time:
            data.server_time || null,
        });
      } catch (error) {
        console.error(
          'Failed to fetch real stats:',
          error
        );

        if (!mounted) return;

        setStats(null);

        setStatsError(
          'Live backend statistics unavailable.'
        );
      } finally {
        if (mounted) {
          setStatsLoading(false);
        }
      }
    };

    fetchStats();

    return () => {
      mounted = false;
    };
  }, [refreshKey]);


  // ==========================================================
  // REFRESH EVERYTHING
  // ==========================================================

  const handleRefresh = () => {
    setRefreshKey(
      (previous) => previous + 1
    );
  };


  // ==========================================================
  // OPERATION CENTER
  // ==========================================================

  const handleOperationCenter = async () => {
    try {
      const response = await api.get(
        '/stats'
      );

      const data = response?.data;

      if (!data) {
        throw new Error(
          'Invalid backend response'
        );
      }

      alert(
        `🛰️ OPERATION CENTER\n\n` +
        `Active Incidents: ${
          data.active_alerts ?? '—'
        }\n` +
        `Volunteers Deployed: ${
          data.volunteers_deployed ?? '—'
        }\n` +
        `Available Volunteers: ${
          data.available_volunteers ?? '—'
        }\n` +
        `System Status: ${
          data.status || 'UNKNOWN'
        }\n` +
        `Data Latency: ${
          data.latency || 'N/A'
        }`
      );
    } catch (error) {
      console.error(
        'Operation Center error:',
        error
      );

      alert(
        '🛰️ OPERATION CENTER\n\n' +
        'Live backend statistics could not be verified.'
      );
    }
  };


  // ==========================================================
  // SETTINGS
  // ==========================================================

  const handleSettingsToggle = () => {
    setIsSettingsOpen(
      (previous) => !previous
    );
  };


  // ==========================================================
  // AVATAR / PROFILE
  // ==========================================================

  const handleAvatarToggle = () => {
    alert(
      `👤 OPERATOR PROFILE\n\n` +
      `Username: ${
        profile.username || 'N/A'
      }\n` +
      `Email: ${
        profile.email || 'N/A'
      }\n` +
      `Role: Emergency Coordinator\n` +
      `Access: LEVEL 4`
    );
  };


  // ==========================================================
  // UPDATE PROFILE
  // ==========================================================

  const handleUpdateProfile = async () => {
    const email =
      newEmail.trim();

    if (!email) {
      alert(
        'Please enter a valid email address.'
      );
      return;
    }

    try {
      /*
       * IMPORTANT:
       * Your original backend has GET /profile
       * but does NOT have PUT /profile.
       *
       * This frontend now tries the backend update
       * only if that endpoint exists.
       */

      await api.put(
        '/profile',
        {
          email,
        },
        authConfig
      );

      setProfile(
        (previous) => ({
          ...previous,
          email,
        })
      );

      setIsSettingsOpen(false);

      alert(
        '✅ Profile updated successfully.'
      );
    } catch (error) {
      console.error(
        'Profile update error:',
        error
      );

      const detail =
        error?.response?.data?.detail;

      if (
        error?.response?.status === 404 ||
        error?.response?.status === 405
      ) {
        alert(
          '⚠️ Profile update endpoint is not enabled on the backend yet.'
        );
      } else {
        alert(
          detail ||
            '❌ Failed to update profile.'
        );
      }
    }
  };


  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div className="dashboard">

      <div className="bg-grid" />


      {/* ======================================================
          HEADER
      ====================================================== */}

      <Header
        onRefresh={handleRefresh}
        onOperationCenter={
          handleOperationCenter
        }
        onSettingsToggle={
          handleSettingsToggle
        }
        onAvatarToggle={
          handleAvatarToggle
        }
      />


      {/* ======================================================
          STATS
      ====================================================== */}

      <StatBar
        refreshKey={refreshKey}
      />


      {/* ======================================================
          MAP
      ====================================================== */}

      <MapArea
        refreshKey={refreshKey}
      />


      {/* ======================================================
          SETTINGS / PROFILE
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
            border:
              '1px solid #334155',
            padding: '16px 20px',
            borderRadius: '8px',
            boxShadow:
              '0 10px 25px rgba(0,0,0,0.6)',
          }}
        >

          <button
            className="modal-close"
            onClick={() =>
              setIsSettingsOpen(false)
            }
            style={{
              background:
                'transparent',
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


            {/* USERNAME */}

            <div
              style={{
                marginBottom: '8px',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            >
              Username:{' '}

              <span
                style={{
                  color: '#fff',
                }}
              >
                {profile.username ||
                  'N/A'}
              </span>
            </div>


            {/* EMAIL */}

            <div
              style={{
                marginBottom: '6px',
                fontSize: '12px',
                color: '#94a3b8',
              }}
            >
              Email:
            </div>


            <input
              type="email"
              value={newEmail}
              onChange={(event) =>
                setNewEmail(
                  event.target.value
                )
              }
              placeholder="Enter new email"
              style={{
                width: '100%',
                padding: '6px',
                background:
                  '#1e293b',
                border:
                  '1px solid #334155',
                color: '#fff',
                marginBottom: '10px',
                borderRadius: '4px',
                boxSizing:
                  'border-box',
              }}
            />


            {/* UPDATE */}

            <button
              onClick={
                handleUpdateProfile
              }
              style={{
                width: '100%',
                padding: '6px',
                background:
                  '#3b82f6',
                border: 'none',
                color: '#fff',
                cursor: 'pointer',
                borderRadius: '4px',
                marginBottom: '8px',
              }}
            >
              Update Email
            </button>


            {/* LOGOUT */}

            <button
              onClick={logout}
              style={{
                width: '100%',
                padding: '6px',
                background:
                  '#ef4444',
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

  const [isLogin, setIsLogin] =
    useState(true);


  // ==========================================================
  // AUTHENTICATED
  // ==========================================================

  if (token) {
    return <DashboardApp />;
  }


  // ==========================================================
  // LOGIN / REGISTER
  // ==========================================================

  return isLogin ? (
    <Login
      onSwitch={() =>
        setIsLogin(false)
      }
    />
  ) : (
    <Register
      onSwitch={() =>
        setIsLogin(true)
      }
    />
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