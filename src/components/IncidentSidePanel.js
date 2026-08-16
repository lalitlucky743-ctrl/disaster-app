import React from 'react';

const IncidentSidePanel = ({
  incident,
  onClose,
  onDispatch,
}) => {
  if (!incident) return null;

  // ==========================================================
  // SAFE LOCATION VALUES
  // ==========================================================

  const latitude = Number(incident.lat);
  const longitude = Number(incident.lng);

  const formattedLat = Number.isFinite(latitude)
    ? latitude.toFixed(4)
    : 'N/A';

  const formattedLng = Number.isFinite(longitude)
    ? longitude.toFixed(4)
    : 'N/A';

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      style={{
        position: 'absolute',
        top: '10px',
        right: '10px',
        width: '280px',
        maxHeight: 'calc(100% - 40px)',
        background: 'rgba(13, 20, 36, 0.95)',
        border: '1px solid #334155',
        borderRadius: '8px',
        padding: '16px',
        boxShadow: '0 10px 30px rgba(0,0,0,0.8)',
        zIndex: 2000,
        overflowY: 'auto',
        color: '#e2e8f0',
        animation: 'slideIn 0.3s ease-out',
        boxSizing: 'border-box',
      }}
    >
      {/* ====================================================
          HEADER
      ==================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: '1px solid #334155',
          paddingBottom: '8px',
          marginBottom: '12px',
        }}
      >
        <h3
          style={{
            fontSize: '14px',
            fontWeight: 'bold',
            color: '#f87171',
            margin: 0,
          }}
        >
          INCIDENT #{incident.id}
        </h3>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close incident panel"
          style={{
            background: 'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ✕
        </button>
      </div>

      {/* ====================================================
          INCIDENT DETAILS
      ==================================================== */}

      <div
        style={{
          marginBottom: '12px',
          fontSize: '12px',
        }}
      >
        <div>
          <b>Type:</b>{' '}
          {incident.type || 'Unknown'}
        </div>

        <div>
          <b>Magnitude:</b>{' '}
          {incident.magnitude || 'N/A'}
        </div>

        <div>
          <b>Threat:</b>{' '}
          <span
            style={{
              color: '#fca5a5',
            }}
          >
            {incident.severity || 'UNKNOWN'}
          </span>
        </div>

        <div>
          <b>Location:</b>{' '}
          {formattedLat}, {formattedLng}
        </div>
      </div>

      {/* ====================================================
          RESPONSE UNITS
      ==================================================== */}

      <div
        style={{
          marginBottom: '12px',
          fontSize: '12px',
        }}
      >
        <div
          style={{
            fontWeight: 'bold',
            color: '#94a3b8',
            marginBottom: '4px',
          }}
        >
          RESPONSE UNITS
        </div>

        <div
          style={{
            paddingLeft: '8px',
          }}
        >
          <div>
            👥 {incident.volunteers || 0}{' '}
            Volunteers
          </div>

          <div>
            🚑 {incident.medical || 0}{' '}
            Medical Units
          </div>

          <div>
            🚒 {incident.rescue || 0}{' '}
            Rescue Teams
          </div>

          <div>
            🏥 {incident.hospitals || 0}{' '}
            Hospitals
          </div>
        </div>
      </div>

      {/* ====================================================
          DISPATCH BUTTON
      ==================================================== */}

      <button
        type="button"
        onClick={onDispatch}
        style={{
          width: '100%',
          padding: '10px',
          background: '#3b82f6',
          border: 'none',
          borderRadius: '6px',
          color: '#fff',
          fontWeight: 'bold',
          cursor: 'pointer',
          marginTop: '8px',
        }}
      >
        🚨 DISPATCH ALL
      </button>
    </div>
  );
};

export default IncidentSidePanel;