import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';

const routes = [
  { path: '/login', component: () => import('../views/LoginView.vue'), meta: { public: true } },
  { path: '/', component: () => import('../views/HomeView.vue') },
  { path: '/scan', component: () => import('../views/ScanView.vue') },
  { path: '/bevestiging', component: () => import('../views/ConfirmView.vue') },
  { path: '/winkels', component: () => import('../views/StoresView.vue') },
  { path: '/winkel/:id', component: () => import('../views/StoreView.vue') },
  { path: '/presets', component: () => import('../views/PresetsView.vue') },
  { path: '/statistieken', component: () => import('../views/StatisticsView.vue') },
  { path: '/bon/:id', component: () => import('../views/ReceiptDetailView.vue') },
];

const router = createRouter({
  history: createWebHistory(),
  routes
});

router.beforeEach((to, from, next) => {
  const auth = useAuthStore();
  if (!to.meta.public && !auth.isLoggedIn) {
    next('/login');
  } else {
    next();
  }
});

export default router;
