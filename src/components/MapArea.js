import React, { useCallback, useEffect, useRef, useState } from 'react';
import axios from 'axios';
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Popup,
  useMap,
} from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

// ============================================================
// API
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://disaster-app-uhi7.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// ============================================================
// DEFAULT MAP LOCATION
// ============================================================

const DEFAULT_LAT = 29.59737;
const DEFAULT_LNG = 79.65017;

// ============================================================
// MAP RESIZE FIX
// Prevents grey / broken / flickering map
// ============================================================

const MapResizeHandler = () => {
  const map = useMap();

  useEffect(() => {
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => clearTimeout(timer);
  }, [map]);

  return null;
};

// ============================================================
// MAP CENTER CONTROLLER
// ============================================================

const MapCenterController = ({ position }) => {
  const map = useMap();

  useEffect(() => {
    if (!position) return;

    map.setView(
      [position.lat, position.lng],
      Math.max(map.getZoom(), 10),
      {
        animate: true,
      }
    );
  }, [position, map]);

  return null;
};

// ============================================================
// STATUS HELPERS
// ============================================================

const getIncidentColor = (incident) => {
  const severity = String(
    incident?.severity ||
      incident?.threat_level ||
      incident?.risk_level ||
      ''
  ).toUpperCase();

  if (
    severity.includes('HIGH') ||
    severity.includes('CRITICAL') ||
    severity.includes('SEVERE')
  ) {
    return '#ef4444';
  }

  if (
    severity.includes('MEDIUM') ||
    severity.includes('MODERATE')
  ) {
    return '#facc15';
  }

  return '#22c55e';
};

// ============================================================
// MAP AREA
// ============================================================

