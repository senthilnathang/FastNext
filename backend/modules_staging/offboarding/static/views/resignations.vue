<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Avatar,
  Button,
  Card,
  Col,
  DatePicker,
  Drawer,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import {
  approveResignationApi,
  createResignationApi,
  deleteResignationApi,
  getOffboardingTemplatesApi,
  getResignationsApi,
  rejectResignationApi,
  updateResignationApi,
} from '#/api/offboarding';
import { requestClient } from '#/api/request';

defineOptions({ name: 'OffboardingResignations' });

const FormItem = Form.Item;
const SelectOption = Select.Option;
const InputSearch = Input.Search;
const TextArea = Input.TextArea;

const loading = ref(false);
const submitting = ref(false);
const resignations = ref([]);
const offboardingTemplates = ref([]);
const allEmployees = ref([]);
const showModal = ref(false);
const showApproveModal = ref(false);
const showDetailDrawer = ref(false);
const editingId = ref(null);
const selectedResignation = ref(null);

const pagination = ref({
  current: 1,
  pageSize: 10,
  total: 0,
});

const filters = ref({
  search: '',
  status: null,
});

const formState = reactive({
  employee_id: null,
  title: '',
  description: '',
  planned_to_leave_on: null,
});

const approveForm = reactive({
  offboarding_id: null,
  notice_period_starts: null,
  notice_period_ends: null,
});

const columns = [
  {
    title: '',
    key: 'avatar',
    width: 60,
  },
  {
    title: 'Employee',
    key: 'employee',
    width: 200,
  },
  {
    title: 'Title',
    dataIndex: 'title',
    key: 'title',
    width: 200,
  },
  {
    title: 'Planned Leave Date',
    key: 'planned_to_leave_on',
    width: 150,
  },
  {
    title: 'Status',
    key: 'status',
    width: 120,
  },
  {
    title: 'Submitted',
    key: 'created_at',
    width: 150,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 200,
    fixed: 'right',
  },
];

