<script setup>
import { computed, h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Divider,
  Empty,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Textarea,
  Tooltip,
  message,
} from 'ant-design-vue';
import {
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MinusCircleOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue';

import {
  createInterviewScorecardTemplateApi,
  deleteInterviewScorecardTemplateApi,
  getInterviewScorecardTemplatesApi,
  updateInterviewScorecardTemplateApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTInterviewScorecardsList',
});

// State
const loading = ref(false);
const templates = ref([]);
const modalVisible = ref(false);
const viewModalVisible = ref(false);
const modalMode = ref('create');
const selectedTemplate = ref(null);
const saving = ref(false);

// Filters
const filters = ref({
  interview_type: undefined,
});

// Form
const formRef = ref();
const formState = ref({
  name: '',
  description: '',
  interview_type: undefined,
  criteria: [{ name: '', description: '', weight: 1, max_score: 5 }],
  passing_score: 70,
  is_active: true,
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

// Computed
const totalWeight = computed(() =>
  formState.value.criteria.reduce((sum, c) => sum + (c.weight || 0), 0),
);

// Table columns
const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: 'Interview Type',
    dataIndex: 'interview_type',
    key: 'interview_type',
    width: 150,
    customRender: ({ text }) => {
      if (!text) return h(Tag, { color: 'default' }, () => 'All Types');
      const type = interviewTypes.find((t) => t.value === text);
      return h(Tag, { color: type?.color || 'default' }, () => type?.label || text);
    },
  },
  {
    title: 'Criteria',
    dataIndex: 'criteria',
    key: 'criteria',
    width: 100,
    customRender: ({ text }) =>
      `${text?.length || 0} criteria`,
  },
  {
    title: 'Passing Score',
    dataIndex: 'passing_score',
    key: 'passing_score',
    width: 120,
    customRender: ({ text }) =>
      text
        ? h(Progress, { percent: text, size: 'small', style: 'width: 100px' })
        : '-',
  },
  {
    title: 'Status',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 80,
    customRender: ({ text }) =>
      h(
        Tag,
        { color: text ? 'green' : 'default' },
        () => (text ? 'Active' : 'Inactive'),
      ),
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
    const res = await getInterviewScorecardTemplatesApi(filters.value);
    templates.value = res.items || [];
  } catch {
    message.error('Failed to load scorecard templates');
  } finally {
    loading.value = false;
  }
}

function openCreateModal() {
  modalMode.value = 'create';
  formState.value = {
    name: '',
    description: '',
    interview_type: undefined,
    criteria: [{ name: '', description: '', weight: 1, max_score: 5 }],
    passing_score: 70,
    is_active: true,
  };
  modalVisible.value = true;
}

function openEditModal(record) {
  modalMode.value = 'edit';
  selectedTemplate.value = record;
  formState.value = {
    name: record.name,
    description: record.description || '',
    interview_type: record.interview_type || undefined,
    criteria:
      record.criteria?.length > 0
        ? [...record.criteria]
        : [{ name: '', description: '', weight: 1, max_score: 5 }],
    passing_score: record.passing_score || 70,
    is_active: record.is_active,
  };
  modalVisible.value = true;
}

function duplicateTemplate(record) {
  modalMode.value = 'create';
  formState.value = {
    name: `${record.name} (Copy)`,
    description: record.description || '',
    interview_type: record.interview_type || undefined,
    criteria:
      record.criteria?.length > 0
        ? [...record.criteria]
        : [{ name: '', description: '', weight: 1, max_score: 5 }],
    passing_score: record.passing_score || 70,
    is_active: true,
  };
  modalVisible.value = true;
}

function viewTemplate(record) {
  selectedTemplate.value = record;
  viewModalVisible.value = true;
}

function addCriterion() {
  formState.value.criteria.push({
    name: '',
    description: '',
    weight: 1,
    max_score: 5,
  });
}

function removeCriterion(index) {
  formState.value.criteria.splice(index, 1);
}

