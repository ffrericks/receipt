<template>
  <div class="page">
    <header class="page-header">
      <router-link to="/" class="back-btn">←</router-link>
      <h1 class="page-title">Winkels</h1>
    </header>

    <div v-if="loading" class="loading">Laden...</div>

    <div v-else class="store-list">
      <div v-for="s in stores" :key="s.id" class="card store-item">
        <div class="store-main" @click="openEdit(s)">
          <div class="store-name">{{ s.name }}</div>
          <div class="store-preset">{{ s.Preset?.name || 'Geen preset' }}</div>
        </div>
        <router-link :to="`/winkel/${s.id}`" class="store-link">Bons →</router-link>
      </div>
      <div v-if="stores.length === 0" class="empty">Nog geen winkels. Sla een bon op om te beginnen.</div>
    </div>

    <!-- Bewerken modal -->
    <div v-if="form" class="modal-overlay" @click.self="closeForm">
      <div class="modal card">
        <h2 class="modal-title">Winkel bewerken</h2>

        <label class="field-label">Naam</label>
        <input v-model="form.name" class="input" placeholder="Winkelnaam" />

        <label class="field-label">Preset</label>
        <select v-model="form.preset_id" class="input">
          <option :value="null">— geen preset —</option>
          <option v-for="p in presets" :key="p.id" :value="p.id">{{ p.name }}</option>
        </select>

        <p v-if="saveError" class="error-msg">{{ saveError }}</p>

        <div class="modal-actions">
          <button class="btn btn-primary" @click="save" :disabled="saving">
            {{ saving ? 'Opslaan...' : 'Opslaan' }}
          </button>
          <button class="btn btn-outline" @click="closeForm">Annuleren</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import api from '../api';

const stores = ref([]);
const presets = ref([]);
const loading = ref(true);
const form = ref(null);
const saving = ref(false);
const saveError = ref(null);

onMounted(async () => {
  await load();
});

async function load() {
  loading.value = true;
  try {
    const [storesRes, presetsRes] = await Promise.all([
      api.get('/stores'),
      api.get('/presets')
    ]);
    stores.value = storesRes.data;
    presets.value = presetsRes.data;
  } finally {
    loading.value = false;
  }
}

function openEdit(s) {
  form.value = { id: s.id, name: s.name, preset_id: s.preset_id || null };
  saveError.value = null;
}

function closeForm() {
  form.value = null;
}

async function save() {
  if (!form.value.name.trim()) {
    saveError.value = 'Naam is verplicht.';
    return;
  }
  saving.value = true;
  try {
    await api.put(`/stores/${form.value.id}`, {
      name: form.value.name,
      preset_id: form.value.preset_id
    });
    await load();
    closeForm();
  } catch (err) {
    saveError.value = err.response?.data?.error || 'Opslaan mislukt.';
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.back-btn { font-size: 20px; text-decoration: none; color: var(--gray-800); line-height: 1; }
.store-list { display: flex; flex-direction: column; gap: 10px; }
.store-item { display: flex; align-items: center; gap: 12px; }
.store-main { flex: 1; cursor: pointer; }
.store-name { font-weight: 700; }
.store-preset { font-size: 13px; color: var(--gray-600); margin-top: 2px; }
.store-link {
  font-size: 14px;
  font-weight: 600;
  color: var(--blue);
  text-decoration: none;
  white-space: nowrap;
}
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
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.modal-title { font-size: 18px; font-weight: 700; margin: 0 0 4px; }
.field-label { font-size: 13px; color: var(--gray-600); font-weight: 600; }
.modal-actions { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
</style>
