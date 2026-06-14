<template>
  <div class="calendar-page">
    <n-space justify="space-between" align="center" style="margin-bottom: 16px">
      <n-space align="center">
        <span style="font-weight: 600; font-size: 14px">巡检日历</span>
        <n-tag size="small" type="success">已完成</n-tag>
        <n-tag size="small" type="warning">部分完成</n-tag>
        <n-tag size="small" type="error">未完成</n-tag>
        <n-tag size="small" type="default">无任务</n-tag>
      </n-space>
    </n-space>

    <n-spin :show="calendarLoading">
      <n-calendar
        v-model:value="currentDate"
        :is-date-disabled="isDateDisabled"
        @panel-change="handlePanelChange"
      >
        <template #default="{ year, month, date }">
          <div class="calendar-cell" @click.stop="selectDate(year, month, date)">
            <div class="cell-header">
              <span class="cell-date" :class="{ today: isTodayCell(year, month, date) }">
                {{ date }}
              </span>
              <n-tag
                v-if="getDayStatus(year, month, date) !== 'none'"
                :type="statusTagType(getDayStatus(year, month, date))"
                size="tiny"
                round
              >
                {{ getDayStatusLabel(year, month, date) }}
              </n-tag>
            </div>
            <div v-if="getDayTaskCount(year, month, date) > 0" class="cell-tasks">
              <div
                v-for="item in getDayShiftTasks(year, month, date)"
                :key="item.shift"
                class="shift-item"
                :class="item.status"
              >
                <span class="shift-dot"></span>
                <span class="shift-label">{{ shiftLabels[item.shift] }}</span>
                <span class="shift-progress">{{ item.checked }}/{{ item.total }}</span>
              </div>
            </div>
            <div v-else class="cell-no-task">
              <span>无任务</span>
            </div>
          </div>
        </template>
      </n-calendar>
    </n-spin>

    <n-modal
      v-model:show="showDetail"
      preset="card"
      :title="selectedDateTitle"
      style="width: 720px"
    >
      <n-spin :show="detailLoading">
        <template v-if="selectedDayTasks.length">
          <n-data-table
            :columns="taskColumns"
            :data="selectedDayTasks"
            :bordered="false"
            size="small"
            :pagination="false"
          />
        </template>
        <n-empty v-else description="当日暂无巡检任务" />
      </n-spin>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, h } from 'vue'
import { useRouter } from 'vue-router'
import { NTag, NButton, useMessage } from 'naive-ui'
import dayjs from 'dayjs'
import api from '../api/index.js'

const message = useMessage()
const router = useRouter()

const currentDate = ref(Date.now())
const calendarLoading = ref(false)
const detailLoading = ref(false)
const showDetail = ref(false)
const selectedDate = ref(null)
const tasksCache = ref({})

const shiftLabels = {
  MORNING: '早班',
  AFTERNOON: '中班',
  NIGHT: '夜班'
}

function buildDate(year, month, date) {
  return new Date(year, month - 1, date, 0, 0, 0, 0)
}

function isSameDay(d1, d2) {
  return d1 && d2 &&
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
}

function isTodayCell(year, month, date) {
  return isSameDay(buildDate(year, month, date), new Date())
}

function isDateDisabled() {
  return false
}

function handlePanelChange() {
  loadMonthTasks()
}

const selectedDateTitle = computed(() =>
  selectedDate.value
    ? `${dayjs(selectedDate.value).format('YYYY年MM月DD日')} 巡检任务`
    : '巡检任务'
)

const taskColumns = [
  { title: '路线名称', key: 'routeName', render: (row) => row.route?.name || '-' },
  {
    title: '班次', key: 'shift', width: 80,
    render: (row) => h(NTag, { type: shiftTagType(row.shift), size: 'small' }, () => shiftLabels[row.shift] || row.shift)
  },
  {
    title: '状态', key: 'status', width: 100,
    render: (row) => {
      const total = row.route?.devices?.length || 0
      const checked = row.records?.length || 0
      let type = 'default', text = '待执行'
      if (row.status === 'COMPLETED') { type = 'success'; text = '已完成' }
      else if (row.status === 'IN_PROGRESS' || (row.status === 'PENDING' && checked > 0)) { type = 'warning'; text = '进行中' }
      else if (row.status === 'PENDING') { type = 'error'; text = '未开始' }
      return h(NTag, { type, size: 'small' }, () => text)
    }
  },
  {
    title: '完成进度', key: 'progress', width: 120,
    render: (row) => {
      const total = row.route?.devices?.length || 0
      const checked = row.records?.length || 0
      return total > 0 ? `${checked}/${total}` : '-'
    }
  },
  { title: '检查人', key: 'inspector', width: 100, render: (row) => row.inspector || '-' },
  {
    title: '操作', key: 'action', width: 100,
    render: (row) => h(
      NButton,
      { size: 'small', type: 'primary', onClick: () => router.push({ name: 'task-detail', params: { id: row.id } }) },
      () => '查看详情'
    )
  }
]

function shiftTagType(shift) {
  const map = { MORNING: 'success', AFTERNOON: 'warning', NIGHT: 'info' }
  return map[shift] || 'default'
}

function getDateKey(year, month, date) {
  return dayjs(buildDate(year, month, date)).format('YYYY-MM-DD')
}

