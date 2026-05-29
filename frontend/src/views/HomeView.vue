<template>
  <div class="page">
    <header class="home-header">
      <h1 class="page-title">Kassabon App</h1>
      <button class="logout-btn" @click="logout" title="Uitloggen">↩</button>
    </header>

    <div class="preset-row">
      <label class="preset-label">Winkel / preset</label>
      <select v-model="selectedPreset" class="input preset-select">
        <option v-for="p in presets.list" :key="p.id" :value="p.id">{{ p.name }}</option>
      </select>
    </div>

    <div class="action-cards">
      <router-link to="/scan" class="action-card primary">
        <span class="action-icon">📷</span>
        <span class="action-label">Bon scannen</span>
      </router-link>
      <router-link to="/scan?mode=upload" class="action-card">
        <span class="action-icon">📁</span>
        <span class="action-label">Afbeelding kiezen</span>
      </router-link>
    </div>

    <section class="recent">
      <h2 class="section-title">Recente bons</h2>

      <div v-if="receipts.loading" class="loading">Laden...</div>

      <div v-else-if="receipts.list.length === 0" class="empty">
        Nog geen bons opgeslagen.
      </div>

      <div v-else class="receipt-list">
        <router-link
          v-for="r in receipts.list"
          :key="r.id"
          :to="`/winkel/${r.store_id}`"
          class="receipt-item card"
        >
          <div class="receipt-store">{{ r.Store?.name || 'Onbekende winkel' }}</div>
          <div class="receipt-meta">
            <span>{{ formatDate(r.receipt_date || r.scan_date) }}</span>
            <span v-if="r.total_amount" class="receipt-amount">€ {{ formatAmount(r.total_amount) }}</span>
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
const receipts = useReceiptsStore();
const presets = usePresetsStore();
const router = useRouter();
const selectedPreset = ref(1);

onMounted(async () => {
  await Promise.all([presets.fetchAll(), receipts.fetchAll()]);
  if (presets.list.length > 0) selectedPreset.value = presets.list[0].id;
});

function logout() {
  auth.logout();
  router.push('/login');
}

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('nl-NL');
}

function formatAmount(a) {
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
.preset-row { margin-bottom: 20px; }
.preset-label { font-size: 13px; color: var(--gray-600); display: block; margin-bottom: 6px; }
.preset-select { margin-top: 0; }

.action-cards {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-bottom: 28px;
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
  color: var(--gray-800);
  background: var(--gray-100);
  border: 2px solid transparent;
  transition: border-color .15s;
}
.action-card.primary {
  background: var(--blue);
  color: #fff;
}
.action-card:hover { border-color: var(--blue); }
.action-icon { font-size: 28px; }
.action-label { font-weight: 600; font-size: 14px; }

.section-title { font-size: 16px; font-weight: 700; margin: 0 0 12px; }
.loading, .empty { color: var(--gray-600); font-size: 14px; }

.receipt-list { display: flex; flex-direction: column; gap: 10px; }
.receipt-item {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: inherit;
  position: relative;
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
