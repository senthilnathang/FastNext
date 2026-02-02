<script setup>
import { onMounted, ref, watch, computed } from 'vue';

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
  TreeSelect,
} from 'ant-design-vue';
import {
  ApartmentOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getDepartmentsApi,
  getDepartmentTreeApi,
  createDepartmentApi,
  updateDepartmentApi,
  deleteDepartmentApi,
  getUsersApi,
  COLOR_OPTIONS,
} from '#/api/hrms_base';

defineOptions({
  name: 'HRMSDepartments',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const departments = ref([]);
const departmentTree = ref([]);
const users = ref([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const filters = ref({
  search: '',
  is_active: null,
  parent_id: null,
});

// Create/Edit modal
const formModalVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const departmentForm = ref({
  name: '',
  code: '',
  description: '',
  parent_id: null,
  manager_id: null,
  color: '#1890ff',
  sequence: 10,
  is_active: true,
});

const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
  { title: 'Parent', key: 'parent', width: 150 },
  { title: 'Manager', key: 'manager', width: 150 },
  { title: 'Color', key: 'color', width: 80, align: 'center' },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 150, fixed: 'right' },
];

// Convert tree data for TreeSelect
const treeSelectData = computed(() => {
  function convertToTreeSelect(nodes, excludeId = null) {
    return nodes
      .filter(node => node.id !== excludeId)
      .map(node => ({
        value: node.id,
        title: node.name,
        children: node.children ? convertToTreeSelect(node.children, excludeId) : [],
      }));
  }
  return convertToTreeSelect(departmentTree.value, editingId.value);
});

async function fetchDepartments() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;
    if (filters.value.parent_id !== null) params.parent_id = filters.value.parent_id;

    const res = await getDepartmentsApi(params);
    departments.value = res.items || [];
    pagination.value.total = res.total || 0;
  } catch (err) {
    console.error('Failed to fetch departments:', err);
    showError('Failed to load departments');
  } finally {
    loading.value = false;
  }
}

async function fetchDepartmentTree() {
  try {
    const tree = await getDepartmentTreeApi();
    departmentTree.value = tree || [];
  } catch (err) {
    console.error('Failed to fetch department tree:', err);
  }
}

async function fetchUsers() {
  try {
    const res = await getUsersApi({ limit: 100, is_active: true });
    users.value = res.items || res || [];
  } catch (err) {
    console.error('Failed to fetch users:', err);
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchDepartments();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchDepartments();
}, { deep: true });

