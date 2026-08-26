import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import axios from 'axios';

import {
  CircleMarker,
  MapContainer,
  Popup,
  TileLayer,
  useMap,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';

// ============================================================
// API
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://disaster-app-30ll.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 15000,
});

// ============================================================
// DEFAULT LOCATION
// ============================================================

const DEFAULT_LOCATION = {
  lat: 29.59737,
  lng: 79.65017,
  accuracy: null,
};

// ============================================================
// SAFE NUMBER
// ============================================================

const toNumber = (value) => {
  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
};

// ============================================================
// INCIDENT NORMALIZER
// ============================================================

const normalizeIncident = (item, index) => {
  if (!item || typeof item !== 'object') {
    return null;
  }

  const lat = toNumber(
    item.lat ??
      item.latitude ??
      item.location?.lat
  );

  const lng = toNumber(
    item.lng ??
      item.longitude ??
      item.location?.lng
  );

  if (lat === null || lng === null) {
    return null;
  }

  return {
    id: item.id ?? item.incident_id ?? index,

    lat,
    lng,

    name:
      item.location_name ||
      item.location ||
      item.district ||
      item.name ||
      'Unknown Location',

    type:
      item.type ||
      item.disaster_type ||
      item.category ||
      'Unknown',

    severity:
      item.severity ||
      item.risk_level ||
      item.threat_level ||
      'UNKNOWN',

    status:
      item.status ||
      item.state ||
      'ACTIVE',

    magnitude:
      item.magnitude ??
      item.intensity ??
      null,

    accuracy:
      item.accuracy ??
      null,
  };
};

// ============================================================
// MARKER COLOR
// ============================================================

const getMarkerColor = (severity) => {
  const value = String(
    severity || ''
  ).toUpperCase();

  if (
    value.includes('CRITICAL') ||
    value.includes('HIGH') ||
    value.includes('SEVERE')
  ) {
    return '#ef4444';
  }

  if (
    value.includes('MEDIUM') ||
    value.includes('MODERATE')
  ) {
    return '#f59e0b';
  }

  if (
    value.includes('LOW') ||
    value.includes('SAFE')
  ) {
    return '#22c55e';
  }

  return '#38bdf8';
};

// ============================================================
// MAP SIZE FIX
// ============================================================

const MapResizeHandler = () => {
  const map = useMap();

  useEffect(() => {
    let mounted = true;

    const resizeMap = () => {
      if (!mounted) return;

      map.invalidateSize({
        animate: false,
        pan: false,
      });
    };

    const timer1 = setTimeout(
      resizeMap,
      100
    );

    const timer2 = setTimeout(
      resizeMap,
      400
    );

    const timer3 = setTimeout(
      resizeMap,
      1000
    );

    window.addEventListener(
      'resize',
      resizeMap
    );

    return () => {
      mounted = false;

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      window.removeEventListener(
        'resize',
        resizeMap
      );
    };
  }, [map]);

  return null;
};

// ============================================================
// MAP LOCATION CONTROLLER
// ============================================================

const MapLocationController = ({
  location,
  shouldCenter,
  onCentered,
}) => {
  const map = useMap();

  const lastLocationRef =
    useRef(null);

  useEffect(() => {
    if (!shouldCenter || !location) {
      return;
    }

    const lat = toNumber(location.lat);
    const lng = toNumber(location.lng);

    if (
      lat === null ||
      lng === null
    ) {
      return;
    }

    const key = `${lat.toFixed(
      6
    )},${lng.toFixed(6)}`;

    if (
      lastLocationRef.current === key
    ) {
      return;
    }

    lastLocationRef.current = key;

    map.flyTo(
      [lat, lng],
      12,
      {
        animate: true,
        duration: 0.8,
      }
    );

    if (onCentered) {
      onCentered();
    }
  }, [
    map,
    location,
    shouldCenter,
    onCentered,
  ]);

  return null;
};

// ============================================================
// LIVE LOCATION PANEL
// ============================================================

