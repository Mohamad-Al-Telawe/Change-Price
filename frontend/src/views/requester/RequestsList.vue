<template>
  <div class="page-container" :dir="locale === 'ar' ? 'rtl' : 'ltr'" :lang="locale">
    <TopBar :brand="t('common.brand')" :logout-label="t('common.logout')">
      <LanguageToggle />
    </TopBar>

    <div class="page-content">
      <section class="section">
        <div class="section-card">
          <div class="section-header">
            <h2 class="section-title">{{ t('requestsList.branchUpdatesTitle') }}</h2>
          </div>

          <div v-if="branchUpdatesLoading" class="table-state">{{ t('requestsList.loading') }}</div>
          <div v-else-if="branchUpdatesError" class="table-state error">{{ branchUpdatesError }}</div>
          <div v-else-if="branchUpdates.length === 0" class="table-state empty">{{ t('requestsList.branchUpdatesEmpty') }}</div>

          <div v-else class="requests-table-wrapper">
            <table class="requests-table">
              <thead>
                <tr>
                  <th>{{ tt('photo') }}</th>
                  <th>{{ t('requestsList.material') }}</th>
                  <th>{{ t('requestsList.approvedPrice') }}</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(req, i) in branchUpdates" :key="req._id" class="stamp-in" :style="{ '--i': i }">
                  <td class="photo-cell">
                    <div class="material-photo">
                      <img v-if="photoOf(req.material)?.url" :src="photoOf(req.material).url" :alt="req.material"
                        @error="markPhotoBroken(req.material)" />
                      <span v-else-if="photoOf(req.material)?.status === 'loading'" class="photo-loading" aria-hidden="true"></span>
                      <span v-else class="photo-empty" :title="tt('noPhoto')">&mdash;</span>
                    </div>
                  </td>
                  <td>{{ req.material }}</td>
                  <td class="approved-price">{{ req.approved_price ?? t('common.none') }}</td>
                  <td>
                    <button type="button" class="btn-primary btn-sm" @click="confirmBranchUpdate(req._id)"
                      :disabled="confirmingId === req._id">
                      {{ t('requestsList.confirmUpdate') }}
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section class="section">
        <div class="section-card">
          <div class="section-header">
            <h1 class="section-title">{{ t('requestsList.title') }}</h1>
            <div class="header-actions">
              <button v-if="drafts.length > 0" type="button" class="btn-ghost" @click="onSendAllClick"
                :disabled="sendingAll || readyCount === 0">
                {{ sendingAll ? tt('sending') : `${tt('sendAll')} (${readyCount})` }}
              </button>
              <button type="button" class="btn-primary" @click="addDraft">
                {{ t('requestsList.newRequest') }}
              </button>
            </div>
          </div>

          <div v-if="drafts.length > 0 && !sendUnlocked" class="notice notice-warning">
            {{ tt('mondayOnly') }}
          </div>
          <div v-if="sendNotice" class="notice">{{ sendNotice }}</div>

          <div v-if="loading" class="table-state">{{ t('requestsList.loading') }}</div>
          <div v-else-if="error" class="table-state error">{{ error }}</div>
          <div v-else-if="requests.length === 0 && drafts.length === 0" class="table-state empty">{{ t('requestsList.empty') }}</div>

          <div v-else class="requests-table-wrapper">
            <table class="requests-table">
              <thead>
                <tr>
                  <th>{{ tt('photo') }}</th>
                  <th>{{ t('requestsList.material') }}</th>
                  <th>{{ t('requestsList.currentPrice') }}</th>
                  <th>{{ t('requestsList.requestedPrice') }}</th>
                  <th>{{ t('requestsList.approvedPrice') }}</th>
                  <th>{{ t('requestsList.status') }}</th>
                  <th>{{ t('requestsList.stage') }}</th>
                  <th>{{ t('requestsList.notes') }}</th>
                </tr>
              </thead>
              <tbody>
                <template v-for="d in drafts" :key="d.id">
                  <tr class="draft-row">
                    <td class="photo-cell">
                      <div class="material-photo">
                        <img v-if="d.verified && photoOf(d.material)?.url" :src="photoOf(d.material).url" :alt="d.material"
                          @error="markPhotoBroken(d.material)" />
                        <span v-else-if="d.verified && photoOf(d.material)?.status === 'loading'" class="photo-loading" aria-hidden="true"></span>
                        <span v-else class="photo-empty" :title="tt('noPhoto')">&mdash;</span>
                      </div>
                    </td>
                    <td>
                      <div class="draft-name-cell">
                        <button type="button" class="btn-remove" :title="tt('removeDraft')"
                          :aria-label="tt('removeDraft')" :disabled="d.sending" @click="removeDraft(d.id)">
                          &times;
                        </button>
                        <div class="draft-name-field">
                          <input :ref="(el) => setInputRef(d.id, el)" :value="d.material" type="text" maxlength="50"
                            :disabled="d.sending" @input="onMaterialInput(d, $event.target.value)"
                            @keyup.enter="verifyDraft(d)"
                            @blur="verifyDraft(d, true)" 
                            @change="verifyDraft(d, true)" 
                            @keyup="verifyDraft(d,true)"
                            />
                          <!-- <span v-if="d.verified && d.aname" class="draft-hint">{{ d.aname }}</span> -->
                        </div>
                      </div>
                    </td>
                    <td>
                      <input v-model.number="d.current_price" type="number" step="0.01" :disabled="d.sending" />
                    </td>
                    <td>
                      <input v-model.number="d.requested_price" type="number" step="0.01" :disabled="d.sending" />
                    </td>
                    <td>{{ t('common.none') }}</td>
                    <td>
                      <span class="mark mark-neutral">{{ tt('draftBadge') }}</span>
                    </td>
                    <td>{{ t('common.none') }}</td>
                    <td>
                      <div class="draft-actions">
                        <button type="button" class="btn-ghost btn-sm" :class="{ 'is-verified': d.verified }"
                          :disabled="d.verifying || d.sending" @click="verifyDraft(d)">
                          {{ d.verifying ? tt('verifying') : d.verified ? tt('verified') : tt('verifyName') }}
                        </button>
                        <button type="button" class="btn-primary btn-sm"
                          :disabled="!d.verified || d.verifying || d.sending || sendingAll" @click="onSendClick(d)">
                          {{ d.sending ? tt('sending') : tt('send') }}
                        </button>
                      </div>
                    </td>
                  </tr>
                  <tr v-if="d.error" class="error-row">
                    <td colspan="8" class="error-text">{{ d.error }}</td>
                  </tr>
                </template>

                <tr v-for="(req, i) in requests" :key="req._id" class="stamp-in" :style="{ '--i': i }">
                  <td class="photo-cell">
                    <div class="material-photo">
                      <img v-if="photoOf(req.material)?.url" :src="photoOf(req.material).url" :alt="req.material"
                        @error="markPhotoBroken(req.material)" />
                      <span v-else-if="photoOf(req.material)?.status === 'loading'" class="photo-loading" aria-hidden="true"></span>
                      <span v-else class="photo-empty" :title="tt('noPhoto')">&mdash;</span>
                    </div>
                  </td>
                  <td>{{ req.material }}</td>
                  <td>{{ req.current_price }}</td>
                  <td>{{ req.requested_price }}</td>
                  <td class="approved-price">{{ req.approved_price ?? t('common.none') }}</td>
                  <td>
                    <span class="mark" :class="statusMark(req.status)">
                      {{ statusLabel(req.status) }}
                    </span>
                  </td>
                  <td>
                    <span class="mark" :class="stageMark(req.stage)">
                      {{ stageLabel(req.stage) }}
                    </span>
                  </td>
                  <td class="notes-cell">{{ req.notes ?? t('common.none') }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </section>
    </div>

    <!-- Password dialog: bypass the Monday-only restriction -->
    <div v-if="showPasswordModal" class="modal-overlay" @click.self="closePasswordModal"
      @keydown.esc="closePasswordModal">
      <div class="modal-box" role="dialog" aria-modal="true">
        <h3 class="modal-title">{{ tt('passwordTitle') }}</h3>
        <p class="modal-text">{{ tt('mondayOnly') }}</p>
        <input ref="passwordField" v-model="passwordInput" type="password" autocomplete="off"
          :placeholder="tt('passwordPlaceholder')" @keyup.enter="submitPassword" />
        <div v-if="passwordError" class="error-text modal-error">{{ passwordError }}</div>
        <div class="modal-actions">
          <button type="button" class="btn-primary btn-sm" @click="submitPassword">{{ tt('confirm') }}</button>
          <button type="button" class="btn-ghost btn-sm" @click="closePasswordModal">{{ t('requestsList.cancel') }}</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, unref, onMounted, onBeforeUnmount, nextTick } from 'vue';
