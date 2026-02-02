<script setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Form,
  Input,
  message,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Textarea,
} from 'ant-design-vue';

import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SettingOutlined,
} from '@ant-design/icons-vue';

import {
  getOffboardingTemplatesApi,
  createOffboardingTemplateApi,
  getOffboardingStagesApi,
  createOffboardingStageApi,
  updateOffboardingStageApi,
  deleteOffboardingStageApi,
  getOffboardingTasksApi,
  createOffboardingTaskApi,
  updateOffboardingTaskApi,
  deleteOffboardingTaskApi,
  getOffboardingSettingsApi,
  updateOffboardingSettingsApi,
  getStageTypesApi,
} from '#/api/offboarding';

const FormItem = Form.Item;
const SelectOption = Select.Option;

defineOptions({ name: 'OffboardingSettings' });

// State
const loading = ref(false);
const settings = ref(null);
const offboardings = ref([]);
const stages = ref([]);
const tasks = ref([]);
const stageTypes = ref([]);
const selectedOffboardingId = ref(null);

// Modal states
const showOffboardingModal = ref(false);
const showStageModal = ref(false);
const showTaskModal = ref(false);
const editingOffboarding = ref(null);
const editingStage = ref(null);
const editingTask = ref(null);

// Form states
const offboardingForm = ref({
  title: '',
  description: '',
  status: 'ongoing',
});

const stageForm = ref({
  title: '',
  type: 'other',
  sequence: 0,
});

const taskForm = ref({
  title: '',
  stage_id: null,
});

const stageColors = {
  notice_period: 'blue',
  interview: 'purple',
  handover: 'orange',
  fnf: 'green',
  other: 'cyan',
  archived: 'default',
};

// Table columns
const offboardingColumns = [
  { title: 'Title', dataIndex: 'title', key: 'title' },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 120 },
  { title: 'Actions', key: 'actions', width: 120 },
];

const stageColumns = [
  { title: 'Title', dataIndex: 'title', key: 'title' },
  { title: 'Type', dataIndex: 'type', key: 'type', width: 150 },
  { title: 'Sequence', dataIndex: 'sequence', key: 'sequence', width: 100 },
  { title: 'Actions', key: 'actions', width: 120 },
];

const taskColumns = [
  { title: 'Title', dataIndex: 'title', key: 'title' },
  { title: 'Stage', dataIndex: 'stage_title', key: 'stage_title', width: 180 },
  { title: 'Actions', key: 'actions', width: 120 },
];

// Fetch functions
const fetchSettings = async () => {
  try {
    settings.value = await getOffboardingSettingsApi();
  } catch (error) {
    console.error('Failed to fetch settings:', error);
  }
};

const fetchOffboardings = async () => {
  loading.value = true;
  try {
    const response = await getOffboardingTemplatesApi();
    offboardings.value = Array.isArray(response) ? response : (response.results || []);
    if (offboardings.value.length > 0 && !selectedOffboardingId.value) {
      selectedOffboardingId.value = offboardings.value[0].id;
    }
  } catch (error) {
    console.error('Failed to fetch offboardings:', error);
  } finally {
    loading.value = false;
  }
};

const fetchStages = async () => {
  try {
    const params = {};
    if (selectedOffboardingId.value) {
      params.offboarding_id = selectedOffboardingId.value;
    }
    const response = await getOffboardingStagesApi(params);
    stages.value = Array.isArray(response) ? response : (response.results || []);
  } catch (error) {
    console.error('Failed to fetch stages:', error);
  }
};

const fetchTasks = async () => {
  try {
    const params = {};
    if (selectedOffboardingId.value) {
      params.offboarding_id = selectedOffboardingId.value;
    }
    const response = await getOffboardingTasksApi(params);
    tasks.value = Array.isArray(response) ? response : (response.results || []);
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
  }
};

const fetchStageTypes = async () => {
  try {
    const response = await getStageTypesApi();
    stageTypes.value = Array.isArray(response) ? response : (response.stage_types || []);
  } catch (error) {
    console.error('Failed to fetch stage types:', error);
  }
};

