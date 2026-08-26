import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  MapContainer,
  TileLayer,
  Circle,
  Marker,
  Popup,
  useMap,
} from 'react-leaflet';

import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';

import IncidentSidePanel from './IncidentSidePanel';
import ParserPanel from './ParserPanel';
import FundingPanel from './FundingPanel';
import VerificationsPanel from './VerificationsPanel';

// ============================================================
// API
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://disaster-app-30ll.onrender.com';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ============================================================
// LEAFLET ICON FIX
// ============================================================

delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const makeIcon = (color) =>
  new L.Icon({
    iconUrl:
      `https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-${color}.png`,
    shadowUrl:
      'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34],
  });

const greenIcon = makeIcon('green');
const blueIcon = makeIcon('blue');
const orangeIcon = makeIcon('orange');
const violetIcon = makeIcon('violet');

// ============================================================
// MAP CLICK
// ============================================================

const MapClickHandler = ({ setLat, setLng, setLocationStatus, setLocationName }) => {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = (event) => {
      setLat(event.latlng.lat);
      setLng(event.latlng.lng);

      // A map click is a manually selected location, not GPS.
      setLocationStatus('manual');
      setLocationName('Map-selected location');
    };

    map.on('click', handleMapClick);

    return () => {
      map.off('click', handleMapClick);
    };
  }, [
    map,
    setLat,
    setLng,
    setLocationStatus,
    setLocationName,
  ]);

  return null;
};

// ============================================================
// MAP AREA
// ============================================================

