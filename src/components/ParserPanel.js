import React, { useState } from 'react';
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
  timeout: 60000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// PARSER PANEL
// ============================================================

const ParserPanel = () => {
  const [inputText] = useState(
    'Earthquake Magnitude 6.4 detected near downtown.'
  );

  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);

  // ==========================================================
  // AI ANALYSIS
  // ==========================================================

  const analyzeAI = async () => {
    if (loading) return;

    setLoading(true);
    setAiData(null);

    try {
      const res = await api.post('/ai/analyze', {
        text: inputText,
      });

      setAiData(res.data);

    } catch (error) {
      console.error(
        'AI analysis failed:',
        error
      );

      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        'AI analysis failed. Please try again.';

      alert(`🤖 ${message}`);

    } finally {
      setLoading(false);
    }
  };

  // ==========================================================
  // SAFE AI DATA
  // ==========================================================

  const threat =
    aiData?.threat || 'UNKNOWN';

  const impact =
    aiData?.impact || {};

  const actions =
    Array.isArray(aiData?.actions)
      ? aiData.actions
      : [];

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      className="parser-panel"
      style={{ zIndex: 1000 }}
    >
      {/* ======================================================
          TITLE
      ====================================================== */}

      <div className="parser-title">
        🤖 AI DISASTER INTELLIGENCE
      </div>

      <div className="parser-sub">
        Connected to AI Model
      </div>

      {/* ======================================================
          INPUT
      ====================================================== */}

      <div className="parser-input">
        {inputText}
      </div>

      {/* ======================================================
          ANALYZE BUTTON
      ====================================================== */}

      <div className="parsed-tag">
        <span
          className="badge green"
          onClick={analyzeAI}
          style={{
            cursor: loading
              ? 'not-allowed'
              : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading
            ? 'ANALYZING...'
            : 'ANALYZE'}
        </span>
      </div>

      {/* ======================================================
          AI RESULT
      ====================================================== */}

      {aiData && (
        <div
          className="json-block"
          style={{
            maxHeight: '150px',
            overflowY: 'auto',
            fontSize: '8px',
          }}
        >
          {/* Threat */}

          <b
            style={{
              color:
                String(threat).toUpperCase() ===
                'HIGH'
                  ? '#fca5a5'
                  : '#facc15',
            }}
          >
            THREAT LEVEL: {threat}
          </b>

          <br />
          <br />

          {/* Impact */}

          <b>Impact:</b>
          <br />

          Infrastructure:{' '}
          {impact.infrastructure || 'N/A'}
          <br />

          Medical:{' '}
          {impact.medical || 'N/A'}
          <br />

          Evac:{' '}
          {impact.evac || 'N/A'}

          <br />
          <br />

          {/* Actions */}

          <b>Actions:</b>
          <br />

          {actions.length > 0 ? (
            actions.map((action, index) => (
              <span key={index}>
                • {action}
                <br />
              </span>
            ))
          ) : (
            <span>
              No recommended actions available.
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ParserPanel;