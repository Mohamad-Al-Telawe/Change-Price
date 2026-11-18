<template>
  <div ref="root" class="ms">
    <label class="ms-label">{{ label }}</label>
    <button type="button" class="ms-trigger" :class="{ open }" @click="open = !open">
      <span class="ms-text" :class="{ placeholder: !modelValue.length }">{{ summary }}</span>
      <span class="ms-caret" aria-hidden="true">▾</span>
    </button>

    <div v-if="open" class="ms-panel">
      <input
        v-if="options.length > 8"
        v-model="query"
        class="ms-search"
        type="text"
        placeholder="بحث..."
        @keydown.enter.prevent
      />
      <div class="ms-actions">
        <button type="button" class="ms-link" @click="selectAll">تحديد الكل</button>
        <button type="button" class="ms-link" @click="clear">مسح</button>
      </div>
      <ul class="ms-list">
        <li v-for="opt in filtered" :key="opt">
          <label class="ms-option">
            <input type="checkbox" :checked="modelValue.includes(opt)" @change="toggle(opt)" />
            <span>{{ opt }}</span>
          </label>
        </li>
        <li v-if="!filtered.length" class="ms-empty">لا توجد خيارات</li>
      </ul>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue';

const props = defineProps({
  modelValue: { type: Array, default: () => [] },
  options: { type: Array, default: () => [] },
  label: { type: String, default: '' },
  placeholder: { type: String, default: 'الكل' },
});
const emit = defineEmits(['update:modelValue']);

const root = ref(null);
const open = ref(false);
const query = ref('');

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase();
  return q ? props.options.filter((o) => String(o).toLowerCase().includes(q)) : props.options;
});

const summary = computed(() => {
  const n = props.modelValue.length;
  if (n === 0) return props.placeholder;
  if (n <= 2) return props.modelValue.join('، ');
  return `${n} محدد`;
});

function toggle(opt) {
  const next = props.modelValue.includes(opt)
    ? props.modelValue.filter((v) => v !== opt)
    : [...props.modelValue, opt];
  emit('update:modelValue', next);
}

function selectAll() {
  emit('update:modelValue', Array.from(new Set([...props.modelValue, ...filtered.value])));
}

function clear() {
  emit('update:modelValue', []);
}

function onDocClick(e) {
  if (root.value && !root.value.contains(e.target)) open.value = false;
}

onMounted(() => document.addEventListener('click', onDocClick));
onBeforeUnmount(() => document.removeEventListener('click', onDocClick));
</script>

<style scoped>
.ms {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 18px;
}

.ms-label {
  font-size: 12px;
  font-weight: 600;
  color: var(--text-secondary, #64748b);
}

.ms-trigger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  padding: 9px 11px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  background: #ffffff;
  color: var(--text, #0f172a);
  font-family: inherit;
  font-size: 13px;
  text-align: start;
  cursor: pointer;
}

.ms-trigger:hover,
.ms-trigger.open {
  border-color: var(--primary, #2563eb);
}

.ms-trigger.open {
  box-shadow: 0 0 0 3px rgba(37, 99, 235, 0.1);
}

.ms-text {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ms-text.placeholder {
  color: var(--text-secondary, #64748b);
}

.ms-caret {
  color: var(--text-secondary, #64748b);
  font-size: 12px;
}

.ms-panel {
  position: absolute;
  top: 100%;
  inset-inline: 0;
  z-index: 30;
  margin-top: 4px;
  padding: 8px;
  background: #ffffff;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 10px;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.14);
}

.ms-search {
  width: 100%;
  box-sizing: border-box;
  margin-bottom: 6px;
  padding: 7px 10px;
  border: 1px solid var(--border, #e2e8f0);
  border-radius: 8px;
  font-family: inherit;
  font-size: 13px;
  outline: none;
}

.ms-search:focus {
  border-color: var(--primary, #2563eb);
}

.ms-actions {
  display: flex;
  justify-content: space-between;
  padding: 2px 4px 6px;
}

.ms-link {
  padding: 0;
  border: none;
  background: none;
  color: var(--primary, #2563eb);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
}

.ms-list {
  max-height: 220px;
  margin: 0;
  padding: 0;
  overflow-y: auto;
  list-style: none;
}

.ms-option {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 6px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--text, #0f172a);
  cursor: pointer;
}

.ms-option:hover {
  background: #f1f5f9;
}

.ms-empty {
  padding: 10px;
  text-align: center;
  font-size: 13px;
  color: var(--text-secondary, #64748b);
}
</style>