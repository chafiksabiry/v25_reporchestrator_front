import axios from 'axios';

// Assessment endpoints (auth token, contact-center, vertex, speechToText,
// language-assessment) all live on the reps wizard backend, so prefer
// VITE_REP_API_URL. VITE_REP_API_URL already ends with /api.
const API_URL =
  import.meta.env.VITE_REP_API_URL ||
  import.meta.env.VITE_API_URL ||
  '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json' //json
  }
});

const apiMultipart = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'multipart/form-data'
  }
});

api.interceptors.request.use(config => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;
export { apiMultipart };