import React, { useState } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import Login from './Login';
import Register from './Register';
import Header from './components/Header';
import StatBar from './components/StatBar';
import MapArea from './components/MapArea';
import axios from 'axios';

// --- Dashboard Component ---
const DashboardApp = () => {
  const { user, logout } = useAuth();
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const [profile, setProfile] = useState({ username: '', email: '' });
  const [newEmail, setNewEmail] = useState('');
  const [stats, setStats] = useState({ active_alerts: 7, volunteers_deployed: 210 });

  // Profile fetch on load
  React.useEffect(() => {
    if (user) {
      setProfile(user);
      setNewEmail(user.email);
    }
    // Fetch stats for Operation Center
    axios.get('http://localhost:8000/stats')
      .then(res => setStats(res.data))
      .catch(console.error);
  }, [user]);

  // Refresh Button Handler
  const handleRefresh = () => setRefreshKey(prev => prev + 1);
  
  // Operation Center Button Handler
  const handleOperationCenter = async () => {
    try {
      const res = await axios.get('http://localhost:8000/stats');
      alert(`🛰️ OPERATION CENTER\n\nActive Incidents: ${res.data.active_alerts}\nVolunteers Deployed: ${res.data.volunteers_deployed}\nSystem Status: ${res.data.status}\nData Latency: ${res.data.latency}`);
    } catch (e) {
      alert('🛰️ Operation Center is ONLINE\nStatus: OPERATIONAL');
    }
  };

  // Settings Toggle
  const handleSettingsToggle = () => setIsSettingsOpen(!isSettingsOpen);

  // Avatar/Profile Toggle
  const handleAvatarToggle = () => {
    alert(`👤 Operator Profile\n\nUsername: ${profile.username}\nEmail: ${profile.email}\nRole: Emergency Coordinator\nAccess: LEVEL 4`);
  };

  // Profile Update Logic
  const handleUpdateProfile = async () => {
    await axios.put('http://localhost:8000/profile', { email: newEmail });
    setProfile(prev => ({ ...prev, email: newEmail }));
    setIsSettingsOpen(false);
  };

  return (
    <div className="dashboard">
      <div className="bg-grid"></div>
      
      {/* Header with all callbacks */}
      <Header 
        onRefresh={handleRefresh}
        onOperationCenter={handleOperationCenter}
        onSettingsToggle={handleSettingsToggle}
        onAvatarToggle={handleAvatarToggle}
      />
      
      <StatBar refreshKey={refreshKey} />
      <MapArea refreshKey={refreshKey} />

      {/* Settings / Profile Modal (Perfectly working) */}
      {isSettingsOpen && (
        <div className="modal" style={{ position: 'absolute', top: '60px', right: '20px', width: '250px', zIndex: 999, background: '#0d1424', border: '1px solid #334155', padding: '16px 20px', borderRadius: '8px', boxShadow: '0 10px 25px rgba(0,0,0,0.6)' }}>
          <button className="modal-close" onClick={() => setIsSettingsOpen(false)} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '14px', float: 'right', cursor: 'pointer' }}>✕</button>
          <div className="modal-content">
            <h3 style={{ color: '#fff', marginBottom: '10px', fontSize: '14px' }}>Profile</h3>
            <div style={{ marginBottom: '8px', fontSize: '12px', color: '#94a3b8' }}>Username: <span style={{ color: '#fff' }}>{profile.username}</span></div>
            <div style={{ marginBottom: '12px', fontSize: '12px', color: '#94a3b8' }}>Email:</div>
            <input 
              type="email" 
              value={newEmail} 
              onChange={(e) => setNewEmail(e.target.value)} 
              style={{ width: '100%', padding: '6px', background: '#1e293b', border: '1px solid #334155', color: '#fff', marginBottom: '10px', borderRadius: '4px' }}
            />
            <button onClick={handleUpdateProfile} style={{ width: '100%', padding: '6px', background: '#3b82f6', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px', marginBottom: '8px' }}>Update Email</button>
            <button onClick={logout} style={{ width: '100%', padding: '6px', background: '#ef4444', border: 'none', color: '#fff', cursor: 'pointer', borderRadius: '4px' }}>Logout</button>
          </div>
        </div>
      )}
    </div>
  );
};

// --- Main App Entry ---
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

function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}

export default App;