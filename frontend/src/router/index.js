import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import LoginView from '@/views/LoginView.vue';

const routes = [
  { path: '/login', name: 'login', component: LoginView },
  {
    path: '/requests',
    name: 'requests',
    component: () => import('@/views/requester/RequestsList.vue'),
    meta: { role: 'requester' },
  },
  {
    path: '/requests/new',
    name: 'requests-new',
    component: () => import('@/views/requester/RequestForm.vue'),
    meta: { role: 'requester' },
  },
  {
    path: '/requests/:id',
    name: 'requests-detail',
    component: () => import('@/views/requester/RequestDetail.vue'),
    meta: { role: 'requester' },
  },
  {
  path: '/approvals',
  name: 'approvals',
  component: () => import('@/views/approver/ApprovalsList.vue'),
  meta: { role: 'approver' },
},
{
  path: '/approvals/:id',
  name: 'approvals-detail',
  component: () => import('@/views/approver/ApprovalDetail.vue'),
  meta: { role: 'approver' },
},
{
  path: '/price-edits',
  name: 'price-edits',
  component: () => import('@/views/price-editor/PriceEditsList.vue'),
  meta: { role: 'price_editor' },
},
{
  path: '/price-edits/:id',
  name: 'price-edits-detail',
  component: () => import('@/views/price-editor/PriceEditDetail.vue'),
  meta: { role: 'price_editor' },
},
{
  path: '/admin',
  name: 'admin',
  component: () => import('@/views/admin/AdminOverview.vue'),
  meta: { role: 'admin' },
},
{
  path: '/search',
  name: 'search',
  component: () => import('@/views/search/SearchPage.vue'),
  meta: { roles: ['admin', 'price_editor', 'approver'] },
},
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.name === 'login') return next();

  if (!authStore.isAuthenticated) {
    return next({ name: 'login' });
  }

  if (to.meta.roles && !to.meta.roles.includes(authStore.role)) {
    return next({ name: 'login' });
  }

  if (to.meta.role && to.meta.role !== authStore.role) {
    return next({ name: 'login' });
  }

  next();
});

export default router;