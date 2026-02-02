<script setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Collapse,
  Drawer,
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
  Table,
  Tabs,
  Tag,
  Textarea,
  message,
  TabPane,
  CollapsePanel,
} from 'ant-design-vue';
import {
  BulbOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  OrderedListOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import {
  addInterviewKitQuestionApi,
  createCompetencyApi,
  createInterviewKitApi,
  deleteCompetencyApi,
  deleteInterviewKitApi,
  deleteInterviewKitQuestionApi,
  getCompetenciesApi,
  getInterviewKitApi,
  getInterviewKitQuestionsApi,
  getInterviewKitsApi,
  updateCompetencyApi,
  updateInterviewKitApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTInterviewKitsList',
});

// State
const loading = ref(false);
const activeTab = ref('kits');
const interviewKits = ref([]);
const competencies = ref([]);
const selectedKit = ref(null);
const selectedKitQuestions = ref([]);

// Kit form
const kitDrawerVisible = ref(false);
const kitFormLoading = ref(false);
const editingKit = ref(null);
const kitForm = ref({
  name: '',
  description: '',
  duration_minutes: 60,
  interview_type: 'behavioral',
  is_template: false,
});

// Question form
const questionModalVisible = ref(false);
const questionFormLoading = ref(false);
const questionForm = ref({
  question: '',
  purpose: '',
  good_answer_hints: '',
  red_flags: '',
  competency_id: undefined,
  time_allocation_minutes: 5,
});

// Competency form
const competencyModalVisible = ref(false);
const competencyFormLoading = ref(false);
const editingCompetency = ref(null);
const competencyForm = ref({
  name: '',
  description: '',
  category: 'technical',
});

// Interview types
const interviewTypes = [
  { label: 'Phone Screen', value: 'phone_screen' },
  { label: 'Technical Interview', value: 'technical' },
  { label: 'Behavioral Interview', value: 'behavioral' },
  { label: 'Culture Fit', value: 'culture_fit' },
  { label: 'Panel Interview', value: 'panel' },
  { label: 'Case Study', value: 'case_study' },
  { label: 'Final Interview', value: 'final' },
];

// Competency categories
const competencyCategories = [
  { label: 'Technical Skills', value: 'technical' },
  { label: 'Leadership', value: 'leadership' },
  { label: 'Communication', value: 'communication' },
  { label: 'Problem Solving', value: 'problem_solving' },
  { label: 'Teamwork', value: 'teamwork' },
  { label: 'Adaptability', value: 'adaptability' },
  { label: 'Domain Knowledge', value: 'domain' },
];

// Table columns
const kitColumns = [
  { dataIndex: 'name', key: 'name', title: 'Name' },
  { key: 'type', title: 'Type' },
  { key: 'duration', title: 'Duration' },
  { dataIndex: 'question_count', key: 'questions', title: 'Questions' },
  { key: 'template', title: 'Template', width: 100 },
  { key: 'actions', title: 'Actions', width: 180 },
];

const competencyColumns = [
  { dataIndex: 'name', key: 'name', title: 'Name' },
  { key: 'category', title: 'Category' },
  { dataIndex: 'question_count', key: 'questions', title: 'Questions' },
  { key: 'status', title: 'Status' },
  { key: 'actions', title: 'Actions', width: 120 },
];

// Methods
async function fetchData() {
  loading.value = true;
  try {
    const [kitsRes, compsRes] = await Promise.all([
      getInterviewKitsApi(),
      getCompetenciesApi(),
    ]);
    interviewKits.value = kitsRes.items || [];
    competencies.value = compsRes.items || [];
  } catch (error) {
    console.error('Failed to fetch data:', error);
    message.error('Failed to load interview kits');
  } finally {
    loading.value = false;
  }
}

async function viewKit(kit) {
  try {
    const fullKit = await getInterviewKitApi(kit.id);
    selectedKit.value = fullKit;
    const questionsRes = await getInterviewKitQuestionsApi(kit.id);
    selectedKitQuestions.value = questionsRes.items || [];
  } catch (error) {
    console.error('Failed to load kit details:', error);
    message.error('Failed to load kit details');
  }
}

