<script setup>
import { ref, reactive, onMounted, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Card,
  Table,
  Tag,
  Button,
  Modal,
  Form,
  FormItem,
  Select,
  SelectOption,
  InputNumber,
  Textarea,
  Space,
  Popconfirm,
  message,
  Descriptions,
  DescriptionsItem,
  Spin,
  Row,
  Col,
  DatePicker,
  Input,
  Tabs,
  TabPane,
  Statistic,
  Rate,
  Progress,
  Badge,
  Tooltip,
  Calendar,
  Alert,
  Radio,
  RadioGroup,
} from 'ant-design-vue';

import {
  getInterviewsApi,
  getInterviewApi,
  createInterviewApi,
  updateInterviewApi,
  deleteInterviewApi,
  completeInterviewApi,
  cancelInterviewApi,
  getInterviewStatsApi,
  rescheduleInterviewApi,
  getApplicationsApi,
  getInterviewCalendarApi,
} from '#/api/recruitment';
import dayjs from 'dayjs';

defineOptions({
  name: 'RECRUITMENTInterviewsList',
});

// State
const loading = ref(false);
const interviews = ref([]);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});
const statusFilter = ref(undefined);
const typeFilter = ref(undefined);
const activeTab = ref('list');

// Stats
const stats = ref(null);

// Calendar
const calendarEvents = ref([]);
const calendarMonth = ref(dayjs());

// Dropdowns
const applications = ref([]);

// Modal state
const modalVisible = ref(false);
const modalMode = ref('create');
const modalLoading = ref(false);
const selectedInterview = ref(null);

// Form
const formRef = ref();
const formState = reactive({
  application_id: undefined,
  interviewer_ids: [],
  interview_type: 'technical',
  scheduled_at: '',
  duration_minutes: 60,
  location: '',
  meeting_link: '',
});

// Feedback form
const feedbackState = reactive({
  overall_rating: 3,
  recommendation: 'hire',
  feedback: '',
  strengths: '',
  weaknesses: '',
  notes: '',
});

// Reschedule form
const rescheduleState = reactive({
  scheduled_at: '',
  reason: '',
});

const formRules = {
  application_id: [{ required: true, message: 'Please select an application' }],
  scheduled_at: [{ required: true, message: 'Please select date and time' }],
};

// Helper to get candidate display name from an interview
const getCandidateName = (interview) => {
  const candidate = interview.application?.candidate;
  if (candidate) {
    return `${candidate.first_name} ${candidate.last_name}`;
  }
  return '-';
};

// Helper to get job title from an interview
const getJobTitle = (interview) => {
  return interview.application?.job?.title || '-';
};