import apiClient from '@/api/client';
import { locale, t, statusLabel, stageLabel } from '@/i18n';
import { statusMark, stageMark } from '@/utils/statusMeta';
import TopBar from '@/components/TopBar.vue';
import LanguageToggle from '@/components/LanguageToggle.vue';

/* ------------------------------------------------------------------ */
/* Config                                                              */
/* ------------------------------------------------------------------ */

// Accounting API used only to verify the material name.
const MATERIAL_API_BASE = import.meta.env.VITE_MATERIAL_API_URL || 'http://127.0.0.1:4000';
const COMPANY = 'UAE';

// Endpoint that returns the material photo (POST {"code": "<material code>"}).
const PHOTO_URL = `${MATERIAL_API_BASE}/api/v1/material_photo`;

// Sending is allowed only on this weekday (0 = Sunday ... 1 = Monday ... 6 = Saturday).
const SEND_DAY = 1;
// Fixed password (temporary) that unlocks sending for the rest of the current day.
const OVERRIDE_PASSWORD = 'change-me-123';

const DRAFTS_KEY = 'requestsList.drafts.v1';
const OVERRIDE_KEY = 'requestsList.sendOverrideDate.v1';

const AUTO_SEND_ON_MONDAY = true;
const AUTO_SEND_KEY = 'requestsList.autoSendDate.v1';

