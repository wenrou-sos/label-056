<template>
  <div class="reminders-page">
    <n-card title="到期提醒">
      <n-tabs type="line" animated>
        <n-tab-pane name="expired" :tab="`已过期 (${expiredDevices.length})`">
          <n-alert v-if="expiredDevices.length" type="error" style="margin-bottom: 12px">
            以下设备已过有效期，请立即处理！
          </n-alert>
          <n-data-table
            :columns="expiredColumns"
            :data="expiredDevices"
            :bordered="false"
            size="small"
          />
          <n-empty v-if="!expiredDevices.length" description="暂无过期设备" />
        </n-tab-pane>

        <n-tab-pane name="expiring" :tab="`7日内到期 (${expiringDevices.length})`">
          <n-alert v-if="expiringDevices.length" type="warning" style="margin-bottom: 12px">
            以下设备将在7日内到期，请安排更换！
          </n-alert>
          <n-data-table
            :columns="expiringColumns"
            :data="expiringDevices"
            :bordered="false"
            size="small"
          />
          <n-empty v-if="!expiringDevices.length" description="暂无即将到期设备" />
        </n-tab-pane>

        <n-tab-pane name="clean" :tab="`清洁提醒 (${cleanDevices.length})`">
          <n-alert v-if="cleanDevices.length" type="info" style="margin-bottom: 12px">
            以下烟感探测器即将到达清洁周期！
          </n-alert>
          <n-data-table
            :columns="cleanColumns"
            :data="cleanDevices"
            :bordered="false"
            size="small"
          />
          <n-empty v-if="!cleanDevices.length" description="暂无清洁提醒" />
        </n-tab-pane>
      </n-tabs>
    </n-card>
  </div>
</template>

<script setup>
import { ref, h, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { NTag, NButton, useMessage } from 'naive-ui'
import dayjs from 'dayjs'
import api from '../api'

const router = useRouter()
const message = useMessage()
const expiredDevices = ref([])
const expiringDevices = ref([])
const cleanDevices = ref([])

const deviceTypeLabels = {
  FIRE_HYDRANT: '消火栓',
  FIRE_EXTINGUISHER: '灭火器',
  SMOKE_DETECTOR: '烟感探测器',
  SPRINKLER: '喷淋头',
  EMERGENCY_LIGHT: '应急灯'
}

const expiredColumns = [
  { title: '设备编号', key: 'code' },
  { title: '类型', key: 'type', render: (row) => h(NTag, { size: 'small' }, () => deviceTypeLabels[row.type]) },
  { title: '楼层', key: 'floor' },
  { title: '位置', key: 'location' },
  {
    title: '过期日期',
    key: 'expireDate',
    render: (row) => h('span', { style: 'color: #d03050' }, row.expireDate ? dayjs(row.expireDate).format('YYYY-MM-DD') : '-')
  },
  {
    title: '操作',
    key: 'action',
    render: (row) => h(NButton, { size: 'small', type: 'primary', onClick: () => router.push({ name: 'scan-inspect', params: { code: row.code } }) }, () => '巡检')
  }
]

const expiringColumns = [
  { title: '设备编号', key: 'code' },
  { title: '类型', key: 'type', render: (row) => h(NTag, { size: 'small', type: 'warning' }, () => deviceTypeLabels[row.type]) },
  { title: '楼层', key: 'floor' },
  { title: '位置', key: 'location' },
  {
    title: '到期日期',
    key: 'expireDate',
    render: (row) => h('span', { style: 'color: #f0a020' }, row.expireDate ? dayjs(row.expireDate).format('YYYY-MM-DD') : '-')
  },
  {
    title: '压力表到期',
    key: 'pressureExpireDate',
    render: (row) => row.pressureExpireDate ? h('span', { style: 'color: #f0a020' }, dayjs(row.pressureExpireDate).format('YYYY-MM-DD')) : '-'
  },
  {
    title: '操作',
    key: 'action',
    render: (row) => h(NButton, { size: 'small', onClick: () => router.push({ name: 'scan-inspect', params: { code: row.code } }) }, () => '巡检')
  }
]

const cleanColumns = [
  { title: '设备编号', key: 'code' },
  { title: '楼层', key: 'floor' },
  { title: '位置', key: 'location' },
  {
    title: '上次清洁',
    key: 'lastCleanDate',
    render: (row) => row.lastCleanDate ? dayjs(row.lastCleanDate).format('YYYY-MM-DD') : '-'
  },
  {
    title: '下次清洁',
    key: 'nextCleanDate',
    render: (row) => h('span', { style: 'color: #2080f0' }, row.nextCleanDate ? dayjs(row.nextCleanDate).format('YYYY-MM-DD') : '-')
  },
  { title: '清洁周期(天)', key: 'cleanCycleDays' },
  {
    title: '操作',
    key: 'action',
    render: (row) => h(NButton, { size: 'small', onClick: () => router.push({ name: 'scan-inspect', params: { code: row.code } }) }, () => '巡检')
  }
]

async function loadReminders() {
  try {
    const data = await api.get('/reminders')
    expiredDevices.value = data.expiredDevices || []
    expiringDevices.value = data.expiringDevices || []
    cleanDevices.value = data.cleanRemindDevices || []
  } catch (e) {
    message.error('加载提醒数据失败')
  }
}

onMounted(loadReminders)
</script>

<style scoped>
.reminders-page {
  max-width: 1200px;
  margin: 0 auto;
}
</style>
