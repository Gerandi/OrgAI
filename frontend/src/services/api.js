import axios from 'axios';

// Default to localhost:8000 if not specified in env variables
const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

// In a production app, you would use environment variables instead
// const apiUrl = process.env.REACT_APP_API_URL || 'http://localhost:8000/api/v1';

console.log('API is connecting to:', apiUrl);

const api = axios.create({
  baseURL: apiUrl,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 second timeout
});

// Request interceptor for API calls
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for API calls
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    console.error('API Error:', error.message || 'Unknown error');
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received - backend may be down or CORS issue');
      console.error('Request details:', error.request);
    }

    // Handle 401 Unauthorized errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      // Clear all auth data
      localStorage.removeItem('token');
      localStorage.removeItem('userId');
      delete api.defaults.headers.common['Authorization'];

      // Redirect to login page using client-side navigation
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }

    return Promise.reject(error);
  }
);

export default api;