/* ------------------------------------------------------------------ */
/* Local messages for the new UI (so no i18n file changes are needed)  */
/* ------------------------------------------------------------------ */

const msgs = {
  ar: {
    photo: 'الصورة',
    noPhoto: 'لا توجد صورة',
    draftBadge: 'مسودة',
    verifyName: 'تأكيد الاسم',
    verifying: 'جارٍ التحقق…',
    verified: '✓ تم التأكيد',
    send: 'إرسال',
    sending: 'جارٍ الإرسال…',
    sendAll: 'إرسال الكل',
    removeDraft: 'حذف المسودة',
    nameRequired: 'اكتب اسم المادة أولاً',
    notFound: 'اسم المادة خاطئ وغير موجود في {company}',
    verifyFailed: 'تعذر التحقق من الاسم',
    verifyUnreachable: 'تعذر الاتصال بخدمة التحقق',
    needVerify: 'يجب تأكيد الاسم قبل الإرسال',
    sendAllNone: 'لا توجد مسودات مؤكدة للإرسال',
    sendAllSkipped: 'تم تجاوز {n} مسودة غير مؤكدة',
    sendAllFailed: 'فشل إرسال {n} مسودة',
    mondayOnly: 'الإرسال متاح يوم الإثنين فقط',
    passwordTitle: 'كلمة السر لتجاوز قيد الإثنين',
    passwordPlaceholder: 'كلمة السر',
    passwordWrong: 'كلمة السر غير صحيحة',
    confirm: 'تأكيد',
  },
  en: {
    photo: 'Photo',
    noPhoto: 'No photo',
    draftBadge: 'Draft',
    verifyName: 'Verify name',
    verifying: 'Verifying…',
    verified: '✓ Verified',
    send: 'Send',
    sending: 'Sending…',
    sendAll: 'Send all',
    removeDraft: 'Delete draft',
    nameRequired: 'Enter the material name first',
    notFound: 'This material does not exist in {company}',
    verifyFailed: 'Could not verify the name',
    verifyUnreachable: 'Could not reach the verification service',
    needVerify: 'Verify the name before sending',
    sendAllNone: 'No verified drafts to send',
    sendAllSkipped: '{n} unverified draft(s) skipped',
    sendAllFailed: '{n} draft(s) failed to send',
    mondayOnly: 'Sending is only available on Mondays',
    passwordTitle: 'Password to bypass the Monday restriction',
    passwordPlaceholder: 'Password',
    passwordWrong: 'Incorrect password',
    confirm: 'Confirm',
  },
};

