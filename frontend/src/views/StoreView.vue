<template>
  <div class="page">
    <header class="page-header">
      <router-link to="/winkels" class="back-btn">←</router-link>
      <h1 class="page-title">{{ store?.name || 'Winkel' }}</h1>
    </header>

    <div v-if="loading" class="loading">Laden...</div>

    <template v-else>
      <!-- Statistieken -->
      <div class="stats-row">
        <div class="stat-card">
          <span class="stat-value">{{ stats.count }}</span>
          <span class="stat-label">bons</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">€ {{ fmt(stats.total) }}</span>
          <span class="stat-label">totaal uitgegeven</span>
        </div>
        <div class="stat-card">
          <span class="stat-value">{{ formatDate(stats.last_scan) }}</span>
          <span class="stat-label">laatste bon</span>
        </div>
      </div>

      <div class="tabs">
        <button
          v-for="tab in visibleTabs"
          :key="tab.key"
          class="tab"
          :class="{ active: activeTab === tab.key }"
          @click="activeTab = tab.key"
        >
          {{ tab.label }}
        </button>
      </div>

      <!-- Bons tab -->
      <div v-if="activeTab === 'bons'" class="receipt-list">
        <div v-for="r in receipts" :key="r.id" class="card receipt-item">
          <div class="receipt-left">
            <div class="receipt-date">{{ formatDate(r.receipt_date || r.scan_date) }}</div>
            <span class="receipt-status" :class="r.status">{{ r.status === 'ok' ? '✓' : '?' }}</span>
          </div>
          <div v-if="r.total_amount" class="receipt-amount">€ {{ fmt(r.total_amount) }}</div>
        </div>
        <div v-if="receipts.length === 0" class="empty">Geen bons voor deze winkel.</div>
      </div>

      <!-- Items tab -->
      <div v-else-if="activeTab === 'items'" class="items-list">
        <div v-for="item in allItems" :key="item.id" class="card item-row">
          <div class="item-left">
            <div class="item-desc">{{ item.description }}</div>
            <div v-if="item.category" class="item-cat">{{ item.category }}</div>
          </div>
          <div class="item-right">
            <div class="item-price">€ {{ fmt(item.line_total) }}</div>
            <div class="item-date">{{ formatDate(item.receipt_date) }}</div>
          </div>
        </div>
        <div v-if="allItems.length === 0" class="empty">Geen artikelregels opgeslagen.</div>
      </div>

      <!-- Punten tab -->
      <div v-else-if="activeTab === 'punten'" class="points-list">
        <div v-if="latestBalance !== null" class="points-balance-banner">
          Huidig saldo: <strong>{{ latestBalance }} punten</strong>
        </div>
        <div v-for="p in points" :key="p.id" class="card points-item">
          <div class="points-date">{{ formatDate(p.scan_date) }}</div>
          <div class="points-detail">
            <span class="points-earned">+{{ p.points_earned }}</span>
            <span class="points-balance">Saldo: {{ p.points_balance }}</span>
          </div>
        </div>
        <div v-if="points.length === 0" class="empty">Geen puntenhistorie.</div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import api from '../api';

const route = useRoute();
const store = ref(null);
const stats = ref({ count: 0, total: 0, last_scan: null });
const receipts = ref([]);
const allItems = ref([]);
const points = ref([]);
const loading = ref(true);
const activeTab = ref('bons');

const visibleTabs = computed(() => {
  const tabs = [{ key: 'bons', label: 'Bons' }];
  if (allItems.value.length > 0) tabs.push({ key: 'items', label: 'Artikelen' });
  if (points.value.length > 0) tabs.push({ key: 'punten', label: 'Punten' });
  return tabs;
});

const latestBalance = computed(() => {
  if (!points.value.length) return null;
  return points.value[0].points_balance;
});

onMounted(async () => {
  const id = route.params.id;
  try {
    const [storeRes, statsRes, receiptsRes, pointsRes] = await Promise.all([
      api.get(`/stores/${id}`),
      api.get(`/stores/${id}/stats`),
      api.get(`/stores/${id}/receipts`),
      api.get(`/stores/${id}/points`)
    ]);
    store.value = storeRes.data;
    stats.value = statsRes.data;
    receipts.value = receiptsRes.data;
    points.value = pointsRes.data;

    // Collect all items from all receipts
    const itemsRes = await Promise.all(
      receiptsRes.data.map(r => api.get(`/receipts/${r.id}`))
    );
    allItems.value = itemsRes.flatMap(r =>
      (r.data.items || []).map(i => ({ ...i, receipt_date: r.data.receipt_date || r.data.scan_date }))
    );
  } finally {
    loading.value = false;
  }
});

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nl-NL');
}

function fmt(n) {
  if (n == null) return '—';
  return parseFloat(n).toFixed(2).replace('.', ',');
}
</script>

<style scoped>
.back-btn { font-size: 20px; text-decoration: none; color: var(--gray-800); line-height: 1; }

.stats-row {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 8px;
  margin-bottom: 20px;
}
.stat-card {
  background: var(--gray-100);
  border-radius: var(--radius);
  padding: 12px 8px;
  text-align: center;
  display: flex;
  flex-direction: column;
  gap: 2px;
}
.stat-value { font-size: 16px; font-weight: 700; }
.stat-label { font-size: 11px; color: var(--gray-600); }

.tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 16px;
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

.receipt-list, .items-list, .points-list { display: flex; flex-direction: column; gap: 10px; }

.receipt-item { display: flex; justify-content: space-between; align-items: center; }
.receipt-left { display: flex; align-items: center; gap: 8px; }
.receipt-date { font-size: 14px; color: var(--gray-600); }
.receipt-amount { font-weight: 700; }
.receipt-status {
  font-size: 11px;
  padding: 2px 5px;
  border-radius: 5px;
  font-weight: 700;
}
.receipt-status.ok { background: #dcfce7; color: var(--green); }
.receipt-status.review { background: #fef9c3; color: #ca8a04; }

.item-row { display: flex; justify-content: space-between; align-items: flex-start; }
.item-left { flex: 1; margin-right: 12px; }
.item-desc { font-size: 14px; font-weight: 600; }
.item-cat { font-size: 12px; color: var(--gray-600); margin-top: 2px; }
.item-right { text-align: right; }
.item-price { font-weight: 700; font-size: 14px; }
.item-date { font-size: 12px; color: var(--gray-600); }

.points-balance-banner {
  background: #eff6ff;
  color: var(--blue);
  border-radius: var(--radius);
  padding: 12px 16px;
  font-size: 15px;
  margin-bottom: 4px;
}
.points-item { display: flex; justify-content: space-between; align-items: center; }
.points-date { font-size: 14px; color: var(--gray-600); }
.points-detail { display: flex; flex-direction: column; align-items: flex-end; font-size: 13px; gap: 2px; }
.points-earned { font-weight: 700; color: var(--green); }
.points-balance { color: var(--gray-600); }
.loading, .empty { color: var(--gray-600); font-size: 14px; }
</style>