async function handleSave() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  // Validate criteria
  const validCriteria = formState.value.criteria.filter((c) => c.name.trim());
  if (validCriteria.length === 0) {
    message.error('Please add at least one criterion');
    return;
  }

  saving.value = true;
  try {
    const data = {
      name: formState.value.name,
      description: formState.value.description || undefined,
      interview_type: formState.value.interview_type || undefined,
      criteria: validCriteria,
      passing_score: formState.value.passing_score || undefined,
    };

    if (modalMode.value === 'create') {
      await createInterviewScorecardTemplateApi(data);
      message.success('Template created successfully');
    } else {
      await updateInterviewScorecardTemplateApi(selectedTemplate.value.id, {
        ...data,
        is_active: formState.value.is_active,
      });
      message.success('Template updated successfully');
    }
    modalVisible.value = false;
    loadData();
  } catch (error) {
    message.error(
      error?.response?.data?.detail || 'Failed to save template',
    );
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id) {
  try {
    await deleteInterviewScorecardTemplateApi(id);
    message.success('Template deleted successfully');
    loadData();
  } catch {
    message.error('Failed to delete template');
  }
}

onMounted(loadData);
</script>

<template>
  <Page
    title="Interview Scorecard Templates"
    description="Create and manage evaluation criteria templates for interviews"
  >
    <Spin :spinning="loading">
      <Card>
        <!-- Toolbar -->
        <div class="mb-4 flex items-center justify-between">
          <Space>
            <Select
              v-model:value="filters.interview_type"
              placeholder="Filter by Type"
              style="width: 180px"
              allow-clear
              @change="loadData"
            >
              <SelectOption
                v-for="type in interviewTypes"
                :key="type.value"
                :value="type.value"
              >
                <Tag :color="type.color">{{ type.label }}</Tag>
              </SelectOption>
            </Select>
          </Space>
          <Button type="primary" @click="openCreateModal">
            <PlusOutlined /> Create Template
          </Button>
        </div>

        <!-- Table -->
        <Table
          :columns="columns"
          :data-source="templates"
          :row-key="(record) => record.id"
          :pagination="{
            pageSize: 10,
            showTotal: (total) => `Total ${total} templates`,
          }"
        >
          <template #emptyText>
            <Empty description="No scorecard templates found" />
          </template>
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="View">
                  <Button size="small" @click="viewTemplate(record)">
                    <EyeOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button size="small" @click="openEditModal(record)">
                    <EditOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="Duplicate">
                  <Button size="small" @click="duplicateTemplate(record)">
                    <CopyOutlined />
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Delete this template?"
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
        :title="
          modalMode === 'create'
            ? 'Create Scorecard Template'
            : 'Edit Template'
        "
        :confirm-loading="saving"
        width="800px"
        @ok="handleSave"
      >
        <Form ref="formRef" :model="formState" layout="vertical">
          <Row :gutter="16">
            <Col :span="16">
              <FormItem
                label="Template Name"
                name="name"
                :rules="[
                  { required: true, message: 'Please enter template name' },
                ]"
              >
                <Input
                  v-model:value="formState.name"
                  placeholder="e.g., Technical Interview Scorecard"
                />
              </FormItem>
            </Col>
            <Col :span="8">
              <FormItem label="Interview Type" name="interview_type">
                <Select
                  v-model:value="formState.interview_type"
                  placeholder="All Types"
                  allow-clear
                >
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
          </Row>
          <FormItem label="Description" name="description">
            <Textarea
              v-model:value="formState.description"
              :rows="2"
              placeholder="Brief description of when to use this template..."
            />
          </FormItem>

          <Divider>Evaluation Criteria</Divider>

          <div
            v-for="(criterion, index) in formState.criteria"
            :key="index"
            class="mb-4 rounded bg-gray-50 p-4"
          >
            <Row :gutter="16" align="middle">
              <Col :span="8">
                <FormItem
                  :name="['criteria', index, 'name']"
                  :rules="[{ required: true, message: 'Required' }]"
                  class="mb-0"
                >
                  <Input
                    v-model:value="criterion.name"
                    placeholder="Criterion name"
                  />
                </FormItem>
              </Col>
              <Col :span="8">
                <Input
                  v-model:value="criterion.description"
                  placeholder="Description (optional)"
                />
              </Col>
              <Col :span="3">
                <FormItem label="Weight" class="mb-0">
                  <InputNumber
                    v-model:value="criterion.weight"
                    :min="1"
                    :max="10"
                    style="width: 100%"
                  />
                </FormItem>
              </Col>
              <Col :span="3">
                <FormItem label="Max Score" class="mb-0">
                  <InputNumber
                    v-model:value="criterion.max_score"
                    :min="1"
                    :max="10"
                    style="width: 100%"
                  />
                </FormItem>
              </Col>
              <Col :span="2" class="text-right">
                <Button
                  v-if="formState.criteria.length > 1"
                  type="text"
                  danger
                  @click="removeCriterion(index)"
                >
                  <MinusCircleOutlined />
                </Button>
              </Col>
            </Row>
          </div>

          <Button type="dashed" block @click="addCriterion">
            <PlusOutlined /> Add Criterion
          </Button>

          <div class="mt-4 text-sm text-gray-500">
            Total Weight: {{ totalWeight }}
          </div>

          <Divider />

          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Passing Score (%)" name="passing_score">
                <InputNumber
                  v-model:value="formState.passing_score"
                  :min="0"
                  :max="100"
                  :formatter="(value) => `${value}%`"
                  :parser="(value) => Number(value?.replace('%', ''))"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
            <Col v-if="modalMode === 'edit'" :span="12">
              <FormItem label="Status" name="is_active">
                <Switch
                  v-model:checked="formState.is_active"
                  checked-children="Active"
                  un-checked-children="Inactive"
                />
              </FormItem>
            </Col>
          </Row>
        </Form>
      </Modal>

      <!-- View Modal -->
      <Modal
        v-model:open="viewModalVisible"
        title="Scorecard Template Details"
        :footer="null"
        width="600px"
      >
        <template v-if="selectedTemplate">
          <div class="space-y-4">
            <div class="flex items-start justify-between">
              <div>
                <div class="text-lg font-medium">
                  {{ selectedTemplate.name }}
                </div>
                <div class="text-gray-500">
                  {{ selectedTemplate.description || 'No description' }}
                </div>
              </div>
              <Space>
                <Tag
                  :color="selectedTemplate.is_active ? 'green' : 'default'"
                >
                  {{ selectedTemplate.is_active ? 'Active' : 'Inactive' }}
                </Tag>
                <Tag
                  v-if="selectedTemplate.interview_type"
                  :color="
                    interviewTypes.find(
                      (t) => t.value === selectedTemplate.interview_type,
                    )?.color
                  "
                >
                  {{
                    interviewTypes.find(
                      (t) => t.value === selectedTemplate.interview_type,
                    )?.label
                  }}
                </Tag>
              </Space>
            </div>

            <Divider>Evaluation Criteria</Divider>

            <div
              v-for="(criterion, index) in selectedTemplate.criteria"
              :key="index"
              class="mb-2 rounded bg-gray-50 p-3"
            >
              <Row align="middle">
                <Col :span="12">
                  <div class="font-medium">{{ criterion.name }}</div>
                  <div class="text-sm text-gray-500">
                    {{ criterion.description || '' }}
                  </div>
                </Col>
                <Col :span="6" class="text-center">
                  <div class="text-sm text-gray-500">Weight</div>
                  <div class="font-medium">{{ criterion.weight }}</div>
                </Col>
                <Col :span="6" class="text-center">
                  <div class="text-sm text-gray-500">Max Score</div>
                  <div class="font-medium">{{ criterion.max_score }}</div>
                </Col>
              </Row>
            </div>

            <div v-if="selectedTemplate.passing_score" class="mt-4">
              <div class="mb-2 text-sm text-gray-500">Passing Score</div>
              <Progress
                :percent="selectedTemplate.passing_score"
                :stroke-color="'#52c41a'"
              />
            </div>
          </div>
        </template>
      </Modal>
    </Spin>
  </Page>
</template>

<style scoped>
.mb-0 {
  margin-bottom: 0;
}

.space-y-4 > * + * {
  margin-top: 1rem;
}

.text-right {
  text-align: right;
}

.text-center {
  text-align: center;
}
</style>
