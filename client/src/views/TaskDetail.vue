<template>
  <n-space vertical :size="16">
    <n-card>
      <n-space justify="space-between" align="center">
        <n-button text @click="router.push('/tasks')">
          ← 返回任务列表
        </n-button>
      </n-space>
    </n-card>

    <n-card title="任务信息">
      <template v-if="task">
        <n-descriptions :column="3" bordered>
          <n-descriptions-item label="路线名称">{{ task.route?.name || '-' }}</n-descriptions-item>
          <n-descriptions-item label="班次">{{ shiftLabels[task.shift] || task.shift }}</n-descriptions-item>
          <n-descriptions-item label="任务日期">{{ task.taskDate ? new Date(task.taskDate).toLocaleDateString() : '-' }}</n-descriptions-item>
          <n-descriptions-item label="状态">
            <n-tag :type="statusColors[task.status]" size="small">{{ statusLabels[task.status] || task.status }}</n-tag>
          </n-descriptions-item>
          <n-descriptions-item label="检查人">{{ task.inspector || '-' }}</n-descriptions-item>
          <n-descriptions-item label="进度">
            {{ checkedCount }}/{{ totalDevices }}
          </n-descriptions-item>
        </n-descriptions>

        <n-space style="margin-top: 16px" :size="12">
          <template v-if="task.status === 'PENDING'">
            <n-input v-model:value="inspectorName" placeholder="请输入检查人姓名" style="width: 200px" />
            <n-button type="primary" @click="handleStart" :loading="actionLoading" :disabled="!inspectorName.trim()">
              开始巡检
            </n-button>
          </template>
          <template v-if="task.status === 'IN_PROGRESS'">
            <n-button type="success" @click="handleComplete" :loading="actionLoading">
              完成巡检
            </n-button>
          </template>
        </n-space>
      </template>
      <n-spin v-else />
    </n-card>

    <n-card title="设备清单">
      <n-data-table
        v-if="task"
        :columns="deviceColumns"
        :data="deviceList"
        striped
      />
      <n-spin v-else />
    </n-card>
  </n-space>
</template>

<script setup>
import { ref, computed, h, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { NTag, NButton, useMessage, useDialog } from 'naive-ui'
import api from '../api/index.js'

const router = useRouter()
const route = useRoute()
const message = useMessage()
const dialog = useDialog()

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

const resultLabels = {
  NORMAL: '正常',
  ABNORMAL: '异常',
  EXPIRED: '已过期',
  DAMAGED: '损坏'
}

const resultColors = {
  NORMAL: 'success',
  ABNORMAL: 'error',
  EXPIRED: 'warning',
  DAMAGED: 'error'
}

const deviceTypeLabels = {
  FIRE_HYDRANT: '消火栓',
  FIRE_EXTINGUISHER: '灭火器',
  SMOKE_DETECTOR: '烟感探测器',
  SPRINKLER: '喷淋头',
  EMERGENCY_LIGHT: '应急灯'
}

const task = ref(null)
const inspectorName = ref('')
const actionLoading = ref(false)

const totalDevices = computed(() => task.value?.route?.devices?.length || 0)
const checkedCount = computed(() => task.value?.records?.length || 0)

const recordsMap = computed(() => {
  const map = {}
  if (task.value?.records) {
    for (const r of task.value.records) {
      map[r.deviceId] = r
    }
  }
  return map
})

const deviceList = computed(() => {
  if (!task.value?.route?.devices) return []
  return task.value.route.devices.map(rd => ({
    ...rd,
    device: rd.device,
    record: recordsMap.value[rd.deviceId] || null
  }))
})

const deviceColumns = [
  {
    title: '序号',
    key: 'orderIndex',
    width: 70,
    render: (row) => row.orderIndex
  },
  {
    title: '设备编码',
    key: 'code',
    render: (row) => row.device?.code || '-'
  },
  {
    title: '设备类型',
    key: 'type',
    render: (row) => deviceTypeLabels[row.device?.type] || row.device?.type || '-'
  },
  {
    title: '位置',
    key: 'location',
    render: (row) => row.device?.location || '-'
  },
  {
    title: '巡检状态',
    key: 'inspectStatus',
    width: 120,
    render: (row) => {
      if (row.record) {
        return h(NTag, { type: 'success', size: 'small' }, () => '已巡检')
      }
      return h(NTag, { type: 'default', size: 'small' }, () => '未巡检')
    }
  },
  {
    title: '巡检结果',
    key: 'result',
    width: 120,
    render: (row) => {
      if (row.record) {
        return h(NTag, { type: resultColors[row.record.result] || 'default', size: 'small' }, () => resultLabels[row.record.result] || row.record.result)
      }
      return '-'
    }
  },
  {
    title: '操作',
    key: 'action',
    width: 100,
    render: (row) => {
      if (row.record) return '-'
      return h(NButton, { size: 'small', type: 'primary', onClick: () => goInspect(row.device?.code) }, () => '巡检')
    }
  }
]

function goInspect(deviceCode) {
  if (deviceCode) {
    router.push(`/scan/${deviceCode}`)
  }
}

async function fetchTask() {
  try {
    const data = await api.get(`/tasks/${route.params.id}`)
    task.value = data
  } catch (err) {
    message.error(err.message || '获取任务详情失败')
  }
}

async function handleStart() {
  if (!inspectorName.value.trim()) return
  actionLoading.value = true
  try {
    await api.post(`/tasks/${route.params.id}/start`, { inspector: inspectorName.value.trim() })
    message.success('巡检已开始')
    await fetchTask()
  } catch (err) {
    message.error(err.message || '操作失败')
  } finally {
    actionLoading.value = false
  }
}

async function handleComplete() {
  dialog.warning({
    title: '确认完成',
    content: '确定要完成此巡检任务吗？',
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      actionLoading.value = true
      try {
        await api.post(`/tasks/${route.params.id}/complete`)
        message.success('巡检已完成')
        await fetchTask()
      } catch (err) {
        message.error(err.message || '操作失败')
      } finally {
        actionLoading.value = false
      }
    }
  })
}

onMounted(() => {
  fetchTask()
})
</script>
