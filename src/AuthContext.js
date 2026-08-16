import React, {
  createContext,
  useState,
  useContext,
  useEffect,
} from 'react';
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
  timeout: 30000,
});

// ============================================================
// AUTH CONTEXT
// ============================================================

const AuthContext = createContext(null);

// ============================================================
// AUTH PROVIDER
// ============================================================

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);

  const [token, setToken] = useState(() =>
    localStorage.getItem('token')
  );

  const [loading, setLoading] = useState(true);

  // ==========================================================
  // SET AUTHORIZATION HEADER
  // ==========================================================

  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common['Authorization'];
    }
  }, [token]);

  // ==========================================================
  // FETCH CURRENT USER PROFILE
  // ==========================================================

  useEffect(() => {
    const fetchProfile = async () => {
      if (!token) {
        setUser(null);
        setLoading(false);
        return;
      }

      try {
        const res = await api.get('/profile');

        setUser(res.data);
      } catch (error) {
        console.error('Profile fetch failed:', error);

        // Invalid/expired token
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [token]);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = async (username, password) => {
    try {
      const formData = new FormData();

      formData.append('username', username);
      formData.append('password', password);

      const res = await api.post('/login', formData);

      const { access_token } = res.data;

      if (!access_token) {
        throw new Error('No access token received from server.');
      }

      // Save token
      localStorage.setItem('token', access_token);

      // Update React state
      setToken(access_token);

      // Set Authorization immediately
      api.defaults.headers.common[
        'Authorization'
      ] = `Bearer ${access_token}`;

      return true;
    } catch (error) {
      console.error('Login failed:', error);

      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Login failed. Please try again.';

      throw new Error(message);
    }
  };

  // ==========================================================
  // REGISTER
  // ==========================================================

  const register = async (username, email, password) => {
    try {
      await api.post('/register', {
        username,
        email,
        password,
      });

      return true;
    } catch (error) {
      console.error('Registration failed:', error);

      const message =
        error.response?.data?.detail ||
        error.response?.data?.message ||
        error.message ||
        'Registration failed. Please try again.';

      throw new Error(message);
    }
  };

  // ==========================================================
  // LOGOUT
  // ==========================================================

  const logout = () => {
    localStorage.removeItem('token');

    delete api.defaults.headers.common['Authorization'];

    setToken(null);
    setUser(null);
  };

  // ==========================================================
  // AUTH CONTEXT VALUE
  // ==========================================================

  const value = {
    user,
    token,
    loading,
    login,
    register,
    logout,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

// ============================================================
// USE AUTH HOOK
// ============================================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside an AuthProvider'
    );
  }

  return context;
};