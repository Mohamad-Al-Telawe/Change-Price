<template>
  <div class="page">
    <TopBar />
    <div class="container container-narrow">
      <p v-if="loading" class="state-text">جارِ التحميل...</p>
      <p v-else-if="loadError" class="error-text">{{ loadError }}</p>

      <div v-else-if="request" class="panel">
        <h1 style="margin-bottom: 18px;">{{ request.material }}</h1>
        <dl class="record">
          <dt>مقدّم الطلب</dt>
          <dd>{{ request.requester?.name }} ({{ request.requester?.number }})</dd>

          <dt>الفرع</dt>
          <dd>{{ request.requester?.branch }}</dd>

          <dt>السعر الحالي</dt>
          <dd>{{ request.current_price }}</dd>

          <dt>السعر المعتمد</dt>
          <dd>{{ request.approved_price }}</dd>

          <dt>ملاحظات</dt>
          <dd>{{ request.notes || '—' }}</dd>
        </dl>

        <button class="btn btn-primary" @click="complete" :disabled="completing">تم التعديل</button>
        <p v-if="completeError" class="error-text">{{ completeError }}</p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import apiClient from '@/api/client';
import TopBar from '@/components/TopBar.vue';

const route = useRoute();
const router = useRouter();

const request = ref(null);
const loading = ref(true);
const loadError = ref('');
const completing = ref(false);
const completeError = ref('');

onMounted(async () => {
  try {
    const response = await apiClient.get('/price-edits');
    request.value = response.data.find((r) => r._id === route.params.id) || null;
    if (!request.value) loadError.value = 'الطلب غير موجود أو تم تنفيذه مسبقًا';
  } catch (err) {
    loadError.value = err.response?.data?.error || 'فشل تحميل الطلب';
  } finally {
    loading.value = false;
  }
});

async function complete() {
  completeError.value = '';
  completing.value = true;
  try {
    await apiClient.patch(`/price-edits/${route.params.id}`);
    router.push('/price-edits');
  } catch (err) {
    completeError.value = err.response?.data?.error || 'فشل تنفيذ العملية';
  } finally {
    completing.value = false;
  }
}
</script>