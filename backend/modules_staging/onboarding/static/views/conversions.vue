<script setup>
import { ref, computed, onMounted } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Card, Col, Row, Statistic, Table, Tag, Space, Button, Select,
  Modal, Spin, Divider, Checkbox, Timeline,
  Form, Input, InputNumber, DatePicker, Popconfirm, Result,
  Alert, Tooltip, Progress, Avatar,
} from 'ant-design-vue';
import {
  CheckCircleOutlined, ClockCircleOutlined, UserAddOutlined,
  TeamOutlined, ReloadOutlined, EyeOutlined, PlayCircleOutlined,
  SafetyCertificateOutlined, SyncOutlined, CloseCircleOutlined,
  ExclamationCircleOutlined, StopOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import { useListView, useModal, useNotification } from '#/composables';

const SelectOption = Select.Option;
const TimelineItem = Timeline.Item;
const FormItem = Form.Item;

defineOptions({ name: 'OnboardingConversions' });

const BASE = '/onboarding/conversions';
const notify = useNotification();
const listView = useListView({ defaultPageSize: 20 });
const detailModal = useModal();
const initiateModal = useModal();

const statusFilter = ref(undefined);
const items = ref([]);
const stats = computed(() => {
  let ready = 0, pending = 0, completed = 0, cancelled = 0;
  items.value.forEach((c) => {
    if (c.status === 'ready') ready++;
    else if (c.status === 'pending') pending++;
    else if (c.status === 'completed') completed++;
    else if (c.status === 'cancelled') cancelled++;
  });
  return { ready, pending, completed, cancelled, total: listView.pagination.total };
});

const conversionLogs = ref([]);
const initiateForm = ref({
  candidate_id: null,
  department_id: null,
  position: '',
  manager_id: null,
  joining_date: null,
  salary: null,
});
const completeNotes = ref('');

const statusOptions = [
  { value: 'ready', label: 'Ready', color: 'green' },
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'cyan' },
  { value: 'failed', label: 'Failed', color: 'red' },
  { value: 'cancelled', label: 'Cancelled', color: 'default' },
];

const statusIconMap = {
  pending: ClockCircleOutlined,
  ready: CheckCircleOutlined,
  in_progress: SyncOutlined,
  completed: UserAddOutlined,
  failed: CloseCircleOutlined,
  cancelled: ExclamationCircleOutlined,
};

const columns = [
  { title: 'Candidate', dataIndex: 'candidate_name', key: 'candidate_name', width: 220 },
  { title: 'Position', dataIndex: 'job_position', key: 'job_position' },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 140 },
  { title: 'Onboarding Progress', key: 'onboarding_progress', width: 170, align: 'center' },
  { title: 'Readiness', key: 'readiness', width: 120, align: 'center' },
  { title: 'Created', dataIndex: 'created_at', key: 'created_at', width: 120 },
  { title: 'Actions', key: 'actions', width: 240, fixed: 'right' },
];

function getStatusColor(status) {
  const match = statusOptions.find((s) => s.value === status);
  return match ? match.color : 'default';
}

function getStatusLabel(status) {
  const match = statusOptions.find((s) => s.value === status);
  return match ? match.label : status;
}

function getStatusIcon(status) {
  return statusIconMap[status] || null;
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0].substring(0, 2).toUpperCase();
}

function calcReadiness(record) {
  const flags = [
    !!record.documents_verified,
    !!record.tasks_completed,
    !!record.verifications_passed,
    !!record.offer_accepted,
  ];
  const count = flags.filter((f) => f).length;
  return Math.round((count / 4) * 100);
}

function readinessTooltip(record) {
  const lines = [];
  lines.push((record.documents_verified ? '\u2705' : '\u274C') + ' Documents Verified');
  lines.push((record.tasks_completed ? '\u2705' : '\u274C') + ' Tasks Completed');
  lines.push((record.verifications_passed ? '\u2705' : '\u274C') + ' Verifications Passed');
  lines.push((record.offer_accepted ? '\u2705' : '\u274C') + ' Offer Accepted');
  return lines.join('\n');
}

