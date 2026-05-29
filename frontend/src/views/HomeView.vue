<template>
  <div class="page">
    <header class="home-header">
      <h1 class="page-title">Kassabon App</h1>
      <button class="logout-btn" @click="logout" title="Uitloggen">↩</button>
    </header>

    <!-- Scan knoppen -->
    <div class="action-cards">
      <router-link :to="`/scan?preset=${selectedPreset}`" class="action-card primary">
        <span class="action-icon">📷</span>
        <span class="action-label">Bon scannen</span>
      </router-link>
      <div class="preset-pick">
        <label class="preset-label">Preset</label>
        <select v-model="selectedPreset" class="input preset-select">
          <option v-for="p in presetsStore.list" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>
      </div>
    </div>

    <!-- Navigatie -->
    <nav class="nav-row">
      <router-link to="/winkels" class="nav-item">
        <span class="nav-icon">🏪</span>
        <span>Winkels</span>
      </router-link>
      <router-link to="/presets" class="nav-item">
        <span class="nav-icon">⚙️</span>
        <span>Presets</span>
      </router-link>
    </nav>

    <!-- Recente bons -->
    <section class="recent">
      <h2 class="section-title">Recente bons</h2>

      <div v-if="receiptsStore.loading" class="loading">Laden...</div>

      <div v-else-if="receiptsStore.list.length === 0" class="empty">
        Nog geen bons. Scan je eerste bon!
      </div>

      <div v-else class="receipt-list">
        <router-link
          v-for="r in receiptsStore.list"
          :key="r.id"
          :to="r.store_id ? `/winkel/${r.store_id}` : '#'"
          class="receipt-item card"
        >
          <div class="receipt-store">{{ r.Store?.name || 'Onbekende winkel' }}</div>
          <div class="receipt-meta">
            <span>{{ formatDate(r.receipt_date || r.scan_date) }}</span>
            <span v-if="r.total_amount" class="receipt-amount">€ {{ fmt(r.total_amount) }}</span>
          </div>
          <span class="receipt-status" :class="r.status">{{ r.status === 'ok' ? '✓' : '?' }}</span>
        </router-link>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useReceiptsStore } from '../stores/receipts';
import { usePresetsStore } from '../stores/presets';

const auth = useAuthStore();
const receiptsStore = useReceiptsStore();
const presetsStore = usePresetsStore();
const router = useRouter();
const selectedPreset = ref(1);

onMounted(async () => {
  await Promise.all([presetsStore.fetchAll(), receiptsStore.fetchAll()]);
  if (presetsStore.list.length > 0) selectedPreset.value = presetsStore.list[0].id;
});

function logout() {
  auth.logout();
  router.push('/login');
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nl-NL');
}

function fmt(a) {
  return parseFloat(a).toFixed(2).replace('.', ',');
}
</script>

<style scoped>
.home-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
.logout-btn {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  padding: 4px;
  color: var(--gray-600);
}

.action-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 16px;
}
.action-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border-radius: var(--radius);
  text-decoration: none;
  color: #fff;
  background: var(--blue);
}
.action-icon { font-size: 28px; }
.action-label { font-weight: 600; font-size: 14px; }

.preset-pick {
  background: var(--gray-100);
  border-radius: var(--radius);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.preset-label { font-size: 12px; color: var(--gray-600); font-weight: 600; }
.preset-select { padding: 8px 10px; font-size: 14px; }

.nav-row {
  display: flex;
  gap: 10px;
  margin-bottom: 24px;
}
.nav-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px;
  border-radius: var(--radius);
  background: var(--gray-100);
  text-decoration: none;
  color: var(--gray-800);
  font-size: 14px;
  font-weight: 600;
  border: 2px solid transparent;
  transition: border-color .15s;
}
.nav-item:hover { border-color: var(--blue); }
.nav-icon { font-size: 18px; }

.section-title { font-size: 16px; font-weight: 700; margin: 0 0 12px; }
.loading, .empty { color: var(--gray-600); font-size: 14px; }

.receipt-list { display: flex; flex-direction: column; gap: 10px; }
.receipt-item {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
}
.receipt-store { font-weight: 600; flex: 1; }
.receipt-meta {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  font-size: 13px;
  color: var(--gray-600);
}
.receipt-amount { font-weight: 600; color: var(--gray-800); }
.receipt-status {
  font-size: 12px;
  padding: 2px 6px;
  border-radius: 6px;
  font-weight: 700;
}
.receipt-status.ok { background: #dcfce7; color: var(--green); }
.receipt-status.review { background: #fef9c3; color: #ca8a04; }
</style>
