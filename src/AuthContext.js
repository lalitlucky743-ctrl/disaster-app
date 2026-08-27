import React, {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react';
import axios from 'axios';

// ============================================================
// API CONFIG
// ============================================================

const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  'https://disaster-app-uhi7.onrender.com';

// ============================================================
// AXIOS
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
  const [token, setToken] = useState(() => {
    return localStorage.getItem('token');
  });

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ==========================================================
  // AUTH HEADER
  // ==========================================================

  useEffect(() => {
    if (token) {
      api.defaults.headers.common.Authorization = `Bearer ${token}`;
    } else {
      delete api.defaults.headers.common.Authorization;
    }
  }, [token]);

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadProfile = async () => {
      // No token = not logged in
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setLoading(false);
        }
        return;
      }

      setLoading(true);

      try {
        const response = await api.get('/profile');

        if (!cancelled) {
          setUser(response.data);
        }
      } catch (error) {
        console.error(
          '❌ Authentication/profile verification failed:',
          error
        );

        // Token invalid / expired
        localStorage.removeItem('token');

        if (!cancelled) {
          setToken(null);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadProfile();

    return () => {
      cancelled = true;
    };
  }, [token]);

  // ==========================================================
  // LOGIN
  // ==========================================================

  const login = async (username, password) => {
    const cleanUsername = username?.trim();

    if (!cleanUsername) {
      throw new Error('Username is required.');
    }

    if (!password) {
      throw new Error('Password is required.');
    }

    try {
      // FastAPI OAuth2PasswordRequestForm
      const formData = new URLSearchParams();

      formData.append('username', cleanUsername);
      formData.append('password', password);

      const response = await api.post(
        '/login',
        formData,
        {
          headers: {
            'Content-Type':
              'application/x-www-form-urlencoded',
          },
        }
      );

      const accessToken =
        response.data?.access_token;

      if (!accessToken) {
        throw new Error(
          'Server did not return an access token.'
        );
      }

      // Save token
      localStorage.setItem(
        'token',
        accessToken
      );

      // Update state
      setToken(accessToken);

      // Immediately authorize API requests
      api.defaults.headers.common.Authorization =
        `Bearer ${accessToken}`;

      // Fetch actual user profile
      const profileResponse =
        await api.get('/profile');

      setUser(profileResponse.data);

      return true;
    } catch (error) {
      console.error(
        '❌ Login failed:',
        error
      );

      // Make sure failed login never leaves
      // a broken token behind.
      localStorage.removeItem('token');

      setToken(null);
      setUser(null);

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

  const register = async (
    username,
    email,
    password
  ) => {
    const cleanUsername =
      username?.trim();

    const cleanEmail =
      email?.trim().toLowerCase();

    if (!cleanUsername) {
      throw new Error(
        'Username is required.'
      );
    }

    if (!cleanEmail) {
      throw new Error(
        'Email is required.'
      );
    }

    if (!password) {
      throw new Error(
        'Password is required.'
      );
    }

    if (password.length < 6) {
      throw new Error(
        'Password must be at least 6 characters.'
      );
    }

    try {
      await api.post('/register', {
        username: cleanUsername,
        email: cleanEmail,
        password,
      });

      return true;
    } catch (error) {
      console.error(
        '❌ Registration failed:',
        error
      );

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

    delete api.defaults.headers.common.Authorization;

    setToken(null);
    setUser(null);
  };

  // ==========================================================
  // CONTEXT
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
// USE AUTH
// ============================================================

export const useAuth = () => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside an AuthProvider.'
    );
  }

  return context;
};