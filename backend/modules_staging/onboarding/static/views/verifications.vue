<script setup>
import { ref, computed, onMounted } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Avatar,
  Card,
  Col,
  Row,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  Select,
  Space,
  Spin,
  Statistic,
  Textarea,
  Tooltip,
  Alert,
  Descriptions,
} from 'ant-design-vue';

const FormItem = Form.Item;
const SelectOption = Select.Option;
const DescriptionsItem = Descriptions.Item;
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  ReloadOutlined,
  SafetyCertificateOutlined,
  SyncOutlined,
  WarningOutlined,
  PlayCircleOutlined,
} from '@ant-design/icons-vue';
import { requestClient } from '#/api/request';
import { useListView, useModal, useNotification } from '#/composables';
import dayjs from 'dayjs';

defineOptions({ name: 'OnboardingVerifications' });

const BASE_URL = '/onboarding';

const notify = useNotification();

const {
  loading,
  dataSource,
  setLoading,
  setDataSource,
  pagination,
  setTotal,
  handleTableChange,
  searchText,
} = useListView({ defaultPageSize: 20 });

const actionModal = useModal();
const actionType = ref('pass');
const actionNotes = ref('');
const externalReference = ref('');
const externalReportUrl = ref('');

const statusFilter = ref(undefined);
const candidateFilter = ref(undefined);
const requirements = ref([]);

// Status color map
const statusMap = {
  pending: { color: 'default', label: 'Pending' },
  in_progress: { color: 'processing', label: 'In Progress' },
  passed: { color: 'success', label: 'Passed' },
  failed: { color: 'error', label: 'Failed' },
  recheck_required: { color: 'warning', label: 'Recheck Required' },
};

// Priority color map
const priorityColorMap = {
  high: 'red',
  medium: 'orange',
  low: 'blue',
  critical: 'volcano',
};

// Category color map
const categoryColorMap = {
  identity: 'blue',
  education: 'cyan',
  employment: 'green',
  criminal: 'red',
  medical: 'purple',
  reference: 'geekblue',
  address: 'gold',
  financial: 'orange',
};

// Stats
const pendingCount = computed(() => {
  return dataSource.value.filter((v) => v.status === 'pending').length;
});
const inProgressCount = computed(() => {
  return dataSource.value.filter((v) => v.status === 'in_progress').length;
});
const passedCount = computed(() => {
  return dataSource.value.filter((v) => v.status === 'passed').length;
});
const failedCount = computed(() => {
  return dataSource.value.filter((v) => v.status === 'failed').length;
});
const recheckCount = computed(() => {
  return dataSource.value.filter((v) => v.status === 'recheck_required').length;
});

// Columns
const columns = [
  { title: 'Candidate', dataIndex: 'candidate_name', key: 'candidate_name', ellipsis: true },
  { title: 'Requirement', dataIndex: 'requirement_name', key: 'requirement_name', ellipsis: true },
  { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
  { title: 'Type', dataIndex: 'verification_type', key: 'verification_type', width: 120 },
  { title: 'Priority', dataIndex: 'priority', key: 'priority', width: 100 },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 150 },
  { title: 'Verified By', dataIndex: 'verified_by_name', key: 'verified_by_name', width: 150 },
  { title: 'Verified At', dataIndex: 'verified_at', key: 'verified_at', width: 160 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' },
];

// Get initials from a name
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return (parts[0].charAt(0) + parts[parts.length - 1].charAt(0)).toUpperCase();
}

// Get avatar background color based on name
function getAvatarColor(name) {
  if (!name) return '#8c8c8c';
  const colors = ['#1890ff', '#52c41a', '#722ed1', '#fa8c16', '#eb2f96', '#13c2c2', '#2f54eb', '#faad14'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// Fetch verifications
async function fetchVerifications() {
  setLoading(true);
  try {
    const params = {
      page: pagination.current,
      page_size: pagination.pageSize,
    };
    if (statusFilter.value) {
      params.status = statusFilter.value;
    }
    if (candidateFilter.value) {
      params.candidate_id = candidateFilter.value;
    }
    const query = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null) {
        query.append(key, params[key]);
      }
    });
    const res = await requestClient.get(BASE_URL + '/verifications?' + query.toString());
    setDataSource(res.items || []);
    setTotal(res.total || 0);
  } catch (err) {
    console.error('Failed to fetch verifications:', err);
    notify.error('Error', 'Failed to load verifications');
  } finally {
    setLoading(false);
  }
}

