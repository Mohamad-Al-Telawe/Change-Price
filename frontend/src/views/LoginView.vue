<template>
  <div class="login-shell" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">
    <LanguageToggle />
    <div class="panel login-panel">
      <h1>{{ t('login.title') }}</h1>
      <form @submit.prevent="handleLogin">
        <div class="field">
          <label for="number">{{ t('login.number') }}</label>
          <input id="number" v-model="number" type="number" required />
        </div>
        <button type="submit" class="btn btn-primary btn-block" :disabled="loading">{{ t('login.submit') }}</button>
        <p v-if="error" class="error-text">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { locale, t } from '@/i18n';
import LanguageToggle from '@/components/LanguageToggle.vue';

const number = ref('');
const error = ref('');
const loading = ref(false);
const router = useRouter();
const authStore = useAuthStore();

const roleHome = {
  requester: '/requests',
  approver: '/approvals',
  price_editor: '/price-edits',
  admin: '/admin',
};

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await authStore.login(Number(number.value));
    router.push(roleHome[authStore.role] || '/login');
  } catch (err) {
    error.value = err.response?.data?.error || t('login.error');
  } finally {
    loading.value = false;
  }
}
</script>