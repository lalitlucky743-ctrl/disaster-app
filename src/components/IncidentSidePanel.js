import React, { useEffect, useMemo, useState } from 'react';
import axios from 'axios';

// ============================================================
// REAL-TIME INCIDENT / RESPONSE PANEL
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
// HELPERS
// ============================================================

const safeNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

const displayNumber = (value) => {
  const number = safeNumber(value);

  return number === null
    ? '—'
    : number;
};

const getStatusStyle = (status) => {
  const normalized = String(
    status || ''
  ).toUpperCase();

  if (
    normalized.includes('RESOLVED') ||
    normalized.includes('CLOSED') ||
    normalized.includes('COMPLETED')
  ) {
    return {
      color: '#86efac',
      background: 'rgba(34,197,94,.12)',
      border: '1px solid rgba(34,197,94,.3)',
    };
  }

  if (
    normalized.includes('DISPATCH') ||
    normalized.includes('RESPOND')
  ) {
    return {
      color: '#93c5fd',
      background: 'rgba(59,130,246,.12)',
      border: '1px solid rgba(59,130,246,.3)',
    };
  }

  return {
    color: '#fca5a5',
    background: 'rgba(239,68,68,.12)',
    border: '1px solid rgba(239,68,68,.3)',
  };
};

// ============================================================
// COMPONENT
// ============================================================

