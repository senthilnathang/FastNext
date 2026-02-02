<script setup>
import { ref, reactive, computed, onMounted, watch } from 'vue';
import { Page } from '@vben/common-ui';
import { requestClient } from '#/api/request';
import { useListView, useModal, useNotification } from '#/composables';
import {
  Card,
  Col,
  Collapse,
  Divider,
  Drawer,
  Empty,
  Form,
  Input,
  InputNumber,
  List,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Switch,
  Table,
  Tabs,
  Tag,
  Textarea,
  Tooltip,
  Button,
  Checkbox,
  Badge,
} from 'ant-design-vue';

const CollapsePanel = Collapse.Panel;
const FormItem = Form.Item;
const ListItem = List.Item;
const ListItemMeta = List.Item.Meta;
const SelectOption = Select.Option;
const TabPane = Tabs.TabPane;
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CopyOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  FolderOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  UnorderedListOutlined,
} from '@ant-design/icons-vue';

defineOptions({ name: 'OnboardingTemplates' });

const BASE = '/onboarding';
const notify = useNotification();

// -- List view composable --
const listView = useListView({ defaultPageSize: 20 });

// -- Stage types --
const stageTypes = ref([]);

// -- Status filter --
const statusFilter = ref(undefined);

// -- Detail / drawer state --
const drawerVisible = ref(false);
const drawerMode = ref('view');
const drawerLoading = ref(false);
const selectedTemplate = ref(null);
const activeTab = ref('basic');

// -- Stage modal --
const stageModal = useModal();
const stageModalMode = ref('create');
const stageModalLoading = ref(false);
const selectedStage = ref(null);

// -- Task modal --
const taskModal = useModal();
const taskModalMode = ref('create');
const taskModalLoading = ref(false);
const selectedTask = ref(null);
const taskParentStageId = ref(null);

// -- Template form --
const templateFormRef = ref(null);
const templateForm = reactive({
  name: '',
  description: '',
  department: '',
  estimated_duration_days: 30,
  is_default: false,
  status: 'draft',
  auto_convert: false,
  require_all_documents: false,
  require_all_tasks: false,
});

const templateRules = {
  name: [{ required: true, message: 'Template name is required' }],
  estimated_duration_days: [{ required: true, message: 'Duration is required' }],
  status: [{ required: true, message: 'Status is required' }],
};

// -- Stage form --
const stageFormRef = ref(null);
const stageForm = reactive({
  name: '',
  description: '',
  order: 1,
  estimated_days: 7,
  is_mandatory: true,
  requires_approval: false,
  stage_type: undefined,
});

const stageRules = {
  name: [{ required: true, message: 'Stage name is required' }],
};

// -- Task form --
const taskFormRef = ref(null);
const taskForm = reactive({
  name: '',
  description: '',
  task_type: 'action',
  order: 1,
  estimated_hours: 1,
  is_mandatory: true,
  requires_approval: false,
  instructions: '',
  document_template_url: '',
});

const taskRules = {
  name: [{ required: true, message: 'Task name is required' }],
};

const taskTypeOptions = [
  { value: 'document', label: 'Document' },
  { value: 'approval', label: 'Approval' },
  { value: 'action', label: 'Action' },
  { value: 'meeting', label: 'Meeting' },
  { value: 'training', label: 'Training' },
];

const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'active', label: 'Active', color: 'green' },
  { value: 'archived', label: 'Archived', color: 'orange' },
];

// -- Columns --
const columns = [
  { title: 'Name', dataIndex: 'name', key: 'name', ellipsis: true },
  { title: 'Department', dataIndex: 'department', key: 'department', width: 140 },
  { title: 'Duration (days)', dataIndex: 'estimated_duration_days', key: 'duration', width: 130, align: 'center' },
  { title: 'Default', dataIndex: 'is_default', key: 'is_default', width: 90, align: 'center' },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 100, align: 'center' },
  { title: 'Stages', dataIndex: 'stage_count', key: 'stage_count', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 180, fixed: 'right' },
];