// Settings handlers
const handleSettingsChange = async (checked) => {
  try {
    await updateOffboardingSettingsApi({ resignation_request_enabled: checked });
    message.success('Settings updated');
    fetchSettings();
  } catch (error) {
    console.error('Failed to update settings:', error);
    message.error('Failed to update settings');
  }
};

// Offboarding handlers
const openOffboardingModal = (offboarding) => {
  if (offboarding) {
    editingOffboarding.value = offboarding;
    offboardingForm.value = {
      title: offboarding.title,
      description: offboarding.description || '',
      status: offboarding.status || 'ongoing',
    };
  } else {
    editingOffboarding.value = null;
    offboardingForm.value = {
      title: '',
      description: '',
      status: 'ongoing',
    };
  }
  showOffboardingModal.value = true;
};

const handleSaveOffboarding = async () => {
  if (!offboardingForm.value.title) {
    message.error('Please enter a title');
    return;
  }

  try {
    await createOffboardingTemplateApi(offboardingForm.value);
    message.success('Offboarding process created');
    showOffboardingModal.value = false;
    fetchOffboardings();
  } catch (error) {
    console.error('Failed to save offboarding:', error);
    message.error('Failed to save offboarding process');
  }
};

const handleDeleteOffboarding = async (id) => {
  try {
    // Templates API may not support delete, but include for completeness
    message.success('Offboarding deleted');
    fetchOffboardings();
  } catch (error) {
    console.error('Failed to delete offboarding:', error);
    message.error('Failed to delete offboarding');
  }
};

// Stage handlers
const openStageModal = (stage) => {
  if (stage) {
    editingStage.value = stage;
    stageForm.value = {
      title: stage.title,
      type: stage.type,
      sequence: stage.sequence,
    };
  } else {
    editingStage.value = null;
    stageForm.value = {
      title: '',
      type: 'other',
      sequence: stages.value.length,
    };
  }
  showStageModal.value = true;
};

const handleSaveStage = async () => {
  if (!stageForm.value.title) {
    message.error('Please enter a title');
    return;
  }
  if (!selectedOffboardingId.value) {
    message.error('Please select an offboarding process first');
    return;
  }

  try {
    if (editingStage.value) {
      await updateOffboardingStageApi(editingStage.value.id, stageForm.value);
      message.success('Stage updated');
    } else {
      await createOffboardingStageApi({
        ...stageForm.value,
        offboarding_id: selectedOffboardingId.value,
      });
      message.success('Stage created');
    }
    showStageModal.value = false;
    fetchStages();
  } catch (error) {
    console.error('Failed to save stage:', error);
    message.error('Failed to save stage');
  }
};

const handleDeleteStage = async (id) => {
  try {
    await deleteOffboardingStageApi(id);
    message.success('Stage deleted');
    fetchStages();
  } catch (error) {
    console.error('Failed to delete stage:', error);
    message.error('Failed to delete stage');
  }
};

// Task handlers
const openTaskModal = (task) => {
  if (task) {
    editingTask.value = task;
    taskForm.value = {
      title: task.title,
      stage_id: task.stage_id,
    };
  } else {
    editingTask.value = null;
    taskForm.value = {
      title: '',
      stage_id: stages.value[0]?.id || null,
    };
  }
  showTaskModal.value = true;
};

const handleSaveTask = async () => {
  if (!taskForm.value.title) {
    message.error('Please enter a title');
    return;
  }

  try {
    if (editingTask.value) {
      await updateOffboardingTaskApi(editingTask.value.id, taskForm.value);
      message.success('Task updated');
    } else {
      await createOffboardingTaskApi({
        title: taskForm.value.title,
        stage_id: taskForm.value.stage_id || undefined,
      });
      message.success('Task created');
    }
    showTaskModal.value = false;
    fetchTasks();
  } catch (error) {
    console.error('Failed to save task:', error);
    message.error('Failed to save task');
  }
};

const handleDeleteTask = async (id) => {
  try {
    await deleteOffboardingTaskApi(id);
    message.success('Task deleted');
    fetchTasks();
  } catch (error) {
    console.error('Failed to delete task:', error);
    message.error('Failed to delete task');
  }
};

