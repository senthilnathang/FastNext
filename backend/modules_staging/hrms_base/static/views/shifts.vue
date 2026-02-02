<script setup>
import { onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Checkbox,
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
  TimePicker,
  Tooltip,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import { useNotification } from '#/composables';
import {
  getShiftsApi,
  createShiftApi,
  updateShiftApi,
  deleteShiftApi,
  COLOR_OPTIONS,
} from '#/api/hrms_base';

defineOptions({
  name: 'HRMSShifts',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const shifts = ref([]);
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
const shiftForm = ref({
  name: '',
  code: '',
  description: '',
  start_time: null,
  end_time: null,
  break_start_time: null,
  break_end_time: null,
  break_duration_minutes: 60,
  late_grace_minutes: 15,
  early_out_grace_minutes: 10,
  minimum_work_hours: 8,
  full_day_hours: 8,
  half_day_hours: 4,
  is_night_shift: false,
  is_flexible: false,
  color: '#1890ff',
  sequence: 10,
  is_active: true,
});

const columns = [
  { title: 'Shift Name', dataIndex: 'name', key: 'name', width: 150 },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 100 },
  { title: 'Timing', key: 'timing', width: 140 },
  { title: 'Break', key: 'break', width: 100 },
  { title: 'Work Hours', key: 'hours', width: 100, align: 'center' },
  { title: 'Type', key: 'type', width: 120 },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 120, fixed: 'right' },
];

async function fetchShifts() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (filters.value.search) params.search = filters.value.search;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getShiftsApi(params);
    shifts.value = res.items || [];
    pagination.value.total = res.total || 0;
  } catch (err) {
    console.error('Failed to fetch shifts:', err);
    showError('Failed to load shifts');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchShifts();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchShifts();
}, { deep: true });

