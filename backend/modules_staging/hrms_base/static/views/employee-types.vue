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
  InputSearch,
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
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getEmployeeTypesApi,
  createEmployeeTypeApi,
  updateEmployeeTypeApi,
  deleteEmployeeTypeApi,
  COLOR_OPTIONS,
} from '#/api/hrms_base';

defineOptions({
  name: 'HRMSEmployeeTypes',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const types = ref([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const filters = ref({
  search: '',
  is_active: null,
});

// Create/Edit modal
const formModalVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const typeForm = ref({
  name: '',
  code: '',
  description: '',
  color: '#1890ff',
  sequence: 10,
  is_active: true,
});

const columns = [
  { title: 'Type Name', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Color', key: 'color', width: 80, align: 'center' },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
];

async function fetchTypes() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getEmployeeTypesApi(params);
    types.value = res.items || [];
    pagination.value.total = res.total || 0;
  } catch (err) {
    console.error('Failed to fetch types:', err);
    showError('Failed to load employee types');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchTypes();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchTypes();
}, { deep: true });

function resetForm() {
  typeForm.value = {
    name: '',
    code: '',
    description: '',
    color: '#1890ff',
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
  typeForm.value = {
    name: record.name,
    code: record.code || '',
    description: record.description || '',
    color: record.color || '#1890ff',
    sequence: record.sequence || 10,
    is_active: record.is_active !== false,
  };
  formModalVisible.value = true;
}

function generateCode(name) {
  if (!isEditing.value && name && !typeForm.value.code) {
    typeForm.value.code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').substring(0, 20);
  }
}

async function handleSave() {
  if (!typeForm.value.name.trim()) {
    showError('Type name is required');
    return;
  }

  actionLoading.value = true;
  try {
    const data = { ...typeForm.value };
    if (!data.code) data.code = null;
    if (!data.description) data.description = null;

    if (isEditing.value) {
      await updateEmployeeTypeApi(editingId.value, data);
      showSuccess('Employee type updated successfully');
    } else {
      await createEmployeeTypeApi(data);
      showSuccess('Employee type created successfully');
    }
    formModalVisible.value = false;
    fetchTypes();
  } catch (err) {
    console.error('Failed to save type:', err);
    showError(err.response?.data?.detail || 'Failed to save employee type');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteEmployeeTypeApi(record.id);
    showSuccess('Employee type deleted successfully');
    fetchTypes();
  } catch (err) {
    console.error('Failed to delete type:', err);
    showError(err.response?.data?.detail || 'Failed to delete employee type');
  } finally {
    actionLoading.value = false;
  }
}

onMounted(() => {
  fetchTypes();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <TeamOutlined />
            <span>Employee Types</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateModal">
              <PlusOutlined /> New Type
            </Button>
            <Button @click="fetchTypes">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <InputSearch
              v-model:value="filters.search"
              placeholder="Search types..."
              style="width: 220px"
              allow-clear
            />
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
          :data-source="types"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} types`,
          }"
          :scroll="{ x: 700 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'color'">
              <div
                v-if="record.color"
                class="color-dot"
                :style="{ backgroundColor: record.color }"
              />
              <span v-else>-</span>
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
                  title="Delete this type?"
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
      :title="isEditing ? 'Edit Employee Type' : 'Create Employee Type'"
      @ok="handleSave"
      :confirm-loading="actionLoading"
      width="550px"
    >
      <Form layout="vertical">
        <FormItem label="Type Name" required>
          <Input
            v-model:value="typeForm.name"
            placeholder="e.g., Full-time, Part-time, Contract"
            @blur="generateCode(typeForm.name)"
          />
        </FormItem>

        <FormItem label="Code">
          <Input
            v-model:value="typeForm.code"
            placeholder="e.g., FULL_TIME"
          />
        </FormItem>

        <FormItem label="Description">
          <Textarea
            v-model:value="typeForm.description"
            :rows="3"
            placeholder="Type description..."
          />
        </FormItem>

        <div class="form-row">
          <FormItem label="Color" style="flex: 1">
            <Select v-model:value="typeForm.color" style="width: 100%">
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
              v-model:value="typeForm.sequence"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
        </div>

        <FormItem label="Status">
          <Select v-model:value="typeForm.is_active" style="width: 100%">
            <SelectOption :value="true">Active</SelectOption>
            <SelectOption :value="false">Inactive</SelectOption>
          </Select>
        </FormItem>
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
</style>
