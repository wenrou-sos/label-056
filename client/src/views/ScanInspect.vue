<template>
  <div class="scan-inspect-page">
    <n-card v-if="loading" style="text-align: center">
      <n-spin size="large" />
    </n-card>

    <template v-else-if="device">
      <n-card :title="`巡检 - ${device.code}`">
        <template #header-extra>
          <n-tag :type="device.type === 'FIRE_EXTINGUISHER' ? 'warning' : 'info'">
            {{ deviceTypeLabels[device.type] }}
          </n-tag>
        </template>

        <n-descriptions bordered :column="isMobile ? 1 : 2" size="small" style="margin-bottom: 16px">
          <n-descriptions-item label="设备编号">{{ device.code }}</n-descriptions-item>
          <n-descriptions-item label="设备类型">{{ deviceTypeLabels[device.type] }}</n-descriptions-item>
          <n-descriptions-item label="所在楼层">{{ device.floor }}</n-descriptions-item>
          <n-descriptions-item label="具体位置">{{ device.location }}</n-descriptions-item>
          <n-descriptions-item label="安装日期">{{ formatDate(device.installDate) }}</n-descriptions-item>
          <n-descriptions-item label="有效期至">{{ formatDate(device.expireDate) }}</n-descriptions-item>
          <n-descriptions-item v-if="device.type === 'FIRE_EXTINGUISHER'" label="压力表有效期">
            {{ formatDate(device.pressureExpireDate) }}
          </n-descriptions-item>
          <n-descriptions-item v-if="device.type === 'SMOKE_DETECTOR'" label="上次清洁">
            {{ formatDate(device.lastCleanDate) }}
          </n-descriptions-item>
        </n-descriptions>
      </n-card>

      <n-card title="巡检记录" style="margin-top: 12px">
        <n-form ref="formRef" :model="form" :rules="rules" label-placement="top">
          <n-form-item label="检查人" path="inspector">
            <n-input v-model:value="form.inspector" placeholder="请输入检查人姓名" />
          </n-form-item>

          <n-form-item label="设备状态" path="result">
            <n-radio-group v-model:value="form.result">
              <n-space>
                <n-radio value="NORMAL">正常</n-radio>
                <n-radio value="ABNORMAL">异常</n-radio>
                <n-radio value="EXPIRED">已过期</n-radio>
                <n-radio value="DAMAGED">损坏</n-radio>
              </n-space>
            </n-radio-group>
          </n-form-item>

          <n-form-item label="备注">
            <n-input v-model:value="form.remark" type="textarea" :rows="3" placeholder="请输入备注信息" />
          </n-form-item>

          <n-form-item label="现场照片">
            <n-upload
              :action="uploadUrl"
              :max="1"
              accept="image/*"
              name="photo"
              @finish="handleUploadFinish"
              list-type="image-card"
            >
              点击上传照片
            </n-upload>
          </n-form-item>

          <n-form-item v-if="form.result !== 'NORMAL'" label="是否上报隐患">
            <n-switch v-model:value="form.createHazard" />
          </n-form-item>

          <n-form-item v-if="form.createHazard" label="隐患描述">
            <n-input v-model:value="form.hazardDesc" type="textarea" :rows="2" placeholder="描述隐患详情" />
          </n-form-item>

          <n-space justify="center" style="width: 100%; margin-top: 16px">
            <n-button @click="goBack">返回</n-button>
            <n-button type="primary" @click="submitInspect" :loading="submitting">
              提交巡检
            </n-button>
          </n-space>
        </n-form>
      </n-card>

      <n-card title="历史巡检记录" style="margin-top: 12px">
        <n-empty v-if="!historyRecords.length" description="暂无历史记录" />
        <n-timeline v-else>
          <n-timeline-item
            v-for="record in historyRecords"
            :key="record.id"
            :type="resultColors[record.result]"
            :time="formatDateTime(record.inspectedAt)"
          >
            <template #header>
              {{ resultLabels[record.result] }} - {{ record.inspector }}
            </template>
            <div v-if="record.remark">{{ record.remark }}</div>
          </n-timeline-item>
        </n-timeline>
      </n-card>
    </template>

    <n-card v-else>
      <n-result status="error" title="设备未找到" description="请确认设备编号是否正确">
        <template #footer>
          <n-button @click="router.push({ name: 'scan' })">返回扫码</n-button>
        </template>
      </n-result>
    </n-card>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import dayjs from 'dayjs'
