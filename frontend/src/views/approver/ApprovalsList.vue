<template>
  <div class="page-container">
    <TopBar />

    <div class="page-content">
      <section class="section">
        <div class="section-card">
          <div class="section-header">
            <h1 class="section-title">طلبات بانتظار المراجعة</h1>
            <div class="company-tabs">
              <button v-for="tab in companyTabs" :key="tab.value" type="button" class="company-tab"
                :class="{ active: selectedCompany === tab.value }" @click="selectedCompany = tab.value">
                {{ tab.label }}<span class="tab-count">({{ companyCounts[tab.value] ?? 0 }})</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-card movement-card">
          <div class="section-header">
            <label for="movementText" class="section-title">حركة المادة (الصق النص المنسوخ من Excel)</label>
          </div>

          <div class="movement-card-body">
            <textarea id="movementText" v-model="movementText" class="movement-textarea"
              placeholder="انسخ الجدول من Excel ثم الصقه هنا..."></textarea>

            <div class="movement-actions">
              <label class="tax-label">
                نسبة الضريبة %
                <input type="number" v-model.number="taxPercent" min="0" step="0.1" class="tax-input">
              </label>

              <div class="movement-actions-row">
                <div class="action-group content-actions">
                  <button type="button" class="btn-ghost btn-sm" :disabled="!filteredApprovals.length"
                    @click="copyMaterials">
                    {{ copiedFeedback ? 'تم النسخ ✓' : 'نسخ المواد' }}
                  </button>
                  <button type="button" class="btn-ghost btn-sm" @click="clearAnalysis">مسح</button>
                </div>

                <div class="action-group primary-actions">
                  <button type="button" class="btn-primary btn-sm" @click="runAnalysis">تحليل الحركة</button>
                  <button type="button" class="btn-primary btn-sm" @click="exportPdf"
                    :disabled="!analysisResult.length || exportingPdf">
                    {{ exportingPdf ? '... جارٍ التصدير' : '🖨️ تصدير PDF' }}
                  </button>
                  <button type="button" class="btn-primary btn-sm" :disabled="!analysisResult.length || fetchingImages"
                    @click="fetchImages">
                    {{ fetchingImages ? '... جارٍ جلب الصور' : 'جلب الصور' }}
                  </button>
                </div>
              </div>
            </div>

            <p v-if="analysisError" class="status-pill danger">{{ analysisError }}</p>
            <p v-else-if="analysisResult.length" class="status-pill success">تم تحليل {{ analysisResult.length }} مادة
            </p>
            <p v-if="pdfError" class="status-pill danger">{{ pdfError }}</p>
            <p v-if="imagesMessage" class="status-pill success">{{ imagesMessage }}</p>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-card">
          <div v-if="loading" class="table-state">جارِ التحميل...</div>
          <div v-else-if="error" class="table-state error">{{ error }}</div>
          <div v-else-if="approvals.length === 0" class="table-state empty">لا توجد طلبات قيد المراجعة</div>
          <div v-else-if="filteredApprovals.length === 0" class="table-state empty">لا توجد طلبات لهذه الشركة</div>

          <div v-else class="requests-table-wrapper">
            <table class="requests-table">
              <thead>
                <tr>
                  <th>المادة</th>
                  <th>السعر الحالي</th>
                  <th>السعر المطلوب</th>
                  <th>مقدّم الطلب</th>
                  <th>القرار</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="(req, i) in filteredApprovals" :key="req._id">
                  <tr class="stamp-in" :style="{ '--i': i }">
                    <td>{{ req.material }}</td>
                    <td>{{ req.current_price }}</td>
                    <td class="requested-price">{{ req.requested_price }}</td>
                    <td>{{ req.requester?.name }}</td>
                    <td class="decision-cell">
                      <div class="decision-controls">
                        <div class="decision-row-controls">
                          <select v-model="decisions[req._id].decision" class="decision-select"
                            @change="onDecisionChange(req._id)">
                            <option value="">-</option>
                            <option value="approve">مقبول بسبب الحركة الوسط</option>
                            <option value="approve">مقبول بسبب الحركة السيئة</option>
                            <option value="approve">مقبول بسبب الحركة الوسط آخرة فترة</option>
                            <option value="modify">مقبول مع تعديل السعر</option>
                            <option value="reject">مرفوض بسبب الحركة الجيدة</option>
                            <option value="reject">مرفوض بسبب إنها عم تمشي</option>
                          </select>

                          <button type="button" class="btn-primary btn-sm"
                            :disabled="decisions[req._id].submitting || !decisions[req._id].decision"
                            @click="submitDecision(req)">
                            {{ decisions[req._id].submitting ? '...' : 'تنفيذ القرار' }}
                          </button>
                        </div>

                        <div v-if="decisions[req._id].decision === 'modify' && !decisions[req._id].showPricePopup"
                          class="price-badge" @click="decisions[req._id].showPricePopup = true">
                          السعر: {{ decisions[req._id].approved_price ?? 'حدد' }}
                        </div>

                        <div v-if="decisions[req._id].decision === 'modify' && decisions[req._id].showPricePopup"
                          class="price-popup">
                          <label>السعر المعتمد</label>
                          <input type="number" v-model.number="decisions[req._id].approved_price" min="0" step="0.01">
                          <button type="button" class="btn-ghost btn-sm"
                            @click="decisions[req._id].showPricePopup = false">تم</button>
                        </div>

                        <p v-if="decisions[req._id].error" class="error-text small">{{ decisions[req._id].error }}</p>
                      </div>
                    </td>
                  </tr>

                  <tr class="decision-row">
                    <td colspan="6">
                      <div v-if="materialTableData.has(req._id)" class="item-table-wrap">
                        <table class="flat-table">
                          <thead>
                            <tr>
                              <th>صورة المادة</th>
                              <th>المادة</th>
                              <th>الفرع</th>
                              <th>كمية الإدخال</th>
                              <th>عدد المبيعات بهذا السعر</th>
                              <th>سعر المبيع</th>
                              <th>تاريخ أول دخول</th>
                              <th>تاريخ آخر مبيع</th>
                              <th>الرصيد</th>
                              <th>ملاحظة</th>
                            </tr>
                          </thead>
                          <tbody>
                            <tr v-for="(r, ri) in materialTableData.get(req._id).flatRows" :key="ri">
                              <td v-if="ri === 0" :rowspan="materialTableData.get(req._id).flatRows.length"
                                class="img-cell" @click="openImagePicker(req.material)">
                                <img v-if="itemImages[req.material]" :src="itemImages[req.material]" class="item-img"
                                  :alt="req.material">
                                <div v-else class="img-placeholder">+</div>
                              </td>
                              <td v-if="ri === 0" :rowspan="materialTableData.get(req._id).flatRows.length"
                                class="code-cell">
                                {{ req.material }}</td>
                              <td v-if="r._isFirstOfBranch" :rowspan="r._branchRowCount">{{ r.branch }}</td>
                              <td v-if="r._isFirstOfBranch" :rowspan="r._branchRowCount">{{ r.inputQuantity }}</td>
                              <td>{{ r.numSales }}</td>
                              <td>{{ r.price }}</td>
                              <td>{{ r.firstInput }}</td>
                              <td>{{ r.dateLastSale }}</td>
                              <td v-if="r._isFirstOfBranch" :rowspan="r._branchRowCount"
                                :class="r._balanceVal > 0 ? 'bal-pos' : 'bal-zero'">{{ r.balance }}</td>
                              <td v-if="r._isFirstOfBranch" :rowspan="r._branchRowCount">{{ r.notes }}</td>
                            </tr>
                            <tr class="totals-row">
                              <td colspan="3">المجموع</td>
                              <td>{{ materialTableData.get(req._id).totals.totalInputQty }}</td>
                              <td>{{ materialTableData.get(req._id).totals.totalSalesQty }}</td>
                              <td></td>
                              <td></td>
                              <td></td>
                              <td>{{ materialTableData.get(req._id).totals.totalBalance }}</td>
                              <td></td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                      <p v-else class="movement-empty-state">لا توجد بيانات حركة لهذه المادة بعد — الصق الحركة أعلاه
                        وحلّلها لعرضها هنا
                      </p>

                      <div class="note-row" :style="{ background: decisions[req._id].noteColor }">
                        <span class="color-dot" :style="{ background: decisions[req._id].noteColor }"
                          @click="openNoteColorPicker(req._id)"></span>
                        <div class="note-text" contenteditable="true" data-placeholder="اكتب ملاحظة هنا..." v-once
                          @input="decisions[req._id].notes = $event.target.textContent">{{ decisions[req._id].notes }}
                        </div>
                      </div>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <input type="file" accept="image/*" ref="imageFileInputRef" style="display:none" @change="onImageFileChange">
    <input type="color" ref="noteColorInputRef" style="display:none" @input="onNoteColorChange">
    <div ref="pdfReportRef" class="pdf-report-hidden">
      <div v-for="entry in reportItems" :key="entry.item.code" class="item-table-wrap">
        <table class="ledger-table report-info-table" v-if="entry.req">
          <thead>
            <tr>
              <th>المادة</th>
              <th>السعر الحالي</th>
              <th>السعر المطلوب</th>
              <th>مقدّم الطلب</th>
              <th>القرار</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{{ entry.req.material }}</td>
              <td>{{ entry.req.current_price }}</td>
              <td>{{ entry.req.requested_price }}</td>
              <td>{{ entry.req.requester?.name }}</td>
              <td>{{ entry.decisionText }}</td>
            </tr>
          </tbody>
        </table>
        <table class="flat-table">
          <thead>
            <tr>
              <th>صورة المادة</th>
              <th>المادة</th>
              <th>الفرع</th>
              <th>كمية الإدخال</th>
              <th>عدد المبيعات بهذا السعر</th>
              <th>سعر المبيع</th>
              <th>تاريخ أول دخول</th>
              <th>تاريخ آخر مبيع</th>
              <th>الرصيد</th>
              <th>ملاحظة</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(r, ri) in entry.flatRows" :key="ri">
              <td v-if="ri === 0" :rowspan="entry.flatRows.length" class="img-cell">
                <img v-if="itemImages[entry.item.code]" :src="itemImages[entry.item.code]" class="item-img"
                  :alt="entry.item.code">
                <div v-else class="img-placeholder">+</div>
              </td>
              <td v-if="ri === 0" :rowspan="entry.flatRows.length" class="code-cell">{{ entry.item.code }}</td>
              <td v-if="r._isFirstOfBranch" :rowspan="r._branchRowCount">{{ r.branch }}</td>
              <td v-if="r._isFirstOfBranch" :rowspan="r._branchRowCount">{{ r.inputQuantity }}</td>
              <td>{{ r.numSales }}</td>
              <td>{{ r.price }}</td>
              <td>{{ r.firstInput }}</td>
              <td>{{ r.dateLastSale }}</td>
              <td v-if="r._isFirstOfBranch" :rowspan="r._branchRowCount"
                :class="r._balanceVal > 0 ? 'bal-pos' : 'bal-zero'">{{ r.balance }}</td>
              <td v-if="r._isFirstOfBranch" :rowspan="r._branchRowCount">{{ r.notes }}</td>
            </tr>
            <tr class="totals-row">
              <td colspan="3">المجموع</td>
              <td>{{ entry.totals.totalInputQty }}</td>
              <td>{{ entry.totals.totalSalesQty }}</td>
              <td></td>
              <td></td>
              <td></td>
              <td>{{ entry.totals.totalBalance }}</td>
              <td></td>
            </tr>
          </tbody>
        </table>
        <div class="note-row note-bottom" :style="{ background: entry.noteColor }">
          <span class="color-dot" :style="{ background: entry.noteColor }"></span>
          <div class="note-text">{{ entry.noteText }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import apiClient from '@/api/client';
import TopBar from '@/components/TopBar.vue';
import { parseExcelText, groupByCode } from '@/lib/priceAnalysis/parseExcelText.js';
import { analyzeData } from '@/lib/priceAnalysis/analyzeData.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';

const approvals = ref([]);
const loading = ref(true);
const error = ref('');
const selectedCompany = ref('UAE');
const decisions = ref({});

const companyTabs = [
  { value: 'all', label: 'الكل' },
  { value: 'UAE', label: 'UAE' },
  { value: 'OMAN', label: 'OMAN' },
  { value: 'BHR', label: 'BHR' },
  { value: 'KSA', label: 'KSA' },
  { value: 'TNZ', label: 'TNZ' },
];

const filteredApprovals = computed(() =>
  selectedCompany.value === 'all'
    ? approvals.value
    : approvals.value.filter((req) => req.company === selectedCompany.value)
);

const companyCounts = computed(() => {
  const counts = { all: approvals.value.length };
  for (const tab of companyTabs) {
    if (tab.value !== 'all') {
      counts[tab.value] = approvals.value.filter((r) => r.company === tab.value).length;
    }
  }
  return counts;
});

const copiedFeedback = ref(false);

async function copyMaterials() {
  const codes = [...new Set(filteredApprovals.value.map((r) => r.material))];
  if (!codes.length) return;
  try {
    await navigator.clipboard.writeText(codes.join('\n'));
    copiedFeedback.value = true;
    setTimeout(() => { copiedFeedback.value = false; }, 1500);
  } catch (err) {
    console.error(err);
  }
}

// ── تحليل حركة المادة ─────────────────────────────
const movementText = ref('');
const taxPercent = ref(5);
const analysisResult = ref([]);
const analysisError = ref('');

const analysisByCode = computed(() => {
  const map = new Map();
  for (const item of analysisResult.value) {
    map.set(item.code, item);
  }
  return map;
});

const EXCLUDED_INPUT_BRANCHES = ['Store BR', 'Main Branch', 'ادارة سلطنة عمان', 'STORE'];

function buildFlatRowsForItem(item) {
  const rows = [];
  for (const branch of item.branches) {
    const salesList = branch.sales.length > 0 ? branch.sales : [null];
    const totalInput = (branch.inputRows ?? []).reduce((sum, r) => sum + (r.inputQuantity ?? 0), 0);
    let firstRowOfBranch = true;
    const branchRowCount = salesList.length;

    for (const sale of salesList) {
      rows.push({
        branch: firstRowOfBranch ? (branch.nameBranch ?? '—') : '',
        inputQuantity: firstRowOfBranch ? totalInput : '',
        numSales: sale ? sale.numSales : '',
        price: sale ? sale.priceWithTax : '',
        firstInput: firstRowOfBranch ? (branch.firstInput ?? '—') : '',
        dateLastSale: sale ? sale.dateLastSale : '',
        balance: branch.balance,
        _balanceVal: branch.balance,
        _branchRowCount: firstRowOfBranch ? branchRowCount : 0,
        _isFirstOfBranch: firstRowOfBranch,
        notes: firstRowOfBranch ? (branch.notes ?? '') : '',
      });
      firstRowOfBranch = false;
    }
  }
  return rows;
}

function getItemTotals(item) {
  const totalBalance = item.branches.reduce((sum, b) => sum + (b.balance ?? 0), 0);
  const totalInputQty = item.branches
    .filter((b) => !EXCLUDED_INPUT_BRANCHES.includes(b.nameBranch))
    .reduce((sum, b) => sum + (b.inputRows ?? []).reduce((s, r) => s + (r.inputQuantity ?? 0), 0), 0);
  const totalSalesQty = item.branches.reduce((sum, b) => sum + (b.totalSales ?? 0), 0);
  return { totalBalance, totalInputQty, totalSalesQty };
}

const materialTableData = computed(() => {
  const map = new Map();
  for (const req of filteredApprovals.value) {
    const item = analysisByCode.value.get(req.material);
    if (item) {
      map.set(req._id, {
        flatRows: buildFlatRowsForItem(item),
        totals: getItemTotals(item),
      });
    }
  }
  return map;
});

function runAnalysis() {
  analysisError.value = '';
  try {
    const rows = parseExcelText(movementText.value);
    const groups = groupByCode(rows);
    const taxRate = 1 + (Number(taxPercent.value) || 0) / 100;
    analysisResult.value = analyzeData(groups, taxRate);
  } catch (err) {
    console.error(err);
    analysisError.value = 'تعذّر تحليل النص الملصوق — تأكد من نسخه كاملاً من Excel';
    analysisResult.value = [];
  }
}

function clearAnalysis() {
  movementText.value = '';
  analysisResult.value = [];
  analysisError.value = '';
  imagesMessage.value = '';
}

// ── تصدير PDF (جميع المواد المحلّلة حالياً، تقرير واحد) ──────────
const pdfReportRef = ref(null);
const exportingPdf = ref(false);
const pdfError = ref('');

const decisionLabels = {
  '': '-',
  approve: 'قبول بالسعر المطلوب',
  modify: 'قبول مع تعديل',
  reject: 'رفض',
};

const reportItems = computed(() =>
  analysisResult.value.map((item) => {
    const req = approvals.value.find((r) => r.material === item.code);
    const decision = req ? decisions.value[req._id] : null;
    const decisionText = !decision || !decision.decision
      ? decisionLabels['']
      : decision.decision === 'modify'
        ? `${decisionLabels.modify} — السعر المعتمد: ${decision.approved_price ?? '—'}`
        : decisionLabels[decision.decision];
    return {
      item,
      req,
      flatRows: buildFlatRowsForItem(item),
      totals: getItemTotals(item),
      noteText: decision?.notes || '',
      noteColor: decision?.noteColor || '#ffffff',
      decisionText,
    };
  })
);

const PX_PER_PT = 96 / 72;
function ptToPx(pt) { return pt * PX_PER_PT; }
function pxToPt(px) { return px / PX_PER_PT; }

function waitForImagesAndFonts(root) {
  const imgs = Array.from(root.querySelectorAll('img'));
  const imgPromises = imgs.map((img) => {
    if (img.complete && img.naturalWidth > 0) return Promise.resolve();
    return new Promise((resolve) => {
      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
    });
  });
  const fontsPromise = document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve();
  return Promise.all([...imgPromises, fontsPromise]);
}

function buildItemLayout(itemWrap, containerTop) {
  const table = itemWrap.querySelector('table.flat-table');
  const thead = table.querySelector('thead');
  const noteTop = itemWrap.querySelector('.note-top');
  const noteBottom = itemWrap.querySelector('.note-bottom');
  const bodyRows = Array.from(table.querySelectorAll('tbody tr'));

  const rel = (el) => {
    const r = el.getBoundingClientRect();
    return { top: r.top - containerTop, bottom: r.bottom - containerTop };
  };

  const wrapRect = rel(itemWrap);
  const theadRect = rel(thead);

  const blocks = [];
  if (noteTop) blocks.push({ type: 'note-top', ...rel(noteTop) });
  blocks.push({ type: 'thead', ...theadRect });
  bodyRows.forEach((tr) => blocks.push({ type: 'row', ...rel(tr) }));
  if (noteBottom) blocks.push({ type: 'note-bottom', ...rel(noteBottom) });

  return {
    top: wrapRect.top,
    bottom: wrapRect.bottom,
    height: wrapRect.bottom - wrapRect.top,
    theadRect,
    theadHeight: theadRect.bottom - theadRect.top,
    blocks,
  };
}

function computePages(items, usableHeightPx) {
  const pages = [];
  let current = [];
  let cursor = 0;
  let lastBottom = null;

  const flush = () => {
    if (current.length) pages.push(current);
    current = [];
    cursor = 0;
    lastBottom = null;
  };

  const pushSlice = (sy, sh, repeatHeaderRect) => {
    if (lastBottom !== null) {
      const gap = sy - lastBottom;
      if (gap > 0) {
        current.push({ sy: lastBottom, sh: gap, repeatHeaderRect: null });
        cursor += gap;
      }
    }
    const headerH = repeatHeaderRect ? (repeatHeaderRect.bottom - repeatHeaderRect.top) : 0;
    current.push({ sy, sh, repeatHeaderRect });
    cursor += headerH + sh;
    lastBottom = sy + sh;
  };

  for (const item of items) {
    const gapBefore = lastBottom !== null ? Math.max(0, item.top - lastBottom) : 0;

    if (item.height <= usableHeightPx) {
      if (cursor > 0 && (gapBefore + item.height) > usableHeightPx - cursor) flush();
      pushSlice(item.top, item.height, null);
      continue;
    }

    if (cursor > 0) flush();

    const blocks = item.blocks;
    let idx = 0;
    let firstSlice = true;

    while (idx < blocks.length) {
      if (!firstSlice) flush();

      const repeatHeaderRect = firstSlice ? null : item.theadRect;
      const headerH = repeatHeaderRect ? item.theadHeight : 0;
      const budget = usableHeightPx - headerH;

      let sliceStart = blocks[idx].top;
      let sliceEnd = sliceStart;
      let used = 0;
      let j = idx;

      while (j < blocks.length) {
        const bh = blocks[j].bottom - blocks[j].top;
        if (used > 0 && used + bh > budget) break;
        sliceEnd = blocks[j].bottom;
        used += bh;
        j++;
      }

      if (j === idx) {
        sliceEnd = blocks[idx].bottom;
        used = blocks[idx].bottom - blocks[idx].top;
        j = idx + 1;
      }

      pushSlice(sliceStart, sliceEnd - sliceStart, repeatHeaderRect);
      idx = j;
      firstSlice = false;
    }
  }

  flush();
  return pages;
}

function swapParens(str) {
  return str.replace(/[()]/g, (c) => (c === '(' ? ')' : '('));
}

function applyParenSwapFix(root) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  const originals = [];
  let node;
  while ((node = walker.nextNode())) {
    if (node.nodeValue && /[()]/.test(node.nodeValue)) {
      originals.push({ node, text: node.nodeValue });
      // node.nodeValue = swapParens(node.nodeValue);
    }
  }
  return function restore() {
    originals.forEach(({ node, text }) => { node.nodeValue = text; });
  };
}

