<template>
  <div>
    <n-space justify="space-between" align="center" style="margin-bottom: 16px">
      <n-space align="center">
        <span style="font-weight: 600; font-size: 14px">班次筛选：</span>
        <n-radio-group v-model:value="shiftFilter" @update:value="fetchRoutes">
          <n-radio-button value="">全部</n-radio-button>
          <n-radio-button value="MORNING">早班</n-radio-button>
          <n-radio-button value="AFTERNOON">中班</n-radio-button>
          <n-radio-button value="NIGHT">夜班</n-radio-button>
        </n-radio-group>
      </n-space>
      <n-button type="primary" @click="openAddModal">
        <template #icon><n-icon><AddOutline /></n-icon></template>
        添加路线
      </n-button>
    </n-space>

    <n-spin :show="loading">
      <n-grid :cols="1 m:2" :x-gap="16" :y-gap="16" responsive="screen" item-responsive>
        <n-grid-item v-for="item in routes" :key="item.id">
          <n-card hoverable size="small">
            <template #header>
              <n-space align="center" :size="8">
                <span style="font-weight: 600">{{ item.name }}</span>
                <n-tag :type="shiftTagType(item.shift)" size="small">{{ shiftLabels[item.shift] }}</n-tag>
              </n-space>
            </template>
            <template #header-extra>
              <n-space :size="8">
                <n-button text type="primary" size="small" @click="openEditModal(item)">编辑</n-button>
                <n-button text type="error" size="small" @click="handleDelete(item)">删除</n-button>
              </n-space>
            </template>
            <p v-if="item.description" style="margin-bottom: 12px; color: #666; font-size: 13px">{{ item.description }}</p>
            <n-divider v-if="item.description" style="margin: 8px 0" />
            <div v-if="item.devices && item.devices.length" style="font-size: 13px">
              <div style="margin-bottom: 6px; font-weight: 500; color: #333">巡检设备（{{ item.devices.length }}个）</div>
              <ol style="padding-left: 20px; margin: 0">
                <li v-for="rd in item.devices" :key="rd.id" style="margin-bottom: 4px; line-height: 1.8">
                  <n-space align="center" :size="6" inline>
                    <n-tag size="tiny" :type="deviceTypeTagType(rd.device?.type)">{{ deviceTypeLabels[rd.device?.type] }}</n-tag>
                    <span>{{ rd.device?.code }}</span>
                    <span v-if="rd.device?.location" style="color: #999; font-size: 12px">{{ rd.device?.location }}</span>
                  </n-space>
                </li>
              </ol>
            </div>
            <n-empty v-else description="暂无设备" size="small" />
          </n-card>
        </n-grid-item>
      </n-grid>
      <n-empty v-if="!loading && !routes.length" description="暂无路线数据" style="margin-top: 40px" />
    </n-spin>

    <n-modal v-model:show="showModal" preset="card" :title="editingRoute ? '编辑路线' : '添加路线'" style="width: 700px">
      <n-form ref="formRef" :model="form" :rules="rules" label-placement="left" label-width="80">
        <n-form-item label="路线名称" path="name">
          <n-input v-model:value="form.name" placeholder="请输入路线名称" />
        </n-form-item>
        <n-form-item label="班次" path="shift">
          <n-select v-model:value="form.shift" :options="shiftOptions" placeholder="请选择班次" />
        </n-form-item>
        <n-form-item label="描述" path="description">
          <n-input v-model:value="form.description" type="textarea" placeholder="请输入描述" :rows="2" />
        </n-form-item>
        <n-form-item label="选择设备" path="deviceIds">
          <n-transfer
            v-model:value="form.deviceIds"
            :options="deviceTransferOptions"
            source-filterable
            source-title="可选设备"
            target-title="已选设备"
            virtual-scroll
          />
        </n-form-item>
      </n-form>
      <template #action>
        <n-space justify="end">
          <n-button @click="showModal = false">取消</n-button>
          <n-button type="primary" :loading="submitting" @click="handleSubmit">确定</n-button>
        </n-space>
      </template>
    </n-modal>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useMessage, useDialog } from 'naive-ui'
