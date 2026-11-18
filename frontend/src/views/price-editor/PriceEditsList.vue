<template>
  <div class="page-container" dir="rtl" lang="ar">
    <TopBar />

    <div class="page-content">
      <div class="section">
        <div class="section-card">
          <div class="section-header">
            <h1 class="section-title">طلبات بانتظار التعديل</h1>
          </div>

          <div v-if="loading" class="table-state">جارِ التحميل...</div>
          <div v-else-if="error" class="table-state error">{{ error }}</div>
          <div v-else-if="edits.length === 0" class="table-state empty">لا توجد طلبات بانتظار التعديل</div>

          <div v-else>
            <div class="company-tabs">
              <button v-for="tab in companyTabs" :key="tab.value" type="button" class="company-tab"
                :class="{ active: selectedCompany === tab.value }" @click="selectedCompany = tab.value">
                {{ tab.label }}<span class="tab-count">({{ companyCounts[tab.value] ?? 0 }})</span>
              </button>
            </div>

            <div v-if="filteredEdits.length === 0" class="table-state empty">
              لا توجد طلبات لهذه الشركة
            </div>

            <template v-else>
              <div class="requests-table-wrapper">
                <table class="requests-table">
                  <thead>
                    <tr>
                      <th class="photo-col">الصورة</th>
                      <th>المادة</th>
                      <th>السعر الحالي</th>
                      <th>السعر المعتمد</th>
                      <th>مقدّم الطلب</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(req, i) in filteredEdits" :key="req._id" class="stamp-in" :style="{ '--i': i }">
                      <td class="photo-col">
                        <img v-if="photoUrls[materialCode(req)]" :src="photoUrls[materialCode(req)]" :alt="req.material"
                          class="material-photo" />
                        <div v-else class="material-photo placeholder">—</div>
                      </td>
                      <td>{{ req.material }}</td>
                      <td class="current-price">{{ req.current_price }}</td>
                      <td class="approved-price">{{ req.approved_price }}</td>
                      <td>{{ req.requester?.name }}</td>
                      <td>
                        <button type="button" class="complete-price-btn" @click="completeEdit(req._id)"
                          :disabled="completingId === req._id || completingAll">
                          إتمام تعديل السعر
                        </button>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div class="table-actions">
                <button type="button" class="export-btn" @click="exportXlsx">
                  تصدير Excel
                </button>
                <button type="button" class="complete-price-btn" @click="completeAll"
                  :disabled="completingAll || completingId !== null">
                  {{ completingAll ? 'جارِ التعديل...' : `تعديل السعر للكل (${filteredEdits.length})` }}
                </button>
              </div>
            </template>
          </div>

          <p v-if="completeError" class="table-state error">{{ completeError }}</p>
        </div>
      </div>

      <div class="section">
        <div class="section-card">
          <div class="section-header">
            <h2 class="section-title">المواد التي تم تعديل سعرها ولم تتعدل في الواقع بالكامل بعد</h2>
          </div>

          <div v-if="trackingLoading" class="table-state">جارِ التحميل...</div>
          <div v-else-if="trackingError" class="table-state error">{{ trackingError }}</div>
          <div v-else-if="tracking.length === 0" class="table-state empty">لا توجد مواد بانتظار تأكيد الأفرع</div>

          <div v-else class="modified-items">
            <div v-for="item in tracking" :key="item._id" class="modified-item"
              :class="{ 'is-expanded': expandedId === item._id }">
              <div class="modified-item-header" @click="toggleExpand(item._id)">
                <div class="item-main">
                  <img v-if="photoUrls[materialCode(item)]" :src="photoUrls[materialCode(item)]" :alt="item.material"
                    class="material-photo" />
                  <div v-else class="material-photo placeholder">—</div>
                  <span class="item-name">{{ item.material }}</span>
                </div>

                <div class="progress-wrapper">
                  <div class="progress-track">
                    <div class="progress-bar" :style="{ width: progressPercent(item) + '%' }"></div>
                  </div>
                </div>

                <span class="remaining-count">{{ item.branches_not_updated.length }}</span>
              </div>

              <transition name="expand">
                <div v-if="expandedId === item._id" class="modified-item-details">
                  <div class="detail-block">
                    <div class="detail-title">عدّلت السعر</div>
                    <p v-if="item.branches_updated.length === 0" class="detail-text">لا يوجد</p>
                    <div v-else class="branch-tags">
                      <span v-for="branch in item.branches_updated" :key="branch" class="branch-tag updated">
                        {{ branch }}
                      </span>
                    </div>
                  </div>
                  <div class="detail-block">
                    <div class="detail-title">لم تعدّل السعر بعد</div>
                    <p v-if="item.branches_not_updated.length === 0" class="detail-text">لا يوجد</p>
                    <div v-else class="branch-tags">
                      <span v-for="branch in item.branches_not_updated" :key="branch" class="branch-tag not-updated">
                        {{ branch }}
                      </span>
                    </div>
                  </div>
                </div>
              </transition>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onBeforeUnmount } from 'vue';