function resetForm() {
  departmentForm.value = {
    name: '',
    code: '',
    description: '',
    parent_id: null,
    manager_id: null,
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
  departmentForm.value = {
    name: record.name,
    code: record.code || '',
    description: record.description || '',
    parent_id: record.parent_id,
    manager_id: record.manager_id,
    color: record.color || '#1890ff',
    sequence: record.sequence || 10,
    is_active: record.is_active !== false,
  };
  formModalVisible.value = true;
}

function generateCode(name) {
  if (!isEditing.value && name && !departmentForm.value.code) {
    departmentForm.value.code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').substring(0, 20);
  }
}

async function handleSave() {
  if (!departmentForm.value.name.trim()) {
    showError('Department name is required');
    return;
  }

  actionLoading.value = true;
  try {
    const data = { ...departmentForm.value };
    if (!data.code) data.code = null;
    if (!data.description) data.description = null;

    if (isEditing.value) {
      await updateDepartmentApi(editingId.value, data);
      showSuccess('Department updated successfully');
    } else {
      await createDepartmentApi(data);
      showSuccess('Department created successfully');
    }
    formModalVisible.value = false;
    fetchDepartments();
    fetchDepartmentTree();
  } catch (err) {
    console.error('Failed to save department:', err);
    showError(err.response?.data?.detail || 'Failed to save department');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteDepartmentApi(record.id);
    showSuccess('Department deleted successfully');
    fetchDepartments();
    fetchDepartmentTree();
  } catch (err) {
    console.error('Failed to delete department:', err);
    showError(err.response?.data?.detail || 'Failed to delete department');
  } finally {
    actionLoading.value = false;
  }
}

function getParentName(parentId) {
  if (!parentId) return '-';
  const findDept = (nodes) => {
    for (const node of nodes) {
      if (node.id === parentId) return node.name;
      if (node.children) {
        const found = findDept(node.children);
        if (found) return found;
      }
    }
    return null;
  };
  return findDept(departmentTree.value) || '-';
}

onMounted(() => {
  fetchDepartments();
  fetchDepartmentTree();
  fetchUsers();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <ApartmentOutlined />
            <span>Departments</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateModal">
              <PlusOutlined /> New Department
            </Button>
            <Button @click="fetchDepartments">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <InputSearch
              v-model:value="filters.search"
              placeholder="Search departments..."
              style="width: 220px"
              allow-clear
            />
            <TreeSelect
              v-model:value="filters.parent_id"
              placeholder="Filter by parent"
              allow-clear
              style="width: 180px"
              :tree-data="treeSelectData"
              tree-default-expand-all
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
          :data-source="departments"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} departments`,
          }"
          :scroll="{ x: 900 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'parent'">
              <span>{{ getParentName(record.parent_id) }}</span>
            </template>
            <template v-if="column.key === 'manager'">
              <Space v-if="record.manager">
                <UserOutlined />
                <span>{{ record.manager.full_name || record.manager.username }}</span>
              </Space>
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
                  title="Delete this department?"
                  description="This will also affect child departments."
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
      :title="isEditing ? 'Edit Department' : 'Create Department'"
      @ok="handleSave"
      :confirm-loading="actionLoading"
      width="600px"
    >
      <Form layout="vertical">
        <FormItem label="Department Name" required>
          <Input
            v-model:value="departmentForm.name"
            placeholder="e.g., Human Resources"
            @blur="generateCode(departmentForm.name)"
          />
        </FormItem>

        <FormItem label="Code">
          <Input
            v-model:value="departmentForm.code"
            placeholder="e.g., HR (auto-generated)"
          />
          <div class="help-text">Unique identifier for the department</div>
        </FormItem>

        <FormItem label="Description">
          <Textarea
            v-model:value="departmentForm.description"
            :rows="2"
            placeholder="Department description..."
          />
        </FormItem>

        <FormItem label="Parent Department">
          <TreeSelect
            v-model:value="departmentForm.parent_id"
            placeholder="Select parent (optional)"
            allow-clear
            style="width: 100%"
            :tree-data="treeSelectData"
            tree-default-expand-all
          />
        </FormItem>

        <FormItem label="Department Manager">
          <Select
            v-model:value="departmentForm.manager_id"
            placeholder="Select manager (optional)"
            allow-clear
            show-search
            :filter-option="(input, option) =>
              option.label.toLowerCase().includes(input.toLowerCase())"
            style="width: 100%"
          >
            <SelectOption
              v-for="user in users"
              :key="user.id"
              :value="user.id"
              :label="user.full_name || user.username"
            >
              {{ user.full_name || user.username }}
              <span v-if="user.email" class="text-gray"> ({{ user.email }})</span>
            </SelectOption>
          </Select>
        </FormItem>

        <div class="form-row">
          <FormItem label="Color" style="flex: 1">
            <Select v-model:value="departmentForm.color" style="width: 100%">
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
              v-model:value="departmentForm.sequence"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
        </div>

        <FormItem label="Status">
          <Select v-model:value="departmentForm.is_active" style="width: 100%">
            <SelectOption :value="true">
              <Space><CheckCircleOutlined style="color: #52c41a" /> Active</Space>
            </SelectOption>
            <SelectOption :value="false">
              <Space><CloseCircleOutlined style="color: #ff4d4f" /> Inactive</Space>
            </SelectOption>
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

.help-text {
  color: #999;
  font-size: 12px;
  margin-top: 4px;
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
