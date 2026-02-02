<script setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Checkbox,
  Collapse,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Table,
  Tag,
  Textarea,
  message,
  CollapsePanel,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  MinusCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import {
  createQuestionApi,
  createQuestionGroupApi,
  createQuizApi,
  deleteQuestionApi,
  deleteQuestionGroupApi,
  deleteQuizApi,
  getQuizApi,
  getQuizzesApi,
  updateQuestionApi,
  updateQuestionGroupApi,
  updateQuizApi,
} from '#/api/quiz';

defineOptions({
  name: 'RECRUITMENTQuestionnairesList',
});

const loading = ref(false);
const quizzes = ref([]);
const selectedQuiz = ref(null);
const groups = ref([]);
const groupQuestions = ref({});
const activeCollapseKey = ref(null);
const showQuizModal = ref(false);
const showGroupModal = ref(false);
const showQuestionModal = ref(false);
const editingQuiz = ref(null);
const editingGroup = ref(null);
const editingQuestion = ref(null);
const activeGroupId = ref(null);

const quizForm = ref({
  title: '',
  description: '',
});

const groupForm = ref({
  title: '',
  description: '',
  sequence: 1,
});

const questionForm = ref({
  question: '',
  type: 'text',
  is_mandatory: false,
  sequence: 1,
  options: [],
});

const questionTypes = [
  { value: 'text', label: 'Text Input' },
  { value: 'textarea', label: 'Text Area' },
  { value: 'options', label: 'Multiple Choice' },
  { value: 'date', label: 'Date' },
  { value: 'attachment', label: 'File Attachment' },
];

const quizColumns = [
  { title: 'Title', dataIndex: 'title', key: 'title' },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: 'Questions',
    key: 'question_count',
    width: 100,
    align: 'center',
  },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 150, fixed: 'right' },
];