import axios from 'axios';
import apiClient from '@/api/client';
import TopBar from '@/components/TopBar.vue';

const PHOTO_URL = 'http://127.0.0.1:4000/api/v1/material_photo';

const companyTabs = [
  { value: 'all', label: 'الكل' },
  { value: 'UAE', label: 'UAE' },
  { value: 'OMAN', label: 'OMAN' },
  { value: 'BHR', label: 'BHR' },
  { value: 'KSA', label: 'KSA' },
  { value: 'TNZ', label: 'TNZ' },
];

const edits = ref([]);
const loading = ref(true);
const error = ref('');
const completingId = ref(null);
const completingAll = ref(false);
const completeError = ref('');
const selectedCompany = ref('all');

const tracking = ref([]);
const trackingLoading = ref(true);
const trackingError = ref('');
const expandedId = ref(null);

const photoUrls = reactive({});
const photoRequested = new Set();

const companyCounts = computed(() => {
  const counts = { all: edits.value.length };
  for (const tab of companyTabs) {
    if (tab.value !== 'all') {
      counts[tab.value] = edits.value.filter((r) => r.company === tab.value).length;
    }
  }
  return counts;
});

const filteredEdits = computed(() =>
  selectedCompany.value === 'all'
    ? edits.value
    : edits.value.filter((r) => r.company === selectedCompany.value)
);

// عدّل هذا السطر إذا كان كود المادة محفوظاً في حقل آخر
function materialCode(item) {
  return item.material;
}

async function loadPhotos(items) {
  const queue = [...new Set(items.map(materialCode).filter(Boolean))].filter(
    (code) => !photoRequested.has(code)
  );
  queue.forEach((code) => photoRequested.add(code));

  const workers = Array.from({ length: Math.min(4, queue.length) }, async () => {
    while (queue.length) {
      const code = queue.shift();
      try {
        const res = await axios.post(PHOTO_URL, { code }, { responseType: 'blob' });
        if (res.data?.size && String(res.data.type).startsWith('image/')) {
          photoUrls[code] = URL.createObjectURL(res.data);
        }
      } catch {
        // تبقى الصورة البديلة ظاهرة
      }
    }
  });
  await Promise.all(workers);
}

async function fetchEdits() {
  try {
    const response = await apiClient.get('/price-edits');
    edits.value = response.data;
    loadPhotos(edits.value);
  } catch (err) {
    error.value = err.response?.data?.error || 'فشل تحميل الطلبات';
  } finally {
    loading.value = false;
  }
}

async function completeEdit(id) {
  completingId.value = id;
  completeError.value = '';
  try {
    await apiClient.patch(`/price-edits/${id}`);
    edits.value = edits.value.filter((r) => r._id !== id);
    fetchTracking();
  } catch (err) {
    completeError.value = err.response?.data?.error || 'فشل إتمام التعديل';
  } finally {
    completingId.value = null;
  }
}

