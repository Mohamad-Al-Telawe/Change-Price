<template>
  <div class="search-page" dir="rtl" lang="ar">
    <TopBar />

    <main class="search-content">
      <section class="card">
        <div class="card-header">
          <h1 class="title">البحث في الطلبات</h1>
        </div>

        <form class="filters" @submit.prevent="runSearch">
          <MultiSelect v-model="filters.branches" label="الفرع" :options="options.branches" placeholder="كل الفروع" />
          <MultiSelect v-model="filters.companies" label="الشركة" :options="options.companies" placeholder="كل الشركات" />

          <div class="field">
            <label for="f-material">اسم المادة</label>
            <input id="f-material" v-model="filters.material" type="text" placeholder="اسم أو كود المادة" autocomplete="off" />
          </div>

          <div class="field">
            <label>السعر المعتمد</label>
            <div class="pair">
              <input v-model="filters.approvedMin" type="number" step="any" min="0" placeholder="من" />
              <span class="pair-sep">—</span>
              <input v-model="filters.approvedMax" type="number" step="any" min="0" placeholder="إلى" />
            </div>
          </div>

          <div class="field">
            <label>الفترة الزمنية</label>
            <div class="pair">
              <input v-model="filters.dateFrom" type="date" :max="filters.dateTo || undefined" />
              <span class="pair-sep">—</span>
              <input v-model="filters.dateTo" type="date" :min="filters.dateFrom || undefined" />
            </div>
          </div>

          <div class="filter-actions">
            <button type="submit" class="sbtn sbtn-primary" :disabled="loading">بحث</button>
            <button type="button" class="sbtn sbtn-ghost" :disabled="loading" @click="resetFilters">مسح الفلاتر</button>
          </div>
        </form>

        <p v-if="formError" class="form-error">{{ formError }}</p>
      </section>

      <section class="card">
        <div class="card-header">
          <h2 class="title title-sm">النتائج</h2>
          <span v-if="!loading && !error" class="count">{{ total }} طلب</span>
        </div>

        <div v-if="loading" class="state">جارِ التحميل...</div>
        <div v-else-if="error" class="state state-error">{{ error }}</div>
        <div v-else-if="items.length === 0" class="state">لا توجد نتائج مطابقة</div>

        <template v-else>
          <div class="table-wrapper">
            <table class="results-table">
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>الشركة</th>
                  <th>الفرع</th>
                  <th>الطالب</th>
                  <th>السعر الحالي</th>
                  <th>السعر المطلوب</th>
                  <th>السعر المعتمد</th>
                  <th>الحالة</th>
                  <th>المرحلة</th>
                  <th>الملاحظات</th>
                  <th>التاريخ</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="req in items" :key="req._id">
                  <td class="material">{{ req.material }}</td>
                  <td>{{ req.company }}</td>
                  <td>{{ req.branch }}</td>
                  <td>{{ req.requester?.name ?? '—' }}</td>
                  <td>{{ fmtPrice(req.current_price) }}</td>
                  <td>{{ fmtPrice(req.requested_price) }}</td>
                  <td class="approved">{{ fmtPrice(req.approved_price) }}</td>
                  <td>
                    <span class="mark" :class="statusMark(req.status)">{{ STATUS_LABELS[req.status] ?? req.status }}</span>
                  </td>
                  <td>
                    <span class="mark" :class="stageMark(req.stage)">{{ STAGE_LABELS[req.stage] ?? req.stage }}</span>
                  </td>
                  <td class="notes">{{ req.notes || '—' }}</td>
                  <td class="date">{{ fmtDate(req.createdAt) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div v-if="pages > 1" class="pager">
            <button type="button" class="sbtn sbtn-ghost" :disabled="page <= 1" @click="goToPage(page - 1)">السابق</button>
            <span class="pager-info">صفحة {{ page }} من {{ pages }}</span>
            <button type="button" class="sbtn sbtn-ghost" :disabled="page >= pages" @click="goToPage(page + 1)">التالي</button>
          </div>
        </template>
      </section>
    </main>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import apiClient from '@/api/client';
import { statusMark, stageMark } from '@/utils/statusMeta';
import TopBar from '@/components/TopBar.vue';
import MultiSelect from '@/components/MultiSelect.vue';

const PAGE_SIZE = 50;

const STATUS_LABELS = {
  'Under Review': 'قيد المراجعة',
  'Approved': 'مقبول',
  'Approved with Modification': 'مقبول بتعديل',
  'Rejected': 'مرفوض',
};

const STAGE_LABELS = {
  'Received': 'مستلم',
  'Reviewed': 'تمت المراجعة',
  'Pending Execution': 'بانتظار التعديل',
  'Completed': 'مكتمل',
};

const emptyFilters = () => ({
  branches: [],
  companies: [],
  material: '',
  approvedMin: '',
  approvedMax: '',
  dateFrom: '',
  dateTo: '',
});

const filters = reactive(emptyFilters());
const options = reactive({ branches: [], companies: [] });

const items = ref([]);
const total = ref(0);
const page = ref(1);
const pages = ref(1);
const loading = ref(false);
const error = ref('');
const formError = ref('');

let applied = emptyFilters();
let seq = 0;

function validate() {
  formError.value = '';
  const { approvedMin, approvedMax, dateFrom, dateTo } = filters;
  if (approvedMin !== '' && approvedMax !== '' && Number(approvedMin) > Number(approvedMax)) {
    formError.value = 'قيمة "من" في السعر أكبر من قيمة "إلى"';
    return false;
  }
  if (dateFrom && dateTo && dateFrom > dateTo) {
    formError.value = 'تاريخ البداية بعد تاريخ النهاية';
    return false;
  }
  return true;
}

function buildParams(p) {
  const params = { page: p, limit: PAGE_SIZE };
  if (applied.branches.length) params.branches = applied.branches.join(',');
  if (applied.companies.length) params.companies = applied.companies.join(',');
  if (applied.material.trim()) params.material = applied.material.trim();
  if (applied.approvedMin !== '') params.approved_min = applied.approvedMin;
  if (applied.approvedMax !== '') params.approved_max = applied.approvedMax;
  if (applied.dateFrom) params.date_from = applied.dateFrom;
  if (applied.dateTo) params.date_to = applied.dateTo;
  return params;
}

async function fetchPage(p) {
  const current = ++seq;
  loading.value = true;
  error.value = '';
  try {
    const { data } = await apiClient.get('/search/requests', { params: buildParams(p) });
    if (current !== seq) return;
    items.value = data.items;
    total.value = data.total;
    page.value = data.page;
    pages.value = data.pages;
  } catch (err) {
    if (current !== seq) return;
    error.value = err.response?.data?.error || 'فشل تنفيذ البحث';
  } finally {
    if (current === seq) loading.value = false;
  }
}

function runSearch() {
  if (!validate()) return;
  applied = JSON.parse(JSON.stringify(filters));
  fetchPage(1);
}

function goToPage(p) {
  fetchPage(p);
}

function resetFilters() {
  Object.assign(filters, emptyFilters());
  formError.value = '';
  applied = emptyFilters();
  fetchPage(1);
}

async function loadOptions() {
  try {
    const { data } = await apiClient.get('/search/options');
    options.branches = data.branches;
    options.companies = data.companies;
  } catch (err) {
    options.branches = [];
    options.companies = [];
  }
}

const fmtPrice = (n) => (n === null || n === undefined ? '—' : n);
const fmtDate = (d) => (d ? new Date(d).toLocaleDateString('en-GB') : '—');

onMounted(() => {
  loadOptions();
  fetchPage(1);
});
</script>

<style scoped>
.search-page {
  --sp-primary: var(--primary, #2563eb);
  --sp-border: var(--border, #e2e8f0);
  --sp-text: var(--text, #0f172a);
  --sp-muted: var(--text-secondary, #64748b);
  --sp-danger: var(--danger, #dc2626);
  --sp-danger-bg: var(--danger-bg, #fef2f2);
  --sp-success: var(--success, #15803d);
  --sp-success-bg: var(--success-bg, #f0fdf4);
  --sp-warning-bg: var(--warning-bg, #fffbeb);

  min-height: 100vh;
  color: var(--sp-text);
}

.search-content {
  max-width: 1400px;
  margin: 0 auto;
  padding: 24px 20px 48px;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.card {
  background: #ffffff;
  border: 1px solid var(--sp-border);
  border-radius: 14px;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.05);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 18px 22px;
  border-bottom: 1px solid var(--sp-border);
}

.title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
}

.title-sm {
  font-size: 16px;
}

.count {
  padding: 4px 12px;
  border-radius: 999px;
  background: rgba(37, 99, 235, 0.08);
  color: var(--sp-primary);
  font-size: 12px;
  font-weight: 600;
}

/* Filters */

.filters {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
  align-items: end;
  padding: 20px 22px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--sp-muted);
}

.field input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 11px;
  border: 1px solid var(--sp-border);
  border-radius: 8px;
  background: #ffffff;
  color: var(--sp-text);
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.field input:focus {
  border-color: var(--sp-primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.pair {
  display: flex;
  align-items: center;
  gap: 6px;
}

.pair input {
  flex: 1;
  min-width: 0;
}

.pair-sep {
  color: var(--sp-muted);
}

.filter-actions {
  display: flex;
  gap: 8px;
}

.form-error {
  margin: 0;
  padding: 0 22px 16px;
  color: var(--sp-danger);
  font-size: 13px;
}

.sbtn {
  padding: 9px 18px;
  border-radius: 8px;
  border: 1px solid transparent;
  font-family: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.sbtn:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.sbtn-primary {
  background: var(--sp-primary);
  color: #ffffff;
}

.sbtn-primary:hover:not(:disabled) {
  background: #1d4ed8;
}

.sbtn-ghost {
  background: #ffffff;
  border-color: var(--sp-border);
  color: var(--sp-text);
}

.sbtn-ghost:hover:not(:disabled) {
  background: #f1f5f9;
}

/* Results */

.state {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  text-align: center;
  color: var(--sp-muted);
  font-size: 14px;
}

.state-error {
  color: var(--sp-danger);
}

.table-wrapper {
  overflow-x: auto;
}

.results-table {
  width: 100%;
  min-width: 1000px;
  border-collapse: collapse;
  font-size: 13px;
}

.results-table th {
  padding: 12px 14px;
  background: #f8fafc;
  border-bottom: 1px solid var(--sp-border);
  color: var(--sp-muted);
  font-size: 12px;
  font-weight: 600;
  text-align: start;
  white-space: nowrap;
}

.results-table td {
  padding: 11px 14px;
  border-bottom: 1px solid #f1f5f9;
  vertical-align: middle;
}

.results-table tbody tr:hover {
  background: #f8fafc;
}

.material {
  font-weight: 600;
}

.approved {
  font-weight: 700;
}

.notes {
  max-width: 260px;
  color: var(--sp-muted);
}

.date {
  white-space: nowrap;
  color: var(--sp-muted);
}

.pager {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  padding: 16px;
}

.pager-info {
  font-size: 13px;
  color: var(--sp-muted);
}

/* Status / stage pills */

.mark {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 11px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.mark::before {
  content: '';
  width: 6px;
  height: 6px;
  flex: 0 0 6px;
  border-radius: 50%;
  background: currentColor;
}

.mark-success {
  color: var(--sp-success);
  background: var(--sp-success-bg);
}

.mark-danger {
  color: var(--sp-danger);
  background: var(--sp-danger-bg);
}

.mark-info {
  color: var(--sp-primary);
  background: rgba(37, 99, 235, 0.08);
}

.mark-warning {
  color: #b45309;
  background: var(--sp-warning-bg);
}

.mark-neutral {
  color: var(--sp-muted);
  background: #f1f5f9;
}

@media (max-width: 768px) {
  .search-content {
    padding: 16px 12px 40px;
  }
}
</style>