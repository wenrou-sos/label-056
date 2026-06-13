<template>
  <n-config-provider :theme="theme" :locale="zhCN" :date-locale="dateZhCN">
    <n-notification-provider>
      <n-message-provider>
        <n-dialog-provider>
          <div class="app-container" :class="{ 'mobile-layout': isMobile }">
            <n-layout v-if="!isMobile" has-sider style="height: 100vh">
              <n-layout-sider
                bordered
                :width="220"
                :collapsed-width="64"
                collapse-mode="width"
                :collapsed="collapsed"
                show-trigger
                @collapse="collapsed = true"
                @expand="collapsed = false"
              >
                <div class="sider-header">
                  <span v-if="!collapsed" class="sider-title">🔥 消防巡检</span>
                  <span v-else class="sider-title">🔥</span>
                </div>
                <n-menu
                  :collapsed="collapsed"
                  :collapsed-width="64"
                  :collapsed-icon-size="22"
                  :options="menuOptions"
                  :value="currentRoute"
                  @update:value="handleMenuSelect"
                />
              </n-layout-sider>
              <n-layout>
                <n-layout-header bordered style="height: 56px; display: flex; align-items: center; padding: 0 24px; justify-content: space-between">
                  <n-breadcrumb>
                    <n-breadcrumb-item>{{ currentPageTitle }}</n-breadcrumb-item>
                  </n-breadcrumb>
                  <n-space>
                    <n-tag type="success" size="small">系统运行中</n-tag>
                  </n-space>
                </n-layout-header>
                <n-layout-content content-style="padding: 20px;" style="height: calc(100vh - 56px); overflow: auto">
                  <router-view />
                </n-layout-content>
              </n-layout>
            </n-layout>

            <template v-else>
              <div class="mobile-content" style="height: calc(100vh - 56px); overflow: auto; padding: 12px">
                <router-view />
              </div>
              <n-tab-bar
                :options="mobileTabs"
                :value="currentMobileTab"
                @update:value="handleMobileTab"
                style="position: fixed; bottom: 0; width: 100%; border-top: 1px solid #e0e0e0"
              />
            </template>
          </div>
        </n-dialog-provider>
      </n-message-provider>
    </n-notification-provider>
  </n-config-provider>
</template>

<script setup>
import { ref, computed, h } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { zhCN, dateZhCN } from 'naive-ui'
import {
  HomeOutline,
  ConstructOutline,
  MapOutline,
  ClipboardOutline,
  WarningOutline,
  NotificationsOutline
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)

const isMobile = computed(() => window.innerWidth < 768)

const theme = ref(null)

function renderIcon(icon) {
  return () => h(icon)
}

const menuOptions = [
  { label: '首页概览', key: 'dashboard', icon: renderIcon(HomeOutline) },
  { label: '设备台账', key: 'devices', icon: renderIcon(ConstructOutline) },
  { label: '巡检路线', key: 'routes', icon: renderIcon(MapOutline) },
  { label: '巡检任务', key: 'tasks', icon: renderIcon(ClipboardOutline) },
  { label: '隐患管理', key: 'hazards', icon: renderIcon(WarningOutline) },
  { label: '到期提醒', key: 'reminders', icon: renderIcon(NotificationsOutline) }
]

const mobileTabs = [
  { label: '首页', key: 'dashboard' },
  { label: '设备', key: 'devices' },
  { label: '巡检', key: 'tasks' },
  { label: '扫码', key: 'scan' },
  { label: '隐患', key: 'hazards' }
]

const currentRoute = computed(() => route.name)
const currentMobileTab = computed(() => route.name || 'dashboard')

const currentPageTitle = computed(() => {
  const titles = {
    dashboard: '首页概览',
    devices: '设备台账',
    routes: '巡检路线',
    tasks: '巡检任务',
    scan: '扫码巡检',
    hazards: '隐患管理',
    reminders: '到期提醒'
  }
  return titles[route.name] || '消防巡检系统'
})

function handleMenuSelect(key) {
  router.push({ name: key })
}

function handleMobileTab(key) {
  router.push({ name: key })
}
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.sider-header {
  height: 56px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid var(--n-border-color);
}

.sider-title {
  font-size: 16px;
  font-weight: 600;
  color: #e04040;
}

.app-container {
  min-height: 100vh;
}

.mobile-layout {
  background: #f5f5f5;
}

.mobile-content {
  background: #f5f5f5;
}
</style>
