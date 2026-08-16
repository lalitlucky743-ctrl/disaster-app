import React, { useState, useEffect } from 'react';
import axios from 'axios';

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://disaster-app-30ll.onrender.com';

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
// FUNDING PANEL
// ============================================================

const FundingPanel = ({ refreshKey }) => {
  const [data, setData] = useState({
    raised: 0,
    target: 500000,
    percentage: 0,
  });

  const [modalOpen, setModalOpen] = useState(false);
  const [amount, setAmount] = useState('');
  const [purpose, setPurpose] = useState('Medical');
  const [loading, setLoading] = useState(false);

  // ==========================================================
  // FETCH FUNDING DATA
  // ==========================================================

  const fetchFunds = async () => {
    try {
      const res = await api.get('/funds');

      setData({
        raised: Number(res.data.raised) || 0,
        target: Number(res.data.target) || 500000,
        percentage: Number(res.data.percentage) || 0,
      });
    } catch (error) {
      console.error('Failed to fetch funding data:', error);
    }
  };

  // ==========================================================
  // FETCH WHEN REFRESH KEY CHANGES
  // ==========================================================

  useEffect(() => {
    fetchFunds();
  }, [refreshKey]);

  // ==========================================================
  // DONATION
  // ==========================================================

  const handleDonate = async () => {
    const donationAmount = parseInt(amount, 10);

    if (!amount || Number.isNaN(donationAmount) || donationAmount < 1) {
      alert('Enter a valid amount.');
      return;
    }

    try {
      setLoading(true);

      await api.post('/webhook/donate', {
        amount: donationAmount,
        purpose,
      });

      // Refresh funding data
      await fetchFunds();

      // Reset form
      setModalOpen(false);
      setAmount('');
      setPurpose('Medical');

      alert('✅ Donation Successful!');
    } catch (error) {
      console.error('Donation failed:', error);

      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'Donation failed. Please try again.';

      alert(`❌ ${message}`);
    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      className="funding-panel"
      style={{ zIndex: 1000 }}
    >
      {/* ======================================================
          FUNDING HEADER
      ====================================================== */}

      <div className="funding-top">
        <div>
          <div className="funding-title">
            Relief Funding Orb
          </div>

          <div className="funding-sub">
            Target: ${data.target.toLocaleString()}
          </div>
        </div>

        <span
          className="badge indigo"
          onClick={() => setModalOpen(true)}
          style={{ cursor: 'pointer' }}
        >
          Donate
        </span>
      </div>

      {/* ======================================================
          FUNDING PROGRESS
      ====================================================== */}

      <div className="funding-row">
        <span className="funding-3d">3D</span>

        <div className="funding-bar">
          <div
            className="funding-bar-fill"
            style={{
              height: `${Math.min(
                100,
                Math.max(0, data.percentage)
              )}%`,
            }}
          ></div>
        </div>

        <div className="orb">
          <div className="orb-glow"></div>
          <div className="orb-core"></div>
        </div>
      </div>

      {/* ======================================================
          RAISED FUNDS
      ====================================================== */}

      <div className="funds-row">
        <div className="funds-icon">💰</div>

        <div className="funds-text">
          RAISED:{' '}
          <span className="funds-amount">
            ${data.raised.toLocaleString()}
          </span>{' '}

          <span className="funds-pct">
            ({data.percentage}%)
          </span>
        </div>
      </div>

      {/* ======================================================
          DONATION MODAL
      ====================================================== */}

      {modalOpen && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.7)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
          }}
        >
          <div
            style={{
              background: '#0d1424',
              border: '1px solid #334155',
              padding: '24px',
              borderRadius: '8px',
              width: '300px',
              maxWidth: '90%',
              color: '#fff',
            }}
          >
            <h3 style={{ marginBottom: '12px' }}>
              💰 RELIEF FUND
            </h3>

            {/* Amount */}

            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  fontSize: '12px',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Amount ($)
              </label>

              <input
                type="number"
                min="1"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount"
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              />
            </div>

            {/* Purpose */}

            <div style={{ marginBottom: '12px' }}>
              <label
                style={{
                  fontSize: '12px',
                  display: 'block',
                  marginBottom: '4px',
                }}
              >
                Purpose
              </label>

              <select
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                disabled={loading}
                style={{
                  width: '100%',
                  padding: '8px',
                  background: '#1e293b',
                  border: '1px solid #334155',
                  color: '#fff',
                  borderRadius: '4px',
                  boxSizing: 'border-box',
                }}
              >
                <option>Medical</option>
                <option>Food</option>
                <option>Rescue</option>
                <option>Shelter</option>
              </select>
            </div>

            {/* Donate */}

            <button
              onClick={handleDonate}
              disabled={loading}
              style={{
                width: '100%',
                padding: '10px',
                background: loading ? '#64748b' : '#34d399',
                border: 'none',
                color: '#000',
                fontWeight: 'bold',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'PROCESSING...' : 'DONATE'}
            </button>

            {/* Cancel */}

            <button
              onClick={() => {
                if (!loading) {
                  setModalOpen(false);
                  setAmount('');
                }
              }}
              disabled={loading}
              style={{
                width: '100%',
                padding: '8px',
                background: 'transparent',
                border: '1px solid #334155',
                color: '#94a3b8',
                borderRadius: '4px',
                cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: '8px',
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default FundingPanel;