function openKitDrawer(kit) {
  editingKit.value = kit || null;
  if (kit) {
    kitForm.value = {
      name: kit.name,
      description: kit.description ?? undefined,
      duration_minutes: kit.duration_minutes ?? undefined,
      interview_type: kit.interview_type ?? undefined,
      is_template: kit.is_template,
    };
  } else {
    kitForm.value = {
      name: '',
      description: '',
      duration_minutes: 60,
      interview_type: 'behavioral',
      is_template: false,
    };
  }
  kitDrawerVisible.value = true;
}

async function saveKit() {
  if (!kitForm.value.name) {
    message.error('Name is required');
    return;
  }

  kitFormLoading.value = true;
  try {
    if (editingKit.value) {
      await updateInterviewKitApi(editingKit.value.id, kitForm.value);
      message.success('Kit updated successfully');
    } else {
      await createInterviewKitApi(kitForm.value);
      message.success('Kit created successfully');
    }
    kitDrawerVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('Failed to save kit:', error);
    message.error('Failed to save kit');
  } finally {
    kitFormLoading.value = false;
  }
}

async function deleteKit(id) {
  try {
    await deleteInterviewKitApi(id);
    message.success('Kit deleted');
    if (selectedKit.value?.id === id) {
      selectedKit.value = null;
      selectedKitQuestions.value = [];
    }
    fetchData();
  } catch (error) {
    console.error('Failed to delete kit:', error);
    message.error('Failed to delete kit');
  }
}

function openQuestionModal() {
  if (!selectedKit.value) return;

  questionForm.value = {
    question: '',
    purpose: '',
    good_answer_hints: '',
    red_flags: '',
    competency_id: undefined,
    time_allocation_minutes: 5,
  };
  questionModalVisible.value = true;
}

async function saveQuestion() {
  if (!questionForm.value.question || !selectedKit.value) {
    message.error('Question is required');
    return;
  }

  questionFormLoading.value = true;
  try {
    await addInterviewKitQuestionApi(selectedKit.value.id, questionForm.value);
    message.success('Question added');
    questionModalVisible.value = false;
    // Refresh kit details
    await viewKit(selectedKit.value);
  } catch (error) {
    console.error('Failed to save question:', error);
    message.error('Failed to save question');
  } finally {
    questionFormLoading.value = false;
  }
}

async function deleteQuestion(questionId) {
  try {
    if (!selectedKit.value) return;
    await deleteInterviewKitQuestionApi(questionId);
    message.success('Question deleted');
    if (selectedKit.value) {
      await viewKit(selectedKit.value);
    }
  } catch (error) {
    console.error('Failed to delete question:', error);
    message.error('Failed to delete question');
  }
}

function openCompetencyModal(competency) {
  editingCompetency.value = competency || null;
  if (competency) {
    competencyForm.value = {
      name: competency.name,
      description: competency.description ?? undefined,
      category: competency.category ?? undefined,
    };
  } else {
    competencyForm.value = {
      name: '',
      description: '',
      category: 'technical',
    };
  }
  competencyModalVisible.value = true;
}

async function saveCompetency() {
  if (!competencyForm.value.name) {
    message.error('Name is required');
    return;
  }

  competencyFormLoading.value = true;
  try {
    if (editingCompetency.value) {
      await updateCompetencyApi(editingCompetency.value.id, competencyForm.value);
      message.success('Competency updated');
    } else {
      await createCompetencyApi(competencyForm.value);
      message.success('Competency created');
    }
    competencyModalVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('Failed to save competency:', error);
    message.error('Failed to save competency');
  } finally {
    competencyFormLoading.value = false;
  }
}

async function deleteCompetency(id) {
  try {
    await deleteCompetencyApi(id);
    message.success('Competency deleted');
    fetchData();
  } catch (error) {
    console.error('Failed to delete competency:', error);
    message.error('Failed to delete competency');
  }
}