const statusOptions = [
  { value: null, label: 'All Status' },
  { value: 'requested', label: 'Requested' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
];

const statistics = computed(() => {
  const total = pagination.value.total;
  const requested = resignations.value.filter((r) => r.status === 'requested').length;
  const approved = resignations.value.filter((r) => r.status === 'approved').length;
  const rejected = resignations.value.filter((r) => r.status === 'rejected').length;

  return { total, requested, approved, rejected };
});

const fetchResignations = async () => {
  loading.value = true;
  try {
    const params = {
      page: pagination.value.current,
      page_size: pagination.value.pageSize,
    };
    if (filters.value.search) {
      params.search = filters.value.search;
    }
    if (filters.value.status) {
      params.status = filters.value.status;
    }
    const response = await getResignationsApi(params);
    resignations.value = response.items || [];
    pagination.value.total = response.total || 0;
  } catch (error) {
    console.error('Failed to fetch resignations:', error);
    message.error('Failed to load resignation letters');
  } finally {
    loading.value = false;
  }
};

const fetchOffboardingTemplates = async () => {
  try {
    const response = await getOffboardingTemplatesApi();
    offboardingTemplates.value = Array.isArray(response) ? response : [];
  } catch (error) {
    console.error('Failed to fetch offboarding templates:', error);
  }
};

const fetchAllEmployees = async () => {
  try {
    const response = await requestClient.get('/employee/employees?limit=200');
    const employees = Array.isArray(response) ? response : [];
    allEmployees.value = employees.map((e) => ({
      id: e.id,
      name: `${e.employee_first_name || ''} ${e.employee_last_name || ''}`.trim() || e.email,
    }));
  } catch (error) {
    console.error('Failed to fetch employees:', error);
  }
};

const resetForm = () => {
  Object.assign(formState, {
    employee_id: null,
    title: '',
    description: '',
    planned_to_leave_on: null,
  });
};

const openCreateModal = () => {
  editingId.value = null;
  resetForm();
  showModal.value = true;
  if (allEmployees.value.length === 0) {
    fetchAllEmployees();
  }
};

const openEditModal = (record) => {
  editingId.value = record.id;
  Object.assign(formState, {
    employee_id: record.employee_id,
    title: record.title || '',
    description: record.description || '',
    planned_to_leave_on: record.planned_to_leave_on,
  });
  showModal.value = true;
  if (allEmployees.value.length === 0) {
    fetchAllEmployees();
  }
};

const viewDetail = (record) => {
  selectedResignation.value = record;
  showDetailDrawer.value = true;
};

const openApproveModal = (record) => {
  selectedResignation.value = record;
  Object.assign(approveForm, {
    offboarding_id: offboardingTemplates.value[0]?.id || null,
    notice_period_starts: dayjs().format('YYYY-MM-DD'),
    notice_period_ends: record.planned_to_leave_on,
  });
  showApproveModal.value = true;
  if (offboardingTemplates.value.length === 0) {
    fetchOffboardingTemplates();
  }
};

const handleSubmit = async () => {
  if (!formState.title || !formState.planned_to_leave_on) {
    message.error('Please fill in all required fields');
    return;
  }

  if (!editingId.value && !formState.employee_id) {
    message.error('Please select an employee');
    return;
  }

  submitting.value = true;
  try {
    const data = {
      title: formState.title,
      description: formState.description,
      planned_to_leave_on: formState.planned_to_leave_on,
      employee_id: formState.employee_id || undefined,
    };

    if (editingId.value) {
      await updateResignationApi(editingId.value, data);
      message.success('Resignation letter updated successfully');
    } else {
      await createResignationApi(data);
      message.success('Resignation letter created successfully');
    }

    showModal.value = false;
    fetchResignations();
  } catch (error) {
    console.error('Failed to save resignation:', error);
    const errorMessage = error?.response?.data?.error || 'Failed to save resignation letter';
    message.error(errorMessage);
  } finally {
    submitting.value = false;
  }
};

const handleApprove = async () => {
  if (!selectedResignation.value) return;

  submitting.value = true;
  try {
    await approveResignationApi(selectedResignation.value.id, {
      offboarding_id: approveForm.offboarding_id || undefined,
      notice_period_starts: approveForm.notice_period_starts || undefined,
      notice_period_ends: approveForm.notice_period_ends || undefined,
    });
    message.success('Resignation approved successfully');
    showApproveModal.value = false;
    showDetailDrawer.value = false;
    fetchResignations();
  } catch (error) {
    console.error('Failed to approve resignation:', error);
    const errorMessage = error?.response?.data?.error || 'Failed to approve resignation';
    message.error(errorMessage);
  } finally {
    submitting.value = false;
  }
};

const handleReject = async (record) => {
  try {
    await rejectResignationApi(record.id);
    message.success('Resignation rejected');
    fetchResignations();
  } catch (error) {
    console.error('Failed to reject resignation:', error);
    const errorMessage = error?.response?.data?.error || 'Failed to reject resignation';
    message.error(errorMessage);
  }
};

const handleDelete = async (record) => {
  try {
    await deleteResignationApi(record.id);
    message.success('Resignation letter deleted');
    fetchResignations();
  } catch (error) {
    console.error('Failed to delete resignation:', error);
    const errorMessage = error?.response?.data?.error || 'Failed to delete resignation letter';
    message.error(errorMessage);
  }
};

const handleTableChange = (pag) => {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchResignations();
};

const handleSearch = () => {
  pagination.value.current = 1;
  fetchResignations();
};

const handleFilterChange = () => {
  pagination.value.current = 1;
  fetchResignations();
};

const getStatusColor = (status) => {
  switch (status) {
    case 'approved':
      return 'green';
    case 'rejected':
      return 'red';
    default:
      return 'orange';
  }
};

const formatDate = (dateString) => {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
};

const getInitials = (name) => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
};

