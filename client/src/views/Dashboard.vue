<template>
  <div class="dashboard">
    <n-grid :x-gap="16" :y-gap="16" :cols="4" responsive="screen" item-responsive>
      <n-gi span="4 m:1">
        <n-card class="stat-card stat-blue">
          <div class="stat-content">
            <div class="stat-label">设备总数</div>
            <div class="stat-value">{{ stats.totalDevices }}</div>
          </div>
          <n-icon size="40" color="#2080f0">
            <ConstructOutline />
          </n-icon>
        </n-card>
      </n-gi>
      <n-gi span="4 m:1">
        <n-card class="stat-card stat-green">
          <div class="stat-content">
            <div class="stat-label">今日任务</div>
            <div class="stat-value">{{ stats.todayTasks }}</div>
          </div>
          <n-icon size="40" color="#18a058">
            <ClipboardOutline />
          </n-icon>
        </n-card>
      </n-gi>
      <n-gi span="4 m:1">
        <n-card class="stat-card stat-orange">
          <div class="stat-content">
            <div class="stat-label">活跃隐患</div>
            <div class="stat-value">{{ stats.activeHazards }}</div>
          </div>
          <n-icon size="40" color="#f0a020">
            <WarningOutline />
          </n-icon>
        </n-card>
      </n-gi>
      <n-gi span="4 m:1">
        <n-card class="stat-card stat-red">
          <div class="stat-content">
            <div class="stat-label">到期提醒</div>
            <div class="stat-value">{{ stats.expiringReminders }}</div>
          </div>
          <n-icon size="40" color="#d03050">
            <NotificationsOutline />
          </n-icon>
        </n-card>
      </n-gi>
    </n-grid>

    <n-grid :x-gap="16" :y-gap="16" :cols="2" responsive="screen" item-responsive style="margin-top: 16px">
      <n-gi span="2 m:1">
        <n-card title="到期提醒">
          <template #header-extra>
            <n-badge v-if="expiredDevices.length" :value="expiredDevices.length" type="danger">
              <n-tag size="small" type="error">已过期</n-tag>
            </n-badge>
          </template>
          <n-spin :show="loading.reminders">
            <n-empty v-if="!expiringDevices.length && !cleanRemindDevices.length && !expiredDevices.length" description="暂无到期提醒" />
            <template v-else>
              <div v-if="expiredDevices.length" class="reminder-section">
                <n-tag type="error" size="small" style="margin-bottom: 8px">已过期设备</n-tag>
                <n-list bordered size="small">
                  <n-list-item v-for="device in expiredDevices" :key="device.id">
                    <n-thing>
                      <template #header>
                        <n-text type="error">{{ device.code }}</n-text>
                        <n-tag size="tiny" type="error" style="margin-left: 8px">已过期</n-tag>
                      </template>
                      <template #description>
                        <n-text depth="3">
                          {{ deviceTypeLabels[device.type] }} · {{ device.location }}
                        </n-text>
                      </template>
                      <template #footer>
                        <n-text type="error" style="font-size: 12px">
                          {{ getExpireLabel(device) }}: {{ formatDate(getExpireDate(device)) }}
                        </n-text>
                      </template>
                    </n-thing>
                  </n-list-item>
                </n-list>
              </div>
              <div v-if="expiringDevices.length" class="reminder-section">
                <n-tag type="warning" size="small" style="margin-bottom: 8px">7日内到期</n-tag>
                <n-list bordered size="small">
                  <n-list-item v-for="device in expiringDevices" :key="device.id">
                    <n-thing>
                      <template #header>
                        {{ device.code }}
                        <n-tag size="tiny" type="warning" style="margin-left: 8px">即将到期</n-tag>
                      </template>
                      <template #description>
                        <n-text depth="3">
                          {{ deviceTypeLabels[device.type] }} · {{ device.location }}
                        </n-text>
                      </template>
                      <template #footer>
                        <n-text type="warning" style="font-size: 12px">
                          {{ getExpireLabel(device) }}: {{ formatDate(getExpireDate(device)) }}
                        </n-text>
                      </template>
                    </n-thing>
                  </n-list-item>
                </n-list>
              </div>
              <div v-if="cleanRemindDevices.length" class="reminder-section">
                <n-tag type="info" size="small" style="margin-bottom: 8px">烟感清洗提醒</n-tag>
                <n-list bordered size="small">
                  <n-list-item v-for="device in cleanRemindDevices" :key="device.id">
                    <n-thing>
                      <template #header>
                        {{ device.code }}
                        <n-tag size="tiny" type="info" style="margin-left: 8px">需清洗</n-tag>
                      </template>
                      <template #description>
                        <n-text depth="3">
                          {{ deviceTypeLabels[device.type] }} · {{ device.location }}
                        </n-text>
                      </template>
                      <template #footer>
                        <n-text type="info" style="font-size: 12px">
                          下次清洗: {{ formatDate(device.nextCleanDate) }}
                        </n-text>
                      </template>
                    </n-thing>
                  </n-list-item>
                </n-list>
              </div>
            </template>
          </n-spin>
        </n-card>
      </n-gi>

      <n-gi span="2 m:1">
        <n-card title="今日巡检任务">
          <template #header-extra>
            <n-tag size="small" type="info">{{ currentShiftLabel }}</n-tag>
          </template>
          <n-spin :show="loading.tasks">
            <n-empty v-if="!currentTasks.length" description="当前班次无巡检任务" />
            <n-list v-else bordered size="small">
              <n-list-item v-for="task in currentTasks" :key="task.id">
                <n-thing>
                  <template #header>
                    {{ task.route?.name || '未知路线' }}
                  </template>
                  <template #description>
                    <n-text depth="3">
                      {{ shiftLabels[task.shift] }} · {{ task.route?.devices?.length || 0 }}个设备
                    </n-text>
                  </template>
                  <template #footer>
                    <n-space>
                      <n-tag :type="taskStatusType(task.status)" size="small">
                        {{ taskStatusLabels[task.status] }}
                      </n-tag>
                      <n-text depth="3" style="font-size: 12px">
                        {{ formatDate(task.taskDate) }}
                      </n-text>
                    </n-space>
                  </template>
                  <template #action>
                    <n-button
                      v-if="task.status === 'PENDING'"
                      type="primary"
                      size="small"
                      @click="goToTask(task.id)"
                    >
                      开始巡检
                    </n-button>
                    <n-button
                      v-else-if="task.status === 'IN_PROGRESS'"
                      type="info"
                      size="small"
                      @click="goToTask(task.id)"
                    >
                      继续巡检
                    </n-button>
                    <n-button
                      v-else
                      size="small"
                      @click="goToTask(task.id)"
                    >
                      查看详情
                    </n-button>
                  </template>
                </n-thing>
              </n-list-item>
            </n-list>
          </n-spin>
        </n-card>
      </n-gi>
    </n-grid>

    <n-card title="近期隐患" style="margin-top: 16px">
      <n-spin :show="loading.hazards">
        <n-empty v-if="!pendingHazards.length" description="暂无待处理隐患" />
        <n-data-table
          v-else
          :columns="hazardColumns"
          :data="pendingHazards"
          :bordered="false"
          size="small"
          :scroll-x="600"
        />
      </n-spin>
    </n-card>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { NTag, NButton } from 'naive-ui'