function resetForm() {
  shiftForm.value = {
    name: '',
    code: '',
    description: '',
    start_time: null,
    end_time: null,
    break_start_time: null,
    break_end_time: null,
    break_duration_minutes: 60,
    late_grace_minutes: 15,
    early_out_grace_minutes: 10,
    minimum_work_hours: 8,
    full_day_hours: 8,
    half_day_hours: 4,
    is_night_shift: false,
    is_flexible: false,
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
  shiftForm.value = {
    name: record.name,
    code: record.code || '',
    description: record.description || '',
    start_time: record.start_time ? dayjs(record.start_time, 'HH:mm:ss') : null,
    end_time: record.end_time ? dayjs(record.end_time, 'HH:mm:ss') : null,
    break_start_time: record.break_start_time ? dayjs(record.break_start_time, 'HH:mm:ss') : null,
    break_end_time: record.break_end_time ? dayjs(record.break_end_time, 'HH:mm:ss') : null,
    break_duration_minutes: record.break_duration_minutes ?? 60,
    late_grace_minutes: record.late_grace_minutes ?? 15,
    early_out_grace_minutes: record.early_out_grace_minutes ?? 10,
    minimum_work_hours: record.minimum_work_hours ?? 8,
    full_day_hours: record.full_day_hours ?? 8,
    half_day_hours: record.half_day_hours ?? 4,
    is_night_shift: record.is_night_shift ?? false,
    is_flexible: record.is_flexible ?? false,
    color: record.color || '#1890ff',
    sequence: record.sequence || 10,
    is_active: record.is_active !== false,
  };
  formModalVisible.value = true;
}

function generateCode(name) {
  if (!isEditing.value && name && !shiftForm.value.code) {
    shiftForm.value.code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').substring(0, 20);
  }
}

async function handleSave() {
  if (!shiftForm.value.name.trim()) {
    showError('Shift name is required');
    return;
  }
  if (!shiftForm.value.start_time || !shiftForm.value.end_time) {
    showError('Start time and end time are required');
    return;
  }

  actionLoading.value = true;
  try {
    const data = {
      ...shiftForm.value,
      start_time: shiftForm.value.start_time?.format('HH:mm:ss'),
      end_time: shiftForm.value.end_time?.format('HH:mm:ss'),
      break_start_time: shiftForm.value.break_start_time?.format('HH:mm:ss') || null,
      break_end_time: shiftForm.value.break_end_time?.format('HH:mm:ss') || null,
    };
    if (!data.code) data.code = null;
    if (!data.description) data.description = null;

    if (isEditing.value) {
      await updateShiftApi(editingId.value, data);
      showSuccess('Shift updated successfully');
    } else {
      await createShiftApi(data);
      showSuccess('Shift created successfully');
    }
    formModalVisible.value = false;
    fetchShifts();
  } catch (err) {
    console.error('Failed to save shift:', err);
    showError(err.response?.data?.detail || 'Failed to save shift');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteShiftApi(record.id);
    showSuccess('Shift deleted successfully');
    fetchShifts();
  } catch (err) {
    console.error('Failed to delete shift:', err);
    showError(err.response?.data?.detail || 'Failed to delete shift');
  } finally {
    actionLoading.value = false;
  }
}

function formatTime(timeStr) {
  if (!timeStr) return '-';
  return timeStr.substring(0, 5);
}

onMounted(() => {
  fetchShifts();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <ClockCircleOutlined />
            <span>Shifts</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateModal">
              <PlusOutlined /> New Shift
            </Button>
            <Button @click="fetchShifts">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <InputSearch
              v-model:value="filters.search"
              placeholder="Search shifts..."
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
          :data-source="shifts"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} shifts`,
          }"
          :scroll="{ x: 900 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'timing'">
              <Space>
                <ClockCircleOutlined />
                <span>{{ formatTime(record.start_time) }} - {{ formatTime(record.end_time) }}</span>
              </Space>
            </template>
            <template v-if="column.key === 'break'">
              <span>{{ record.break_duration_minutes }} min</span>
            </template>
            <template v-if="column.key === 'hours'">
              <span>{{ record.full_day_hours }}h</span>
            </template>
            <template v-if="column.key === 'type'">
              <Space>
                <Tag v-if="record.is_night_shift" color="purple">Night</Tag>
                <Tag v-if="record.is_flexible" color="blue">Flexible</Tag>
                <Tag v-if="!record.is_night_shift && !record.is_flexible" color="default">Regular</Tag>
              </Space>
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
                  title="Delete this shift?"
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
      :title="isEditing ? 'Edit Shift' : 'Create Shift'"
      @ok="handleSave"
      :confirm-loading="actionLoading"
      width="700px"
    >
      <Form layout="vertical">
        <div class="form-row">
          <FormItem label="Shift Name" required style="flex: 2">
            <Input
              v-model:value="shiftForm.name"
              placeholder="e.g., Morning Shift"
              @blur="generateCode(shiftForm.name)"
            />
          </FormItem>

          <FormItem label="Code" style="flex: 1">
            <Input
              v-model:value="shiftForm.code"
              placeholder="e.g., MORNING"
            />
          </FormItem>
        </div>

        <FormItem label="Description">
          <Textarea
            v-model:value="shiftForm.description"
            :rows="2"
            placeholder="Shift description..."
          />
        </FormItem>

        <div class="section-title">Shift Timing</div>

        <div class="form-row">
          <FormItem label="Start Time" required style="flex: 1">
            <TimePicker
              v-model:value="shiftForm.start_time"
              format="HH:mm"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="End Time" required style="flex: 1">
            <TimePicker
              v-model:value="shiftForm.end_time"
              format="HH:mm"
              style="width: 100%"
            />
          </FormItem>
        </div>

        <div class="form-row">
          <FormItem label="Break Start" style="flex: 1">
            <TimePicker
              v-model:value="shiftForm.break_start_time"
              format="HH:mm"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="Break End" style="flex: 1">
            <TimePicker
              v-model:value="shiftForm.break_end_time"
              format="HH:mm"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="Break Duration (min)" style="flex: 1">
            <InputNumber
              v-model:value="shiftForm.break_duration_minutes"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
        </div>

        <div class="section-title">Work Hours</div>

        <div class="form-row">
          <FormItem label="Full Day Hours" style="flex: 1">
            <InputNumber
              v-model:value="shiftForm.full_day_hours"
              :min="1"
              :max="24"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="Half Day Hours" style="flex: 1">
            <InputNumber
              v-model:value="shiftForm.half_day_hours"
              :min="1"
              :max="12"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="Minimum Hours" style="flex: 1">
            <InputNumber
              v-model:value="shiftForm.minimum_work_hours"
              :min="1"
              :max="24"
              style="width: 100%"
            />
          </FormItem>
        </div>

        <div class="section-title">Grace Periods</div>

        <div class="form-row">
          <FormItem label="Late Grace (min)" style="flex: 1">
            <InputNumber
              v-model:value="shiftForm.late_grace_minutes"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="Early Out Grace (min)" style="flex: 1">
            <InputNumber
              v-model:value="shiftForm.early_out_grace_minutes"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
        </div>

        <div class="section-title">Options</div>

        <div class="form-row">
          <FormItem style="flex: 1">
            <Checkbox v-model:checked="shiftForm.is_night_shift">
              Night Shift
            </Checkbox>
          </FormItem>
          <FormItem style="flex: 1">
            <Checkbox v-model:checked="shiftForm.is_flexible">
              Flexible Timing
            </Checkbox>
          </FormItem>
        </div>

        <div class="form-row">
          <FormItem label="Color" style="flex: 1">
            <Select v-model:value="shiftForm.color" style="width: 100%">
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
              v-model:value="shiftForm.sequence"
              :min="0"
              style="width: 100%"
            />
          </FormItem>
          <FormItem label="Status" style="flex: 1">
            <Select v-model:value="shiftForm.is_active" style="width: 100%">
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

.color-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  display: inline-block;
}
</style>