function buildPdfFromPages(bigCanvas, pages, scale, contentWidthPx, contentWidthPt, marginPt, pageWidthPt, pageHeightPt, jpegQuality) {
  const doc = new jsPDF({
    unit: 'pt',
    format: [pageWidthPt, pageHeightPt],
    orientation: pageWidthPt > pageHeightPt ? 'landscape' : 'portrait',
    compress: true,
  });

  pages.forEach((pageSlices, pageIndex) => {
    if (pageIndex > 0) doc.addPage();

    let totalLogicalH = 0;
    pageSlices.forEach((s) => {
      const headerH = s.repeatHeaderRect ? (s.repeatHeaderRect.bottom - s.repeatHeaderRect.top) : 0;
      totalLogicalH += headerH + s.sh;
    });

    const pageCanvas = document.createElement('canvas');
    pageCanvas.width = Math.ceil(contentWidthPx * scale);
    pageCanvas.height = Math.max(1, Math.ceil(totalLogicalH * scale));
    const ctx = pageCanvas.getContext('2d', { alpha: false });
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

    let destY = 0;
    pageSlices.forEach((s) => {
      if (s.repeatHeaderRect) {
        const hh = s.repeatHeaderRect.bottom - s.repeatHeaderRect.top;
        ctx.drawImage(
          bigCanvas,
          0, Math.round(s.repeatHeaderRect.top * scale), pageCanvas.width, Math.round(hh * scale),
          0, Math.round(destY * scale), pageCanvas.width, Math.round(hh * scale)
        );
        destY += hh;
      }
      ctx.drawImage(
        bigCanvas,
        0, Math.round(s.sy * scale), pageCanvas.width, Math.round(s.sh * scale),
        0, Math.round(destY * scale), pageCanvas.width, Math.round(s.sh * scale)
      );
      destY += s.sh;
    });

    const imgData = pageCanvas.toDataURL('image/jpeg', jpegQuality);
    const imgHeightPt = pxToPt(totalLogicalH);
    doc.addImage(imgData, 'JPEG', marginPt, marginPt, contentWidthPt, imgHeightPt);
  });

  return doc;
}