const LiveLocationPanel = ({
  location,
  gpsStatus,
  gpsError,
  onDetect,
  detecting,
}) => {
  const lat = toNumber(
    location?.lat
  );

  const lng = toNumber(
    location?.lng
  );

  const accuracy = toNumber(
    location?.accuracy
  );

  let statusText =
    'Using default map location';

  let statusIcon = '🔵';

  if (gpsStatus === 'detecting') {
    statusText =
      'Detecting GPS location...';

    statusIcon = '🟡';
  }

  if (gpsStatus === 'success') {
    statusText =
      'GPS location detected';

    statusIcon = '🟢';
  }

  if (gpsStatus === 'denied') {
    statusText =
      'Location permission denied';

    statusIcon = '🔴';
  }

  if (gpsStatus === 'error') {
    statusText =
      'GPS unavailable';

    statusIcon = '🔴';
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: 16,
        left: 16,

        width: 360,
        maxWidth:
          'calc(100% - 32px)',

        background:
          'rgba(13,20,36,0.97)',

        border:
          '1px solid #334155',

        borderRadius: 12,

        padding: 16,

        zIndex: 1000,

        color: '#e2e8f0',

        boxShadow:
          '0 12px 30px rgba(0,0,0,0.55)',

        boxSizing: 'border-box',
      }}
    >
      {/* HEADER */}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent:
            'space-between',

          marginBottom: 10,
        }}
      >
        <div
          style={{
            fontSize: 17,
            fontWeight: 800,
            color: '#f8fafc',
          }}
        >
          📍 Live Location
        </div>

        <div
          style={{
            fontSize: 13,
          }}
        >
          {statusIcon}
        </div>
      </div>

      {/* LOCATION */}

      <div
        style={{
          fontSize: 12,
          lineHeight: 1.8,
        }}
      >
        <div>
          <strong>
            Location:
          </strong>{' '}
          {gpsStatus ===
          'success'
            ? 'Current Device Location'
            : 'Uttarakhand Map Center'}
        </div>

        <div>
          <strong>
            GPS:
          </strong>{' '}
          {lat !== null
            ? lat.toFixed(5)
            : 'N/A'}
          {', '}
          {lng !== null
            ? lng.toFixed(5)
            : 'N/A'}
        </div>

        <div>
          <strong>
            Status:
          </strong>{' '}
          {statusText}
        </div>

        <div>
          <strong>
            Accuracy:
          </strong>{' '}
          {accuracy !== null
            ? `±${Math.round(
                accuracy
              )} m`
            : 'N/A'}
        </div>
      </div>

      {/* ERROR */}

      {gpsError && (
        <div
          style={{
            marginTop: 10,

            padding: 9,

            borderRadius: 7,

            background:
              'rgba(239,68,68,0.10)',

            border:
              '1px solid rgba(239,68,68,0.25)',

            color: '#fca5a5',

            fontSize: 11,

            lineHeight: 1.5,
          }}
        >
          {gpsError}
        </div>
      )}

      {/* DETECT BUTTON */}

      <button
        type="button"
        onClick={onDetect}
        disabled={detecting}
        style={{
          width: '100%',

          marginTop: 11,

          padding: '9px 10px',

          borderRadius: 7,

          border:
            '1px solid #475569',

          background:
            detecting
              ? '#334155'
              : '#1e293b',

          color: '#f8fafc',

          cursor: detecting
            ? 'not-allowed'
            : 'pointer',

          fontWeight: 700,

          fontSize: 12,
        }}
      >
        {detecting
          ? '📡 Detecting...'
          : '📡 Detect My Location'}
      </button>
    </div>
  );
};

// ============================================================
// MAIN MAP AREA
// ============================================================