// Table columns
const columns = [
  {
    title: 'Candidate',
    key: 'candidate_name',
    customRender: ({ record }) =>
      getCandidateName(record),
  },
  {
    title: 'Position',
    key: 'job_title',
    customRender: ({ record }) =>
      getJobTitle(record),
  },
  { title: 'Date & Time', key: 'datetime', width: 160 },
  { title: 'Interviewers', key: 'interviewers' },
  { title: 'Type', key: 'interview_type', width: 120 },
  { title: 'Status', key: 'status', width: 130 },
  { title: 'Rating', key: 'rating', width: 100 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' },
];

const interviewTypes = [
  { value: 'phone', label: 'Phone Screen' },
  { value: 'video', label: 'Video Call' },
  { value: 'onsite', label: 'On-site' },
  { value: 'technical', label: 'Technical' },
  { value: 'hr', label: 'HR Round' },
  { value: 'panel', label: 'Panel' },
  { value: 'final', label: 'Final Round' },
  { value: 'assessment', label: 'Assessment' },
  { value: 'culture_fit', label: 'Culture Fit' },
];

const statusOptions = [
  { value: 'scheduled', label: 'Scheduled', color: 'blue' },
  { value: 'confirmed', label: 'Confirmed', color: 'cyan' },
  { value: 'in_progress', label: 'In Progress', color: 'orange' },
  { value: 'completed', label: 'Completed', color: 'green' },
  { value: 'cancelled', label: 'Cancelled', color: 'red' },
  { value: 'rescheduled', label: 'Rescheduled', color: 'purple' },
  { value: 'no_show', label: 'No Show', color: 'default' },
  { value: 'pending_feedback', label: 'Pending Feedback', color: 'gold' },
];

const recommendationOptions = [
  { value: 'strong_hire', label: 'Strong Hire' },
  { value: 'hire', label: 'Hire' },
  { value: 'lean_hire', label: 'Lean Hire' },
  { value: 'lean_no_hire', label: 'Lean No Hire' },
  { value: 'no_hire', label: 'No Hire' },
  { value: 'strong_no_hire', label: 'Strong No Hire' },
];

// Computed
const modalTitle = computed(() => {
  switch (modalMode.value) {
    case 'create':
      return 'Schedule Interview';
    case 'edit':
      return 'Edit Interview';
    case 'view':
      return 'Interview Details';
    case 'feedback':
      return 'Submit Feedback';
    case 'reschedule':
      return 'Reschedule Interview';
    default:
      return 'Interview';
  }
});

// Methods
const fetchInterviews = async () => {
  loading.value = true;
  try {
    const response = await getInterviewsApi({
      page: pagination.current,
      page_size: pagination.pageSize,
      status: statusFilter.value,
    });
    interviews.value = response.items;
    pagination.total = response.total;
  } catch (error) {
    console.error('Failed to fetch interviews:', error);
    message.error('Failed to load interviews');
  } finally {
    loading.value = false;
  }
};

const fetchStats = async () => {
  try {
    stats.value = await getInterviewStatsApi();
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
};

const fetchCalendar = async () => {
  try {
    const startOfMonth = calendarMonth.value
      .startOf('month')
      .format('YYYY-MM-DD');
    const endOfMonth = calendarMonth.value
      .endOf('month')
      .format('YYYY-MM-DD');
    const response = await getInterviewCalendarApi({
      date_from: startOfMonth,
      date_to: endOfMonth,
    });
    calendarEvents.value = response;
  } catch (error) {
    console.error('Failed to fetch calendar:', error);
  }
};

const fetchApplications = async () => {
  try {
    const response = await getApplicationsApi({ page_size: 200 });
    applications.value = response.items.map(
      (app) => ({
        id: app.id,
        candidate_name: app.candidate
          ? `${app.candidate.first_name} ${app.candidate.last_name}`
          : `Application #${app.id}`,
        job_title: app.job?.title || '-',
      }),
    );
  } catch (error) {
    console.error('Failed to fetch applications:', error);
  }
};

const handleTableChange = (pag) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchInterviews();
};

const handleStatusFilter = (value) => {
  statusFilter.value = value;
  pagination.current = 1;
  fetchInterviews();
};

const handleTypeFilter = (value) => {
  typeFilter.value = value;
  pagination.current = 1;
  fetchInterviews();
};

const resetForm = () => {
  formState.application_id = undefined;
  formState.interviewer_ids = [];
  formState.interview_type = 'technical';
  formState.scheduled_at = '';
  formState.duration_minutes = 60;
  formState.location = '';
  formState.meeting_link = '';
};

const resetFeedbackForm = () => {
  feedbackState.overall_rating = 3;
  feedbackState.recommendation = 'hire';
  feedbackState.feedback = '';
  feedbackState.strengths = '';
  feedbackState.weaknesses = '';
  feedbackState.notes = '';
};

const openCreateModal = () => {
  resetForm();
  selectedInterview.value = null;
  modalMode.value = 'create';
  modalVisible.value = true;
};

const openEditModal = async (record) => {
  modalLoading.value = true;
  modalMode.value = 'edit';
  modalVisible.value = true;
  try {
    const interview = await getInterviewApi(record.id);
    selectedInterview.value = interview;
    Object.assign(formState, {
      application_id: interview.application_id,
      interviewer_ids: interview.interviewers?.map((i) => i.id) || [],
      interview_type: interview.interview_type,
      scheduled_at: interview.scheduled_at,
      duration_minutes: interview.duration_minutes || 60,
      location: interview.location || '',
      meeting_link: interview.meeting_link || '',
    });
  } catch (error) {
    console.error('Failed to fetch interview:', error);
    message.error('Failed to load interview details');
    modalVisible.value = false;
  } finally {
    modalLoading.value = false;
  }
};

const openViewModal = async (record) => {
  modalLoading.value = true;
  modalMode.value = 'view';
  modalVisible.value = true;
  try {
    const interview = await getInterviewApi(record.id);
    selectedInterview.value = interview;
  } catch (error) {
    console.error('Failed to fetch interview:', error);
    message.error('Failed to load interview details');
    modalVisible.value = false;
  } finally {
    modalLoading.value = false;
  }
};

const openFeedbackModal = async (record) => {
  modalLoading.value = true;
  modalMode.value = 'feedback';
  modalVisible.value = true;
  resetFeedbackForm();
  try {
    const interview = await getInterviewApi(record.id);
    selectedInterview.value = interview;
    if (interview.feedback) {
      feedbackState.feedback = interview.feedback;
      feedbackState.overall_rating = interview.rating || 3;
    }
  } catch (error) {
    console.error('Failed to fetch interview:', error);
    message.error('Failed to load interview details');
    modalVisible.value = false;
  } finally {
    modalLoading.value = false;
  }
};

const openRescheduleModal = async (record) => {
  modalLoading.value = true;
  modalMode.value = 'reschedule';
  modalVisible.value = true;
  rescheduleState.scheduled_at = '';
  rescheduleState.reason = '';
  try {
    const interview = await getInterviewApi(record.id);
    selectedInterview.value = interview;
  } catch (error) {
    console.error('Failed to fetch interview:', error);
    message.error('Failed to load interview details');
    modalVisible.value = false;
  } finally {
    modalLoading.value = false;
  }
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    modalLoading.value = true;

    if (modalMode.value === 'create') {
      await createInterviewApi({
        application_id: formState.application_id,
        interview_type: formState.interview_type,
        scheduled_at: formState.scheduled_at,
        duration_minutes: formState.duration_minutes,
        location: formState.location || undefined,
        meeting_link: formState.meeting_link || undefined,
        interviewer_ids: formState.interviewer_ids,
      });
      message.success('Interview scheduled successfully');
    } else if (modalMode.value === 'edit' && selectedInterview.value) {
      await updateInterviewApi(selectedInterview.value.id, {
        interview_type: formState.interview_type,
        scheduled_at: formState.scheduled_at,
        duration_minutes: formState.duration_minutes,
        location: formState.location || undefined,
        meeting_link: formState.meeting_link || undefined,
        interviewer_ids: formState.interviewer_ids,
      });
      message.success('Interview updated successfully');
    }

    modalVisible.value = false;
    fetchInterviews();
    fetchStats();
    fetchCalendar();
  } catch (error) {
    console.error('Failed to save interview:', error);
    message.error('Failed to save interview');
  } finally {
    modalLoading.value = false;
  }
};