async function completeAll() {
  const targets = filteredEdits.value.slice();
  if (targets.length === 0) return;

  const label = selectedCompany.value === 'all' ? 'جميع الشركات' : selectedCompany.value;
  if (!window.confirm(`سيتم إتمام تعديل السعر لـ ${targets.length} طلب (${label}). هل تريد المتابعة؟`)) {
    return;
  }

  completingAll.value = true;
  completeError.value = '';

  const results = await Promise.allSettled(
    targets.map((r) => apiClient.patch(`/price-edits/${r._id}`))
  );

  const doneIds = new Set();
  results.forEach((res, idx) => {
    if (res.status === 'fulfilled') doneIds.add(targets[idx]._id);
  });

  edits.value = edits.value.filter((r) => !doneIds.has(r._id));

  const failed = targets.length - doneIds.size;
  if (failed > 0) {
    completeError.value = `فشل إتمام ${failed} من ${targets.length} طلب`;
  }
  if (doneIds.size > 0) fetchTracking();

  completingAll.value = false;
}

// function csvCell(value) {
//   return `"${String(value ?? '').replace(/"/g, '""')}"`;
// }

function todayString() {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
}

// function exportCsv() {
//   const rows = [
//     ['المادة', 'السعر المعتمد'],
//     ...filteredEdits.value.map((r) => [r.material, r.approved_price]),
//   ];
//   // BOM لضمان ظهور العربية بشكل صحيح في Excel
//   const csv = '\uFEFF' + rows.map((r) => r.map(csvCell).join(',')).join('\r\n');
//   const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
//   const url = URL.createObjectURL(blob);

//   const company = selectedCompany.value === 'all' ? 'ALL' : selectedCompany.value;
//   const a = document.createElement('a');
//   a.href = url;
//   a.download = `${todayString()}-${company}.csv`;
//   document.body.appendChild(a);
//   a.click();
//   a.remove();
//   URL.revokeObjectURL(url);
// }