function getOnboardingProgress(record) {
  if (record.onboarding_progress !== undefined && record.onboarding_progress !== null) {
    return record.onboarding_progress;
  }
  if (record.progress !== undefined && record.progress !== null) {
    return record.progress;
  }
  return 0;
}

function getProgressStatus(percent) {
  if (percent >= 100) return 'success';
  if (percent > 0) return 'active';
  return 'normal';
}

function getAvatarColor(name) {
  if (!name) return '#999';
  const colors = ['#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1', '#13c2c2', '#eb2f96', '#fa8c16'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

async function fetchList() {
  listView.setLoading(true);
  try {
    const params = { page: listView.pagination.current, page_size: listView.pagination.pageSize };
    if (statusFilter.value) params.status = statusFilter.value;
    const res = await requestClient.get(BASE + '/', { params: params });
    items.value = res.items || [];
    listView.setTotal(res.total || 0);
  } catch (err) {
    notify.error('Error', 'Failed to load conversions');
  } finally {
    listView.setLoading(false);
  }
}

function onTableChange(pag) {
  listView.pagination.current = pag.current;
  listView.pagination.pageSize = pag.pageSize;
  fetchList();
}

function onStatusFilter(val) {
  statusFilter.value = val;
  listView.pagination.current = 1;
  fetchList();
}

async function openDetail(record) {
  detailModal.open(null);
  detailModal.setLoading(true);
  conversionLogs.value = [];
  try {
    const detail = await requestClient.get(BASE + '/' + record.id);
    detailModal.data.value = detail;
    const logsRes = await requestClient.get(BASE + '/' + record.id + '/logs');
    conversionLogs.value = logsRes.items || logsRes || [];
  } catch (err) {
    notify.error('Error', 'Failed to load conversion details');
    detailModal.close();
  } finally {
    detailModal.setLoading(false);
  }
}

async function checkReadiness(record) {
  try {
    await requestClient.post(BASE + '/' + record.id + '/check-readiness');
    notify.success('Success', 'Readiness check completed');
    fetchList();
  } catch (err) {
    notify.error('Error', 'Readiness check failed');
  }
}

function openInitiateModal(record) {
  initiateForm.value = {
    candidate_id: record.candidate_id || record.id,
    department_id: null,
    position: record.position || '',
    manager_id: null,
    joining_date: null,
    salary: null,
  };
  initiateModal.open(record);
}

async function submitInitiate() {
  initiateModal.setLoading(true);
  try {
    const payload = {
      candidate_id: initiateForm.value.candidate_id,
      department_id: initiateForm.value.department_id,
      position: initiateForm.value.position,
      manager_id: initiateForm.value.manager_id,
      joining_date: initiateForm.value.joining_date,
      salary: initiateForm.value.salary,
    };
    await requestClient.post(BASE + '/initiate', payload);
    notify.success('Success', 'Conversion initiated successfully');
    initiateModal.close();
    fetchList();
  } catch (err) {
    notify.error('Error', 'Failed to initiate conversion');
  } finally {
    initiateModal.setLoading(false);
  }
}

async function completeConversion(record) {
  try {
    await requestClient.post(BASE + '/' + record.id + '/complete', {
      notes: completeNotes.value || undefined,
    });
    notify.success('Success', 'Conversion completed successfully');
    completeNotes.value = '';
    fetchList();
    if (detailModal.visible.value) {
      detailModal.close();
    }
  } catch (err) {
    notify.error('Error', 'Failed to complete conversion');
  }
}

async function cancelConversion(record) {
  try {
    await requestClient.post(BASE + '/' + record.id + '/cancel');
    notify.success('Success', 'Conversion cancelled');
    fetchList();
  } catch (err) {
    notify.error('Error', 'Failed to cancel conversion');
  }
}

function formatDate(val) {
  if (!val) return '-';
  const d = new Date(val);
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

onMounted(() => {
  fetchList();
});
</script>

<template>
  <Page auto-content-height>
    <div class="mv-p-4">
      <!-- Header -->
      <div class="mv-page-header mv-mb-4">
        <div>
          <h2 class="mv-page-title">Candidate Conversions</h2>
          <p class="mv-text-secondary mv-mt-1">
            Manage candidate-to-employee conversions
          </p>
        </div>
        <Space>
          <Select
            :value="statusFilter"
            placeholder="Filter by status"
            allow-clear
            class="mv-w-input-lg"
            @change="onStatusFilter"
          >
            <SelectOption
              v-for="opt in statusOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </SelectOption>
          </Select>
          <Button @click="fetchList">
            <template #icon><ReloadOutlined /></template>
          </Button>
        </Space>
      </div>

      <!-- Stats Cards -->
      <Row :gutter="[16, 16]" class="mv-mb-4">
        <Col :xs="12" :sm="6">
          <Card size="small">
            <Statistic
              title="Ready"
              :value="stats.ready"
              :value-style="{ color: '#52c41a', fontSize: '24px' }"
            >
              <template #prefix><CheckCircleOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card size="small">
            <Statistic
              title="Pending"
              :value="stats.pending"
              :value-style="{ color: '#faad14', fontSize: '24px' }"
            >
              <template #prefix><ClockCircleOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card size="small">
            <Statistic
              title="Completed"
              :value="stats.completed"
              :value-style="{ color: '#1890ff', fontSize: '24px' }"
            >
              <template #prefix><UserAddOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card size="small">
            <Statistic
              title="Total"
              :value="stats.total"
              :value-style="{ fontSize: '24px' }"
            >
              <template #prefix><TeamOutlined /></template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <!-- Conversions Table -->
      <Card>
        <Table
          :columns="columns"
          :data-source="items"
          :loading="listView.loading.value"
          :pagination="{
            current: listView.pagination.current,
            pageSize: listView.pagination.pageSize,
            total: listView.pagination.total,
            showSizeChanger: true,
          }"
          :scroll="{ x: 1400 }"
          row-key="id"
          @change="onTableChange"
        >
          <template #bodyCell="{ column, record }">
            <!-- Candidate with Avatar + email -->
            <template v-if="column.key === 'candidate_name'">
              <div style="display: flex; align-items: center; gap: 10px;">
                <Avatar
                  :style="{ backgroundColor: getAvatarColor(record.candidate_name), flexShrink: 0 }"
                  :size="36"
                >
                  {{ getInitials(record.candidate_name) }}
                </Avatar>
                <div style="min-width: 0;">
                  <div class="mv-font-bold" style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                    {{ record.candidate_name }}
                  </div>
                  <div
                    v-if="record.candidate_email"
                    class="mv-text-secondary"
                    style="font-size: 12px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;"
                  >
                    {{ record.candidate_email }}
                  </div>
                </div>
              </div>
            </template>

            <!-- Position -->
            <template v-if="column.key === 'job_position'">
              <span>{{ record.job_position || record.position || '-' }}</span>
            </template>

            <!-- Status with icon -->
            <template v-if="column.key === 'status'">
              <Tag :color="getStatusColor(record.status)">
                <template v-if="getStatusIcon(record.status)">
                  <component :is="getStatusIcon(record.status)" style="margin-right: 4px;" />
                </template>
                {{ getStatusLabel(record.status) }}
              </Tag>
            </template>

            <!-- Onboarding Progress bar -->
            <template v-if="column.key === 'onboarding_progress'">
              <Progress
                :percent="getOnboardingProgress(record)"
                :status="getProgressStatus(getOnboardingProgress(record))"
                :stroke-width="6"
                size="small"
              />
            </template>

            <!-- Readiness circular progress with tooltip -->
            <template v-if="column.key === 'readiness'">
              <Tooltip>
                <template #title>
                  <div style="white-space: pre-line;">{{ readinessTooltip(record) }}</div>
                </template>
                <Progress
                  type="circle"
                  :percent="calcReadiness(record)"
                  :width="40"
                  :stroke-width="8"
                  :stroke-color="calcReadiness(record) === 100 ? '#52c41a' : calcReadiness(record) >= 50 ? '#1890ff' : '#faad14'"
                />
              </Tooltip>
            </template>

            <!-- Created date -->
            <template v-if="column.key === 'created_at'">
              <span class="mv-text-secondary" style="font-size: 13px;">
                {{ formatDate(record.created_at) }}
              </span>
            </template>

            <!-- Actions -->
            <template v-if="column.key === 'actions'">
              <Space>
                <Button type="link" size="small" @click="openDetail(record)">
                  <template #icon><EyeOutlined /></template>
                  Details
                </Button>
                <Tooltip title="Check readiness">
                  <Button
                    size="small"
                    @click="checkReadiness(record)"
                  >
                    <template #icon><SafetyCertificateOutlined /></template>
                  </Button>
                </Tooltip>
                <Button
                  v-if="record.status === 'ready'"
                  type="primary"
                  size="small"
                  @click="openInitiateModal(record)"
                >
                  <template #icon><PlayCircleOutlined /></template>
                  Initiate
                </Button>
                <Popconfirm
                  v-if="record.status === 'in_progress'"
                  title="Complete this conversion?"
                  ok-text="Yes"
                  cancel-text="No"
                  @confirm="completeConversion(record)"
                >
                  <Button type="primary" size="small" ghost>
                    <template #icon><CheckCircleOutlined /></template>
                    Complete
                  </Button>
                </Popconfirm>
                <Popconfirm
                  v-if="record.status === 'in_progress'"
                  title="Cancel this conversion?"
                  ok-text="Yes"
                  cancel-text="No"
                  @confirm="cancelConversion(record)"
                >
                  <Button size="small" danger>
                    <template #icon><StopOutlined /></template>
                    Cancel
                  </Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <!-- Detail Modal -->
      <Modal
        :open="detailModal.visible.value"
        title="Conversion Details"
        width="720px"
        :footer="null"
        @cancel="detailModal.close()"
      >
        <Spin :spinning="detailModal.loading.value">
          <template v-if="detailModal.data.value">
            <div class="mv-mb-4" style="display: flex; align-items: center; gap: 12px;">
              <Avatar
                :style="{ backgroundColor: getAvatarColor(detailModal.data.value.candidate_name) }"
                :size="48"
              >
                {{ getInitials(detailModal.data.value.candidate_name) }}
              </Avatar>
              <div>
                <h3 class="mv-text-lg mv-font-bold" style="margin: 0;">
                  {{ detailModal.data.value.candidate_name }}
                </h3>
                <div v-if="detailModal.data.value.candidate_email" class="mv-text-secondary" style="font-size: 13px;">
                  {{ detailModal.data.value.candidate_email }}
                </div>
                <Tag :color="getStatusColor(detailModal.data.value.status)" class="mv-mt-1">
                  <component
                    v-if="getStatusIcon(detailModal.data.value.status)"
                    :is="getStatusIcon(detailModal.data.value.status)"
                    style="margin-right: 4px;"
                  />
                  {{ getStatusLabel(detailModal.data.value.status) }}
                </Tag>
              </div>
            </div>

            <!-- Onboarding Progress in detail -->
            <div class="mv-mb-4">
              <div class="mv-text-secondary mv-mb-1" style="font-size: 13px;">Onboarding Progress</div>
              <Progress
                :percent="getOnboardingProgress(detailModal.data.value)"
                :status="getProgressStatus(getOnboardingProgress(detailModal.data.value))"
              />
            </div>

            <Divider orientation="left">Readiness Checklist</Divider>
            <div class="mv-mb-4">
              <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 12px;">
                <Progress
                  type="circle"
                  :percent="calcReadiness(detailModal.data.value)"
                  :width="60"
                  :stroke-width="8"
                  :stroke-color="calcReadiness(detailModal.data.value) === 100 ? '#52c41a' : calcReadiness(detailModal.data.value) >= 50 ? '#1890ff' : '#faad14'"
                />
                <div style="font-size: 14px; color: #666;">
                  {{ calcReadiness(detailModal.data.value) }}% Ready
                </div>
              </div>
              <div class="mv-mb-2">
                <Checkbox :checked="!!detailModal.data.value.documents_verified" disabled>
                  Documents Verified
                </Checkbox>
              </div>
              <div class="mv-mb-2">
                <Checkbox :checked="!!detailModal.data.value.tasks_completed" disabled>
                  Tasks Completed
                </Checkbox>
              </div>
              <div class="mv-mb-2">
                <Checkbox :checked="!!detailModal.data.value.verifications_passed" disabled>
                  Verifications Passed
                </Checkbox>
              </div>
              <div class="mv-mb-2">
                <Checkbox :checked="!!detailModal.data.value.offer_accepted" disabled>
                  Offer Accepted
                </Checkbox>
              </div>
            </div>

            <!-- Conversion Logs -->
            <template v-if="conversionLogs.length">
              <Divider orientation="left">Conversion Logs</Divider>
              <Timeline>
                <TimelineItem
                  v-for="log in conversionLogs"
                  :key="log.id"
                  :color="log.action === 'completed' ? 'green' : log.action === 'failed' ? 'red' : log.action === 'cancelled' ? 'gray' : 'blue'"
                >
                  <div class="mv-font-bold">{{ log.action }}</div>
                  <div v-if="log.performed_by_name" class="mv-text-secondary">
                    by {{ log.performed_by_name }}
                  </div>
                  <div v-if="log.notes" class="mv-text-secondary">{{ log.notes }}</div>
                  <div class="mv-text-secondary" style="font-size: 12px;">
                    {{ formatDate(log.created_at) }}
                  </div>
                </TimelineItem>
              </Timeline>
            </template>

            <!-- Completed Result -->
            <Result
              v-if="detailModal.data.value.status === 'completed'"
              status="success"
              title="Conversion Completed"
              :sub-title="'Employee record created successfully'"
            />

            <!-- Cancelled Result -->
            <Result
              v-if="detailModal.data.value.status === 'cancelled'"
              status="warning"
              title="Conversion Cancelled"
              :sub-title="'This conversion has been cancelled'"
            />

            <!-- Action Buttons -->
            <div v-if="detailModal.data.value.status === 'ready'" class="mv-mt-4" style="text-align: center;">
              <Button
                type="primary"
                size="large"
                @click="openInitiateModal(detailModal.data.value); detailModal.close();"
              >
                <template #icon><PlayCircleOutlined /></template>
                Initiate Conversion
              </Button>
            </div>
          </template>
        </Spin>
      </Modal>

      <!-- Initiate Conversion Modal -->
      <Modal
        :open="initiateModal.visible.value"
        title="Initiate Conversion"
        :confirm-loading="initiateModal.loading.value"
        ok-text="Initiate"
        @ok="submitInitiate"
        @cancel="initiateModal.close()"
      >
        <Alert
          type="info"
          show-icon
          class="mv-mb-4"
          message="This will begin the conversion process for the selected candidate."
        />
        <Form layout="vertical">
          <FormItem label="Department">
            <Input
              :value="initiateForm.department_id"
              placeholder="Enter department ID"
              @update:value="(v) => { initiateForm.department_id = v; }"
            />
          </FormItem>
          <FormItem label="Position">
            <Input
              :value="initiateForm.position"
              placeholder="Enter position title"
              @update:value="(v) => { initiateForm.position = v; }"
            />
          </FormItem>
          <FormItem label="Manager">
            <Input
              :value="initiateForm.manager_id"
              placeholder="Enter manager ID"
              @update:value="(v) => { initiateForm.manager_id = v; }"
            />
          </FormItem>
          <FormItem label="Joining Date">
            <DatePicker
              :value="initiateForm.joining_date"
              style="width: 100%;"
              placeholder="Select joining date"
              @change="(d, ds) => { initiateForm.joining_date = ds; }"
            />
          </FormItem>
          <FormItem label="Salary">
            <InputNumber
              :value="initiateForm.salary"
              style="width: 100%;"
              placeholder="Enter salary"
              :min="0"
              @update:value="(v) => { initiateForm.salary = v; }"
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  </Page>
</template>
