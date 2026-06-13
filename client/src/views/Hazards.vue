<template>
  <div>
    <n-space justify="space-between" align="center" style="margin-bottom: 16px">
      <n-space>
        <n-button
          v-for="s in statusOptions"
          :key="s.value"
          :type="currentStatus === s.value ? 'primary' : 'default'"
          @click="currentStatus = s.value; fetchHazards()"
        >
          {{ s.label }}
        </n-button>
      </n-space>
      <n-button type="primary" @click="showCreateDialog = true">新建隐患</n-button>
    </n-space>

    <n-data-table :columns="columns" :data="hazards" :loading="loading" :bordered="false" />

    <n-modal v-model:show="showCreateDialog" preset="dialog" title="新建隐患" positive-text="提交" negative-text="取消" @positive-click="handleCreate">
      <n-form ref="createFormRef" :model="createForm">
        <n-form-item label="标题" path="title">
          <n-input v-model:value="createForm.title" placeholder="请输入隐患标题" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="createForm.description" type="textarea" placeholder="请输入隐患描述" />
        </n-form-item>
        <n-form-item label="设备" path="deviceId">
          <n-select v-model:value="createForm.deviceId" :options="deviceOptions" placeholder="请选择设备" />
        </n-form-item>
      </n-form>
    </n-modal>

    <n-modal v-model:show="showAssignDialog" preset="dialog" title="派单" positive-text="确认" negative-text="取消" @positive-click="handleAssign">
      <n-form-item label="派单人">
        <n-input v-model:value="assignForm.assignee" placeholder="请输入派单人" />
      </n-form-item>
    </n-modal>

    <n-modal v-model:show="showRepairDialog" preset="dialog" title="修复" positive-text="确认" negative-text="取消" @positive-click="handleRepair">
      <n-form-item label="维修说明">
        <n-input v-model:value="repairForm.repairRemark" type="textarea" placeholder="请输入维修说明" />
      </n-form-item>
      <n-form-item label="维修照片URL">
        <n-input v-model:value="repairForm.repairPhotoUrl" placeholder="请输入维修照片URL" />
      </n-form-item>
    </n-modal>

    <n-modal v-model:show="showAcceptDialog" preset="dialog" title="验收" positive-text="确认" negative-text="取消" @positive-click="handleAccept">
      <n-form-item label="验收人">
        <n-input v-model:value="acceptForm.acceptor" placeholder="请输入验收人" />
      </n-form-item>
      <n-form-item label="验收说明">
        <n-input v-model:value="acceptForm.acceptRemark" type="textarea" placeholder="请输入验收说明" />
      </n-form-item>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted, h } from 'vue'
import { NTag, NButton, NSpace, useMessage } from 'naive-ui'
import api from '../api/index.js'

const message = useMessage()
const loading = ref(false)
const hazards = ref([])
const currentStatus = ref('ALL')
const devices = ref([])

const showCreateDialog = ref(false)
const showAssignDialog = ref(false)
const showRepairDialog = ref(false)
const showAcceptDialog = ref(false)
const currentHazardId = ref(null)

const createForm = reactive({ title: '', description: '', deviceId: null })
const assignForm = reactive({ assignee: '' })
const repairForm = reactive({ repairRemark: '', repairPhotoUrl: '' })
const acceptForm = reactive({ acceptor: '', acceptRemark: '' })

const statusOptions = [
  { label: '全部', value: 'ALL' },
  { label: '待派单', value: 'PENDING_ASSIGN' },
  { label: '维修中', value: 'REPAIRING' },
  { label: '已修复', value: 'REPAIRED' },
  { label: '验收通过', value: 'ACCEPTED' }
]

const statusMap = {
  PENDING_ASSIGN: { text: '待派单', type: 'warning' },
  REPAIRING: { text: '维修中', type: 'info' },
  REPAIRED: { text: '已修复', type: 'success' },
  ACCEPTED: { text: '验收通过', type: 'default' }
}

const deviceOptions = ref([])

