import React, { useState } from 'react';
import { useAuth } from './AuthContext';

const Register = ({ onSwitch }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const { register } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await register(username, email, password);
      setMessage('Registration successful! Please login.');
      setTimeout(onSwitch, 1500);
    } catch (err) {
      setMessage('Username already exists');
    }
  };

  return (
    <div style={{ padding: '40px', maxWidth: '400px', margin: '100px auto', background: '#0d1424', border: '1px solid #334155', borderRadius: '8px', textAlign: 'center' }}>
      <h2 style={{ color: '#fff', marginBottom: '20px' }}>Register</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" placeholder="Username" value={username} onChange={(e) => setUsername(e.target.value)} style={{ width: '100%', padding: '8px', margin: '8px 0', background: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
        <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} style={{ width: '100%', padding: '8px', margin: '8px 0', background: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
        <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} style={{ width: '100%', padding: '8px', margin: '8px 0', background: '#1e293b', border: '1px solid #334155', color: '#fff' }} />
        {message && <div style={{ color: '#34d399', fontSize: '12px', margin: '8px 0' }}>{message}</div>}
        <button type="submit" style={{ width: '100%', padding: '10px', background: '#34d399', border: 'none', color: '#fff', fontWeight: 'bold', cursor: 'pointer', borderRadius: '4px' }}>Register</button>
      </form>
      <div style={{ marginTop: '16px', color: '#94a3b8', fontSize: '12px' }}>
        Already have an account? <span onClick={onSwitch} style={{ color: '#3b82f6', cursor: 'pointer' }}>Login</span>
      </div>
    </div>
  );
};
export default Register;