async function exportXlsx() {
  const mod = await import('exceljs');
  const ExcelJS = mod.default ?? mod;

  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet('الأسعار المعتمدة', {
    views: [{ rightToLeft: true, state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { header: 'المادة', key: 'material', width: 40 },
    { header: 'السعر المعتمد', key: 'price', width: 18 },
  ];

  filteredEdits.value.forEach((r) => {
    const n = Number(r.approved_price);
    ws.addRow({
      material: r.material,
      price: Number.isFinite(n) ? n : r.approved_price,
    });
  });

  const header = ws.getRow(1);
  header.height = 24;
  header.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2563EB' } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  ws.getColumn('price').numFmt = '#,##0.00';
  ws.eachRow((row, rowNumber) => {
    if (rowNumber === 1) return;
    row.getCell('material').alignment = { horizontal: 'right', vertical: 'middle' };
    row.getCell('price').alignment = { horizontal: 'center', vertical: 'middle' };
    row.eachCell((cell) => {
      cell.border = { bottom: { style: 'thin', color: { argb: 'FFE5EAF1' } } };
    });
  });

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);

  const company = selectedCompany.value === 'all' ? 'ALL' : selectedCompany.value;
  const a = document.createElement('a');
  a.href = url;
  a.download = `${todayString()}-${company}.xlsx`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

async function fetchTracking() {
  trackingLoading.value = true;
  try {
    const response = await apiClient.get('/price-edits/materials-status');
    tracking.value = response.data;
    loadPhotos(tracking.value);
  } catch (err) {
    trackingError.value = err.response?.data?.error || 'فشل تحميل حالة الأفرع';
  } finally {
    trackingLoading.value = false;
  }
}

function toggleExpand(id) {
  expandedId.value = expandedId.value === id ? null : id;
}

function progressPercent(item) {
  const total = item.branches_updated.length + item.branches_not_updated.length;
  if (total === 0) return 0;
  return Math.round((item.branches_updated.length / total) * 100);
}

onMounted(() => {
  fetchEdits();
  fetchTracking();
});

onBeforeUnmount(() => {
  Object.values(photoUrls).forEach((url) => URL.revokeObjectURL(url));
});
</script>

<style scoped>
.page-container {
  --primary: #2563eb;
  --primary-hover: #1d4ed8;

  --text: #172033;
  --text-secondary: #64748b;

  --success: #16a34a;
  --success-bg: #f0fdf4;

  --warning: #f59e0b;
  --warning-bg: #fffbeb;

  --danger: #dc2626;
  --danger-bg: #fef2f2;

  --border: #e5eaf1;
  --border-light: #eef2f6;

  --page-bg: #f6f8fb;

  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text);

  direction: rtl;

  padding: 36px 24px 60px;
  box-sizing: border-box;
}

.page-content {
  width: min(1100px, 100%);
  margin: 0 auto;
}

.section {
  margin: 32px auto;
}

.section-card {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 16px;
  box-shadow: 0 4px 18px rgba(15, 23, 42, 0.04);
  overflow: hidden;
}

.section-header {
  padding: 22px 24px;
  border-bottom: 1px solid var(--border-light);

  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

/* Company tabs */

.company-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 16px 24px;
  border-bottom: 1px solid var(--border-light);
}

.company-tab {
  border: 1px solid var(--border);
  background: #ffffff;
  color: var(--text-secondary);

  padding: 8px 16px;
  border-radius: 999px;

  font-family: inherit;
  font-size: 13px;
  font-weight: 600;

  cursor: pointer;

  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;
}

.company-tab:hover {
  border-color: #bfdbfe;
  color: var(--primary);
}

.company-tab.active {
  background: var(--primary);
  border-color: var(--primary);
  color: #ffffff;
}

.tab-count {
  margin-inline-start: 6px;
  font-weight: 500;
  opacity: 0.85;
}

/* Section one — table */

.requests-table-wrapper {
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.requests-table {
  width: 100%;
  border-collapse: collapse;
  text-align: right;
}

.requests-table thead {
  background: #f8fafc;
}

.requests-table th {
  padding: 14px 20px;
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary);
  white-space: nowrap;
  border-bottom: 1px solid var(--border);
}

.requests-table td {
  padding: 18px 20px;
  font-size: 14px;
  color: var(--text);
  border-bottom: 1px solid var(--border-light);
  vertical-align: middle;
}

.requests-table tbody tr {
  transition:
    background-color 0.18s ease,
    box-shadow 0.18s ease;
}

.requests-table tbody tr:hover {
  background: #f8faff;
}

.requests-table tbody tr:last-child td {
  border-bottom: none;
}

.photo-col {
  width: 1%;
  white-space: nowrap;
}

.material-photo {
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #f8fafc;
  flex-shrink: 0;
  display: block;
}

.material-photo.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.current-price {
  color: #64748b;
  font-weight: 500;
}

.approved-price {
  color: var(--primary);
  font-weight: 700;
}

.table-actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;

  padding: 16px 24px;
  border-top: 1px solid var(--border-light);
  background: #fafbfc;
}

.export-btn {
  border: 1px solid var(--border);
  background: #ffffff;
  color: var(--text);

  padding: 9px 16px;
  border-radius: 8px;

  font-family: inherit;
  font-size: 13px;
  font-weight: 600;

  cursor: pointer;

  transition:
    background-color 0.18s ease,
    border-color 0.18s ease;
}

.export-btn:hover {
  background: #f1f5f9;
  border-color: #cbd5e1;
}

.complete-price-btn {
  border: none;
  background: var(--primary);
  color: #ffffff;

  padding: 9px 16px;
  border-radius: 8px;

  font-family: inherit;
  font-size: 13px;
  font-weight: 600;

  cursor: pointer;

  transition:
    background-color 0.18s ease,
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.complete-price-btn:hover {
  background: var(--primary-hover);
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.22);
  transform: translateY(-1px);
}

.complete-price-btn:active {
  transform: translateY(0);
}

.complete-price-btn:disabled {
  opacity: 0.6;
  cursor: default;
  transform: none;
  box-shadow: none;
}

/* Shared loading/error/empty states */

.table-state {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 30px;
  text-align: center;
  color: var(--text-secondary);
  font-size: 14px;
}

.table-state.error {
  color: var(--danger);
}

.table-state.empty {
  color: var(--text-secondary);
}

/* Section two — cards */

.modified-items {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 16px;
}

.modified-item {
  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  transition:
    border-color 0.2s ease,
    box-shadow 0.2s ease;
}

.modified-item:hover {
  border-color: #cbd5e1;
  box-shadow: 0 4px 14px rgba(15, 23, 42, 0.05);
}

.modified-item.is-expanded {
  border-color: #bfdbfe;
  box-shadow: 0 4px 18px rgba(37, 99, 235, 0.08);
}

.modified-item.is-expanded .modified-item-header {
  background: #f8fbff;
}

.modified-item-header {
  min-height: 74px;
  padding: 16px 20px;

  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;

  cursor: pointer;
  background: #ffffff;

  transition: background-color 0.18s ease;
}

.modified-item-header:hover {
  background: #f8fafc;
}

.item-main {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 0;
}

.item-name {
  font-size: 15px;
  font-weight: 700;
  color: var(--text);
  white-space: nowrap;
}

.progress-wrapper {
  flex: 1;
  max-width: 420px;
}

.progress-track {
  width: 100%;
  height: 7px;
  background: #edf1f5;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar {
  height: 100%;
  background: var(--warning);
  border-radius: inherit;
  transition: width 0.35s ease;
}

.remaining-count {
  min-width: 48px;
  height: 48px;
  padding: 0 10px;
  flex-shrink: 0;

  border-radius: 12px;
  background: var(--warning-bg);
  color: #b45309;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 18px;
  font-weight: 700;
}

.modified-item-details {
  padding: 20px;
  background: #fafbfc;
  border-top: 1px solid var(--border-light);
}

.detail-block {
  margin-bottom: 20px;
}

.detail-block:last-child {
  margin-bottom: 0;
}

.detail-title {
  margin-bottom: 8px;
  font-size: 13px;
  font-weight: 700;
  color: var(--text-secondary);
}

.detail-text {
  font-size: 13px;
  line-height: 1.8;
  color: var(--text);
}

/* Expand/collapse transition */

.expand-enter-active,
.expand-leave-active {
  transition:
    max-height 0.25s ease,
    opacity 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  max-height: 0;
  opacity: 0;
}

.expand-enter-to,
.expand-leave-from {
  max-height: 500px;
  opacity: 1;
}

/* Responsive */

@media (max-width: 768px) {
  .page-container {
    padding: 20px 12px 40px;
  }

  .section-header {
    padding: 18px;
  }

  .section-title {
    font-size: 18px;
  }

  .company-tabs,
  .table-actions {
    padding-inline: 16px;
  }

  .requests-table {
    min-width: 760px;
  }

  .modified-item-header {
    padding: 14px 16px;
  }

  .progress-wrapper {
    display: none;
  }
}

.branch-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.branch-tag {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 5px 12px;
  border-radius: 999px;
  border: 1px solid transparent;

  font-size: 12px;
  font-weight: 600;
}

.branch-tag.updated {
  background: var(--success-bg);
  color: var(--success);
  border-color: rgba(22, 163, 74, 0.25);
}

.branch-tag.not-updated {
  background: var(--danger-bg);
  color: var(--danger);
  border-color: rgba(220, 38, 38, 0.25);
}
</style>