async function loadMonthTasks() {
  calendarLoading.value = true
  try {
    const d = new Date(currentDate.value)
    const year = d.getFullYear()
    const month = d.getMonth()
    const firstDay = new Date(year, month, 1)
    const lastDay = new Date(year, month + 1, 0)

    const data = await api.get('/tasks', {
      params: {
        dateStart: dayjs(firstDay).format('YYYY-MM-DD'),
        dateEnd: dayjs(lastDay).format('YYYY-MM-DD')
      }
    })
    const list = Array.isArray(data) ? data : data.rows || data.data || []

    const cache = {}
    for (const task of list) {
      const key = getDateKeyFromTask(task.taskDate)
      if (!cache[key]) cache[key] = []
      cache[key].push(task)
    }
    tasksCache.value = cache
  } catch (e) {
    message.error(e.message || '获取任务数据失败')
  } finally {
    calendarLoading.value = false
  }
}

function getDateKeyFromTask(taskDate) {
  const d = taskDate ? new Date(taskDate) : new Date()
  return dayjs(d).format('YYYY-MM-DD')
}

function getDayTasks(year, month, date) {
  const key = getDateKey(year, month, date)
  return tasksCache.value[key] || []
}

function getDayTaskCount(year, month, date) {
  return getDayTasks(year, month, date).length
}

function isTaskCompleted(task) {
  if (task.status === 'COMPLETED') return true
  const total = task.route?.devices?.length || 0
  const checked = task.records?.length || 0
  return total > 0 && checked === total
}

function getTaskProgress(task) {
  const total = task.route?.devices?.length || 0
  if (total === 0) return { total: 0, checked: 0 }
  if (task.status === 'COMPLETED') return { total, checked: total }
  return { total, checked: task.records?.length || 0 }
}

function isTaskStarted(task) {
  if (task.status === 'COMPLETED' || task.status === 'IN_PROGRESS') return true
  return (task.records?.length || 0) > 0
}

function getDayShiftTasks(year, month, date) {
  const tasks = getDayTasks(year, month, date)
  const shifts = ['MORNING', 'AFTERNOON', 'NIGHT']
  const result = []
  for (const shift of shifts) {
    const shiftTasks = tasks.filter(t => t.shift === shift)
    if (shiftTasks.length > 0) {
      let total = 0
      let checked = 0
      let allDone = true
      let anyStarted = false
      for (const t of shiftTasks) {
        const prog = getTaskProgress(t)
        total += prog.total
        checked += prog.checked
        if (isTaskCompleted(t) === false) allDone = false
        if (isTaskStarted(t)) anyStarted = true
      }
      let status = 'pending'
      if (allDone && total > 0) status = 'completed'
      else if (anyStarted) status = 'partial'
      result.push({ shift, total, checked, status })
    }
  }
  return result
}

function getDayStatus(year, month, date) {
  const tasks = getDayTasks(year, month, date)
  if (!tasks.length) return 'none'
  let allDone = true
  let anyStarted = false
  let hasTotal = false
  for (const t of tasks) {
    const prog = getTaskProgress(t)
    if (prog.total > 0) hasTotal = true
    if (isTaskCompleted(t) === false) allDone = false
    if (isTaskStarted(t)) anyStarted = true
  }
  if (!hasTotal) return 'none'
  if (allDone) return 'completed'
  if (anyStarted) return 'partial'
  return 'pending'
}

function getDayStatusLabel(year, month, date) {
  const map = { completed: '全完', partial: '部分', pending: '未开', none: '' }
  return map[getDayStatus(year, month, date)]
}

function statusTagType(status) {
  const map = { completed: 'success', partial: 'warning', pending: 'error', none: 'default' }
  return map[status] || 'default'
}

const selectedDayTasks = ref([])

async function selectDate(year, month, date) {
  const d = buildDate(year, month, date)
  selectedDate.value = d
  showDetail.value = true
  detailLoading.value = true
  try {
    const data = await api.get('/tasks', {
      params: { date: dayjs(d).format('YYYY-MM-DD') }
    })
    selectedDayTasks.value = Array.isArray(data) ? data : data.rows || data.data || []
  } catch (e) {
    message.error(e.message || '获取当天任务失败')
  } finally {
    detailLoading.value = false
  }
}

onMounted(() => {
  loadMonthTasks()
})
</script>

<style scoped>
.calendar-page {
  background: #fff;
  padding: 16px;
  border-radius: 8px;
}

:deep(.n-calendar-cell) {
  padding: 6px;
  min-height: 140px;
  cursor: default !important;
  display: block;
  align-items: normal;
  justify-content: normal;
  height: auto;
}

:deep(.n-calendar-date) {
  position: relative;
  z-index: 1;
}

.calendar-cell {
  width: 100%;
  cursor: pointer;
  transition: background 0.2s;
  border-radius: 6px;
  padding: 4px;
  margin-top: -18px;
}

.calendar-cell:hover {
  background: rgba(224, 64, 64, 0.06);
}

.cell-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 6px;
}

.cell-date {
  font-size: 14px;
  font-weight: 500;
  color: #333;
  display: inline-block;
  min-width: 20px;
}

.cell-date.today {
  background: #e04040;
  color: #fff;
  border-radius: 50%;
  width: 22px;
  height: 22px;
  line-height: 22px;
  text-align: center;
}

.cell-tasks {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.shift-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 2px 4px;
  border-radius: 3px;
  background: #f5f5f5;
}

.shift-item.completed {
  background: #e8f7ee;
  color: #18a058;
}

.shift-item.partial {
  background: #fff7e6;
  color: #f0a020;
}

.shift-item.pending {
  background: #fff1f0;
  color: #d03050;
}

.shift-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: currentColor;
  flex-shrink: 0;
}

.shift-label {
  flex-shrink: 0;
  min-width: 28px;
}

.shift-progress {
  margin-left: auto;
  font-variant-numeric: tabular-nums;
}

.cell-no-task {
  font-size: 11px;
  color: #bbb;
  padding-top: 20px;
  text-align: center;
}
</style>
