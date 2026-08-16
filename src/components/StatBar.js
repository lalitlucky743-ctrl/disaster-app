import React, { useState, useEffect } from 'react';
import axios from 'axios';

const StatBar = ({ refreshKey }) => {
  const [stats, setStats] = useState({ active_alerts: 0, volunteers_deployed: 0, available_volunteers: 0, status: 'LOADING', latency: '...' });

  useEffect(() => {
    axios.get('http://localhost:8000/stats')
      .then(res => setStats(res.data))
      .catch(console.error);
  }, [refreshKey]);

  const statItems = [
    { icon: 'alert', color: '#f87171', label: 'Active Alerts:', value: stats.active_alerts },
    { icon: 'volunteer', color: '#60a5fa', label: 'Volunteers Deployed:', value: stats.volunteers_deployed },
    { icon: 'volunteer', color: '#60a5fa', label: 'Volunteers Available:', value: stats.available_volunteers }, // ✅ Changed here
    { icon: 'check', color: '#34d399', label: 'System Status:', value: stats.status, green: true },
    { icon: 'bolt', color: '#facc15', label: 'Data Latency:', value: stats.latency }
  ];

  return (
    <div className="stat-bar">
      {statItems.map((s, i) => (
        <div className="stat-card" key={i}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={s.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {s.icon === 'alert' && <path d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>}
            {s.icon === 'volunteer' && <path d="M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-4-4"/>}
            {s.icon === 'check' && <><circle cx="12" cy="12" r="9"/><path d="M9 12l2 2 4-4"/></>}
            {s.icon === 'bolt' && <path d="M13 10V3L4 14h7v7l9-11h-7z"/>}
          </svg>
          <div>
            <div className="stat-label">{s.label}</div>
            <div className={`stat-value ${s.green ? 'green' : ''}`}>{s.value}</div>
          </div>
        </div>
      ))}
    </div>
  );
};
export default StatBar;