function tt(key, vars = {}) {
  const lang = unref(locale) === 'ar' ? 'ar' : 'en';
  let s = msgs[lang][key] ?? key;
  for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}

/* ------------------------------------------------------------------ */
/* Existing state                                                      */
/* ------------------------------------------------------------------ */

const requests = ref([]);
const loading = ref(true);
const error = ref('');

const branchUpdates = ref([]);
const branchUpdatesLoading = ref(true);
const branchUpdatesError = ref('');
const confirmingId = ref(null);

async function fetchBranchUpdates() {
  try {
    const response = await apiClient.get('/requests/branch-updates');
    branchUpdates.value = response.data;
  } catch (err) {
    branchUpdatesError.value = err.response?.data?.error || t('requestsList.branchUpdatesErrorLoad');
  } finally {
    branchUpdatesLoading.value = false;
  }
}

async function confirmBranchUpdate(id) {
  confirmingId.value = id;
  try {
    await apiClient.patch(`/requests/${id}/branch-update`);
    branchUpdates.value = branchUpdates.value.filter((r) => r._id !== id);
  } catch (err) {
    branchUpdatesError.value = err.response?.data?.error || t('requestsList.branchUpdatesErrorConfirm');
  } finally {
    confirmingId.value = null;
  }
}

/* ------------------------------------------------------------------ */
/* Storage helpers                                                     */
/* ------------------------------------------------------------------ */

function readStorage(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* storage unavailable or full: ignore */
  }
}

/* ------------------------------------------------------------------ */
/* Drafts                                                              */
/* ------------------------------------------------------------------ */

const isNum = (v) => typeof v === 'number' && Number.isFinite(v);
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

function makeDraft(init = {}) {
  return {
    id: newId(),
    material: '',
    current_price: null,
    requested_price: null,
    verified: false, // name confirmed against the accounting API
    aname: '', // Arabic name returned by the API (display hint only)
    verifying: false, // transient (not persisted)
    sending: false, // transient (not persisted)
    error: '', // transient (not persisted)
    ...init,
  };
}

function loadDrafts() {
  try {
    const raw = JSON.parse(readStorage(DRAFTS_KEY) || '[]');
    if (!Array.isArray(raw)) return [];
    return raw
      .filter((x) => x && typeof x === 'object')
      .map((x) => {
        const material = typeof x.material === 'string' ? x.material : '';
        return makeDraft({
          id: typeof x.id === 'string' && x.id ? x.id : newId(),
          material,
          current_price: isNum(x.current_price) ? x.current_price : null,
          requested_price: isNum(x.requested_price) ? x.requested_price : null,
          verified: x.verified === true && material.trim() !== '',
          aname: typeof x.aname === 'string' ? x.aname : '',
        });
      });
  } catch {
    return [];
  }
}

const drafts = ref(loadDrafts());

function persistDrafts() {
  const data = drafts.value.map((d) => ({
    id: d.id,
    material: d.material,
    current_price: d.current_price,
    requested_price: d.requested_price,
    verified: d.verified,
    aname: d.aname,
  }));
  writeStorage(DRAFTS_KEY, JSON.stringify(data));
}

watch(drafts, persistDrafts, { deep: true });

const readyCount = computed(() => drafts.value.filter((d) => d.verified).length);

const inputRefs = {};
function setInputRef(id, el) {
  if (el) inputRefs[id] = el;
  else delete inputRefs[id];
}

async function addDraft() {
  const d = makeDraft();
  drafts.value.unshift(d);
  await nextTick();
  inputRefs[d.id]?.focus();
}

function removeDraft(id) {
  drafts.value = drafts.value.filter((d) => d.id !== id);
}

// Any edit of the name invalidates the previous confirmation.
function onMaterialInput(d, value) {
  d.material = value;
  d.verified = false;
  d.aname = '';
  d.error = '';
}

/* ------------------------------------------------------------------ */
/* Verify the material name                                            */
/* ------------------------------------------------------------------ */

