<template>
  <div class="login-shell" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">
    <LanguageToggle />
    <div class="panel login-panel">
      <h1>{{ t('login.title') }}</h1>
      <form @submit.prevent="handleLogin">
        <div class="field">
          <label for="company">{{ t('login.company') }}</label>
          <select id="company" v-model="company" :disabled="optionsLoading" required>
            <option value="" disabled>{{ t('login.selectCompany') }}</option>
            <option v-for="c in companies" :key="c.name" :value="c.name">{{ c.name }}</option>
          </select>
        </div>

        <div class="field">
          <label for="branch">{{ t('login.branch') }}</label>
          <select id="branch" v-model="branch" :disabled="!company" required>
            <option value="" disabled>{{ t('login.selectBranch') }}</option>
            <option v-for="b in branches" :key="b" :value="b">{{ b }}</option>
          </select>
        </div>

        <div class="field">
          <label for="password">{{ t('login.password') }}</label>
          <input
            id="password"
            v-model="password"
            type="password"
            inputmode="numeric"
            autocomplete="current-password"
            required
          />
        </div>

        <button type="submit" class="btn btn-primary btn-block" :disabled="loading || optionsLoading">
          {{ t('login.submit') }}
        </button>
        <p v-if="error" class="error-text">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import api from '@/api/client';
import { locale, t } from '@/i18n';
import LanguageToggle from '@/components/LanguageToggle.vue';

const company = ref('');
const branch = ref('');
const password = ref('');
const companies = ref([]); // [{ name: 'UAE', branches: ['Dubai', ...] }]
const optionsLoading = ref(true);
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

const branches = computed(
  () => companies.value.find((c) => c.name === company.value)?.branches || []
);

// عند تغيير الشركة يُصفَّر الفرع إذا لم يعد ضمن فروعها
watch(company, () => {
  if (!branches.value.includes(branch.value)) branch.value = '';
});

onMounted(async () => {
  try {
    const { data } = await api.get('/auth/options');
    companies.value = data.companies || [];
    if (data.defaultCompany && companies.value.some((c) => c.name === data.defaultCompany)) {
      company.value = data.defaultCompany;
    }
  } catch (err) {
    error.value = t('login.optionsError');
  } finally {
    optionsLoading.value = false;
  }
});

async function handleLogin() {
  error.value = '';
  loading.value = true;
  try {
    await authStore.login({
      company: company.value,
      branch: branch.value,
      password: password.value,
    });
    router.push(roleHome[authStore.role] || '/login');
  } catch (err) {
    error.value = err.response?.data?.error || t('login.error');
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.field select {
  width: 100%;
  font: inherit;
  padding: 0.6rem 0.75rem;
  border: 1px solid #d0d5dd;
  border-radius: 8px;
  background: #fff;
  color: inherit;
}
.field select:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>