const handleFeedbackSubmit = async () => {
  if (!selectedInterview.value) return;

  try {
    modalLoading.value = true;
    await completeInterviewApi(
      selectedInterview.value.id,
      feedbackState.feedback,
      feedbackState.overall_rating,
    );
    message.success('Feedback submitted successfully');
    modalVisible.value = false;
    fetchInterviews();
    fetchStats();
  } catch (error) {
    console.error('Failed to submit feedback:', error);
    message.error('Failed to submit feedback');
  } finally {
    modalLoading.value = false;
  }
};

const handleReschedule = async () => {
  if (!selectedInterview.value) return;

  if (!rescheduleState.scheduled_at) {
    message.error('Please select new date and time');
    return;
  }

  try {
    modalLoading.value = true;
    await rescheduleInterviewApi(selectedInterview.value.id, {
      scheduled_at: rescheduleState.scheduled_at,
      reason: rescheduleState.reason || undefined,
    });
    message.success('Interview rescheduled successfully');
    modalVisible.value = false;
    fetchInterviews();
    fetchCalendar();
  } catch (error) {
    console.error('Failed to reschedule interview:', error);
    message.error('Failed to reschedule interview');
  } finally {
    modalLoading.value = false;
  }
};

const handleDelete = async (record) => {
  try {
    await deleteInterviewApi(record.id);
    message.success('Interview deleted successfully');
    fetchInterviews();
    fetchStats();
    fetchCalendar();
  } catch (error) {
    console.error('Failed to delete interview:', error);
    message.error('Failed to delete interview');
  }
};

