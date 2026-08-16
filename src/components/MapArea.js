import React, { useState, useEffect } from 'react';
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
// LEAFLET DEFAULT ICON FIX
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

// ============================================================
// CUSTOM MARKER ICONS
// ============================================================

const greenIcon = new L.Icon({
  iconUrl:
    'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',

  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',

  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const blueIcon = new L.Icon({
  iconUrl:
    'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',

  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',

  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const orangeIcon = new L.Icon({
  iconUrl:
    'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',

  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',

  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

const violetIcon = new L.Icon({
  iconUrl:
    'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',

  shadowUrl:
    'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',

  iconSize: [25, 41],
  iconAnchor: [12, 41],
});

// ============================================================
// MAP CLICK HANDLER
// ============================================================

const MapClickHandler = ({ setLat, setLng }) => {
  const map = useMap();

  useEffect(() => {
    const handleMapClick = (e) => {
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
    };

    map.on('click', handleMapClick);

    // Cleanup listener
    return () => {
      map.off('click', handleMapClick);
    };
  }, [map, setLat, setLng]);

  return null;
};

// ============================================================
// MAP AREA
// ============================================================

const MapArea = ({ refreshKey }) => {
  // ==========================================================
  // MAP LOCATION
  // ==========================================================

  const [lat, setLat] = useState(29.5972);
  const [lng, setLng] = useState(79.6591);

  // ==========================================================
  // DATA
  // ==========================================================

  const [incidents, setIncidents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [medical, setMedical] = useState([]);
  const [rescue, setRescue] = useState([]);

  // ==========================================================
  // UI STATE
  // ==========================================================

  const [sosLoading, setSosLoading] = useState(false);
  const [currentIncident, setCurrentIncident] = useState(null);
  const [map, setMap] = useState(null);

  // ==========================================================
  // FETCH MAP DATA
  // ==========================================================

  const fetchData = async () => {
    try {
      const [incidentsRes, volunteersRes] = await Promise.all([
        api.get('/incidents'),
        api.get('/volunteers'),
      ]);

      setIncidents(incidentsRes.data || []);
      setVolunteers(volunteersRes.data || []);
    } catch (error) {
      console.error('Failed to fetch map data:', error);
    }
  };

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  // ==========================================================
  // SOS HANDLER
  // ==========================================================

  const handleSOS = async () => {
    if (sosLoading) return;

    setSosLoading(true);

    // --------------------------------------------------------
    // Geolocation support check
    // --------------------------------------------------------

    if (!navigator.geolocation) {
      alert('Geolocation is not supported by this browser.');
      setSosLoading(false);
      return;
    }

    // --------------------------------------------------------
    // Get current location
    // --------------------------------------------------------

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;

        try {
          // Update map coordinates
          setLat(userLat);
          setLng(userLng);

          // --------------------------------------------------
          // Send SOS to Render backend
          // --------------------------------------------------

          const res = await api.post('/sos', {
            lat: userLat,
            lng: userLng,
            type: 'Earthquake',
          });

          // --------------------------------------------------
          // Backend response
          // --------------------------------------------------

          const incident = res.data?.incident;

          if (incident) {
            setCurrentIncident(incident);

            setIncidents((prev) => [
              ...prev,
              incident,
            ]);
          }

          // --------------------------------------------------
          // Refresh other dashboard components
          // --------------------------------------------------

          window.dispatchEvent(
            new Event('refreshStats')
          );

          // --------------------------------------------------
          // Move map to user's location
          // --------------------------------------------------

          if (map) {
            map.flyTo(
              [userLat, userLng],
              14,
              {
                duration: 1.5,
              }
            );
          }

          alert('🚨 SOS ALERT SENT SUCCESSFULLY!');
        } catch (error) {
          console.error('SOS request failed:', error);

          const message =
            error.response?.data?.detail ||
            error.response?.data?.message ||
            'Unable to send SOS request.';

          alert(`❌ SOS Failed\n\n${message}`);
        } finally {
          setSosLoading(false);
        }
      },

      // --------------------------------------------------------
      // Geolocation error
      // --------------------------------------------------------

      (error) => {
        console.error(
          'Geolocation error:',
          error
        );

        let message =
          'Unable to access your location.';

        if (error.code === 1) {
          message =
            'Please allow location access to use SOS.';
        } else if (error.code === 2) {
          message =
            'Your location could not be determined.';
        } else if (error.code === 3) {
          message =
            'Location request timed out.';
        }

        alert(`📍 ${message}`);

        setSosLoading(false);
      },

      // --------------------------------------------------------
      // Geolocation options
      // --------------------------------------------------------

      {
        enableHighAccuracy: true,
        timeout: 15000,
        maximumAge: 0,
      }
    );
  };

  // ============================================================
  // DISPATCH HANDLER
  // ============================================================

  const handleDispatch = async () => {
    alert('🚨 Dispatching all nearby units!');

    // Backend dispatch endpoint can be connected here later.
  };

  // ============================================================
  // CLOSE INCIDENT PANEL
  // ============================================================

  const handleClosePanel = () => {
    setCurrentIncident(null);
  };

  // ============================================================
  // UI
  // ============================================================

  return (
    <div
      className="map-area"
      style={{
        position: 'relative',
        height: '560px',
        margin: '0 16px',
        borderRadius: '8px',
        overflow: 'hidden',
        border: '1px solid #1e293b',
      }}
    >
      {/* ======================================================
          MAP GLOW
      ====================================================== */}

      <div
        className="map-glow"
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.3,
          background: 'rgba(0,0,0,0.5)',
          zIndex: 999,
          pointerEvents: 'none',
        }}
      />

      {/* ======================================================
          LEAFLET MAP
      ====================================================== */}

      <MapContainer
        center={[lat, lng]}
        zoom={14}
        style={{
          height: '100%',
          width: '100%',
          zIndex: 1,
        }}
        whenReady={(mapInstance) => {
          setMap(mapInstance.target);
        }}
      >
        {/* OpenStreetMap */}
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        />

        {/* Map click */}
        <MapClickHandler
          setLat={setLat}
          setLng={setLng}
        />

        {/* ==================================================
            VOLUNTEERS
        ================================================== */}

        {volunteers
          .filter(
            (v) => v.status === 'AVAILABLE'
          )
          .map((v) => (
            <Marker
              key={v.id}
              position={[v.lat, v.lng]}
              icon={greenIcon}
            >
              <Popup>
                <b>🟢 VOLUNTEER</b>
                <br />
                ID: {v.id}
                <br />
                Name: {v.name}
                <br />
                Dist: {v.dist || '1.2'} km
                <br />
                ETA: {v.eta || 4} min
              </Popup>
            </Marker>
          ))}

        {/* ==================================================
            MEDICAL
        ================================================== */}

        {medical.map((m) => (
          <Marker
            key={m.id}
            position={[m.lat, m.lng]}
            icon={blueIcon}
          >
            <Popup>
              <b>🚑 MEDICAL</b>
              <br />
              ID: {m.id}
              <br />
              Status: {m.status}
            </Popup>
          </Marker>
        ))}

        {/* ==================================================
            RESCUE
        ================================================== */}

        {rescue.map((r) => (
          <Marker
            key={r.id}
            position={[r.lat, r.lng]}
            icon={orangeIcon}
          >
            <Popup>
              <b>🚒 RESCUE</b>
              <br />
              ID: {r.id}
              <br />
              Status: {r.status}
            </Popup>
          </Marker>
        ))}

        {/* ==================================================
            ACTIVE INCIDENTS
        ================================================== */}

        {incidents.map((inc) => (
          <React.Fragment key={inc.id}>
            <Marker
              position={[
                inc.lat,
                inc.lng,
              ]}
            >
              <Popup>
                <b>🔥 {inc.id}</b>
                <br />
                Severity: {inc.severity}
              </Popup>
            </Marker>

            <Circle
              center={[
                inc.lat,
                inc.lng,
              ]}
              radius={
                (inc.radius || 1) * 1000
              }
              pathOptions={{
                color: 'red',
                fillColor: '#ef4444',
                fillOpacity: 0.2,
              }}
            />
          </React.Fragment>
        ))}
      </MapContainer>

      {/* ======================================================
          SOS BUTTON
      ====================================================== */}

      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform:
            'translate(-50%, -50%)',
          zIndex: 1000,
        }}
      >
        <div
          className="sos-circle"
          onClick={handleSOS}
          style={{
            cursor: sosLoading
              ? 'not-allowed'
              : 'pointer',
            position: 'relative',
            opacity: sosLoading ? 0.7 : 1,
          }}
        >
          <span className="sos-text">
            {sosLoading ? '...' : 'SOS'}
          </span>
        </div>
      </div>

      {/* ======================================================
          LAT / LNG DISPLAY
      ====================================================== */}

      <div
        className="latlong"
        style={{
          position: 'absolute',
          top: '56%',
          left: '47%',
          zIndex: 1000,
          background:
            'rgba(0,0,0,0.55)',
          padding: '4px 10px',
          borderRadius: '4px',
          fontSize: '9.5px',
        }}
      >
        Lat: {lat.toFixed(4)}
        <br />
        Lng: {lng.toFixed(4)}
      </div>

      {/* ======================================================
          INCIDENT SIDE PANEL
      ====================================================== */}

      {currentIncident && (
        <IncidentSidePanel
          incident={currentIncident}
          onClose={handleClosePanel}
          onDispatch={handleDispatch}
        />
      )}

      {/* ======================================================
          OTHER PANELS
      ====================================================== */}

      <ParserPanel />

      <FundingPanel
        refreshKey={refreshKey}
      />

      <VerificationsPanel
        refreshKey={refreshKey}
      />
    </div>
  );
};

export default MapArea;