import {
  ConstructOutline,
  ClipboardOutline,
  WarningOutline,
  NotificationsOutline
} from '@vicons/ionicons5'
import api from '../api/index.js'

const router = useRouter()

const deviceTypeLabels = {
  FIRE_HYDRANT: '消火栓',
  FIRE_EXTINGUISHER: '灭火器',
  SMOKE_DETECTOR: '烟感探测器',
  SPRINKLER: '喷淋头',
  EMERGENCY_LIGHT: '应急灯'
}

const hazardStatusLabels = {
  PENDING_ASSIGN: '待派单',
  REPAIRING: '维修中',
  REPAIRED: '已修复',
  ACCEPTED: '验收通过'
}

const shiftLabels = {
  MORNING: '早班',
  AFTERNOON: '中班',
  NIGHT: '夜班'
}

const taskStatusLabels = {
  PENDING: '待执行',
  IN_PROGRESS: '执行中',
  COMPLETED: '已完成'
}

const stats = reactive({
  totalDevices: 0,
  todayTasks: 0,
  activeHazards: 0,
  expiringReminders: 0
})

const loading = reactive({
  reminders: false,
  tasks: false,
  hazards: false
})

const expiringDevices = ref([])
const cleanRemindDevices = ref([])
const expiredDevices = ref([])
const currentTasks = ref([])
const pendingHazards = ref([])

const currentShiftLabel = ref('')

const getShiftForTime = () => {
  const hour = new Date().getHours()
  if (hour >= 6 && hour < 14) return 'MORNING'
  if (hour >= 14 && hour < 22) return 'AFTERNOON'
  return 'NIGHT'
}

