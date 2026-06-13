<template>
  <div>
    <n-card size="small" style="margin-bottom: 16px">
      <n-space align="center" :wrap="true">
        <n-select
          v-model:value="filter.type"
          :options="typeOptions"
          placeholder="设备类型"
          style="width: 160px"
          clearable
          @update:value="loadDevices"
        />
        <n-select
          v-model:value="filter.floor"
          :options="floorOptions"
          placeholder="所在楼层"
          style="width: 140px"
          clearable
          @update:value="loadDevices"
        />
        <n-select
          v-model:value="filter.status"
          :options="statusOptions"
          placeholder="设备状态"
          style="width: 140px"
          clearable
          @update:value="loadDevices"
        />
        <n-input
          v-model:value="filter.keyword"
          placeholder="搜索设备编号/位置"
          style="width: 200px"
          clearable
          @keyup.enter="loadDevices"
          @clear="loadDevices"
        />
        <n-button type="primary" @click="handleSearch">查询</n-button>
        <n-button @click="resetFilter">重置</n-button>
        <n-button type="primary" @click="openAddModal">
          <template #icon><n-icon><AddOutline /></n-icon></template>
          添加设备
        </n-button>
      </n-space>
    </n-card>

    <n-card>
      <n-data-table
        :columns="columns"
        :data="devices"
        :loading="loading"
        :bordered="false"
        :scroll-x="900"
      />
    </n-card>

    <n-modal
      v-model:show="formModalVisible"
      preset="dialog"
      :title="isEdit ? '编辑设备' : '添加设备'"
      :show-icon="false"
      style="width: 560px"
    >
      <n-form ref="formRef" :model="formData" :rules="formRules" label-placement="left" label-width="120px" style="margin-top: 16px">
        <n-form-item label="设备编号" path="code">
          <n-input v-model:value="formData.code" placeholder="请输入设备编号" />
        </n-form-item>
        <n-form-item label="设备类型" path="type">
          <n-select v-model:value="formData.type" :options="typeOptions.slice(1)" placeholder="请选择设备类型" />
        </n-form-item>
        <n-form-item label="所在楼层" path="floor">
          <n-select v-model:value="formData.floor" :options="floorOptions.slice(1)" placeholder="请选择楼层" />
        </n-form-item>
        <n-form-item label="具体位置" path="location">
          <n-input v-model:value="formData.location" placeholder="请输入具体位置" />
        </n-form-item>
        <n-form-item label="安装日期" path="installDate">
          <n-date-picker v-model:value="formData.installDate" type="date" style="width: 100%" />
        </n-form-item>
        <n-form-item label="有效期" path="expireDate">
          <n-date-picker v-model:value="formData.expireDate" type="date" style="width: 100%" />
        </n-form-item>
        <n-form-item v-if="formData.type === 'FIRE_EXTINGUISHER'" label="压力表有效期" path="pressureExpireDate">
          <n-date-picker v-model:value="formData.pressureExpireDate" type="date" style="width: 100%" />
        </n-form-item>
        <template v-if="formData.type === 'SMOKE_DETECTOR'">
          <n-form-item label="上次清洁日期" path="lastCleanDate">
            <n-date-picker v-model:value="formData.lastCleanDate" type="date" style="width: 100%" />
          </n-form-item>
          <n-form-item label="清洁周期(天)" path="cleanCycleDays">
            <n-input-number v-model:value="formData.cleanCycleDays" :min="1" style="width: 100%" />
          </n-form-item>
        </template>
      </n-form>
      <template #action>
        <n-button @click="formModalVisible = false">取消</n-button>
        <n-button type="primary" :loading="submitting" @click="handleSubmit">确定</n-button>
      </template>
    </n-modal>

    <n-modal
      v-model:show="qrModalVisible"
      preset="card"
      title="设备二维码"
      style="width: 340px; text-align: center"
    >
      <n-spin :show="qrLoading">
        <img v-if="qrDataUrl" :src="qrDataUrl" style="width: 260px; height: 260px" />
        <n-empty v-else description="暂无二维码" />
      </n-spin>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, reactive, h, onMounted } from 'vue'
import { NButton, NSpace, NTag, useMessage, useDialog } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import api from '../api/index.js'

const message = useMessage()
const dialog = useDialog()

const typeMap = {
  FIRE_HYDRANT: '消火栓',
  FIRE_EXTINGUISHER: '灭火器',
  SMOKE_DETECTOR: '烟感探测器',
  SPRINKLER: '喷淋头',
  EMERGENCY_LIGHT: '应急灯'
}

const statusMap = {
  NORMAL: { label: '正常', type: 'success' },
  ABNORMAL: { label: '异常', type: 'warning' },
  EXPIRED: { label: '已过期', type: 'error' },
  DAMAGED: { label: '损坏', type: 'error' }
}

const typeOptions = [
  { label: '全部', value: '' },
  { label: '消火栓', value: 'FIRE_HYDRANT' },
  { label: '灭火器', value: 'FIRE_EXTINGUISHER' },
  { label: '烟感探测器', value: 'SMOKE_DETECTOR' },
  { label: '喷淋头', value: 'SPRINKLER' },
  { label: '应急灯', value: 'EMERGENCY_LIGHT' }
]

const statusOptions = [
  { label: '全部', value: '' },
  { label: '正常', value: 'NORMAL' },
  { label: '异常', value: 'ABNORMAL' },
  { label: '已过期', value: 'EXPIRED' },
  { label: '损坏', value: 'DAMAGED' }
]