// ==================== Data fetching ====================

async function fetchStageTypes() {
  try {
    const res = await requestClient.get(BASE + '/stage-types');
    if (Array.isArray(res)) {
      stageTypes.value = res;
    } else if (res && Array.isArray(res.results)) {
      stageTypes.value = res.results;
    }
  } catch (err) {
    stageTypes.value = [];
  }
}

async function fetchTemplates() {
  listView.loading.value = true;
  try {
    const params = listView.getQueryParams();
    if (statusFilter.value) {
      params.status = statusFilter.value;
    }
    const res = await requestClient.get(BASE + '/templates', { params: params });
    if (res && res.results) {
      listView.dataSource.value = res.results;
      listView.setTotal(res.count || 0);
    } else if (Array.isArray(res)) {
      listView.dataSource.value = res;
      listView.setTotal(res.length);
    }
  } catch (err) {
    notify.error('Error', 'Failed to load templates');
  } finally {
    listView.loading.value = false;
  }
}

async function fetchTemplateDetail(id) {
  drawerLoading.value = true;
  try {
    const res = await requestClient.get(BASE + '/templates/' + id, { cache: false });
    selectedTemplate.value = res;
    return res;
  } catch (err) {
    notify.error('Error', 'Failed to load template details');
    return null;
  } finally {
    drawerLoading.value = false;
  }
}

// ==================== Table handlers ====================

function handleTableChange(pag, filters, sorter) {
  listView.handleTableChange(pag, filters, sorter);
  fetchTemplates();
}

watch(() => listView.searchText.value, () => {
  listView.pagination.current = 1;
  fetchTemplates();
});

watch(statusFilter, () => {
  listView.pagination.current = 1;
  fetchTemplates();
});

// ==================== Template CRUD ====================

function resetTemplateForm() {
  templateForm.name = '';
  templateForm.description = '';
  templateForm.department = '';
  templateForm.estimated_duration_days = 30;
  templateForm.is_default = false;
  templateForm.status = 'draft';
  templateForm.auto_convert = false;
  templateForm.require_all_documents = false;
  templateForm.require_all_tasks = false;
}

function openCreateDrawer() {
  resetTemplateForm();
  selectedTemplate.value = null;
  drawerMode.value = 'create';
  activeTab.value = 'basic';
  drawerVisible.value = true;
}

async function openEditDrawer(record) {
  drawerMode.value = 'edit';
  activeTab.value = 'basic';
  drawerVisible.value = true;
  const detail = await fetchTemplateDetail(record.id);
  if (detail) {
    templateForm.name = detail.name || '';
    templateForm.description = detail.description || '';
    templateForm.department = detail.department || '';
    templateForm.estimated_duration_days = detail.estimated_duration_days || 30;
    templateForm.is_default = !!detail.is_default;
    templateForm.status = detail.status || 'draft';
    templateForm.auto_convert = !!detail.auto_convert;
    templateForm.require_all_documents = !!detail.require_all_documents;
    templateForm.require_all_tasks = !!detail.require_all_tasks;
  }
}

async function openViewDrawer(record) {
  drawerMode.value = 'view';
  activeTab.value = 'basic';
  drawerVisible.value = true;
  await fetchTemplateDetail(record.id);
}

async function handleTemplateSave() {
  try {
    await templateFormRef.value.validate();
  } catch (e) {
    return;
  }
  drawerLoading.value = true;
  try {
    if (drawerMode.value === 'create') {
      await requestClient.post(BASE + '/templates', templateForm);
      notify.success('Success', 'Template created');
    } else if (drawerMode.value === 'edit' && selectedTemplate.value) {
      await requestClient.put(BASE + '/templates/' + selectedTemplate.value.id, templateForm);
      notify.success('Success', 'Template updated');
    }
    drawerVisible.value = false;
    fetchTemplates();
  } catch (err) {
    notify.error('Error', 'Failed to save template');
  } finally {
    drawerLoading.value = false;
  }
}

