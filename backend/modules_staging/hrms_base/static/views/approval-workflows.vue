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
  NodeIndexOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getApprovalWorkflowsApi,
  createApprovalWorkflowApi,
  updateApprovalWorkflowApi,
  deleteApprovalWorkflowApi,
  APPROVAL_TYPES,
} from '#/api/hrms_base';

defineOptions({
  name: 'HRMSApprovalWorkflows',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const workflows = ref([]);
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
const workflowForm = ref({
  name: '',
  code: '',
  description: '',
  model_name: '',
  approval_type: 'sequential',
  sequence: 10,
  is_active: true,
});

const columns = [
  { title: 'Workflow Name', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 150 },
  { title: 'Type', key: 'type', width: 120 },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
];

const MODEL_OPTIONS = [
  { value: 'leave.request', label: 'Leave Request' },
  { value: 'attendance.overtime', label: 'Overtime Request' },
  { value: 'expense.request', label: 'Expense Request' },
  { value: 'onboarding.request', label: 'Onboarding Request' },
  { value: 'offboarding.request', label: 'Offboarding Request' },
  { value: 'asset.request', label: 'Asset Request' },
];

async function fetchWorkflows() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (filters.value.model_name) params.model_name = filters.value.model_name;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getApprovalWorkflowsApi(params);
    workflows.value = res.items || res || [];
    pagination.value.total = res.total || workflows.value.length;
  } catch (err) {
    console.error('Failed to fetch workflows:', err);
    showError('Failed to load approval workflows');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchWorkflows();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchWorkflows();
}, { deep: true });

function resetForm() {
  workflowForm.value = {
    name: '',
    code: '',
    description: '',
    model_name: '',
    approval_type: 'sequential',
    sequence: 10,
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
  workflowForm.value = {
    name: record.name,
    code: record.code || '',
    description: record.description || '',
    model_name: record.model_name || '',
    approval_type: record.approval_type || 'sequential',
    sequence: record.sequence || 10,
    is_active: record.is_active !== false,
  };
  formModalVisible.value = true;
}

function generateCode(name) {
  if (!isEditing.value && name && !workflowForm.value.code) {
    workflowForm.value.code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').substring(0, 30);
  }
}

async function handleSave() {
  if (!workflowForm.value.name.trim()) {
    showError('Workflow name is required');
    return;
  }

  actionLoading.value = true;
  try {
    const data = { ...workflowForm.value };
    if (!data.code) data.code = null;
    if (!data.description) data.description = null;
    if (!data.model_name) data.model_name = null;

    if (isEditing.value) {
      await updateApprovalWorkflowApi(editingId.value, data);
      showSuccess('Workflow updated successfully');
    } else {
      await createApprovalWorkflowApi(data);
      showSuccess('Workflow created successfully');
    }
    formModalVisible.value = false;
    fetchWorkflows();
  } catch (err) {
    console.error('Failed to save workflow:', err);
    showError(err.response?.data?.detail || 'Failed to save workflow');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteApprovalWorkflowApi(record.id);
    showSuccess('Workflow deleted successfully');
    fetchWorkflows();
  } catch (err) {
    console.error('Failed to delete workflow:', err);
    showError(err.response?.data?.detail || 'Failed to delete workflow');
  } finally {
    actionLoading.value = false;
  }
}

function getTypeConfig(type) {
  return APPROVAL_TYPES.find(t => t.value === type) || { label: type };
}

function getModelLabel(modelName) {
  const model = MODEL_OPTIONS.find(m => m.value === modelName);
  return model ? model.label : modelName;
}

onMounted(() => {
  fetchWorkflows();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <NodeIndexOutlined />
            <span>Approval Workflows</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateModal">
              <PlusOutlined /> New Workflow
            </Button>
            <Button @click="fetchWorkflows">
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
          :data-source="workflows"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} workflows`,
          }"
          :scroll="{ x: 800 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'model_name'">
              <Tag v-if="record.model_name" color="blue">
                {{ getModelLabel(record.model_name) }}
              </Tag>
              <span v-else class="text-gray">All Models</span>
            </template>
            <template v-if="column.key === 'type'">
              <Tag color="purple">{{ getTypeConfig(record.approval_type).label }}</Tag>
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
                  title="Delete this workflow?"
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
      :title="isEditing ? 'Edit Approval Workflow' : 'Create Approval Workflow'"
      @ok="handleSave"
      :confirm-loading="actionLoading"
      width="600px"
    >
      <Form layout="vertical">
        <FormItem label="Workflow Name" required>
          <Input
            v-model:value="workflowForm.name"
            placeholder="e.g., Leave Approval"
            @blur="generateCode(workflowForm.name)"
          />
        </FormItem>

        <FormItem label="Code">
          <Input
            v-model:value="workflowForm.code"
            placeholder="e.g., LEAVE_APPROVAL"
          />
        </FormItem>

        <FormItem label="Description">
          <Textarea
            v-model:value="workflowForm.description"
            :rows="3"
            placeholder="Workflow description..."
          />
        </FormItem>

        <div class="form-row">
          <FormItem label="Model" style="flex: 1">
            <Select
              v-model:value="workflowForm.model_name"
              placeholder="Select model"
              allow-clear
              style="width: 100%"
            >
              <SelectOption v-for="m in MODEL_OPTIONS" :key="m.value" :value="m.value">
                {{ m.label }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Approval Type" style="flex: 1">
            <Select v-model:value="workflowForm.approval_type" style="width: 100%">
              <SelectOption v-for="t in APPROVAL_TYPES" :key="t.value" :value="t.value">
                {{ t.label }}
              </SelectOption>
            </Select>
          </FormItem>
        </div>

        <div class="form-row">
          <FormItem label="Sequence" style="flex: 1">
            <InputNumber
              v-model:value="workflowForm.sequence"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="Status" style="flex: 1">
            <Select v-model:value="workflowForm.is_active" style="width: 100%">
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

.text-gray {
  color: #999;
}
</style>
