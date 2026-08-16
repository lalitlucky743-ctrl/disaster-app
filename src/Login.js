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

    setError('');

    // Basic validation
    if (!username.trim()) {
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
        username.trim(),
        password
      );

      console.log(
        '✅ Login successful, token set!'
      );

    } catch (err) {
      console.error(
        'Login failed:',
        err
      );

      const message =
        err.response?.data?.detail ||
        err.response?.data?.message ||
        'Invalid username or password.';

      setError(message);

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
        padding: '40px',
        maxWidth: '400px',
        margin: '100px auto',
        background: '#0d1424',
        border: '1px solid #334155',
        borderRadius: '8px',
        textAlign: 'center',
        boxSizing: 'border-box',
      }}
    >
      {/* ====================================================
          TITLE
      ==================================================== */}

      <h2
        style={{
          color: '#fff',
          marginBottom: '20px',
        }}
      >
        Login
      </h2>

      {/* ====================================================
          LOGIN FORM
      ==================================================== */}

      <form onSubmit={handleSubmit}>
        {/* Username */}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError('');
          }}
          autoComplete="username"
          disabled={loading}
          style={{
            width: '100%',
            padding: '8px',
            margin: '8px 0',
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#fff',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />

        {/* Password */}

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
          }}
          autoComplete="current-password"
          disabled={loading}
          style={{
            width: '100%',
            padding: '8px',
            margin: '8px 0',
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#fff',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />

        {/* Error */}

        {error && (
          <div
            style={{
              color: '#f87171',
              fontSize: '12px',
              margin: '8px 0',
            }}
          >
            {error}
          </div>
        )}

        {/* Login Button */}

        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: '8px',
            background: loading
              ? '#475569'
              : '#3b82f6',
            border: 'none',
            color: '#fff',
            fontWeight: 'bold',
            cursor: loading
              ? 'not-allowed'
              : 'pointer',
            borderRadius: '4px',
          }}
        >
          {loading
            ? 'Logging in...'
            : 'Login'}
        </button>
      </form>

      {/* ====================================================
          REGISTER
      ==================================================== */}

      <div
        style={{
          marginTop: '16px',
          color: '#94a3b8',
          fontSize: '12px',
        }}
      >
        Don't have an account?{' '}

        <span
          onClick={
            loading ? undefined : onSwitch
          }
          style={{
            color: '#3b82f6',
            cursor: loading
              ? 'not-allowed'
              : 'pointer',
          }}
        >
          Register
        </span>
      </div>
    </div>
  );
};

export default Login;