const columns = [
  { title: '标题', key: 'title', ellipsis: { tooltip: true } },
  { title: '设备编号', key: 'deviceId', width: 100 },
  { title: '设备位置', key: 'deviceLocation', width: 120, render: (row) => row.Device?.location || '-' },
  {
    title: '状态', key: 'status', width: 100,
    render: (row) => h(NTag, { type: statusMap[row.status]?.type, size: 'small' }, { default: () => statusMap[row.status]?.text || row.status })
  },
  { title: '派单人', key: 'assignee', width: 80, render: (row) => row.assignee || '-' },
  { title: '维修说明', key: 'repairRemark', width: 140, ellipsis: { tooltip: true }, render: (row) => row.repairRemark || '-' },
  { title: '验收人', key: 'acceptor', width: 80, render: (row) => row.acceptor || '-' },
  { title: '创建时间', key: 'createdAt', width: 160 },
  {
    title: '操作', key: 'actions', width: 100, fixed: 'right',
    render: (row) => {
      if (row.status === 'PENDING_ASSIGN') {
        return h(NButton, { size: 'small', type: 'primary', onClick: () => openAssignDialog(row) }, { default: () => '派单' })
      }
      if (row.status === 'REPAIRING') {
        return h(NButton, { size: 'small', type: 'info', onClick: () => openRepairDialog(row) }, { default: () => '修复' })
      }
      if (row.status === 'REPAIRED') {
        return h(NButton, { size: 'small', type: 'success', onClick: () => openAcceptDialog(row) }, { default: () => '验收' })
      }
      if (row.status === 'ACCEPTED') {
        return h(NTag, { type: 'default', size: 'small' }, { default: () => '已通过' })
      }
      return null
    }
  }
]

async function fetchHazards() {
  loading.value = true
  try {
    const params = {}
    if (currentStatus.value !== 'ALL') params.status = currentStatus.value
    const data = await api.get('/hazards', { params })
    hazards.value = Array.isArray(data) ? data : data.rows || data.data || []
  } catch (e) {
    message.error(e.message || '获取隐患列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchDevices() {
  try {
    const data = await api.get('/devices')
    const list = Array.isArray(data) ? data : data.rows || data.data || []
    devices.value = list
    deviceOptions.value = list.map(d => ({ label: d.code, value: d.id }))
  } catch (e) {
    message.error(e.message || '获取设备列表失败')
  }
}

function openAssignDialog(row) {
  currentHazardId.value = row.id
  assignForm.assignee = ''
  showAssignDialog.value = true
}

function openRepairDialog(row) {
  currentHazardId.value = row.id
  repairForm.repairRemark = ''
  repairForm.repairPhotoUrl = ''
  showRepairDialog.value = true
}

function openAcceptDialog(row) {
  currentHazardId.value = row.id
  acceptForm.acceptor = ''
  acceptForm.acceptRemark = ''
  showAcceptDialog.value = true
}

async function handleCreate() {
  if (!createForm.title || !createForm.deviceId) {
    message.warning('请填写必填项')
    return false
  }
  try {
    await api.post('/hazards', { title: createForm.title, description: createForm.description, deviceId: createForm.deviceId })
    message.success('新建隐患成功')
    createForm.title = ''
    createForm.description = ''
    createForm.deviceId = null
    fetchHazards()
  } catch (e) {
    message.error(e.message || '新建隐患失败')
    return false
  }
}

async function handleAssign() {
  if (!assignForm.assignee) {
    message.warning('请输入派单人')
    return false
  }
  try {
    await api.put(`/hazards/${currentHazardId.value}/assign`, { assignee: assignForm.assignee })
    message.success('派单成功')
    fetchHazards()
  } catch (e) {
    message.error(e.message || '派单失败')
    return false
  }
}

async function handleRepair() {
  if (!repairForm.repairRemark) {
    message.warning('请输入维修说明')
    return false
  }
  try {
    await api.put(`/hazards/${currentHazardId.value}/repair`, { repairRemark: repairForm.repairRemark, repairPhotoUrl: repairForm.repairPhotoUrl })
    message.success('修复提交成功')
    fetchHazards()
  } catch (e) {
    message.error(e.message || '修复提交失败')
    return false
  }
}

async function handleAccept() {
  if (!acceptForm.acceptor) {
    message.warning('请输入验收人')
    return false
  }
  try {
    await api.put(`/hazards/${currentHazardId.value}/accept`, { acceptor: acceptForm.acceptor, acceptRemark: acceptForm.acceptRemark })
    message.success('验收成功')
    fetchHazards()
  } catch (e) {
    message.error(e.message || '验收失败')
    return false
  }
}

onMounted(() => {
  fetchHazards()
  fetchDevices()
})
</script>
