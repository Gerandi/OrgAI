import { createContext, useContext, useState, useEffect } from 'react';
import axios from 'axios';
import api from './api';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatError = (err) => {
    if (!err) return 'An unknown error occurred';
    if (typeof err === 'string') return err;
    if (typeof err === 'object') {
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        if (typeof detail === 'string') return detail;
        if (typeof detail === 'object') return JSON.stringify(detail);
      }
      if (err.message) return err.message;
      return JSON.stringify(err);
    }
    return 'An unexpected error occurred';
  };

  useEffect(() => {
    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
      fetchUser(token);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUser = async (token) => {
    try {
      console.log('Fetching user data with token'); // Added log
      setLoading(true);
      const response = await api.get('/users/me', {
        headers: {
          Authorization: `Bearer ${token}`
        }
      });
      console.log('User data retrieved successfully'); // Added log
      setUser(response.data);
      setError(null);
    } catch (err) {
      setError(formatError(err));
      console.error('Error fetching user:', err); // Added log
      logout();
    } finally {
      setLoading(false);
    }
  };

  const login = async (username, password) => {
    try {
      setLoading(true);
      console.log('Attempting login with username:', username); // Added log
      // For login, we need to use FormData according to the API
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await axios.post('http://localhost:8000/api/v1/auth/login', formData);
      console.log('Login response received:', response.status); // Added log
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);

      // Update axios default headers
      api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
      console.log('Authorization header set, fetching user data'); // Added log

      // Fetch user info with a delay to ensure token is processed
      console.log('About to fetch user info with token'); // Added log
      setTimeout(async () => {
          await fetchUser(access_token);
      }, 500);
      return true;
    } catch (err) {
      setError(formatError(err));
      console.error('Login error:', err); // Added log
      return false;
    } finally {
      setLoading(false);
    }
  };

  const register = async (userData) => {
    try {
      setLoading(true);
      // Use Axios directly with full URL and params object
      await axios.post('http://localhost:8000/api/v1/auth/register', null, {
        params: {
          username: userData.username,
          email: userData.email,
          password: userData.password,
          full_name: userData.full_name
        }
      });
      setError(null);
      return true;
    } catch (err) {
      setError(formatError(err));
      console.error('Registration error:', err); // Added log
      return false;
    } finally {
      setLoading(false);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    delete api.defaults.headers.common['Authorization'];
    setUser(null);
  };

  const value = {
    user,
    loading,
    error,
    isAuthenticated: !!user,
    login,
    register,
    logout
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;