async function exportPdf() {
  const container = pdfReportRef.value;
  pdfError.value = '';

  if (!container || !container.children.length) {
    pdfError.value = 'لا توجد مواد محلّلة للتصدير — شغّل التحليل أولاً.';
    return;
  }
  if (exportingPdf.value) return;

  exportingPdf.value = true;

  const MARGIN_PT = 36;
  const PAGE_HEIGHT_PT = 841.89;
  const MAX_CANVAS_DIM_PX = 14000;
  const JPEG_QUALITY = 0.82;

  let restoreParens = null;

  try {
    await waitForImagesAndFonts(container);
    void container.offsetHeight;

    const actualWidthPx = Math.max(container.scrollWidth, container.getBoundingClientRect().width);
    const contentWidthPt = pxToPt(actualWidthPx);
    const pageWidthPt = contentWidthPt + MARGIN_PT * 2;

    const contentHeightPt = PAGE_HEIGHT_PT - MARGIN_PT * 2;
    const usableHeightPx = ptToPx(contentHeightPt);

    const containerTop = container.getBoundingClientRect().top;
    const itemWraps = Array.from(container.querySelectorAll(':scope > .item-table-wrap'));
    if (!itemWraps.length) {
      throw new Error('لا توجد مواد محلّلة للتصدير');
    }

    const items = itemWraps.map((w) => buildItemLayout(w, containerTop));
    const pages = computePages(items, usableHeightPx);

    let scale = 2;
    const projectedHeightPx = container.scrollHeight * scale;
    const projectedWidthPx = actualWidthPx * scale;
    if (projectedHeightPx > MAX_CANVAS_DIM_PX || projectedWidthPx > MAX_CANVAS_DIM_PX) {
      const limitByHeight = MAX_CANVAS_DIM_PX / container.scrollHeight;
      const limitByWidth = MAX_CANVAS_DIM_PX / actualWidthPx;
      scale = Math.max(1, Math.floor(Math.min(limitByHeight, limitByWidth)));
      console.warn(`تصدير PDF: تم تقليل الدقة إلى scale=${scale} بسبب حجم التقرير.`);
    }

    restoreParens = applyParenSwapFix(container);

    const bigCanvas = await html2canvas(container, {
      scale,
      backgroundColor: '#ffffff',
      useCORS: true,
      logging: false,
    });

    const pdf = buildPdfFromPages(
      bigCanvas, pages, scale, actualWidthPx, contentWidthPt, MARGIN_PT, pageWidthPt, PAGE_HEIGHT_PT, JPEG_QUALITY
    );
    pdf.save('تقرير_المبيعات.pdf');
  } catch (err) {
    console.error('PDF export failed:', err);
    pdfError.value = 'حدث خطأ أثناء تصدير PDF: ' + err.message;
  } finally {
    if (restoreParens) restoreParens();
    exportingPdf.value = false;
  }
}