async function handleDeleteTemplate(record) {
  try {
    await requestClient.delete(BASE + '/templates/' + record.id);
    notify.success('Deleted', 'Template deleted');
    fetchTemplates();
  } catch (err) {
    notify.error('Error', 'Failed to delete template');
  }
}

async function handleCloneTemplate(record) {
  try {
    await requestClient.post(BASE + '/templates/' + record.id + '/clone');
    notify.success('Cloned', 'Template cloned successfully');
    fetchTemplates();
  } catch (err) {
    notify.error('Error', 'Failed to clone template');
  }
}

async function handleDefaultToggle(record, checked) {
  try {
    await requestClient.put(BASE + '/templates/' + record.id, { is_default: checked });
    fetchTemplates();
  } catch (err) {
    notify.error('Error', 'Failed to update default status');
    fetchTemplates();
  }
}

// ==================== Drawer helpers ====================

const drawerTitle = computed(() => {
  if (drawerMode.value === 'create') return 'Create Template';
  if (drawerMode.value === 'edit') return 'Edit Template';
  return 'Template Details';
});

// ==================== Stage CRUD ====================

function resetStageForm() {
  stageForm.name = '';
  stageForm.description = '';
  stageForm.order = selectedTemplate.value && selectedTemplate.value.stages
    ? selectedTemplate.value.stages.length + 1 : 1;
  stageForm.estimated_days = 7;
  stageForm.is_mandatory = true;
  stageForm.requires_approval = false;
  stageForm.stage_type = undefined;
}

function handleStageTypeChange(value) {
  if (!value) return;
  let found = null;
  for (let i = 0; i < stageTypes.value.length; i++) {
    if (stageTypes.value[i].id === value || stageTypes.value[i].name === value) {
      found = stageTypes.value[i];
      break;
    }
  }
  if (found) {
    if (found.name) stageForm.name = found.name;
    if (found.description) stageForm.description = found.description;
    if (found.estimated_days) stageForm.estimated_days = found.estimated_days;
  }
}

function openStageCreate() {
  resetStageForm();
  stageModalMode.value = 'create';
  selectedStage.value = null;
  stageModal.open();
}

function openStageEdit(stage) {
  stageModalMode.value = 'edit';
  selectedStage.value = stage;
  stageForm.name = stage.name || '';
  stageForm.description = stage.description || '';
  stageForm.order = stage.order || 1;
  stageForm.estimated_days = stage.estimated_days || 7;
  stageForm.is_mandatory = stage.is_mandatory !== false;
  stageForm.requires_approval = !!stage.requires_approval;
  stageForm.stage_type = stage.stage_type || undefined;
  stageModal.open();
}

async function handleStageSave() {
  try {
    if (stageFormRef.value) await stageFormRef.value.validate();
  } catch (e) {
    return;
  }
  if (!selectedTemplate.value) return;
  stageModalLoading.value = true;
  try {
    const payload = Object.assign({}, stageForm, { template_id: selectedTemplate.value.id });
    if (stageModalMode.value === 'create') {
      await requestClient.post(BASE + '/stages', payload);
      notify.success('Success', 'Stage added');
    } else if (selectedStage.value) {
      await requestClient.put(BASE + '/stages/' + selectedStage.value.id, stageForm);
      notify.success('Success', 'Stage updated');
    }
    stageModal.close();
    await fetchTemplateDetail(selectedTemplate.value.id);
  } catch (err) {
    notify.error('Error', 'Failed to save stage');
  } finally {
    stageModalLoading.value = false;
  }
}

async function handleDeleteStage(stageId) {
  if (!selectedTemplate.value) return;
  try {
    await requestClient.delete(BASE + '/stages/' + stageId);
    notify.success('Deleted', 'Stage deleted');
    await fetchTemplateDetail(selectedTemplate.value.id);
  } catch (err) {
    notify.error('Error', 'Failed to delete stage');
  }
}

// ==================== Task CRUD ====================

