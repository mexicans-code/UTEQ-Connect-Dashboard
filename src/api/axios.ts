import axios from 'axios';
import { API_URL } from './config';

const api = axios.create({
  baseURL: API_URL,
  timeout: 10000,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.clear();
      window.location.href = '/';
    }
    // Sin respuesta del servidor = error de red o servidor caído
    if (!err.response) {
      err.message = 'No se pudo conectar al servidor. Verifica tu conexión.';
    }
    return Promise.reject(err);
  }
);

export default api;