async function verifyDraft(d) {
  if (d.verifying || d.sending) return;
  // if (auto && (d.verified || !d.material.trim())) return;

  d.error = '';

  const name = d.material.trim();
  if (!name) {
    d.error = tt('nameRequired');
    return;
  }

  d.verifying = true;
  try {
    const res = await fetch(`${MATERIAL_API_BASE}/api/v1/material/check`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ material: name, company: COMPANY }),
    });

    let data = null;
    try {
      data = await res.json();
    } catch {
      /* non-JSON response */
    }

    // The user edited the name while the request was in flight: drop this result.
    if (d.material.trim() !== name) return;

    if (!res.ok) {
      d.verified = false;
      d.error = data?.error || data?.message || tt('verifyFailed');
      return;
    }

    if (data?.exists === true && data.material?.code) {
      d.material = data.material.code; // fixes upper/lower case
      d.aname = data.material.aname ?? '';
      d.verified = true;
    } else {
      d.verified = false;
      d.aname = '';
      d.error = tt('notFound', { company: COMPANY });
    }
  } catch {
    d.verified = false;
    d.error = tt('verifyUnreachable');
  } finally {
    d.verifying = false;
  }
}

/* ------------------------------------------------------------------ */
/* Material photos                                                     */
/* ------------------------------------------------------------------ */

// code -> { status: 'loading' | 'ok' | 'none', url: object URL of the image }
const photos = reactive({});

const photoKey = (code) => (typeof code === 'string' ? code.trim() : '');
const photoOf = (code) => photos[photoKey(code)];

function dropPhotoUrl(key) {
  const url = photos[key]?.url;
  if (url) URL.revokeObjectURL(url);
}

// Fetches the photo once per material code (the result is cached for every row/table).
async function loadPhoto(code) {
  const key = photoKey(code);
  if (!key || photos[key]) return; // empty, already loading, loaded, or known to have no photo

  photos[key] = { status: 'loading', url: '' };
  try {
    const res = await fetch(PHOTO_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: key }),
    });

    const type = res.headers.get('content-type') || '';
    if (!res.ok || !type.startsWith('image/')) {
      photos[key] = { status: 'none', url: '' }; // no photo for this material
      return;
    }

    const blob = await res.blob();
    photos[key] = { status: 'ok', url: URL.createObjectURL(blob) };
  } catch {
    delete photos[key]; // service unreachable: allow a retry the next time the code shows up
  }
}

// The returned bytes could not be rendered as an image.
function markPhotoBroken(code) {
  const key = photoKey(code);
  if (!photos[key]) return;
  dropPhotoUrl(key);
  photos[key] = { status: 'none', url: '' };
}

// Load photos for every material shown in either table (drafts only once their name is verified).
watch(
  () => [
    ...branchUpdates.value.map((r) => r.material),
    ...requests.value.map((r) => r.material),
    ...drafts.value.filter((d) => d.verified).map((d) => d.material),
  ],
  (codes) => codes.forEach(loadPhoto),
  { immediate: true },
);

onBeforeUnmount(() => {
  Object.keys(photos).forEach(dropPhotoUrl);
});

/* ------------------------------------------------------------------ */
/* Monday-only sending + password bypass                               */
/* ------------------------------------------------------------------ */

