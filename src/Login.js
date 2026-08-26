import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const Login = ({ onSwitch }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { login } = useAuth();

  // ==========================================================
  // LOGIN HANDLER
  // ==========================================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (loading) return;

    setError('');

    const cleanUsername = username.trim();

    // Validation
    if (!cleanUsername) {
      setError('Please enter your username.');
      return;
    }

    if (!password) {
      setError('Please enter your password.');
      return;
    }

    try {
      setLoading(true);

      await login(
        cleanUsername,
        password
      );

      console.log(
        '✅ Login successful.'
      );

      // AuthContext automatically:
      // - saves token
      // - sets user
      // - loads profile
      // - Dashboard opens through App.jsx

    } catch (err) {
      console.error(
        '❌ Login failed:',
        err
      );

      setError(
        err?.message ||
        'Invalid username or password.'
      );
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px',
        boxSizing: 'border-box',
        background: '#020617',
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '400px',
          padding: '32px',
          background: '#0d1424',
          border: '1px solid #334155',
          borderRadius: '10px',
          boxSizing: 'border-box',
          boxShadow:
            '0 20px 50px rgba(0,0,0,0.35)',
        }}
      >

        {/* ====================================================
            TITLE
        ==================================================== */}

        <div
          style={{
            textAlign: 'center',
            marginBottom: '24px',
          }}
        >
          <h2
            style={{
              color: '#fff',
              margin: 0,
              fontSize: '24px',
            }}
          >
            Disaster Relief System
          </h2>

          <div
            style={{
              marginTop: '7px',
              color: '#94a3b8',
              fontSize: '12px',
            }}
          >
            Emergency Operations Login
          </div>
        </div>

        {/* ====================================================
            FORM
        ==================================================== */}

        <form onSubmit={handleSubmit}>

          {/* USERNAME */}

          <label
            style={{
              display: 'block',
              color: '#cbd5e1',
              fontSize: '12px',
              marginBottom: '5px',
            }}
          >
            Username
          </label>

          <input
            type="text"
            placeholder="Enter username"
            value={username}
            onChange={(e) => {
              setUsername(e.target.value);
              setError('');
            }}
            autoComplete="username"
            disabled={loading}
            autoFocus
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '14px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#fff',
              borderRadius: '5px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          {/* PASSWORD */}

          <label
            style={{
              display: 'block',
              color: '#cbd5e1',
              fontSize: '12px',
              marginBottom: '5px',
            }}
          >
            Password
          </label>

          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setError('');
            }}
            autoComplete="current-password"
            disabled={loading}
            style={{
              width: '100%',
              padding: '10px',
              marginBottom: '10px',
              background: '#1e293b',
              border: '1px solid #334155',
              color: '#fff',
              borderRadius: '5px',
              boxSizing: 'border-box',
              outline: 'none',
            }}
          />

          {/* ERROR */}

          {error && (
            <div
              role="alert"
              style={{
                marginTop: '8px',
                marginBottom: '10px',
                padding: '8px',
                background:
                  'rgba(127,29,29,0.25)',
                border:
                  '1px solid rgba(248,113,113,0.25)',
                borderRadius: '5px',
                color: '#f87171',
                fontSize: '12px',
              }}
            >
              {error}
            </div>
          )}

          {/* LOGIN BUTTON */}

          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%',
              padding: '11px',
              marginTop: '6px',
              background: loading
                ? '#475569'
                : '#3b82f6',
              border: 'none',
              color: '#fff',
              fontWeight: 'bold',
              cursor: loading
                ? 'not-allowed'
                : 'pointer',
              borderRadius: '5px',
            }}
          >
            {loading
              ? 'Authenticating...'
              : 'Login'}
          </button>

        </form>

        {/* ====================================================
            REGISTER
        ==================================================== */}

        <div
          style={{
            marginTop: '18px',
            paddingTop: '16px',
            borderTop:
              '1px solid #1e293b',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '12px',
          }}
        >
          Don't have an account?{' '}

          <button
            type="button"
            onClick={
              loading
                ? undefined
                : onSwitch
            }
            disabled={loading}
            style={{
              background: 'transparent',
              border: 'none',
              padding: 0,
              color: '#60a5fa',
              cursor: loading
                ? 'not-allowed'
                : 'pointer',
              fontSize: '12px',
              fontWeight: 'bold',
            }}
          >
            Register
          </button>
        </div>

      </div>
    </div>
  );
};

export default Login;