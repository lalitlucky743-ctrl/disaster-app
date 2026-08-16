import React, { useState, useEffect } from 'react';
import axios from 'axios';

const FundingPanel = ({ refreshKey }) => {
  const [data, setData] = useState({ raised: 0, target: 500000, percentage: 0 });
  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('Medical');

  const fetchFunds = () => {
    axios.get('http://localhost:8000/funds')
      .then(res => setData(res.data))
      .catch(console.error);
  };

  useEffect(() => {
    fetchFunds();
  }, [refreshKey]);

  const handleDonate = async () => {
    if (!amount || parseInt(amount) < 1) return alert('Enter valid amount');
    try {
      await axios.post('http://localhost:8000/webhook/donate', { amount: parseInt(amount) });
      fetchFunds();
      setModalOpen(false);
      setAmount('');
      alert('✅ Donation Successful!');
    } catch (e) { alert('Donation failed'); }
  };

  return (
    <div className="funding-panel" style={{ zIndex: 1000 }}>
      <div className="funding-top">
        <div>
          <div className="funding-title">Relief Funding Orb</div>
          <div className="funding-sub">Target: ${data.target.toLocaleString()}</div>
        </div>
        <span className="badge indigo" onClick={() => setModalOpen(true)} style={{ cursor: 'pointer' }}>Donate</span>
      </div>
      <div className="funding-row">
        <span className="funding-3d">3D</span>
        <div className="funding-bar"><div className="funding-bar-fill" style={{ height: `${Math.min(100, data.percentage)}%` }}></div></div>
        <div className="orb"><div className="orb-glow"></div><div className="orb-core"></div></div>
      </div>
      <div className="funds-row">
        <div className="funds-icon">💰</div>
        <div className="funds-text">
          RAISED: <span className="funds-amount">${data.raised.toLocaleString()}</span> <span className="funds-pct">({data.percentage}%)</span>
        </div>
      </div>

      {/* Donation Modal */}
      {modalOpen && (
        <div style={{ position: 'fixed', top: 0, left: 0, width: '100%', height: '100%', background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
          <div style={{ background: '#0d1424', border: '1px solid #334155', padding: '24px', borderRadius: '8px', width: '300px', color: '#fff' }}>
            <h3 style={{ marginBottom: '12px' }}>💰 RELIEF FUND</h3>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Amount ($)</label>
              <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }} />
            </div>
            <div style={{ marginBottom: '12px' }}>
              <label style={{ fontSize: '12px', display: 'block', marginBottom: '4px' }}>Purpose</label>
              <select value={purpose} onChange={(e) => setPurpose(e.target.value)} style={{ width: '100%', padding: '8px', background: '#1e293b', border: '1px solid #334155', color: '#fff', borderRadius: '4px' }}>
                <option>Medical</option>
                <option>Food</option>
                <option>Rescue</option>
                <option>Shelter</option>
              </select>
            </div>
            <button onClick={handleDonate} style={{ width: '100%', padding: '10px', background: '#34d399', border: 'none', color: '#000', fontWeight: 'bold', borderRadius: '4px', cursor: 'pointer' }}>DONATE</button>
            <button onClick={() => setModalOpen(false)} style={{ width: '100%', padding: '8px', background: 'transparent', border: '1px solid #334155', color: '#94a3b8', borderRadius: '4px', cursor: 'pointer', marginTop: '8px' }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
};
export default FundingPanel;