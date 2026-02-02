<script setup>
import { computed, onMounted, ref } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Avatar,
  Button,
  Card,
  Col,
  Form,
  Input,
  List,
  message,
  Modal,
  Popconfirm,
  Progress,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  ArrowRightOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';
import { useRouter } from 'vue-router';

import {
  createOffboardingTemplateApi,
  deleteOffboardingTemplateApi,
  getOffboardingEmployeesApi,
  getOffboardingStatsApi,
  getOffboardingTemplatesApi,
  getResignationsApi,
  updateOffboardingTemplateApi,
} from '#/api/offboarding';
import { requestClient } from '#/api/request';

const FormItem = Form.Item;
const InputTextArea = Input.TextArea;
const SelectOption = Select.Option;
const ListItem = List.Item;
const ListItemMeta = List.Item.Meta;

defineOptions({ name: 'OffboardingDashboard' });

const router = useRouter();
const loading = ref(false);
const offboardings = ref([]);
const recentEmployees = ref([]);
const pendingResignations = ref([]);
const stats = ref(null);
const allManagers = ref([]);
const showModal = ref(false);
const editingId = ref(null);
const submitting = ref(false);

const formState = ref({
  title: '',
  description: '',
  status: 'ongoing',
  manager_ids: [],
});

const columns = [
  {
    title: 'Title',
    dataIndex: 'title',
    key: 'title',
  },
  {
    title: 'Status',
    key: 'status',
    width: 120,
  },
  {
    title: 'Stages',
    key: 'stage_count',
    width: 100,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 150,
    fixed: 'right',
  },
];

const stageTypeColors = {
  notice_period: 'blue',
  interview: 'purple',
  handover: 'orange',
  fnf: 'green',
  other: 'cyan',
  archived: 'default',
};

const managerOptions = computed(() =>
  allManagers.value.map((m) => ({ value: m.id, label: m.name }))
);

const filterManagerOption = (input, option) => {
  return option.label.toLowerCase().includes(input.toLowerCase());
};

async function fetchData() {
  loading.value = true;
  try {
    const [templatesRes, statsRes, employeesRes, resignationsRes] = await Promise.all([
      getOffboardingTemplatesApi({ page_size: 20 }),
      getOffboardingStatsApi(),
      getOffboardingEmployeesApi({ page_size: 5 }),
      getResignationsApi({ status: 'requested', page_size: 5 }),
    ]);

    offboardings.value = Array.isArray(templatesRes) ? templatesRes : (templatesRes.results || []);
    stats.value = statsRes;
    recentEmployees.value = Array.isArray(employeesRes) ? employeesRes : (employeesRes.results || []);
    pendingResignations.value = resignationsRes.items || resignationsRes.results || [];
  } catch (error) {
    console.error('Failed to fetch data:', error);
    message.error('Failed to load offboarding data');
  } finally {
    loading.value = false;
  }
}

async function fetchManagers() {
  try {
    const response = await requestClient.get('/employee/employees?limit=200');
    const employees = Array.isArray(response) ? response : (response.results || []);
    allManagers.value = employees.map((e) => ({
      id: e.id,
      name: `${e.employee_first_name || ''} ${e.employee_last_name || ''}`.trim() || e.email,
    }));
  } catch (error) {
    console.error('Failed to fetch managers:', error);
  }
}

function openCreateModal() {
  editingId.value = null;
  formState.value = {
    title: '',
    description: '',
    status: 'ongoing',
    manager_ids: [],
  };
  showModal.value = true;
  if (allManagers.value.length === 0) {
    fetchManagers();
  }
}

function openEditModal(record) {
  editingId.value = record.id;
  formState.value = {
    title: record.title,
    description: record.description,
    status: record.status,
    manager_ids: record.manager_ids || [],
  };
  showModal.value = true;
  if (allManagers.value.length === 0) {
    fetchManagers();
  }
}

async function handleSubmit() {
  if (!formState.value.title) {
    message.error('Please enter a title');
    return;
  }

  submitting.value = true;
  try {
    if (editingId.value) {
      await updateOffboardingTemplateApi(editingId.value, formState.value);
      message.success('Offboarding updated successfully');
    } else {
      await createOffboardingTemplateApi(formState.value);
      message.success('Offboarding created successfully');
    }
    showModal.value = false;
    fetchData();
  } catch (error) {
    console.error('Failed to save offboarding:', error);
    const errorMessage = error?.response?.data?.error || 'Failed to save offboarding';
    message.error(errorMessage);
  } finally {
    submitting.value = false;
  }
}

