import { defineStore } from 'pinia';
import api from '../api';

export const usePresetsStore = defineStore('presets', {
  state: () => ({
    list: [],
    loading: false
  }),
  actions: {
    async fetchAll() {
      if (this.list.length > 0) return;
      this.loading = true;
      try {
        const { data } = await api.get('/presets');
        this.list = data;
      } finally {
        this.loading = false;
      }
    }
  }
});
