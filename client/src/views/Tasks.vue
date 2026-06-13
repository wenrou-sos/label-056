<template>
  <n-space vertical :size="16">
    <n-card>
      <n-space justify="space-between" align="center">
        <n-space :size="12" align="center">
          <n-select
            v-model:value="filterStatus"
            :options="statusOptions"
            style="width: 140px"
            @update:value="fetchTasks"
          />
          <n-select
            v-model:value="filterShift"
            :options="shiftOptions"
            style="width: 140px"
            @update:value="fetchTasks"
          />
          <n-date-picker
            v-model:value="filterDate"
            type="date"
            clearable
            style="width: 160px"
            @update:value="fetchTasks"
          />
        </n-space>
        <n-button type="primary" @click="handleGenerate" :loading="generating">
          生成今日任务
        </n-button>
      </n-space>
    </n-card>

    <n-card>
      <n-data-table
        :columns="columns"
        :data="tasks"
        :loading="loading"
        :row-props="rowProps"
        striped
      />
    </n-card>
  </n-space>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NButton, NTag, NSpace, useMessage } from 'naive-ui'
import api from '../api/index.js'

const router = useRouter()
const message = useMessage()

const statusLabels = {
  PENDING: '待执行',
  IN_PROGRESS: '进行中',
  COMPLETED: '已完成'
}

const statusColors = {
  PENDING: 'default',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success'
}

const shiftLabels = {
  MORNING: '早班',
  AFTERNOON: '中班',
  NIGHT: '夜班'
}

const statusOptions = [
  { label: '全部', value: 'ALL' },
  { label: '待执行', value: 'PENDING' },
  { label: '进行中', value: 'IN_PROGRESS' },
  { label: '已完成', value: 'COMPLETED' }
]

const shiftOptions = [
  { label: '全部', value: 'ALL' },
  { label: '早班', value: 'MORNING' },
  { label: '中班', value: 'AFTERNOON' },
  { label: '夜班', value: 'NIGHT' }
]

const tasks = ref([])
const loading = ref(false)
const generating = ref(false)
const filterStatus = ref('ALL')
const filterShift = ref('ALL')
const filterDate = ref(null)

const columns = [
  {
    title: '路线名称',
    key: 'route',
    render: (row) => row.route?.name || '-'
  },
  {
    title: '班次',
    key: 'shift',
    width: 100,
    render: (row) => shiftLabels[row.shift] || row.shift
  },
  {
    title: '任务日期',
    key: 'taskDate',
    width: 120,
    render: (row) => row.taskDate ? new Date(row.taskDate).toLocaleDateString() : '-'
  },
  {
    title: '状态',
    key: 'status',
    width: 100,
    render: (row) => h(NTag, { type: statusColors[row.status], size: 'small' }, () => statusLabels[row.status] || row.status)
  },
  {
    title: '检查人',
    key: 'inspector',
    width: 100,
    render: (row) => row.inspector || '-'
  },
  {
    title: '进度',
    key: 'progress',
    width: 120,
    render: (row) => {
      const total = row.route?.devices?.length || 0
      const checked = row.records?.length || 0
      return `${checked}/${total}`
    }
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    render: (row) => h(NButton, { size: 'small', type: 'primary', onClick: () => goDetail(row.id) }, () => '查看详情')
  }
]

function rowProps(row) {
  return {
    style: 'cursor: pointer',
    onClick: () => goDetail(row.id)
  }
}

function goDetail(id) {
  router.push(`/tasks/${id}`)
}

async function fetchTasks() {
  loading.value = true
  try {
    const params = {}
    if (filterStatus.value !== 'ALL') params.status = filterStatus.value
    if (filterShift.value !== 'ALL') params.shift = filterShift.value
    if (filterDate.value) params.date = new Date(filterDate.value).toISOString().slice(0, 10)
    const data = await api.get('/tasks', { params })
    tasks.value = data
  } catch (err) {
    message.error(err.message || '获取任务列表失败')
  } finally {
    loading.value = false
  }
}

async function handleGenerate() {
  generating.value = true
  try {
    await api.post('/tasks/generate')
    message.success('今日任务已生成')
    await fetchTasks()
  } catch (err) {
    message.error(err.message || '生成任务失败')
  } finally {
    generating.value = false
  }
}

onMounted(() => {
  fetchTasks()
})
</script>