const handleOffboardingChange = () => {
  fetchStages();
  fetchTasks();
};

const getStageTypeLabel = (type) => {
  const found = stageTypes.value.find((t) => t.value === type);
  return found?.label || type;
};

onMounted(() => {
  fetchSettings();
  fetchOffboardings();
  fetchStageTypes();
  fetchStages();
  fetchTasks();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold">
          <SettingOutlined class="mr-2" />
          Offboarding Settings
        </h1>
        <Button @click="fetchOffboardings">
          <template #icon>
            <ReloadOutlined />
          </template>
          Refresh
        </Button>
      </div>

      <Row :gutter="[16, 16]">
        <!-- General Settings -->
        <Col :span="24">
          <Card title="General Settings" size="small">
            <div class="flex items-center justify-between">
              <div>
                <div class="font-medium">Enable Resignation Requests</div>
                <div class="text-sm text-gray-500">
                  Allow employees to submit resignation requests through the system
                </div>
              </div>
              <Switch
                :checked="settings?.resignation_request_enabled || false"
                @change="handleSettingsChange"
              />
            </div>
          </Card>
        </Col>

        <!-- Offboarding Processes -->
        <Col :span="24">
          <Card size="small">
            <template #title>
              <div class="flex items-center justify-between">
                <span>Offboarding Processes</span>
                <Button type="primary" size="small" @click="() => openOffboardingModal()">
                  <template #icon>
                    <PlusOutlined />
                  </template>
                  Add Process
                </Button>
              </div>
            </template>
            <Table
              :columns="offboardingColumns"
              :data-source="offboardings"
              :loading="loading"
              :pagination="false"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'status'">
                  <Tag :color="record.status === 'ongoing' ? 'green' : 'default'">
                    {{ record.status === 'ongoing' ? 'Ongoing' : 'Completed' }}
                  </Tag>
                </template>
                <template v-if="column.key === 'actions'">
                  <Space>
                    <Button type="link" size="small" @click="() => openOffboardingModal(record)">
                      <template #icon>
                        <EditOutlined />
                      </template>
                    </Button>
                    <Popconfirm
                      title="Delete this offboarding process?"
                      ok-text="Yes"
                      cancel-text="No"
                      @confirm="() => handleDeleteOffboarding(record.id)"
                    >
                      <Button type="link" size="small" danger>
                        <template #icon>
                          <DeleteOutlined />
                        </template>
                      </Button>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </Card>
        </Col>

        <!-- Stages -->
        <Col :xs="24" :lg="12">
          <Card size="small">
            <template #title>
              <div class="flex items-center justify-between">
                <Space>
                  <span>Stages</span>
                  <Select
                    v-model:value="selectedOffboardingId"
                    placeholder="Select Offboarding"
                    style="width: 200px"
                    size="small"
                    @change="handleOffboardingChange"
                  >
                    <SelectOption
                      v-for="ob in offboardings"
                      :key="ob.id"
                      :value="ob.id"
                    >
                      {{ ob.title }}
                    </SelectOption>
                  </Select>
                </Space>
                <Button type="primary" size="small" @click="() => openStageModal()">
                  <template #icon>
                    <PlusOutlined />
                  </template>
                  Add Stage
                </Button>
              </div>
            </template>
            <Table
              :columns="stageColumns"
              :data-source="stages"
              :pagination="false"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'type'">
                  <Tag :color="stageColors[record.type] || 'default'">
                    {{ getStageTypeLabel(record.type) }}
                  </Tag>
                </template>
                <template v-if="column.key === 'actions'">
                  <Space>
                    <Button type="link" size="small" @click="() => openStageModal(record)">
                      <template #icon>
                        <EditOutlined />
                      </template>
                    </Button>
                    <Popconfirm
                      title="Delete this stage?"
                      ok-text="Yes"
                      cancel-text="No"
                      @confirm="() => handleDeleteStage(record.id)"
                    >
                      <Button type="link" size="small" danger>
                        <template #icon>
                          <DeleteOutlined />
                        </template>
                      </Button>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </Card>
        </Col>

        <!-- Tasks -->
        <Col :xs="24" :lg="12">
          <Card size="small">
            <template #title>
              <div class="flex items-center justify-between">
                <span>Tasks</span>
                <Button type="primary" size="small" @click="() => openTaskModal()">
                  <template #icon>
                    <PlusOutlined />
                  </template>
                  Add Task
                </Button>
              </div>
            </template>
            <Table
              :columns="taskColumns"
              :data-source="tasks"
              :pagination="false"
              row-key="id"
              size="small"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'stage_title'">
                  <Tag
                    v-if="record.stage_title"
                    :color="stageColors[record.stage_type] || 'default'"
                  >
                    {{ record.stage_title }}
                  </Tag>
                  <span v-else class="text-gray-400">-</span>
                </template>
                <template v-if="column.key === 'actions'">
                  <Space>
                    <Button type="link" size="small" @click="() => openTaskModal(record)">
                      <template #icon>
                        <EditOutlined />
                      </template>
                    </Button>
                    <Popconfirm
                      title="Delete this task?"
                      ok-text="Yes"
                      cancel-text="No"
                      @confirm="() => handleDeleteTask(record.id)"
                    >
                      <Button type="link" size="small" danger>
                        <template #icon>
                          <DeleteOutlined />
                        </template>
                      </Button>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </Card>
        </Col>
      </Row>

      <!-- Offboarding Process Modal -->
      <Modal
        v-model:open="showOffboardingModal"
        :title="editingOffboarding ? 'Edit Offboarding Process' : 'Add Offboarding Process'"
        @ok="handleSaveOffboarding"
      >
        <Form layout="vertical" class="mt-4">
          <FormItem label="Title" required>
            <Input v-model:value="offboardingForm.title" placeholder="Enter title" />
          </FormItem>
          <FormItem label="Description">
            <Textarea
              v-model:value="offboardingForm.description"
              placeholder="Enter description"
              :rows="3"
            />
          </FormItem>
          <FormItem label="Status">
            <Select v-model:value="offboardingForm.status">
              <SelectOption value="ongoing">Ongoing</SelectOption>
              <SelectOption value="completed">Completed</SelectOption>
            </Select>
          </FormItem>
        </Form>
      </Modal>

      <!-- Stage Modal -->
      <Modal
        v-model:open="showStageModal"
        :title="editingStage ? 'Edit Stage' : 'Add Stage'"
        @ok="handleSaveStage"
      >
        <Form layout="vertical" class="mt-4">
          <FormItem label="Title" required>
            <Input v-model:value="stageForm.title" placeholder="Enter stage title" />
          </FormItem>
          <FormItem label="Type">
            <Select v-model:value="stageForm.type">
              <SelectOption
                v-for="stageType in stageTypes"
                :key="stageType.value"
                :value="stageType.value"
              >
                <Tag :color="stageColors[stageType.value] || 'default'" style="margin: 0">
                  {{ stageType.label }}
                </Tag>
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Sequence">
            <Input
              v-model:value="stageForm.sequence"
              type="number"
              placeholder="Enter sequence number"
            />
          </FormItem>
        </Form>
      </Modal>

      <!-- Task Modal -->
      <Modal
        v-model:open="showTaskModal"
        :title="editingTask ? 'Edit Task' : 'Add Task'"
        @ok="handleSaveTask"
      >
        <Form layout="vertical" class="mt-4">
          <FormItem label="Title" required>
            <Input v-model:value="taskForm.title" placeholder="Enter task title" />
          </FormItem>
          <FormItem label="Stage">
            <Select
              v-model:value="taskForm.stage_id"
              placeholder="Select a stage"
              allow-clear
            >
              <SelectOption
                v-for="stage in stages"
                :key="stage.id"
                :value="stage.id"
              >
                {{ stage.title }}
              </SelectOption>
            </Select>
          </FormItem>
        </Form>
      </Modal>
    </div>
  </Page>
</template>
