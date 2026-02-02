<script setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Drawer,
  Form,
  FormItem,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  SelectOption,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  TimelineItem,
  Tooltip,
  message,
} from 'ant-design-vue';
import {
  AppstoreOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  MessageOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserAddOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import {
  getOffboardingTemplatesApi,
  getOffboardingStagesApi,
  getOffboardingEmployeesApi,
  getOffboardingStatsApi,
  moveOffboardingEmployeeApi,
  createOffboardingEmployeeApi,
  getExitReasonsApi,
  createExitReasonApi,
  deleteExitReasonApi,
  getOffboardingNotesApi,
  createOffboardingNoteApi,
  deleteOffboardingNoteApi,
  updateEmployeeTaskStatusApi,
  removeOffboardingEmployeeApi,
} from '#/api/offboarding';
import { requestClient } from '#/api/request';

const TabPane = Tabs.TabPane;
const TextArea = Input.TextArea;

defineOptions({ name: 'OffboardingPipeline' });

// State
const loading = ref(false);
const employees = ref([]);
const templates = ref([]);
const stages = ref([]);
const selectedTemplateId = ref(null);
const showEmployeeDrawer = ref(false);
const selectedEmployee = ref(null);
const viewMode = ref('card');
const showAddModal = ref(false);
const allEmployees = ref([]);
const stats = ref(null);

const addForm = ref({
  employee_id: null,
  stage_id: null,
  notice_period_starts: null,
  notice_period_ends: null,
});

// Exit Reasons & Notes state
const exitReasons = ref([]);
const notes = ref([]);
const exitReasonLoading = ref(false);
const notesLoading = ref(false);
const activeTab = ref('tasks');
const newNoteText = ref('');
const showExitReasonModal = ref(false);
const exitReasonForm = ref({
  title: '',
  description: '',
});

const stageColors = {
  notice_period: '#1890ff',
  interview: '#722ed1',
  handover: '#faad14',
  fnf: '#52c41a',
  other: '#13c2c2',
  archived: '#8c8c8c',
};

const stageLabels = {
  notice_period: 'Notice Period',
  interview: 'Exit Interview',
  handover: 'Work Handover',
  fnf: 'FnF Settlement',
  other: 'Other',
  archived: 'Archived',
};

const tableColumns = computed(() => [
  {
    title: '',
    key: 'avatar',
    width: 60,
  },
  {
    title: 'Employee',
    key: 'name',
    sorter: (a, b) => (a.employee_name || '').localeCompare(b.employee_name || ''),
  },
  {
    title: 'Department',
    key: 'department',
  },
  {
    title: 'Stage',
    key: 'stage',
    width: 180,
  },
  {
    title: 'Notice Period',
    key: 'notice_period',
    width: 150,
  },
  {
    title: 'Task Progress',
    key: 'progress',
    width: 180,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
    fixed: 'right',
  },
]);

const statistics = computed(() => {
  if (!stats.value) {
    return {
      total: employees.value.length,
      notice_period: 0,
      interview: 0,
      handover: 0,
      fnf: 0,
      ending_soon: 0,
    };
  }
  return {
    total: stats.value.total_employees || 0,
    notice_period: stats.value.in_notice_period || 0,
    interview: stats.value.in_interview || 0,
    handover: stats.value.in_handover || 0,
    fnf: stats.value.in_fnf || 0,
    ending_soon: stats.value.ending_soon || 0,
  };
});

const filteredStages = computed(() => {
  if (!selectedTemplateId.value) return stages.value;
  return stages.value.filter((s) => s.offboarding_id === selectedTemplateId.value);
});

const getEmployeesForStage = (stageId) => {
  return employees.value.filter((e) => e.stage_id === stageId);
};

// --- Fetch functions ---

const fetchTemplates = async () => {
  try {
    const response = await getOffboardingTemplatesApi({ status: 'ongoing' });
    templates.value = Array.isArray(response) ? response : (response.results || []);
    if (templates.value.length > 0 && !selectedTemplateId.value) {
      selectedTemplateId.value = templates.value[0].id;
    }
  } catch (error) {
    console.error('Failed to fetch templates:', error);
  }
};

const fetchStages = async () => {
  try {
    const params = {};
    if (selectedTemplateId.value) {
      params.offboarding_id = selectedTemplateId.value;
    }
    const response = await getOffboardingStagesApi(params);
    stages.value = Array.isArray(response) ? response : (response.results || []);
  } catch (error) {
    console.error('Failed to fetch stages:', error);
  }
};

const fetchEmployees = async () => {
  loading.value = true;
  try {
    const params = { page_size: 100, include_tasks: true };
    if (selectedTemplateId.value) {
      params.offboarding_id = selectedTemplateId.value;
    }
    const response = await getOffboardingEmployeesApi(params);
    employees.value = Array.isArray(response) ? response : (response.results || []);
  } catch (error) {
    console.error('Failed to fetch employees:', error);
    message.error('Failed to load offboarding employees');
  } finally {
    loading.value = false;
  }
};

const fetchStats = async () => {
  try {
    stats.value = await getOffboardingStatsApi();
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
};

const fetchAllEmployees = async () => {
  try {
    const response = await requestClient.get('/employee/employees?limit=200');
    const list = Array.isArray(response) ? response : (response.results || response.items || []);
    allEmployees.value = list.map((e) => ({
      id: e.id,
      name: `${e.employee_first_name || ''} ${e.employee_last_name || ''}`.trim() || e.email || `Employee #${e.id}`,
    }));
  } catch (error) {
    console.error('Failed to fetch employees:', error);
  }
};

const fetchEmployeeDetails = async (employeeId) => {
  await Promise.all([
    fetchExitReasons(employeeId),
    fetchNotes(employeeId),
  ]);
};

const fetchExitReasons = async (employeeId) => {
  exitReasonLoading.value = true;
  try {
    const response = await getExitReasonsApi({ offboarding_employee_id: employeeId });
    exitReasons.value = Array.isArray(response) ? response : (response.results || []);
  } catch (error) {
    console.error('Failed to fetch exit reasons:', error);
  } finally {
    exitReasonLoading.value = false;
  }
};

const fetchNotes = async (employeeId) => {
  notesLoading.value = true;
  try {
    const response = await getOffboardingNotesApi(employeeId);
    notes.value = Array.isArray(response) ? response : (response.results || []);
  } catch (error) {
    console.error('Failed to fetch notes:', error);
  } finally {
    notesLoading.value = false;
  }
};

// --- Event handlers ---

const handleTemplateChange = () => {
  fetchStages();
  fetchEmployees();
};

const handleStageChange = async (emp, newStageId) => {
  const oldStageId = emp.stage_id;
  if (oldStageId === newStageId) return;

  const empIndex = employees.value.findIndex((e) => e.id === emp.id);
  if (empIndex !== -1) {
    employees.value[empIndex].stage_id = newStageId;
    const newStage = stages.value.find((s) => s.id === newStageId);
    if (newStage) {
      employees.value[empIndex].stage_title = newStage.title;
      employees.value[empIndex].stage_type = newStage.type;
    }
  }

  try {
    await moveOffboardingEmployeeApi(emp.id, newStageId);
    const newStage = stages.value.find((s) => s.id === newStageId);
    message.success(`Moved ${emp.employee_name} to ${newStage?.title || 'stage'}`);
  } catch (error) {
    console.error('Failed to move employee:', error);
    message.error('Failed to move employee');
    if (empIndex !== -1 && oldStageId) {
      employees.value[empIndex].stage_id = oldStageId;
    }
  }
};

const handleViewEmployee = (emp) => {
  selectedEmployee.value = emp;
  showEmployeeDrawer.value = true;
  activeTab.value = 'tasks';
  fetchEmployeeDetails(emp.id);
};

const openEmployeeDrawer = (emp) => {
  handleViewEmployee(emp);
};

const handleRemoveEmployee = async (emp) => {
  try {
    await removeOffboardingEmployeeApi(emp.id);
    message.success(`Removed ${emp.employee_name} from offboarding`);
    fetchEmployees();
    fetchStats();
  } catch (error) {
    console.error('Failed to remove employee:', error);
    message.error('Failed to remove employee from offboarding');
  }
};

const handleTaskStatusChange = async (task, newStatus) => {
  try {
    await updateEmployeeTaskStatusApi(task.id, newStatus);
    message.success('Task status updated');
    if (selectedEmployee.value) {
      const params = { page_size: 100, include_tasks: true };
      if (selectedTemplateId.value) {
        params.offboarding_id = selectedTemplateId.value;
      }
      const response = await getOffboardingEmployeesApi(params);
      employees.value = Array.isArray(response) ? response : (response.results || []);
      selectedEmployee.value = employees.value.find((e) => e.id === selectedEmployee.value?.id) || null;
    }
  } catch (error) {
    console.error('Failed to update task status:', error);
    message.error('Failed to update task status');
  }
};

const toggleViewMode = (mode) => {
  viewMode.value = mode;
};

const openAddModal = () => {
  addForm.value = {
    employee_id: null,
    stage_id: filteredStages.value[0]?.id || null,
    notice_period_starts: null,
    notice_period_ends: null,
  };
  showAddModal.value = true;
  if (allEmployees.value.length === 0) {
    fetchAllEmployees();
  }
};

const handleAddEmployee = async () => {
  if (!addForm.value.employee_id || !addForm.value.stage_id) {
    message.error('Please select an employee and stage');
    return;
  }

  try {
    const payload = {
      employee_id: addForm.value.employee_id,
      stage_id: addForm.value.stage_id,
    };
    if (addForm.value.notice_period_starts) {
      payload.notice_period_starts = typeof addForm.value.notice_period_starts === 'string'
        ? addForm.value.notice_period_starts
        : dayjs(addForm.value.notice_period_starts).format('YYYY-MM-DD');
    }
    if (addForm.value.notice_period_ends) {
      payload.notice_period_ends = typeof addForm.value.notice_period_ends === 'string'
        ? addForm.value.notice_period_ends
        : dayjs(addForm.value.notice_period_ends).format('YYYY-MM-DD');
    }
    await createOffboardingEmployeeApi(payload);
    message.success('Employee added to offboarding');
    showAddModal.value = false;
    fetchEmployees();
    fetchStats();
  } catch (error) {
    console.error('Failed to add employee:', error);
    const errorMessage = error?.response?.data?.error || error?.message || 'Failed to add employee';
    message.error(errorMessage);
  }
};

const openExitReasonModal = () => {
  exitReasonForm.value = { title: '', description: '' };
  showExitReasonModal.value = true;
};

const handleAddExitReason = async () => {
  if (!selectedEmployee.value) return;
  if (!exitReasonForm.value.title) {
    message.error('Please enter a title');
    return;
  }
  try {
    await createExitReasonApi({
      offboarding_employee_id: selectedEmployee.value.id,
      title: exitReasonForm.value.title,
      description: exitReasonForm.value.description,
    });
    message.success('Exit reason added');
    showExitReasonModal.value = false;
    fetchExitReasons(selectedEmployee.value.id);
  } catch (error) {
    console.error('Failed to add exit reason:', error);
    message.error('Failed to add exit reason');
  }
};

const handleDeleteExitReason = async (id) => {
  try {
    await deleteExitReasonApi(id);
    message.success('Exit reason deleted');
    if (selectedEmployee.value) {
      fetchExitReasons(selectedEmployee.value.id);
    }
  } catch (error) {
    console.error('Failed to delete exit reason:', error);
    message.error('Failed to delete exit reason');
  }
};

const handleAddNote = async () => {
  if (!selectedEmployee.value) return;
  if (!newNoteText.value.trim()) {
    message.error('Please enter a note');
    return;
  }
  try {
    await createOffboardingNoteApi({
      offboarding_employee_id: selectedEmployee.value.id,
      description: newNoteText.value.trim(),
    });
    message.success('Note added');
    newNoteText.value = '';
    fetchNotes(selectedEmployee.value.id);
  } catch (error) {
    console.error('Failed to add note:', error);
    message.error('Failed to add note');
  }
};

const handleDeleteNote = async (id) => {
  try {
    await deleteOffboardingNoteApi(id);
    message.success('Note deleted');
    if (selectedEmployee.value) {
      fetchNotes(selectedEmployee.value.id);
    }
  } catch (error) {
    console.error('Failed to delete note:', error);
    message.error('Failed to delete note');
  }
};

// --- Utility functions ---

const formatDate = (dateString) => {
  if (!dateString) return '-';
  return dayjs(dateString).format('MMM D, YYYY');
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

const getNoticePeriodStatus = (emp) => {
  if (!emp.notice_period_ends) {
    return { color: 'default', text: 'Not set' };
  }
  if (emp.notice_period_remaining === null || emp.notice_period_remaining === undefined) {
    return { color: 'default', text: formatDate(emp.notice_period_ends) };
  }
  if (emp.notice_period_remaining <= 0) {
    return { color: 'red', text: 'Ended' };
  }
  if (emp.notice_period_remaining <= 7) {
    return { color: 'orange', text: `${emp.notice_period_remaining} days left` };
  }
  return { color: 'green', text: `${emp.notice_period_remaining} days left` };
};

const getTaskStatusColor = (status) => {
  switch (status) {
    case 'completed': return 'green';
    case 'in_progress': return 'blue';
    case 'stuck': return 'red';
    default: return 'default';
  }
};

const getStageColor = (emp) => {
  return stageColors[emp.stage_type || 'other'] || '#1890ff';
};

// --- Lifecycle ---

onMounted(() => {
  fetchTemplates();
  fetchStages();
  fetchEmployees();
  fetchStats();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <!-- Header -->
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-2xl font-bold">Offboarding Pipeline</h1>
        <Space>
          <Select
            v-model:value="selectedTemplateId"
            placeholder="Select Offboarding"
            style="width: 250px"
            allow-clear
            @change="handleTemplateChange"
          >
            <SelectOption v-for="ob in templates" :key="ob.id" :value="ob.id">
              {{ ob.title || ob.name }}
            </SelectOption>
          </Select>
          <Button @click="fetchEmployees">
            <template #icon>
              <ReloadOutlined />
            </template>
          </Button>
          <Button type="primary" @click="openAddModal">
            <template #icon>
              <UserAddOutlined />
            </template>
            Add Employee
          </Button>

          <!-- View Toggle -->
          <div class="offb-view-toggle">
            <Tooltip title="Card View">
              <Button
                :type="viewMode === 'card' ? 'primary' : 'default'"
                @click="toggleViewMode('card')"
              >
                <template #icon>
                  <AppstoreOutlined />
                </template>
              </Button>
            </Tooltip>
            <Tooltip title="List View">
              <Button
                :type="viewMode === 'list' ? 'primary' : 'default'"
                @click="toggleViewMode('list')"
              >
                <template #icon>
                  <UnorderedListOutlined />
                </template>
              </Button>
            </Tooltip>
          </div>
        </Space>
      </div>

      <!-- Statistics -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="12" :sm="8" :md="4">
          <Card size="small">
            <Statistic
              title="Total"
              :value="statistics.total"
              :value-style="{ color: '#1890ff', fontSize: '20px' }"
            >
              <template #prefix>
                <TeamOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="8" :md="4">
          <Card size="small">
            <Statistic
              title="Notice Period"
              :value="statistics.notice_period"
              :value-style="{ color: stageColors.notice_period, fontSize: '20px' }"
            />
          </Card>
        </Col>
        <Col :xs="12" :sm="8" :md="4">
          <Card size="small">
            <Statistic
              title="Exit Interview"
              :value="statistics.interview"
              :value-style="{ color: stageColors.interview, fontSize: '20px' }"
            />
          </Card>
        </Col>
        <Col :xs="12" :sm="8" :md="4">
          <Card size="small">
            <Statistic
              title="Work Handover"
              :value="statistics.handover"
              :value-style="{ color: stageColors.handover, fontSize: '20px' }"
            />
          </Card>
        </Col>
        <Col :xs="12" :sm="8" :md="4">
          <Card size="small">
            <Statistic
              title="FnF Settlement"
              :value="statistics.fnf"
              :value-style="{ color: stageColors.fnf, fontSize: '20px' }"
            />
          </Card>
        </Col>
        <Col :xs="12" :sm="8" :md="4">
          <Card size="small">
            <Statistic
              title="Ending Soon"
              :value="statistics.ending_soon"
              :value-style="{ color: '#f5222d', fontSize: '20px' }"
            >
              <template #prefix>
                <ClockCircleOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <!-- Card/Column View -->
      <Card v-if="viewMode === 'card'" :body-style="{ padding: '12px' }">
        <div v-if="loading" style="text-align: center; padding: 60px 0; color: #999;">
          Loading...
        </div>
        <div v-else-if="filteredStages.length === 0" style="text-align: center; padding: 60px 0; color: #999;">
          <TeamOutlined style="font-size: 48px; color: #d9d9d9; margin-bottom: 16px;" />
          <p>No stages found. Please select an offboarding template.</p>
        </div>
        <div v-else class="offb-columns-container">
          <div
            v-for="stage in filteredStages"
            :key="stage.id"
            class="offb-column"
          >
            <Card size="small">
              <template #title>
                <div style="display: flex; align-items: center; gap: 8px;">
                  <span
                    style="width: 8px; height: 8px; border-radius: 50%; display: inline-block;"
                    :style="{ backgroundColor: stageColors[stage.type] || '#1890ff' }"
                  ></span>
                  <span>{{ stage.title }}</span>
                  <Tag size="small" style="margin-left: auto;">
                    {{ getEmployeesForStage(stage.id).length }}
                  </Tag>
                </div>
              </template>
              <div
                v-if="getEmployeesForStage(stage.id).length === 0"
                style="text-align: center; padding: 24px 0; color: #bfbfbf; font-size: 13px;"
              >
                No employees
              </div>
              <div
                v-for="emp in getEmployeesForStage(stage.id)"
                :key="emp.id"
                class="offb-employee-card"
                @click="openEmployeeDrawer(emp)"
              >
                <div class="offb-card-header">
                  <Avatar
                    :size="36"
                    :src="emp.employee_profile"
                    :style="{ backgroundColor: stageColors[emp.stage_type || 'other'] || '#1890ff' }"
                  >
                    {{ getInitials(emp.employee_name) }}
                  </Avatar>
                  <div class="offb-card-info">
                    <div class="offb-card-name">{{ emp.employee_name }}</div>
                    <div class="offb-card-dept">{{ emp.department || 'No department' }}</div>
                  </div>
                </div>

                <div class="offb-card-meta">
                  <div v-if="emp.position" class="offb-meta-item">
                    <UserOutlined style="color: #bfbfbf;" />
                    <span style="color: #8c8c8c;">{{ emp.position }}</span>
                  </div>
                  <div class="offb-meta-item">
                    <CalendarOutlined style="color: #bfbfbf;" />
                    <Tag :color="getNoticePeriodStatus(emp).color" style="margin: 0;">
                      {{ getNoticePeriodStatus(emp).text }}
                    </Tag>
                  </div>
                </div>

                <div class="offb-card-footer">
                  <div style="display: flex; align-items: center; gap: 8px;">
                    <Progress
                      :percent="emp.task_progress || 0"
                      :size="60"
                      type="circle"
                      :stroke-width="8"
                      :width="40"
                    />
                    <span style="font-size: 12px; color: #8c8c8c;">
                      {{ emp.completed_tasks || 0 }}/{{ emp.total_tasks || 0 }} tasks
                    </span>
                  </div>
                </div>
              </div>
              <Button type="dashed" block size="small" style="margin-top: 8px;" @click="openAddModal">
                <PlusOutlined />
                Add Employee
              </Button>
            </Card>
          </div>
        </div>
      </Card>

      <!-- List View -->
      <Card v-else>
        <Table
          :columns="tableColumns"
          :data-source="employees"
          :loading="loading"
          :scroll="{ x: 1000 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'avatar'">
              <Avatar
                :size="40"
                :src="record.employee_profile"
                :style="{ backgroundColor: getStageColor(record) }"
              >
                {{ getInitials(record.employee_name) }}
              </Avatar>
            </template>

            <template v-if="column.key === 'name'">
              <div>
                <div class="font-medium">{{ record.employee_name }}</div>
                <div v-if="record.position" style="font-size: 12px; color: #8c8c8c;">
                  {{ record.position }}
                </div>
              </div>
            </template>

            <template v-if="column.key === 'department'">
              <Tag v-if="record.department" color="blue">
                {{ record.department }}
              </Tag>
              <span v-else style="color: #bfbfbf;">-</span>
            </template>

            <template v-if="column.key === 'stage'">
              <Select
                :value="record.stage_id"
                style="width: 160px"
                size="small"
                @change="(value) => handleStageChange(record, value)"
              >
                <SelectOption
                  v-for="stage in filteredStages"
                  :key="stage.id"
                  :value="stage.id"
                >
                  <Tag :color="stageColors[stage.type]" style="margin: 0;">
                    {{ stage.title }}
                  </Tag>
                </SelectOption>
              </Select>
            </template>

            <template v-if="column.key === 'notice_period'">
              <Tag :color="getNoticePeriodStatus(record).color">
                {{ getNoticePeriodStatus(record).text }}
              </Tag>
            </template>

            <template v-if="column.key === 'progress'">
              <div style="display: flex; align-items: center; gap: 8px;">
                <Progress :percent="record.task_progress || 0" :size="[100, 6]" />
                <span style="font-size: 12px; color: #8c8c8c;">
                  {{ record.completed_tasks || 0 }}/{{ record.total_tasks || 0 }}
                </span>
              </div>
            </template>

            <template v-if="column.key === 'actions'">
              <Space>
                <Button
                  type="link"
                  size="small"
                  @click="handleViewEmployee(record)"
                >
                  <template #icon>
                    <EyeOutlined />
                  </template>
                </Button>
                <Popconfirm
                  title="Remove this employee from offboarding?"
                  ok-text="Yes"
                  cancel-text="No"
                  @confirm="handleRemoveEmployee(record)"
                >
                  <Button type="link" size="small" danger>
                    <template #icon>
                      <DeleteOutlined />
                    </template>
                  </Button>
                </Popconfirm>
              </Space>
            </template>
          </template>

          <template #emptyText>
            <div style="text-align: center; padding: 48px 0; color: #8c8c8c;">
              <UserOutlined style="font-size: 48px; color: #d9d9d9; margin-bottom: 16px;" />
              <p>No employees in offboarding</p>
            </div>
          </template>
        </Table>
      </Card>

      <!-- Employee Detail Drawer -->
      <Drawer
        v-model:open="showEmployeeDrawer"
        :title="selectedEmployee?.employee_name || 'Employee Details'"
        width="520"
        placement="right"
      >
        <template v-if="selectedEmployee">
          <div class="offb-details">
            <!-- Header -->
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
              <Avatar
                :size="64"
                :src="selectedEmployee.employee_profile"
                :style="{ backgroundColor: getStageColor(selectedEmployee) }"
              >
                {{ getInitials(selectedEmployee.employee_name) }}
              </Avatar>
              <div>
                <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 4px 0;">
                  {{ selectedEmployee.employee_name }}
                </h3>
                <Tag :color="getStageColor(selectedEmployee)">
                  {{ selectedEmployee.stage_title }}
                </Tag>
              </div>
            </div>

            <!-- Employee Info -->
            <Card title="Employee Information" size="small" style="margin-bottom: 16px;">
              <div class="offb-info-row">
                <span style="color: #8c8c8c;">Department:</span>
                <span>{{ selectedEmployee.department || '-' }}</span>
              </div>
              <div class="offb-info-row">
                <span style="color: #8c8c8c;">Position:</span>
                <span>{{ selectedEmployee.position || '-' }}</span>
              </div>
              <div class="offb-info-row">
                <span style="color: #8c8c8c;">Status:</span>
                <Tag :color="selectedEmployee.is_active ? 'green' : 'red'">
                  {{ selectedEmployee.is_active ? 'Active' : 'Inactive' }}
                </Tag>
              </div>
            </Card>

            <!-- Notice Period -->
            <Card title="Notice Period" size="small" style="margin-bottom: 16px;">
              <div class="offb-info-row">
                <span style="color: #8c8c8c;">Start Date:</span>
                <span>{{ formatDate(selectedEmployee.notice_period_starts) }}</span>
              </div>
              <div class="offb-info-row">
                <span style="color: #8c8c8c;">End Date:</span>
                <span>{{ formatDate(selectedEmployee.notice_period_ends) }}</span>
              </div>
              <div class="offb-info-row">
                <span style="color: #8c8c8c;">Remaining:</span>
                <Tag :color="getNoticePeriodStatus(selectedEmployee).color">
                  {{ getNoticePeriodStatus(selectedEmployee).text }}
                </Tag>
              </div>
            </Card>

            <!-- Tabs: Tasks, Exit Reasons, Notes -->
            <Tabs v-model:activeKey="activeTab" style="margin-top: 16px;">
              <!-- Tasks Tab -->
              <TabPane key="tasks" tab="Tasks">
                <div style="margin-bottom: 16px;">
                  <Progress
                    :percent="selectedEmployee.task_progress || 0"
                    :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }"
                  />
                  <div style="text-align: center; font-size: 13px; color: #8c8c8c; margin-top: 8px;">
                    {{ selectedEmployee.completed_tasks || 0 }} of {{ selectedEmployee.total_tasks || 0 }} tasks completed
                  </div>
                </div>

                <div v-if="selectedEmployee.tasks && selectedEmployee.tasks.length > 0">
                  <div
                    v-for="task in selectedEmployee.tasks"
                    :key="task.id"
                    style="display: flex; align-items: center; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #f0f0f0;"
                  >
                    <div style="display: flex; align-items: center; gap: 8px;">
                      <CheckCircleOutlined
                        v-if="task.status === 'completed'"
                        style="color: #52c41a;"
                      />
                      <ClockCircleOutlined
                        v-else
                        style="color: #bfbfbf;"
                      />
                      <span :style="task.status === 'completed' ? { textDecoration: 'line-through', color: '#bfbfbf' } : {}">
                        {{ task.task_title || task.title }}
                      </span>
                    </div>
                    <Select
                      :value="task.status"
                      size="small"
                      style="width: 120px;"
                      @change="(value) => handleTaskStatusChange(task, value)"
                    >
                      <SelectOption value="todo">
                        <Tag color="default">Todo</Tag>
                      </SelectOption>
                      <SelectOption value="in_progress">
                        <Tag color="blue">In Progress</Tag>
                      </SelectOption>
                      <SelectOption value="stuck">
                        <Tag color="red">Stuck</Tag>
                      </SelectOption>
                      <SelectOption value="completed">
                        <Tag color="green">Completed</Tag>
                      </SelectOption>
                    </Select>
                  </div>
                </div>
                <div v-else style="text-align: center; color: #bfbfbf; padding: 24px 0;">
                  No tasks assigned
                </div>
              </TabPane>

              <!-- Exit Reasons Tab -->
              <TabPane key="exit-reasons" tab="Exit Reasons">
                <div style="margin-bottom: 16px;">
                  <Button type="primary" size="small" @click="openExitReasonModal">
                    <template #icon>
                      <PlusOutlined />
                    </template>
                    Add Exit Reason
                  </Button>
                </div>
                <div v-if="exitReasonLoading" style="text-align: center; padding: 24px 0;">
                  Loading...
                </div>
                <div v-else-if="exitReasons.length > 0">
                  <div
                    v-for="reason in exitReasons"
                    :key="reason.id"
                    class="offb-exit-reason-item"
                  >
                    <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                      <div style="flex: 1;">
                        <div style="font-weight: 500; font-size: 14px;">{{ reason.title }}</div>
                        <div v-if="reason.description" style="font-size: 12px; color: #8c8c8c; margin-top: 4px;">
                          {{ reason.description }}
                        </div>
                        <div style="font-size: 12px; color: #bfbfbf; margin-top: 4px;">
                          {{ formatDate(reason.created_at) }}
                        </div>
                      </div>
                      <Popconfirm
                        title="Delete this exit reason?"
                        ok-text="Yes"
                        cancel-text="No"
                        @confirm="handleDeleteExitReason(reason.id)"
                      >
                        <Button type="text" size="small" danger>
                          <template #icon>
                            <DeleteOutlined />
                          </template>
                        </Button>
                      </Popconfirm>
                    </div>
                  </div>
                </div>
                <div v-else style="text-align: center; color: #bfbfbf; padding: 24px 0;">
                  <FileTextOutlined style="font-size: 28px; margin-bottom: 8px;" />
                  <p>No exit reasons recorded</p>
                </div>
              </TabPane>

              <!-- Notes Tab -->
              <TabPane key="notes" tab="Notes">
                <div style="margin-bottom: 16px;">
                  <div style="display: flex; gap: 8px;">
                    <TextArea
                      v-model:value="newNoteText"
                      placeholder="Add a note..."
                      :rows="2"
                      style="flex: 1;"
                    />
                    <Button
                      type="primary"
                      :disabled="!newNoteText.trim()"
                      @click="handleAddNote"
                    >
                      <template #icon>
                        <SendOutlined />
                      </template>
                    </Button>
                  </div>
                </div>
                <Divider style="margin: 12px 0;" />
                <div v-if="notesLoading" style="text-align: center; padding: 24px 0;">
                  Loading...
                </div>
                <div v-else-if="notes.length > 0">
                  <Timeline>
                    <TimelineItem v-for="note in notes" :key="note.id">
                      <div class="offb-note-item">
                        <div style="display: flex; align-items: flex-start; justify-content: space-between;">
                          <div style="flex: 1;">
                            <div style="font-size: 12px; color: #bfbfbf; margin-bottom: 4px;">
                              <span style="font-weight: 500; color: #595959;">
                                {{ note.note_by_name || 'Unknown' }}
                              </span>
                              <span style="margin: 0 8px;">&middot;</span>
                              {{ formatDate(note.created_at) }}
                            </div>
                            <div style="font-size: 14px;">{{ note.description }}</div>
                          </div>
                          <Popconfirm
                            title="Delete this note?"
                            ok-text="Yes"
                            cancel-text="No"
                            @confirm="handleDeleteNote(note.id)"
                          >
                            <Button type="text" size="small" danger>
                              <template #icon>
                                <DeleteOutlined />
                              </template>
                            </Button>
                          </Popconfirm>
                        </div>
                      </div>
                    </TimelineItem>
                  </Timeline>
                </div>
                <div v-else style="text-align: center; color: #bfbfbf; padding: 24px 0;">
                  <MessageOutlined style="font-size: 28px; margin-bottom: 8px;" />
                  <p>No notes yet</p>
                </div>
              </TabPane>
            </Tabs>
          </div>
        </template>
      </Drawer>

      <!-- Exit Reason Modal -->
      <Modal
        v-model:open="showExitReasonModal"
        title="Add Exit Reason"
        @ok="handleAddExitReason"
      >
        <Form layout="vertical" style="margin-top: 16px;">
          <FormItem label="Title" required>
            <Input v-model:value="exitReasonForm.title" placeholder="Enter exit reason title" />
          </FormItem>
          <FormItem label="Description">
            <TextArea
              v-model:value="exitReasonForm.description"
              placeholder="Enter description (optional)"
              :rows="4"
            />
          </FormItem>
        </Form>
      </Modal>

      <!-- Add Employee Modal -->
      <Modal
        v-model:open="showAddModal"
        title="Add Employee to Offboarding"
        @ok="handleAddEmployee"
      >
        <Form layout="vertical" style="margin-top: 16px;">
          <FormItem label="Employee" required>
            <Select
              v-model:value="addForm.employee_id"
              placeholder="Select an employee"
              show-search
              :filter-option="(input, option) =>
                (option?.label || '').toLowerCase().includes(input.toLowerCase())
              "
              :options="allEmployees.map((e) => ({ value: e.id, label: e.name }))"
            />
          </FormItem>
          <FormItem label="Stage" required>
            <Select
              v-model:value="addForm.stage_id"
              placeholder="Select a stage"
            >
              <SelectOption
                v-for="stage in filteredStages"
                :key="stage.id"
                :value="stage.id"
              >
                {{ stage.title }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Notice Period Start">
            <DatePicker
              v-model:value="addForm.notice_period_starts"
              style="width: 100%"
              :value-format="'YYYY-MM-DD'"
            />
          </FormItem>
          <FormItem label="Notice Period End">
            <DatePicker
              v-model:value="addForm.notice_period_ends"
              style="width: 100%"
              :value-format="'YYYY-MM-DD'"
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  </Page>
</template>
