import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3002';

const api = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Important for sending cookies (session ID)
});

// Optional: Add an interceptor to handle 401 Unauthorized responses globally
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Redirect to login page or trigger logout
      console.log('Unauthorized request, redirecting to login...');
      // window.location.href = '/login'; // Or handle via AuthContext
    }
    return Promise.reject(error);
  }
);

export default api;
