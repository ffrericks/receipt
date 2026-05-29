<template>
  <div class="page">
    <header class="page-header">
      <router-link to="/" class="back-btn">←</router-link>
      <h1 class="page-title">Statistieken</h1>
    </header>

    <div v-if="loading" class="loading">Laden...</div>

    <template v-else>

      <!-- Uitgaven per maand -->
      <section class="section">
        <h2 class="section-title">Uitgaven per maand</h2>
        <div v-if="monthly.length === 0" class="empty">Nog geen data.</div>
        <div v-else class="month-list">
          <div v-for="m in monthly" :key="m.month" class="month-row">
            <div class="month-label">{{ formatMonth(m.month) }}</div>
            <div class="month-bar-wrap">
              <div class="month-bar" :style="{ width: barWidth(m.total) + '%' }"></div>
            </div>
            <div class="month-total">€ {{ fmt(m.total) }}</div>
            <div class="month-count">{{ m.receipts }} bon{{ m.receipts !== 1 ? 's' : '' }}</div>
          </div>
        </div>
      </section>

      <!-- Per winkel totaal -->
      <section class="section">
        <h2 class="section-title">Per winkel</h2>
        <div v-if="byStore.length === 0" class="empty">Nog geen data.</div>
        <div v-else class="store-list">
          <router-link
            v-for="s in byStore"
            :key="s.store_id"
            :to="`/winkel/${s.store_id}`"
            class="card store-stat-row"
          >
            <div class="store-stat-name">{{ s.store_name || 'Onbekend' }}</div>
            <div class="store-stat-right">
              <span class="store-stat-total">€ {{ fmt(s.total) }}</span>
              <span class="store-stat-count">{{ s.count }} bons</span>
            </div>
          </router-link>
        </div>
      </section>

    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import api from '../api';

const loading = ref(true);
const monthly = ref([]);
const byStore = ref([]);

onMounted(async () => {
  try {
    const { data } = await api.get('/stats');
    monthly.value = data.monthly;
    byStore.value = data.by_store;
  } finally {
    loading.value = false;
  }
});

const maxTotal = computed(() => Math.max(...monthly.value.map(m => m.total), 1));

function barWidth(total) {
  return Math.round((total / maxTotal.value) * 100);
}

function formatMonth(ym) {
  if (!ym) return '—';
  const [y, m] = ym.split('-');
  const d = new Date(parseInt(y), parseInt(m) - 1, 1);
  return d.toLocaleDateString('nl-NL', { month: 'long', year: 'numeric' });
}

function fmt(n) {
  return parseFloat(n || 0).toFixed(2).replace('.', ',');
}
</script>

<style scoped>
.back-btn { font-size: 20px; text-decoration: none; color: var(--gray-800); line-height: 1; }
.section { margin-bottom: 28px; }
.section-title { font-size: 16px; font-weight: 700; margin: 0 0 12px; }
.loading, .empty { color: var(--gray-600); font-size: 14px; }

.month-list { display: flex; flex-direction: column; gap: 10px; }
.month-row { display: grid; grid-template-columns: 80px 1fr 70px 50px; align-items: center; gap: 8px; }
.month-label { font-size: 13px; color: var(--gray-600); }
.month-bar-wrap { background: var(--gray-100); border-radius: 4px; height: 8px; overflow: hidden; }
.month-bar { height: 100%; background: var(--blue); border-radius: 4px; transition: width .3s; }
.month-total { font-size: 14px; font-weight: 700; text-align: right; }
.month-count { font-size: 12px; color: var(--gray-600); text-align: right; }

.store-list { display: flex; flex-direction: column; gap: 10px; }
.store-stat-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  text-decoration: none;
  color: inherit;
}
.store-stat-name { font-weight: 600; }
.store-stat-right { display: flex; flex-direction: column; align-items: flex-end; gap: 2px; }
.store-stat-total { font-weight: 700; font-size: 15px; }
.store-stat-count { font-size: 12px; color: var(--gray-600); }
</style>