const MapArea = ({
  refreshKey = 0,
}) => {
  // ----------------------------------------------------------
  // LOCATION STATE
  // ----------------------------------------------------------

  const [
    location,
    setLocation,
  ] = useState(
    DEFAULT_LOCATION
  );

  const [
    gpsStatus,
    setGpsStatus,
  ] = useState('idle');

  const [
    gpsError,
    setGpsError,
  ] = useState('');

  const [
    shouldCenter,
    setShouldCenter,
  ] = useState(false);

  // ----------------------------------------------------------
  // INCIDENT STATE
  // ----------------------------------------------------------

  const [
    incidents,
    setIncidents,
  ] = useState([]);

  const [
    incidentsLoading,
    setIncidentsLoading,
  ] = useState(false);

  // ----------------------------------------------------------
  // PREVENT DOUBLE GPS REQUEST
  // ----------------------------------------------------------

  const gpsRequestRef =
    useRef(false);

  // ==========================================================
  // GPS DETECTION
  // ==========================================================

  const detectLocation =
    useCallback(() => {
      if (
        gpsRequestRef.current
      ) {
        return;
      }

      if (
        !navigator.geolocation
      ) {
        setGpsStatus('error');

        setGpsError(
          'GPS is not supported by this browser. The map is still available.'
        );

        return;
      }

      gpsRequestRef.current =
        true;

      setGpsStatus(
        'detecting'
      );

      setGpsError('');

      navigator.geolocation.getCurrentPosition(
        (position) => {
          const lat =
            toNumber(
              position
                .coords
                .latitude
            );

          const lng =
            toNumber(
              position
                .coords
                .longitude
            );

          const accuracy =
            toNumber(
              position
                .coords
                .accuracy
            );

          if (
            lat === null ||
            lng === null
          ) {
            gpsRequestRef.current =
              false;

            setGpsStatus(
              'error'
            );

            setGpsError(
              'GPS returned an invalid location.'
            );

            return;
          }

          setLocation({
            lat,
            lng,
            accuracy,
          });

          setGpsStatus(
            'success'
          );

          setGpsError('');

          // Center only once
          setShouldCenter(true);

          gpsRequestRef.current =
            false;
        },

        (error) => {
          gpsRequestRef.current =
            false;

          if (
            error?.code === 1
          ) {
            setGpsStatus(
              'denied'
            );

            setGpsError(
              'Location permission is blocked. Allow Location for this site in Chrome site settings, then press Detect My Location again.'
            );

            return;
          }

          if (
            error?.code === 2
          ) {
            setGpsStatus(
              'error'
            );

            setGpsError(
              'Your device could not determine GPS right now. The map will continue using the default location.'
            );

            return;
          }

          if (
            error?.code === 3
          ) {
            setGpsStatus(
              'error'
            );

            setGpsError(
              'GPS request timed out. The map is still working. Press Detect My Location to try again.'
            );

            return;
          }

          setGpsStatus(
            'error'
          );

          setGpsError(
            'Unable to detect GPS location. The map is still working.'
          );
        },

        {
          enableHighAccuracy: true,

          timeout: 12000,

          maximumAge: 60000,
        }
      );
    }, []);

  // ==========================================================
  // INITIAL GPS REQUEST
  // ==========================================================

  useEffect(() => {
    const timer =
      setTimeout(() => {
        detectLocation();
      }, 300);

    return () => {
      clearTimeout(timer);
    };
  }, [detectLocation]);

  // ==========================================================
  // FETCH INCIDENTS
  // ==========================================================

  const fetchIncidents =
    useCallback(async () => {
      setIncidentsLoading(
        true
      );

      try {
        const response =
          await api.get(
            '/incidents'
          );

        const data =
          response.data;

        let rawIncidents = [];

        if (
          Array.isArray(data)
        ) {
          rawIncidents =
            data;
        } else if (
          Array.isArray(
            data?.incidents
          )
        ) {
          rawIncidents =
            data.incidents;
        } else if (
          Array.isArray(
            data?.data
          )
        ) {
          rawIncidents =
            data.data;
        }

        const cleaned =
          rawIncidents
            .map(
              normalizeIncident
            )
            .filter(Boolean);

        setIncidents(
          cleaned
        );
      } catch (error) {
        console.warn(
          'Incident API unavailable:',
          error?.message ||
            error
        );

        // IMPORTANT:
        // Backend failure does not break map.
        setIncidents([]);
      } finally {
        setIncidentsLoading(
          false
        );
      }
    }, []);

  // ==========================================================
  // INCIDENT FETCH
  // ==========================================================

  useEffect(() => {
    fetchIncidents();
  }, [
    fetchIncidents,
    refreshKey,
  ]);

  // ==========================================================
  // CENTER COMPLETE
  // ==========================================================

  const handleCentered =
    useCallback(() => {
      setShouldCenter(
        false
      );
    }, []);

  // ==========================================================
  // RENDER
  // ==========================================================

  return (
    <div
      style={{
        position: 'relative',

        width: '100%',

        height:
          'calc(100vh - 100px)',

        minHeight: 520,

        overflow: 'hidden',

        background:
          '#cbd5e1',

        borderTop:
          '1px solid #334155',
      }}
    >
      {/* ======================================================
          MAP
      ====================================================== */}

      <MapContainer
        center={[
          DEFAULT_LOCATION.lat,
          DEFAULT_LOCATION.lng,
        ]}
        zoom={8}
        minZoom={5}
        maxZoom={18}
        scrollWheelZoom={true}
        zoomControl={true}
        preferCanvas={true}
        style={{
          width: '100%',
          height: '100%',
          minHeight: 520,
          background:
            '#cbd5e1',
        }}
      >
        {/* ====================================================
            OPEN STREET MAP
        ==================================================== */}

        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          maxZoom={19}
        />

        {/* ====================================================
            MAP SIZE FIX
        ==================================================== */}

        <MapResizeHandler />

        {/* ====================================================
            GPS CENTER
        ==================================================== */}

        <MapLocationController
          location={location}
          shouldCenter={
            shouldCenter
          }
          onCentered={
            handleCentered
          }
        />

        {/* ====================================================
            USER LOCATION
        ==================================================== */}

        <CircleMarker
          center={[
            location.lat,
            location.lng,
          ]}
          radius={10}
          pathOptions={{
            color: '#ffffff',
            weight: 3,
            fillColor:
              '#2563eb',
            fillOpacity: 1,
          }}
        >
          <Popup>
            <div>
              <strong>
                📍 Your Location
              </strong>

              <br />

              GPS:{' '}
              {location.lat.toFixed(
                5
              )}
              {', '}
              {location.lng.toFixed(
                5
              )}

              {location.accuracy !==
                null && (
                <>
                  <br />
                  Accuracy: ±
                  {Math.round(
                    location.accuracy
                  )}{' '}
                  m
                </>
              )}
            </div>
          </Popup>
        </CircleMarker>

        {/* ====================================================
            INCIDENT MARKERS
        ==================================================== */}

        {incidents.map(
          (incident) => (
            <CircleMarker
              key={String(
                incident.id
              )}
              center={[
                incident.lat,
                incident.lng,
              ]}
              radius={9}
              pathOptions={{
                color:
                  '#ffffff',

                weight: 2,

                fillColor:
                  getMarkerColor(
                    incident.severity
                  ),

                fillOpacity:
                  0.9,
              }}
            >
              <Popup>
                <div
                  style={{
                    minWidth: 180,
                    lineHeight: 1.6,
                  }}
                >
                  <strong>
                    🚨{' '}
                    {incident.name}
                  </strong>

                  <br />

                  Type:{' '}
                  {incident.type}

                  <br />

                  Severity:{' '}
                  {incident.severity}

                  <br />

                  Status:{' '}
                  {incident.status}

                  {incident.magnitude !==
                    null && (
                    <>
                      <br />
                      Magnitude:{' '}
                      {
                        incident.magnitude
                      }
                    </>
                  )}

                  <br />

                  GPS:{' '}
                  {incident.lat.toFixed(
                    5
                  )}
                  {', '}
                  {incident.lng.toFixed(
                    5
                  )}
                </div>
              </Popup>
            </CircleMarker>
          )
        )}
      </MapContainer>

      {/* ======================================================
          LIVE LOCATION PANEL
      ====================================================== */}

      <LiveLocationPanel
        location={location}
        gpsStatus={
          gpsStatus
        }
        gpsError={
          gpsError
        }
        onDetect={
          detectLocation
        }
        detecting={
          gpsStatus ===
          'detecting'
        }
      />

      {/* ======================================================
          INCIDENT STATUS
      ====================================================== */}

      <div
        style={{
          position: 'absolute',

          right: 16,

          bottom: 16,

          zIndex: 1000,

          background:
            'rgba(13,20,36,0.95)',

          border:
            '1px solid #334155',

          borderRadius: 7,

          padding:
            '8px 11px',

          color:
            '#cbd5e1',

          fontSize: 11,
        }}
      >
        {incidentsLoading
          ? '⏳ Loading incidents...'
          : `🚨 ${incidents.length} incident${
              incidents.length ===
              1
                ? ''
                : 's'
            }`}
      </div>
    </div>
  );
};

export default MapArea;