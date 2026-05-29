<template>
  <div class="page">
    <header class="page-header">
      <router-link to="/scan" class="back-btn">←</router-link>
      <h1 class="page-title">Bevestiging</h1>
    </header>

    <div v-if="!result" class="empty">Geen scanresultaat. Ga terug en scan opnieuw.</div>

    <div v-else class="confirm-content">

      <!-- Preset selector — altijd zichtbaar bovenaan -->
      <div class="preset-bar card">
        <span class="preset-bar-label">Preset</span>

        <template v-if="!showNewPreset">
          <select v-model="activePresetId" class="input preset-select">
            <option v-for="p in presetsStore.list" :key="p.id" :value="p.id">
              {{ p.name }}
            </option>
          </select>
          <button class="new-preset-btn" @click="showNewPreset = true" title="Nieuwe preset aanmaken">+</button>
        </template>

        <template v-else>
          <input v-model="newPresetName" class="input" placeholder="Naam nieuwe preset" autofocus />
          <button class="new-preset-btn save" @click="createPreset" :disabled="!newPresetName.trim()">✓</button>
          <button class="new-preset-btn cancel" @click="showNewPreset = false; newPresetName = ''">✕</button>
        </template>
      </div>

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

      <!-- Items + som-controle -->
      <div v-if="form.items.length > 0" class="card items-card">
        <div class="items-header">
          <span class="section-title">Artikelen ({{ form.items.length }})</span>
        </div>
        <div v-for="(item, i) in form.items" :key="i"
             class="item-row" :class="{ 'is-discount': item.line_total < 0 }">
          <span class="item-desc">{{ item.description }}</span>
          <span class="item-price" :class="{ discount: item.line_total < 0 }">
            {{ item.line_total < 0 ? '−' : '' }} € {{ fmt(Math.abs(item.line_total)) }}
          </span>
        </div>
        <div class="items-sum-row">
          <span>Som artikelen</span>
          <span :class="sumMismatch ? 'sum-mismatch' : 'sum-ok'">€ {{ fmt(Math.abs(itemsSum)) }}</span>
        </div>
      </div>

      <div v-if="sumMismatch" class="sum-warning">
        ⚠ Artikelsom (€ {{ fmt(Math.abs(itemsSum)) }}) komt niet overeen met totaal
        (€ {{ fmt(parseFloat(form.total_amount)) }}) — klopt er een bedrag niet?
      </div>

      <!-- OCR tekst + trainen -->
      <div class="raw-toggle" @click="showRaw = !showRaw">
        <span>OCR tekst {{ showRaw ? 'verbergen' : 'bekijken & trainen' }}</span>
        <span class="toggle-icon">{{ showRaw ? '▲' : '▼' }}</span>
      </div>

      <div v-if="showRaw" class="train-section card">
        <p class="train-hint">
          Tik op een regel om de preset <strong>{{ activePresetName }}</strong> te trainen.
        </p>

        <div
          v-for="(line, i) in ocrLines"
          :key="i"
          class="ocr-line"
          :class="{ selected: selectedLine === i, trained: trainedLines.has(i) }"
          @click="selectLine(i)"
        >
          <span class="line-text">{{ line }}</span>
          <span v-if="trainedLines.has(i)" class="trained-badge">✓</span>
        </div>

        <div v-if="selectedLine !== null" class="mark-menu">
          <p class="mark-label">"{{ ocrLines[selectedLine] }}" markeren als:</p>
          <div class="mark-buttons">
            <button v-for="opt in markOptions" :key="opt.type"
                    class="mark-btn" @click="trainLine(opt.type)">
              {{ opt.label }}
            </button>
            <button class="mark-btn cancel" @click="selectedLine = null">Annuleren</button>
          </div>
          <p v-if="trainFeedback" class="train-feedback" :class="trainFeedbackType">
            {{ trainFeedback }}
          </p>
        </div>
      </div>

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
import { usePresetsStore } from '../stores/presets';
import api from '../api';

const receipts = useReceiptsStore();
const presetsStore = usePresetsStore();
const router = useRouter();
const result = computed(() => receipts.scanResult);
const saving = ref(false);
const error = ref(null);
const showRaw = ref(false);
const showNewPreset = ref(false);
const newPresetName = ref('');
const activePresetId = ref(1);
const selectedLine = ref(null);
const trainedLines = ref(new Set());
const trainFeedback = ref('');
const trainFeedbackType = ref('ok');