function resetTaskForm() {
  taskForm.name = '';
  taskForm.description = '';
  taskForm.task_type = 'action';
  taskForm.order = 1;
  taskForm.estimated_hours = 1;
  taskForm.is_mandatory = true;
  taskForm.requires_approval = false;
  taskForm.instructions = '';
  taskForm.document_template_url = '';
}

function openTaskCreate(stageId) {
  resetTaskForm();
  taskModalMode.value = 'create';
  taskParentStageId.value = stageId;
  selectedTask.value = null;
  taskModal.open();
}

function openTaskEdit(stageId, task) {
  taskModalMode.value = 'edit';
  taskParentStageId.value = stageId;
  selectedTask.value = task;
  taskForm.name = task.name || '';
  taskForm.description = task.description || '';
  taskForm.task_type = task.task_type || 'action';
  taskForm.order = task.order || 1;
  taskForm.estimated_hours = task.estimated_hours || 1;
  taskForm.is_mandatory = task.is_mandatory !== false;
  taskForm.requires_approval = !!task.requires_approval;
  taskForm.instructions = task.instructions || '';
  taskForm.document_template_url = task.document_template_url || '';
  taskModal.open();
}

async function handleTaskSave() {
  try {
    if (taskFormRef.value) await taskFormRef.value.validate();
  } catch (e) {
    return;
  }
  if (!selectedTemplate.value || !taskParentStageId.value) return;
  taskModalLoading.value = true;
  try {
    const payload = Object.assign({}, taskForm, { stage_id: taskParentStageId.value });
    if (taskModalMode.value === 'create') {
      await requestClient.post(BASE + '/task-templates', payload);
      notify.success('Success', 'Task added');
    } else if (selectedTask.value) {
      await requestClient.post(BASE + '/task-templates', Object.assign({}, payload, { id: selectedTask.value.id }));
      notify.success('Success', 'Task updated');
    }
    taskModal.close();
    await fetchTemplateDetail(selectedTemplate.value.id);
  } catch (err) {
    notify.error('Error', 'Failed to save task');
  } finally {
    taskModalLoading.value = false;
  }
}

async function handleDeleteTask(taskId) {
  if (!selectedTemplate.value) return;
  try {
    await requestClient.delete(BASE + '/task-templates/' + taskId);
    notify.success('Deleted', 'Task deleted');
    await fetchTemplateDetail(selectedTemplate.value.id);
  } catch (err) {
    notify.error('Error', 'Failed to delete task');
  }
}

// ==================== Helpers ====================

function getTaskTypeColor(type) {
  const map = {
    document: 'blue',
    approval: 'green',
    action: 'default',
    meeting: 'purple',
    training: 'orange',
  };
  return map[type] || 'default';
}

function getStatusColor(status) {
  const map = {
    draft: 'default',
    active: 'green',
    archived: 'orange',
  };
  return map[status] || 'default';
}

function getStatusLabel(status) {
  const map = {
    draft: 'Draft',
    active: 'Active',
    archived: 'Archived',
  };
  return map[status] || status || 'Draft';
}

// ==================== Lifecycle ====================

onMounted(() => {
  fetchTemplates();
  fetchStageTypes();
});
</script>

