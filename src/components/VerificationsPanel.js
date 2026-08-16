import React, { useState, useEffect } from 'react';
import axios from 'axios';

const VerificationsPanel = ({ refreshKey }) => {
  const [items, setItems] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  const fetchVerifs = () => {
    axios.get('http://localhost:8000/verifications')
      .then(res => setItems(res.data))
      .catch(err => console.error(err));
  };

  useEffect(() => {
    fetchVerifs();
    // Auto-refresh pipeline every 3 sec
    const interval = setInterval(fetchVerifs, 3000);
    return () => clearInterval(interval);
  }, [refreshKey]);

  if (!isVisible) return (
    <div style={{ position: 'absolute', bottom: '8px', left: '210px', width: '150px', zIndex: 1000 }}>
      <button onClick={() => setIsVisible(true)} style={{ background: '#0d1424', border: '1px solid #334155', color: '#e2e8f0', fontSize: '9px', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}>
        🔄 Show Pipeline
      </button>
    </div>
  );

  return (
    <div className="verif-panel" style={{ zIndex: 1000 }}>
      <div className="verif-header">
        <span className="verif-header-title">Verification Pipeline</span>
        <button onClick={() => setIsVisible(false)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: '#94a3b8' }}>✕</button>
      </div>
      <div className="verif-list">
        {items.map((item, i) => (
          <div className="verif-row" key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 8px', fontSize: '7.5px', borderBottom: '1px solid rgba(30,41,59,0.6)' }}>
            <span className="verif-name">{item.name}</span>
            <span className="verif-status" style={{ 
              color: item.status === 'Successful' ? '#34d399' : item.status === 'Processing' ? '#facc15' : '#f87171',
              fontWeight: 'bold'
            }}>
              {item.status === 'Successful' ? '✅' : item.status === 'Processing' ? '⏳' : '❌'} {item.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default VerificationsPanel;