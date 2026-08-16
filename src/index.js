import React from 'react';
import ReactDOM from 'react-dom/client';
import './App.css';
import App from './App';
import axios from 'axios';

axios.defaults.baseURL = process.env.REACT_APP_API_URL || 'https://disaster-app-30ll.onrender.com';
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);