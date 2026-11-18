<template>
  <div class="page">
    <TopBar />
    <div class="container">
      <div class="page-header">
        <h1>نظرة عامة</h1>
      </div>

      <p v-if="loading" class="state-text">جارِ التحميل...</p>
      <p v-else-if="error" class="error-text">{{ error }}</p>

      <div v-else class="panel panel-flush stat-row">
        <div v-for="(stat, i) in statList" :key="stat.key" class="stat-tile stamp-in" :style="{ '--i': i }">
          <span class="num">{{ stat.value }}</span>
          <span class="label">{{ stat.label }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import apiClient from '@/api/client';
import TopBar from '@/components/TopBar.vue';

const stats = ref({});
const loading = ref(true);
const error = ref('');

const statList = computed(() => [
  { key: 'total', label: 'الإجمالي', value: stats.value.total },
  { key: 'pendingReview', label: 'قيد المراجعة', value: stats.value.pendingReview },
  { key: 'approved', label: 'مقبول', value: stats.value.approved },
  { key: 'pendingExecution', label: 'بانتظار التعديل', value: stats.value.pendingExecution },
  { key: 'completed', label: 'مكتمل', value: stats.value.completed },
  { key: 'rejected', label: 'مرفوض', value: stats.value.rejected },
]);

onMounted(async () => {
  try {
    const response = await apiClient.get('/admin/overview');
    stats.value = response.data;
  } catch (err) {
    error.value = err.response?.data?.error || 'فشل تحميل البيانات';
  } finally {
    loading.value = false;
  }
});
</script>