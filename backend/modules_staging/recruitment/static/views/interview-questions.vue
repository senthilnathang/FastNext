<script setup>
import { computed, h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Badge,
  Button,
  Card,
  Col,
  Collapse,
  CollapsePanel,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  TabPane,
  Table,
  Tabs,
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
  createInterviewQuestionApi,
  deleteInterviewQuestionApi,
  getInterviewQuestionsApi,
  updateInterviewQuestionApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTInterviewQuestionsList',
});

// State
const loading = ref(false);
const questions = ref([]);
const modalVisible = ref(false);
const viewModalVisible = ref(false);
const modalMode = ref('create');
const selectedQuestion = ref(null);
const saving = ref(false);
const activeTab = ref('all');

// Filters
const filters = ref({
  interview_type: undefined,
  category: undefined,
  difficulty: undefined,
});

// Form
const formRef = ref();
const formState = ref({
  question: '',
  answer_guide: '',
  interview_type: 'technical',
  category: '',
  difficulty: 'medium',
  skills: [],
  time_estimate_minutes: 10,
  job_position_id: undefined,
});

const interviewTypes = [
  { value: 'phone', label: 'Phone Screen', color: 'blue' },
  { value: 'video', label: 'Video Call', color: 'cyan' },
  { value: 'technical', label: 'Technical', color: 'purple' },
  { value: 'hr', label: 'HR Round', color: 'green' },
  { value: 'panel', label: 'Panel Interview', color: 'orange' },
  { value: 'culture_fit', label: 'Culture Fit', color: 'pink' },
  { value: 'final', label: 'Final Round', color: 'gold' },
];

const difficulties = [
  { value: 'easy', label: 'Easy', color: 'green' },
  { value: 'medium', label: 'Medium', color: 'orange' },
  { value: 'hard', label: 'Hard', color: 'red' },
  { value: 'expert', label: 'Expert', color: 'volcano' },
];

// Computed
const categories = computed(() => {
  const cats = new Set();
  questions.value.forEach((q) => {
    if (q.category) cats.add(q.category);
  });
  return Array.from(cats).sort();
});

const filteredQuestions = computed(() => {
  let result = questions.value;
  if (activeTab.value !== 'all') {
    result = result.filter((q) => q.interview_type === activeTab.value);
  }
  if (filters.value.category) {
    result = result.filter((q) => q.category === filters.value.category);
  }
  if (filters.value.difficulty) {
    result = result.filter((q) => q.difficulty === filters.value.difficulty);
  }
  return result;
});

const questionsByCategory = computed(() => {
  const grouped = {};
  filteredQuestions.value.forEach((q) => {
    const cat = q.category || 'General';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(q);
  });
  return grouped;
});

const typeCounts = computed(() => {
  const counts = { all: questions.value.length };
  interviewTypes.forEach((t) => {
    counts[t.value] = questions.value.filter(
      (q) => q.interview_type === t.value,
    ).length;
  });
  return counts;
});

// Table columns
const columns = [
  {
    title: 'Question',
    dataIndex: 'question',
    key: 'question',
    ellipsis: true,
  },
  {
    title: 'Category',
    dataIndex: 'category',
    key: 'category',
    width: 150,
    customRender: ({ text }) => text || '-',
  },
  {
    title: 'Difficulty',
    dataIndex: 'difficulty',
    key: 'difficulty',
    width: 100,
    customRender: ({ text }) => {
      const diff = difficulties.find((d) => d.value === text);
      return h(Tag, { color: diff?.color || 'default' }, () => diff?.label || text);
    },
  },
  {
    title: 'Type',
    dataIndex: 'interview_type',
    key: 'interview_type',
    width: 140,
    customRender: ({ text }) => {
      const type = interviewTypes.find((t) => t.value === text);
      return h(Tag, { color: type?.color || 'default' }, () => type?.label || text || '-');
    },
  },
  {
    title: 'Time (min)',
    dataIndex: 'time_estimate_minutes',
    key: 'time_estimate_minutes',
    width: 100,
    customRender: ({ text }) =>
      text ? `${text} min` : '-',
  },
  {
    title: 'Skills',
    dataIndex: 'skills',
    key: 'skills',
    width: 200,
    customRender: ({ text }) =>
      text?.length > 0
        ? h(
            'div',
            { class: 'flex flex-wrap gap-1' },
            text
              .slice(0, 3)
              .map((s) => h(Tag, { key: s, class: 'mb-1' }, () => s)),
          )
        : '-',
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 130,
  },
];