const handleCancel = async (record) => {
  try {
    await cancelInterviewApi(record.id);
    message.success('Interview cancelled successfully');
    fetchInterviews();
    fetchStats();
  } catch (error) {
    console.error('Failed to cancel interview:', error);
    message.error('Failed to cancel interview');
  }
};

const handleStatusChange = async (
  record,
  newStatus,
) => {
  try {
    if (newStatus === 'cancelled') {
      await cancelInterviewApi(record.id);
    } else if (newStatus === 'completed') {
      await completeInterviewApi(record.id, '');
    } else {
      await updateInterviewApi(record.id, { status: newStatus });
    }
    message.success('Status updated successfully');
    fetchInterviews();
    fetchStats();
  } catch (error) {
    console.error('Failed to update status:', error);
    message.error('Failed to update status');
  }
};

const getStatusColor = (status) => {
  return statusOptions.find((s) => s.value === status)?.color || 'default';
};

const getStatusLabel = (status) => {
  return statusOptions.find((s) => s.value === status)?.label || status;
};

const getTypeLabel = (type) => {
  return interviewTypes.find((t) => t.value === type)?.label || type;
};

const formatDateTime = (record) => {
  if (!record.scheduled_at) return '-';
  const dt = dayjs(record.scheduled_at);
  return dt.format('YYYY-MM-DD HH:mm');
};

const formatInterviewerNames = (
  interviewers,
) => {
  if (!interviewers || interviewers.length === 0) return '-';
  return interviewers
    .map((i) => `${i.first_name} ${i.last_name}`)
    .join(', ');
};

const handleDateTimeChange = (_date, dateString) => {
  formState.scheduled_at = dateString;
};

const handleRescheduleDateTimeChange = (
  _date,
  dateString,
) => {
  rescheduleState.scheduled_at = dateString;
};

const getCalendarData = (value) => {
  const dateStr = value.format('YYYY-MM-DD');
  return calendarEvents.value.filter((e) =>
    e.scheduled_at.startsWith(dateStr),
  );
};

const handleTabChange = (key) => {
  activeTab.value = String(key);
  if (key === 'calendar') {
    fetchCalendar();
  }
};

const onCalendarPanelChange = (value) => {
  calendarMonth.value = value;
  fetchCalendar();
};

