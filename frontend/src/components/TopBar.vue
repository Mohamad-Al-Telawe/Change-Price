<template>
  <header class="topbar">
    <span class="topbar-brand">{{ brand }}</span>
    <div class="topbar-actions">
      <span v-if="authStore.user" class="topbar-user">{{ authStore.user.name }}</span>
      <RouterLink v-if="navLink" :to="navLink.to" class="btn btn-ghost topbar-link">{{ navLink.label }}</RouterLink>
      <slot />
      <button type="button" class="btn btn-ghost" @click="handleLogout">{{ logoutLabel }}</button>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

defineProps({
  brand: { type: String, default: 'نظام تعديل الأسعار' },
  logoutLabel: { type: String, default: 'تسجيل الخروج' },
});

const router = useRouter();
const route = useRoute();
const authStore = useAuthStore();

const HOME_BY_ROLE = {
  admin: '/admin',
  approver: '/approvals',
  price_editor: '/price-edits',
};

const navLink = computed(() => {
  const home = HOME_BY_ROLE[authStore.role];
  if (!home) return null;
  if (route.path === '/search') return { to: home, label: 'الصفحة الرئيسية' };
  return { to: '/search', label: 'البحث' };
});

function handleLogout() {
  authStore.logout();
  router.push('/login');
}
</script>

<style scoped>
.topbar-user {
  font-size: 0.85rem;
  color: var(--muted);
  margin-inline-end: 8px;
}

.topbar-link {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}
</style>