const filter = reactive({ type: '', floor: '', status: '', keyword: '' })
const floorOptions = ref([{ label: '全部', value: '' }])
const devices = ref([])
const loading = ref(false)

const formModalVisible = ref(false)
const qrModalVisible = ref(false)
const qrDataUrl = ref('')
const qrLoading = ref(false)
const isEdit = ref(false)
const editId = ref(null)
const submitting = ref(false)
const formRef = ref(null)

const defaultFormData = () => ({
  code: '',
  type: null,
  floor: null,
  location: '',
  installDate: null,
  expireDate: null,
  pressureExpireDate: null,
  lastCleanDate: null,
  cleanCycleDays: 180
})

const formData = reactive(defaultFormData())

const formRules = {
  code: { required: true, message: '请输入设备编号', trigger: 'blur' },
  type: { required: true, message: '请选择设备类型', trigger: 'change' },
  floor: { required: true, message: '请选择楼层', trigger: 'change' },
  location: { required: true, message: '请输入具体位置', trigger: 'blur' },
  installDate: { required: true, type: 'number', message: '请选择安装日期', trigger: 'change' },
  expireDate: { required: true, type: 'number', message: '请选择有效期', trigger: 'change' }
}

const columns = [
  { title: '编号', key: 'code', width: 120 },
  { title: '类型', key: 'type', width: 110, render: (row) => typeMap[row.type] || row.type },
  { title: '楼层', key: 'floor', width: 80 },
  { title: '位置', key: 'location', ellipsis: { tooltip: true } },
  {
    title: '安装日期', key: 'installDate', width: 110,
    render: (row) => row.installDate ? row.installDate.slice(0, 10) : ''
  },
  {
    title: '有效期', key: 'expireDate', width: 110,
    render: (row) => row.expireDate ? row.expireDate.slice(0, 10) : ''
  },
  {
    title: '状态', key: 'status', width: 90,
    render: (row) => {
      const s = statusMap[row.status]
      return h(NTag, { type: s?.type || 'default', size: 'small' }, { default: () => s?.label || row.status })
    }
  },
  {
    title: '操作', key: 'actions', width: 200, fixed: 'right',
    render: (row) =>
      h(NSpace, { size: 'small' }, {
        default: () => [
          h(NButton, { size: 'small', onClick: () => openEditModal(row) }, { default: () => '编辑' }),
          h(NButton, { size: 'small', type: 'error', onClick: () => handleDelete(row) }, { default: () => '删除' }),
          h(NButton, { size: 'small', type: 'info', onClick: () => showQrCode(row) }, { default: () => '二维码' })
        ]
      })
  }
]

async function loadFloors() {
  try {
    const data = await api.get('/devices/meta/floors')
    floorOptions.value = [{ label: '全部', value: '' }, ...data.map(f => ({ label: f, value: f }))]
  } catch (e) {
    message.error('加载楼层失败')
  }
}

async function loadDevices() {
  loading.value = true
  try {
    const params = {}
    if (filter.type) params.type = filter.type
    if (filter.floor) params.floor = filter.floor
    if (filter.status) params.status = filter.status
    if (filter.keyword) params.keyword = filter.keyword
    const data = await api.get('/devices', { params })
    devices.value = data
  } catch (e) {
    message.error('加载设备列表失败')
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  loadDevices()
}

function resetFilter() {
  filter.type = ''
  filter.floor = ''
  filter.status = ''
  filter.keyword = ''
  loadDevices()
}

function openAddModal() {
  isEdit.value = false
  editId.value = null
  Object.assign(formData, defaultFormData())
  formModalVisible.value = true
}

function openEditModal(row) {
  isEdit.value = true
  editId.value = row.id
  Object.assign(formData, {
    code: row.code,
    type: row.type,
    floor: row.floor,
    location: row.location,
    installDate: row.installDate ? new Date(row.installDate).getTime() : null,
    expireDate: row.expireDate ? new Date(row.expireDate).getTime() : null,
    pressureExpireDate: row.pressureExpireDate ? new Date(row.pressureExpireDate).getTime() : null,
    lastCleanDate: row.lastCleanDate ? new Date(row.lastCleanDate).getTime() : null,
    cleanCycleDays: row.cleanCycleDays || 180
  })
  formModalVisible.value = true
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const payload = { ...formData }
    if (payload.type !== 'FIRE_EXTINGUISHER') {
      delete payload.pressureExpireDate
    }
    if (payload.type !== 'SMOKE_DETECTOR') {
      delete payload.lastCleanDate
      delete payload.cleanCycleDays
    }
    if (isEdit.value) {
      await api.put(`/devices/${editId.value}`, payload)
      message.success('编辑成功')
    } else {
      await api.post('/devices', payload)
      message.success('添加成功')
    }
    formModalVisible.value = false
    loadDevices()
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

function handleDelete(row) {
  dialog.warning({
    title: '确认删除',
    content: `确定删除设备「${row.code}」吗？`,
    positiveText: '确定',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/devices/${row.id}`)
        message.success('删除成功')
        loadDevices()
      } catch (e) {
        message.error(e.message || '删除失败')
      }
    }
  })
}

async function showQrCode(row) {
  qrModalVisible.value = true
  qrDataUrl.value = ''
  qrLoading.value = true
  try {
    const data = await api.get(`/qrcode/device/${row.id}`)
    qrDataUrl.value = data.qrDataUrl
  } catch (e) {
    message.error('获取二维码失败')
  } finally {
    qrLoading.value = false
  }
}

onMounted(() => {
  loadFloors()
  loadDevices()
})
</script>