const markOptions = [
  { type: 'store_name',      label: '🏪 Winkelnaam' },
  { type: 'total',           label: '💰 Totaalbedrag' },
  { type: 'item',            label: '📦 Artikel' },
  { type: 'loyalty_points',  label: '⭐ Punten verdiend' },
  { type: 'loyalty_balance', label: '⭐ Puntensaldo' },
];

const form = ref({
  store_name: '', receipt_date: '', total_amount: '',
  items: [], loyalty_points: null
});

const ocrLines = computed(() =>
  (result.value?.raw_text || '').split('\n').map(l => l.trim()).filter(Boolean)
);

const itemsSum = computed(() =>
  form.value.items.reduce((s, i) => s + parseFloat(i.line_total || 0), 0)
);

const sumMismatch = computed(() => {
  if (!form.value.total_amount || form.value.items.length === 0) return false;
  return Math.abs(itemsSum.value - parseFloat(form.value.total_amount)) > 0.05;
});

const activePresetName = computed(() =>
  presetsStore.list.find(p => p.id === activePresetId.value)?.name || 'Onbekend'
);

onMounted(async () => {
  // Zorg dat presets altijd geladen zijn
  if (presetsStore.list.length === 0) await presetsStore.fetchAll();

  // Als er helemaal geen presets zijn: toon direct het aanmaken-formulier
  if (presetsStore.list.length === 0) {
    showNewPreset.value = true;
  }

  if (!result.value?.parsed) return;
  const p = result.value.parsed;
  form.value.store_name     = p.store_name   || '';
  form.value.receipt_date   = p.receipt_date || '';
  form.value.total_amount   = p.total_amount != null ? p.total_amount : '';
  form.value.items          = p.items         || [];
  form.value.loyalty_points = p.loyalty_points || null;

  // Gebruik de preset die de parser heeft gedetecteerd, anders de eerste beschikbare
  activePresetId.value = p.preset_id
    || presetsStore.list[0]?.id
    || 1;

  if (p.confidence === 'low') showRaw.value = true;
});

const confidenceLabel = computed(() => {
  const map = { high: 'Goed', medium: 'Matig', low: 'Laag' };
  return map[result.value?.parsed?.confidence] || '—';
});

function fmt(n) {
  return parseFloat(n).toFixed(2).replace('.', ',');
}

async function createPreset() {
  if (!newPresetName.value.trim()) return;
  try {
    const { data } = await api.post('/presets', {
      name: newPresetName.value.trim(),
      config: {
        store_name_keywords: [],
        fields: {
          total_amount: true,
          items: false,
          receipt_date: true,
          loyalty_points: { enabled: false }
        }
      }
    });
    presetsStore.list.push(data);
    activePresetId.value = data.id;
    showNewPreset.value = false;
    newPresetName.value = '';
  } catch {
    error.value = 'Preset aanmaken mislukt.';
  }
}

function selectLine(i) {
  selectedLine.value = selectedLine.value === i ? null : i;
  trainFeedback.value = '';
}

async function trainLine(type) {
  const line = ocrLines.value[selectedLine.value];
  try {
    const { data } = await api.post(`/presets/${activePresetId.value}/train`, { line, type });
    trainedLines.value.add(selectedLine.value);
    trainFeedbackType.value = 'ok';
    const labels = {
      store_name:      `Winkelnaam "${line}" geleerd`,
      total:           `Totaalbedrag-patroon geleerd`,
      item:            `Artikelregels ingeschakeld`,
      loyalty_points:  `Punten regex: ${data.learned?.regex || 'geleerd'}`,
      loyalty_balance: `Saldo regex: ${data.learned?.regex || 'geleerd'}`,
    };
    trainFeedback.value = labels[type] || 'Preset bijgewerkt';
    presetsStore.list = [];
    await presetsStore.fetchAll();
    setTimeout(() => { selectedLine.value = null; trainFeedback.value = ''; }, 2000);
  } catch (err) {
    trainFeedbackType.value = 'err';
    trainFeedback.value = err.response?.data?.error || 'Trainen mislukt.';
  }
}