const taskStatusType = (status) => {
  const map = { PENDING: 'default', IN_PROGRESS: 'info', COMPLETED: 'success' }
  return map[status] || 'default'
}

const formatDate = (dateStr) => {
  if (!dateStr) return '-'
  const d = new Date(dateStr)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const getExpireDate = (device) => {
  const now = new Date()
  if (device.expireDate && new Date(device.expireDate) < now) return device.expireDate
  if (device.pressureExpireDate && new Date(device.pressureExpireDate) < now) return device.pressureExpireDate
  if (device.expireDate && new Date(device.expireDate) >= now) return device.expireDate
  return device.pressureExpireDate
}

const getExpireLabel = (device) => {
  if (device.pressureExpireDate && device.type === 'FIRE_EXTINGUISHER') return '压力有效期'
  return '设备有效期'
}

const hazardColumns = [
  {
    title: '隐患标题',
    key: 'title',
    ellipsis: { tooltip: true }
  },
  {
    title: '关联设备',
    key: 'device',
    width: 160,
    render(row) {
      if (!row.device) return '-'
      return `${row.device.code}(${deviceTypeLabels[row.device.type] || row.device.type})`
    }
  },
  {
    title: '位置',
    key: 'location',
    width: 140,
    render(row) {
      return row.device?.location || '-'
    }
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render(row) {
      return h(NTag, { size: 'small', type: row.status === 'PENDING_ASSIGN' ? 'warning' : 'default' }, () => hazardStatusLabels[row.status] || row.status)
    }
  },
  {
    title: '发现时间',
    key: 'createdAt',
    width: 120,
    render(row) {
      return formatDate(row.createdAt)
    }
  },
  {
    title: '操作',
    key: 'actions',
    width: 80,
    render(row) {
      return h(NButton, { size: 'small', onClick: () => goToHazard(row.id) }, () => '处理')
    }
  }
]

function goToTask(taskId) {
  router.push({ name: 'task-detail', params: { id: taskId } })
}

function goToHazard(hazardId) {
  router.push({ name: 'hazards' })
}

async function fetchDevices() {
  try {
    const devices = await api.get('/devices')
    stats.totalDevices = Array.isArray(devices) ? devices.length : 0
  } catch (e) {
    console.error(e)
  }
}

async function fetchReminders() {
  loading.reminders = true
  try {
    const data = await api.get('/reminders')
    expiringDevices.value = data.expiringDevices || []
    cleanRemindDevices.value = data.cleanRemindDevices || []
    expiredDevices.value = data.expiredDevices || []
    stats.expiringReminders = expiringDevices.value.length + cleanRemindDevices.value.length + expiredDevices.value.length
  } catch (e) {
    console.error(e)
  } finally {
    loading.reminders = false
  }
}

async function fetchCurrentTasks() {
  loading.tasks = true
  try {
    const tasks = await api.get('/tasks/current')
    currentTasks.value = Array.isArray(tasks) ? tasks : []
    stats.todayTasks = currentTasks.value.length
    const shift = getShiftForTime()
    currentShiftLabel.value = shiftLabels[shift] || ''
  } catch (e) {
    console.error(e)
  } finally {
    loading.tasks = false
  }
}

async function fetchHazards() {
  loading.hazards = true
  try {
    const hazards = await api.get('/hazards', { params: { status: 'PENDING_ASSIGN' } })
    pendingHazards.value = Array.isArray(hazards) ? hazards : []
    stats.activeHazards = pendingHazards.value.length
  } catch (e) {
    console.error(e)
  } finally {
    loading.hazards = false
  }
}

onMounted(() => {
  fetchDevices()
  fetchReminders()
  fetchCurrentTasks()
  fetchHazards()
})
</script>

<style scoped>
.dashboard {
  max-width: 1200px;
}

.stat-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.stat-card :deep(.n-card__content) {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.stat-content {
  display: flex;
  flex-direction: column;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-bottom: 4px;
}

.stat-value {
  font-size: 28px;
  font-weight: 700;
  line-height: 1.2;
}

.stat-blue .stat-value { color: #2080f0; }
.stat-green .stat-value { color: #18a058; }
.stat-orange .stat-value { color: #f0a020; }
.stat-red .stat-value { color: #d03050; }

.reminder-section {
  margin-bottom: 16px;
}

.reminder-section:last-child {
  margin-bottom: 0;
}

@media (max-width: 768px) {
  .stat-value {
    font-size: 22px;
  }
}
</style>