const dateKey = (date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

const now = ref(new Date());
const overrideDate = ref(readStorage(OVERRIDE_KEY) || '');
let clockTimer = null;

function unlockedAt(date) {
  return date.getDay() === SEND_DAY || overrideDate.value === dateKey(date);
}

const sendUnlocked = computed(() => unlockedAt(now.value));

const showPasswordModal = ref(false);
const passwordInput = ref('');
const passwordError = ref('');
const passwordField = ref(null);
let pendingAction = null;

async function withSendGate(action) {
  if (unlockedAt(new Date())) {
    await action();
    return;
  }
  pendingAction = action;
  passwordInput.value = '';
  passwordError.value = '';
  showPasswordModal.value = true;
  await nextTick();
  passwordField.value?.focus();
}

function closePasswordModal() {
  showPasswordModal.value = false;
  pendingAction = null;
}

async function submitPassword() {
  if (passwordInput.value !== OVERRIDE_PASSWORD) {
    passwordError.value = tt('passwordWrong');
    return;
  }
  const today = dateKey(new Date());
  overrideDate.value = today;
  writeStorage(OVERRIDE_KEY, today);

  const action = pendingAction;
  closePasswordModal();
  if (action) await action();
}

/* ------------------------------------------------------------------ */
/* Sending                                                             */
/* ------------------------------------------------------------------ */

const sendingAll = ref(false);
const sendNotice = ref('');

// Returns true on success, false otherwise.
async function sendDraft(d) {
  d.error = '';
  if (!d.verified) {
    d.error = tt('needVerify');
    return false;
  }
  if (!d.material.trim() || !isNum(d.current_price) || !isNum(d.requested_price)) {
    d.error = t('requestsList.errorValidation');
    return false;
  }

  d.sending = true;
  try {
    const response = await apiClient.post('/requests', {
      material: d.material,
      current_price: d.current_price,
      requested_price: d.requested_price,
    });
    requests.value.unshift(response.data);
    removeDraft(d.id);
    return true;
  } catch (err) {
    d.error = err.response?.data?.error || t('requestsList.errorSubmit');
    return false;
  } finally {
    d.sending = false;
  }
}

function onSendClick(d) {
  sendNotice.value = '';
  return withSendGate(() => sendDraft(d));
}

async function sendAll() {
  if (sendingAll.value) return;

  const ready = drafts.value.filter((d) => d.verified && !d.sending);
  if (ready.length === 0) {
    sendNotice.value = tt('sendAllNone');
    return;
  }
  const skipped = drafts.value.length - ready.length;

  sendingAll.value = true;
  let failed = 0;
  try {
    for (const d of ready) {
      const ok = await sendDraft(d);
      if (!ok) failed++;
    }
  } finally {
    sendingAll.value = false;
  }

  const parts = [];
  if (skipped > 0) parts.push(tt('sendAllSkipped', { n: skipped }));
  if (failed > 0) parts.push(tt('sendAllFailed', { n: failed }));
  sendNotice.value = parts.join(' · ');
}

function onSendAllClick() {
  sendNotice.value = '';
  return withSendGate(sendAll);
}

// Runs send-all once per Monday, at the first opportunity (page open or clock tick)
function maybeAutoSendAll() {
  if (!AUTO_SEND_ON_MONDAY) return;
  const today = new Date();
  if (today.getDay() !== SEND_DAY) return; // real Monday only, not the password bypass
  if (readStorage(AUTO_SEND_KEY) === dateKey(today)) return; // already ran today
  if (sendingAll.value || readyCount.value === 0) return; // nothing verified yet
  writeStorage(AUTO_SEND_KEY, dateKey(today));
  sendAll();
}
/* ------------------------------------------------------------------ */
/* Lifecycle                                                           */
/* ------------------------------------------------------------------ */

onMounted(async () => {
  try {
    const response = await apiClient.get('/requests/mine');
    requests.value = response.data;
  } catch (err) {
    error.value = err.response?.data?.error || t('requestsList.errorLoad');
  } finally {
    loading.value = false;
    maybeAutoSendAll();
  }
});

onMounted(fetchBranchUpdates);

onMounted(() => {
  clockTimer = setInterval(() => {
    now.value = new Date();
    maybeAutoSendAll();
  }, 60 * 1000);
});

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer);
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
  gap: 16px;
  flex-wrap: wrap;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.section-title {
  margin: 0;
  font-size: 20px;
  font-weight: 700;
  color: var(--text);
}

/* Notices */

.notice {
  padding: 12px 24px;
  font-size: 13px;
  color: var(--text-secondary);
  background: #f8fafc;
  border-bottom: 1px solid var(--border-light);
}

.notice-warning {
  color: #b45309;
  background: var(--warning-bg);
}

/* Tables */

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

.approved-price {
  color: var(--primary);
  font-weight: 700;
}

/* Material photo column */

.requests-table td.photo-cell {
  width: 1%;
  padding-inline-end: 8px;
}

.material-photo {
  width: 100px;
  height: 100px;

  display: flex;
  align-items: center;
  justify-content: center;

  border: 1px solid var(--border);
  border-radius: 10px;
  background: #f8fafc;
  color: var(--text-secondary);

  overflow: hidden;
}