const IncidentSidePanel = ({
  incident,
  onClose,
  onDispatch,
}) => {
  const [liveIncident, setLiveIncident] =
    useState(incident);

  const [refreshing, setRefreshing] =
    useState(false);

  const [dispatching, setDispatching] =
    useState(false);

  const [message, setMessage] =
    useState('');

  // ==========================================================
  // SYNC PARENT INCIDENT
  // ==========================================================

  useEffect(() => {
    setLiveIncident(incident);
    setMessage('');
  }, [incident]);

  // ==========================================================
  // RESPONSE UNIT DATA
  // IMPORTANT:
  // This hook MUST run on every render.
  // Do not put it after an early return.
  // ==========================================================

  const responseUnits = useMemo(
    () => ({
      volunteers: safeNumber(
        liveIncident?.volunteers
      ),

      medical: safeNumber(
        liveIncident?.medical
      ),

      rescue: safeNumber(
        liveIncident?.rescue
      ),

      hospitals: safeNumber(
        liveIncident?.hospitals
      ),

      sdrf: safeNumber(
        liveIncident?.sdrf
      ),
    }),
    [liveIncident]
  );

  // ==========================================================
  // REFRESH INCIDENT FROM BACKEND
  // ==========================================================

  const refreshIncident = async () => {
    if (
      !liveIncident?.id ||
      refreshing
    ) {
      return;
    }

    try {
      setRefreshing(true);

      const response = await api.get(
        `/incidents/${liveIncident.id}`
      );

      if (response.data?.incident) {
        setLiveIncident(
          response.data.incident
        );
      } else if (response.data) {
        setLiveIncident(
          response.data
        );
      }

      setMessage(
        'Live incident data updated.'
      );
    } catch (error) {
      console.warn(
        'Could not refresh incident:',
        error
      );

      setMessage(
        error.response?.data?.detail ||
          'Live incident refresh is currently unavailable.'
      );
    } finally {
      setRefreshing(false);
    }
  };

  // ==========================================================
  // AUTO REFRESH
  // ==========================================================

  useEffect(() => {
    if (!liveIncident?.id) {
      return undefined;
    }

    const interval = setInterval(
      async () => {
        try {
          const response =
            await api.get(
              `/incidents/${liveIncident.id}`
            );

          if (
            response.data?.incident
          ) {
            setLiveIncident(
              response.data.incident
            );
          } else if (
            response.data
          ) {
            setLiveIncident(
              response.data
            );
          }
        } catch (error) {
          console.warn(
            'Automatic incident refresh failed:',
            error
          );
        }
      },
      15000
    );

    return () =>
      clearInterval(interval);
  }, [liveIncident?.id]);

  // ==========================================================
  // DISPATCH RESPONSE TEAMS
  // ==========================================================

  const handleDispatch = async () => {
    if (
      !liveIncident?.id ||
      dispatching
    ) {
      return;
    }

    try {
      setDispatching(true);
      setMessage('');

      const response =
        await api.post(
          `/incidents/${liveIncident.id}/dispatch`,
          {
            lat: safeNumber(
              liveIncident.lat
            ),

            lng: safeNumber(
              liveIncident.lng
            ),

            requested_units: [
              'MEDICAL',
              'RESCUE',
              'SDRF',
            ],

            requested_at:
              new Date().toISOString(),
          }
        );

      const returnedIncident =
        response.data?.incident ||
        response.data;

      if (
        returnedIncident &&
        typeof returnedIncident ===
          'object' &&
        !Array.isArray(
          returnedIncident
        )
      ) {
        setLiveIncident(
          (previous) => ({
            ...previous,
            ...returnedIncident,
          })
        );
      }

      setMessage(
        response.data?.message ||
          'Response dispatch request sent to the disaster backend.'
      );

      // Synchronize parent/dashboard
      if (onDispatch) {
        await onDispatch(
          liveIncident
        );
      }
    } catch (error) {
      console.error(
        'Dispatch failed:',
        error
      );

      setMessage(
        error.response?.data?.detail ||
          error.response?.data?.message ||
          'Dispatch request failed.'
      );
    } finally {
      setDispatching(false);
    }
  };

  // ==========================================================
  // SAFE EARLY RETURN
  //
  // All React hooks are already called above.
  // ==========================================================

  if (!liveIncident) {
    return null;
  }

  // ==========================================================
  // LOCATION
  // ==========================================================

  const latitude = safeNumber(
    liveIncident.lat
  );

  const longitude = safeNumber(
    liveIncident.lng
  );

  const formattedLat =
    latitude === null
      ? 'N/A'
      : latitude.toFixed(5);

  const formattedLng =
    longitude === null
      ? 'N/A'
      : longitude.toFixed(5);

  // ==========================================================
  // STATUS
  // ==========================================================

  const status =
    liveIncident.status ||
    liveIncident.state ||
    'ACTIVE';

  const statusStyle =
    getStatusStyle(status);

  // ==========================================================
  // SEVERITY
  // ==========================================================

  const severity =
    liveIncident.severity ||
    liveIncident.threat_level ||
    'UNKNOWN';

  // ==========================================================
  // DISPATCH STATUS
  // ==========================================================

  const dispatchRequested =
    liveIncident.dispatch_requested ===
      true ||
    String(status)
      .toUpperCase()
      .includes('DISPATCH');

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      style={{
        position: 'absolute',
        top: 10,
        right: 10,
        width: 300,
        maxHeight:
          'calc(100% - 40px)',
        background:
          'rgba(13,20,36,.97)',
        border:
          '1px solid #334155',
        borderRadius: 10,
        padding: 16,
        boxShadow:
          '0 12px 35px rgba(0,0,0,.8)',
        zIndex: 2000,
        overflowY: 'auto',
        color: '#e2e8f0',
        animation:
          'slideIn .3s ease-out',
        boxSizing: 'border-box',
      }}
    >
      {/* ====================================================
          HEADER
      ==================================================== */}

      <div
        style={{
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          borderBottom:
            '1px solid #334155',
          paddingBottom: 9,
          marginBottom: 12,
        }}
      >
        <div>
          <h3
            style={{
              fontSize: 14,
              fontWeight: 800,
              color: '#f87171',
              margin: 0,
            }}
          >
            INCIDENT #{liveIncident.id}
          </h3>

          <div
            style={{
              fontSize: 10,
              color: '#64748b',
              marginTop: 3,
            }}
          >
            Live backend incident
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          aria-label="Close incident panel"
          style={{
            background:
              'transparent',
            border: 'none',
            color: '#94a3b8',
            cursor: 'pointer',
            fontSize: 15,
          }}
        >
          ✕
        </button>
      </div>

      {/* ====================================================
          STATUS
      ==================================================== */}

      <div
        style={{
          ...statusStyle,
          display: 'flex',
          justifyContent:
            'space-between',
          alignItems: 'center',
          padding: '7px 9px',
          borderRadius: 6,
          marginBottom: 12,
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        <span>STATUS</span>

        <span>
          {String(status).toUpperCase()}
        </span>
      </div>

      {/* ====================================================
          INCIDENT DETAILS
      ==================================================== */}

      <div
        style={{
          marginBottom: 12,
          fontSize: 12,
          lineHeight: 1.7,
        }}
      >
        <div>
          <b>Type:</b>{' '}
          {liveIncident.type ||
            'Unknown'}
        </div>

        <div>
          <b>Magnitude:</b>{' '}
          {liveIncident.magnitude ??
            '—'}
        </div>

        <div>
          <b>Threat:</b>{' '}
          <span
            style={{
              color: '#fca5a5',
            }}
          >
            {severity}
          </span>
        </div>

        <div>
          <b>Location:</b>{' '}
          {liveIncident.location_name ||
            liveIncident.location ||
            'GPS location'}
        </div>

        <div>
          <b>GPS:</b>{' '}
          {formattedLat},{' '}
          {formattedLng}
        </div>

        {liveIncident.accuracy !=
          null && (
          <div>
            <b>
              GPS Accuracy:
            </b>{' '}
            ±
            {Math.round(
              Number(
                liveIncident.accuracy
              )
            )}{' '}
            m
          </div>
        )}
      </div>

      {/* ====================================================
          RESPONSE UNITS
      ==================================================== */}

      <div
        style={{
          marginBottom: 12,
          fontSize: 12,
        }}
      >
        <div
          style={{
            fontWeight: 800,
            color: '#94a3b8',
            marginBottom: 6,
          }}
        >
          RESPONSE UNITS
        </div>

        <div
          style={{
            display: 'grid',
            gap: 5,
          }}
        >
          <div>
            👥 Volunteers:{' '}
            {displayNumber(
              responseUnits.volunteers
            )}
          </div>

          <div>
            🚑 Medical Units:{' '}
            {displayNumber(
              responseUnits.medical
            )}
          </div>

          <div>
            🚒 Rescue Teams:{' '}
            {displayNumber(
              responseUnits.rescue
            )}
          </div>

          <div>
            🏥 Hospitals:{' '}
            {displayNumber(
              responseUnits.hospitals
            )}
          </div>

          <div>
            🛟 SDRF:{' '}
            {displayNumber(
              responseUnits.sdrf
            )}
          </div>
        </div>

        <div
          style={{
            marginTop: 6,
            fontSize: 10,
            color: '#64748b',
          }}
        >
          Counts are shown only when
          supplied by the backend.
        </div>
      </div>

      {/* ====================================================
          DISPATCH STATUS
      ==================================================== */}

      {dispatchRequested && (
        <div
          style={{
            padding: 9,
            borderRadius: 7,
            marginBottom: 10,
            background:
              'rgba(59,130,246,.12)',
            border:
              '1px solid rgba(59,130,246,.3)',
            color: '#93c5fd',
            fontSize: 11,
          }}
        >
          🚨 Response dispatch has
          been requested for this
          incident.
        </div>
      )}

      {/* ====================================================
          DISPATCH BUTTON
      ==================================================== */}

      <button
        type="button"
        onClick={handleDispatch}
        disabled={dispatching}
        style={{
          width: '100%',
          padding: 10,
          background: dispatching
            ? '#64748b'
            : '#3b82f6',
          border: 'none',
          borderRadius: 6,
          color: '#fff',
          fontWeight: 800,
          cursor: dispatching
            ? 'not-allowed'
            : 'pointer',
          marginTop: 4,
        }}
      >
        {dispatching
          ? 'DISPATCHING…'
          : dispatchRequested
            ? '🚨 UPDATE DISPATCH'
            : '🚨 REQUEST RESPONSE'}
      </button>

      {/* ====================================================
          REFRESH BUTTON
      ==================================================== */}

      <button
        type="button"
        onClick={refreshIncident}
        disabled={refreshing}
        style={{
          width: '100%',
          padding: 8,
          background:
            'transparent',
          border:
            '1px solid #334155',
          borderRadius: 6,
          color: '#94a3b8',
          fontWeight: 700,
          cursor: refreshing
            ? 'not-allowed'
            : 'pointer',
          marginTop: 7,
        }}
      >
        {refreshing
          ? 'REFRESHING…'
          : '↻ REFRESH INCIDENT'}
      </button>

      {/* ====================================================
          MESSAGE
      ==================================================== */}

      {message && (
        <div
          style={{
            marginTop: 9,
            padding: 8,
            borderRadius: 6,
            background:
              '#111827',
            color: '#cbd5e1',
            fontSize: 10,
            lineHeight: 1.45,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
};

export default IncidentSidePanel;