// Fetch requirements
async function fetchRequirements() {
  try {
    const res = await requestClient.get(BASE_URL + '/verification-requirements');
    requirements.value = res.items || res || [];
  } catch (err) {
    console.error('Failed to fetch requirements:', err);
  }
}

// Handle table change
function onTableChange(pag, filters, sorter) {
  handleTableChange(pag, filters, sorter);
  fetchVerifications();
}

// Handle status filter
function onStatusChange(val) {
  statusFilter.value = val;
  pagination.current = 1;
  fetchVerifications();
}

// Open action modal
function openActionModal(record, type) {
  actionType.value = type;
  actionNotes.value = '';
  externalReference.value = '';
  externalReportUrl.value = '';
  actionModal.open(record);
}

// Check if submit is allowed
const canSubmit = computed(() => {
  if (actionType.value === 'fail' && !actionNotes.value.trim()) {
    return false;
  }
  if (actionType.value === 'recheck' && !actionNotes.value.trim()) {
    return false;
  }
  return true;
});

// Modal title
const modalTitle = computed(() => {
  if (actionType.value === 'pass') return 'Pass Verification';
  if (actionType.value === 'fail') return 'Fail Verification';
  if (actionType.value === 'recheck') return 'Request Recheck';
  return 'Verification Action';
});

// Modal alert type
const modalAlertType = computed(() => {
  if (actionType.value === 'pass') return 'success';
  if (actionType.value === 'fail') return 'error';
  if (actionType.value === 'recheck') return 'warning';
  return 'info';
});

// Modal alert message
const modalAlertMessage = computed(() => {
  if (actionType.value === 'pass') return 'This verification will be marked as passed.';
  if (actionType.value === 'fail') return 'This verification will be marked as failed.';
  if (actionType.value === 'recheck') return 'This verification will be sent back for recheck.';
  return '';
});

// Submit action
async function handleSubmitAction() {
  if (!canSubmit.value) {
    if (actionType.value === 'fail') {
      notify.warning('Validation', 'Notes are required when failing a verification');
    } else if (actionType.value === 'recheck') {
      notify.warning('Validation', 'Notes are required when requesting a recheck');
    }
    return;
  }

  const record = actionModal.data.value;
  if (!record) return;

  actionModal.setLoading(true);
  try {
    const endpoint = BASE_URL + '/verifications/' + record.id + '/' + actionType.value;
    const payload = {};

    if (actionType.value === 'pass') {
      if (actionNotes.value.trim()) {
        payload.notes = actionNotes.value.trim();
      }
      if (externalReference.value.trim()) {
        payload.external_reference = externalReference.value.trim();
      }
      if (externalReportUrl.value.trim()) {
        payload.external_report_url = externalReportUrl.value.trim();
      }
    } else if (actionType.value === 'recheck') {
      payload.notes = actionNotes.value.trim();
    } else {
      payload.notes = actionNotes.value.trim();
    }

    await requestClient.post(endpoint, payload);

    const successMessages = {
      pass: 'Verification marked as passed',
      fail: 'Verification marked as failed',
      recheck: 'Recheck requested successfully',
    };
    notify.success('Success', successMessages[actionType.value] || 'Verification updated');
    actionModal.close();
    fetchVerifications();
  } catch (err) {
    console.error('Failed to update verification:', err);
    notify.error('Error', 'Failed to update verification');
  } finally {
    actionModal.setLoading(false);
  }
}

// Start verification (change from pending to in_progress)
async function handleStartVerification(record) {
  try {
    await requestClient.post(BASE_URL + '/verifications/' + record.id + '/start', {});
    notify.success('Success', 'Verification started');
    fetchVerifications();
  } catch (err) {
    console.error('Failed to start verification:', err);
    notify.error('Error', 'Failed to start verification');
  }
}

// Format date
function formatDate(date) {
  if (!date) return '-';
  return dayjs(date).format('MMM D, YYYY h:mm A');
}

// Get status tag props
function getStatusTag(status) {
  const cfg = statusMap[status] || statusMap.pending;
  return cfg;
}

// Lifecycle
onMounted(() => {
  fetchVerifications();
  fetchRequirements();
});
</script>

