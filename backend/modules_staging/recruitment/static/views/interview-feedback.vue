<script setup>
import { computed, h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  FormItem,
  Input,
  Modal,
  Popconfirm,
  Progress,
  Rate,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Textarea,
  Tooltip,
  message,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';

import {
  deleteInterviewFeedbackApi,
  getInterviewFeedbacksApi,
  getInterviewsApi,
  submitInterviewerFeedbackApi,
  updateInterviewFeedbackApi,
} from '#/api/recruitment';
import { getEmployeesApi } from '#/api/employee';

defineOptions({
  name: 'RECRUITMENTInterviewFeedbackList',
});

// State
const loading = ref(false);
const feedbacks = ref([]);
const interviews = ref([]);
const employees = ref([]);
const modalVisible = ref(false);
const viewModalVisible = ref(false);
const modalMode = ref('create');
const selectedFeedback = ref(null);
const saving = ref(false);

// Filters
const filters = ref({
  interview_id: undefined,
  interviewer_id: undefined,
});

// Form
const formRef = ref();
const formState = ref({
  interview_id: undefined,
  interviewer_id: undefined,
  overall_rating: 3,
  recommendation: 'hire',
  feedback: '',
  strengths: '',
  weaknesses: '',
  notes: '',
  criteria_scores: {},
});

const recommendationOptions = [
  { value: 'strong_hire', label: 'Strong Hire', color: 'green' },
  { value: 'hire', label: 'Hire', color: 'blue' },
  { value: 'lean_hire', label: 'Lean Hire', color: 'cyan' },
  { value: 'lean_no_hire', label: 'Lean No Hire', color: 'orange' },
  { value: 'no_hire', label: 'No Hire', color: 'red' },
  { value: 'strong_no_hire', label: 'Strong No Hire', color: 'volcano' },
];

// Stats
const stats = computed(() => {
  const total = feedbacks.value.length;
  const avgRating =
    total > 0
      ? feedbacks.value.reduce((sum, f) => sum + f.overall_rating, 0) / total
      : 0;
  const recommendations = {};
  for (const f of feedbacks.value) {
    recommendations[f.recommendation] =
      (recommendations[f.recommendation] || 0) + 1;
  }
  return { total, avgRating, recommendations };
});

// Table columns
const columns = [
  {
    title: 'Interview',
    dataIndex: 'interview_id',
    key: 'interview_id',
    customRender: ({
      record,
    }) => {
      const interview = interviews.value.find(
        (i) => i.id === record.interview_id,
      );
      return interview
        ? `#${interview.id} - ${interview.candidate_name}`
        : `Interview #${record.interview_id}`;
    },
  },
  {
    title: 'Interviewer',
    dataIndex: 'interviewer_name',
    key: 'interviewer_name',
  },
  {
    title: 'Rating',
    dataIndex: 'overall_rating',
    key: 'overall_rating',
    width: 150,
    customRender: ({ text }) =>
      h(Rate, { value: text, disabled: true, allowHalf: true }),
  },
  {
    title: 'Recommendation',
    dataIndex: 'recommendation',
    key: 'recommendation',
    customRender: ({ text }) => {
      const opt = recommendationOptions.find((o) => o.value === text);
      return h(Tag, { color: opt?.color || 'default' }, () => opt?.label || text);
    },
  },
  {
    title: 'Submitted',
    dataIndex: 'submitted_at',
    key: 'submitted_at',
    customRender: ({ text }) =>
      text ? new Date(text).toLocaleDateString() : '-',
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
  },
];

// Functions
async function loadData() {
  loading.value = true;
  try {
    const [feedbackRes, interviewRes, employeeRes] = await Promise.all([
      getInterviewFeedbacksApi(filters.value),
      getInterviewsApi({ page_size: 1000 }),
      getEmployeesApi({ page_size: 1000 }),
    ]);
    feedbacks.value = feedbackRes.items || [];
    interviews.value = (interviewRes.items || []).map((i) => ({
      ...i,
      candidate_name:
        i.candidate_name ||
        (i.application?.candidate
          ? `${i.application.candidate.first_name || ''} ${i.application.candidate.last_name || ''}`.trim()
          : null) ||
        `Application #${i.application_id}`,
    }));
    employees.value = (employeeRes.items || []).map((e) => ({
      id: e.id,
      name:
        `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email || `Employee #${e.id}`,
    }));
  } catch {
    message.error('Failed to load feedback data');
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  modalMode.value = 'create';
  formState.value = {
    interview_id: undefined,
    interviewer_id: undefined,
    overall_rating: 3,
    recommendation: 'hire',
    feedback: '',
    strengths: '',
    weaknesses: '',
    notes: '',
    criteria_scores: {},
  };
  modalVisible.value = true;
}

function openEditModal(record) {
  modalMode.value = 'edit';
  selectedFeedback.value = record;
  formState.value = {
    interview_id: record.interview_id,
    interviewer_id: record.interviewer_id,
    overall_rating: record.overall_rating,
    recommendation: record.recommendation,
    feedback: record.feedback,
    strengths: record.strengths || '',
    weaknesses: record.weaknesses || '',
    notes: record.notes || '',
    criteria_scores: record.criteria_scores || {},
  };
  modalVisible.value = true;
}

function viewFeedback(record) {
  selectedFeedback.value = record;
  viewModalVisible.value = true;
}

async function handleSave() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    if (modalMode.value === 'create') {
      const payload = {
        interview_id: formState.value.interview_id,
        interviewer_id: formState.value.interviewer_id,
        overall_rating: formState.value.overall_rating,
        recommendation: formState.value.recommendation,
        feedback: formState.value.feedback,
        strengths: formState.value.strengths || undefined,
        weaknesses: formState.value.weaknesses || undefined,
        notes: formState.value.notes || undefined,
        criteria_scores: Object.keys(formState.value.criteria_scores).length
          ? formState.value.criteria_scores
          : undefined,
      };
      await submitInterviewerFeedbackApi(payload);
      message.success('Feedback submitted successfully');
    } else {
      await updateInterviewFeedbackApi(selectedFeedback.value.id, {
        overall_rating: formState.value.overall_rating,
        recommendation: formState.value.recommendation,
        feedback: formState.value.feedback,
        strengths: formState.value.strengths || undefined,
        weaknesses: formState.value.weaknesses || undefined,
        notes: formState.value.notes || undefined,
      });
      message.success('Feedback updated successfully');
    }
    modalVisible.value = false;
    loadData();
  } catch (error) {
    message.error(
      error?.response?.data?.detail || 'Failed to save feedback',
    );
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id) {
  try {
    await deleteInterviewFeedbackApi(id);
    message.success('Feedback deleted successfully');
    loadData();
  } catch {
    message.error('Failed to delete feedback');
  }
}

onMounted(loadData);
</script>

<template>
  <Page
    title="Interview Feedback"
    description="Manage interviewer feedback for candidates"
  >
    <Spin :spinning="loading">
      <!-- Stats Cards -->
      <Row :gutter="16" class="mb-4">
        <Col :span="6">
          <Card>
            <Statistic title="Total Feedback" :value="stats.total" />
          </Card>
        </Col>
        <Col :span="6">
          <Card>
            <Statistic
              title="Average Rating"
              :value="stats.avgRating"
              :precision="1"
              suffix="/ 5"
            />
          </Card>
        </Col>
        <Col :span="6">
          <Card>
            <div class="mb-2 text-sm text-gray-500">Hire Rate</div>
            <Progress
              :percent="
                stats.total > 0
                  ? Math.round(
                      (((stats.recommendations.strong_hire || 0) +
                        (stats.recommendations.hire || 0) +
                        (stats.recommendations.lean_hire || 0)) /
                        stats.total) *
                        100,
                    )
                  : 0
              "
              :stroke-color="'#52c41a'"
            />
          </Card>
        </Col>
        <Col :span="6">
          <Card>
            <div class="mb-2 text-sm text-gray-500">No Hire Rate</div>
            <Progress
              :percent="
                stats.total > 0
                  ? Math.round(
                      (((stats.recommendations.strong_no_hire || 0) +
                        (stats.recommendations.no_hire || 0) +
                        (stats.recommendations.lean_no_hire || 0)) /
                        stats.total) *
                        100,
                    )
                  : 0
              "
              :stroke-color="'#ff4d4f'"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <!-- Toolbar -->
        <div class="mb-4 flex items-center justify-between">
          <Space>
            <Select
              v-model:value="filters.interview_id"
              placeholder="Filter by Interview"
              style="width: 200px"
              allow-clear
              @change="loadData"
            >
              <SelectOption
                v-for="interview in interviews"
                :key="interview.id"
                :value="interview.id"
              >
                #{{ interview.id }} - {{ interview.candidate_name }}
              </SelectOption>
            </Select>
            <Select
              v-model:value="filters.interviewer_id"
              placeholder="Filter by Interviewer"
              style="width: 200px"
              allow-clear
              show-search
              option-filter-prop="label"
              @change="loadData"
            >
              <SelectOption
                v-for="emp in employees"
                :key="emp.id"
                :value="emp.id"
                :label="emp.name"
              >
                {{ emp.name }}
              </SelectOption>
            </Select>
          </Space>
          <Button type="primary" @click="openCreateModal">
            <PlusOutlined /> Submit Feedback
          </Button>
        </div>

        <!-- Table -->
        <Table
          :columns="columns"
          :data-source="feedbacks"
          row-key="id"
          :pagination="{
            pageSize: 10,
            showTotal: (total) => `Total ${total} feedback`,
          }"
        >
          <template #emptyText>
            <Empty description="No feedback found" />
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="View">
                  <Button size="small" @click="viewFeedback(record)">
                    <EyeOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button size="small" @click="openEditModal(record)">
                    <EditOutlined />
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Delete this feedback?"
                  @confirm="handleDelete(record.id)"
                >
                  <Tooltip title="Delete">
                    <Button size="small" danger>
                      <DeleteOutlined />
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <!-- Create/Edit Modal -->
      <Modal
        v-model:open="modalVisible"
        :title="modalMode === 'create' ? 'Submit Feedback' : 'Edit Feedback'"
        :confirm-loading="saving"
        width="700px"
        @ok="handleSave"
      >
        <Form ref="formRef" :model="formState" layout="vertical">
          <Row :gutter="16">
            <Col :span="12">
              <FormItem
                label="Interview"
                name="interview_id"
                :rules="[
                  { required: true, message: 'Please select interview' },
                ]"
              >
                <Select
                  v-model:value="formState.interview_id"
                  placeholder="Select interview"
                  :disabled="modalMode === 'edit'"
                >
                  <SelectOption
                    v-for="interview in interviews"
                    :key="interview.id"
                    :value="interview.id"
                  >
                    #{{ interview.id }} - {{ interview.candidate_name }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem
                label="Interviewer"
                name="interviewer_id"
                :rules="[
                  { required: true, message: 'Please select interviewer' },
                ]"
              >
                <Select
                  v-model:value="formState.interviewer_id"
                  placeholder="Select interviewer"
                  show-search
                  option-filter-prop="label"
                  :disabled="modalMode === 'edit'"
                >
                  <SelectOption
                    v-for="emp in employees"
                    :key="emp.id"
                    :value="emp.id"
                    :label="emp.name"
                  >
                    {{ emp.name }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Overall Rating" name="overall_rating">
                <Rate v-model:value="formState.overall_rating" allow-half />
                <span class="ml-2 text-gray-500">
                  {{ formState.overall_rating }} / 5
                </span>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem
                label="Recommendation"
                name="recommendation"
                :rules="[
                  {
                    required: true,
                    message: 'Please select recommendation',
                  },
                ]"
              >
                <Select v-model:value="formState.recommendation">
                  <SelectOption
                    v-for="opt in recommendationOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    <Tag :color="opt.color" class="mr-0">{{ opt.label }}</Tag>
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
          </Row>
          <FormItem
            label="Feedback"
            name="feedback"
            :rules="[{ required: true, message: 'Please provide feedback' }]"
          >
            <Textarea
              v-model:value="formState.feedback"
              :rows="4"
              placeholder="Overall feedback about the candidate..."
            />
          </FormItem>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Strengths" name="strengths">
                <Textarea
                  v-model:value="formState.strengths"
                  :rows="3"
                  placeholder="Key strengths observed..."
                />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Areas for Improvement" name="weaknesses">
                <Textarea
                  v-model:value="formState.weaknesses"
                  :rows="3"
                  placeholder="Areas that need improvement..."
                />
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Private Notes" name="notes">
            <Textarea
              v-model:value="formState.notes"
              :rows="2"
              placeholder="Private notes (not visible to candidate)..."
            />
          </FormItem>
        </Form>
      </Modal>

      <!-- View Modal -->
      <Modal
        v-model:open="viewModalVisible"
        title="Feedback Details"
        :footer="null"
        width="600px"
      >
        <template v-if="selectedFeedback">
          <div class="space-y-4">
            <div class="flex items-center justify-between">
              <div>
                <div class="text-lg font-medium">
                  {{ selectedFeedback.interviewer_name }}
                </div>
                <div class="text-gray-500">
                  Interview #{{ selectedFeedback.interview_id }}
                </div>
              </div>
              <Tag
                :color="
                  recommendationOptions.find(
                    (o) => o.value === selectedFeedback.recommendation,
                  )?.color
                "
              >
                {{
                  recommendationOptions.find(
                    (o) => o.value === selectedFeedback.recommendation,
                  )?.label
                }}
              </Tag>
            </div>
            <div>
              <div class="mb-1 text-sm text-gray-500">Overall Rating</div>
              <Rate
                :value="selectedFeedback.overall_rating"
                disabled
                allow-half
              />
              <span class="ml-2">
                {{ selectedFeedback.overall_rating }} / 5
              </span>
            </div>
            <div>
              <div class="mb-1 text-sm text-gray-500">Feedback</div>
              <div class="rounded bg-gray-50 p-3">
                {{ selectedFeedback.feedback }}
              </div>
            </div>
            <Row
              v-if="selectedFeedback.strengths || selectedFeedback.weaknesses"
              :gutter="16"
            >
              <Col v-if="selectedFeedback.strengths" :span="12">
                <div class="mb-1 text-sm text-gray-500">Strengths</div>
                <div class="rounded bg-green-50 p-3 text-green-800">
                  {{ selectedFeedback.strengths }}
                </div>
              </Col>
              <Col v-if="selectedFeedback.weaknesses" :span="12">
                <div class="mb-1 text-sm text-gray-500">
                  Areas for Improvement
                </div>
                <div class="rounded bg-orange-50 p-3 text-orange-800">
                  {{ selectedFeedback.weaknesses }}
                </div>
              </Col>
            </Row>
            <div v-if="selectedFeedback.notes">
              <div class="mb-1 text-sm text-gray-500">Private Notes</div>
              <div class="rounded bg-gray-100 p-3 italic text-gray-600">
                {{ selectedFeedback.notes }}
              </div>
            </div>
            <div class="text-right text-sm text-gray-400">
              Submitted:
              {{
                selectedFeedback.submitted_at
                  ? new Date(selectedFeedback.submitted_at).toLocaleString()
                  : '-'
              }}
            </div>
          </div>
        </template>
      </Modal>
    </Spin>
  </Page>
</template>

<style scoped>
.mb-4 {
  margin-bottom: 1rem;
}

.mb-2 {
  margin-bottom: 0.5rem;
}

.ml-2 {
  margin-left: 0.5rem;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}
</style>