import api from '../api'

const route = useRoute()
const router = useRouter()
const message = useMessage()
const isMobile = computed(() => window.innerWidth < 768)

const device = ref(null)
const loading = ref(true)
const submitting = ref(false)
const historyRecords = ref([])
const formRef = ref(null)

const uploadUrl = '/api/upload'

const form = ref({
  inspector: '',
  result: 'NORMAL',
  remark: '',
  photoUrl: '',
  createHazard: false,
  hazardDesc: ''
})

const rules = {
  inspector: { required: true, message: '请输入检查人', trigger: 'blur' },
  result: { required: true, message: '请选择设备状态', trigger: 'change' }
}

const deviceTypeLabels = {
  FIRE_HYDRANT: '消火栓',
  FIRE_EXTINGUISHER: '灭火器',
  SMOKE_DETECTOR: '烟感探测器',
  SPRINKLER: '喷淋头',
  EMERGENCY_LIGHT: '应急灯'
}

const resultLabels = {
  NORMAL: '正常',
  ABNORMAL: '异常',
  EXPIRED: '已过期',
  DAMAGED: '损坏'
}

const resultColors = {
  NORMAL: 'success',
  ABNORMAL: 'warning',
  EXPIRED: 'error',
  DAMAGED: 'error'
}

function formatDate(d) {
  return d ? dayjs(d).format('YYYY-MM-DD') : '-'
}

function formatDateTime(d) {
  return d ? dayjs(d).format('YYYY-MM-DD HH:mm') : '-'
}

function handleUploadFinish({ event }) {
  try {
    const data = JSON.parse(event.target.response)
    form.value.photoUrl = data.url
  } catch (e) { /* ignore */ }
  return ''
}

function goBack() {
  router.push({ name: 'scan' })
}

async function loadDevice() {
  loading.value = true
  try {
    const code = route.params.code
    device.value = await api.get(`/devices/code/${code}`)
    const records = await api.get(`/inspections/device/${device.value.id}`)
    historyRecords.value = records || []
  } catch (e) {
    device.value = null
  } finally {
    loading.value = false
  }
}

async function submitInspect() {
  try {
    await formRef.value?.validate()
  } catch {
    return
  }

  submitting.value = true
  try {
    const taskId = route.query.taskId
    const record = await api.post('/inspections', {
      taskId: taskId || undefined,
      deviceId: device.value.id,
      result: form.value.result,
      remark: form.value.remark,
      photoUrl: form.value.photoUrl,
      inspector: form.value.inspector
    })

    if (form.value.createHazard && form.value.result !== 'NORMAL') {
      await api.post('/hazards', {
        title: `${deviceTypeLabels[device.value.type]}${resultLabels[form.value.result]}`,
        description: form.value.hazardDesc || form.value.remark,
        deviceId: device.value.id,
        inspectionId: record.id
      })
    }

    const newStatus = form.value.result === 'NORMAL' ? 'NORMAL' :
                     form.value.result === 'ABNORMAL' ? 'ABNORMAL' :
                     form.value.result === 'EXPIRED' ? 'EXPIRED' : 'DAMAGED'
    await api.put(`/devices/${device.value.id}`, { status: newStatus })

    message.success('巡检记录提交成功')
    if (taskId) {
      router.push({ name: 'task-detail', params: { id: taskId } })
    } else {
      router.push({ name: 'scan' })
    }
  } catch (e) {
    message.error(e.message || '提交失败')
  } finally {
    submitting.value = false
  }
}

onMounted(loadDevice)
</script>

<style scoped>
.scan-inspect-page {
  max-width: 600px;
  margin: 0 auto;
}
</style>
