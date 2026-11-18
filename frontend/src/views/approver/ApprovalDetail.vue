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

          <dt>السعر المطلوب</dt>
          <dd>{{ request.requested_price }}</dd>

          <dt>ملاحظات مقدّم الطلب</dt>
          <dd>{{ request.notes || '—' }}</dd>
        </dl>

        <form @submit.prevent="submitDecision">
          <div class="radio-group">
            <label><input type="radio" v-model="decision" value="approve" /> قبول بالسعر المطلوب</label>
            <label><input type="radio" v-model="decision" value="modify" /> قبول مع تعديل السعر</label>
            <label><input type="radio" v-model="decision" value="reject" /> رفض</label>
          </div>

          <div v-if="decision === 'modify'" class="field">
            <label for="approved_price">السعر المعتمد</label>
            <input id="approved_price" v-model.number="approvedPrice" type="number" step="0.01" required />
          </div>

          <div class="field">
            <label for="notes">ملاحظات (اختياري)</label>
            <textarea id="notes" v-model="notes"></textarea>
          </div>

          <button type="submit" class="btn btn-primary" :disabled="!decision || submitting">إرسال القرار</button>
          <p v-if="submitError" class="error-text">{{ submitError }}</p>
        </form>
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

const decision = ref('');
const approvedPrice = ref(null);
const notes = ref('');
const submitting = ref(false);
const submitError = ref('');

onMounted(async () => {
  try {
    const response = await apiClient.get('/approvals');
    request.value = response.data.find((r) => r._id === route.params.id) || null;
    if (!request.value) loadError.value = 'الطلب غير موجود أو تم البت فيه مسبقًا';
  } catch (err) {
    loadError.value = err.response?.data?.error || 'فشل تحميل الطلب';
  } finally {
    loading.value = false;
  }
});

async function submitDecision() {
  submitError.value = '';
  submitting.value = true;
  try {
    const payload = { decision: decision.value, notes: notes.value || undefined };
    if (decision.value === 'modify') payload.approved_price = approvedPrice.value;
    await apiClient.patch(`/approvals/${route.params.id}`, payload);
    router.push('/approvals');
  } catch (err) {
    submitError.value = err.response?.data?.error || 'فشل إرسال القرار';
  } finally {
    submitting.value = false;
  }
}
</script>