const MapArea = ({ refreshKey = 0 }) => {
  // ----------------------------------------------------------
  // GPS
  // ----------------------------------------------------------

  const [gpsPosition, setGpsPosition] = useState({
    lat: DEFAULT_LAT,
    lng: DEFAULT_LNG,
  });

  const [gpsStatus, setGpsStatus] = useState('Detecting...');
  const [gpsError, setGpsError] = useState('');
  const [gpsAccuracy, setGpsAccuracy] = useState(null);
  const [gpsUpdated, setGpsUpdated] = useState(null);

  const gpsRequestRef = useRef(false);

  // ----------------------------------------------------------
  // INCIDENTS
  // ----------------------------------------------------------

  const [incidents, setIncidents] = useState([]);
  const [selectedIncident, setSelectedIncident] = useState(null);

  const [loadingIncidents, setLoadingIncidents] = useState(false);

  // ----------------------------------------------------------
  // SOS
  // ----------------------------------------------------------

  const [sosCalling, setSosCalling] = useState(false);

  const SOS_NUMBER = '112';

  // ==========================================================
  // GPS DETECTION
  // IMPORTANT:
  // One-shot getCurrentPosition only.
  // NO watchPosition loop.
  // ==========================================================

  const detectLocation = useCallback(() => {
    if (gpsRequestRef.current) return;

    if (!navigator.geolocation) {
      setGpsStatus('GPS not available');
      setGpsError(
        'This browser does not support location services.'
      );
      return;
    }

    gpsRequestRef.current = true;

    setGpsStatus('Detecting...');
    setGpsError('');

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const {
          latitude,
          longitude,
          accuracy,
        } = position.coords;

        setGpsPosition({
          lat: latitude,
          lng: longitude,
        });

        setGpsAccuracy(
          Number.isFinite(accuracy)
            ? Math.round(accuracy)
            : null
        );

        setGpsStatus('Location detected');

        setGpsUpdated(
          new Date().toLocaleTimeString()
        );

        gpsRequestRef.current = false;
      },

      (error) => {
        console.warn(
          'GPS location error:',
          error
        );

        let message =
          'Unable to detect your location.';

        if (error.code === 1) {
          message =
            'Location permission denied. Allow location access in browser settings.';
        } else if (error.code === 2) {
          message =
            'GPS position is unavailable right now.';
        } else if (error.code === 3) {
          message =
            'GPS request timed out. Please try again.';
        }

        setGpsStatus('GPS unavailable');
        setGpsError(message);

        gpsRequestRef.current = false;
      },

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 30000,
      }
    );
  }, []);

  // ==========================================================
  // INITIAL GPS
  // ==========================================================

  useEffect(() => {
    detectLocation();
  }, [detectLocation]);

  // ==========================================================
  // FETCH INCIDENTS
  // ==========================================================

  const fetchIncidents = useCallback(
    async () => {
      try {
        setLoadingIncidents(true);

        const response =
          await api.get('/incidents');

        const data = response.data;

        let list = [];

        if (Array.isArray(data)) {
          list = data;
        } else if (
          Array.isArray(data?.incidents)
        ) {
          list = data.incidents;
        } else if (
          Array.isArray(data?.data)
        ) {
          list = data.data;
        }

        setIncidents(list);
      } catch (error) {
        console.warn(
          'Incident fetch failed:',
          error
        );

        // Do not break the map if backend is unavailable.
        setIncidents([]);
      } finally {
        setLoadingIncidents(false);
      }
    },
    []
  );

  // ==========================================================
  // INCIDENT REFRESH
  // ==========================================================

  useEffect(() => {
    fetchIncidents();
  }, [fetchIncidents, refreshKey]);

  // ==========================================================
  // SOS CALL
  // ==========================================================

  const handleSOS = () => {
    if (sosCalling) return;

    const confirmed = window.confirm(
      `🚨 EMERGENCY SOS\n\nCall emergency services at ${SOS_NUMBER}?\n\nOnly continue if you need immediate emergency assistance.`
    );

    if (!confirmed) return;

    setSosCalling(true);

    // Open phone dialer.
    window.location.href = `tel:${SOS_NUMBER}`;

    // Reset button state shortly afterwards.
    setTimeout(() => {
      setSosCalling(false);
    }, 2000);
  };

  // ==========================================================
  // FORMAT GPS
  // ==========================================================

  const formattedLat =
    gpsPosition.lat.toFixed(5);

  const formattedLng =
    gpsPosition.lng.toFixed(5);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100vh - 98px)',
        minHeight: '500px',
        overflow: 'hidden',
        background: '#e5e7eb',
      }}
    >
      {/* ====================================================
          MAP
      ==================================================== */}

      <MapContainer
        center={[
          gpsPosition.lat,
          gpsPosition.lng,
        ]}
        zoom={8}
        scrollWheelZoom={true}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '500px',
        }}
      >
        <MapResizeHandler />

        <MapCenterController
          position={gpsPosition}
        />

        {/* OpenStreetMap */}
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* ==================================================
            USER GPS LOCATION
        ================================================== */}

        {gpsPosition && (
          <CircleMarker
            center={[
              gpsPosition.lat,
              gpsPosition.lng,
            ]}
            radius={9}
            pathOptions={{
              color: '#2563eb',
              fillColor: '#3b82f6',
              fillOpacity: 0.9,
              weight: 3,
            }}
          >
            <Popup>
              <strong>📍 Your Location</strong>
              <br />
              GPS: {formattedLat},{' '}
              {formattedLng}
              <br />
              Accuracy:{' '}
              {gpsAccuracy
                ? `±${gpsAccuracy} m`
                : 'N/A'}
            </Popup>
          </CircleMarker>
        )}

        {/* ==================================================
            INCIDENT MARKERS
        ================================================== */}

        {incidents.map(
          (incident, index) => {
            const lat = Number(
              incident.lat ??
                incident.latitude
            );

            const lng = Number(
              incident.lng ??
                incident.longitude
            );

            if (
              !Number.isFinite(lat) ||
              !Number.isFinite(lng)
            ) {
              return null;
            }

            const color =
              getIncidentColor(incident);

            return (
              <CircleMarker
                key={
                  incident.id ??
                  `incident-${index}`
                }
                center={[lat, lng]}
                radius={8}
                pathOptions={{
                  color,
                  fillColor: color,
                  fillOpacity: 0.85,
                  weight: 2,
                }}
                eventHandlers={{
                  click: () =>
                    setSelectedIncident(
                      incident
                    ),
                }}
              >
                <Popup>
                  <strong>
                    🚨{' '}
                    {incident.type ||
                      'Incident'}
                  </strong>

                  <br />

                  Status:{' '}
                  {incident.status ||
                    incident.state ||
                    'ACTIVE'}

                  <br />

                  Severity:{' '}
                  {incident.severity ||
                    incident.threat_level ||
                    'UNKNOWN'}

                  <br />

                  GPS:{' '}
                  {lat.toFixed(5)},{' '}
                  {lng.toFixed(5)}
                </Popup>
              </CircleMarker>
            );
          }
        )}
      </MapContainer>

      {/* ====================================================
          LIVE LOCATION PANEL
      ==================================================== */}

      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 18,
          width: 375,
          maxWidth: 'calc(100% - 36px)',
          background:
            'rgba(13,20,36,0.97)',
          border:
            '1px solid rgba(148,163,184,0.3)',
          borderRadius: 12,
          padding: 16,
          boxSizing: 'border-box',
          zIndex: 1000,
          boxShadow:
            '0 12px 30px rgba(0,0,0,0.35)',
          color: '#e2e8f0',
        }}
      >
        {/* HEADER */}

        <div
          style={{
            display: 'flex',
            justifyContent:
              'space-between',
            alignItems: 'center',
            marginBottom: 12,
          }}
        >
          <div
            style={{
              fontSize: 18,
              fontWeight: 800,
              color: '#fff',
            }}
          >
            📍 Live Location
          </div>

          <div
            style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background:
                gpsStatus ===
                'Location detected'
                  ? '#22c55e'
                  : '#facc15',
              boxShadow:
                '0 0 10px rgba(34,197,94,.5)',
            }}
          />
        </div>

        {/* LOCATION */}

        <div
          style={{
            fontSize: 13,
            lineHeight: 1.8,
          }}
        >
          <div>
            <strong>
              Location:
            </strong>{' '}
            {gpsStatus}
          </div>

          <div>
            <strong>GPS:</strong>{' '}
            {formattedLat},{' '}
            {formattedLng}
          </div>

          <div>
            <strong>Status:</strong>{' '}
            <span
              style={{
                color:
                  gpsStatus ===
                  'Location detected'
                    ? '#86efac'
                    : '#facc15',
              }}
            >
              {gpsStatus}
            </span>
          </div>

          <div>
            <strong>
              Accuracy:
            </strong>{' '}
            {gpsAccuracy
              ? `±${gpsAccuracy} m`
              : 'N/A'}
          </div>

          {gpsUpdated && (
            <div
              style={{
                color: '#94a3b8',
                fontSize: 11,
              }}
            >
              Updated: {gpsUpdated}
            </div>
          )}
        </div>

        {/* GPS ERROR */}

        {gpsError && (
          <div
            style={{
              marginTop: 10,
              padding: 9,
              borderRadius: 7,
              background:
                'rgba(239,68,68,.1)',
              border:
                '1px solid rgba(239,68,68,.25)',
              color: '#fca5a5',
              fontSize: 11,
              lineHeight: 1.5,
            }}
          >
            ⚠️ {gpsError}
          </div>
        )}

        {/* ==================================================
            BUTTONS
        ================================================== */}

        <div
          style={{
            display: 'grid',
            gridTemplateColumns:
              '1fr 1fr',
            gap: 8,
            marginTop: 12,
          }}
        >
          {/* Detect GPS */}

          <button
            type="button"
            onClick={detectLocation}
            disabled={
              gpsStatus === 'Detecting...'
            }
            style={{
              padding: '10px 8px',
              borderRadius: 7,
              border:
                '1px solid #475569',
              background:
                gpsStatus ===
                'Detecting...'
                  ? '#334155'
                  : '#1e293b',
              color: '#e2e8f0',
              cursor:
                gpsStatus ===
                'Detecting...'
                  ? 'not-allowed'
                  : 'pointer',
              fontWeight: 700,
              fontSize: 12,
            }}
          >
            {gpsStatus ===
            'Detecting...'
              ? '📡 Detecting...'
              : '📍 Detect Location'}
          </button>

          {/* SOS */}

          <button
            type="button"
            onClick={handleSOS}
            disabled={sosCalling}
            style={{
              padding: '10px 8px',
              borderRadius: 7,
              border:
                '1px solid #ef4444',
              background:
                sosCalling
                  ? '#7f1d1d'
                  : '#dc2626',
              color: '#fff',
              cursor: sosCalling
                ? 'not-allowed'
                : 'pointer',
              fontWeight: 900,
              fontSize: 12,
              boxShadow:
                '0 0 12px rgba(239,68,68,.25)',
            }}
          >
            {sosCalling
              ? '📞 CALLING...'
              : '🚨 CALL SOS 112'}
          </button>
        </div>

        {/* SOS INFO */}

        <div
          style={{
            marginTop: 8,
            textAlign: 'center',
            color: '#64748b',
            fontSize: 9,
          }}
        >
          Emergency services • India: 112
        </div>
      </div>

      {/* ====================================================
          INCIDENT INFO
      ==================================================== */}

      {selectedIncident && (
        <div
          style={{
            position: 'absolute',
            right: 18,
            top: 18,
            width: 300,
            maxWidth:
              'calc(100% - 36px)',
            background:
              'rgba(13,20,36,.97)',
            border:
              '1px solid #334155',
            borderRadius: 10,
            padding: 15,
            zIndex: 1100,
            color: '#e2e8f0',
            boxShadow:
              '0 12px 30px rgba(0,0,0,.4)',
          }}
        >
          <div
            style={{
              display: 'flex',
              justifyContent:
                'space-between',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            <strong>
              🚨 Incident Details
            </strong>

            <button
              type="button"
              onClick={() =>
                setSelectedIncident(
                  null
                )
              }
              style={{
                background:
                  'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              ✕
            </button>
          </div>

          <div
            style={{
              fontSize: 12,
              lineHeight: 1.8,
            }}
          >
            <div>
              <b>Type:</b>{' '}
              {selectedIncident.type ||
                'Unknown'}
            </div>

            <div>
              <b>Status:</b>{' '}
              {selectedIncident.status ||
                selectedIncident.state ||
                'ACTIVE'}
            </div>

            <div>
              <b>Severity:</b>{' '}
              {selectedIncident.severity ||
                selectedIncident.threat_level ||
                'UNKNOWN'}
            </div>

            <div>
              <b>Location:</b>{' '}
              {selectedIncident.location_name ||
                selectedIncident.location ||
                'GPS'}
            </div>
          </div>

          <button
            type="button"
            onClick={handleSOS}
            style={{
              width: '100%',
              marginTop: 12,
              padding: 9,
              borderRadius: 6,
              border:
                '1px solid #ef4444',
              background: '#dc2626',
              color: '#fff',
              fontWeight: 800,
              cursor: 'pointer',
            }}
          >
            🚨 CALL EMERGENCY SOS — 112
          </button>
        </div>
      )}

      {/* ====================================================
          INCIDENT COUNT
      ==================================================== */}

      <div
        style={{
          position: 'absolute',
          bottom: 18,
          left: 18,
          padding: '7px 11px',
          background:
            'rgba(13,20,36,.92)',
          border:
            '1px solid #334155',
          borderRadius: 6,
          color: '#cbd5e1',
          fontSize: 10,
          zIndex: 900,
        }}
      >
        🚨 Incidents:{' '}
        {loadingIncidents
          ? '...'
          : incidents.length}
      </div>
    </div>
  );
};

export default MapArea;