// Lifecycle
onMounted(() => {
  fetchInterviews();
  fetchStats();
  fetchApplications();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Interviews</h1>
        <Button type="primary" @click="openCreateModal">
          Schedule Interview
        </Button>
      </div>

      <!-- Stats Cards -->
      <Row :gutter="16" class="mb-6">
        <Col :span="6">
          <Card>
            <Statistic
              title="Total Interviews"
              :value="stats?.total || 0"
            />
          </Card>
        </Col>
        <Col :span="6">
          <Card>
            <Statistic
              title="Scheduled"
              :value="stats?.scheduled || 0"
              :value-style="{ color: '#1890ff' }"
            />
          </Card>
        </Col>
        <Col :span="6">
          <Card>
            <Statistic
              title="Completed"
              :value="stats?.completed || 0"
              :value-style="{ color: '#52c41a' }"
            />
          </Card>
        </Col>
        <Col :span="6">
          <Card>
            <Statistic
              title="Avg Rating"
              :value="stats?.avg_rating || '-'"
              :precision="1"
              suffix="/ 5"
            />
          </Card>
        </Col>
      </Row>

      <Tabs v-model:activeKey="activeTab" @change="handleTabChange">
        <TabPane key="list" tab="List View">
          <Card>
            <div class="mb-4 flex flex-wrap items-center gap-4">
              <Select
                v-model:value="statusFilter"
                placeholder="Filter by status"
                style="width: 160px"
                allow-clear
                @change="handleStatusFilter"
              >
                <SelectOption
                  v-for="status in statusOptions"
                  :key="status.value"
                  :value="status.value"
                >
                  {{ status.label }}
                </SelectOption>
              </Select>
              <Select
                v-model:value="typeFilter"
                placeholder="Filter by type"
                style="width: 150px"
                allow-clear
                @change="handleTypeFilter"
              >
                <SelectOption
                  v-for="itype in interviewTypes"
                  :key="itype.value"
                  :value="itype.value"
                >
                  {{ itype.label }}
                </SelectOption>
              </Select>
            </div>

            <Table
              :columns="columns"
              :data-source="interviews"
              :loading="loading"
              :pagination="{
                current: pagination.current,
                pageSize: pagination.pageSize,
                total: pagination.total,
                showSizeChanger: true,
                showTotal: (total) => `Total ${total} interviews`,
              }"
              :scroll="{ x: 1200 }"
              row-key="id"
              @change="handleTableChange"
            >
              <template #bodyCell="{ column, record: rawRecord }">
                <template v-if="column.key === 'candidate_name'">
                  {{ getCandidateName(rawRecord) }}
                </template>
                <template v-else-if="column.key === 'job_title'">
                  {{ getJobTitle(rawRecord) }}
                </template>
                <template v-else-if="column.key === 'datetime'">
                  {{ formatDateTime(rawRecord) }}
                </template>
                <template v-else-if="column.key === 'interviewers'">
                  <Tooltip
                    :title="formatInterviewerNames(rawRecord.interviewers)"
                  >
                    <span>
                      {{
                        rawRecord.interviewers
                          ?.slice(0, 2)
                          .map(
                            (i) => `${i.first_name} ${i.last_name}`,
                          )
                          .join(', ')
                      }}
                    </span>
                    <span v-if="rawRecord.interviewers?.length > 2">
                      +{{ rawRecord.interviewers.length - 2 }}
                    </span>
                  </Tooltip>
                </template>
                <template v-else-if="column.key === 'interview_type'">
                  <Tag>{{ getTypeLabel(rawRecord.interview_type) }}</Tag>
                </template>
                <template v-else-if="column.key === 'status'">
                  <Select
                    :value="rawRecord.status"
                    size="small"
                    style="width: 120px"
                    @change="
                      (val) => handleStatusChange(rawRecord, String(val))
                    "
                  >
                    <SelectOption
                      v-for="status in statusOptions"
                      :key="status.value"
                      :value="status.value"
                    >
                      <Tag :color="status.color" size="small">
                        {{ status.label }}
                      </Tag>
                    </SelectOption>
                  </Select>
                </template>
                <template v-else-if="column.key === 'rating'">
                  <Rate
                    :value="rawRecord.rating || 0"
                    disabled
                    allow-half
                    :count="5"
                    style="font-size: 12px"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      @click="openViewModal(rawRecord)"
                    >
                      View
                    </Button>
                    <Button
                      v-if="
                        ['scheduled', 'confirmed'].includes(rawRecord.status)
                      "
                      type="link"
                      size="small"
                      @click="openEditModal(rawRecord)"
                    >
                      Edit
                    </Button>
                    <Button
                      v-if="
                        ['scheduled', 'confirmed'].includes(rawRecord.status)
                      "
                      type="link"
                      size="small"
                      @click="openRescheduleModal(rawRecord)"
                    >
                      Reschedule
                    </Button>
                    <Button
                      v-if="
                        ['completed', 'pending_feedback'].includes(
                          rawRecord.status,
                        )
                      "
                      type="link"
                      size="small"
                      @click="openFeedbackModal(rawRecord)"
                    >
                      Feedback
                    </Button>
                    <Button
                      v-if="
                        ['scheduled', 'confirmed'].includes(rawRecord.status)
                      "
                      type="link"
                      size="small"
                      danger
                      @click="handleCancel(rawRecord)"
                    >
                      Cancel
                    </Button>
                    <Popconfirm
                      title="Are you sure you want to delete this interview?"
                      ok-text="Yes"
                      cancel-text="No"
                      @confirm="handleDelete(rawRecord)"
                    >
                      <Button type="link" size="small" danger>
                        Delete
                      </Button>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </Card>
        </TabPane>

        <TabPane key="calendar" tab="Calendar View">
          <Card>
            <Calendar
              :value="calendarMonth"
              @panel-change="onCalendarPanelChange"
            >
              <template #dateCellRender="{ current }">
                <ul class="events">
                  <li
                    v-for="event in getCalendarData(current)"
                    :key="event.id"
                  >
                    <Badge
                      :color="
                        event.status === 'completed'
                          ? 'green'
                          : event.status === 'cancelled'
                            ? 'red'
                            : 'blue'
                      "
                      :text="`${dayjs(event.scheduled_at).format('HH:mm')} ${event.candidate_name}`"
                      style="
                        font-size: 11px;
                        white-space: nowrap;
                        overflow: hidden;
                        text-overflow: ellipsis;
                      "
                    />
                  </li>
                </ul>
              </template>
            </Calendar>
          </Card>
        </TabPane>

        <TabPane key="stats" tab="Statistics">
          <Row :gutter="16">
            <Col :span="12">
              <Card title="Overview">
                <div class="mb-2">
                  <div class="mb-1 flex justify-between">
                    <span>Scheduled</span>
                    <span>{{ stats?.scheduled || 0 }}</span>
                  </div>
                  <Progress
                    :percent="
                      stats?.total
                        ? Math.round(
                            ((stats?.scheduled || 0) / stats.total) * 100,
                          )
                        : 0
                    "
                    :show-info="false"
                    stroke-color="#1890ff"
                  />
                </div>
                <div class="mb-2">
                  <div class="mb-1 flex justify-between">
                    <span>Completed</span>
                    <span>{{ stats?.completed || 0 }}</span>
                  </div>
                  <Progress
                    :percent="
                      stats?.total
                        ? Math.round(
                            ((stats?.completed || 0) / stats.total) * 100,
                          )
                        : 0
                    "
                    :show-info="false"
                    stroke-color="#52c41a"
                  />
                </div>
                <div class="mb-2">
                  <div class="mb-1 flex justify-between">
                    <span>Pending Feedback</span>
                    <span>{{ stats?.pending_feedback || 0 }}</span>
                  </div>
                  <Progress
                    :percent="
                      stats?.total
                        ? Math.round(
                            ((stats?.pending_feedback || 0) / stats.total) *
                              100,
                          )
                        : 0
                    "
                    :show-info="false"
                    stroke-color="#faad14"
                  />
                </div>
                <div class="mb-2">
                  <div class="mb-1 flex justify-between">
                    <span>Cancelled</span>
                    <span>{{ stats?.cancelled || 0 }}</span>
                  </div>
                  <Progress
                    :percent="
                      stats?.total
                        ? Math.round(
                            ((stats?.cancelled || 0) / stats.total) * 100,
                          )
                        : 0
                    "
                    :show-info="false"
                    stroke-color="#ff4d4f"
                  />
                </div>
              </Card>
            </Col>
            <Col :span="12">
              <Card title="Average Rating">
                <div class="flex flex-col items-center py-8">
                  <Rate
                    :value="stats?.avg_rating || 0"
                    disabled
                    allow-half
                    style="font-size: 32px"
                  />
                  <div class="mt-4 text-2xl font-bold">
                    {{ stats?.avg_rating?.toFixed(1) || '-' }}
                    <span class="text-sm font-normal text-gray-500">
                      / 5
                    </span>
                  </div>
                </div>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      <!-- Create/Edit/View/Feedback/Reschedule Modal -->
      <Modal
        v-model:open="modalVisible"
        :title="modalTitle"
        :width="800"
        :footer="modalMode === 'view' ? null : undefined"
        @cancel="modalVisible = false"
      >
        <Spin :spinning="modalLoading">
          <!-- View Mode -->
          <template v-if="modalMode === 'view' && selectedInterview">
            <Descriptions :column="2" bordered>
              <DescriptionsItem label="Candidate" :span="2">
                {{ getCandidateName(selectedInterview) }}
                <span
                  v-if="selectedInterview.application?.candidate?.email"
                  class="ml-2 text-gray-500"
                >
                  ({{ selectedInterview.application.candidate.email }})
                </span>
              </DescriptionsItem>
              <DescriptionsItem label="Position" :span="2">
                {{ getJobTitle(selectedInterview) }}
              </DescriptionsItem>
              <DescriptionsItem label="Date & Time" :span="1">
                {{ formatDateTime(selectedInterview) }}
              </DescriptionsItem>
              <DescriptionsItem label="Duration">
                {{ selectedInterview.duration_minutes || '-' }} minutes
              </DescriptionsItem>
              <DescriptionsItem label="Type">
                <Tag>
                  {{ getTypeLabel(selectedInterview.interview_type) }}
                </Tag>
              </DescriptionsItem>
              <DescriptionsItem label="Status">
                <Tag :color="getStatusColor(selectedInterview.status)">
                  {{ getStatusLabel(selectedInterview.status) }}
                </Tag>
              </DescriptionsItem>
              <DescriptionsItem label="Rating" :span="2">
                <Rate
                  :value="selectedInterview.rating || 0"
                  disabled
                  allow-half
                />
              </DescriptionsItem>
              <DescriptionsItem label="Interviewers" :span="2">
                {{ formatInterviewerNames(selectedInterview.interviewers) }}
              </DescriptionsItem>
              <DescriptionsItem label="Location" :span="2">
                {{ selectedInterview.location || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Meeting Link" :span="2">
                <a
                  v-if="selectedInterview.meeting_link"
                  :href="selectedInterview.meeting_link"
                  target="_blank"
                >
                  {{ selectedInterview.meeting_link }}
                </a>
                <span v-else>-</span>
              </DescriptionsItem>
              <DescriptionsItem
                v-if="selectedInterview.feedback"
                label="Feedback"
                :span="2"
              >
                {{ selectedInterview.feedback }}
              </DescriptionsItem>
            </Descriptions>
          </template>

          <!-- Feedback Form -->
          <template v-else-if="modalMode === 'feedback'">
            <Form layout="vertical">
              <FormItem label="Overall Rating" required>
                <Rate
                  v-model:value="feedbackState.overall_rating"
                  allow-half
                />
              </FormItem>
              <FormItem label="Recommendation" required>
                <RadioGroup v-model:value="feedbackState.recommendation">
                  <Radio
                    v-for="rec in recommendationOptions"
                    :key="rec.value"
                    :value="rec.value"
                  >
                    {{ rec.label }}
                  </Radio>
                </RadioGroup>
              </FormItem>
              <FormItem label="Feedback" required>
                <Textarea
                  v-model:value="feedbackState.feedback"
                  :rows="4"
                  placeholder="Enter interview feedback"
                />
              </FormItem>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem label="Strengths">
                    <Textarea
                      v-model:value="feedbackState.strengths"
                      :rows="2"
                      placeholder="Key strengths observed"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Areas for Improvement">
                    <Textarea
                      v-model:value="feedbackState.weaknesses"
                      :rows="2"
                      placeholder="Areas that need improvement"
                    />
                  </FormItem>
                </Col>
              </Row>
              <FormItem label="Private Notes">
                <Textarea
                  v-model:value="feedbackState.notes"
                  :rows="2"
                  placeholder="Private notes (not shared with candidate)"
                />
              </FormItem>
            </Form>
          </template>

          <!-- Reschedule Form -->
          <template v-else-if="modalMode === 'reschedule'">
            <Alert
              message="Original Schedule"
              :description="
                selectedInterview
                  ? formatDateTime(selectedInterview)
                  : '-'
              "
              type="info"
              class="mb-4"
              show-icon
            />
            <Form layout="vertical">
              <FormItem label="New Date & Time" required>
                <DatePicker
                  :value="
                    rescheduleState.scheduled_at
                      ? dayjs(rescheduleState.scheduled_at)
                      : undefined
                  "
                  show-time
                  format="YYYY-MM-DD HH:mm"
                  style="width: 100%"
                  @change="handleRescheduleDateTimeChange"
                />
              </FormItem>
              <FormItem label="Reason for Rescheduling">
                <Textarea
                  v-model:value="rescheduleState.reason"
                  :rows="3"
                  placeholder="Why is this interview being rescheduled?"
                />
              </FormItem>
            </Form>
          </template>

          <!-- Create/Edit Form -->
          <template v-else>
            <Form
              ref="formRef"
              :model="formState"
              :rules="formRules"
              layout="vertical"
            >
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem label="Application" name="application_id">
                    <Select
                      v-model:value="formState.application_id"
                      placeholder="Select application"
                      show-search
                      :filter-option="
                        (input, option) =>
                          option.label
                            ?.toLowerCase()
                            .includes(input.toLowerCase())
                      "
                    >
                      <SelectOption
                        v-for="app in applications"
                        :key="app.id"
                        :value="app.id"
                        :label="`${app.candidate_name} - ${app.job_title}`"
                      >
                        {{ app.candidate_name }} - {{ app.job_title }}
                      </SelectOption>
                    </Select>
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Interview Type" name="interview_type">
                    <Select v-model:value="formState.interview_type">
                      <SelectOption
                        v-for="itype in interviewTypes"
                        :key="itype.value"
                        :value="itype.value"
                      >
                        {{ itype.label }}
                      </SelectOption>
                    </Select>
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Date & Time" name="scheduled_at">
                    <DatePicker
                      :value="
                        formState.scheduled_at
                          ? dayjs(formState.scheduled_at)
                          : undefined
                      "
                      show-time
                      format="YYYY-MM-DD HH:mm"
                      style="width: 100%"
                      @change="handleDateTimeChange"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem
                    label="Duration (minutes)"
                    name="duration_minutes"
                  >
                    <InputNumber
                      v-model:value="formState.duration_minutes"
                      :min="15"
                      :max="480"
                      :step="15"
                      style="width: 100%"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Location" name="location">
                    <Input
                      v-model:value="formState.location"
                      placeholder="Office location or room"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Meeting Link" name="meeting_link">
                    <Input
                      v-model:value="formState.meeting_link"
                      placeholder="Video call link"
                    />
                  </FormItem>
                </Col>
              </Row>
            </Form>
          </template>
        </Spin>

        <template v-if="modalMode !== 'view'" #footer>
          <Button @click="modalVisible = false">Cancel</Button>
          <Button
            v-if="modalMode === 'feedback'"
            type="primary"
            :loading="modalLoading"
            @click="handleFeedbackSubmit"
          >
            Submit Feedback
          </Button>
          <Button
            v-else-if="modalMode === 'reschedule'"
            type="primary"
            :loading="modalLoading"
            @click="handleReschedule"
          >
            Reschedule
          </Button>
          <Button
            v-else
            type="primary"
            :loading="modalLoading"
            @click="handleSubmit"
          >
            {{ modalMode === 'create' ? 'Schedule' : 'Update' }}
          </Button>
        </template>
      </Modal>
    </div>
  </Page>
</template>

<style scoped>
.events {
  list-style: none;
  padding: 0;
  margin: 0;
}

.events li {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
