<template>
  <div class="page">
    <header class="page-header">
      <router-link to="/scan" class="back-btn">←</router-link>
      <h1 class="page-title">Bevestiging</h1>
    </header>

    <div v-if="!result" class="empty">Geen scanresultaat. Ga terug en scan opnieuw.</div>

    <div v-else class="confirm-content">

      <div class="confidence-badge" :class="result.parsed?.confidence">
        Zekerheid: {{ confidenceLabel }}
        <span v-if="result.parsed?.confidence !== 'high'"> — controleer de gegevens</span>
      </div>

      <!-- Hoofdgegevens -->
      <div class="card confirm-card">
        <div class="confirm-row">
          <span class="confirm-label">Winkel</span>
          <input v-model="form.store_name" class="input" placeholder="Handmatig invullen" />
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Datum</span>
          <input v-model="form.receipt_date" class="input" type="date" />
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Totaalbedrag</span>
          <div class="amount-input-wrap">
            <span class="euro-sign">€</span>
            <input v-model="form.total_amount" class="input amount-input"
                   type="number" step="0.01" min="0" placeholder="0,00" />
          </div>
        </div>
        <div v-if="form.loyalty_points" class="confirm-row">
          <span class="confirm-label">Punten +</span>
          <span class="confirm-value green">{{ form.loyalty_points.earned }}</span>
        </div>
        <div v-if="form.loyalty_points?.balance" class="confirm-row">
          <span class="confirm-label">Saldo</span>
          <span class="confirm-value">{{ form.loyalty_points.balance }}</span>
        </div>
      </div>

      <!-- Items -->
      <div v-if="form.items.length > 0" class="card items-card">
        <div class="items-header">
          <span class="section-title">Artikelen ({{ form.items.length }})</span>
        </div>
        <div v-for="(item, i) in form.items" :key="i" class="item-row">
          <span class="item-desc">{{ item.description }}</span>
          <span class="item-price">€ {{ fmt(item.line_total) }}</span>
        </div>
      </div>

      <!-- Raw OCR tekst (inklapbaar) -->
      <div class="raw-toggle" @click="showRaw = !showRaw">
        <span>OCR ruwe tekst bekijken</span>
        <span class="toggle-icon">{{ showRaw ? '▲' : '▼' }}</span>
      </div>
      <div v-if="showRaw" class="raw-text card">{{ result.raw_text }}</div>

      <!-- Acties -->
      <div class="confirm-actions">
        <button class="btn btn-primary" @click="save" :disabled="saving">
          {{ saving ? 'Opslaan...' : '✓ Opslaan' }}
        </button>
        <router-link to="/scan" class="btn btn-outline">Opnieuw scannen</router-link>
        <router-link to="/" class="btn btn-outline">Annuleren</router-link>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useReceiptsStore } from '../stores/receipts';

const receipts = useReceiptsStore();
const router = useRouter();
const result = computed(() => receipts.scanResult);
const saving = ref(false);
const error = ref(null);
const showRaw = ref(false);

const form = ref({
  store_name: '',
  receipt_date: '',
  total_amount: '',
  items: [],
  loyalty_points: null
});

onMounted(() => {
  if (!result.value?.parsed) return;
  const p = result.value.parsed;
  form.value.store_name   = p.store_name   || '';
  form.value.receipt_date = p.receipt_date || '';
  form.value.total_amount = p.total_amount != null ? p.total_amount : '';
  form.value.items        = p.items         || [];
  form.value.loyalty_points = p.loyalty_points || null;
  // Open raw text automatically when confidence is low
  if (p.confidence === 'low') showRaw.value = true;
});

const confidenceLabel = computed(() => {
  const map = { high: 'Goed', medium: 'Matig', low: 'Laag' };
  return map[result.value?.parsed?.confidence] || '—';
});

function fmt(n) {
  return parseFloat(n).toFixed(2).replace('.', ',');
}

async function save() {
  saving.value = true;
  error.value = null;
  const payload = {
    store_name:   form.value.store_name || null,
    raw_text:     result.value.raw_text,
    image_path:   result.value.image_path,
    receipt_date: form.value.receipt_date || null,
    total_amount: form.value.total_amount !== '' ? form.value.total_amount : null,
    items:        form.value.items,
    status:       result.value.parsed?.confidence === 'high' ? 'ok' : 'review'
  };
  const saved = await receipts.save(payload);
  saving.value = false;
  if (saved) {
    receipts.scanResult = null;
    router.push('/');
  } else {
    error.value = receipts.error || 'Opslaan mislukt.';
  }
}
</script>

<style scoped>
.back-btn { font-size: 20px; text-decoration: none; color: var(--gray-800); }

.confidence-badge {
  font-size: 13px;
  padding: 8px 14px;
  border-radius: 8px;
  margin-bottom: 14px;
  font-weight: 600;
}
.confidence-badge.high  { background: #dcfce7; color: var(--green); }
.confidence-badge.medium { background: #fef9c3; color: #ca8a04; }
.confidence-badge.low   { background: #fee2e2; color: var(--red); }

.confirm-card { margin-bottom: 12px; }
.confirm-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 0;
  border-bottom: 1px solid var(--gray-100);
}
.confirm-row:last-child { border-bottom: none; }
.confirm-label { font-size: 13px; color: var(--gray-600); min-width: 100px; }
.confirm-value { font-weight: 600; }
.confirm-value.green { color: var(--green); }
.confirm-row .input { flex: 1; padding: 8px 10px; font-size: 14px; }

.amount-input-wrap { display: flex; align-items: center; gap: 6px; flex: 1; }
.euro-sign { font-size: 15px; color: var(--gray-600); }
.amount-input { flex: 1; }

.items-card { margin-bottom: 12px; }
.items-header { margin-bottom: 8px; }
.section-title { font-size: 14px; font-weight: 700; }
.item-row {
  display: flex;
  justify-content: space-between;
  padding: 6px 0;
  font-size: 14px;
  border-bottom: 1px solid var(--gray-100);
}
.item-row:last-child { border-bottom: none; }
.item-desc { color: var(--gray-800); flex: 1; margin-right: 12px; }
.item-price { font-weight: 600; white-space: nowrap; }

.raw-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 13px;
  color: var(--blue);
  cursor: pointer;
  padding: 10px 0;
  margin-bottom: 4px;
  font-weight: 600;
}
.toggle-icon { font-size: 11px; }
.raw-text {
  font-size: 12px;
  font-family: monospace;
  white-space: pre-wrap;
  word-break: break-word;
  color: var(--gray-600);
  max-height: 200px;
  overflow-y: auto;
  margin-bottom: 16px;
}

.confirm-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.empty { color: var(--gray-600); }
</style>
