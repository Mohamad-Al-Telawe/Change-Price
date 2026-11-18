import { defineStore } from 'pinia';
import apiClient from '@/api/client';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: null,
    user: null,
  }),
  getters: {
    isAuthenticated: (state) => !!state.token,
    role: (state) => state.user?.role || null,
  },
  actions: {
    async login(number) {
      const response = await apiClient.post('/auth/login', { number });
      this.token = response.data.token;
      this.user = response.data.user;
    },
    async fetchMe() {
      if (!this.token) return;
      try {
        const response = await apiClient.get('/auth/me');
        this.user = response.data.user;
      } catch (err) {
        this.logout();
      }
    },
    logout() {
      this.token = null;
      this.user = null;
    },
  },
  persist: true,
});