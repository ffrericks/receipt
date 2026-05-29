<template>
  <div class="page">
    <header class="page-header">
      <router-link to="/" class="back-btn">←</router-link>
      <h1 class="page-title">Presets</h1>
      <button class="add-btn" @click="openNew">+</button>
    </header>

    <div v-if="loading" class="loading">Laden...</div>

    <div v-else class="preset-list">
      <div v-for="p in presets" :key="p.id" class="card preset-item" @click="openEdit(p)">
        <div class="preset-name">{{ p.name }}</div>
        <div class="preset-meta">
          <span v-if="p.config?.store_name_keywords?.length" class="keywords">
            {{ p.config.store_name_keywords.join(', ') }}
          </span>
          <span v-else class="keywords muted">Geen keywords</span>
        </div>
        <span class="chevron">›</span>
      </div>
      <div v-if="presets.length === 0" class="empty">Nog geen presets.</div>
    </div>

    <!-- Formulier (nieuw + bewerken) -->
    <div v-if="form" class="modal-overlay" @click.self="closeForm">
      <div class="modal card">
        <h2 class="modal-title">{{ form.id ? 'Preset bewerken' : 'Nieuwe preset' }}</h2>

        <label class="field-label">Naam</label>
        <input v-model="form.name" class="input" placeholder="bijv. Supermarkt" />

        <label class="field-label">
          Keywords <span class="field-hint">(komma-gescheiden, voor winkeldetectie)</span>
        </label>
        <input v-model="keywordsInput" class="input"
               placeholder="bijv. albert, heijn, ah" />

        <div class="toggle-row">
          <label class="toggle-label">Datum opslaan</label>
          <input type="checkbox" v-model="form.config.fields.receipt_date" />
        </div>
        <div class="toggle-row">
          <label class="toggle-label">Totaalbedrag opslaan</label>
          <input type="checkbox" v-model="form.config.fields.total_amount" />
        </div>
        <div class="toggle-row">
          <label class="toggle-label">Artikelregels opslaan</label>
          <input type="checkbox" v-model="form.config.fields.items" />
        </div>
        <div class="toggle-row">
          <label class="toggle-label">Loyaliteitspunten</label>
          <input type="checkbox" v-model="form.config.fields.loyalty_points.enabled" />
        </div>

        <div v-if="form.config.fields.loyalty_points.enabled" class="loyalty-fields">
          <label class="field-label">Regex punten verdiend</label>
          <input v-model="form.config.fields.loyalty_points.regex" class="input mono"
                 placeholder='punten[\:\s]+(\d+)' />
          <label class="field-label">Regex puntensaldo</label>
          <input v-model="form.config.fields.loyalty_points.balance_regex" class="input mono"
                 placeholder='saldo[\:\s]+(\d+)' />
        </div>

        <p v-if="saveError" class="error-msg">{{ saveError }}</p>

        <div class="modal-actions">
          <button class="btn btn-primary" @click="savePreset" :disabled="saving">
            {{ saving ? 'Opslaan...' : 'Opslaan' }}
          </button>
          <button v-if="form.id" class="btn btn-danger" @click="deletePreset" :disabled="saving">
            Verwijderen
          </button>
          <button class="btn btn-outline" @click="closeForm">Annuleren</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, computed } from 'vue';
import api from '../api';

const presets = ref([]);
const loading = ref(true);
const form = ref(null);
const keywordsInput = ref('');
const saving = ref(false);
const saveError = ref(null);

onMounted(async () => {
  await load();
});

async function load() {
  loading.value = true;
  try {
    const { data } = await api.get('/presets');
    presets.value = data;
  } finally {
    loading.value = false;
  }
}

function makeEmptyConfig() {
  return {
    store_name_keywords: [],
    fields: {
      receipt_date: true,
      total_amount: true,
      items: false,
      loyalty_points: { enabled: false, regex: '', balance_regex: '' }
    }
  };
}

function openNew() {
  form.value = { name: '', config: makeEmptyConfig() };
  keywordsInput.value = '';
  saveError.value = null;
}

function openEdit(p) {
  const config = JSON.parse(JSON.stringify(p.config));
  if (!config.fields.loyalty_points) {
    config.fields.loyalty_points = { enabled: false, regex: '', balance_regex: '' };
  }
  form.value = { id: p.id, name: p.name, config };
  keywordsInput.value = (config.store_name_keywords || []).join(', ');
  saveError.value = null;
}

function closeForm() {
  form.value = null;
}

async function savePreset() {
  saveError.value = null;
  if (!form.value.name.trim()) {
    saveError.value = 'Naam is verplicht.';
    return;
  }
  saving.value = true;
  form.value.config.store_name_keywords = keywordsInput.value
    .split(',')
    .map(k => k.trim())
    .filter(Boolean);

  try {
    if (form.value.id) {
      await api.put(`/presets/${form.value.id}`, {
        name: form.value.name,
        config: form.value.config
      });
    } else {
      await api.post('/presets', {
        name: form.value.name,
        config: form.value.config
      });
    }
    await load();
    closeForm();
  } catch (err) {
    saveError.value = err.response?.data?.error || 'Opslaan mislukt.';
  } finally {
    saving.value = false;
  }
}

async function deletePreset() {
  if (!confirm(`Preset "${form.value.name}" verwijderen?`)) return;
  saving.value = true;
  try {
    await api.delete(`/presets/${form.value.id}`);
    await load();
    closeForm();
  } catch (err) {
    saveError.value = err.response?.data?.error || 'Verwijderen mislukt.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.back-btn { font-size: 20px; text-decoration: none; color: var(--gray-800); line-height: 1; }
.add-btn {
  margin-left: auto;
  font-size: 24px;
  background: none;
  border: none;
  color: var(--blue);
  cursor: pointer;
  line-height: 1;
  padding: 0 4px;
}

.preset-list { display: flex; flex-direction: column; gap: 10px; }
.preset-item {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}
.preset-name { font-weight: 700; flex: 1; }
.keywords { font-size: 13px; color: var(--gray-600); }
.keywords.muted { font-style: italic; }
.chevron { font-size: 20px; color: var(--gray-600); }
.loading, .empty { color: var(--gray-600); font-size: 14px; }

.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,.4);
  display: flex;
  align-items: flex-end;
  z-index: 100;
}
.modal {
  width: 100%;
  max-width: 480px;
  margin: 0 auto;
  border-radius: 16px 16px 0 0;
  padding: 24px 20px 32px;
  max-height: 90vh;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.modal-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.field-label { font-size: 13px; color: var(--gray-600); font-weight: 600; }
.field-hint { font-weight: 400; }
.toggle-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 6px 0;
  border-bottom: 1px solid var(--gray-100);
}
.toggle-label { font-size: 14px; }
.loyalty-fields { display: flex; flex-direction: column; gap: 8px; padding: 8px 0 4px; }
.mono { font-family: monospace; font-size: 13px; }
.modal-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
</style>
