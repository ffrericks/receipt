import { defineStore } from 'pinia';
import api from '../api';

export const useReceiptsStore = defineStore('receipts', {
  state: () => ({
    list: [],
    total: 0,
    loading: false,
    scanning: false,
    scanResult: null,
    error: null
  }),
  actions: {
    async fetchAll(page = 1) {
      this.loading = true;
      try {
        const { data } = await api.get(`/receipts?page=${page}`);
        this.list = data.receipts;
        this.total = data.total;
      } catch (err) {
        this.error = err.response?.data?.error || 'Laden mislukt.';
      } finally {
        this.loading = false;
      }
    },
    async scan(file, presetId, documentMode = true) {
      this.scanning = true;
      this.scanResult = null;
      this.error = null;
      try {
        const form = new FormData();
        form.append('image', file);
        form.append('preset_id', presetId);
        form.append('scan_mode', documentMode ? 'document' : 'normal');
        const { data } = await api.post('/receipts/scan', form);
        this.scanResult = data;
        return data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Scannen mislukt.';
        return null;
      } finally {
        this.scanning = false;
      }
    },
    async save(payload) {
      try {
        const { data } = await api.post('/receipts', payload);
        this.list.unshift(data);
        return data;
      } catch (err) {
        this.error = err.response?.data?.error || 'Opslaan mislukt.';
        return null;
      }
    }
  }
});