const MapArea = ({ refreshKey }) => {
  // ----------------------------------------------------------
  // Initial map center only.
  // This is NOT claimed as the user's GPS location.
  // ----------------------------------------------------------

  const [lat, setLat] = useState(29.9457);
  const [lng, setLng] = useState(78.1642);

  const [locationStatus, setLocationStatus] =
    useState('detecting');

  const [locationName, setLocationName] =
    useState('Detecting current location...');

  const [locationAccuracy, setLocationAccuracy] =
    useState(null);

  const [lastLocationUpdate, setLastLocationUpdate] =
    useState(null);

  const [permissionState, setPermissionState] =
    useState('unknown');

  // ----------------------------------------------------------
  // DATA
  // ----------------------------------------------------------

  const [incidents, setIncidents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [medical, setMedical] = useState([]);
  const [rescue, setRescue] = useState([]);

  // ----------------------------------------------------------
  // UI
  // ----------------------------------------------------------

  const [sosLoading, setSosLoading] = useState(false);
  const [currentIncident, setCurrentIncident] =
    useState(null);
  const [map, setMap] = useState(null);
  const [sosResult, setSosResult] = useState(null);
  const [dispatchLoading, setDispatchLoading] =
    useState(false);
  const [locationLoading, setLocationLoading] =
    useState(false);

  const watchIdRef = useRef(null);
  const mountedRef = useRef(true);

  // ==========================================================
  // CLEANUP FLAG
  // ==========================================================

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;

      if (
        watchIdRef.current !== null &&
        navigator.geolocation
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );

        watchIdRef.current = null;
      }
    };
  }, []);

  // ==========================================================
  // REVERSE GEOCODING
  // ==========================================================

  const updateLocationName = useCallback(
    async (userLat, userLng) => {
      try {
        const response = await axios.get(
          'https://nominatim.openstreetmap.org/reverse',
          {
            params: {
              lat: userLat,
              lon: userLng,
              format: 'jsonv2',
              zoom: 18,
              addressdetails: 1,
            },
            headers: {
              Accept: 'application/json',
            },
            timeout: 10000,
          }
        );

        if (!mountedRef.current) return;

        const address =
          response.data?.address || {};

        const place =
          address.village ||
          address.hamlet ||
          address.town ||
          address.city ||
          address.municipality ||
          address.suburb ||
          address.locality ||
          'Current location';

        const district =
          address.state_district ||
          address.district ||
          '';

        setLocationName(
          district && district !== place
            ? `${place}, ${district}`
            : place
        );
      } catch (error) {
        console.warn(
          'Reverse geocoding failed:',
          error
        );

        if (mountedRef.current) {
          setLocationName(
            'Current GPS location'
          );
        }
      }
    },
    []
  );

  // ==========================================================
  // APPLY GPS POSITION
  // ==========================================================

  const applyPosition = useCallback(
    (position, moveMap = true) => {
      const userLat =
        Number(position?.coords?.latitude);

      const userLng =
        Number(position?.coords?.longitude);

      const accuracy =
        Number(position?.coords?.accuracy);

      if (
        !Number.isFinite(userLat) ||
        !Number.isFinite(userLng)
      ) {
        console.error(
          'Invalid GPS coordinates:',
          position
        );
        return;
      }

      console.log(
        '📍 REAL GPS LOCATION:',
        userLat,
        userLng,
        'accuracy:',
        accuracy
      );

      setLat(userLat);
      setLng(userLng);

      setLocationAccuracy(
        Number.isFinite(accuracy)
          ? accuracy
          : null
      );

      setLastLocationUpdate(
        new Date()
      );

      setLocationStatus('live');
      setPermissionState('granted');

      updateLocationName(
        userLat,
        userLng
      );

      if (moveMap && map) {
        map.flyTo(
          [userLat, userLng],
          16,
          {
            duration: 1.2,
          }
        );
      }
    },
    [map, updateLocationName]
  );

  // ==========================================================
  // LOCATION ERROR
  // ==========================================================

  const handleLocationError = useCallback(
    (error) => {
      console.error(
        '📍 Geolocation error:',
        error
      );

      if (!mountedRef.current) return;

      if (error?.code === 1) {
        setPermissionState('denied');
        setLocationStatus(
          'permission-denied'
        );
        setLocationName(
          'Location permission denied'
        );
      } else if (error?.code === 2) {
        setLocationStatus(
          'unavailable'
        );
        setLocationName(
          'GPS unavailable'
        );
      } else if (error?.code === 3) {
        setLocationStatus(
          'timeout'
        );
        setLocationName(
          'GPS request timed out'
        );
      } else {
        setLocationStatus(
          'error'
        );
        setLocationName(
          'Unable to detect GPS location'
        );
      }
    },
    []
  );

  // ==========================================================
  // BROWSER PERMISSION CHECK
  // ==========================================================

  const checkLocationPermission =
    useCallback(async () => {
      if (
        !navigator.permissions ||
        !navigator.permissions.query
      ) {
        return 'unknown';
      }

      try {
        const result =
          await navigator.permissions.query({
            name: 'geolocation',
          });

        if (!mountedRef.current) {
          return result.state;
        }

        setPermissionState(
          result.state
        );

        return result.state;
      } catch (error) {
        console.warn(
          'Location permission check failed:',
          error
        );

        return 'unknown';
      }
    }, []);

  // ==========================================================
  // START LIVE GPS WATCH
  // ==========================================================

  const startLocationWatch =
    useCallback(() => {
      if (!navigator.geolocation) {
        return;
      }

      if (
        watchIdRef.current !== null
      ) {
        navigator.geolocation.clearWatch(
          watchIdRef.current
        );
      }

      watchIdRef.current =
        navigator.geolocation.watchPosition(
          (position) => {
            if (!mountedRef.current) return;

            applyPosition(
              position,
              false
            );
          },
          (error) => {
            console.warn(
              'Live GPS watch failed:',
              error
            );

            // Do not overwrite a valid live
            // location just because a later
            // watch update failed.
          },
          {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 20000,
          }
        );
    }, [applyPosition]);

  // ==========================================================
  // GET REAL GPS LOCATION
  // ==========================================================

  const locateUser = useCallback(
    async (moveMap = true) => {
      if (locationLoading) {
        return;
      }

      if (!window.isSecureContext) {
        setLocationStatus('error');
        setLocationName(
          'Location requires HTTPS'
        );

        alert(
          'GPS location requires HTTPS. Open the deployed HTTPS website and try again.'
        );

        return;
      }

      if (!navigator.geolocation) {
        setLocationStatus(
          'unsupported'
        );

        setLocationName(
          'GPS is not supported by this browser'
        );

        alert(
          'This browser does not support GPS location.'
        );

        return;
      }

      setLocationLoading(true);
      setLocationStatus('detecting');
      setLocationName(
        'Requesting GPS location...'
      );

      try {
        const permission =
          await checkLocationPermission();

        if (permission === 'denied') {
          setLocationStatus(
            'permission-denied'
          );

          setLocationName(
            'Location permission denied'
          );

          alert(
            'Location is blocked for this website. In Chrome, click the 🔒 icon beside the address bar → Site settings → Location → Allow, then reload the page.'
          );

          return;
        }

        await new Promise(
          (resolve, reject) => {
            navigator.geolocation.getCurrentPosition(
              (position) => {
                try {
                  applyPosition(
                    position,
                    moveMap
                  );

                  startLocationWatch();

                  resolve();
                } catch (error) {
                  reject(error);
                }
              },
              (error) => {
                reject(error);
              },
              {
                enableHighAccuracy: true,
                timeout: 20000,
                maximumAge: 30000,
              }
            );
          }
        );
      } catch (error) {
        console.warn(
          'High accuracy GPS failed:',
          error
        );

        // ----------------------------------------------------
        // Fallback to browser/network-assisted location.
        // This still uses the browser Geolocation API.
        // ----------------------------------------------------

        if (error?.code === 1) {
          handleLocationError(error);
        } else {
          try {
            await new Promise(
              (resolve, reject) => {
                navigator.geolocation.getCurrentPosition(
                  (position) => {
                    applyPosition(
                      position,
                      moveMap
                    );

                    startLocationWatch();

                    resolve();
                  },
                  reject,
                  {
                    enableHighAccuracy: false,
                    timeout: 20000,
                    maximumAge: 120000,
                  }
                );
              }
            );
          } catch (fallbackError) {
            handleLocationError(
              fallbackError
            );
          }
        }
      } finally {
        if (mountedRef.current) {
          setLocationLoading(false);
        }
      }
    },
    [
      locationLoading,
      checkLocationPermission,
      applyPosition,
      startLocationWatch,
      handleLocationError,
    ]
  );

  // ==========================================================
  // INITIAL GPS
  // ==========================================================

  useEffect(() => {
    locateUser(true);
  }, [locateUser]);

  // ==========================================================
  // FETCH INCIDENT + VOLUNTEER DATA
  // ==========================================================

  const fetchData =
    useCallback(async () => {
      try {
        const [
          incidentsRes,
          volunteersRes,
        ] = await Promise.all([
          api.get('/incidents'),
          api.get('/volunteers'),
        ]);

        if (!mountedRef.current) return;

        setIncidents(
          Array.isArray(
            incidentsRes.data
          )
            ? incidentsRes.data
            : []
        );

        setVolunteers(
          Array.isArray(
            volunteersRes.data
          )
            ? volunteersRes.data
            : []
        );
      } catch (error) {
        console.error(
          'Failed to fetch map data:',
          error
        );
      }
    }, []);

  useEffect(() => {
    fetchData();
  }, [
    fetchData,
    refreshKey,
  ]);

  // ==========================================================
  // RESPONSE TEAMS
  // ==========================================================

  const fetchResponseTeams =
    useCallback(async () => {
      try {
        const [
          medicalRes,
          rescueRes,
        ] = await Promise.allSettled([
          api.get(
            '/response-teams/medical',
            {
              params: {
                lat,
                lng,
              },
            }
          ),
          api.get(
            '/response-teams/rescue',
            {
              params: {
                lat,
                lng,
              },
            }
          ),
        ]);

        if (
          medicalRes.status ===
          'fulfilled'
        ) {
          setMedical(
            Array.isArray(
              medicalRes.value.data
            )
              ? medicalRes.value.data
              : []
          );
        }

        if (
          rescueRes.status ===
          'fulfilled'
        ) {
          setRescue(
            Array.isArray(
              rescueRes.value.data
            )
              ? rescueRes.value.data
              : []
          );
        }
      } catch (error) {
        console.warn(
          'Response team loading failed:',
          error
        );
      }
    }, [lat, lng]);

  useEffect(() => {
    fetchResponseTeams();
  }, [fetchResponseTeams]);

  // ==========================================================
  // SOS
  // ==========================================================

  const handleSOS =
    useCallback(async () => {
      if (sosLoading) return;

      if (!navigator.geolocation) {
        setSosResult({
          ok: false,
          message:
            'This browser does not support GPS location.',
        });

        return;
      }

      setSosLoading(true);
      setSosResult(null);

      try {
        const position =
          await new Promise(
            (resolve, reject) => {
              navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                  enableHighAccuracy: true,
                  timeout: 20000,
                  maximumAge: 0,
                }
              );
            }
          );

        const userLat =
          position.coords.latitude;

        const userLng =
          position.coords.longitude;

        const accuracy =
          position.coords.accuracy;

        setLat(userLat);
        setLng(userLng);

        setLocationAccuracy(
          accuracy
        );

        setLocationStatus('live');
        setPermissionState(
          'granted'
        );

        await updateLocationName(
          userLat,
          userLng
        );

        const res =
          await api.post('/sos', {
            lat: userLat,
            lng: userLng,
            accuracy,
            type: 'EMERGENCY_SOS',
            source: 'WEB_APP',
            location_name:
              'Current GPS Location',
            timestamp:
              new Date().toISOString(),
          });

        const incident =
          res.data?.incident;

        if (incident) {
          setCurrentIncident(
            incident
          );

          setIncidents(
            (previous) => [
              incident,
              ...previous,
            ]
          );
        }

        setSosResult({
          ok: true,
          message:
            res.data?.message ||
            'SOS registered successfully.',
          incidentId:
            incident?.id ||
            res.data?.id ||
            null,
        });

        window.dispatchEvent(
          new Event('refreshStats')
        );

        if (map) {
          map.flyTo(
            [userLat, userLng],
            16,
            {
              duration: 1.2,
            }
          );
        }
      } catch (error) {
        console.error(
          'SOS failed:',
          error
        );

        const message =
          error?.code === 1
            ? 'Please allow location access before sending SOS.'
            : error?.response?.data
                ?.detail ||
              error?.response?.data
                ?.message ||
              error?.message ||
              'Unable to register SOS.';

        setSosResult({
          ok: false,
          message,
        });
      } finally {
        setSosLoading(false);
      }
    }, [
      sosLoading,
      updateLocationName,
      map,
    ]);

  // ==========================================================
  // CALL 112
  // ==========================================================

  const callEmergency112 =
    () => {
      window.location.href =
        'tel:112';
    };

  // ==========================================================
  // DISPATCH
  // ==========================================================

  const handleDispatch =
    async () => {
      if (dispatchLoading) return;

      setDispatchLoading(true);

      try {
        const incidentId =
          currentIncident?.id;

        if (!incidentId) {
          throw new Error(
            'No active SOS incident is selected.'
          );
        }

        const response =
          await api.post(
            `/incidents/${incidentId}/dispatch`,
            {
              lat,
              lng,
              requested_at:
                new Date().toISOString(),
              requested_units: [
                'MEDICAL',
                'RESCUE',
                'SDRF',
              ],
            }
          );

        setSosResult({
          ok: true,
          message:
            response.data?.message ||
            'Response dispatch request sent.',
          incidentId,
        });

        await fetchData();
        await fetchResponseTeams();
      } catch (error) {
        console.error(
          'Dispatch failed:',
          error
        );

        setSosResult({
          ok: false,
          message:
            error?.response?.data
              ?.detail ||
            error?.response?.data
              ?.message ||
            error?.message ||
            'Dispatch request failed.',
        });
      } finally {
        setDispatchLoading(false);
      }
    };

  const handleClosePanel =
    () => {
      setCurrentIncident(null);
    };

  // ==========================================================
  // LOCATION STATUS UI
  // ==========================================================

  const statusText =
    locationStatus === 'live'
      ? '🟢 Live GPS'
      : locationStatus === 'detecting'
        ? '🟡 Detecting...'
        : locationStatus ===
            'permission-denied'
          ? '🔴 Permission denied'
          : locationStatus ===
              'manual'
            ? '🔵 Map selected'
            : '🔴 GPS unavailable';

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <div
      className="map-area"
      style={{
        position: 'relative',
        height: '560px',
        margin: '0 16px',
        borderRadius: '12px',
        overflow: 'hidden',
        border:
          '1px solid #1e293b',
      }}
    >
      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{
          height: '100%',
          width: '100%',
          zIndex: 1,
        }}
        whenReady={(mapInstance) => {
          setMap(
            mapInstance.target
          );
        }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />

        <MapClickHandler
          setLat={setLat}
          setLng={setLng}
          setLocationStatus={
            setLocationStatus
          }
          setLocationName={
            setLocationName
          }
        />

        {volunteers
          .filter(
            (v) =>
              v.status ===
              'AVAILABLE'
          )
          .map((v) => (
            <Marker
              key={`volunteer-${v.id}`}
              position={[
                v.lat,
                v.lng,
              ]}
              icon={greenIcon}
            >
              <Popup>
                <b>
                  🟢 AVAILABLE VOLUNTEER
                </b>
                <br />
                ID: {v.id}
                <br />
                Name: {v.name}
                <br />
                Distance:{' '}
                {v.dist ?? '—'} km
              </Popup>
            </Marker>
          ))}

        {medical.map((m) => (
          <Marker
            key={`medical-${m.id}`}
            position={[
              m.lat,
              m.lng,
            ]}
            icon={blueIcon}
          >
            <Popup>
              <b>
                🚑 MEDICAL RESPONSE
              </b>
              <br />
              ID: {m.id}
              <br />
              Status:{' '}
              {m.status ||
                'AVAILABLE'}
            </Popup>
          </Marker>
        ))}

        {rescue.map((r) => (
          <Marker
            key={`rescue-${r.id}`}
            position={[
              r.lat,
              r.lng,
            ]}
            icon={orangeIcon}
          >
            <Popup>
              <b>
                🚒 RESCUE RESPONSE
              </b>
              <br />
              ID: {r.id}
              <br />
              Status:{' '}
              {r.status ||
                'AVAILABLE'}
            </Popup>
          </Marker>
        ))}

        {incidents.map(
          (inc) => (
            <React.Fragment
              key={inc.id}
            >
              <Marker
                position={[
                  inc.lat,
                  inc.lng,
                ]}
                icon={violetIcon}
              >
                <Popup>
                  <b>
                    🚨 {inc.id}
                  </b>
                  <br />
                  Type:{' '}
                  {inc.type ||
                    'Disaster incident'}
                  <br />
                  Severity:{' '}
                  {inc.severity ||
                    'UNKNOWN'}
                  <br />
                  Status:{' '}
                  {inc.status ||
                    'ACTIVE'}
                </Popup>
              </Marker>

              <Circle
                center={[
                  inc.lat,
                  inc.lng,
                ]}
                radius={
                  (Number(
                    inc.radius
                  ) || 1) * 1000
                }
                pathOptions={{
                  color: 'red',
                  fillColor:
                    '#ef4444',
                  fillOpacity: 0.2,
                }}
              />
            </React.Fragment>
          )
        )}
      </MapContainer>

      {/* ======================================================
          LIVE LOCATION CARD
      ====================================================== */}

      <div
        style={{
          position:
            'absolute',
          top: 14,
          left: 14,
          zIndex: 1000,
          width: 300,
          padding:
            '12px 14px',
          borderRadius: 10,
          background:
            'rgba(2,6,23,.93)',
          color: '#fff',
          boxShadow:
            '0 8px 24px rgba(0,0,0,.25)',
        }}
      >
        <div
          style={{
            fontWeight: 800,
            marginBottom: 7,
          }}
        >
          📍 Live Location
        </div>

        <div
          style={{
            fontSize: 12,
            lineHeight: 1.6,
          }}
        >
          <div>
            <b>Location:</b>{' '}
            {locationName}
          </div>

          <div>
            <b>GPS:</b>{' '}
            {lat.toFixed(5)}, {lng.toFixed(5)}
          </div>

          <div>
            <b>Status:</b>{' '}
            {statusText}
          </div>

          {locationAccuracy !==
            null && (
            <div>
              <b>Accuracy:</b>{' '}
              ±
              {Math.round(
                locationAccuracy
              )}{' '}
              m
            </div>
          )}

          {lastLocationUpdate && (
            <div
              style={{
                opacity: 0.65,
                fontSize: 10,
              }}
            >
              Updated:{' '}
              {lastLocationUpdate.toLocaleTimeString()}
            </div>
          )}
        </div>

        <button
          type="button"
          onClick={() =>
            locateUser(true)
          }
          disabled={
            locationLoading
          }
          style={{
            marginTop: 9,
            width: '100%',
            padding:
              '8px 10px',
            borderRadius: 7,
            border:
              '1px solid rgba(255,255,255,.2)',
            background:
              locationLoading
                ? 'rgba(255,255,255,.04)'
                : 'rgba(255,255,255,.08)',
            color: '#fff',
            cursor:
              locationLoading
                ? 'not-allowed'
                : 'pointer',
            fontWeight: 700,
          }}
        >
          {locationLoading
            ? '📡 Detecting...'
            : '📍 Refresh My Location'}
        </button>

        {locationStatus ===
          'permission-denied' && (
          <div
            style={{
              marginTop: 8,
              padding: 8,
              borderRadius: 6,
              background:
                'rgba(239,68,68,.12)',
              color: '#fca5a5',
              fontSize: 10,
              lineHeight: 1.4,
            }}
          >
            Location is blocked by
            the browser. Click the
            🔒 icon beside the website
            address → Site settings →
            Location → Allow, then
            reload the page.
          </div>
        )}
      </div>

      {/* ======================================================
          SOS CONTROLS
      ====================================================== */}

      <div
        style={{
          position:
            'absolute',
          bottom: 24,
          left: 24,
          zIndex: 1000,
          display: 'flex',
          flexDirection:
            'column',
          gap: 9,
        }}
      >
        <button
          type="button"
          onClick={handleSOS}
          disabled={sosLoading}
          style={{
            width: 86,
            height: 86,
            borderRadius:
              '50%',
            border:
              '4px solid rgba(255,255,255,.75)',
            background:
              sosLoading
                ? '#7f1d1d'
                : '#dc2626',
            color: '#fff',
            fontSize: 23,
            fontWeight: 900,
            cursor:
              sosLoading
                ? 'not-allowed'
                : 'pointer',
            boxShadow:
              '0 8px 30px rgba(220,38,38,.45)',
          }}
          title="Send emergency SOS with current GPS location"
        >
          {sosLoading
            ? '...'
            : 'SOS'}
        </button>

        <button
          type="button"
          onClick={
            callEmergency112
          }
          style={{
            padding:
              '9px 13px',
            borderRadius: 8,
            border: 'none',
            background:
              '#111827',
            color: '#fff',
            fontWeight: 700,
            cursor:
              'pointer',
          }}
        >
          📞 Call 112
        </button>
      </div>

      {/* ======================================================
          SOS RESULT
      ====================================================== */}

      {sosResult && (
        <div
          style={{
            position:
              'absolute',
            right: 14,
            bottom: 14,
            zIndex: 1000,
            width: 310,
            padding: 14,
            borderRadius: 10,
            background:
              'rgba(2,6,23,.94)',
            color: '#fff',
            border:
              `1px solid ${
                sosResult.ok
                  ? 'rgba(34,197,94,.55)'
                  : 'rgba(239,68,68,.55)'
              }`,
          }}
        >
          <div
            style={{
              fontWeight: 800,
              marginBottom: 6,
            }}
          >
            {sosResult.ok
              ? '✅ Emergency Update'
              : '❌ Emergency Update'}
          </div>

          <div
            style={{
              fontSize: 12,
              lineHeight: 1.45,
            }}
          >
            {sosResult.message}
          </div>

          {sosResult.incidentId && (
            <div
              style={{
                marginTop: 6,
                fontSize: 11,
                opacity: 0.8,
              }}
            >
              Incident:{' '}
              {sosResult.incidentId}
            </div>
          )}

          {sosResult.ok &&
            currentIncident && (
              <button
                type="button"
                onClick={
                  handleDispatch
                }
                disabled={
                  dispatchLoading
                }
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: 9,
                  borderRadius: 7,
                  border: 'none',
                  background:
                    '#f97316',
                  color: '#fff',
                  fontWeight: 800,
                  cursor:
                    dispatchLoading
                      ? 'not-allowed'
                      : 'pointer',
                }}
              >
                {dispatchLoading
                  ? 'Dispatching...'
                  : '🚒 Request Rescue / Medical / SDRF'}
              </button>
            )}
        </div>
      )}

      {/* ======================================================
          SIDE PANELS
      ====================================================== */}

      {currentIncident && (
        <IncidentSidePanel
          incident={
            currentIncident
          }
          onClose={
            handleClosePanel
          }
          onDispatch={
            handleDispatch
          }
        />
      )}

      <ParserPanel />

      <FundingPanel
        refreshKey={
          refreshKey
        }
      />

      <VerificationsPanel
        refreshKey={
          refreshKey
        }
      />
    </div>
  );
};

export default MapArea;
