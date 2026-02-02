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
  UserSwitchOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getJobRolesApi,
  createJobRoleApi,
  updateJobRoleApi,
  deleteJobRoleApi,
  COLOR_OPTIONS,
} from '#/api/hrms_base';

defineOptions({
  name: 'HRMSJobRoles',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const roles = ref([]);
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
const roleForm = ref({
  name: '',
  code: '',
  description: '',
  color: '#1890ff',
  sequence: 10,
  is_active: true,
});

const columns = [
  { title: 'Role Name', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Color', key: 'color', width: 80, align: 'center' },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
];

async function fetchRoles() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getJobRolesApi(params);
    roles.value = res.items || [];
    pagination.value.total = res.total || 0;
  } catch (err) {
    console.error('Failed to fetch roles:', err);
    showError('Failed to load job roles');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchRoles();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchRoles();
}, { deep: true });

function resetForm() {
  roleForm.value = {
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
  roleForm.value = {
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
  if (!isEditing.value && name && !roleForm.value.code) {
    roleForm.value.code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').substring(0, 20);
  }
}

async function handleSave() {
  if (!roleForm.value.name.trim()) {
    showError('Role name is required');
    return;
  }

  actionLoading.value = true;
  try {
    const data = { ...roleForm.value };
    if (!data.code) data.code = null;
    if (!data.description) data.description = null;

    if (isEditing.value) {
      await updateJobRoleApi(editingId.value, data);
      showSuccess('Job role updated successfully');
    } else {
      await createJobRoleApi(data);
      showSuccess('Job role created successfully');
    }
    formModalVisible.value = false;
    fetchRoles();
  } catch (err) {
    console.error('Failed to save role:', err);
    showError(err.response?.data?.detail || 'Failed to save job role');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteJobRoleApi(record.id);
    showSuccess('Job role deleted successfully');
    fetchRoles();
  } catch (err) {
    console.error('Failed to delete role:', err);
    showError(err.response?.data?.detail || 'Failed to delete job role');
  } finally {
    actionLoading.value = false;
  }
}

onMounted(() => {
  fetchRoles();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <UserSwitchOutlined />
            <span>Job Roles</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateModal">
              <PlusOutlined /> New Role
            </Button>
            <Button @click="fetchRoles">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <InputSearch
              v-model:value="filters.search"
              placeholder="Search roles..."
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
          :data-source="roles"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} roles`,
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
                  title="Delete this role?"
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
      :title="isEditing ? 'Edit Job Role' : 'Create Job Role'"
      @ok="handleSave"
      :confirm-loading="actionLoading"
      width="550px"
    >
      <Form layout="vertical">
        <FormItem label="Role Name" required>
          <Input
            v-model:value="roleForm.name"
            placeholder="e.g., Team Lead"
            @blur="generateCode(roleForm.name)"
          />
        </FormItem>

        <FormItem label="Code">
          <Input
            v-model:value="roleForm.code"
            placeholder="e.g., TEAM_LEAD"
          />
        </FormItem>

        <FormItem label="Description">
          <Textarea
            v-model:value="roleForm.description"
            :rows="3"
            placeholder="Role description..."
          />
        </FormItem>

        <div class="form-row">
          <FormItem label="Color" style="flex: 1">
            <Select v-model:value="roleForm.color" style="width: 100%">
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
              v-model:value="roleForm.sequence"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
        </div>

        <FormItem label="Status">
          <Select v-model:value="roleForm.is_active" style="width: 100%">
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