const questionColumns = [
  { title: '#', dataIndex: 'sequence', key: 'sequence', width: 60 },
  { title: 'Question', dataIndex: 'question', key: 'question' },
  { title: 'Type', key: 'type', width: 130 },
  { title: 'Required', key: 'required', width: 100, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
];

const showOptions = computed(() => questionForm.value.type === 'options');

async function fetchQuizzes() {
  loading.value = true;
  try {
    const response = await getQuizzesApi();
    quizzes.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch quizzes:', error);
    message.error('Failed to load questionnaire templates');
  } finally {
    loading.value = false;
  }
}

async function fetchGroups(quizId) {
  try {
    const detail = await getQuizApi(quizId);
    groups.value = (detail.groups || []).sort(
      (a, b) => a.sequence - b.sequence,
    );
    groupQuestions.value = {};
    // Map questions to their groups
    const allQuestions = detail.questions || [];
    for (const group of groups.value) {
      groupQuestions.value[group.id] = allQuestions
        .filter((q) => q.group_id === group.id)
        .sort((a, b) => a.sequence - b.sequence);
    }
  } catch (error) {
    console.error('Failed to fetch groups:', error);
    groups.value = [];
  }
}

function selectQuiz(quiz) {
  selectedQuiz.value = quiz;
  fetchGroups(quiz.id);
}

function openQuizModal(quiz) {
  if (quiz) {
    editingQuiz.value = quiz;
    quizForm.value = {
      title: quiz.title,
      description: quiz.description || '',
    };
  } else {
    editingQuiz.value = null;
    quizForm.value = {
      title: '',
      description: '',
    };
  }
  showQuizModal.value = true;
}

async function handleSaveQuiz() {
  if (!quizForm.value.title) {
    message.error('Please enter a title');
    return;
  }

  try {
    if (editingQuiz.value) {
      await updateQuizApi(
        editingQuiz.value.id,
        quizForm.value,
      );
      message.success('Quiz updated');
    } else {
      await createQuizApi(quizForm.value);
      message.success('Quiz created');
    }
    showQuizModal.value = false;
    fetchQuizzes();
  } catch (error) {
    console.error('Failed to save quiz:', error);
    message.error('Failed to save quiz');
  }
}

async function handleDeleteQuiz(id) {
  try {
    await deleteQuizApi(id);
    message.success('Quiz deleted');
    if (selectedQuiz.value?.id === id) {
      selectedQuiz.value = null;
      groups.value = [];
      groupQuestions.value = {};
    }
    fetchQuizzes();
  } catch (error) {
    console.error('Failed to delete quiz:', error);
    message.error('Failed to delete quiz');
  }
}

function openGroupModal(group) {
  if (group) {
    editingGroup.value = group;
    groupForm.value = {
      title: group.title,
      description: group.description || '',
      sequence: group.sequence,
    };
  } else {
    editingGroup.value = null;
    const maxSequence = groups.value.reduce(
      (max, s) => Math.max(max, s.sequence),
      0,
    );
    groupForm.value = {
      title: '',
      description: '',
      sequence: maxSequence + 1,
    };
  }
  showGroupModal.value = true;
}

async function handleSaveGroup() {
  if (!groupForm.value.title) {
    message.error('Please enter a group title');
    return;
  }
  if (!selectedQuiz.value) {
    message.error('No quiz selected');
    return;
  }

  try {
    if (editingGroup.value) {
      await updateQuestionGroupApi(editingGroup.value.id, groupForm.value);
      message.success('Question group updated');
    } else {
      await createQuestionGroupApi(selectedQuiz.value.id, groupForm.value);
      message.success('Question group created');
    }
    showGroupModal.value = false;
    fetchGroups(selectedQuiz.value.id);
    fetchQuizzes();
  } catch (error) {
    console.error('Failed to save group:', error);
    message.error('Failed to save question group');
  }
}

async function handleDeleteGroup(id) {
  try {
    await deleteQuestionGroupApi(id);
    message.success('Question group deleted');
    if (selectedQuiz.value) {
      fetchGroups(selectedQuiz.value.id);
      fetchQuizzes();
    }
  } catch (error) {
    console.error('Failed to delete group:', error);
    message.error('Failed to delete question group');
  }
}

function openQuestionModal(groupId, question) {
  activeGroupId.value = groupId;
  if (question) {
    editingQuestion.value = question;
    questionForm.value = {
      question: question.question,
      type: question.type,
      is_mandatory: question.is_mandatory,
      sequence: question.sequence,
      options: question.options || [],
    };
  } else {
    editingQuestion.value = null;
    const questions = groupQuestions.value[groupId] || [];
    const maxSequence = questions.reduce(
      (max, q) => Math.max(max, q.sequence),
      0,
    );
    questionForm.value = {
      question: '',
      type: 'text',
      is_mandatory: false,
      sequence: maxSequence + 1,
      options: [],
    };
  }
  showQuestionModal.value = true;
}

async function handleSaveQuestion() {
  if (!questionForm.value.question) {
    message.error('Please enter a question');
    return;
  }
  if (activeGroupId.value === null) {
    message.error('No question group selected');
    return;
  }
  if (questionForm.value.type === 'options' && questionForm.value.options.length < 2) {
    message.error('Please add at least 2 options');
    return;
  }

  try {
    const data = {
      ...questionForm.value,
      group_id: activeGroupId.value,
    };

    if (editingQuestion.value) {
      await updateQuestionApi(editingQuestion.value.id, data);
      message.success('Question updated');
    } else {
      await createQuestionApi(selectedQuiz.value.id, data);
      message.success('Question added');
    }
    showQuestionModal.value = false;
    await fetchGroups(selectedQuiz.value.id);
    fetchQuizzes();
  } catch (error) {
    console.error('Failed to save question:', error);
    message.error('Failed to save question');
  }
}

async function handleDeleteQuestion(groupId, questionId) {
  try {
    await deleteQuestionApi(questionId);
    message.success('Question deleted');
    await fetchGroups(selectedQuiz.value.id);
    fetchQuizzes();
  } catch (error) {
    console.error('Failed to delete question:', error);
    message.error('Failed to delete question');
  }
}

function addOption() {
  questionForm.value.options.push('');
}

function removeOption(index) {
  questionForm.value.options.splice(index, 1);
}

function getTypeLabel(type) {
  return questionTypes.find((t) => t.value === type)?.label || type;
}

function getTypeColor(type) {
  const colors = {
    text: 'blue',
    textarea: 'cyan',
    options: 'purple',
    date: 'orange',
    attachment: 'green',
  };
  return colors[type] || 'default';
}

function getTotalQuestionCount(quizGroups) {
  return quizGroups.reduce((total, group) => {
    return total + (groupQuestions.value[group.id]?.length || 0);
  }, 0);
}

onMounted(() => {
  fetchQuizzes();
});
</script>

<template>
  <Page auto-content-height>
    <div class="flex h-full gap-4 p-4">
      <!-- Quizzes List -->
      <div class="w-2/5">
        <Card title="Questionnaire Templates" class="h-full">
          <template #extra>
            <Space>
              <Button @click="fetchQuizzes">
                <template #icon>
                  <ReloadOutlined />
                </template>
              </Button>
              <Button type="primary" @click="openQuizModal()">
                <template #icon>
                  <PlusOutlined />
                </template>
                New Template
              </Button>
            </Space>
          </template>

          <Table
            :columns="quizColumns"
            :data-source="quizzes"
            :loading="loading"
            :row-class-name="
              (record) =>
                record.id === selectedQuiz?.id ? 'bg-blue-50' : ''
            "
            row-key="id"
            size="small"
            :pagination="false"
            :custom-row="
              (record) => ({
                onClick: () => selectQuiz(record),
                style: 'cursor: pointer',
              })
            "
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'question_count'">
                <Tag color="blue">{{ record.question_count || 0 }}</Tag>
              </template>

              <template v-if="column.key === 'status'">
                <Tag :color="record.is_active ? 'green' : 'default'">
                  {{ record.is_active ? 'Active' : 'Inactive' }}
                </Tag>
              </template>

              <template v-if="column.key === 'actions'">
                <Space @click.stop>
                  <Button
                    type="link"
                    size="small"
                    @click="openQuizModal(record)"
                  >
                    <template #icon>
                      <EditOutlined />
                    </template>
                  </Button>
                  <Popconfirm
                    title="Delete this quiz?"
                    ok-text="Yes"
                    cancel-text="No"
                    @confirm="handleDeleteQuiz(record.id)"
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
              <div class="py-8 text-center text-gray-500">
                <FileTextOutlined class="mb-4 text-4xl text-gray-300" />
                <p>No questionnaire templates found</p>
              </div>
            </template>
          </Table>
        </Card>
      </div>

      <!-- Question Groups & Questions -->
      <div class="w-3/5">
        <Card class="h-full overflow-auto">
          <template #title>
            <div class="flex items-center gap-2">
              <span>{{ selectedQuiz?.title || 'Select a Template' }}</span>
              <Tag v-if="selectedQuiz && groups.length > 0" color="blue">
                {{ groups.length }} sections,
                {{ getTotalQuestionCount(groups) }} questions
              </Tag>
            </div>
          </template>
          <template #extra>
            <Button
              v-if="selectedQuiz"
              type="primary"
              size="small"
              @click="openGroupModal()"
            >
              <template #icon>
                <PlusOutlined />
              </template>
              Add Section
            </Button>
          </template>

          <div
            v-if="!selectedQuiz"
            class="flex h-64 items-center justify-center text-gray-400"
          >
            <div class="text-center">
              <FileTextOutlined class="mb-4 text-5xl" />
              <p>Select a template to view sections and questions</p>
            </div>
          </div>

          <div v-else-if="groups.length === 0" class="py-8 text-center text-gray-500">
            <FileTextOutlined class="mb-4 text-4xl text-gray-300" />
            <p>No sections yet. Add a section to get started.</p>
          </div>

          <Collapse v-else :activeKey="activeCollapseKey" accordion class="sections-collapse" @change="(k) => activeCollapseKey = k">
            <CollapsePanel
              v-for="group in groups"
              :key="group.id"
              :header="`${group.sequence}. ${group.title}`"
            >
              <template #extra>
                <Space @click.stop>
                  <Tag color="blue">
                    {{ (groupQuestions[group.id] || []).length }} questions
                  </Tag>
                  <Button
                    type="link"
                    size="small"
                    @click.stop="openQuestionModal(group.id)"
                  >
                    <template #icon>
                      <PlusOutlined />
                    </template>
                  </Button>
                  <Button
                    type="link"
                    size="small"
                    @click.stop="openGroupModal(group)"
                  >
                    <template #icon>
                      <EditOutlined />
                    </template>
                  </Button>
                  <Popconfirm
                    title="Delete this section and all its questions?"
                    ok-text="Yes"
                    cancel-text="No"
                    @confirm="handleDeleteGroup(group.id)"
                  >
                    <Button type="link" size="small" danger @click.stop>
                      <template #icon>
                        <DeleteOutlined />
                      </template>
                    </Button>
                  </Popconfirm>
                </Space>
              </template>

              <p v-if="group.description" class="mb-3 text-gray-500">
                {{ group.description }}
              </p>

              <Table
                :columns="questionColumns"
                :data-source="groupQuestions[group.id] || []"
                row-key="id"
                size="small"
                :pagination="false"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'type'">
                    <Tag :color="getTypeColor(record.type)">
                      {{ getTypeLabel(record.type) }}
                    </Tag>
                  </template>

                  <template v-if="column.key === 'required'">
                    <Tag :color="record.is_mandatory ? 'red' : 'default'">
                      {{ record.is_mandatory ? 'Yes' : 'No' }}
                    </Tag>
                  </template>

                  <template v-if="column.key === 'actions'">
                    <Space>
                      <Button
                        type="link"
                        size="small"
                        @click="openQuestionModal(group.id, record)"
                      >
                        <template #icon>
                          <EditOutlined />
                        </template>
                      </Button>
                      <Popconfirm
                        title="Delete this question?"
                        ok-text="Yes"
                        cancel-text="No"
                        @confirm="handleDeleteQuestion(group.id, record.id)"
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
                  <div class="py-4 text-center text-gray-500">
                    <p>No questions in this section</p>
                  </div>
                </template>
              </Table>
            </CollapsePanel>
          </Collapse>
        </Card>
      </div>
    </div>

    <!-- Quiz Modal -->
    <Modal
      v-model:open="showQuizModal"
      :title="editingQuiz ? 'Edit Template' : 'New Template'"
      width="500px"
      @ok="handleSaveQuiz"
    >
      <Form layout="vertical" class="mt-4">
        <FormItem label="Title" required>
          <Input
            v-model:value="quizForm.title"
            placeholder="Enter template title"
          />
        </FormItem>
        <FormItem label="Description">
          <Textarea
            v-model:value="quizForm.description"
            :rows="3"
            placeholder="Describe the questionnaire template..."
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- Group Modal -->
    <Modal
      v-model:open="showGroupModal"
      :title="editingGroup ? 'Edit Section' : 'Add Section'"
      width="500px"
      @ok="handleSaveGroup"
    >
      <Form layout="vertical" class="mt-4">
        <FormItem label="Title" required>
          <Input
            v-model:value="groupForm.title"
            placeholder="Enter section title"
          />
        </FormItem>
        <FormItem label="Description">
          <Textarea
            v-model:value="groupForm.description"
            :rows="2"
            placeholder="Describe this section..."
          />
        </FormItem>
        <FormItem label="Sequence" class="w-32">
          <InputNumber
            v-model:value="groupForm.sequence"
            :min="1"
            style="width: 100%"
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- Question Modal -->
    <Modal
      v-model:open="showQuestionModal"
      :title="editingQuestion ? 'Edit Question' : 'Add Question'"
      width="600px"
      @ok="handleSaveQuestion"
    >
      <Form layout="vertical" class="mt-4">
        <FormItem label="Question" required>
          <Textarea
            v-model:value="questionForm.question"
            :rows="2"
            placeholder="Enter your question..."
          />
        </FormItem>

        <div class="flex gap-4">
          <FormItem label="Type" class="flex-1">
            <Select v-model:value="questionForm.type">
              <SelectOption
                v-for="type in questionTypes"
                :key="type.value"
                :value="type.value"
              >
                {{ type.label }}
              </SelectOption>
            </Select>
          </FormItem>

          <FormItem label="Sequence" class="w-24">
            <InputNumber
              v-model:value="questionForm.sequence"
              :min="1"
              style="width: 100%"
            />
          </FormItem>
        </div>

        <FormItem>
          <Checkbox v-model:checked="questionForm.is_mandatory">
            This question is required
          </Checkbox>
        </FormItem>

        <FormItem v-if="showOptions" label="Options">
          <div class="space-y-2">
            <div
              v-for="(_, index) in questionForm.options"
              :key="index"
              class="flex items-center gap-2"
            >
              <Input
                v-model:value="questionForm.options[index]"
                :placeholder="`Option ${index + 1}`"
              />
              <Button
                type="text"
                danger
                size="small"
                @click="removeOption(index)"
              >
                <template #icon>
                  <MinusCircleOutlined />
                </template>
              </Button>
            </div>
            <Button type="dashed" block @click="addOption">
              <template #icon>
                <PlusOutlined />
              </template>
              Add Option
            </Button>
          </div>
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>
