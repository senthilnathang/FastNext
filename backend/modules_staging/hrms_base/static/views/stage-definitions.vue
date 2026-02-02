<script setup>
import { onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Spin,
  Table,
  Tag,
  Textarea,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  OrderedListOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getStageDefinitionsApi,
  createStageDefinitionApi,
  updateStageDefinitionApi,
  deleteStageDefinitionApi,
  COLOR_OPTIONS,
} from '#/api/hrms_base';

defineOptions({
  name: 'HRMSStageDefinitions',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const stages = ref([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const filters = ref({
  model_name: '',
  is_active: null,
});

// Create/Edit modal
const formModalVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const stageForm = ref({
  name: '',
  code: '',
  description: '',
  model_name: '',
  color: '#1890ff',
  sequence: 10,
  is_initial: false,
  is_final: false,
  is_active: true,
});

const columns = [
  { title: 'Stage Name', dataIndex: 'name', key: 'name', width: 180 },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 100 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 150 },
  { title: 'Color', key: 'color', width: 80, align: 'center' },
  { title: 'Type', key: 'stage_type', width: 100 },
  { title: 'Sequence', dataIndex: 'sequence', key: 'sequence', width: 90, align: 'center' },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
];

const MODEL_OPTIONS = [
  { value: 'recruitment.candidate', label: 'Recruitment' },
  { value: 'onboarding.employee', label: 'Onboarding' },
  { value: 'offboarding.employee', label: 'Offboarding' },
  { value: 'leave.request', label: 'Leave Request' },
  { value: 'task.item', label: 'Task' },
  { value: 'project.milestone', label: 'Project Milestone' },
];

async function fetchStages() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (filters.value.model_name) params.model_name = filters.value.model_name;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getStageDefinitionsApi(params);
    stages.value = res.items || res || [];
    pagination.value.total = res.total || stages.value.length;
  } catch (err) {
    console.error('Failed to fetch stages:', err);
    showError('Failed to load stage definitions');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchStages();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchStages();
}, { deep: true });

function resetForm() {
  stageForm.value = {
    name: '',
    code: '',
    description: '',
    model_name: '',
    color: '#1890ff',
    sequence: 10,
    is_initial: false,
    is_final: false,
    is_active: true,
  };
}

function openCreateModal() {
  isEditing.value = false;
  editingId.value = null;
  resetForm();
  formModalVisible.value = true;
}

function openEditModal(record) {
  isEditing.value = true;
  editingId.value = record.id;
  stageForm.value = {
    name: record.name,
    code: record.code || '',
    description: record.description || '',
    model_name: record.model_name || '',
    color: record.color || '#1890ff',
    sequence: record.sequence || 10,
    is_initial: record.is_initial ?? false,
    is_final: record.is_final ?? false,
    is_active: record.is_active !== false,
  };
  formModalVisible.value = true;
}

function generateCode(name) {
  if (!isEditing.value && name && !stageForm.value.code) {
    stageForm.value.code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').substring(0, 20);
  }
}

async function handleSave() {
  if (!stageForm.value.name.trim()) {
    showError('Stage name is required');
    return;
  }

  actionLoading.value = true;
  try {
    const data = { ...stageForm.value };
    if (!data.code) data.code = null;
    if (!data.description) data.description = null;
    if (!data.model_name) data.model_name = null;

    if (isEditing.value) {
      await updateStageDefinitionApi(editingId.value, data);
      showSuccess('Stage updated successfully');
    } else {
      await createStageDefinitionApi(data);
      showSuccess('Stage created successfully');
    }
    formModalVisible.value = false;
    fetchStages();
  } catch (err) {
    console.error('Failed to save stage:', err);
    showError(err.response?.data?.detail || 'Failed to save stage');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteStageDefinitionApi(record.id);
    showSuccess('Stage deleted successfully');
    fetchStages();
  } catch (err) {
    console.error('Failed to delete stage:', err);
    showError(err.response?.data?.detail || 'Failed to delete stage');
  } finally {
    actionLoading.value = false;
  }
}

function getModelLabel(modelName) {
  const model = MODEL_OPTIONS.find(m => m.value === modelName);
  return model ? model.label : modelName;
}

onMounted(() => {
  fetchStages();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <OrderedListOutlined />
            <span>Stage Definitions</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateModal">
              <PlusOutlined /> New Stage
            </Button>
            <Button @click="fetchStages">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <Select
              v-model:value="filters.model_name"
              placeholder="Filter by model"
              allow-clear
              style="width: 180px"
            >
              <SelectOption v-for="m in MODEL_OPTIONS" :key="m.value" :value="m.value">
                {{ m.label }}
              </SelectOption>
            </Select>
            <Select
              v-model:value="filters.is_active"
              placeholder="Status"
              allow-clear
              style="width: 120px"
            >
              <SelectOption :value="true">Active</SelectOption>
              <SelectOption :value="false">Inactive</SelectOption>
            </Select>
          </Space>
        </div>

        <Table
          :columns="columns"
          :data-source="stages"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} stages`,
          }"
          :scroll="{ x: 900 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'model_name'">
              <Tag v-if="record.model_name" color="blue">
                {{ getModelLabel(record.model_name) }}
              </Tag>
              <span v-else class="text-gray">-</span>
            </template>
            <template v-if="column.key === 'color'">
              <div
                v-if="record.color"
                class="color-dot"
                :style="{ backgroundColor: record.color }"
              />
              <span v-else>-</span>
            </template>
            <template v-if="column.key === 'stage_type'">
              <Tag v-if="record.is_initial" color="green">Initial</Tag>
              <Tag v-else-if="record.is_final" color="red">Final</Tag>
              <Tag v-else color="default">Normal</Tag>
            </template>
            <template v-if="column.key === 'is_active'">
              <CheckCircleOutlined v-if="record.is_active" style="color: #52c41a" />
              <CloseCircleOutlined v-else style="color: #ff4d4f" />
            </template>
            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="Edit">
                  <Button size="small" @click="openEditModal(record)">
                    <EditOutlined />
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Delete this stage?"
                  @confirm="handleDelete(record)"
                  ok-text="Delete"
                  cancel-text="Cancel"
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
    </Spin>

    <!-- Create/Edit Modal -->
    <Modal
      v-model:open="formModalVisible"
      :title="isEditing ? 'Edit Stage Definition' : 'Create Stage Definition'"
      @ok="handleSave"
      :confirm-loading="actionLoading"
      width="600px"
    >
      <Form layout="vertical">
        <div class="form-row">
          <FormItem label="Stage Name" required style="flex: 2">
            <Input
              v-model:value="stageForm.name"
              placeholder="e.g., In Progress"
              @blur="generateCode(stageForm.name)"
            />
          </FormItem>

          <FormItem label="Code" style="flex: 1">
            <Input
              v-model:value="stageForm.code"
              placeholder="e.g., IN_PROGRESS"
            />
          </FormItem>
        </div>

        <FormItem label="Model">
          <Select
            v-model:value="stageForm.model_name"
            placeholder="Select model"
            allow-clear
            style="width: 100%"
          >
            <SelectOption v-for="m in MODEL_OPTIONS" :key="m.value" :value="m.value">
              {{ m.label }}
            </SelectOption>
          </Select>
        </FormItem>

        <FormItem label="Description">
          <Textarea
            v-model:value="stageForm.description"
            :rows="2"
            placeholder="Stage description..."
          />
        </FormItem>

        <div class="form-row">
          <FormItem label="Color" style="flex: 1">
            <Select v-model:value="stageForm.color" style="width: 100%">
              <SelectOption v-for="color in COLOR_OPTIONS" :key="color" :value="color">
                <Space>
                  <div class="color-dot" :style="{ backgroundColor: color }" />
                  <span>{{ color }}</span>
                </Space>
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Sequence" style="flex: 1">
            <InputNumber
              v-model:value="stageForm.sequence"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
        </div>

        <div class="form-row">
          <FormItem label="Stage Type" style="flex: 1">
            <Select
              :value="stageForm.is_initial ? 'initial' : stageForm.is_final ? 'final' : 'normal'"
              @change="val => {
                stageForm.is_initial = val === 'initial';
                stageForm.is_final = val === 'final';
              }"
              style="width: 100%"
            >
              <SelectOption value="normal">Normal</SelectOption>
              <SelectOption value="initial">Initial Stage</SelectOption>
              <SelectOption value="final">Final Stage</SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Status" style="flex: 1">
            <Select v-model:value="stageForm.is_active" style="width: 100%">
              <SelectOption :value="true">Active</SelectOption>
              <SelectOption :value="false">Inactive</SelectOption>
            </Select>
          </FormItem>
        </div>
      </Form>
    </Modal>
  </Page>
</template>

<style scoped>
.filters-row {
  margin-bottom: 16px;
}

.form-row {
  display: flex;
  gap: 16px;
}

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
}

.text-gray {
  color: #999;
}
</style>