<template>
  <Page auto-content-height>
    <div class="mv-p-4">
      <!-- Header -->
      <div class="mv-page-header mv-mb-4">
        <div>
          <h2 class="mv-page-title">Onboarding Templates</h2>
          <p class="mv-text-secondary">Manage onboarding workflow templates</p>
        </div>
        <Space>
          <Button @click="fetchTemplates">
            <template #icon><ReloadOutlined /></template>
          </Button>
          <Button type="primary" @click="openCreateDrawer">
            <template #icon><PlusOutlined /></template>
            Create Template
          </Button>
        </Space>
      </div>

      <!-- Search & Table -->
      <Card class="mv-mb-4">
        <div class="mv-toolbar mv-mb-3">
          <Input
            v-model:value="listView.searchText.value"
            placeholder="Search templates..."
            allow-clear
            class="mv-w-input-lg"
          >
            <template #prefix><SearchOutlined /></template>
          </Input>
          <Select
            v-model:value="statusFilter"
            placeholder="Filter by status"
            allow-clear
            class="mv-w-input"
            style="min-width: 160px"
          >
            <SelectOption
              v-for="opt in statusOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </SelectOption>
          </Select>
        </div>

        <Table
          :columns="columns"
          :data-source="listView.dataSource.value"
          :loading="listView.loading.value"
          :pagination="listView.pagination"
          :scroll="{ x: 900 }"
          row-key="id"
          size="middle"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <a class="mv-tpl-name-link" @click="openViewDrawer(record)">
                {{ record.name }}
              </a>
              <div v-if="record.description" class="mv-tpl-desc">
                {{ record.description }}
              </div>
            </template>

            <template v-if="column.key === 'duration'">
              {{ record.estimated_duration_days }} days
            </template>

            <template v-if="column.key === 'is_default'">
              <Switch
                :checked="record.is_default"
                size="small"
                @change="(val) => handleDefaultToggle(record, val)"
              />
            </template>

            <template v-if="column.key === 'status'">
              <Tag :color="getStatusColor(record.status)">
                {{ getStatusLabel(record.status) }}
              </Tag>
            </template>

            <template v-if="column.key === 'stage_count'">
              <Tag>{{ record.stage_count || 0 }}</Tag>
            </template>

            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="View">
                  <Button type="link" size="small" @click="openViewDrawer(record)">
                    <template #icon><EyeOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button type="link" size="small" @click="openEditDrawer(record)">
                    <template #icon><EditOutlined /></template>
                  </Button>
                </Tooltip>
                <Tooltip title="Clone">
                  <Button type="link" size="small" @click="handleCloneTemplate(record)">
                    <template #icon><CopyOutlined /></template>
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Delete this template?"
                  ok-text="Yes"
                  cancel-text="No"
                  @confirm="handleDeleteTemplate(record)"
                >
                  <Tooltip title="Delete">
                    <Button type="link" size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <!-- Template Detail / Edit Drawer -->
      <Drawer
        v-model:open="drawerVisible"
        :title="drawerTitle"
        :width="780"
        :destroy-on-close="true"
      >
        <Spin :spinning="drawerLoading">
          <Tabs v-model:activeKey="activeTab">
            <!-- Basic Info Tab -->
            <TabPane key="basic" tab="Basic Info">
              <!-- View mode -->
              <div v-if="drawerMode === 'view' && selectedTemplate" class="mv-tpl-view">
                <Row :gutter="[16, 16]">
                  <Col :span="16">
                    <h3 class="mv-tpl-view-title">{{ selectedTemplate.name }}</h3>
                    <p v-if="selectedTemplate.description" class="mv-text-secondary">
                      {{ selectedTemplate.description }}
                    </p>
                  </Col>
                  <Col :span="8" class="mv-text-right">
                    <Tag v-if="selectedTemplate.is_default" color="blue">Default</Tag>
                    <Tag :color="getStatusColor(selectedTemplate.status)">
                      {{ getStatusLabel(selectedTemplate.status) }}
                    </Tag>
                  </Col>
                </Row>
                <Divider />
                <Row :gutter="[16, 16]">
                  <Col :span="8">
                    <div class="mv-tpl-stat-label">Department</div>
                    <div class="mv-tpl-stat-value">{{ selectedTemplate.department || '-' }}</div>
                  </Col>
                  <Col :span="8">
                    <div class="mv-tpl-stat-label">Duration</div>
                    <div class="mv-tpl-stat-value">{{ selectedTemplate.estimated_duration_days || 0 }} days</div>
                  </Col>
                  <Col :span="8">
                    <div class="mv-tpl-stat-label">Stages</div>
                    <div class="mv-tpl-stat-value">{{ selectedTemplate.stages ? selectedTemplate.stages.length : 0 }}</div>
                  </Col>
                </Row>
                <Divider />
                <Row :gutter="[16, 16]">
                  <Col :span="8">
                    <div class="mv-tpl-stat-label">Auto-convert</div>
                    <div class="mv-tpl-stat-value">{{ selectedTemplate.auto_convert ? 'Yes' : 'No' }}</div>
                  </Col>
                  <Col :span="8">
                    <div class="mv-tpl-stat-label">Require all documents</div>
                    <div class="mv-tpl-stat-value">{{ selectedTemplate.require_all_documents ? 'Yes' : 'No' }}</div>
                  </Col>
                  <Col :span="8">
                    <div class="mv-tpl-stat-label">Require all tasks</div>
                    <div class="mv-tpl-stat-value">{{ selectedTemplate.require_all_tasks ? 'Yes' : 'No' }}</div>
                  </Col>
                </Row>
              </div>

              <!-- Create / Edit mode -->
              <Form
                v-if="drawerMode !== 'view'"
                ref="templateFormRef"
                :model="templateForm"
                :rules="templateRules"
                layout="vertical"
              >
                <FormItem label="Template Name" name="name">
                  <Input v-model:value="templateForm.name" placeholder="Enter template name" />
                </FormItem>
                <FormItem label="Description" name="description">
                  <Textarea
                    v-model:value="templateForm.description"
                    :rows="3"
                    placeholder="Template description"
                  />
                </FormItem>
                <Row :gutter="16">
                  <Col :span="8">
                    <FormItem label="Department" name="department">
                      <Input v-model:value="templateForm.department" placeholder="Department" />
                    </FormItem>
                  </Col>
                  <Col :span="8">
                    <FormItem label="Duration (days)" name="estimated_duration_days">
                      <InputNumber
                        v-model:value="templateForm.estimated_duration_days"
                        :min="1"
                        :max="365"
                        style="width: 100%"
                      />
                    </FormItem>
                  </Col>
                  <Col :span="8">
                    <FormItem label="Status" name="status">
                      <Select v-model:value="templateForm.status">
                        <SelectOption
                          v-for="opt in statusOptions"
                          :key="opt.value"
                          :value="opt.value"
                        >
                          {{ opt.label }}
                        </SelectOption>
                      </Select>
                    </FormItem>
                  </Col>
                </Row>
                <Row :gutter="16">
                  <Col :span="12">
                    <FormItem name="is_default">
                      <Checkbox v-model:checked="templateForm.is_default">
                        Set as default template
                      </Checkbox>
                    </FormItem>
                  </Col>
                </Row>

                <Divider orientation="left">Template Settings</Divider>
                <Row :gutter="16">
                  <Col :span="8">
                    <FormItem name="auto_convert">
                      <Checkbox v-model:checked="templateForm.auto_convert">
                        Auto-convert candidate on completion
                      </Checkbox>
                    </FormItem>
                  </Col>
                  <Col :span="8">
                    <FormItem name="require_all_documents">
                      <Checkbox v-model:checked="templateForm.require_all_documents">
                        Require all documents before completion
                      </Checkbox>
                    </FormItem>
                  </Col>
                  <Col :span="8">
                    <FormItem name="require_all_tasks">
                      <Checkbox v-model:checked="templateForm.require_all_tasks">
                        Require all tasks before completion
                      </Checkbox>
                    </FormItem>
                  </Col>
                </Row>
              </Form>
            </TabPane>

            <!-- Stages & Tasks Tab -->
            <TabPane key="stages" tab="Stages & Tasks" :disabled="drawerMode === 'create'">
              <div v-if="selectedTemplate" class="mv-tpl-stages">
                <div class="mv-row-between mv-mb-3">
                  <span class="mv-text-secondary">
                    {{ selectedTemplate.stages ? selectedTemplate.stages.length : 0 }} stage(s) configured
                  </span>
                  <Button
                    v-if="drawerMode !== 'view'"
                    type="primary"
                    size="small"
                    @click="openStageCreate"
                  >
                    <template #icon><PlusOutlined /></template>
                    Add Stage
                  </Button>
                </div>

                <Collapse
                  v-if="selectedTemplate.stages && selectedTemplate.stages.length"
                  accordion
                >
                  <CollapsePanel
                    v-for="stage in selectedTemplate.stages"
                    :key="stage.id"
                    :header="stage.name"
                  >
                    <template #extra>
                      <Space @click.stop>
                        <Tag v-if="stage.is_mandatory" color="red">Required</Tag>
                        <Tag>{{ stage.estimated_days || 0 }}d</Tag>
                        <Button
                          v-if="drawerMode !== 'view'"
                          type="text"
                          size="small"
                          @click="openStageEdit(stage)"
                        >
                          <template #icon><EditOutlined /></template>
                        </Button>
                        <Popconfirm
                          v-if="drawerMode !== 'view'"
                          title="Delete this stage and all its tasks?"
                          ok-text="Yes"
                          cancel-text="No"
                          @confirm="handleDeleteStage(stage.id)"
                        >
                          <Button type="text" size="small" danger>
                            <template #icon><DeleteOutlined /></template>
                          </Button>
                        </Popconfirm>
                      </Space>
                    </template>

                    <p v-if="stage.description" class="mv-text-secondary mv-mb-2">
                      {{ stage.description }}
                    </p>
                    <div v-if="stage.requires_approval" class="mv-mb-2">
                      <Tag color="orange">Requires Approval</Tag>
                    </div>

                    <Divider orientation="left" orientation-margin="0">
                      <span class="mv-tpl-task-heading">
                        Tasks ({{ stage.tasks ? stage.tasks.length : 0 }})
                      </span>
                    </Divider>

                    <List
                      v-if="stage.tasks && stage.tasks.length"
                      size="small"
                      :data-source="stage.tasks"
                    >
                      <template #renderItem="{ item: task }">
                        <ListItem>
                          <ListItemMeta>
                            <template #title>
                              <Space>
                                <span>{{ task.name }}</span>
                                <Tag :color="getTaskTypeColor(task.task_type)" size="small">
                                  {{ task.task_type }}
                                </Tag>
                                <Tag v-if="task.is_mandatory" color="red" size="small">Required</Tag>
                              </Space>
                            </template>
                            <template #description>
                              <span v-if="task.estimated_hours">{{ task.estimated_hours }}h</span>
                              <span v-if="task.description" class="mv-ml-2">{{ task.description }}</span>
                              <span v-if="task.document_template_url" class="mv-ml-2">
                                <Tag color="blue" size="small">Has Document Template</Tag>
                              </span>
                            </template>
                          </ListItemMeta>
                          <template v-if="drawerMode !== 'view'" #actions>
                            <Button
                              type="text"
                              size="small"
                              @click="openTaskEdit(stage.id, task)"
                            >
                              <template #icon><EditOutlined /></template>
                            </Button>
                            <Popconfirm
                              title="Delete this task?"
                              ok-text="Yes"
                              cancel-text="No"
                              @confirm="handleDeleteTask(task.id)"
                            >
                              <Button type="text" size="small" danger>
                                <template #icon><DeleteOutlined /></template>
                              </Button>
                            </Popconfirm>
                          </template>
                        </ListItem>
                      </template>
                    </List>
                    <Empty v-else description="No tasks yet" />

                    <Button
                      v-if="drawerMode !== 'view'"
                      type="dashed"
                      block
                      size="small"
                      class="mv-mt-2"
                      @click="openTaskCreate(stage.id)"
                    >
                      <template #icon><PlusOutlined /></template>
                      Add Task
                    </Button>
                  </CollapsePanel>
                </Collapse>

                <Empty v-else description="No stages configured">
                  <Button
                    v-if="drawerMode !== 'view'"
                    type="primary"
                    @click="openStageCreate"
                  >
                    Add First Stage
                  </Button>
                </Empty>
              </div>
            </TabPane>
          </Tabs>
        </Spin>

        <template #footer>
          <div class="mv-tpl-drawer-footer">
            <Button @click="drawerVisible = false">
              {{ drawerMode === 'view' ? 'Close' : 'Cancel' }}
            </Button>
            <Button
              v-if="drawerMode !== 'view'"
              type="primary"
              :loading="drawerLoading"
              @click="handleTemplateSave"
            >
              {{ drawerMode === 'create' ? 'Create' : 'Save' }}
            </Button>
          </div>
        </template>
      </Drawer>

      <!-- Stage Modal -->
      <Modal
        v-model:open="stageModal.visible.value"
        :title="stageModalMode === 'create' ? 'Add Stage' : 'Edit Stage'"
        :confirm-loading="stageModalLoading"
        @ok="handleStageSave"
        @cancel="stageModal.close"
      >
        <Form
          ref="stageFormRef"
          :model="stageForm"
          :rules="stageRules"
          layout="vertical"
        >
          <FormItem v-if="stageTypes.length > 0" label="Stage Type" name="stage_type">
            <Select
              v-model:value="stageForm.stage_type"
              placeholder="Select a stage type (optional)"
              allow-clear
              @change="handleStageTypeChange"
            >
              <SelectOption
                v-for="st in stageTypes"
                :key="st.id || st.name"
                :value="st.id || st.name"
              >
                {{ st.name }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Stage Name" name="name">
            <Input v-model:value="stageForm.name" placeholder="Enter stage name" />
          </FormItem>
          <FormItem label="Description" name="description">
            <Textarea
              v-model:value="stageForm.description"
              :rows="2"
              placeholder="Stage description"
            />
          </FormItem>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Order" name="order">
                <InputNumber v-model:value="stageForm.order" :min="1" style="width: 100%" />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Estimated Days" name="estimated_days">
                <InputNumber v-model:value="stageForm.estimated_days" :min="1" style="width: 100%" />
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem>
                <Checkbox v-model:checked="stageForm.is_mandatory">Mandatory</Checkbox>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem>
                <Checkbox v-model:checked="stageForm.requires_approval">Requires Approval</Checkbox>
              </FormItem>
            </Col>
          </Row>
        </Form>
      </Modal>

      <!-- Task Modal -->
      <Modal
        v-model:open="taskModal.visible.value"
        :title="taskModalMode === 'create' ? 'Add Task' : 'Edit Task'"
        :confirm-loading="taskModalLoading"
        @ok="handleTaskSave"
        @cancel="taskModal.close"
      >
        <Form
          ref="taskFormRef"
          :model="taskForm"
          :rules="taskRules"
          layout="vertical"
        >
          <FormItem label="Task Name" name="name">
            <Input v-model:value="taskForm.name" placeholder="Enter task name" />
          </FormItem>
          <FormItem label="Description" name="description">
            <Textarea
              v-model:value="taskForm.description"
              :rows="2"
              placeholder="Task description"
            />
          </FormItem>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Task Type" name="task_type">
                <Select v-model:value="taskForm.task_type">
                  <SelectOption
                    v-for="opt in taskTypeOptions"
                    :key="opt.value"
                    :value="opt.value"
                  >
                    {{ opt.label }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Estimated Hours" name="estimated_hours">
                <InputNumber
                  v-model:value="taskForm.estimated_hours"
                  :min="0.5"
                  :step="0.5"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Order" name="order">
                <InputNumber v-model:value="taskForm.order" :min="1" style="width: 100%" />
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem>
                <Checkbox v-model:checked="taskForm.is_mandatory">Mandatory</Checkbox>
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem>
                <Checkbox v-model:checked="taskForm.requires_approval">Requires Approval</Checkbox>
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Instructions" name="instructions">
            <Textarea
              v-model:value="taskForm.instructions"
              :rows="2"
              placeholder="Instructions for completing this task"
            />
          </FormItem>
          <FormItem
            v-if="taskForm.task_type === 'document'"
            label="Document Template URL"
            name="document_template_url"
          >
            <Input
              v-model:value="taskForm.document_template_url"
              placeholder="https://example.com/template.pdf (optional)"
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  </Page>
</template>
