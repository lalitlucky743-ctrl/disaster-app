import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';
import axios from 'axios';

// ============================================================
// API CONFIGURATION
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://disaster-app-30ll.onrender.com';

// ============================================================
// AXIOS DEFAULT CONFIG
// ============================================================

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.timeout = 30000;

// ============================================================
// ROOT
// ============================================================

const root = ReactDOM.createRoot(
  document.getElementById('root')
);

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);