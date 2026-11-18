import axios from 'axios';
import { useAuthStore } from '@/stores/auth';

const apiClient = axios.create({
  // baseURL: 'http://localhost:5000/api/v1',
  baseURL: '/api/v1',
});

apiClient.interceptors.request.use((config) => {
  const authStore = useAuthStore();
  if (authStore.token) {
    config.headers.Authorization = `Bearer ${authStore.token}`;
  }
  return config;
});

export default apiClient;