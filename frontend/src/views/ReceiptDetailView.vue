<template>
  <div class="page">
    <header class="page-header">
      <router-link to="/" class="back-btn">←</router-link>
      <h1 class="page-title">Bon bewerken</h1>
      <button class="delete-btn" @click="confirmDelete" title="Verwijderen">🗑</button>
    </header>

    <div v-if="loading" class="loading">Laden...</div>

    <template v-else>

      <!-- Som-controle waarschuwing -->
      <div v-if="sumMismatch" class="sum-warning">
        ⚠ Artikelsom (€ {{ fmtSum(itemsSum) }}) komt niet overeen met totaal (€ {{ fmtSum(parseFloat(form.total_amount)) }})
        — controleer de artikelen of het totaalbedrag.
      </div>

      <!-- Hoofdgegevens -->
      <div class="card confirm-card">
        <div class="confirm-row">
          <span class="confirm-label">Winkel</span>
          <input v-model="form.store_name" class="input" placeholder="Winkelnaam" />
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
                   type="number" step="0.01" placeholder="0,00" />
          </div>
        </div>
        <div class="confirm-row">
          <span class="confirm-label">Status</span>
          <select v-model="form.status" class="input">
            <option value="ok">✓ Goedgekeurd</option>
            <option value="review">? Controleren</option>
          </select>
        </div>
      </div>

      <!-- Artikelen -->
      <div class="section-header">
        <span class="section-title">Artikelen</span>
        <button class="add-item-btn" @click="addItem">+ Artikel</button>
        <button class="add-item-btn discount" @click="addDiscount">− Korting</button>
      </div>

      <div class="items-list">
        <div v-for="(item, i) in form.items" :key="i"
             class="item-edit-row card"
             :class="{ 'is-discount': item.line_total < 0 }">
          <div class="item-fields">
            <input v-model="item.description" class="input item-desc-input"
                   :placeholder="item.line_total < 0 ? 'Korting' : 'Artikelnaam'" />
            <div class="item-price-wrap">
              <span class="euro-sign">{{ item.line_total < 0 ? '−' : '€' }}</span>
              <input v-model="item.line_total" class="input item-price-input"
                     type="number" step="0.01" placeholder="0,00" />
            </div>
          </div>
          <button class="remove-item-btn" @click="removeItem(i)">✕</button>
        </div>

        <div v-if="form.items.length > 0" class="items-sum-row">
          <span>Som artikelen</span>
          <span :class="sumMismatch ? 'sum-mismatch' : 'sum-ok'">
            € {{ fmtSum(itemsSum) }}
          </span>
        </div>
      </div>

      <!-- Opslaan -->
      <div class="confirm-actions">
        <button class="btn btn-primary" @click="save" :disabled="saving">
          {{ saving ? 'Opslaan...' : '✓ Wijzigingen opslaan' }}
        </button>
        <router-link to="/" class="btn btn-outline">Annuleren</router-link>
      </div>

      <p v-if="error" class="error-msg">{{ error }}</p>
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import api from '../api';

const route = useRoute();
const router = useRouter();
const loading = ref(true);
const saving = ref(false);
const error = ref(null);

const form = ref({
  store_name: '', receipt_date: '', total_amount: '',
  status: 'ok', items: []
});

onMounted(async () => {
  try {
    const { data } = await api.get(`/receipts/${route.params.id}`);
    form.value.store_name   = data.Store?.name || '';
    form.value.receipt_date = data.receipt_date || '';
    form.value.total_amount = data.total_amount || '';
    form.value.status       = data.status || 'ok';
    form.value.items        = (data.items || []).map(i => ({ ...i }));
  } catch {
    error.value = 'Bon laden mislukt.';
  } finally {
    loading.value = false;
  }
});

const itemsSum = computed(() =>
  form.value.items.reduce((s, i) => s + parseFloat(i.line_total || 0), 0)
);

