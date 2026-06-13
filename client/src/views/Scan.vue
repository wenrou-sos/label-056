<template>
  <div class="scan-page">
    <n-card title="扫码巡检">
      <n-space vertical align="center" :size="20">
        <n-icon size="80" color="#e04040">
          <scan-outline />
        </n-icon>
        <n-text depth="3">扫描设备二维码开始巡检</n-text>

        <div style="width: 100%; max-width: 400px">
          <n-input
            v-model:value="deviceCode"
            placeholder="输入设备编号或扫码"
            size="large"
            @keyup.enter="goInspect"
          >
            <template #prefix>
              <n-icon :component="SearchOutline" />
            </template>
          </n-input>
        </div>

        <n-button type="primary" size="large" @click="goInspect" :disabled="!deviceCode">
          开始巡检
        </n-button>

        <n-divider>或者</n-divider>

        <n-button secondary @click="startCamera" :type="scanning ? 'error' : 'default'">
          {{ scanning ? '停止扫码' : '打开摄像头扫码' }}
        </n-button>

        <div v-if="scanning" style="width: 100%; max-width: 400px">
          <video ref="videoRef" autoplay playsinline style="width: 100%; border-radius: 8px"></video>
        </div>

        <n-divider>最近巡检记录</n-divider>

        <n-list v-if="recentDevices.length" bordered style="width: 100%; max-width: 400px; text-align: left">
          <n-list-item v-for="d in recentDevices" :key="d.id">
            <n-thing :title="d.code" :description="d.location">
              <template #header-extra>
                <n-tag size="small">{{ deviceTypeLabels[d.type] }}</n-tag>
              </template>
            </n-thing>
            <template #action>
              <n-button size="small" @click="deviceCode = d.code; goInspect()">巡检</n-button>
            </template>
          </n-list-item>
        </n-list>
      </n-space>
    </n-card>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { ScanOutline, SearchOutline } from '@vicons/ionicons5'
import api from '../api'

const router = useRouter()
const deviceCode = ref('')
const scanning = ref(false)
const videoRef = ref(null)
const recentDevices = ref([])
let stream = null

const deviceTypeLabels = {
  FIRE_HYDRANT: '消火栓',
  FIRE_EXTINGUISHER: '灭火器',
  SMOKE_DETECTOR: '烟感探测器',
  SPRINKLER: '喷淋头',
  EMERGENCY_LIGHT: '应急灯'
}

function goInspect() {
  if (deviceCode.value) {
    router.push({ name: 'scan-inspect', params: { code: deviceCode.value } })
  }
}

async function startCamera() {
  if (scanning.value) {
    stopCamera()
    return
  }
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    })
    if (videoRef.value) {
      videoRef.value.srcObject = stream
    }
    scanning.value = true
  } catch (err) {
    window.$message?.error('无法访问摄像头: ' + err.message)
  }
}

function stopCamera() {
  if (stream) {
    stream.getTracks().forEach(t => t.stop())
    stream = null
  }
  scanning.value = false
}

onMounted(async () => {
  try {
    const devices = await api.get('/devices', { params: { pageSize: 5 } })
    recentDevices.value = (devices || []).slice(0, 5)
  } catch (e) { /* ignore */ }
})

onUnmounted(() => {
  stopCamera()
})
</script>

<style scoped>
.scan-page {
  max-width: 600px;
  margin: 0 auto;
}
</style>
