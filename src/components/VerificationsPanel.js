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
// VERIFICATIONS PANEL
// ============================================================

const VerificationsPanel = ({ refreshKey }) => {
  const [items, setItems] = useState([]);
  const [isVisible, setIsVisible] = useState(true);

  // ==========================================================
  // FETCH VERIFICATIONS
  // ==========================================================

  const fetchVerifs = async () => {
    try {
      const res = await api.get('/verifications');

      setItems(
        Array.isArray(res.data)
          ? res.data
          : []
      );
    } catch (error) {
      console.error(
        'Failed to fetch verification pipeline:',
        error
      );
    }
  };

  // ==========================================================
  // INITIAL FETCH + AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    fetchVerifs();

    // Auto-refresh pipeline every 3 seconds
    const interval = setInterval(
      fetchVerifs,
      3000
    );

    return () => {
      clearInterval(interval);
    };
  }, [refreshKey]);

  // ==========================================================
  // HIDDEN STATE
  // ==========================================================

  if (!isVisible) {
    return (
      <div
        style={{
          position: 'absolute',
          bottom: '8px',
          left: '210px',
          width: '150px',
          zIndex: 1000,
        }}
      >
        <button
          type="button"
          onClick={() => setIsVisible(true)}
          style={{
            background: '#0d1424',
            border: '1px solid #334155',
            color: '#e2e8f0',
            fontSize: '9px',
            padding: '6px 10px',
            borderRadius: '4px',
            cursor: 'pointer',
          }}
        >
          🔄 Show Pipeline
        </button>
      </div>
    );
  }

  // ==========================================================
  // STATUS HELPERS
  // ==========================================================

  const getStatusColor = (status) => {
    switch (status) {
      case 'Successful':
        return '#34d399';

      case 'Processing':
        return '#facc15';

      default:
        return '#f87171';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Successful':
        return '✅';

      case 'Processing':
        return '⏳';

      default:
        return '❌';
    }
  };

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      className="verif-panel"
      style={{
        zIndex: 1000,
      }}
    >
      {/* ====================================================
          HEADER
      ==================================================== */}

      <div className="verif-header">
        <span className="verif-header-title">
          Verification Pipeline
        </span>

        <button
          type="button"
          onClick={() => setIsVisible(false)}
          aria-label="Hide verification pipeline"
          style={{
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            color: '#94a3b8',
          }}
        >
          ✕
        </button>
      </div>

      {/* ====================================================
          VERIFICATION LIST
      ==================================================== */}

      <div className="verif-list">
        {items.length > 0 ? (
          items.map((item, i) => (
            <div
              className="verif-row"
              key={item.id ?? i}
              style={{
                display: 'flex',
                justifyContent:
                  'space-between',
                padding: '3px 8px',
                fontSize: '7.5px',
                borderBottom:
                  '1px solid rgba(30,41,59,0.6)',
              }}
            >
              <span className="verif-name">
                {item.name || 'Unknown'}
              </span>

              <span
                className="verif-status"
                style={{
                  color: getStatusColor(
                    item.status
                  ),
                  fontWeight: 'bold',
                }}
              >
                {getStatusIcon(
                  item.status
                )}{' '}
                {item.status || 'Unknown'}
              </span>
            </div>
          ))
        ) : (
          <div
            style={{
              padding: '8px',
              fontSize: '8px',
              color: '#64748b',
              textAlign: 'center',
            }}
          >
            No verification data available
          </div>
        )}
      </div>
    </div>
  );
};

export default VerificationsPanel;