const sumMismatch = computed(() => {
  if (!form.value.total_amount || form.value.items.length === 0) return false;
  const diff = Math.abs(itemsSum.value - parseFloat(form.value.total_amount));
  return diff > 0.05;
});

function fmtSum(n) {
  return (Math.abs(n)).toFixed(2).replace('.', ',');
}

function addItem() {
  form.value.items.push({ description: '', line_total: 0, category: null });
}

function addDiscount() {
  form.value.items.push({ description: 'Korting', line_total: -0, category: 'Korting' });
}

function removeItem(i) {
  form.value.items.splice(i, 1);
}

async function save() {
  saving.value = true;
  error.value = null;
  try {
    await api.put(`/receipts/${route.params.id}`, {
      store_name:   form.value.store_name || null,
      receipt_date: form.value.receipt_date || null,
      total_amount: form.value.total_amount || null,
      status:       form.value.status,
      items:        form.value.items
    });
    router.push('/');
  } catch {
    error.value = 'Opslaan mislukt.';
  } finally {
    saving.value = false;
  }
}

async function confirmDelete() {
  if (!confirm('Bon verwijderen? Dit kan niet ongedaan worden.')) return;
  try {
    await api.delete(`/receipts/${route.params.id}`);
    router.push('/');
  } catch {
    error.value = 'Verwijderen mislukt.';
  }
}
</script>

<style scoped>
.back-btn { font-size: 20px; text-decoration: none; color: var(--gray-800); line-height: 1; }
.delete-btn {
  margin-left: auto; background: none; border: none;
  font-size: 20px; cursor: pointer; color: var(--red);
}

.sum-warning {
  background: #fef9c3; border: 1px solid #fde68a;
  border-radius: var(--radius); padding: 12px 14px;
  font-size: 13px; font-weight: 600; color: #92400e;
  margin-bottom: 12px;
}

.confirm-card { margin-bottom: 16px; }
.confirm-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0; border-bottom: 1px solid var(--gray-100);
}
.confirm-row:last-child { border-bottom: none; }
.confirm-label { font-size: 13px; color: var(--gray-600); min-width: 100px; }
.confirm-row .input { flex: 1; padding: 8px 10px; font-size: 14px; }
.amount-input-wrap { display: flex; align-items: center; gap: 6px; flex: 1; }
.euro-sign { font-size: 15px; color: var(--gray-600); }
.amount-input { flex: 1; }

.section-header {
  display: flex; align-items: center; gap: 8px; margin-bottom: 10px;
}
.section-title { font-size: 15px; font-weight: 700; flex: 1; }
.add-item-btn {
  padding: 6px 12px; border-radius: 8px; border: none;
  background: var(--blue); color: #fff;
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.add-item-btn.discount { background: #6366f1; }

.items-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.item-edit-row {
  display: flex; align-items: center; gap: 8px; padding: 10px 12px;
}
.item-edit-row.is-discount { background: #fdf4ff; border-color: #e9d5ff; }
.item-fields { display: flex; flex-direction: column; gap: 6px; flex: 1; }
.item-desc-input { font-size: 14px; padding: 7px 10px; }
.item-price-wrap { display: flex; align-items: center; gap: 6px; }
.item-price-input { width: 90px; font-size: 14px; padding: 7px 10px; }
.remove-item-btn {
  background: none; border: none; color: var(--gray-600);
  font-size: 16px; cursor: pointer; padding: 4px; flex-shrink: 0;
}

.items-sum-row {
  display: flex; justify-content: space-between;
  padding: 8px 12px; font-size: 14px; font-weight: 600;
  background: var(--gray-100); border-radius: var(--radius);
}
.sum-ok { color: var(--green); }
.sum-mismatch { color: var(--red); }

.confirm-actions { display: flex; flex-direction: column; gap: 10px; }
.loading { color: var(--gray-600); font-size: 14px; }
</style>
