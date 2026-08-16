import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const Login = ({ onSwitch }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();

  const handleSubmit = async (e) => {
  e.preventDefault();
  try {
    await login(username, password);
    console.log("✅ Login successful, token set!"); 
  } catch (err) {
    setError('Invalid username or password');
  }
};

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '100px auto', background: '#0d1424', border: '1px solid #334155', borderRadius: '8px', textAlign: 'center' }}>
      <h2 style={{ color: '#fff', marginBottom: '20px' }}>Login</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '8px', margin: '8px 0', background: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '8px', margin: '8px 0', background: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
        {error && <div style={{ color: '#f87171', fontSize: '12px', margin: '8px 0' }}>{error}</div>}
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#3b82f6', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>Login</button>
      </form>
      <div style={{ marginTop: '16px', color: '#94a3b8', fontSize: '12px' }}>
        Don't have an account? <span onClick={onSwitch} style={{ color: '#3b82f6', cursor: 'pointer' }}>Register</span>
      </div>
    </div>
  );
};
export default Login;