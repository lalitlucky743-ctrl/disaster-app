import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const Register = ({ onSwitch }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();

    setMessage('');
    setError('');

    const cleanUsername = username.trim();
    const cleanEmail = email.trim().toLowerCase();

    // Validation
    if (!cleanUsername) {
      setError('Please enter a username.');
      return;
    }

    if (!cleanEmail) {
      setError('Please enter your email.');
      return;
    }

    if (!password) {
      setError('Please enter a password.');
      return;
    }

    if (cleanUsername.length < 3) {
      setError('Username must be at least 3 characters.');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    try {
      setLoading(true);

      await register(
        cleanUsername,
        cleanEmail,
        password
      );

      setMessage(
        '✅ Registration successful! Redirecting to login...'
      );

      setUsername('');
      setEmail('');
      setPassword('');

      // Switch to login after successful registration
      setTimeout(() => {
        onSwitch();
      }, 1200);

    } catch (err) {
      console.error('Registration failed:', err);

      // AuthContext already converts backend error into Error(message)
      const errorMessage =
        err.message ||
        err.response?.data?.detail ||
        'Registration failed. Please try again.';

      setError(`❌ ${errorMessage}`);

    } finally {
      setLoading(false);
    }
  };

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
      <h2
        style={{
          color: '#fff',
          marginBottom: '20px',
        }}
      >
        Create Account
      </h2>

      <form onSubmit={handleSubmit}>

        {/* Username */}
        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => {
            setUsername(e.target.value);
            setError('');
            setMessage('');
          }}
          autoComplete="username"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            margin: '8px 0',
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#fff',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />

        {/* Email */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            setError('');
            setMessage('');
          }}
          autoComplete="email"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
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
          placeholder="Password (minimum 6 characters)"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            setError('');
            setMessage('');
          }}
          autoComplete="new-password"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            margin: '8px 0',
            background: '#1e293b',
            border: '1px solid #334155',
            color: '#fff',
            borderRadius: '4px',
            boxSizing: 'border-box',
          }}
        />

        {/* Success */}
        {message && (
          <div
            style={{
              color: '#34d399',
              fontSize: '12px',
              margin: '10px 0',
            }}
          >
            {message}
          </div>
        )}

        {/* Error */}
        {error && (
          <div
            style={{
              color: '#f87171',
              fontSize: '12px',
              margin: '10px 0',
            }}
          >
            {error}
          </div>
        )}

        {/* Register */}
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '10px',
            marginTop: '8px',
            background: loading
              ? '#475569'
              : '#10b981',
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
            ? 'Creating Account...'
            : 'Register'}
        </button>
      </form>

      {/* Login */}
      <div
        style={{
          marginTop: '16px',
          color: '#94a3b8',
          fontSize: '12px',
        }}
      >
        Already have an account?{' '}

        <span
          onClick={loading ? undefined : onSwitch}
          style={{
            color: '#3b82f6',
            cursor: loading
              ? 'not-allowed'
              : 'pointer',
            fontWeight: 'bold',
          }}
        >
          Login
        </span>
      </div>
    </div>
  );
};

export default Register;