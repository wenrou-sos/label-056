import { createRouter, createWebHistory } from 'vue-router'

const routes = [
  {
    path: '/',
    name: 'dashboard',
    component: () => import('../views/Dashboard.vue')
  },
  {
    path: '/devices',
    name: 'devices',
    component: () => import('../views/Devices.vue')
  },
  {
    path: '/routes',
    name: 'routes',
    component: () => import('../views/Routes.vue')
  },
  {
    path: '/tasks',
    name: 'tasks',
    component: () => import('../views/Tasks.vue')
  },
  {
    path: '/tasks/:id',
    name: 'task-detail',
    component: () => import('../views/TaskDetail.vue')
  },
  {
    path: '/scan',
    name: 'scan',
    component: () => import('../views/Scan.vue')
  },
  {
    path: '/scan/:code',
    name: 'scan-inspect',
    component: () => import('../views/ScanInspect.vue')
  },
  {
    path: '/hazards',
    name: 'hazards',
    component: () => import('../views/Hazards.vue')
  },
  {
    path: '/reminders',
    name: 'reminders',
    component: () => import('../views/Reminders.vue')
  },
  {
    path: '/calendar',
    name: 'calendar',
    component: () => import('../views/Calendar.vue')
  }
]

const router = createRouter({
  history: createWebHistory(),
  routes
})

export default router
