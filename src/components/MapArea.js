import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Circle, Marker, Popup, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import axios from 'axios';
import L from 'leaflet';
import IncidentSidePanel from './IncidentSidePanel';
import ParserPanel from './ParserPanel';
import FundingPanel from './FundingPanel';
import VerificationsPanel from './VerificationsPanel';

// Fix Leaflet default icon
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

// Custom marker icons
const greenIcon = new L.Icon({ iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const blueIcon = new L.Icon({ iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const orangeIcon = new L.Icon({ iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });
const violetIcon = new L.Icon({ iconUrl: 'https://cdn.rawgit.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png', shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png', iconSize: [25, 41], iconAnchor: [12, 41] });

const MapArea = ({ refreshKey }) => {
  // ✅ CHANGED: Default coordinates to Almora, Uttarakhand, India
  const [lat, setLat] = useState(29.5972); 
  const [lng, setLng] = useState(79.6591);
  
  const [incidents, setIncidents] = useState([]);
  const [sosLoading, setSosLoading] = useState(false);
  const [currentIncident, setCurrentIncident] = useState(null); // For Side Panel
  const [map, setMap] = useState(null);
  const [volunteers, setVolunteers] = useState([]);
  const [medical, setMedical] = useState([]);
  const [rescue, setRescue] = useState([]);

  const fetchData = () => {
    axios.get('http://localhost:8000/incidents').then(res => setIncidents(res.data));
    axios.get('http://localhost:8000/volunteers').then(res => setVolunteers(res.data));
    // medical & rescue fetch - assuming endpoints exist
  };

  useEffect(() => {
    fetchData();
  }, [refreshKey]);

  const handleSOS = async () => {
    if (sosLoading) return;
    setSosLoading(true);
    try {
      // 1. Get geolocation from browser
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(async (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          setLat(userLat);
          setLng(userLng);

          // 2. Call Backend SOS endpoint
          const res = await axios.post('http://localhost:8000/sos', {
            lat: userLat,
            lng: userLng,
            type: 'Earthquake'
          });
          
          // 3. Update UI
          setCurrentIncident(res.data.incident);
          setIncidents(prev => [...prev, res.data.incident]);
          window.dispatchEvent(new Event('refreshStats')); // Update stats
          
          // Update map center
          if (map) {
            map.flyTo([userLat, userLng], 14);
          }
          setSosLoading(false);
        }, (error) => {
          alert('Please allow location access to use SOS.');
          setSosLoading(false);
        });
      } else {
        alert('Geolocation not supported');
        setSosLoading(false);
      }
    } catch (e) {
      console.error(e);
      alert('SOS Failed');
      setSosLoading(false);
    }
  };

  const handleDispatch = async () => {
    alert('🚨 Dispatching all nearby units!');
    // In real app, call backend /dispatch endpoint
  };

  const handleClosePanel = () => setCurrentIncident(null);

  // Map click handler to update coords
  const MapClickHandler = () => {
    const map = useMap();
    map.on('click', (e) => {
      setLat(e.latlng.lat);
      setLng(e.latlng.lng);
    });
    return null;
  };

  return (
    <div className="map-area" style={{ position: 'relative', height: '560px', margin: '0 16px', borderRadius: '8px', overflow: 'hidden', border: '1px solid #1e293b' }}>
      <div className="map-glow" style={{ position: 'absolute', inset: 0, opacity: 0.3, background: 'rgba(0,0,0,0.5)', zIndex: 999, pointerEvents: 'none' }}></div>
      
      <MapContainer center={[lat, lng]} zoom={14} style={{ height: '100%', width: '100%', zIndex: 1 }} whenReady={(mapInstance) => setMap(mapInstance.target)}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>' />
        <MapClickHandler />
        
        {/* Markers: Volunteers (🟢 Green) */}
        {volunteers.filter(v => v.status === 'AVAILABLE').map((v) => (
          <Marker key={v.id} position={[v.lat, v.lng]} icon={greenIcon}>
            <Popup>
              <b>🟢 VOLUNTEER</b><br/>ID: {v.id}<br/>Name: {v.name}<br/>Dist: {v.dist || '1.2'} km<br/>ETA: {v.eta || 4} min
            </Popup>
          </Marker>
        ))}

        {/* Markers: Medical (🔵 Blue) */}
        {medical.map((m) => (
          <Marker key={m.id} position={[m.lat, m.lng]} icon={blueIcon}>
            <Popup><b>🚑 MEDICAL</b><br/>ID: {m.id}<br/>Status: {m.status}</Popup>
          </Marker>
        ))}

        {/* Markers: Rescue (🟠 Orange) */}
        {rescue.map((r) => (
          <Marker key={r.id} position={[r.lat, r.lng]} icon={orangeIcon}>
            <Popup><b>🚒 RESCUE</b><br/>ID: {r.id}<br/>Status: {r.status}</Popup>
          </Marker>
        ))}

        {/* Active Incident markers */}
        {incidents.map((inc) => (
          <React.Fragment key={inc.id}>
            <Marker position={[inc.lat, inc.lng]}>
              <Popup><b>🔥 {inc.id}</b><br/>Severity: {inc.severity}</Popup>
            </Marker>
            <Circle center={[inc.lat, inc.lng]} radius={inc.radius * 1000} pathOptions={{ color: 'red', fillColor: '#ef4444', fillOpacity: 0.2 }} />
          </React.Fragment>
        ))}
      </MapContainer>

      {/* --- OVERLAY UI --- */}
      {/* SOS Button */}
      <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 1000 }}>
        <div className="sos-circle" onClick={handleSOS} style={{ cursor: 'pointer', position: 'relative' }}>
          <span className="sos-text">{sosLoading ? '...' : 'SOS'}</span>
        </div>
      </div>

      {/* Lat/Long Display - Ab Almora ke coordinates dikhayega */}
      <div className="latlong" style={{ position: 'absolute', top: '56%', left: '47%', zIndex: 1000, background: 'rgba(0,0,0,0.55)', padding: '4px 10px', borderRadius: '4px', fontSize: '9.5px' }}>
        Lat: {lat.toFixed(4)}<br/>Lng: {lng.toFixed(4)}
      </div>

      {/* Right Side Panel - Only when incident active */}
      {currentIncident && (
        <IncidentSidePanel 
          incident={currentIncident} 
          onClose={handleClosePanel} 
          onDispatch={handleDispatch} 
        />
      )}

      <ParserPanel />
      <FundingPanel />
      <VerificationsPanel refreshKey={refreshKey} />
    </div>
  );
};

export default MapArea;