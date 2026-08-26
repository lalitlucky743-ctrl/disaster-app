import React, { useState, useEffect, useCallback } from 'react';
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
});

// ============================================================
// VERIFICATIONS PANEL
// ============================================================

const VerificationsPanel = ({ refreshKey = 0 }) => {
  const [items, setItems] = useState([]);
  const [isVisible, setIsVisible] = useState(true);
  const [loading, setLoading] = useState(false);

  // ==========================================================
  // FETCH VERIFICATIONS
  // ==========================================================

  const fetchVerifications = useCallback(async () => {
    try {
      setLoading(true);

      const res = await api.get('/verifications');

      const data = Array.isArray(res.data)
        ? res.data
        : [];

      setItems(data);
    } catch (error) {
      console.error(
        'Failed to fetch verification pipeline:',
        error
      );

      // Keep previous data instead of unnecessarily clearing it.
      // If there is no data yet, show empty state.
    } finally {
      setLoading(false);
    }
  }, []);

  // ==========================================================
  // INITIAL FETCH + AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    fetchVerifications();

    const interval = setInterval(() => {
      fetchVerifications();
    }, 3000);

    return () => {
      clearInterval(interval);
    };
  }, [fetchVerifications, refreshKey]);

  // ==========================================================
  // STATUS COLOR
  // ==========================================================

  const getStatusColor = (status) => {
    switch (String(status).toUpperCase()) {
      case 'SUCCESSFUL':
      case 'SUCCESS':
      case 'VERIFIED':
        return '#34d399';

      case 'PROCESSING':
      case 'PENDING':
        return '#facc15';

      case 'FAILED':
      case 'REJECTED':
        return '#f87171';

      default:
        return '#94a3b8';
    }
  };

  // ==========================================================
  // STATUS ICON
  // ==========================================================

  const getStatusIcon = (status) => {
    switch (String(status).toUpperCase()) {
      case 'SUCCESSFUL':
      case 'SUCCESS':
      case 'VERIFIED':
        return '✅';

      case 'PROCESSING':
      case 'PENDING':
        return '⏳';

      case 'FAILED':
      case 'REJECTED':
        return '❌';

      default:
        return '•';
    }
  };

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
  // UI
  // ==========================================================

  return (
    <div
      className="verif-panel"
      style={{
        zIndex: 1000,
      }}
    >
      {/* HEADER */}

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

      {/* LIST */}

      <div className="verif-list">
        {loading && items.length === 0 ? (
          <div
            style={{
              padding: '8px',
              fontSize: '8px',
              color: '#64748b',
              textAlign: 'center',
            }}
          >
            Loading verification data...
          </div>
        ) : items.length > 0 ? (
          items.map((item, index) => {
            const status = item.status || 'Unknown';

            return (
              <div
                className="verif-row"
                key={item.id ?? item.code ?? index}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '3px 8px',
                  fontSize: '7.5px',
                  borderBottom:
                    '1px solid rgba(30,41,59,0.6)',
                }}
              >
                <span className="verif-name">
                  {item.name ||
                    item.type ||
                    item.incident_id ||
                    'Unknown'}
                </span>

                <span
                  className="verif-status"
                  style={{
                    color: getStatusColor(status),
                    fontWeight: 'bold',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {getStatusIcon(status)} {status}
                </span>
              </div>
            );
          })
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