// Functions
async function loadData() {
  loading.value = true;
  try {
    const res = await getInterviewQuestionsApi(filters.value);
    questions.value = res.items || [];
  } catch {
    message.error('Failed to load questions');
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  modalMode.value = 'create';
  formState.value = {
    question: '',
    answer_guide: '',
    interview_type: activeTab.value !== 'all' ? activeTab.value : 'technical',
    category: '',
    difficulty: 'medium',
    skills: [],
    time_estimate_minutes: 10,
    job_position_id: undefined,
  };
  modalVisible.value = true;
}

function openEditModal(record) {
  modalMode.value = 'edit';
  selectedQuestion.value = record;
  formState.value = {
    question: record.question,
    answer_guide: record.answer_guide || '',
    interview_type: record.interview_type || 'technical',
    category: record.category || '',
    difficulty: record.difficulty,
    skills: record.skills || [],
    time_estimate_minutes: record.time_estimate_minutes || 10,
    job_position_id: record.job_position_id || undefined,
  };
  modalVisible.value = true;
}

function viewQuestion(record) {
  selectedQuestion.value = record;
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
    const data = {
      question: formState.value.question,
      answer_guide: formState.value.answer_guide || undefined,
      interview_type: formState.value.interview_type,
      category: formState.value.category || undefined,
      difficulty: formState.value.difficulty,
      skills: formState.value.skills,
      time_estimate_minutes: formState.value.time_estimate_minutes || undefined,
      job_position_id: formState.value.job_position_id || undefined,
    };

    if (modalMode.value === 'create') {
      await createInterviewQuestionApi(data);
      message.success('Question created successfully');
    } else {
      await updateInterviewQuestionApi(selectedQuestion.value.id, data);
      message.success('Question updated successfully');
    }
    modalVisible.value = false;
    loadData();
  } catch (error) {
    message.error(
      error?.response?.data?.detail || 'Failed to save question',
    );
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id) {
  try {
    await deleteInterviewQuestionApi(id);
    message.success('Question deleted successfully');
    loadData();
  } catch {
    message.error('Failed to delete question');
  }
}

function handleSkillsChange(value) {
  const skills = formState.value.skills || [];
  if (value && !skills.includes(value)) {
    formState.value.skills = [...skills, value];
  }
}

function removeSkill(skill) {
  formState.value.skills = (formState.value.skills || []).filter(
    (s) => s !== skill,
  );
}

onMounted(loadData);
</script>

<template>
  <Page
    title="Interview Question Bank"
    description="Manage interview questions by type and category"
  >
    <Spin :spinning="loading">
      <Card>
        <!-- Tabs by interview type -->
        <Tabs v-model:activeKey="activeTab" class="mb-4">
          <TabPane key="all">
            <template #tab>
              <Badge
                :count="typeCounts.all"
                :offset="[10, 0]"
                :number-style="{ backgroundColor: '#1890ff' }"
              >
                All Questions
              </Badge>
            </template>
          </TabPane>
          <TabPane v-for="type in interviewTypes" :key="type.value">
            <template #tab>
              <Badge :count="typeCounts[type.value] || 0" :offset="[10, 0]">
                {{ type.label }}
              </Badge>
            </template>
          </TabPane>
        </Tabs>

        <!-- Toolbar -->
        <div class="mb-4 flex items-center justify-between">
          <Space>
            <Select
              v-model:value="filters.category"
              placeholder="Filter by Category"
              style="width: 180px"
              allow-clear
              @change="loadData"
            >
              <SelectOption v-for="cat in categories" :key="cat" :value="cat">
                {{ cat }}
              </SelectOption>
            </Select>
            <Select
              v-model:value="filters.difficulty"
              placeholder="Filter by Difficulty"
              style="width: 150px"
              allow-clear
              @change="loadData"
            >
              <SelectOption
                v-for="diff in difficulties"
                :key="diff.value"
                :value="diff.value"
              >
                <Tag :color="diff.color">{{ diff.label }}</Tag>
              </SelectOption>
            </Select>
          </Space>
          <Button type="primary" @click="openCreateModal">
            <PlusOutlined /> Add Question
          </Button>
        </div>

        <!-- Questions grouped by category -->
        <Collapse
          v-if="Object.keys(questionsByCategory).length > 0"
          :default-active-key="['General']"
        >
          <CollapsePanel
            v-for="(catQuestions, category) in questionsByCategory"
            :key="category"
            :header="`${category} (${catQuestions.length})`"
          >
            <Table
              :columns="columns"
              :data-source="catQuestions"
              :row-key="
                (record) => String(record.id)
              "
              :pagination="false"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'actions'">
                  <Space>
                    <Tooltip title="View">
                      <Button size="small" @click="viewQuestion(record)">
                        <EyeOutlined />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button size="small" @click="openEditModal(record)">
                        <EditOutlined />
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      title="Delete this question?"
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
          </CollapsePanel>
        </Collapse>
        <Empty v-else description="No questions found" />
      </Card>

      <!-- Create/Edit Modal -->
      <Modal
        v-model:open="modalVisible"
        :title="modalMode === 'create' ? 'Add Question' : 'Edit Question'"
        :confirm-loading="saving"
        width="700px"
        @ok="handleSave"
      >
        <Form ref="formRef" :model="formState" layout="vertical">
          <FormItem
            label="Question"
            name="question"
            :rules="[{ required: true, message: 'Please enter the question' }]"
          >
            <Textarea
              v-model:value="formState.question"
              :rows="3"
              placeholder="Enter the interview question..."
            />
          </FormItem>
          <FormItem label="Expected Answer / Guide" name="answer_guide">
            <Textarea
              v-model:value="formState.answer_guide"
              :rows="4"
              placeholder="Expected answer or evaluation points..."
            />
          </FormItem>
          <Row :gutter="16">
            <Col :span="8">
              <FormItem
                label="Interview Type"
                name="interview_type"
                :rules="[
                  { required: true, message: 'Please select type' },
                ]"
              >
                <Select v-model:value="formState.interview_type">
                  <SelectOption
                    v-for="type in interviewTypes"
                    :key="type.value"
                    :value="type.value"
                  >
                    <Tag :color="type.color">{{ type.label }}</Tag>
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="8">
              <FormItem label="Category" name="category">
                <Input
                  v-model:value="formState.category"
                  placeholder="e.g., Algorithms, System Design"
                />
              </FormItem>
            </Col>
            <Col :span="8">
              <FormItem label="Difficulty" name="difficulty">
                <Select v-model:value="formState.difficulty">
                  <SelectOption
                    v-for="diff in difficulties"
                    :key="diff.value"
                    :value="diff.value"
                  >
                    <Tag :color="diff.color">{{ diff.label }}</Tag>
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Skills Assessed" name="skills">
                <div>
                  <Input
                    placeholder="Type skill and press Enter"
                    style="margin-bottom: 8px"
                    @press-enter="
                      (e) => {
                        handleSkillsChange(
                          e.target.value,
                        );
                        e.target.value = '';
                      }
                    "
                  />
                  <div class="flex flex-wrap gap-1">
                    <Tag
                      v-for="skill in formState.skills"
                      :key="skill"
                      closable
                      @close="removeSkill(skill)"
                    >
                      {{ skill }}
                    </Tag>
                  </div>
                </div>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem
                label="Time Estimate (minutes)"
                name="time_estimate_minutes"
              >
                <InputNumber
                  v-model:value="formState.time_estimate_minutes"
                  :min="1"
                  :max="120"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
          </Row>
        </Form>
      </Modal>

      <!-- View Modal -->
      <Modal
        v-model:open="viewModalVisible"
        title="Question Details"
        :footer="null"
        width="600px"
      >
        <template v-if="selectedQuestion">
          <div class="space-y-4">
            <div class="flex items-start justify-between">
              <Tag
                :color="
                  interviewTypes.find(
                    (t) => t.value === selectedQuestion.interview_type,
                  )?.color
                "
              >
                {{
                  interviewTypes.find(
                    (t) => t.value === selectedQuestion.interview_type,
                  )?.label
                }}
              </Tag>
              <Tag
                :color="
                  difficulties.find(
                    (d) => d.value === selectedQuestion.difficulty,
                  )?.color
                "
              >
                {{
                  difficulties.find(
                    (d) => d.value === selectedQuestion.difficulty,
                  )?.label
                }}
              </Tag>
            </div>
            <div>
              <div class="mb-1 text-sm text-gray-500">Question</div>
              <div class="text-lg font-medium">
                {{ selectedQuestion.question }}
              </div>
            </div>
            <div v-if="selectedQuestion.answer_guide">
              <div class="mb-1 text-sm text-gray-500">Answer Guide</div>
              <div
                class="whitespace-pre-wrap rounded bg-blue-50 p-3 text-blue-800"
              >
                {{ selectedQuestion.answer_guide }}
              </div>
            </div>
            <div v-if="selectedQuestion.category">
              <div class="mb-1 text-sm text-gray-500">Category</div>
              <Tag>{{ selectedQuestion.category }}</Tag>
            </div>
            <div v-if="selectedQuestion.skills?.length">
              <div class="mb-1 text-sm text-gray-500">Skills Assessed</div>
              <div class="flex flex-wrap gap-1">
                <Tag
                  v-for="skill in selectedQuestion.skills"
                  :key="skill"
                  color="blue"
                >
                  {{ skill }}
                </Tag>
              </div>
            </div>
            <div v-if="selectedQuestion.time_estimate_minutes">
              <div class="mb-1 text-sm text-gray-500">Estimated Time</div>
              <div>{{ selectedQuestion.time_estimate_minutes }} minutes</div>
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

.space-y-4 > * + * {
  margin-top: 1rem;
}

.flex-wrap {
  flex-wrap: wrap;
}

.gap-1 {
  gap: 0.25rem;
}
</style>