onMounted(() => {
  fetchResignations();
  fetchOffboardingTemplates();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <h1 class="mb-6 text-2xl font-bold">Resignation Letters</h1>

      <!-- Statistics Cards -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic
              title="Total Requests"
              :value="statistics.total"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <FileTextOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic
              title="Pending"
              :value="statistics.requested"
              :value-style="{ color: '#faad14' }"
            >
              <template #prefix>
                <FileTextOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic
              title="Approved"
              :value="statistics.approved"
              :value-style="{ color: '#52c41a' }"
            >
              <template #prefix>
                <CheckCircleOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic
              title="Rejected"
              :value="statistics.rejected"
              :value-style="{ color: '#f5222d' }"
            >
              <template #prefix>
                <CloseCircleOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <!-- Resignations Table -->
      <Card>
        <template #title>
          <div class="flex items-center justify-between">
            <span>Resignation Requests</span>
            <Space>
              <InputSearch
                v-model:value="filters.search"
                placeholder="Search..."
                style="width: 200px"
                @search="handleSearch"
              />
              <Select
                v-model:value="filters.status"
                :options="statusOptions"
                placeholder="Status"
                style="width: 150px"
                @change="handleFilterChange"
              />
              <Button @click="() => fetchResignations()">
                <template #icon>
                  <ReloadOutlined />
                </template>
              </Button>
              <Button type="primary" @click="() => openCreateModal()">
                <template #icon>
                  <PlusOutlined />
                </template>
                New Request
              </Button>
            </Space>
          </div>
        </template>

        <Table
          :columns="columns"
          :data-source="resignations"
          :loading="loading"
          :pagination="pagination"
          :scroll="{ x: 1100 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'avatar'">
              <Avatar
                :size="40"
                :src="record.employee_profile"
                :style="{ backgroundColor: '#1890ff' }"
              >
                {{ getInitials(record.employee_name) }}
              </Avatar>
            </template>

            <template v-if="column.key === 'employee'">
              <div>
                <div class="font-medium">{{ record.employee_name }}</div>
                <div class="text-xs text-gray-500">
                  {{ record.department || 'No department' }}
                  <span v-if="record.position"> - {{ record.position }}</span>
                </div>
              </div>
            </template>

            <template v-if="column.key === 'planned_to_leave_on'">
              <span>{{ formatDate(record.planned_to_leave_on) }}</span>
            </template>

            <template v-if="column.key === 'status'">
              <Tag :color="getStatusColor(record.status)">
                {{ record.status_display || record.status }}
              </Tag>
            </template>

            <template v-if="column.key === 'created_at'">
              <span>{{ formatDate(record.created_at) }}</span>
            </template>

            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="View Details">
                  <Button type="link" size="small" @click="() => viewDetail(record)">
                    <EyeOutlined />
                  </Button>
                </Tooltip>

                <template v-if="record.status === 'requested'">
                  <Tooltip title="Approve">
                    <Button
                      type="link"
                      size="small"
                      style="color: #52c41a"
                      @click="() => openApproveModal(record)"
                    >
                      <CheckCircleOutlined />
                    </Button>
                  </Tooltip>
                  <Tooltip title="Reject">
                    <Popconfirm
                      title="Are you sure you want to reject this resignation?"
                      @confirm="() => handleReject(record)"
                    >
                      <Button type="link" size="small" danger>
                        <CloseCircleOutlined />
                      </Button>
                    </Popconfirm>
                  </Tooltip>
                  <Tooltip title="Edit">
                    <Button type="link" size="small" @click="() => openEditModal(record)">
                      <EditOutlined />
                    </Button>
                  </Tooltip>
                </template>

                <Tooltip title="Delete">
                  <Popconfirm
                    title="Are you sure you want to delete this resignation request?"
                    @confirm="() => handleDelete(record)"
                  >
                    <Button type="link" size="small" danger>
                      <DeleteOutlined />
                    </Button>
                  </Popconfirm>
                </Tooltip>
              </Space>
            </template>
          </template>

          <template #emptyText>
            <div class="py-8 text-center text-gray-500">
              <FileTextOutlined style="font-size: 32px; color: #d9d9d9; margin-bottom: 16px; display: block;" />
              <p>No resignation letters found</p>
            </div>
          </template>
        </Table>
      </Card>

      <!-- Create/Edit Modal -->
      <Modal
        v-model:open="showModal"
        :title="editingId ? 'Edit Resignation Letter' : 'New Resignation Letter'"
        :confirm-loading="submitting"
        width="600px"
        @ok="handleSubmit"
      >
        <Form layout="vertical" style="margin-top: 16px;">
          <FormItem v-if="!editingId" label="Employee" required>
            <Select
              v-model:value="formState.employee_id"
              placeholder="Select an employee"
              show-search
              :filter-option="(input, option) =>
                (option?.label || '').toLowerCase().includes(input.toLowerCase())
              "
              :options="allEmployees.map((e) => ({ value: e.id, label: e.name }))"
            />
          </FormItem>

          <FormItem label="Title" required>
            <Input
              v-model:value="formState.title"
              placeholder="Enter resignation title (e.g., Resignation from Position)"
            />
          </FormItem>

          <FormItem label="Reason / Description">
            <TextArea
              v-model:value="formState.description"
              :rows="4"
              placeholder="Enter reason for resignation..."
            />
          </FormItem>

          <FormItem label="Planned Leave Date" required>
            <DatePicker
              v-model:value="formState.planned_to_leave_on"
              style="width: 100%"
              :value-format="'YYYY-MM-DD'"
              placeholder="Select planned leave date"
            />
          </FormItem>
        </Form>
      </Modal>

      <!-- Approve Modal -->
      <Modal
        v-model:open="showApproveModal"
        title="Approve Resignation"
        :confirm-loading="submitting"
        width="500px"
        @ok="handleApprove"
      >
        <Form layout="vertical" style="margin-top: 16px;">
          <div v-if="selectedResignation" style="margin-bottom: 16px; padding: 16px; background: #f5f5f5; border-radius: 8px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 8px;">
              <Avatar
                :size="40"
                :src="selectedResignation.employee_profile"
                :style="{ backgroundColor: '#1890ff' }"
              >
                {{ getInitials(selectedResignation.employee_name) }}
              </Avatar>
              <div>
                <div class="font-medium">{{ selectedResignation.employee_name }}</div>
                <div class="text-xs text-gray-500">{{ selectedResignation.department }}</div>
              </div>
            </div>
            <div style="font-size: 14px;">
              <strong>Planned Leave:</strong> {{ formatDate(selectedResignation.planned_to_leave_on) }}
            </div>
          </div>

          <FormItem label="Offboarding Template">
            <Select
              v-model:value="approveForm.offboarding_id"
              placeholder="Select offboarding template to assign"
              allow-clear
            >
              <SelectOption
                v-for="tpl in offboardingTemplates"
                :key="tpl.id"
                :value="tpl.id"
              >
                {{ tpl.title || tpl.name }}
              </SelectOption>
            </Select>
            <div style="font-size: 12px; color: #999; margin-top: 4px;">
              Employee will be added to this offboarding process after approval
            </div>
          </FormItem>

          <FormItem label="Notice Period Start">
            <DatePicker
              v-model:value="approveForm.notice_period_starts"
              style="width: 100%"
              :value-format="'YYYY-MM-DD'"
            />
          </FormItem>

          <FormItem label="Notice Period End">
            <DatePicker
              v-model:value="approveForm.notice_period_ends"
              style="width: 100%"
              :value-format="'YYYY-MM-DD'"
            />
          </FormItem>
        </Form>
      </Modal>

      <!-- Detail Drawer -->
      <Drawer
        v-model:open="showDetailDrawer"
        :title="selectedResignation?.employee_name || 'Resignation Details'"
        width="500"
        placement="right"
      >
        <template v-if="selectedResignation">
          <div>
            <!-- Header -->
            <div style="display: flex; align-items: center; gap: 16px; margin-bottom: 24px;">
              <Avatar
                :size="64"
                :src="selectedResignation.employee_profile"
                :style="{ backgroundColor: '#1890ff' }"
              >
                {{ getInitials(selectedResignation.employee_name) }}
              </Avatar>
              <div>
                <h3 style="font-size: 18px; font-weight: 600; margin: 0 0 4px 0;">
                  {{ selectedResignation.employee_name }}
                </h3>
                <Tag :color="getStatusColor(selectedResignation.status)">
                  {{ selectedResignation.status_display || selectedResignation.status }}
                </Tag>
              </div>
            </div>

            <!-- Employee Info -->
            <Card title="Employee Information" size="small" style="margin-bottom: 16px;">
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #888;">Department:</span>
                  <span>{{ selectedResignation.department || '-' }}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #888;">Position:</span>
                  <span>{{ selectedResignation.position || '-' }}</span>
                </div>
              </div>
            </Card>

            <!-- Resignation Details -->
            <Card title="Resignation Details" size="small" style="margin-bottom: 16px;">
              <div style="display: flex; flex-direction: column; gap: 12px;">
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #888;">Title:</span>
                  <span>{{ selectedResignation.title || '-' }}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #888;">Planned Leave:</span>
                  <span>{{ formatDate(selectedResignation.planned_to_leave_on) }}</span>
                </div>
                <div style="display: flex; justify-content: space-between;">
                  <span style="color: #888;">Submitted:</span>
                  <span>{{ formatDate(selectedResignation.created_at) }}</span>
                </div>
                <div v-if="selectedResignation.description">
                  <div style="color: #888; margin-bottom: 8px;">Reason:</div>
                  <div style="padding: 12px; background: #f5f5f5; border-radius: 6px; font-size: 14px;">
                    {{ selectedResignation.description }}
                  </div>
                </div>
              </div>
            </Card>

            <!-- Actions -->
            <div v-if="selectedResignation.status === 'requested'" style="margin-top: 24px;">
              <Space>
                <Button
                  type="primary"
                  @click="() => openApproveModal(selectedResignation)"
                >
                  <CheckCircleOutlined />
                  Approve
                </Button>
                <Popconfirm
                  title="Are you sure you want to reject this resignation?"
                  @confirm="() => { handleReject(selectedResignation); showDetailDrawer = false; }"
                >
                  <Button danger>
                    <CloseCircleOutlined />
                    Reject
                  </Button>
                </Popconfirm>
              </Space>
            </div>
          </div>
        </template>
      </Drawer>
    </div>
  </Page>
</template>
