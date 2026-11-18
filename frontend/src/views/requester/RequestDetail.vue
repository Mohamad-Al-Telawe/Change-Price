<template>
  <div class="page" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">
    <TopBar :brand="t('common.brand')" :logout-label="t('common.logout')">
      <LanguageToggle />
    </TopBar>

    <div class="container container-narrow">
      <p v-if="loading" class="state-text">{{ t('requestDetail.loading') }}</p>
      <p v-else-if="error" class="error-text">{{ error }}</p>

      <div v-else-if="request" class="panel">
        <dl class="record">
          <dt>{{ t('requestDetail.material') }}</dt>
          <dd>{{ request.material }}</dd>

          <dt>{{ t('requestDetail.currentPrice') }}</dt>
          <dd>{{ request.current_price }}</dd>

          <dt>{{ t('requestDetail.requestedPrice') }}</dt>
          <dd>{{ request.requested_price }}</dd>

          <dt>{{ t('requestDetail.approvedPrice') }}</dt>
          <dd>{{ request.approved_price ?? t('requestDetail.none') }}</dd>

          <dt>{{ t('requestDetail.status') }}</dt>
          <dd><span class="mark" :class="statusMark(request.status)">{{ statusLabel(request.status) }}</span></dd>

          <dt>{{ t('requestDetail.stage') }}</dt>
          <dd><span class="mark" :class="stageMark(request.stage)">{{ stageLabel(request.stage) }}</span></dd>

          <dt>{{ t('requestDetail.notes') }}</dt>
          <dd>{{ request.notes || t('requestDetail.none') }}</dd>
        </dl>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import apiClient from '@/api/client';
import { locale, t, statusLabel, stageLabel } from '@/i18n';
import { statusMark, stageMark } from '@/utils/statusMeta';
import TopBar from '@/components/TopBar.vue';
import LanguageToggle from '@/components/LanguageToggle.vue';

const route = useRoute();
const request = ref(null);
const loading = ref(true);
const error = ref('');

onMounted(async () => {
  try {
    const response = await apiClient.get(`/requests/${route.params.id}`);
    request.value = response.data;
  } catch (err) {
    error.value = err.response?.data?.error || t('requestDetail.errorLoad');
  } finally {
    loading.value = false;
  }
});
</script>