<template>
  <div class="page">
    <header class="page-header">
      <router-link to="/" class="back-btn">←</router-link>
      <h1 class="page-title">Bon scannen</h1>
    </header>

    <!-- Stap 1: kiezen -->
    <div v-if="!preview && !receipts.scanning">

      <!-- Document scan toggle -->
      <div class="scan-mode-toggle card">
        <div class="toggle-info">
          <span class="toggle-title">Document scan</span>
          <span class="toggle-desc">Puur zwart/wit — betere OCR op thermische bonnen</span>
        </div>
        <label class="switch">
          <input type="checkbox" v-model="documentMode" />
          <span class="slider"></span>
        </label>
      </div>

      <div class="choose-buttons">
        <button class="choose-btn primary" @click="openCamera">
          <span class="choose-icon">📷</span>
          <span>Foto maken</span>
        </button>
        <button class="choose-btn" @click="openGallery">
          <span class="choose-icon">📁</span>
          <span>Uit galerij</span>
        </button>
      </div>

      <input ref="cameraInput" type="file" accept="image/jpeg,image/png"
             capture="environment" style="display:none" @change="onFile" />
      <input ref="galleryInput" type="file" accept="image/jpeg,image/png"
             style="display:none" @change="onFile" />

      <p v-if="receipts.error" class="error-msg">{{ receipts.error }}</p>
    </div>

    <!-- Stap 2: preview -->
    <div v-else-if="preview && !receipts.scanning" class="preview-state">
      <img :src="preview" class="preview-img" alt="Bon preview" />
      <div class="mode-label" :class="documentMode ? 'doc' : 'norm'">
        {{ documentMode ? 'Document scan (zwart/wit)' : 'Normale scan' }}
      </div>
      <div class="preview-actions">
        <button class="btn btn-primary" @click="submitScan">Verwerken →</button>
        <button class="btn btn-outline" @click="resetPreview">Opnieuw kiezen</button>
      </div>
      <p v-if="receipts.error" class="error-msg">{{ receipts.error }}</p>
    </div>

    <!-- Stap 3: OCR bezig -->
    <div v-else-if="receipts.scanning" class="scanning-state">
      <div class="spinner"></div>
      <p>Tekst herkennen... even geduld</p>
      <p class="scanning-sub">Dit duurt ongeveer 10–30 seconden</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useReceiptsStore } from '../stores/receipts';

const receipts = useReceiptsStore();
const router = useRouter();
const route = useRoute();
const cameraInput = ref(null);
const galleryInput = ref(null);
const preview = ref(null);
const selectedFile = ref(null);
const documentMode = ref(true);

function openCamera() { cameraInput.value?.click(); }
function openGallery() { galleryInput.value?.click(); }

function onFile(e) {
  const file = e.target.files[0];
  if (!file) return;
  selectedFile.value = file;
  preview.value = URL.createObjectURL(file);
}

function resetPreview() {
  preview.value = null;
  selectedFile.value = null;
  receipts.error = null;
}

async function submitScan() {
  const presetId = route.query.preset || 1;
  const result = await receipts.scan(selectedFile.value, presetId, documentMode.value);
  if (result) {
    URL.revokeObjectURL(preview.value);
    router.push('/bevestiging');
  }
}
</script>

<style scoped>
.back-btn { font-size: 20px; text-decoration: none; color: var(--gray-800); line-height: 1; }

.scan-mode-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  gap: 12px;
}
.toggle-info { flex: 1; }
.toggle-title { display: block; font-weight: 700; font-size: 15px; }
.toggle-desc { display: block; font-size: 12px; color: var(--gray-600); margin-top: 2px; }

.switch { position: relative; display: inline-block; width: 44px; height: 24px; flex-shrink: 0; }
.switch input { opacity: 0; width: 0; height: 0; }
.slider {
  position: absolute; inset: 0;
  background: var(--gray-200);
  border-radius: 24px;
  transition: background .2s;
  cursor: pointer;
}
.slider::before {
  content: '';
  position: absolute;
  width: 18px; height: 18px;
  left: 3px; top: 3px;
  background: #fff;
  border-radius: 50%;
  transition: transform .2s;
}
input:checked + .slider { background: var(--blue); }
input:checked + .slider::before { transform: translateX(20px); }

.choose-buttons {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
  margin-top: 4px;
}
.choose-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 32px 16px;
  border-radius: var(--radius);
  border: 2px solid var(--gray-200);
  background: var(--gray-100);
  font-size: 15px;
  font-weight: 600;
  cursor: pointer;
  transition: border-color .15s;
  color: var(--gray-800);
}
.choose-btn.primary { background: var(--blue); color: #fff; border-color: var(--blue); }
.choose-btn:hover { border-color: var(--blue); }
.choose-icon { font-size: 32px; }

.preview-state { display: flex; flex-direction: column; gap: 12px; }
.preview-img {
  width: 100%;
  border-radius: var(--radius);
  border: 1px solid var(--gray-200);
  max-height: 55vh;
  object-fit: contain;
  background: var(--gray-100);
}
.mode-label {
  font-size: 12px;
  font-weight: 600;
  padding: 4px 10px;
  border-radius: 6px;
  align-self: flex-start;
}
.mode-label.doc { background: #f0fdf4; color: var(--green); }
.mode-label.norm { background: var(--gray-100); color: var(--gray-600); }
.preview-actions { display: flex; flex-direction: column; gap: 10px; }

.scanning-state { text-align: center; padding: 60px 20px; color: var(--gray-600); }
.scanning-sub { font-size: 13px; margin-top: 4px; }
.spinner {
  width: 44px; height: 44px;
  border: 3px solid var(--gray-200);
  border-top-color: var(--blue);
  border-radius: 50%;
  animation: spin .8s linear infinite;
  margin: 0 auto 20px;
}
@keyframes spin { to { transform: rotate(360deg); } }
</style>
