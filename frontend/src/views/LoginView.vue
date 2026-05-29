<template>
  <div class="login-page">
    <div class="login-box">
      <div class="login-logo">🧾</div>
      <h1 class="login-title">Kassabon App</h1>
      <p class="login-sub">Log in om door te gaan</p>

      <form @submit.prevent="submit" class="login-form">
        <input
          v-model="username"
          class="input"
          type="text"
          placeholder="Gebruikersnaam"
          autocomplete="username"
          required
        />
        <input
          v-model="password"
          class="input"
          type="password"
          placeholder="Wachtwoord"
          autocomplete="current-password"
          required
        />
        <p v-if="auth.error" class="error-msg">{{ auth.error }}</p>
        <button class="btn btn-primary" type="submit" :disabled="auth.loading">
          {{ auth.loading ? 'Bezig...' : 'Inloggen' }}
        </button>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const auth = useAuthStore();
const router = useRouter();
const username = ref('');
const password = ref('');

async function submit() {
  const ok = await auth.login(username.value, password.value);
  if (ok) router.push('/');
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  background: var(--gray-50);
}
.login-box {
  width: 100%;
  max-width: 360px;
  background: #fff;
  border-radius: 16px;
  padding: 32px 24px;
  box-shadow: 0 4px 24px rgba(0,0,0,.08);
}
.login-logo {
  font-size: 48px;
  text-align: center;
  margin-bottom: 8px;
}
.login-title {
  font-size: 24px;
  font-weight: 700;
  text-align: center;
  margin: 0 0 4px;
}
.login-sub {
  text-align: center;
  color: var(--gray-600);
  font-size: 14px;
  margin: 0 0 24px;
}
.login-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
</style>
