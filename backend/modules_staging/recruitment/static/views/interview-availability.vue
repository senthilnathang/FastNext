<script setup>
import { computed, h, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Badge,
  Button,
  Calendar,
  Card,
  Checkbox,
  CheckboxGroup,
  Col,
  DatePicker,
  Empty,
  Form,
  FormItem,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Switch,
  Table,
  Tag,
  Textarea,
  TimePicker,
  Tooltip,
  message,
} from 'ant-design-vue';
import {
  CalendarOutlined,
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import {
  createInterviewAvailabilityApi,
  deleteInterviewAvailabilityApi,
  getInterviewAvailabilityApi,
  updateInterviewAvailabilityApi,
} from '#/api/recruitment';
import { getEmployeesApi } from '#/api/employee';

defineOptions({
  name: 'RECRUITMENTInterviewAvailabilityList',
});

// State
const loading = ref(false);
const availabilitySlots = ref([]);
const employees = ref([]);
const modalVisible = ref(false);
const modalMode = ref('create');
const selectedSlot = ref(null);
const saving = ref(false);
const viewMode = ref('list');
const calendarValue = ref(dayjs());

// Filters
const filters = ref({
  employee_id: undefined,
  status: undefined,
  date_from: undefined,
  date_to: undefined,
});

// Form
const formRef = ref();
const formState = ref({
  employee_id: undefined,
  date: undefined,
  start_time: undefined,
  end_time: undefined,
  status: 'available',
  interview_types: [],
  notes: '',
  recurring: false,
  recurring_pattern: {
    frequency: 'weekly',
    days: [],
    until: undefined,
  },
});

const statusOptions = [
  { value: 'available', label: 'Available', color: 'green' },
  { value: 'tentative', label: 'Tentative', color: 'orange' },
  { value: 'booked', label: 'Booked', color: 'blue' },
  { value: 'unavailable', label: 'Unavailable', color: 'red' },
];

const interviewTypes = [
  { value: 'phone', label: 'Phone Screen' },
  { value: 'video', label: 'Video Call' },
  { value: 'technical', label: 'Technical' },
  { value: 'hr', label: 'HR Round' },
  { value: 'panel', label: 'Panel Interview' },
  { value: 'culture_fit', label: 'Culture Fit' },
  { value: 'final', label: 'Final Round' },
];

const weekDays = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

// Computed
const slotsByDate = computed(() => {
  const grouped = {};
  availabilitySlots.value.forEach((slot) => {
    if (!grouped[slot.date]) grouped[slot.date] = [];
    grouped[slot.date].push(slot);
  });
  return grouped;
});

// Table columns
const columns = [
  {
    title: 'Interviewer',
    dataIndex: 'interviewer_name',
    key: 'interviewer_name',
  },
  {
    title: 'Date',
    dataIndex: 'date',
    key: 'date',
    width: 120,
    customRender: ({ text }) =>
      dayjs(text).format('MMM D, YYYY'),
  },
  {
    title: 'Time',
    key: 'time',
    width: 150,
    customRender: ({
      record,
    }) => `${record.start_time} - ${record.end_time}`,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 100,
    customRender: ({ text }) => {
      const status = statusOptions.find((s) => s.value === text);
      return h(
        Tag,
        { color: status?.color || 'default' },
        () => status?.label || text,
      );
    },
  },
  {
    title: 'Interview Types',
    dataIndex: 'interview_types',
    key: 'interview_types',
    width: 200,
    customRender: ({ text }) =>
      text?.length > 0
        ? h(
            'div',
            { class: 'flex flex-wrap gap-1' },
            text.slice(0, 2).map((t) =>
              h(Tag, { key: t, size: 'small' }, () =>
                interviewTypes.find((it) => it.value === t)?.label || t,
              ),
            ),
          )
        : h(Tag, { color: 'default' }, () => 'All Types'),
  },
  {
    title: 'Recurring',
    dataIndex: 'recurring',
    key: 'recurring',
    width: 80,
    customRender: ({ text }) =>
      text ? h(Tag, { color: 'purple' }, () => 'Yes') : '-',
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 120,
  },
];

// Functions
async function loadData() {
  loading.value = true;
  try {
    const [slotsRes, employeeRes] = await Promise.all([
      getInterviewAvailabilityApi(filters.value),
      getEmployeesApi({ page_size: 1000 }),
    ]);
    availabilitySlots.value = slotsRes.items || [];
    employees.value = (employeeRes.items || []).map((e) => ({
      id: e.id,
      name:
        `${e.first_name || ''} ${e.last_name || ''}`.trim() || e.email,
    }));
  } catch {
    message.error('Failed to load availability data');
  } finally {
    loading.value = false;
  }
}

function openCreateModal(date) {
  modalMode.value = 'create';
  formState.value = {
    employee_id: undefined,
    date: date || dayjs(),
    start_time: dayjs().hour(9).minute(0),
    end_time: dayjs().hour(17).minute(0),
    status: 'available',
    interview_types: [],
    notes: '',
    recurring: false,
    recurring_pattern: {
      frequency: 'weekly',
      days: [],
      until: undefined,
    },
  };
  modalVisible.value = true;
}

function openEditModal(record) {
  modalMode.value = 'edit';
  selectedSlot.value = record;
  formState.value = {
    employee_id: record.employee_id,
    date: dayjs(record.date),
    start_time: dayjs(record.start_time, 'HH:mm'),
    end_time: dayjs(record.end_time, 'HH:mm'),
    status: record.status,
    interview_types: record.interview_types || [],
    notes: record.notes || '',
    recurring: record.recurring,
    recurring_pattern: record.recurring_pattern
      ? {
          frequency:
            record.recurring_pattern.frequency || 'weekly',
          days: record.recurring_pattern.days || [],
          until: record.recurring_pattern.until
            ? dayjs(record.recurring_pattern.until)
            : undefined,
        }
      : {
          frequency: 'weekly',
          days: [],
          until: undefined,
        },
  };
  modalVisible.value = true;
}

async function handleSave() {
  try {
    await formRef.value?.validate();
  } catch {
    return;
  }

  saving.value = true;
  try {
    const data = {
      employee_id: formState.value.employee_id,
      date: formState.value.date.format('YYYY-MM-DD'),
      start_time: formState.value.start_time.format('HH:mm'),
      end_time: formState.value.end_time.format('HH:mm'),
      status: formState.value.status,
      interview_types: formState.value.interview_types,
      notes: formState.value.notes || undefined,
      recurring: formState.value.recurring,
      recurring_pattern: formState.value.recurring
        ? {
            frequency: formState.value.recurring_pattern.frequency,
            days: formState.value.recurring_pattern.days,
            until:
              formState.value.recurring_pattern.until?.format('YYYY-MM-DD'),
          }
        : undefined,
    };

    if (modalMode.value === 'create') {
      await createInterviewAvailabilityApi(data);
      message.success('Availability slot created successfully');
    } else {
      await updateInterviewAvailabilityApi(selectedSlot.value.id, {
        date: data.date,
        start_time: data.start_time,
        end_time: data.end_time,
        status: data.status,
        interview_types: data.interview_types,
        notes: data.notes,
      });
      message.success('Availability slot updated successfully');
    }
    modalVisible.value = false;
    loadData();
  } catch (error) {
    message.error(
      error?.response?.data?.detail || 'Failed to save availability',
    );
  } finally {
    saving.value = false;
  }
}

async function handleDelete(id) {
  try {
    await deleteInterviewAvailabilityApi(id);
    message.success('Availability slot deleted successfully');
    loadData();
  } catch {
    message.error('Failed to delete availability slot');
  }
}

function getDateCellData(date) {
  const dateStr = date.format('YYYY-MM-DD');
  return slotsByDate.value[dateStr] || [];
}

function onCalendarSelect(date) {
  openCreateModal(date);
}

onMounted(loadData);
</script>

<template>
  <Page
    title="Interview Availability"
    description="Manage interviewer availability slots for scheduling"
  >
    <Spin :spinning="loading">
      <Card>
        <!-- Toolbar -->
        <div class="mb-4 flex items-center justify-between">
          <Space>
            <Select
              v-model:value="filters.employee_id"
              placeholder="Filter by Interviewer"
              style="width: 200px"
              allow-clear
              show-search
              option-filter-prop="label"
              @change="loadData"
            >
              <SelectOption
                v-for="emp in employees"
                :key="emp.id"
                :value="emp.id"
                :label="emp.name"
              >
                {{ emp.name }}
              </SelectOption>
            </Select>
            <Select
              v-model:value="filters.status"
              placeholder="Filter by Status"
              style="width: 150px"
              allow-clear
              @change="loadData"
            >
              <SelectOption
                v-for="status in statusOptions"
                :key="status.value"
                :value="status.value"
              >
                <Tag :color="status.color">{{ status.label }}</Tag>
              </SelectOption>
            </Select>
          </Space>
          <Space>
            <Button
              :type="viewMode === 'list' ? 'primary' : 'default'"
              @click="viewMode = 'list'"
            >
              <UnorderedListOutlined /> List
            </Button>
            <Button
              :type="viewMode === 'calendar' ? 'primary' : 'default'"
              @click="viewMode = 'calendar'"
            >
              <CalendarOutlined /> Calendar
            </Button>
            <Button type="primary" @click="openCreateModal()">
              <PlusOutlined /> Add Slot
            </Button>
          </Space>
        </div>

        <!-- List View -->
        <template v-if="viewMode === 'list'">
          <Table
            :columns="columns"
            :data-source="availabilitySlots"
            :row-key="
              (record) => record.id
            "
            :pagination="{
              pageSize: 10,
              showTotal: (total) => `Total ${total} slots`,
            }"
          >
            <template #emptyText>
              <Empty description="No availability slots found" />
            </template>
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'actions'">
                <Space>
                  <Tooltip title="Edit">
                    <Button size="small" @click="openEditModal(record)">
                      <EditOutlined />
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    title="Delete this slot?"
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
        </template>

        <!-- Calendar View -->
        <template v-else>
          <Calendar
            v-model:value="calendarValue"
            @select="onCalendarSelect"
          >
            <template #dateCellRender="{ current }">
              <div class="calendar-cell">
                <div
                  v-for="slot in getDateCellData(current).slice(0, 3)"
                  :key="slot.id"
                  class="slot-badge"
                  @click.stop="openEditModal(slot)"
                >
                  <Badge
                    :status="
                      slot.status === 'available'
                        ? 'success'
                        : slot.status === 'booked'
                          ? 'processing'
                          : slot.status === 'tentative'
                            ? 'warning'
                            : 'error'
                    "
                    :text="`${slot.start_time} ${slot.interviewer_name?.split(' ')[0] || ''}`"
                  />
                </div>
                <div
                  v-if="getDateCellData(current).length > 3"
                  class="text-xs text-gray-400"
                >
                  +{{ getDateCellData(current).length - 3 }} more
                </div>
              </div>
            </template>
          </Calendar>
        </template>
      </Card>

      <!-- Create/Edit Modal -->
      <Modal
        v-model:open="modalVisible"
        :title="
          modalMode === 'create'
            ? 'Add Availability Slot'
            : 'Edit Availability'
        "
        :confirm-loading="saving"
        width="600px"
        @ok="handleSave"
      >
        <Form ref="formRef" :model="formState" layout="vertical">
          <FormItem
            label="Interviewer"
            name="employee_id"
            :rules="[
              { required: true, message: 'Please select interviewer' },
            ]"
          >
            <Select
              v-model:value="formState.employee_id"
              placeholder="Select interviewer"
              show-search
              option-filter-prop="label"
              :disabled="modalMode === 'edit'"
            >
              <SelectOption
                v-for="emp in employees"
                :key="emp.id"
                :value="emp.id"
                :label="emp.name"
              >
                {{ emp.name }}
              </SelectOption>
            </Select>
          </FormItem>

          <Row :gutter="16">
            <Col :span="8">
              <FormItem
                label="Date"
                name="date"
                :rules="[
                  { required: true, message: 'Please select date' },
                ]"
              >
                <DatePicker
                  v-model:value="formState.date"
                  style="width: 100%"
                  :disabled-date="
                    (d) => d.isBefore(dayjs().startOf('day'))
                  "
                />
              </FormItem>
            </Col>
            <Col :span="8">
              <FormItem
                label="Start Time"
                name="start_time"
                :rules="[{ required: true, message: 'Required' }]"
              >
                <TimePicker
                  v-model:value="formState.start_time"
                  format="HH:mm"
                  :minute-step="15"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
            <Col :span="8">
              <FormItem
                label="End Time"
                name="end_time"
                :rules="[{ required: true, message: 'Required' }]"
              >
                <TimePicker
                  v-model:value="formState.end_time"
                  format="HH:mm"
                  :minute-step="15"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
          </Row>

          <FormItem label="Status" name="status">
            <Select v-model:value="formState.status">
              <SelectOption
                v-for="status in statusOptions"
                :key="status.value"
                :value="status.value"
              >
                <Tag :color="status.color">{{ status.label }}</Tag>
              </SelectOption>
            </Select>
          </FormItem>

          <FormItem
            label="Interview Types (leave empty for all types)"
            name="interview_types"
          >
            <CheckboxGroup v-model:value="formState.interview_types">
              <Row>
                <Col
                  v-for="type in interviewTypes"
                  :key="type.value"
                  :span="8"
                >
                  <Checkbox :value="type.value">{{
                    type.label
                  }}</Checkbox>
                </Col>
              </Row>
            </CheckboxGroup>
          </FormItem>

          <FormItem label="Notes" name="notes">
            <Textarea
              v-model:value="formState.notes"
              :rows="2"
              placeholder="Optional notes..."
            />
          </FormItem>

          <FormItem
            v-if="modalMode === 'create'"
            label="Recurring"
            name="recurring"
          >
            <Switch v-model:checked="formState.recurring" />
          </FormItem>

          <template
            v-if="formState.recurring && modalMode === 'create'"
          >
            <Row :gutter="16">
              <Col :span="12">
                <FormItem
                  label="Frequency"
                  name="recurring_pattern.frequency"
                >
                  <Select
                    v-model:value="
                      formState.recurring_pattern.frequency
                    "
                  >
                    <SelectOption value="daily">Daily</SelectOption>
                    <SelectOption value="weekly">Weekly</SelectOption>
                    <SelectOption value="monthly">
                      Monthly
                    </SelectOption>
                  </Select>
                </FormItem>
              </Col>
              <Col :span="12">
                <FormItem
                  label="Until"
                  name="recurring_pattern.until"
                >
                  <DatePicker
                    v-model:value="formState.recurring_pattern.until"
                    style="width: 100%"
                    :disabled-date="
                      (d) => d.isBefore(formState.date)
                    "
                  />
                </FormItem>
              </Col>
            </Row>
            <FormItem
              v-if="
                formState.recurring_pattern.frequency === 'weekly'
              "
              label="Days of Week"
            >
              <CheckboxGroup
                v-model:value="formState.recurring_pattern.days"
              >
                <Checkbox
                  v-for="day in weekDays"
                  :key="day.value"
                  :value="day.value"
                >
                  {{ day.label }}
                </Checkbox>
              </CheckboxGroup>
            </FormItem>
          </template>
        </Form>
      </Modal>
    </Spin>
  </Page>
</template>

<style scoped>
.calendar-cell {
  min-height: 60px;
}

.slot-badge {
  cursor: pointer;
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.slot-badge:hover {
  background-color: #f0f0f0;
  border-radius: 4px;
}
</style>
