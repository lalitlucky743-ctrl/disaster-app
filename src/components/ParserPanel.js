import React, { useEffect, useState } from 'react';
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

const ParserPanel = ({ liveDisasterData }) => {
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiData, setAiData] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  // ==========================================================
  // CONVERT LIVE DATA INTO AI INPUT
  // ==========================================================

  useEffect(() => {
    if (!liveDisasterData) {
      setInputText('');
      return;
    }

    let text = '';

    // --------------------------------------------------------
    // If backend already provides an alert/message
    // --------------------------------------------------------

    if (liveDisasterData.message) {
      text = liveDisasterData.message;
    }

    // --------------------------------------------------------
    // Otherwise build text from live data
    // --------------------------------------------------------

    else {
      const {
        district,
        disaster,
        magnitude,
        temperature,
        humidity,
        rain,
        precipitation,
        wind_speed,
        weather_code,
      } = liveDisasterData;

      const parts = [];

      if (district) {
        parts.push(`District: ${district}`);
      }

      if (disaster) {
        parts.push(`Disaster: ${disaster}`);
      }

      if (magnitude !== undefined && magnitude !== null) {
        parts.push(`Magnitude: ${magnitude}`);
      }

      if (temperature !== undefined && temperature !== null) {
        parts.push(`Temperature: ${temperature}°C`);
      }

      if (humidity !== undefined && humidity !== null) {
        parts.push(`Humidity: ${humidity}%`);
      }

      if (rain !== undefined && rain !== null) {
        parts.push(`Rain: ${rain} mm`);
      }

      if (
        precipitation !== undefined &&
        precipitation !== null
      ) {
        parts.push(
          `Precipitation: ${precipitation} mm`
        );
      }

      if (
        wind_speed !== undefined &&
        wind_speed !== null
      ) {
        parts.push(
          `Wind Speed: ${wind_speed} km/h`
        );
      }

      if (weather_code !== undefined && weather_code !== null) {
        parts.push(
          `Weather Code: ${weather_code}`
        );
      }

      text = parts.join(' | ');
    }

    setInputText(text);
    setLastUpdated(new Date());

  }, [liveDisasterData]);

  // ==========================================================
  // AI ANALYSIS
  // ==========================================================

  const analyzeAI = async () => {
    if (loading || !inputText.trim()) {
      return;
    }

    setLoading(true);
    setAiData(null);

    try {
      const res = await api.post('/ai/analyze', {
        text: inputText,
      });

      setAiData(res.data);
      setLastUpdated(new Date());

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
  // AUTO ANALYZE LIVE DATA
  // ==========================================================

  useEffect(() => {
    if (!inputText.trim()) {
      return;
    }

    analyzeAI();

  }, [inputText]);

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
        {inputText
          ? 'Connected to Live Disaster Data'
          : 'Waiting for Live Disaster Data...'}
      </div>

      {/* ======================================================
          LIVE INPUT
      ====================================================== */}

      <div className="parser-input">
        {inputText || 'No live disaster data available.'}
      </div>

      {/* ======================================================
          ANALYZE BUTTON
      ====================================================== */}

      <div className="parsed-tag">

        <span
          className="badge green"
          onClick={analyzeAI}
          style={{
            cursor:
              loading || !inputText
                ? 'not-allowed'
                : 'pointer',

            opacity:
              loading || !inputText
                ? 0.7
                : 1,
          }}
        >
          {loading
            ? 'ANALYZING...'
            : 'ANALYZE LIVE DATA'}
        </span>

      </div>

      {/* ======================================================
          LAST UPDATED
      ====================================================== */}

      {lastUpdated && (
        <div
          style={{
            fontSize: '8px',
            marginTop: '6px',
            opacity: 0.7,
          }}
        >
          LIVE UPDATE:{' '}
          {lastUpdated.toLocaleTimeString()}
        </div>
      )}

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