.material-photo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.photo-loading {
  width: 18px;
  height: 18px;

  border: 2px solid var(--border);
  border-top-color: var(--primary);
  border-radius: 50%;

  animation: photo-spin 0.8s linear infinite;
}

@keyframes photo-spin {
  to {
    transform: rotate(360deg);
  }
}

.notes-cell {
  max-width: 280px;
  white-space: normal;
  line-height: 1.6;
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
  box-shadow: 0 4px 10px rgba(37, 99, 235, 0.22);
  transform: translateY(-1px);
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

.btn-ghost.is-verified {
  color: var(--success);
  background: var(--success-bg);
  border-color: var(--success);
}

.btn-sm {
  padding: 7px 12px;
  font-size: 12px;
  margin-inline-end: 6px;
}

.btn-sm:last-child {
  margin-inline-end: 0;
}

/* Draft row */

.draft-row {
  background: #f8fbff;
}

.draft-row input {
  width: 100%;
  min-width: 90px;
  box-sizing: border-box;

  padding: 9px 11px;

  border: 1px solid var(--border);
  border-radius: 8px;

  background: #ffffff;
  color: var(--text);

  font-family: inherit;
  font-size: 13px;

  outline: none;

  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.draft-row input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.draft-row input:disabled {
  opacity: 0.7;
}

.draft-name-cell {
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.draft-name-field {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.draft-hint {
  font-size: 12px;
  color: var(--text-secondary);
  line-height: 1.4;
}

.draft-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.draft-actions .btn-sm {
  margin-inline-end: 0;
}

.btn-remove {
  flex: 0 0 auto;
  width: 24px;
  height: 24px;
  margin-top: 6px;
  padding: 0;

  display: inline-flex;
  align-items: center;
  justify-content: center;

  border: 1px solid var(--border);
  border-radius: 50%;
  background: #ffffff;
  color: var(--text-secondary);

  font-family: inherit;
  font-size: 16px;
  line-height: 1;

  cursor: pointer;

  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    border-color 0.18s ease;
}

.btn-remove:hover:not(:disabled) {
  color: var(--danger);
  background: var(--danger-bg);
  border-color: var(--danger);
}

.btn-remove:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.error-row {
  background: var(--danger-bg);
}

.error-text {
  color: var(--danger);
  font-size: 13px;
}

/* Password dialog */

.modal-overlay {
  position: fixed;
  inset: 0;
  z-index: 50;

  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;

  background: rgba(15, 23, 42, 0.4);
}

.modal-box {
  width: min(380px, 100%);
  padding: 22px;

  background: #ffffff;
  border: 1px solid var(--border);
  border-radius: 14px;
  box-shadow: 0 12px 40px rgba(15, 23, 42, 0.18);
}

.modal-title {
  margin: 0 0 6px;
  font-size: 16px;
  font-weight: 700;
  color: var(--text);
}

.modal-text {
  margin: 0 0 14px;
  font-size: 13px;
  color: var(--text-secondary);
}

.modal-box input {
  width: 100%;
  box-sizing: border-box;
  padding: 9px 11px;

  border: 1px solid var(--border);
  border-radius: 8px;

  background: #ffffff;
  color: var(--text);

  font-family: inherit;
  font-size: 13px;

  outline: none;
}

.modal-box input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.modal-error {
  margin-top: 8px;
}

.modal-actions {
  margin-top: 16px;
  display: flex;
  gap: 6px;
}

/* States */

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

/* Status / stage pills */

.mark {
  display: inline-flex;
  align-items: center;
  gap: 6px;

  padding: 5px 12px;
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
  border-radius: 50%;
  flex: 0 0 6px;
  background: currentColor;
}

.mark-success {
  color: var(--success);
  background: var(--success-bg);
}

.mark-danger {
  color: var(--danger);
  background: var(--danger-bg);
}

.mark-info {
  color: var(--primary);
  background: rgba(37, 99, 235, 0.08);
}

.mark-warning {
  color: #b45309;
  background: var(--warning-bg);
}

.mark-neutral {
  color: var(--text-secondary);
  background: #f1f5f9;
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

  .requests-table {
    min-width: 700px;
  }
}
</style>