import { AddOutline } from '@vicons/ionicons5'
import api from '../api/index.js'

const message = useMessage()
const dialog = useDialog()

const loading = ref(false)
const shiftFilter = ref('')
const routes = ref([])
const devices = ref([])
const showModal = ref(false)
const submitting = ref(false)
const editingRoute = ref(null)
const formRef = ref(null)

const shiftLabels = {
  MORNING: '早班',
  AFTERNOON: '中班',
  NIGHT: '夜班'
}

const deviceTypeLabels = {
  FIRE_HYDRANT: '消火栓',
  FIRE_EXTINGUISHER: '灭火器',
  SMOKE_DETECTOR: '烟感探测器',
  SPRINKLER: '喷淋头',
  EMERGENCY_LIGHT: '应急灯'
}

const shiftOptions = [
  { label: '早班', value: 'MORNING' },
  { label: '中班', value: 'AFTERNOON' },
  { label: '夜班', value: 'NIGHT' }
]

const form = ref({
  name: '',
  shift: null,
  description: '',
  deviceIds: []
})

const rules = {
  name: { required: true, message: '请输入路线名称', trigger: 'blur' },
  shift: { required: true, message: '请选择班次', trigger: 'change' }
}

const deviceTransferOptions = computed(() =>
  devices.value.map(d => ({
    label: `${d.code}（${deviceTypeLabels[d.type] || d.type}）${d.location ? ' - ' + d.location : ''}`,
    value: d.id
  }))
)

function shiftTagType(shift) {
  const map = { MORNING: 'success', AFTERNOON: 'warning', NIGHT: 'info' }
  return map[shift] || 'default'
}

function deviceTypeTagType(type) {
  const map = {
    FIRE_HYDRANT: 'info',
    FIRE_EXTINGUISHER: 'error',
    SMOKE_DETECTOR: 'warning',
    SPRINKLER: 'success',
    EMERGENCY_LIGHT: 'default'
  }
  return map[type] || 'default'
}

async function fetchRoutes() {
  loading.value = true
  try {
    const params = {}
    if (shiftFilter.value) params.shift = shiftFilter.value
    const data = await api.get('/routes', { params })
    routes.value = Array.isArray(data) ? data : data.rows || data.data || []
  } catch (e) {
    message.error(e.message || '获取路线列表失败')
  } finally {
    loading.value = false
  }
}

async function fetchDevices() {
  try {
    const data = await api.get('/devices')
    devices.value = Array.isArray(data) ? data : data.rows || data.data || []
  } catch (e) {
    message.error(e.message || '获取设备列表失败')
  }
}

function openAddModal() {
  editingRoute.value = null
  form.value = { name: '', shift: null, description: '', deviceIds: [] }
  showModal.value = true
}

function openEditModal(route) {
  editingRoute.value = route
  form.value = {
    name: route.name,
    shift: route.shift,
    description: route.description || '',
    deviceIds: route.devices ? route.devices.map(d => d.id) : []
  }
  showModal.value = true
}

async function handleSubmit() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }
  submitting.value = true
  try {
    const payload = {
      name: form.value.name,
      shift: form.value.shift,
      description: form.value.description,
      deviceIds: form.value.deviceIds
    }
    if (editingRoute.value) {
      await api.put(`/routes/${editingRoute.value.id}`, payload)
      message.success('路线更新成功')
    } else {
      await api.post('/routes', payload)
      message.success('路线添加成功')
    }
    showModal.value = false
    fetchRoutes()
  } catch (e) {
    message.error(e.message || '操作失败')
  } finally {
    submitting.value = false
  }
}

function handleDelete(route) {
  dialog.warning({
    title: '确认删除',
    content: `确定要删除路线"${route.name}"吗？`,
    positiveText: '删除',
    negativeText: '取消',
    onPositiveClick: async () => {
      try {
        await api.delete(`/routes/${route.id}`)
        message.success('删除成功')
        fetchRoutes()
      } catch (e) {
        message.error(e.message || '删除失败')
      }
    }
  })
}

onMounted(() => {
  fetchRoutes()
  fetchDevices()
})
</script>
