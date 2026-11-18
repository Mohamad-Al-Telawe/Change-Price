<template>
  <div class="page" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">
    <TopBar :brand="t('common.brand')" :logout-label="t('common.logout')">
      <LanguageToggle />
    </TopBar>

    <div class="container container-narrow">
      <h1 style="margin-bottom: 20px;">{{ t('requestForm.title') }}</h1>
      <form class="panel" @submit.prevent="handleSubmit">
        <div class="field">
          <label for="material">{{ t('requestForm.material') }}</label>
          <input id="material" v-model="form.material" type="text" required />
        </div>

        <div class="field">
          <label for="current_price">{{ t('requestForm.currentPrice') }}</label>
          <input id="current_price" v-model.number="form.current_price" type="number" step="0.01" required />
        </div>

        <div class="field">
          <label for="requested_price">{{ t('requestForm.requestedPrice') }}</label>
          <input id="requested_price" v-model.number="form.requested_price" type="number" step="0.01" required />
        </div>

        <div class="field">
          <label for="notes">{{ t('requestForm.notes') }}</label>
          <textarea id="notes" v-model="form.notes"></textarea>
        </div>

        <button type="submit" class="btn btn-primary" :disabled="loading">{{ t('requestForm.submit') }}</button>
        <p v-if="error" class="error-text">{{ error }}</p>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import apiClient from '@/api/client';
import { locale, t } from '@/i18n';
import TopBar from '@/components/TopBar.vue';
import LanguageToggle from '@/components/LanguageToggle.vue';

const router = useRouter();
const loading = ref(false);
const error = ref('');

const form = reactive({
  material: '',
  current_price: null,
  requested_price: null,
  notes: '',
});

async function handleSubmit() {
  error.value = '';
  loading.value = true;
  try {
    const response = await apiClient.post('/requests', form);
    router.push(`/requests/${response.data._id}`);
  } catch (err) {
    error.value = err.response?.data?.error || t('requestForm.errorSubmit');
  } finally {
    loading.value = false;
  }
}
</script>