async function handleDelete(record) {
  try {
    await deleteOffboardingTemplateApi(record.id);
    message.success('Offboarding deleted successfully');
    fetchData();
  } catch (error) {
    console.error('Failed to delete offboarding:', error);
    const errorMessage = error?.response?.data?.error || 'Failed to delete offboarding';
    message.error(errorMessage);
  }
}

function goToPipeline() {
  router.push('/offboarding/pipeline');
}

function goToResignations() {
  router.push('/offboarding/resignations');
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(name) {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function getNoticePeriodStatus(emp) {
  if (!emp.notice_period_ends) {
    return { color: 'default', text: 'Not set' };
  }
  if (emp.notice_period_remaining === null || emp.notice_period_remaining === undefined) {
    return { color: 'default', text: 'N/A' };
  }
  if (emp.notice_period_remaining <= 0) {
    return { color: 'red', text: 'Ended' };
  }
  if (emp.notice_period_remaining <= 7) {
    return { color: 'orange', text: `${emp.notice_period_remaining}d` };
  }
  return { color: 'green', text: `${emp.notice_period_remaining}d` };
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-2xl font-bold">Offboarding</h1>
        <Space>
          <Button @click="fetchData">
            <template #icon>
              <ReloadOutlined />
            </template>
          </Button>
          <Button type="primary" @click="openCreateModal">
            <template #icon>
              <PlusOutlined />
            </template>
            New Offboarding
          </Button>
        </Space>
      </div>

      <!-- Statistics Cards -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="12" :sm="8" :md="6" :lg="4">
          <Card size="small" class="offb-stat-card" @click="goToPipeline">
            <Statistic
              title="Active Processes"
              :value="stats?.active_processes || 0"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <SettingOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="8" :md="6" :lg="4">
          <Card size="small" class="offb-stat-card" @click="goToPipeline">
            <Statistic
              title="Employees"
              :value="stats?.total_employees || 0"
              :value-style="{ color: '#722ed1' }"
            >
              <template #prefix>
                <TeamOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="8" :md="6" :lg="4">
          <Card size="small" class="offb-stat-card" @click="goToResignations">
            <Statistic
              title="Pending Resignations"
              :value="stats?.pending_resignations || 0"
              :value-style="{ color: '#faad14' }"
            >
              <template #prefix>
                <FileTextOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="8" :md="6" :lg="4">
          <Card size="small" class="offb-stat-card" @click="goToPipeline">
            <Statistic
              title="Notice Period"
              :value="stats?.in_notice_period || 0"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix>
                <CalendarOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="8" :md="6" :lg="4">
          <Card size="small" class="offb-stat-card" @click="goToPipeline">
            <Statistic
              title="Ending Soon"
              :value="stats?.ending_soon || 0"
              :value-style="{ color: '#f5222d' }"
            >
              <template #prefix>
                <ClockCircleOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="8" :md="6" :lg="4">
          <Card size="small" class="offb-stat-card" @click="goToPipeline">
            <Statistic
              title="Archived"
              :value="stats?.archived || 0"
              :value-style="{ color: '#8c8c8c' }"
            >
              <template #prefix>
                <CheckCircleOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <Row :gutter="[16, 16]">
        <!-- Offboarding Templates -->
        <Col :xs="24" :lg="14">
          <Card title="Offboarding Processes" :loading="loading">
            <template #extra>
              <Button type="link" @click="openCreateModal">
                <PlusOutlined /> Add
              </Button>
            </template>

            <Table
              :columns="columns"
              :data-source="offboardings"
              :pagination="false"
              :scroll="{ x: 600 }"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <Tag :color="record.status === 'ongoing' ? 'green' : 'default'">
                    {{ record.status }}
                  </Tag>
                </template>

                <template v-if="column.key === 'stage_count'">
                  <span>{{ record.stage_count || 0 }} stages</span>
                </template>

                <template v-if="column.key === 'actions'">
                  <Space>
                    <Tooltip title="View Pipeline">
                      <Button type="link" size="small" @click="goToPipeline">
                        <ArrowRightOutlined />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button type="link" size="small" @click="openEditModal(record)">
                        <EditOutlined />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Delete">
                      <Popconfirm
                        title="Are you sure you want to delete this offboarding?"
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
                <div class="py-4 text-center text-gray-500">
                  No offboarding processes. Click "Add" to create one.
                </div>
              </template>
            </Table>
          </Card>
        </Col>

        <!-- Right Column -->
        <Col :xs="24" :lg="10">
          <!-- Pending Resignations -->
          <Card title="Pending Resignations" class="mb-4" :loading="loading">
            <template #extra>
              <Button type="link" @click="goToResignations">
                View All <ArrowRightOutlined />
              </Button>
            </template>

            <List
              :data-source="pendingResignations"
              :locale="{ emptyText: 'No pending resignations' }"
            >
              <template #renderItem="{ item }">
                <ListItem>
                  <ListItemMeta>
                    <template #avatar>
                      <Avatar
                        :src="item.employee_profile"
                        :style="{ backgroundColor: '#faad14' }"
                      >
                        {{ getInitials(item.employee_name) }}
                      </Avatar>
                    </template>
                    <template #title>
                      {{ item.employee_name }}
                    </template>
                    <template #description>
                      <div class="text-xs">
                        <span class="text-gray-500">Leave on:</span>
                        {{ formatDate(item.planned_to_leave_on) }}
                      </div>
                    </template>
                  </ListItemMeta>
                  <Tag color="orange">Pending</Tag>
                </ListItem>
              </template>
            </List>
          </Card>

          <!-- Recent Offboarding Employees -->
          <Card title="Recent Offboarding Employees" :loading="loading">
            <template #extra>
              <Button type="link" @click="goToPipeline">
                View All <ArrowRightOutlined />
              </Button>
            </template>

            <List
              :data-source="recentEmployees"
              :locale="{ emptyText: 'No employees in offboarding' }"
            >
              <template #renderItem="{ item }">
                <ListItem>
                  <ListItemMeta>
                    <template #avatar>
                      <Avatar
                        :src="item.employee_profile"
                        :style="{
                          backgroundColor:
                            stageTypeColors[item.stage_type || 'other'] === 'default'
                              ? '#8c8c8c'
                              : undefined,
                        }"
                      >
                        {{ getInitials(item.employee_name) }}
                      </Avatar>
                    </template>
                    <template #title>
                      <div class="flex items-center gap-2">
                        {{ item.employee_name }}
                        <Tag
                          :color="stageTypeColors[item.stage_type || 'other']"
                          class="m-0"
                        >
                          {{ item.stage_title }}
                        </Tag>
                      </div>
                    </template>
                    <template #description>
                      <div class="flex items-center gap-2">
                        <Progress
                          :percent="item.task_progress || 0"
                          :size="[60, 4]"
                          :show-info="false"
                        />
                        <span class="text-xs text-gray-400">
                          {{ item.completed_tasks || 0 }}/{{ item.total_tasks || 0 }}
                        </span>
                      </div>
                    </template>
                  </ListItemMeta>
                  <Tag :color="getNoticePeriodStatus(item).color">
                    {{ getNoticePeriodStatus(item).text }}
                  </Tag>
                </ListItem>
              </template>
            </List>
          </Card>
        </Col>
      </Row>

      <!-- Create/Edit Modal -->
      <Modal
        v-model:open="showModal"
        :title="editingId ? 'Edit Offboarding' : 'New Offboarding'"
        :confirm-loading="submitting"
        width="600px"
        @ok="handleSubmit"
      >
        <Form layout="vertical" class="mt-4">
          <FormItem label="Title" required>
            <Input
              v-model:value="formState.title"
              placeholder="Enter offboarding title (e.g., Q4 2024 Offboarding)"
            />
          </FormItem>

          <FormItem label="Description">
            <InputTextArea
              v-model:value="formState.description"
              :rows="3"
              placeholder="Enter description..."
            />
          </FormItem>

          <FormItem label="Status">
            <Select v-model:value="formState.status">
              <SelectOption value="ongoing">Ongoing</SelectOption>
              <SelectOption value="completed">Completed</SelectOption>
            </Select>
          </FormItem>

          <FormItem label="Managers">
            <Select
              v-model:value="formState.manager_ids"
              mode="multiple"
              placeholder="Select managers"
              show-search
              :filter-option="filterManagerOption"
              :options="managerOptions"
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  </Page>
</template>