<template>
  <Page auto-content-height>
    <div class="mv-p-4">
      <!-- Header -->
      <div class="mv-page-header mv-mb-4">
        <div>
          <h2 class="mv-page-title">
            <SafetyCertificateOutlined class="mv-mr-2" />
            Verifications
          </h2>
          <p class="mv-text-secondary mv-mt-1">
            Manage candidate verification checks
          </p>
        </div>
        <Space>
          <Select
            v-model:value="statusFilter"
            placeholder="Filter by status"
            allow-clear
            class="mv-w-input-lg"
            @change="onStatusChange"
          >
            <SelectOption value="pending">Pending</SelectOption>
            <SelectOption value="in_progress">In Progress</SelectOption>
            <SelectOption value="passed">Passed</SelectOption>
            <SelectOption value="failed">Failed</SelectOption>
            <SelectOption value="recheck_required">Recheck Required</SelectOption>
          </Select>
          <Button @click="fetchVerifications">
            <template #icon><ReloadOutlined /></template>
          </Button>
        </Space>
      </div>

      <!-- Stats Cards -->
      <Row :gutter="[16, 16]" class="mv-mb-4">
        <Col :xs="12" :sm="4">
          <Card size="small">
            <Statistic
              title="Pending"
              :value="pendingCount"
              :value-style="{ color: '#8c8c8c', fontSize: '24px' }"
            >
              <template #prefix><ClockCircleOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="4">
          <Card size="small">
            <Statistic
              title="In Progress"
              :value="inProgressCount"
              :value-style="{ color: '#1890ff', fontSize: '24px' }"
            >
              <template #prefix><SyncOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="4">
          <Card size="small">
            <Statistic
              title="Passed"
              :value="passedCount"
              :value-style="{ color: '#52c41a', fontSize: '24px' }"
            >
              <template #prefix><CheckCircleOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="4">
          <Card size="small">
            <Statistic
              title="Failed"
              :value="failedCount"
              :value-style="{ color: '#ff4d4f', fontSize: '24px' }"
            >
              <template #prefix><CloseCircleOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="4">
          <Card size="small">
            <Statistic
              title="Recheck Required"
              :value="recheckCount"
              :value-style="{ color: '#faad14', fontSize: '24px' }"
            >
              <template #prefix><WarningOutlined /></template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <!-- Verifications Table -->
      <Card>
        <Table
          :columns="columns"
          :data-source="dataSource"
          :loading="loading"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => 'Total ' + total + ' verifications',
          }"
          :scroll="{ x: 1200 }"
          row-key="id"
          @change="onTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'candidate_name'">
              <Space>
                <Avatar
                  :size="32"
                  :style="{ backgroundColor: getAvatarColor(record.candidate_name), verticalAlign: 'middle' }"
                >
                  {{ getInitials(record.candidate_name) }}
                </Avatar>
                <span class="mv-font-medium">{{ record.candidate_name || '-' }}</span>
              </Space>
            </template>
            <template v-if="column.key === 'requirement_name'">
              {{ record.requirement_name || '-' }}
            </template>
            <template v-if="column.key === 'category'">
              <Tag v-if="record.category" :color="categoryColorMap[record.category] || 'default'">
                {{ record.category }}
              </Tag>
              <span v-else class="mv-text-secondary">-</span>
            </template>
            <template v-if="column.key === 'verification_type'">
              <Tag>{{ record.verification_type || '-' }}</Tag>
            </template>
            <template v-if="column.key === 'priority'">
              <Tag v-if="record.priority" :color="priorityColorMap[record.priority] || 'default'">
                {{ record.priority }}
              </Tag>
              <span v-else class="mv-text-secondary">-</span>
            </template>
            <template v-if="column.key === 'status'">
              <Tag :color="getStatusTag(record.status).color">
                <template #icon>
                  <ClockCircleOutlined v-if="record.status === 'pending'" />
                  <SyncOutlined v-else-if="record.status === 'in_progress'" :spin="true" />
                  <CheckCircleOutlined v-else-if="record.status === 'passed'" />
                  <CloseCircleOutlined v-else-if="record.status === 'failed'" />
                  <WarningOutlined v-else-if="record.status === 'recheck_required'" />
                </template>
                {{ getStatusTag(record.status).label }}
              </Tag>
            </template>
            <template v-if="column.key === 'verified_by_name'">
              <span v-if="record.verified_by_name">{{ record.verified_by_name }}</span>
              <span v-else class="mv-text-secondary">-</span>
            </template>
            <template v-if="column.key === 'verified_at'">
              {{ formatDate(record.verified_at) }}
            </template>
            <template v-if="column.key === 'actions'">
              <Space v-if="record.status === 'pending'">
                <Tooltip title="Start Verification">
                  <Button
                    type="text"
                    size="small"
                    @click="handleStartVerification(record)"
                  >
                    <template #icon>
                      <PlayCircleOutlined style="color: #1890ff" />
                    </template>
                  </Button>
                </Tooltip>
                <Tooltip title="Pass">
                  <Button
                    type="text"
                    size="small"
                    @click="openActionModal(record, 'pass')"
                  >
                    <template #icon>
                      <CheckCircleOutlined style="color: #52c41a" />
                    </template>
                  </Button>
                </Tooltip>
                <Tooltip title="Fail">
                  <Button
                    type="text"
                    size="small"
                    @click="openActionModal(record, 'fail')"
                  >
                    <template #icon>
                      <CloseCircleOutlined style="color: #ff4d4f" />
                    </template>
                  </Button>
                </Tooltip>
              </Space>
              <Space v-else-if="record.status === 'in_progress'">
                <Tooltip title="Pass">
                  <Button
                    type="text"
                    size="small"
                    @click="openActionModal(record, 'pass')"
                  >
                    <template #icon>
                      <CheckCircleOutlined style="color: #52c41a" />
                    </template>
                  </Button>
                </Tooltip>
                <Tooltip title="Fail">
                  <Button
                    type="text"
                    size="small"
                    @click="openActionModal(record, 'fail')"
                  >
                    <template #icon>
                      <CloseCircleOutlined style="color: #ff4d4f" />
                    </template>
                  </Button>
                </Tooltip>
              </Space>
              <Space v-else-if="record.status === 'recheck_required'">
                <Tooltip title="Start Verification">
                  <Button
                    type="text"
                    size="small"
                    @click="handleStartVerification(record)"
                  >
                    <template #icon>
                      <PlayCircleOutlined style="color: #1890ff" />
                    </template>
                  </Button>
                </Tooltip>
                <Tooltip title="Pass">
                  <Button
                    type="text"
                    size="small"
                    @click="openActionModal(record, 'pass')"
                  >
                    <template #icon>
                      <CheckCircleOutlined style="color: #52c41a" />
                    </template>
                  </Button>
                </Tooltip>
                <Tooltip title="Fail">
                  <Button
                    type="text"
                    size="small"
                    @click="openActionModal(record, 'fail')"
                  >
                    <template #icon>
                      <CloseCircleOutlined style="color: #ff4d4f" />
                    </template>
                  </Button>
                </Tooltip>
              </Space>
              <Space v-else>
                <Tooltip title="Request Recheck">
                  <Button
                    type="text"
                    size="small"
                    @click="openActionModal(record, 'recheck')"
                  >
                    <template #icon>
                      <WarningOutlined style="color: #faad14" />
                    </template>
                  </Button>
                </Tooltip>
                <Tag v-if="record.status === 'passed'" color="success">Verified</Tag>
                <Tag v-else-if="record.status === 'failed'" color="error">Failed</Tag>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <!-- Action Modal (Pass/Fail/Recheck) -->
      <Modal
        v-model:open="actionModal.visible.value"
        :title="modalTitle"
        :confirm-loading="actionModal.loading.value"
        :ok-button-props="{ disabled: !canSubmit }"
        @ok="handleSubmitAction"
        @cancel="actionModal.close"
      >
        <template v-if="actionModal.data.value">
          <Alert
            :type="modalAlertType"
            show-icon
            class="mv-mb-3"
            :message="modalAlertMessage"
          />

          <Descriptions :column="1" size="small" bordered class="mv-mb-3">
            <DescriptionsItem label="Candidate">
              {{ actionModal.data.value.candidate_name }}
            </DescriptionsItem>
            <DescriptionsItem label="Requirement">
              {{ actionModal.data.value.requirement_name }}
            </DescriptionsItem>
            <DescriptionsItem label="Type">
              {{ actionModal.data.value.verification_type }}
            </DescriptionsItem>
          </Descriptions>

          <Form layout="vertical">
            <FormItem
              :label="actionType === 'fail' ? 'Failure Reason (required)' : actionType === 'recheck' ? 'Recheck Reason (required)' : 'Notes'"
              :required="actionType === 'fail' || actionType === 'recheck'"
            >
              <Textarea
                v-model:value="actionNotes"
                :rows="3"
                :placeholder="actionType === 'fail'
                  ? 'Please provide the reason for failure'
                  : actionType === 'recheck'
                    ? 'Please provide the reason for requesting a recheck'
                    : 'Optional notes'"
              />
            </FormItem>
            <template v-if="actionType === 'pass'">
              <FormItem label="External Reference">
                <Textarea
                  v-model:value="externalReference"
                  :rows="1"
                  placeholder="Optional external reference ID"
                />
              </FormItem>
              <FormItem label="External Report URL">
                <Textarea
                  v-model:value="externalReportUrl"
                  :rows="1"
                  placeholder="Optional URL to external report"
                />
              </FormItem>
            </template>
          </Form>
        </template>
      </Modal>
    </div>
  </Page>
</template>
