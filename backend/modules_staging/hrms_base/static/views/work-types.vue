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
  HomeOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getWorkTypesApi,
  createWorkTypeApi,
  updateWorkTypeApi,
  deleteWorkTypeApi,
  WORK_LOCATION_TYPES,
  COLOR_OPTIONS,
} from '#/api/hrms_base';

defineOptions({
  name: 'HRMSWorkTypes',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const workTypes = ref([]);
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
const workTypeForm = ref({
  name: '',
  code: '',
  description: '',
  location_type: 'office',
  color: '#1890ff',
  sequence: 10,
  is_active: true,
});

const columns = [
  { title: 'Work Type', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
  { title: 'Location', key: 'location', width: 120 },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
];

async function fetchWorkTypes() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getWorkTypesApi(params);
    workTypes.value = res.items || [];
    pagination.value.total = res.total || 0;
  } catch (err) {
    console.error('Failed to fetch work types:', err);
    showError('Failed to load work types');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchWorkTypes();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchWorkTypes();
}, { deep: true });

function resetForm() {
  workTypeForm.value = {
    name: '',
    code: '',
    description: '',
    location_type: 'office',
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
  workTypeForm.value = {
    name: record.name,
    code: record.code || '',
    description: record.description || '',
    location_type: record.location_type || 'office',
    color: record.color || '#1890ff',
    sequence: record.sequence || 10,
    is_active: record.is_active !== false,
  };
  formModalVisible.value = true;
}

function generateCode(name) {
  if (!isEditing.value && name && !workTypeForm.value.code) {
    workTypeForm.value.code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').substring(0, 20);
  }
}

async function handleSave() {
  if (!workTypeForm.value.name.trim()) {
    showError('Work type name is required');
    return;
  }

  actionLoading.value = true;
  try {
    const data = { ...workTypeForm.value };
    if (!data.code) data.code = null;
    if (!data.description) data.description = null;

    if (isEditing.value) {
      await updateWorkTypeApi(editingId.value, data);
      showSuccess('Work type updated successfully');
    } else {
      await createWorkTypeApi(data);
      showSuccess('Work type created successfully');
    }
    formModalVisible.value = false;
    fetchWorkTypes();
  } catch (err) {
    console.error('Failed to save work type:', err);
    showError(err.response?.data?.detail || 'Failed to save work type');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteWorkTypeApi(record.id);
    showSuccess('Work type deleted successfully');
    fetchWorkTypes();
  } catch (err) {
    console.error('Failed to delete work type:', err);
    showError(err.response?.data?.detail || 'Failed to delete work type');
  } finally {
    actionLoading.value = false;
  }
}

function getLocationConfig(type) {
  return WORK_LOCATION_TYPES.find(t => t.value === type) || { label: type, color: 'default' };
}

onMounted(() => {
  fetchWorkTypes();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <HomeOutlined />
            <span>Work Types</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateModal">
              <PlusOutlined /> New Work Type
            </Button>
            <Button @click="fetchWorkTypes">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <InputSearch
              v-model:value="filters.search"
              placeholder="Search work types..."
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
          :data-source="workTypes"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} work types`,
          }"
          :scroll="{ x: 700 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'location'">
              <Tag :color="getLocationConfig(record.location_type).color">
                {{ getLocationConfig(record.location_type).label }}
              </Tag>
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
                  title="Delete this work type?"
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
      :title="isEditing ? 'Edit Work Type' : 'Create Work Type'"
      @ok="handleSave"
      :confirm-loading="actionLoading"
      width="550px"
    >
      <Form layout="vertical">
        <FormItem label="Work Type Name" required>
          <Input
            v-model:value="workTypeForm.name"
            placeholder="e.g., Work From Home"
            @blur="generateCode(workTypeForm.name)"
          />
        </FormItem>

        <FormItem label="Code">
          <Input
            v-model:value="workTypeForm.code"
            placeholder="e.g., WFH"
          />
        </FormItem>

        <FormItem label="Location Type">
          <Select v-model:value="workTypeForm.location_type" style="width: 100%">
            <SelectOption v-for="loc in WORK_LOCATION_TYPES" :key="loc.value" :value="loc.value">
              <Tag :color="loc.color">{{ loc.label }}</Tag>
            </SelectOption>
          </Select>
        </FormItem>

        <FormItem label="Description">
          <Textarea
            v-model:value="workTypeForm.description"
            :rows="3"
            placeholder="Work type description..."
          />
        </FormItem>

        <div class="form-row">
          <FormItem label="Color" style="flex: 1">
            <Select v-model:value="workTypeForm.color" style="width: 100%">
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
              v-model:value="workTypeForm.sequence"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
        </div>

        <FormItem label="Status">
          <Select v-model:value="workTypeForm.is_active" style="width: 100%">
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
