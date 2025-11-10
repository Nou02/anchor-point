import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  baseURL: '/api', //
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized access
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  login: async (email, password) => {
    const response = await api.post('/login', { email, password });
    return response.data;
  },

  register: async (email, password, displayName) => {
    const response = await api.post('/register', { 
      email, 
      password, 
      display_name: displayName 
    });
    return response.data;
  },

  logout: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  getCurrentUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  setAuthToken: (token) => {
    localStorage.setItem('authToken', token);
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  }
};

// User API calls
export const userAPI = {
  getUser: async (userId) => {
    const response = await api.get(`/users/${userId}`);
    return response.data;
  },

  updateUser: async (userId, userData) => {
    const response = await api.put(`/users/${userId}`, userData);
    return response.data;
  }
};

// Health check
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

// Excel API calls
export const excelAPI = {
  baseURL: '/api/excel',
  addVesselEntry: async (vesselData) => {
    const response = await api.post('/excel/save-report', vesselData);
    return response.data;
  },

  // Update vessel entry in Excel
  updateVesselEntry: async (date, oldVesselName, newData) => {
    const response = await api.put('/excel/update-entry', {
      date,
      vesselName: oldVesselName,
      newData
    });
    return response.data;
  },

  // Delete vessel entry from Excel
  deleteVesselEntry: async (date, vesselName) => {
    const response = await api.delete('/excel/delete-report', {
      data: { date, vesselName }
    });
    return response.data;
  },

  // Get all vessel data
  getVesselsData: async () => {
    const response = await api.get('/excel/vessels-log');
    return response.data;
  }
};

export default api; 