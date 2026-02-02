<script setup>
import { ref, reactive, onMounted, computed, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  DatePicker,
  Divider,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Tooltip,
  message,
} from 'ant-design-vue';

// Sub-components must be accessed via dot notation for runtime SFCs
// (direct named exports like FormItem may not exist in the ESM bundle)
const CollapsePanel = Collapse.Panel;
const FormItem = Form.Item;
const SelectOption = Select.Option;
const TabPane = Tabs.TabPane;
import {
  AppstoreOutlined,
  BranchOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RightOutlined,
  SearchOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import {
  getProcessesApi,
  getProcessApi,
  createProcessApi,
  updateProcessApi,
  deleteProcessApi,
  calculateProgressApi,
  moveToStageApi,
  updateProcessStageApi,
  updateProcessTaskApi,
  getTemplatesApi,
} from '#/api/onboarding';
import { requestClient } from '#/api/request';
import { useListView, useModal, useNotification } from '#/composables';

defineOptions({ name: 'OnboardingProcesses' });

const notify = useNotification();
const notifySuccess = notify.success;
const notifyError = notify.error;

// -- View mode (list / kanban) --
const viewMode = ref('list');

// -- useListView for table state --
const listView = useListView({
  defaultPageSize: 20,
  filterFields: [
    { key: 'status', defaultValue: null },
  ],
});

// -- Detail modal --
const detailModal = useModal();

// -- Create modal --
const createModal = useModal();

// -- Lookup data --
const templates = ref([]);
const candidates = ref([]);

// -- Detail data --
const processDetail = ref(null);
const detailTab = ref('overview');

// -- Create form --
const formRef = ref(null);
const formState = reactive({
  candidate_id: undefined,
  template_id: undefined,
  start_date: null,
  notes: '',
});

const formRules = {
  candidate_id: [{ required: true, message: 'Please select a candidate' }],
  template_id: [{ required: true, message: 'Please select a template' }],
};

// -- Status config --
const statusConfig = [
  { value: 'pending', label: 'Pending', color: 'orange' },
  { value: 'in_progress', label: 'In Progress', color: 'blue' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'on_hold', label: 'On Hold', color: 'default' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
];

function getStatusLabel(status) {
  const cfg = statusConfig.find(function(s) { return s.value === status; });
  return cfg ? cfg.label : status;
}

function getStatusColor(status) {
  const cfg = statusConfig.find(function(s) { return s.value === status; });
  return cfg ? cfg.color : 'default';
}

function getProgressStatus(percent) {
  if (percent >= 100) return 'success';
  if (percent > 0) return 'active';
  return 'normal';
}

function getStageStatusColor(status) {
  if (status === 'completed') return 'green';
  if (status === 'in_progress') return 'blue';
  if (status === 'skipped') return 'orange';
  return 'default';
}

function formatDate(date) {
  if (!date) return '-';
  return dayjs(date).format('MMM D, YYYY');
}

// -- Table columns --
const columns = [
  {
    title: 'Candidate',
    dataIndex: 'candidate_name',
    key: 'candidate_name',
    ellipsis: true,
  },
  {
    title: 'Template',
    dataIndex: 'template_name',
    key: 'template_name',
    ellipsis: true,
  },
  {
    title: 'Stage',
    dataIndex: 'current_stage_name',
    key: 'current_stage_name',
    width: 160,
  },
  {
    title: 'Progress',
    key: 'progress',
    width: 160,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 120,
  },
  {
    title: 'Start Date',
    dataIndex: 'start_date',
    key: 'start_date',
    width: 130,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 140,
    fixed: 'right',
  },
];

// -- Data fetching --
async function fetchProcesses() {
  listView.setLoading(true);
  try {
    const params = listView.getQueryParams();
    if (viewMode.value === 'kanban') {
      params.page_size = 200;
      params.page = 1;
    }
    const res = await getProcessesApi(params);
    listView.setDataSource(res.items || res.results || []);
    listView.setTotal(res.total || res.count || 0);
  } catch (err) {
    console.error('Failed to fetch processes:', err);
    notifyError('Error', 'Failed to load onboarding processes');
  } finally {
    listView.setLoading(false);
  }
}

async function fetchTemplates() {
  try {
    const res = await getTemplatesApi({ page_size: 200, status: 'active' });
    templates.value = res.items || res.results || [];
  } catch (err) {
    console.error('Failed to fetch templates:', err);
  }
}

async function fetchCandidates() {
  try {
    const res = await requestClient.get('/recruitment/candidates/', {
      params: { limit: 100 },
    });
    candidates.value = res.items || res.results || [];
  } catch (err) {
    // Recruitment module may not be installed, graceful fallback
    console.warn('Could not load candidates:', err);
    candidates.value = [];
  }
}

// -- Table events --
function handleTableChange(pag, filters, sorter) {
  listView.handleTableChange(pag, filters, sorter);
  fetchProcesses();
}

function handleSearch(value) {
  listView.searchText.value = value;
  listView.pagination.current = 1;
  fetchProcesses();
}

function handleStatusFilter(value) {
  listView.setFilter('status', value);
  listView.pagination.current = 1;
  fetchProcesses();
}

// -- View mode toggle --
function switchViewMode(mode) {
  viewMode.value = mode;
  fetchProcesses();
}

// -- Statistics --
const statsData = computed(function() {
  const items = listView.dataSource.value || [];
  return {
    total: items.length,
    pending: items.filter(function(i) { return i.status === 'pending'; }).length,
    in_progress: items.filter(function(i) { return i.status === 'in_progress'; }).length,
    completed: items.filter(function(i) { return i.status === 'completed'; }).length,
    on_hold: items.filter(function(i) { return i.status === 'on_hold'; }).length,
    cancelled: items.filter(function(i) { return i.status === 'cancelled'; }).length,
  };
});

// -- Kanban columns computed --
const kanbanColumns = computed(function() {
  const items = listView.dataSource.value || [];
  return [
    { key: 'pending', label: 'Pending', color: '#fa8c16', items: items.filter(function(i) { return i.status === 'pending'; }) },
    { key: 'in_progress', label: 'In Progress', color: '#1890ff', items: items.filter(function(i) { return i.status === 'in_progress'; }) },
    { key: 'completed', label: 'Completed', color: '#52c41a', items: items.filter(function(i) { return i.status === 'completed'; }) },
    { key: 'on_hold', label: 'On Hold', color: '#8c8c8c', items: items.filter(function(i) { return i.status === 'on_hold'; }) },
    { key: 'cancelled', label: 'Cancelled', color: '#ff4d4f', items: items.filter(function(i) { return i.status === 'cancelled'; }) },
  ];
});

// -- Create process --
function openCreateModal() {
  formState.candidate_id = undefined;
  formState.template_id = undefined;
  formState.start_date = null;
  formState.notes = '';
  createModal.open();
}

async function handleCreateSubmit() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  createModal.setLoading(true);
  try {
    const payload = {
      candidate_id: formState.candidate_id,
      template_id: formState.template_id,
      start_date: formState.start_date
        ? dayjs(formState.start_date).format('YYYY-MM-DD')
        : undefined,
      notes: formState.notes || undefined,
    };
    await createProcessApi(payload);
    notifySuccess('Success', 'Onboarding process created successfully');
    createModal.close();
    fetchProcesses();
  } catch (err) {
    console.error('Failed to create process:', err);
    notifyError('Error', 'Failed to create onboarding process');
  } finally {
    createModal.setLoading(false);
  }
}

// -- Delete process --
async function handleDeleteProcess(record) {
  try {
    await deleteProcessApi(record.id);
    notifySuccess('Success', 'Onboarding process deleted');
    fetchProcesses();
    // Close detail modal if viewing the deleted process
    if (processDetail.value && processDetail.value.id === record.id) {
      detailModal.close();
      processDetail.value = null;
    }
  } catch (err) {
    console.error('Failed to delete process:', err);
    notifyError('Error', 'Failed to delete onboarding process');
  }
}

// -- View process detail --
async function openDetailModal(record) {
  detailModal.open(record);
  detailTab.value = 'overview';
  processDetail.value = null;

  try {
    const detail = await getProcessApi(record.id);
    processDetail.value = detail;
  } catch (err) {
    console.error('Failed to fetch process detail:', err);
    notifyError('Error', 'Failed to load process details');
    detailModal.close();
  }
}

// -- Recalculate progress --
async function handleRecalculate() {
  if (!processDetail.value) return;
  try {
    const res = await calculateProgressApi(processDetail.value.id);
    processDetail.value.progress = res.progress ?? processDetail.value.progress;
    message.success('Progress recalculated');
    fetchProcesses();
  } catch (err) {
    console.error('Failed to recalculate progress:', err);
    notifyError('Error', 'Failed to recalculate progress');
  }
}

// -- Move to stage --
async function handleMoveToStage(stageId) {
  if (!processDetail.value) return;
  try {
    await moveToStageApi(processDetail.value.id, stageId);
    message.success('Moved to stage successfully');
    // Refresh detail
    const detail = await getProcessApi(processDetail.value.id);
    processDetail.value = detail;
    fetchProcesses();
  } catch (err) {
    console.error('Failed to move to stage:', err);
    notifyError('Error', 'Failed to move to stage');
  }
}

// -- Mark stage complete --
async function handleMarkStageComplete(stage) {
  try {
    const stageId = stage.id || stage.process_stage_id;
    await updateProcessStageApi(stageId, { status: 'completed' });
    message.success('Stage marked as completed');
    // Refresh detail
    if (processDetail.value) {
      const detail = await getProcessApi(processDetail.value.id);
      processDetail.value = detail;
      fetchProcesses();
    }
  } catch (err) {
    console.error('Failed to mark stage complete:', err);
    notifyError('Error', 'Failed to mark stage as completed');
  }
}

// -- Toggle task completion --
async function handleTaskToggle(task) {
  const newStatus = task.is_completed ? false : true;
  try {
    await updateProcessTaskApi(task.id, { is_completed: newStatus });
    task.is_completed = newStatus;
    message.success(newStatus ? 'Task completed' : 'Task reopened');
    // Refresh detail to get updated progress
    if (processDetail.value) {
      const detail = await getProcessApi(processDetail.value.id);
      processDetail.value = detail;
    }
  } catch (err) {
    console.error('Failed to update task:', err);
    notifyError('Error', 'Failed to update task');
  }
}

// -- Computed helpers --
const stagesForDetail = computed(function() {
  if (!processDetail.value) return [];
  return processDetail.value.stages || processDetail.value.process_stages || [];
});

const allTasksForDetail = computed(function() {
  const stages = stagesForDetail.value;
  const tasks = [];
  stages.forEach(function(stage, idx) {
    const stageTasks = stage.tasks || stage.process_tasks || [];
    stageTasks.forEach(function(task) {
      tasks.push(Object.assign({}, task, {
        stage_name: stage.name || stage.stage_name || ('Stage ' + (idx + 1)),
      }));
    });
  });
  return tasks;
});

const completedTaskCount = computed(function() {
  return allTasksForDetail.value.filter(function(t) { return t.is_completed; }).length;
});

const totalTaskCount = computed(function() {
  return allTasksForDetail.value.length;
});

// -- Helper: get initials for avatar --
function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}

