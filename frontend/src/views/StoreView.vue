<template>
  <div class="page">
    <header class="page-header">
      <router-link to="/" class="back-btn">←</router-link>
      <h1 class="page-title">{{ storeName }}</h1>
    </header>

    <div class="tabs">
      <button
        v-for="tab in tabs"
        :key="tab.key"
        class="tab"
        :class="{ active: activeTab === tab.key }"
        @click="activeTab = tab.key"
      >
        {{ tab.label }}
      </button>
    </div>

    <div v-if="loading" class="loading">Laden...</div>

    <div v-else-if="activeTab === 'bons'" class="receipt-list">
      <div v-for="r in receipts" :key="r.id" class="card receipt-item">
        <div class="receipt-date">{{ formatDate(r.receipt_date || r.scan_date) }}</div>
        <div v-if="r.total_amount" class="receipt-amount">€ {{ formatAmount(r.total_amount) }}</div>
      </div>
      <div v-if="receipts.length === 0" class="empty">Geen bons voor deze winkel.</div>
    </div>

    <div v-else-if="activeTab === 'punten'" class="points-list">
      <div v-for="p in points" :key="p.id" class="card points-item">
        <div class="points-date">{{ formatDate(p.scan_date) }}</div>
        <div class="points-detail">
          <span>+{{ p.points_earned }} punten</span>
          <span class="points-balance">Saldo: {{ p.points_balance }}</span>
        </div>
      </div>
      <div v-if="points.length === 0" class="empty">Geen puntenhistorie.</div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';

const route = useRoute();
const storeName = ref('Winkel');
const activeTab = ref('bons');
const receipts = ref([]);
const points = ref([]);
const loading = ref(true);

const tabs = [
  { key: 'bons', label: 'Bons' },
  { key: 'punten', label: 'Punten' }
];

onMounted(async () => {
  const id = route.params.id;
  try {
    const [storeRes, receiptsRes, pointsRes] = await Promise.all([
      api.get('/stores').then(r => r.data.find(s => s.id == id)),
      api.get(`/stores/${id}/receipts`),
      api.get(`/stores/${id}/points`)
    ]);
    if (storeRes) storeName.value = storeRes.name;
    receipts.value = receiptsRes.data;
    points.value = pointsRes.data;
  } finally {
    loading.value = false;
  }
});

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nl-NL');
}
function formatAmount(a) {
  return parseFloat(a).toFixed(2).replace('.', ',');
}
</script>

<style scoped>
.back-btn { font-size: 20px; text-decoration: none; color: var(--gray-800); }
.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 20px;
  background: var(--gray-100);
  padding: 4px;
  border-radius: var(--radius);
}
.tab {
  flex: 1;
  padding: 8px;
  border: none;
  background: none;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
  color: var(--gray-600);
}
.tab.active { background: #fff; color: var(--blue); box-shadow: var(--shadow); }
.receipt-list, .points-list { display: flex; flex-direction: column; gap: 10px; }
.receipt-item, .points-item { display: flex; justify-content: space-between; align-items: center; }
.receipt-date, .points-date { font-size: 14px; color: var(--gray-600); }
.receipt-amount { font-weight: 700; }
.points-detail { display: flex; flex-direction: column; align-items: flex-end; font-size: 13px; gap: 2px; }
.points-balance { color: var(--gray-600); }
.loading, .empty { color: var(--gray-600); font-size: 14px; }
</style>
