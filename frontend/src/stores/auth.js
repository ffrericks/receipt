import { defineStore } from 'pinia';
import api from '../api';

export const useAuthStore = defineStore('auth', {
  state: () => ({
    token: localStorage.getItem('token') || null,
    loading: false,
    error: null
  }),
  getters: {
    isLoggedIn: state => !!state.token
  },
  actions: {
    async login(username, password) {
      this.loading = true;
      this.error = null;
      try {
        const { data } = await api.post('/auth/login', { username, password });
        this.token = data.token;
        localStorage.setItem('token', data.token);
        return true;
      } catch (err) {
        this.error = err.response?.data?.error || 'Inloggen mislukt.';
        return false;
      } finally {
        this.loading = false;
      }
    },
    logout() {
      this.token = null;
      localStorage.removeItem('token');
    }
  }
});