// -- Helper: avatar background color from name --
function getAvatarColor(name) {
  if (!name) return '#8c8c8c';
  const colors = ['#1890ff', '#52c41a', '#fa8c16', '#722ed1', '#eb2f96', '#13c2c2', '#fa541c', '#2f54eb'];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

// -- Lifecycle --
onMounted(function() {
  fetchProcesses();
  fetchTemplates();
  fetchCandidates();
});
</script>

<template>
  <Page auto-content-height>
    <div class="mv-p-4">
      <!-- Header -->
      <div class="ob-proc-header mv-mb-4">
        <div>
          <h1 class="mv-page-title">
            <BranchOutlined class="mv-mr-2" />
            Onboarding Processes
          </h1>
          <p class="mv-text-secondary" style="margin: 0;">
            Track and manage candidate onboarding workflows
          </p>
        </div>
        <Space>
          <Button
            :type="viewMode === 'list' ? 'primary' : 'default'"
            @click="switchViewMode('list')"
          >
            <template #icon><UnorderedListOutlined /></template>
          </Button>
          <Button
            :type="viewMode === 'kanban' ? 'primary' : 'default'"
            @click="switchViewMode('kanban')"
          >
            <template #icon><AppstoreOutlined /></template>
          </Button>
          <Button type="primary" @click="openCreateModal">
            <template #icon><PlusOutlined /></template>
            Start Onboarding
          </Button>
        </Space>
      </div>

      <!-- Toolbar -->
      <div class="ob-proc-toolbar mv-mb-4">
        <Space wrap>
          <Input
            :value="listView.searchText.value"
            placeholder="Search processes..."
            allow-clear
            class="mv-w-input-lg"
            @change="(e) => handleSearch(e.target.value)"
          >
            <template #prefix><SearchOutlined /></template>
          </Input>

          <Select
            :value="listView.filters.status"
            placeholder="All Statuses"
            allow-clear
            class="mv-w-input"
            @change="handleStatusFilter"
          >
            <SelectOption
              v-for="s in statusConfig"
              :key="s.value"
              :value="s.value"
            >
              {{ s.label }}
            </SelectOption>
          </Select>

          <Button @click="fetchProcesses">
            <template #icon><ReloadOutlined /></template>
          </Button>
        </Space>
      </div>

      <!-- Statistics Row (kanban mode) -->
      <div v-if="viewMode === 'kanban'" class="ob-proc-stats mv-mb-4">
        <Row :gutter="[16, 16]">
          <Col :xs="12" :sm="8" :md="4">
            <Card size="small" class="ob-proc-stat-card">
              <Statistic title="Total" :value="statsData.total">
                <template #prefix><TeamOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :md="4">
            <Card size="small" class="ob-proc-stat-card ob-proc-stat-pending">
              <Statistic title="Pending" :value="statsData.pending" :value-style="{ color: '#fa8c16' }">
                <template #prefix><ClockCircleOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :md="4">
            <Card size="small" class="ob-proc-stat-card ob-proc-stat-progress">
              <Statistic title="In Progress" :value="statsData.in_progress" :value-style="{ color: '#1890ff' }">
                <template #prefix><PlayCircleOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :md="4">
            <Card size="small" class="ob-proc-stat-card ob-proc-stat-completed">
              <Statistic title="Completed" :value="statsData.completed" :value-style="{ color: '#52c41a' }">
                <template #prefix><CheckCircleOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :md="4">
            <Card size="small" class="ob-proc-stat-card">
              <Statistic title="On Hold" :value="statsData.on_hold" :value-style="{ color: '#8c8c8c' }" />
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :md="4">
            <Card size="small" class="ob-proc-stat-card ob-proc-stat-cancelled">
              <Statistic title="Cancelled" :value="statsData.cancelled" :value-style="{ color: '#ff4d4f' }">
                <template #prefix><DeleteOutlined /></template>
              </Statistic>
            </Card>
          </Col>
        </Row>
      </div>

      <!-- List View -->
      <Card v-if="viewMode === 'list'" :body-style="{ padding: 0 }">
        <Table
          :columns="columns"
          :data-source="listView.dataSource.value"
          :loading="listView.loading.value"
          :pagination="{
            current: listView.pagination.current,
            pageSize: listView.pagination.pageSize,
            total: listView.pagination.total,
            showSizeChanger: true,
            showTotal: (total) => 'Total ' + total + ' processes',
          }"
          :scroll="{ x: 960 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'candidate_name'">
              <div class="ob-proc-candidate-cell">
                <Avatar
                  :size="32"
                  :style="{ backgroundColor: getAvatarColor(record.candidate_name), flexShrink: 0 }"
                >
                  {{ getInitials(record.candidate_name) }}
                </Avatar>
                <div class="ob-proc-candidate-info">
                  <span class="ob-proc-candidate-name">{{ record.candidate_name || 'N/A' }}</span>
                  <span v-if="record.candidate_email" class="ob-proc-candidate-email mv-text-secondary">
                    {{ record.candidate_email }}
                  </span>
                </div>
              </div>
            </template>

            <template v-if="column.key === 'current_stage_name'">
              <Tag v-if="record.current_stage_name" color="blue">
                {{ record.current_stage_name }}
              </Tag>
              <span v-else class="mv-text-secondary">-</span>
            </template>

            <template v-if="column.key === 'progress'">
              <Progress
                :percent="record.progress || 0"
                :status="getProgressStatus(record.progress || 0)"
                size="small"
                :stroke-width="6"
              />
            </template>

            <template v-if="column.key === 'status'">
              <Tag :color="getStatusColor(record.status)">
                {{ getStatusLabel(record.status) }}
              </Tag>
            </template>

            <template v-if="column.key === 'start_date'">
              {{ formatDate(record.start_date || record.created_at) }}
            </template>

            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="View Details">
                  <Button
                    type="link"
                    size="small"
                    @click="openDetailModal(record)"
                  >
                    <template #icon><EyeOutlined /></template>
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Delete this onboarding process?"
                  ok-text="Yes"
                  cancel-text="No"
                  @confirm="() => handleDeleteProcess(record)"
                >
                  <Tooltip title="Delete">
                    <Button
                      type="link"
                      size="small"
                      danger
                    >
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <!-- Kanban View -->
      <Spin v-if="viewMode === 'kanban'" :spinning="listView.loading.value">
        <div class="ob-kanban-board">
          <div
            v-for="col in kanbanColumns"
            :key="col.key"
            class="ob-kanban-column"
          >
            <div class="ob-kanban-column-header" :style="{ borderTopColor: col.color }">
              <span class="ob-kanban-column-title">{{ col.label }}</span>
              <Badge
                :count="col.items.length"
                :number-style="{ backgroundColor: col.color }"
                :overflow-count="999"
              />
            </div>
            <div class="ob-kanban-column-body">
              <div
                v-for="item in col.items"
                :key="item.id"
                class="ob-kanban-card"
              >
                <div class="ob-kanban-card-top">
                  <Avatar
                    :size="28"
                    :style="{ backgroundColor: getAvatarColor(item.candidate_name), flexShrink: 0 }"
                  >
                    {{ getInitials(item.candidate_name) }}
                  </Avatar>
                  <div class="ob-kanban-card-info">
                    <span class="ob-kanban-card-name">{{ item.candidate_name || 'N/A' }}</span>
                    <span class="ob-kanban-card-template mv-text-secondary">{{ item.template_name || '' }}</span>
                  </div>
                </div>
                <div class="ob-kanban-card-progress">
                  <Progress
                    :percent="item.progress || 0"
                    :status="getProgressStatus(item.progress || 0)"
                    size="small"
                    :stroke-width="4"
                  />
                </div>
                <div class="ob-kanban-card-meta">
                  <Tag v-if="item.current_stage_name" :color="getStageStatusColor(item.current_stage_status || 'pending')" size="small">
                    {{ item.current_stage_name }}
                  </Tag>
                  <span class="ob-kanban-card-date mv-text-secondary">
                    <CalendarOutlined style="margin-right: 2px;" />
                    {{ formatDate(item.start_date || item.created_at) }}
                  </span>
                </div>
                <div class="ob-kanban-card-actions">
                  <Tooltip title="View Details">
                    <Button type="link" size="small" @click="openDetailModal(item)">
                      <template #icon><EyeOutlined /></template>
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Delete this onboarding process?"
                    ok-text="Yes"
                    cancel-text="No"
                    @confirm="() => handleDeleteProcess(item)"
                  >
                    <Tooltip title="Delete">
                      <Button type="link" size="small" danger>
                        <template #icon><DeleteOutlined /></template>
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                </div>
              </div>
              <Empty
                v-if="col.items.length === 0"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
                description="No processes"
                class="ob-kanban-empty"
              />
            </div>
          </div>
        </div>
      </Spin>

      <!-- Create Process Modal -->
      <Modal
        :open="createModal.visible.value"
        title="Start Onboarding Process"
        :confirm-loading="createModal.loading.value"
        :width="560"
        @cancel="createModal.close()"
        @ok="handleCreateSubmit"
      >
        <Form
          ref="formRef"
          :model="formState"
          :rules="formRules"
          layout="vertical"
          class="mv-mt-4"
        >
          <FormItem label="Candidate" name="candidate_id">
            <Select
              v-model:value="formState.candidate_id"
              placeholder="Select a candidate"
              show-search
              :filter-option="(input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
            >
              <SelectOption
                v-for="c in candidates"
                :key="c.id"
                :value="c.id"
                :label="c.name || (c.first_name + ' ' + c.last_name)"
              >
                {{ c.name || (c.first_name + ' ' + c.last_name) }}
                <span v-if="c.email" class="mv-text-secondary" style="font-size: 12px;">
                  &mdash; {{ c.email }}
                </span>
              </SelectOption>
            </Select>
          </FormItem>

          <FormItem label="Onboarding Template" name="template_id">
            <Select
              v-model:value="formState.template_id"
              placeholder="Select a template"
              show-search
              :filter-option="(input, option) => (option?.label || '').toLowerCase().includes(input.toLowerCase())"
            >
              <SelectOption
                v-for="t in templates"
                :key="t.id"
                :value="t.id"
                :label="t.name"
              >
                {{ t.name }}
                <span v-if="t.estimated_duration_days" class="mv-text-secondary" style="font-size: 12px;">
                  &mdash; {{ t.estimated_duration_days }} days
                </span>
              </SelectOption>
            </Select>
          </FormItem>

          <FormItem label="Start Date" name="start_date">
            <DatePicker
              v-model:value="formState.start_date"
              style="width: 100%;"
              placeholder="Select start date"
            />
          </FormItem>

          <FormItem label="Notes" name="notes">
            <Input
              v-model:value="formState.notes"
              type="textarea"
              :rows="3"
              placeholder="Optional notes..."
            />
          </FormItem>
        </Form>
      </Modal>

      <!-- Process Detail Modal -->
      <Modal
        :open="detailModal.visible.value"
        title="Onboarding Process Details"
        :width="800"
        :footer="null"
        @cancel="detailModal.close()"
      >
        <Spin v-if="!processDetail" tip="Loading..." class="ob-proc-detail-spin" />

        <template v-if="processDetail">
          <Tabs v-model:activeKey="detailTab">
            <!-- Overview Tab -->
            <TabPane key="overview" tab="Overview">
              <div class="ob-proc-overview">
                <Row :gutter="[16, 16]">
                  <Col :xs="24" :sm="8">
                    <div class="ob-proc-progress-circle">
                      <Progress
                        type="circle"
                        :percent="processDetail.progress || 0"
                        :size="100"
                      />
                      <div class="ob-proc-progress-label">Overall Progress</div>
                    </div>
                  </Col>
                  <Col :xs="24" :sm="16">
                    <div class="ob-proc-info-grid">
                      <div class="ob-proc-info-item">
                        <span class="ob-proc-info-label">Candidate</span>
                        <span class="ob-proc-info-value">
                          {{ processDetail.candidate_name || 'N/A' }}
                        </span>
                      </div>
                      <div class="ob-proc-info-item">
                        <span class="ob-proc-info-label">Template</span>
                        <span class="ob-proc-info-value">
                          {{ processDetail.template_name || 'N/A' }}
                        </span>
                      </div>
                      <div class="ob-proc-info-item">
                        <span class="ob-proc-info-label">Current Stage</span>
                        <span class="ob-proc-info-value">
                          <Tag v-if="processDetail.current_stage_name" color="blue">
                            {{ processDetail.current_stage_name }}
                          </Tag>
                          <span v-else>-</span>
                        </span>
                      </div>
                      <div class="ob-proc-info-item">
                        <span class="ob-proc-info-label">Status</span>
                        <span class="ob-proc-info-value">
                          <Tag :color="getStatusColor(processDetail.status)">
                            {{ getStatusLabel(processDetail.status) }}
                          </Tag>
                        </span>
                      </div>
                      <div class="ob-proc-info-item">
                        <span class="ob-proc-info-label">Start Date</span>
                        <span class="ob-proc-info-value">
                          {{ formatDate(processDetail.start_date || processDetail.created_at) }}
                        </span>
                      </div>
                      <div class="ob-proc-info-item">
                        <span class="ob-proc-info-label">Expected Completion</span>
                        <span class="ob-proc-info-value">
                          <template v-if="processDetail.expected_completion_date">
                            <CalendarOutlined style="margin-right: 4px;" />
                            {{ formatDate(processDetail.expected_completion_date) }}
                          </template>
                          <span v-else class="mv-text-secondary">-</span>
                        </span>
                      </div>
                      <div class="ob-proc-info-item">
                        <span class="ob-proc-info-label">Tasks</span>
                        <span class="ob-proc-info-value">
                          {{ completedTaskCount }} / {{ totalTaskCount }} completed
                        </span>
                      </div>
                    </div>
                  </Col>
                </Row>

                <Divider />

                <Space>
                  <Button size="small" @click="handleRecalculate">
                    <template #icon><ReloadOutlined /></template>
                    Recalculate Progress
                  </Button>
                </Space>
              </div>
            </TabPane>

            <!-- Stages Tab -->
            <TabPane key="stages" tab="Stages">
              <div v-if="stagesForDetail.length" class="ob-proc-stages">
                <Collapse accordion>
                  <CollapsePanel
                    v-for="(stage, idx) in stagesForDetail"
                    :key="stage.id || idx"
                  >
                    <template #header>
                      <div class="ob-proc-stage-header">
                        <Space>
                          <span class="ob-proc-stage-num">{{ idx + 1 }}</span>
                          <span class="ob-proc-stage-name">
                            {{ stage.name || stage.stage_name || ('Stage ' + (idx + 1)) }}
                          </span>
                          <Tag :color="getStageStatusColor(stage.status)">
                            {{ stage.status || 'pending' }}
                          </Tag>
                        </Space>
                      </div>
                    </template>
                    <template #extra>
                      <Space>
                        <Button
                          v-if="stage.status !== 'completed'"
                          type="link"
                          size="small"
                          style="color: #52c41a;"
                          @click.stop="handleMarkStageComplete(stage)"
                        >
                          <CheckCircleOutlined /> Mark Complete
                        </Button>
                        <Button
                          v-if="stage.status !== 'completed' && stage.status !== 'in_progress'"
                          type="link"
                          size="small"
                          @click.stop="handleMoveToStage(stage.stage_id || stage.id)"
                        >
                          <RightOutlined /> Move Here
                        </Button>
                      </Space>
                    </template>

                    <div class="ob-proc-stage-body">
                      <div v-if="stage.description" class="ob-proc-stage-desc mv-mb-3">
                        {{ stage.description }}
                      </div>

                      <div
                        v-if="(stage.tasks || stage.process_tasks || []).length"
                        class="ob-proc-task-list"
                      >
                        <div
                          v-for="task in (stage.tasks || stage.process_tasks || [])"
                          :key="task.id"
                          class="ob-proc-task-item"
                        >
                          <Checkbox
                            :checked="task.is_completed"
                            @change="() => handleTaskToggle(task)"
                          >
                            <span :class="{ 'ob-proc-task-done': task.is_completed }">
                              {{ task.name || task.task_name || 'Untitled Task' }}
                            </span>
                          </Checkbox>
                          <span v-if="task.assigned_to_name" class="mv-text-secondary" style="font-size: 12px; margin-left: 8px;">
                            {{ task.assigned_to_name }}
                          </span>
                        </div>
                      </div>
                      <Empty
                        v-else
                        description="No tasks in this stage"
                        :image="Empty.PRESENTED_IMAGE_SIMPLE"
                      />
                    </div>
                  </CollapsePanel>
                </Collapse>
              </div>
              <Empty v-else description="No stages configured" />
            </TabPane>

            <!-- Tasks Tab -->
            <TabPane key="tasks" tab="Tasks">
              <div v-if="allTasksForDetail.length" class="ob-proc-tasks-all">
                <div class="ob-proc-tasks-summary mv-mb-3">
                  <Progress
                    :percent="totalTaskCount > 0
                      ? Math.round((completedTaskCount / totalTaskCount) * 100)
                      : 0"
                    :status="completedTaskCount === totalTaskCount && totalTaskCount > 0
                      ? 'success'
                      : 'active'"
                    size="small"
                  />
                  <span class="mv-text-secondary" style="font-size: 13px;">
                    {{ completedTaskCount }} of {{ totalTaskCount }} tasks completed
                  </span>
                </div>

                <div
                  v-for="task in allTasksForDetail"
                  :key="task.id"
                  class="ob-proc-task-row"
                >
                  <Checkbox
                    :checked="task.is_completed"
                    @change="() => handleTaskToggle(task)"
                  >
                    <span :class="{ 'ob-proc-task-done': task.is_completed }">
                      {{ task.name || task.task_name || 'Untitled Task' }}
                    </span>
                  </Checkbox>
                  <Tag size="small" style="margin-left: auto;">
                    {{ task.stage_name }}
                  </Tag>
                </div>
              </div>
              <Empty v-else description="No tasks found" />
            </TabPane>
          </Tabs>
        </template>
      </Modal>
    </div>
  </Page>
</template>