function getInterviewTypeColor(type) {
  const colors = {
    behavioral: 'green',
    case_study: 'magenta',
    culture_fit: 'orange',
    final: 'red',
    panel: 'cyan',
    phone_screen: 'blue',
    technical: 'purple',
  };
  return colors[type] || 'default';
}

function getCategoryColor(category) {
  const colors = {
    adaptability: 'magenta',
    communication: 'green',
    domain: 'gold',
    leadership: 'purple',
    problem_solving: 'orange',
    teamwork: 'cyan',
    technical: 'blue',
  };
  return colors[category] || 'default';
}

function getInterviewTypeLabel(type) {
  const found = interviewTypes.find((t) => t.value === type);
  return found ? found.label : type;
}

function getCategoryLabel(category) {
  const found = competencyCategories.find((c) => c.value === category);
  return found ? found.label : category;
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Interview Kits</h1>
        <Space>
          <Button @click="fetchData">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
        </Space>
      </div>

      <Spin :spinning="loading">
        <Row :gutter="16">
          <!-- Left Panel - Kit List -->
          <Col :lg="selectedKit ? 12 : 24" :xs="24">
            <Tabs v-model:activeKey="activeTab">
              <!-- Interview Kits Tab -->
              <TabPane key="kits" tab="Interview Kits">
                <div class="mb-4 flex justify-end">
                  <Button type="primary" @click="openKitDrawer()">
                    <template #icon><PlusOutlined /></template>
                    Create Kit
                  </Button>
                </div>

                <Table
                  :columns="kitColumns"
                  :data-source="interviewKits"
                  :pagination="{ pageSize: 10 }"
                  :row-class-name="
                    (record) =>
                      selectedKit?.id === record.id ? 'bg-blue-50' : ''
                  "
                  :row-key="(record) => record.id"
                >
                  <template #bodyCell="{ column, record: _record }">
                    <template v-if="column.key === 'name'">
                      <a @click="viewKit(_record)">{{ _record.name }}</a>
                    </template>
                    <template v-else-if="column.key === 'type'">
                      <Tag :color="getInterviewTypeColor(_record.interview_type)">
                        {{ getInterviewTypeLabel(_record.interview_type) }}
                      </Tag>
                    </template>
                    <template v-else-if="column.key === 'duration'">
                      <ClockCircleOutlined /> {{ _record.duration_minutes }} min
                    </template>
                    <template v-else-if="column.key === 'template'">
                      <Badge
                        :status="_record.is_template ? 'success' : 'default'"
                        :text="_record.is_template ? 'Yes' : 'No'"
                      />
                    </template>
                    <template v-else-if="column.key === 'actions'">
                      <Space>
                        <Button size="small" type="link" @click="viewKit(_record)">
                          <FileTextOutlined />
                        </Button>
                        <Button
                          size="small"
                          type="link"
                          @click="openKitDrawer(_record)"
                        >
                          <EditOutlined />
                        </Button>
                        <Popconfirm
                          title="Delete this kit?"
                          @confirm="deleteKit(_record.id)"
                        >
                          <Button danger size="small" type="link">
                            <DeleteOutlined />
                          </Button>
                        </Popconfirm>
                      </Space>
                    </template>
                  </template>
                </Table>
              </TabPane>

              <!-- Competencies Tab -->
              <TabPane key="competencies" tab="Competencies">
                <div class="mb-4 flex justify-end">
                  <Button type="primary" @click="openCompetencyModal()">
                    <template #icon><PlusOutlined /></template>
                    Add Competency
                  </Button>
                </div>

                <Table
                  :columns="competencyColumns"
                  :data-source="competencies"
                  :pagination="{ pageSize: 10 }"
                  :row-key="(record) => record.id"
                >
                  <template #bodyCell="{ column, record: _record }">
                    <template v-if="column.key === 'category'">
                      <Tag :color="getCategoryColor(_record.category ?? '')">
                        {{ getCategoryLabel(_record.category ?? '') }}
                      </Tag>
                    </template>
                    <template v-else-if="column.key === 'status'">
                      <Badge
                        :status="_record.is_active ? 'success' : 'default'"
                        :text="_record.is_active ? 'Active' : 'Inactive'"
                      />
                    </template>
                    <template v-else-if="column.key === 'actions'">
                      <Space>
                        <Button
                          size="small"
                          type="link"
                          @click="openCompetencyModal(_record)"
                        >
                          <EditOutlined />
                        </Button>
                        <Popconfirm
                          title="Delete this competency?"
                          @confirm="deleteCompetency(_record.id)"
                        >
                          <Button danger size="small" type="link">
                            <DeleteOutlined />
                          </Button>
                        </Popconfirm>
                      </Space>
                    </template>
                  </template>
                </Table>
              </TabPane>
            </Tabs>
          </Col>

          <!-- Right Panel - Kit Details -->
          <Col v-if="selectedKit" :lg="12" :xs="24">
            <Card :title="selectedKit.name">
              <template #extra>
                <Space>
                  <Tag :color="getInterviewTypeColor(selectedKit.interview_type ?? '')">
                    {{ getInterviewTypeLabel(selectedKit.interview_type ?? '') }}
                  </Tag>
                  <Button size="small" @click="selectedKit = null">
                    Close
                  </Button>
                </Space>
              </template>

              <div class="mb-4">
                <p v-if="selectedKit.description" class="text-gray-500">
                  {{ selectedKit.description }}
                </p>
                <div class="mt-2 flex gap-4 text-sm text-gray-400">
                  <span>
                    <ClockCircleOutlined />
                    {{ selectedKit.duration_minutes }} minutes
                  </span>
                  <span>
                    <OrderedListOutlined />
                    {{ selectedKitQuestions.length }} questions
                  </span>
                </div>
              </div>

              <div class="mb-4 flex items-center justify-between">
                <h3 class="text-lg font-semibold">Questions</h3>
                <Button
                  size="small"
                  type="primary"
                  @click="openQuestionModal()"
                >
                  <template #icon><PlusOutlined /></template>
                  Add Question
                </Button>
              </div>

              <div v-if="!selectedKitQuestions.length">
                <Empty description="No questions yet" />
              </div>

              <Collapse v-else>
                <CollapsePanel
                  v-for="(q, index) in selectedKitQuestions"
                  :key="q.id"
                  :header="`${index + 1}. ${q.question.substring(0, 80)}${q.question.length > 80 ? '...' : ''}`"
                >
                  <template #extra>
                    <Space @click.stop>
                      <Tag v-if="q.competency_name" color="blue">
                        {{ q.competency_name }}
                      </Tag>
                      <span class="text-gray-400">
                        {{ q.time_allocation_minutes }} min
                      </span>
                      <Popconfirm
                        title="Delete this question?"
                        @confirm="deleteQuestion(q.id)"
                      >
                        <Button danger size="small" type="link" @click.stop>
                          <DeleteOutlined />
                        </Button>
                      </Popconfirm>
                    </Space>
                  </template>

                  <p class="mb-4">{{ q.question }}</p>

                  <div v-if="q.purpose" class="mb-3">
                    <div
                      class="mb-1 flex items-center gap-1 text-sm font-medium text-gray-500"
                    >
                      <BulbOutlined /> Purpose
                    </div>
                    <p class="text-gray-600">{{ q.purpose }}</p>
                  </div>

                  <div v-if="q.good_answer_hints" class="mb-3">
                    <div class="mb-1 text-sm font-medium text-green-600">
                      Good Answer Hints
                    </div>
                    <p class="text-gray-600">{{ q.good_answer_hints }}</p>
                  </div>

                  <div v-if="q.red_flags">
                    <div class="mb-1 text-sm font-medium text-red-500">
                      Red Flags
                    </div>
                    <p class="text-gray-600">{{ q.red_flags }}</p>
                  </div>
                </CollapsePanel>
              </Collapse>
            </Card>
          </Col>
        </Row>
      </Spin>

      <!-- Kit Drawer -->
      <Drawer
        v-model:open="kitDrawerVisible"
        :body-style="{ paddingBottom: '80px' }"
        :title="editingKit ? 'Edit Interview Kit' : 'Create Interview Kit'"
        :width="480"
      >
        <Form layout="vertical">
          <FormItem label="Name" required>
            <Input
              v-model:value="kitForm.name"
              placeholder="e.g., Senior Engineer Technical"
            />
          </FormItem>
          <FormItem label="Interview Type">
            <Select v-model:value="kitForm.interview_type">
              <SelectOption
                v-for="t in interviewTypes"
                :key="t.value"
                :value="t.value"
              >
                {{ t.label }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Duration (minutes)">
            <InputNumber
              v-model:value="kitForm.duration_minutes"
              :max="240"
              :min="15"
              :step="15"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="Description">
            <Textarea
              v-model:value="kitForm.description"
              :rows="3"
              placeholder="Describe what this kit is for"
            />
          </FormItem>
          <FormItem>
            <Checkbox v-model:checked="kitForm.is_template">
              Save as template (can be reused for other positions)
            </Checkbox>
          </FormItem>
        </Form>

        <div class="absolute bottom-0 left-0 right-0 border-t bg-white p-4">
          <Space>
            <Button @click="kitDrawerVisible = false">Cancel</Button>
            <Button
              :loading="kitFormLoading"
              type="primary"
              @click="saveKit"
            >
              {{ editingKit ? 'Update' : 'Create' }}
            </Button>
          </Space>
        </div>
      </Drawer>

      <!-- Question Modal -->
      <Modal
        v-model:open="questionModalVisible"
        :confirm-loading="questionFormLoading"
        :width="600"
        title="Add Question"
        @ok="saveQuestion"
      >
        <Form layout="vertical">
          <FormItem label="Question" required>
            <Textarea
              v-model:value="questionForm.question"
              :rows="2"
              placeholder="Enter the interview question"
            />
          </FormItem>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Competency">
                <Select
                  v-model:value="questionForm.competency_id"
                  allow-clear
                  placeholder="Select competency"
                >
                  <SelectOption
                    v-for="c in competencies"
                    :key="c.id"
                    :value="c.id"
                  >
                    {{ c.name }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Time (minutes)">
                <InputNumber
                  v-model:value="questionForm.time_allocation_minutes"
                  :max="30"
                  :min="1"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Purpose">
            <Textarea
              v-model:value="questionForm.purpose"
              :rows="2"
              placeholder="Why ask this question?"
            />
          </FormItem>
          <FormItem label="Good Answer Hints">
            <Textarea
              v-model:value="questionForm.good_answer_hints"
              :rows="2"
              placeholder="What to look for in a good answer"
            />
          </FormItem>
          <FormItem label="Red Flags">
            <Textarea
              v-model:value="questionForm.red_flags"
              :rows="2"
              placeholder="Warning signs in responses"
            />
          </FormItem>
        </Form>
      </Modal>

      <!-- Competency Modal -->
      <Modal
        v-model:open="competencyModalVisible"
        :confirm-loading="competencyFormLoading"
        :title="editingCompetency ? 'Edit Competency' : 'Add Competency'"
        @ok="saveCompetency"
      >
        <Form layout="vertical">
          <FormItem label="Name" required>
            <Input
              v-model:value="competencyForm.name"
              placeholder="e.g., Problem Solving"
            />
          </FormItem>
          <FormItem label="Category">
            <Select v-model:value="competencyForm.category">
              <SelectOption
                v-for="c in competencyCategories"
                :key="c.value"
                :value="c.value"
              >
                {{ c.label }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Description">
            <Textarea
              v-model:value="competencyForm.description"
              :rows="3"
              placeholder="Describe this competency"
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  </Page>
</template>
