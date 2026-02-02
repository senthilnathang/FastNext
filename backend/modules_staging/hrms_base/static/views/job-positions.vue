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
  SolutionOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getJobPositionsApi,
  createJobPositionApi,
  updateJobPositionApi,
  deleteJobPositionApi,
  getDepartmentsApi,
  CURRENCY_OPTIONS,
} from '#/api/hrms_base';

defineOptions({
  name: 'HRMSJobPositions',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const positions = ref([]);
const departments = ref([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const filters = ref({
  search: '',
  department_id: null,
  is_active: null,
});

// Create/Edit modal
const formModalVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const positionForm = ref({
  name: '',
  code: '',
  description: '',
  department_id: null,
  requirements: '',
  qualifications: '',
  min_salary: null,
  max_salary: null,
  currency: 'USD',
  expected_employees: 1,
  sequence: 10,
  is_active: true,
});

const columns = [
  { title: 'Position', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 100 },
  { title: 'Department', key: 'department', width: 150 },
  { title: 'Salary Range', key: 'salary', width: 160 },
  { title: 'Headcount', dataIndex: 'expected_employees', key: 'headcount', width: 100, align: 'center' },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
];

async function fetchPositions() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.department_id) params.department_id = filters.value.department_id;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getJobPositionsApi(params);
    positions.value = res.items || [];
    pagination.value.total = res.total || 0;
  } catch (err) {
    console.error('Failed to fetch positions:', err);
    showError('Failed to load job positions');
  } finally {
    loading.value = false;
  }
}

async function fetchDepartments() {
  try {
    const res = await getDepartmentsApi({ limit: 100, is_active: true });
    departments.value = res.items || [];
  } catch (err) {
    console.error('Failed to fetch departments:', err);
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchPositions();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchPositions();
}, { deep: true });

function resetForm() {
  positionForm.value = {
    name: '',
    code: '',
    description: '',
    department_id: null,
    requirements: '',
    qualifications: '',
    min_salary: null,
    max_salary: null,
    currency: 'USD',
    expected_employees: 1,
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
  positionForm.value = {
    name: record.name,
    code: record.code || '',
    description: record.description || '',
    department_id: record.department_id,
    requirements: record.requirements || '',
    qualifications: record.qualifications || '',
    min_salary: record.min_salary,
    max_salary: record.max_salary,
    currency: record.currency || 'USD',
    expected_employees: record.expected_employees || 1,
    sequence: record.sequence || 10,
    is_active: record.is_active !== false,
  };
  formModalVisible.value = true;
}

function generateCode(name) {
  if (!isEditing.value && name && !positionForm.value.code) {
    positionForm.value.code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').substring(0, 20);
  }
}

async function handleSave() {
  if (!positionForm.value.name.trim()) {
    showError('Position name is required');
    return;
  }

  actionLoading.value = true;
  try {
    const data = { ...positionForm.value };
    if (!data.code) data.code = null;
    if (!data.description) data.description = null;
    if (!data.requirements) data.requirements = null;
    if (!data.qualifications) data.qualifications = null;

    if (isEditing.value) {
      await updateJobPositionApi(editingId.value, data);
      showSuccess('Job position updated successfully');
    } else {
      await createJobPositionApi(data);
      showSuccess('Job position created successfully');
    }
    formModalVisible.value = false;
    fetchPositions();
  } catch (err) {
    console.error('Failed to save position:', err);
    showError(err.response?.data?.detail || 'Failed to save job position');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteJobPositionApi(record.id);
    showSuccess('Job position deleted successfully');
    fetchPositions();
  } catch (err) {
    console.error('Failed to delete position:', err);
    showError(err.response?.data?.detail || 'Failed to delete job position');
  } finally {
    actionLoading.value = false;
  }
}

function formatSalary(record) {
  if (!record.min_salary && !record.max_salary) return '-';
  const currency = record.currency || 'USD';
  const min = record.min_salary ? Number(record.min_salary).toLocaleString() : '0';
  const max = record.max_salary ? Number(record.max_salary).toLocaleString() : '-';
  return `${currency} ${min} - ${max}`;
}

onMounted(() => {
  fetchPositions();
  fetchDepartments();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <SolutionOutlined />
            <span>Job Positions</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateModal">
              <PlusOutlined /> New Position
            </Button>
            <Button @click="fetchPositions">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <InputSearch
              v-model:value="filters.search"
              placeholder="Search positions..."
              style="width: 220px"
              allow-clear
            />
            <Select
              v-model:value="filters.department_id"
              placeholder="Filter by department"
              allow-clear
              style="width: 180px"
            >
              <SelectOption v-for="dept in departments" :key="dept.id" :value="dept.id">
                {{ dept.name }}
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
          :data-source="positions"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} positions`,
          }"
          :scroll="{ x: 900 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'department'">
              <Tag v-if="record.department" color="blue">
                {{ record.department.name }}
              </Tag>
              <span v-else class="text-gray">-</span>
            </template>
            <template v-if="column.key === 'salary'">
              <Space v-if="record.min_salary || record.max_salary">
                <DollarOutlined />
                <span>{{ formatSalary(record) }}</span>
              </Space>
              <span v-else class="text-gray">-</span>
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
                  title="Delete this position?"
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
      :title="isEditing ? 'Edit Job Position' : 'Create Job Position'"
      @ok="handleSave"
      :confirm-loading="actionLoading"
      width="700px"
    >
      <Form layout="vertical">
        <div class="form-row">
          <FormItem label="Position Name" required style="flex: 2">
            <Input
              v-model:value="positionForm.name"
              placeholder="e.g., Software Engineer"
              @blur="generateCode(positionForm.name)"
            />
          </FormItem>

          <FormItem label="Code" style="flex: 1">
            <Input
              v-model:value="positionForm.code"
              placeholder="e.g., SWE"
            />
          </FormItem>
        </div>

        <FormItem label="Department">
          <Select
            v-model:value="positionForm.department_id"
            placeholder="Select department"
            allow-clear
            show-search
            :filter-option="(input, option) =>
              option.label?.toLowerCase().includes(input.toLowerCase())"
            style="width: 100%"
          >
            <SelectOption
              v-for="dept in departments"
              :key="dept.id"
              :value="dept.id"
              :label="dept.name"
            >
              {{ dept.name }}
            </SelectOption>
          </Select>
        </FormItem>

        <FormItem label="Description">
          <Textarea
            v-model:value="positionForm.description"
            :rows="2"
            placeholder="Position description..."
          />
        </FormItem>

        <div class="section-title">Compensation</div>

        <div class="form-row">
          <FormItem label="Currency" style="flex: 1">
            <Select v-model:value="positionForm.currency" style="width: 100%">
              <SelectOption v-for="c in CURRENCY_OPTIONS" :key="c.value" :value="c.value">
                {{ c.label }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Min Salary" style="flex: 1">
            <InputNumber
              v-model:value="positionForm.min_salary"
              :min="0"
              style="width: 100%"
              :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="value => value.replace(/\$\s?|(,*)/g, '')"
            />
          </FormItem>
          <FormItem label="Max Salary" style="flex: 1">
            <InputNumber
              v-model:value="positionForm.max_salary"
              :min="0"
              style="width: 100%"
              :formatter="value => `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')"
              :parser="value => value.replace(/\$\s?|(,*)/g, '')"
            />
          </FormItem>
        </div>

        <div class="section-title">Requirements</div>

        <FormItem label="Requirements">
          <Textarea
            v-model:value="positionForm.requirements"
            :rows="3"
            placeholder="Position requirements..."
          />
        </FormItem>

        <FormItem label="Qualifications">
          <Textarea
            v-model:value="positionForm.qualifications"
            :rows="3"
            placeholder="Required qualifications..."
          />
        </FormItem>

        <div class="form-row">
          <FormItem label="Expected Headcount" style="flex: 1">
            <InputNumber
              v-model:value="positionForm.expected_employees"
              :min="1"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="Sequence" style="flex: 1">
            <InputNumber
              v-model:value="positionForm.sequence"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="Status" style="flex: 1">
            <Select v-model:value="positionForm.is_active" style="width: 100%">
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

.section-title {
  font-weight: 600;
  font-size: 14px;
  margin: 16px 0 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid #f0f0f0;
}

.text-gray {
  color: #999;
}
</style>
