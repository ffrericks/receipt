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

    <!-- Puntensaldi -->
    <section v-if="storesWithPoints.length > 0" class="points-section">
      <h2 class="section-title">Punten</h2>
      <div class="points-row">
        <router-link
          v-for="s in storesWithPoints"
          :key="s.id"
          :to="`/winkel/${s.id}`"
          class="points-badge"
        >
          <span class="points-store">{{ s.name }}</span>
          <span class="points-value">{{ s.points_balance }}</span>
          <span class="points-unit">pt</span>
        </router-link>
      </div>
    </section>

    <!-- Navigatie -->
    <nav class="nav-row">
      <router-link to="/winkels" class="nav-item">
        <span class="nav-icon">🏪</span>
        <span>Winkels</span>
      </router-link>
      <router-link to="/statistieken" class="nav-item">
        <span class="nav-icon">📊</span>
        <span>Statistieken</span>
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
        <div
          v-for="r in receiptsStore.list"
          :key="r.id"
          class="receipt-item card"
        >
          <router-link :to="`/bon/${r.id}`" class="receipt-edit-link" title="Bewerken">✎</router-link>
          <div class="receipt-store">{{ r.Store?.name || 'Onbekende winkel' }}</div>
          <div class="receipt-meta">
            <span>{{ formatDate(r.receipt_date || r.scan_date) }}</span>
            <span v-if="r.total_amount" class="receipt-amount">€ {{ fmt(r.total_amount) }}</span>
          </div>
          <span class="receipt-status" :class="r.status">{{ r.status === 'ok' ? '✓' : '?' }}</span>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup>
import { onMounted, ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { useReceiptsStore } from '../stores/receipts';
import { usePresetsStore } from '../stores/presets';
import api from '../api';

const auth = useAuthStore();
const receiptsStore = useReceiptsStore();
const presetsStore = usePresetsStore();
const router = useRouter();
const selectedPreset = ref(1);
const allStores = ref([]);

const storesWithPoints = computed(() =>
  allStores.value.filter(s => s.points_balance != null)
);

onMounted(async () => {
  const [, , storesRes] = await Promise.all([
    presetsStore.fetchAll(),
    receiptsStore.fetchAll(),
    api.get('/stores')
  ]);
  allStores.value = storesRes.data;
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

.points-section { margin-bottom: 16px; }
.points-row { display: flex; gap: 10px; flex-wrap: wrap; }
.points-badge {
  display: flex;
  align-items: baseline;
  gap: 5px;
  background: #eff6ff;
  border: 1.5px solid #bfdbfe;
  border-radius: var(--radius);
  padding: 10px 14px;
  text-decoration: none;
  color: var(--blue);
}
.points-store { font-size: 13px; font-weight: 600; }
.points-value { font-size: 20px; font-weight: 700; }
.points-unit { font-size: 12px; color: #60a5fa; }

.nav-row {
  display: flex;
  gap: 8px;
  margin-bottom: 24px;
}
.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 10px 6px;
  border-radius: var(--radius);
  background: var(--gray-100);
  text-decoration: none;
  color: var(--gray-800);
  font-size: 12px;
  font-weight: 600;
  border: 2px solid transparent;
  transition: border-color .15s;
}
.nav-item:hover { border-color: var(--blue); }
.nav-icon { font-size: 20px; }

.section-title { font-size: 16px; font-weight: 700; margin: 0 0 12px; }
.loading, .empty { color: var(--gray-600); font-size: 14px; }

.receipt-list { display: flex; flex-direction: column; gap: 10px; }
.receipt-item {
  display: flex;
  align-items: center;
  gap: 12px;
  color: inherit;
}
.receipt-edit-link {
  font-size: 16px;
  color: var(--gray-600);
  text-decoration: none;
  flex-shrink: 0;
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