// ── صورة المادة ────────────────────────────────────
const itemImages = ref({});
const pendingImageCode = ref(null);
const imageFileInputRef = ref(null);

function openImagePicker(code) {
  pendingImageCode.value = code;
  imageFileInputRef.value?.click();
}

function onImageFileChange(e) {
  const file = e.target.files[0];
  e.target.value = '';
  if (!file || !pendingImageCode.value) return;
  const reader = new FileReader();
  reader.onload = (ev) => {
    itemImages.value[pendingImageCode.value] = ev.target.result;
    pendingImageCode.value = null;
  };
  reader.readAsDataURL(file);
}

// ── جلب الصور تلقائياً ─────────────────────────────
const PHOTO_API_URL = import.meta.env.VITE_PHOTO_API_URL || 'http://127.0.0.1:4000/api/v1/material_photo';
const fetchingImages = ref(false);
const imagesMessage = ref('');

function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

async function fetchMaterialImage(code) {
  const res = await fetch(PHOTO_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const blob = await res.blob();
  if (!blob.type.startsWith('image/')) throw new Error('الرد ليس صورة');
  return blobToDataUrl(blob);
}

async function fetchImages() {
  if (fetchingImages.value) return;

  const codes = [...new Set(analysisResult.value.map((i) => i.code))]
    .filter((code) => !itemImages.value[code]);

  if (!codes.length) {
    imagesMessage.value = 'جميع المواد لديها صور بالفعل';
    return;
  }

  fetchingImages.value = true;
  imagesMessage.value = '';
  let ok = 0;
  const queue = [...codes];

  const worker = async () => {
    while (queue.length) {
      const code = queue.shift();
      try {
        const dataUrl = await fetchMaterialImage(code);
        if (!itemImages.value[code]) {
          itemImages.value[code] = dataUrl;
          ok++;
        }
      } catch (err) {
        console.warn(`تعذّر جلب صورة ${code}:`, err.message);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(4, codes.length) }, worker));

  fetchingImages.value = false;
  imagesMessage.value = `تم جلب ${ok} من ${codes.length} صورة`;
}

// ── لون سطر الملاحظة ───────────────────────────────
const pendingNoteColorReqId = ref(null);
const noteColorInputRef = ref(null);

function openNoteColorPicker(reqId) {
  pendingNoteColorReqId.value = reqId;
  if (noteColorInputRef.value) {
    noteColorInputRef.value.value = decisions.value[reqId].noteColor || '#ffffff';
    noteColorInputRef.value.click();
  }
}

function onNoteColorChange(e) {
  if (!pendingNoteColorReqId.value) return;
  decisions.value[pendingNoteColorReqId.value].noteColor = e.target.value;
}

// ── القرار ─────────────────────────────────────────
function onDecisionChange(reqId) {
  const d = decisions.value[reqId];
  d.showPricePopup = d.decision === 'modify';
}

async function submitDecision(req) {
  const d = decisions.value[req._id];
  if (!d.decision) return;

  if (d.decision === 'modify' && (d.approved_price === null || d.approved_price === '' || isNaN(d.approved_price))) {
    d.error = 'الرجاء إدخال السعر المعدَّل';
    d.showPricePopup = true;
    return;
  }

  d.submitting = true;
  d.error = '';

  try {
    const payload = { decision: d.decision, notes: d.notes || undefined };
    if (d.decision === 'modify') payload.approved_price = d.approved_price;

    await apiClient.patch(`/approvals/${req._id}`, payload);

    approvals.value = approvals.value.filter((r) => r._id !== req._id);
    delete decisions.value[req._id];
  } catch (err) {
    d.error = err.response?.data?.error || 'فشل تنفيذ القرار';
  } finally {
    d.submitting = false;
  }
}

onMounted(async () => {
  try {
    const response = await apiClient.get('/approvals');
    approvals.value = response.data;
    for (const req of approvals.value) {
      decisions.value[req._id] = {
        decision: 'approve',
        approved_price: null,
        notes: '',
        noteColor: '#ffffff',
        showPricePopup: false,
        submitting: false,
        error: '',
      };
    }
  } catch (err) {
    error.value = err.response?.data?.error || 'فشل تحميل الطلبات';
  } finally {
    loading.value = false;
  }
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

  direction: rtl;

  min-height: 100vh;
  background: var(--page-bg);
  color: var(--text);

  padding: 36px 24px 60px;
  box-sizing: border-box;
}

.page-content {
  width: min(1380px, 100%);
  margin-inline: auto;
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
  flex-wrap: wrap;
  gap: 16px;
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

.section:last-child .section-header {
  border-bottom: none;
}

/* Company tabs */

.company-tabs {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.company-tab {
  border: 1px solid var(--border);
  background: #ffffff;
  color: var(--text-secondary);

  padding: 7px 14px;
  border-radius: 999px;

  font-family: inherit;
  font-size: 13px;
  font-weight: 600;

  cursor: pointer;

  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease;
}

.company-tab:hover {
  border-color: #cbd5e1;
}

.company-tab.active {
  background: var(--primary);
  color: #ffffff;
  border-color: var(--primary);
}

.tab-count {
  font-weight: 500;
  opacity: 0.75;
  margin-inline-start: 2px;
}

.company-tab.active .tab-count {
  opacity: 0.85;
}

/* Movement panel */

.movement-card-body {
  padding: 22px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.movement-textarea {
  width: 100%;
  min-height: 140px;
  padding: 12px 14px;
  box-sizing: border-box;

  border: 1px solid var(--border);
  border-radius: 10px;

  background: #ffffff;
  color: var(--text);

  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 13px;

  direction: ltr;
  resize: vertical;

  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.movement-textarea:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.movement-actions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.tax-label {
  align-self: flex-start;

  display: inline-flex;
  align-items: center;
  gap: 8px;

  padding: 6px 10px;

  border: 1px solid var(--border-light);
  border-radius: 10px;
  background: #f8fafc;

  color: var(--text-secondary);
  font-size: 13px;
}

.tax-input {
  width: 70px;
  padding: 7px 9px;

  border: 1px solid var(--border);
  border-radius: 7px;

  background: #ffffff;
  color: var(--text);

  font-family: inherit;
  font-size: 13px;

  outline: none;
}

.tax-input:focus {
  border-color: var(--primary);
}

.movement-actions-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 10px;
}

.action-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

/* Status pills (analysis result / errors) */

.status-pill {
  display: inline-flex;
  align-items: center;

  margin: 0;
  padding: 6px 12px;
  border-radius: 999px;

  font-size: 13px;
  font-weight: 600;
}

.status-pill.success {
  color: var(--success);
  background: var(--success-bg);
}

.status-pill.danger {
  color: var(--danger);
  background: var(--danger-bg);
}

/* Buttons */

.btn-primary {
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

.btn-primary:hover:not(:disabled) {
  background: var(--primary-hover);
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.22);
}

.btn-primary:active:not(:disabled) {
  transform: translateY(0);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-ghost {
  border: 1px solid var(--border);
  background: #ffffff;
  color: var(--text-secondary);

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

.btn-ghost:hover:not(:disabled) {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.btn-ghost:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-sm {
  padding: 7px 12px;
  font-size: 12px;
}

/* Loading / error / empty — section 1 */

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

/* Requests table */

.requests-table-wrapper {
  width: 100%;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;
}

.requests-table {
  width: 100%;
  border-collapse: collapse;
  text-align: start;
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
  text-align: start;
}

.requests-table td {
  padding: 18px 20px;
  font-size: 14px;
  color: var(--text);
  border-bottom: 1px solid var(--border-light);
  vertical-align: top;
}

.requests-table tbody tr.stamp-in:hover {
  background: #f8faff;
}

.requested-price {
  color: var(--primary);
  font-weight: 700;
}

/* Decision cell */

.decision-cell {
  min-width: 220px;
}

.decision-controls {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.decision-row-controls {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.decision-select {
  min-width: 170px;
  padding: 9px 11px;

  border: 1px solid var(--border);
  border-radius: 8px;

  background: #ffffff;
  color: var(--text);

  font-family: inherit;
  font-size: 13px;

  outline: none;
  transition: border-color 0.18s ease, box-shadow 0.18s ease;
}

.decision-select:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.price-badge {
  align-self: flex-start;

  color: var(--primary);
  background: #eff6ff;
  border: 1px solid #dbeafe;
  border-radius: 999px;

  padding: 5px 10px;
  font-size: 12px;
  font-weight: 600;

  cursor: pointer;
}

.price-popup {
  width: 100%;
  margin-top: 2px;
  padding: 14px;
  box-sizing: border-box;

  background: #f8fbff;
  border: 1px solid #dbeafe;
  border-radius: 10px;

  display: grid;
  grid-template-columns: auto minmax(100px, 1fr) auto;
  align-items: center;
  gap: 10px;
}

.price-popup label {
  font-size: 12px;
  color: var(--text-secondary);
  white-space: nowrap;
}

.price-popup input {
  width: 100%;
  padding: 7px 9px;
  box-sizing: border-box;

  border: 1px solid var(--border);
  border-radius: 7px;

  background: #ffffff;
  color: var(--text);

  font-family: inherit;
  font-size: 13px;
}

.decision-controls .error-text.small {
  margin: 0;
  color: var(--danger);
  background: var(--danger-bg);
  border-radius: 8px;
  padding: 8px 10px;
  font-size: 12px;
}

/* ===================================================
   Movement / sales table — VISIBLE instance only
   (scoped under .decision-row so the hidden PDF report,
   which shares the same class names, is left untouched)
   =================================================== */

.decision-row td {
  padding: 18px 20px;
  background: #fafbfd;
  border-bottom: 1px solid var(--border-light);
}

.decision-row .item-table-wrap {
  width: 100%;
  margin-top: 0;
  overflow-x: auto;
  -webkit-overflow-scrolling: touch;

  border: 1px solid var(--border);
  border-radius: 12px;
  background: #ffffff;
}

.decision-row .flat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
  direction: rtl;
}

.decision-row .flat-table th {
  background: #f8fafc;
  color: var(--text-secondary);

  padding: 9px 10px;
  text-align: center;
  font-weight: 600;
  white-space: nowrap;

  border-bottom: 1px solid var(--border);
}

.decision-row .flat-table td {
  padding: 9px 10px;
  border-bottom: 1px solid var(--border-light);
  white-space: nowrap;
  text-align: center;

  background: #ffffff;
}

.decision-row .flat-table tr:hover td {
  background: #f8faff;
}

.decision-row .flat-table .code-cell {
  font-weight: 700;
  color: var(--primary);
}

.decision-row .flat-table .bal-pos {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--success);
  background: var(--success-bg);
  font-weight: 700;
}

.decision-row .flat-table .bal-zero {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 42px;
  padding: 4px 10px;
  border-radius: 999px;
  color: var(--danger);
  background: var(--danger-bg);
  font-weight: 700;
}

.decision-row .flat-table .totals-row td {
  font-weight: 700;
  background: #f8fafc;
  border-top: 2px solid var(--border);
  color: var(--text);
}

.decision-row .img-cell {
  text-align: center;
  vertical-align: middle;
  width: 72px;
  min-width: 72px;
  cursor: pointer;
  background: #ffffff;
}

.decision-row .img-placeholder {
  width: 250px;
  height: 250px;
  min-width: 250px;
  min-height: 250px;

  border: 1px dashed var(--border);
  border-radius: 8px;

  display: flex;
  align-items: center;
  justify-content: center;

  background: #f8fafc;
  color: var(--text-secondary);
  font-size: 16px;

  cursor: pointer;
  margin: auto;
  transition: border-color 0.15s ease, color 0.15s ease;
}

.decision-row .img-placeholder:hover {
  border-color: var(--primary);
  color: var(--primary);
}

.decision-row .item-img {
  width: 250px;
  height: 250px;
  min-width: 250px;
  min-height: 250px;

  object-fit: contain;
  border-radius: 8px;
  border: 1px solid var(--border);

  display: block;
  margin: auto;
  background: #ffffff;
}

.decision-row .movement-empty-state {
  background: #f8fafc;
  border: 1px dashed var(--border);
  border-radius: 10px;
  padding: 18px;
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.decision-row .note-row {
  position: relative;
  display: flex;
  align-items: center;

  min-height: 44px;
  padding-inline-start: 44px;
  padding-inline-end: 14px;
  padding-block: 8px;

  border: 1px solid var(--border);
  border-radius: 10px;

  font-size: 13px;
  color: var(--text);

  width: 100%;
  box-sizing: border-box;

  margin-top: 12px;
}

.decision-row .color-dot {
  position: absolute;
  inset-inline-start: 12px;
  top: 50%;
  transform: translateY(-50%);

  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid var(--border);

  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.decision-row .color-dot:hover {
  border-color: var(--primary);
}

.decision-row .note-text {
  flex: 1;
  outline: none;
  min-height: 20px;
  line-height: 1.4;
  text-align: center;
}

.decision-row .note-text:empty:before {
  content: attr(data-placeholder);
  color: var(--text-secondary);
}

/* ===================================================
   Legacy styling — PRESERVED for the hidden PDF export
   DOM only. Do not remove: exportPdf()/html2canvas rely
   on this subtree rendering exactly as before.
   =================================================== */

.pdf-report-hidden {
  position: fixed;
  top: 0;
  left: -10000px;
  background: #ffffff;
  width: max-content;
}

.pdf-report-hidden .item-table-wrap {
  margin-bottom: 16px;
  overflow-x: auto;
}

.pdf-report-hidden .flat-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.82rem;
  direction: rtl;
}

.pdf-report-hidden .flat-table th {
  background: var(--ledger);
  color: var(--surface);
  padding: 8px 12px;
  text-align: center;
  font-weight: 600;
  white-space: nowrap;
}

.pdf-report-hidden .flat-table td {
  padding: 7px 12px;
  border-bottom: 1px solid #e5e7eb;
  white-space: nowrap;
  text-align: center;
}

.pdf-report-hidden .flat-table tr:hover td {
  background: var(--paper);
}

.pdf-report-hidden .flat-table .code-cell {
  font-weight: 700;
  color: var(--ledger);
}

.pdf-report-hidden .flat-table .bal-pos {
  color: var(--ok);
  font-weight: 700;
}

.pdf-report-hidden .flat-table .bal-zero {
  color: var(--danger);
  font-weight: 700;
}

.pdf-report-hidden .flat-table .totals-row td {
  font-weight: 700;
  background: var(--paper);
  border-top: 2px solid var(--brass);
  color: var(--ledger);
}

.pdf-report-hidden .img-cell {
  text-align: center;
  vertical-align: middle;
  width: 100px;
  min-width: 100px;
}

.pdf-report-hidden .img-placeholder {
  width: 250px;
  height: 250px;
  min-width: 250px;
  min-height: 250px;
  border: 2px dashed #d1d5db;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #9ca3af;
  font-size: 1.6rem;
  margin: auto;
}

.pdf-report-hidden .item-img {
  width: 250px;
  height: 250px;
  min-width: 250px;
  min-height: 250px;
  object-fit: contain;
  border-radius: 8px;
  display: block;
  margin: auto;
  border: 1.5px solid #e5e7eb;
}

.pdf-report-hidden .note-row {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 44px;
  padding: 8px 14px 8px 44px;
  border: 1.5px solid #e5e7eb;
  border-radius: 8px;
  font-size: 0.85rem;
  color: var(--ink);
  width: 100%;
  box-sizing: border-box;
}

.pdf-report-hidden .color-dot {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #d1d5db;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
}

.pdf-report-hidden .note-text {
  flex: 1;
  min-height: 20px;
  line-height: 1.4;
  text-align: center;
}

.report-info-table {
  margin-bottom: 8px;
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

  .movement-card-body {
    padding: 18px;
  }

  .company-tabs {
    width: 100%;
    overflow-x: auto;
    flex-wrap: nowrap;
    padding-bottom: 4px;
  }

  .company-tab {
    flex-shrink: 0;
  }

  .requests-table-wrapper,
  .decision-row .item-table-wrap {
    overflow-x: auto;
  }
}
</style>