async function save() {
  saving.value = true;
  error.value = null;
  const payload = {
    store_name:     form.value.store_name || null,
    raw_text:       result.value.raw_text,
    image_path:     result.value.image_path,
    receipt_date:   form.value.receipt_date || null,
    total_amount:   form.value.total_amount !== '' ? form.value.total_amount : null,
    items:          form.value.items,
    loyalty_points: form.value.loyalty_points,
    status:         result.value.parsed?.confidence === 'high' ? 'ok' : 'review'
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

.preset-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 12px;
  padding: 12px 14px;
}
.preset-bar-label { font-size: 13px; font-weight: 700; color: var(--gray-600); white-space: nowrap; }
.preset-select { flex: 1; padding: 8px 10px; font-size: 14px; }
.new-preset-btn {
  flex-shrink: 0;
  width: 32px; height: 32px;
  border: none; border-radius: 8px;
  font-size: 18px; font-weight: 700;
  cursor: pointer; line-height: 1;
  display: flex; align-items: center; justify-content: center;
  background: var(--blue); color: #fff;
}
.new-preset-btn.save { background: var(--green); font-size: 14px; }
.new-preset-btn.cancel { background: var(--gray-200); color: var(--gray-800); font-size: 14px; }
.new-preset-btn:disabled { opacity: .4; cursor: not-allowed; }

.confidence-badge {
  font-size: 13px; padding: 8px 14px; border-radius: 8px;
  margin-bottom: 14px; font-weight: 600;
}
.confidence-badge.high  { background: #dcfce7; color: var(--green); }
.confidence-badge.medium { background: #fef9c3; color: #ca8a04; }
.confidence-badge.low   { background: #fee2e2; color: var(--red); }

.confirm-card { margin-bottom: 12px; }
.confirm-row {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 0; border-bottom: 1px solid var(--gray-100);
}
.confirm-row:last-child { border-bottom: none; }
.confirm-label { font-size: 13px; color: var(--gray-600); min-width: 100px; }
.confirm-value { font-weight: 600; }
.confirm-value.green { color: var(--green); }
.confirm-row .input { flex: 1; padding: 8px 10px; font-size: 14px; }
.amount-input-wrap { display: flex; align-items: center; gap: 6px; flex: 1; }
.euro-sign { font-size: 15px; color: var(--gray-600); }
.amount-input { flex: 1; }

.items-card { margin-bottom: 8px; }
.items-header { margin-bottom: 8px; }
.section-title { font-size: 14px; font-weight: 700; }
.item-row {
  display: flex; justify-content: space-between;
  padding: 6px 0; font-size: 14px;
  border-bottom: 1px solid var(--gray-100);
}
.item-row:last-child { border-bottom: none; }
.item-desc { flex: 1; margin-right: 12px; }
.item-price { font-weight: 600; white-space: nowrap; }
.item-price.discount { color: #6366f1; }
.items-sum-row {
  display: flex; justify-content: space-between;
  padding: 8px 0 0; font-size: 14px; font-weight: 700;
  border-top: 2px solid var(--gray-200); margin-top: 4px;
}
.sum-ok { color: var(--green); }
.sum-mismatch { color: var(--red); }
.sum-warning {
  background: #fef9c3; border: 1px solid #fde68a;
  border-radius: var(--radius); padding: 10px 14px;
  font-size: 13px; font-weight: 600; color: #92400e;
  margin-bottom: 12px;
}

.raw-toggle {
  display: flex; justify-content: space-between; align-items: center;
  font-size: 13px; color: var(--blue); cursor: pointer;
  padding: 10px 0; margin-bottom: 4px; font-weight: 600;
}
.toggle-icon { font-size: 11px; }
.train-section { margin-bottom: 16px; }
.train-hint { font-size: 13px; color: var(--gray-600); margin: 0 0 12px; }

.ocr-line {
  display: flex; justify-content: space-between; align-items: center;
  padding: 8px 10px; border-radius: 8px; cursor: pointer;
  font-size: 13px; font-family: monospace;
  border: 1.5px solid transparent; transition: background .1s;
}
.ocr-line:hover { background: var(--gray-100); }
.ocr-line.selected { background: #eff6ff; border-color: var(--blue); }
.ocr-line.trained { opacity: .6; }
.line-text { flex: 1; word-break: break-all; }
.trained-badge { font-size: 12px; color: var(--green); font-weight: 700; margin-left: 6px; }

.mark-menu {
  background: var(--gray-50); border-radius: var(--radius);
  padding: 12px; margin-top: 8px; border: 1px solid var(--gray-200);
}
.mark-label { font-size: 13px; color: var(--gray-600); margin: 0 0 10px; font-style: italic; }
.mark-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
.mark-btn {
  padding: 7px 12px; border-radius: 8px; border: none;
  background: var(--blue); color: #fff;
  font-size: 13px; font-weight: 600; cursor: pointer;
}
.mark-btn.cancel { background: var(--gray-200); color: var(--gray-800); }
.train-feedback { font-size: 13px; margin: 10px 0 0; font-weight: 600; }
.train-feedback.ok { color: var(--green); }
.train-feedback.err { color: var(--red); }

.confirm-actions { display: flex; flex-direction: column; gap: 10px; margin-top: 8px; }
.empty { color: var(--gray-600); }
</style>
