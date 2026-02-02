<script setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Badge,
  Button,
  Card,
  Checkbox,
  Col,
  Drawer,
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
  Statistic,
  Switch,
  Table,
  Tabs,
  Tag,
  Textarea,
  Tooltip,
  message,
  TabPane,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  MailOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  RobotOutlined,
  ThunderboltOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import {
  createAutomationRuleApi,
  createCommunicationTemplateApi,
  deleteAutomationRuleApi,
  deleteCommunicationTemplateApi,
  getAllAutomationLogsApi,
  getAutomationRulesApi,
  getCommunicationTemplatesApi,
  getTriggerTypesApi,
  previewCommunicationTemplateApi,
  testAutomationRuleApi,
  toggleAutomationRuleApi,
  updateAutomationRuleApi,
  updateCommunicationTemplateApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTAutomationList',
});

// State
const loading = ref(false);
const activeTab = ref('rules');
const rules = ref([]);
const logs = ref([]);
const templates = ref([]);
const scheduledActions = ref([]);

// Dynamic trigger/action types from API
const triggerTypes = ref([]);
const actionTypes = ref([]);

// Rule form
const ruleDrawerVisible = ref(false);
const ruleFormLoading = ref(false);
const editingRule = ref(null);
const ruleForm = ref({
  name: '',
  description: '',
  trigger_type: 'application_received',
  action_type: 'send_email',
  trigger_conditions: {},
  action_config: {},
  delay_minutes: 0,
});

// Template form
const templateModalVisible = ref(false);
const templateFormLoading = ref(false);
const editingTemplate = ref(null);
const templateForm = ref({
  name: '',
  subject: '',
  body: '',
  template_type: 'custom',
  category: 'email',
  variables: [],
  is_default: false,
});

// Template preview
const previewModalVisible = ref(false);
const previewContent = ref(null);
const previewLoading = ref(false);

// Template type options
const templateTypes = [
  { value: 'application_received', label: 'Application Received' },
  { value: 'interview_invitation', label: 'Interview Invitation' },
  { value: 'interview_reminder', label: 'Interview Reminder' },
  { value: 'interview_feedback_request', label: 'Feedback Request' },
  { value: 'rejection', label: 'Rejection' },
  { value: 'offer', label: 'Offer Letter' },
  { value: 'onboarding', label: 'Onboarding' },
  { value: 'custom', label: 'Custom' },
];

// Template category options
const templateCategories = [
  { value: 'email', label: 'Email' },
  { value: 'sms', label: 'SMS' },
  { value: 'notification', label: 'Notification' },
];

// Available template variables
const availableVariables = [
  '{{candidate_name}}',
  '{{candidate_email}}',
  '{{job_title}}',
  '{{company_name}}',
  '{{interview_date}}',
  '{{interview_time}}',
  '{{interviewer_name}}',
  '{{stage_name}}',
  '{{application_link}}',
];

// Table columns - Rules
const ruleColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Trigger', key: 'trigger' },
  { title: 'Action', key: 'action' },
  { title: 'Delay', key: 'delay', width: 100 },
  { title: 'Times Triggered', dataIndex: 'times_triggered', key: 'triggered', width: 130 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 180 },
];

// Table columns - Logs
const logColumns = [
  { title: 'Rule ID', dataIndex: 'rule_id', key: 'rule_id', width: 90 },
  { title: 'Candidate ID', dataIndex: 'candidate_id', key: 'candidate_id', width: 120 },
  { title: 'Triggered At', key: 'triggered_at' },
  { title: 'Executed At', key: 'executed_at' },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Error', dataIndex: 'error_message', key: 'error', ellipsis: true },
];

// Table columns - Templates
const templateColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Type', key: 'type' },
  { title: 'Category', key: 'category', width: 110 },
  { title: 'Subject', dataIndex: 'subject', key: 'subject', ellipsis: true },
  { title: 'Default', key: 'default', width: 80 },
  { title: 'Active', key: 'active', width: 80 },
  { title: 'Actions', key: 'actions', width: 150 },
];

// Table columns - Scheduled Actions
const scheduledColumns = [
  { title: 'Action', dataIndex: 'action_type', key: 'action' },
  { title: 'Target', dataIndex: 'target', key: 'target' },
  { title: 'Scheduled For', key: 'scheduled_for' },
  { title: 'Status', key: 'status', width: 100 },
];

// Computed stats
const activeRulesCount = computed(() => rules.value.filter((r) => r.is_active).length);
const totalTriggered = computed(() =>
  rules.value.reduce((sum, r) => sum + r.times_triggered, 0),
);

// Fetch all data
async function fetchData() {
  loading.value = true;
  try {
    const [rulesRes, logsRes, templatesRes, triggerTypesRes] = await Promise.all([
      getAutomationRulesApi(),
      getAllAutomationLogsApi({ limit: 50 }),
      getCommunicationTemplatesApi(),
      getTriggerTypesApi(),
    ]);
    rules.value = rulesRes.items || [];
    logs.value = logsRes.logs || [];
    templates.value = templatesRes.items || [];

    if (triggerTypesRes.trigger_types) {
      triggerTypes.value = triggerTypesRes.trigger_types;
    }
    if (triggerTypesRes.action_types) {
      actionTypes.value = triggerTypesRes.action_types;
    }
  } catch (error) {
    console.error('Failed to fetch data:', error);
    message.error('Failed to load automation data');
  } finally {
    loading.value = false;
  }
}

// Rule CRUD
function openRuleDrawer(rule) {
  editingRule.value = rule || null;
  if (rule) {
    ruleForm.value = {
      name: rule.name,
      description: rule.description || '',
      trigger_type: rule.trigger_type,
      action_type: rule.action_type,
      trigger_conditions: rule.trigger_conditions || {},
      action_config: rule.action_config || {},
      delay_minutes: rule.delay_minutes || 0,
    };
  } else {
    ruleForm.value = {
      name: '',
      description: '',
      trigger_type: triggerTypes.value[0]?.value || 'application_received',
      action_type: actionTypes.value[0]?.value || 'send_email',
      trigger_conditions: {},
      action_config: {},
      delay_minutes: 0,
    };
  }
  ruleDrawerVisible.value = true;
}

async function saveRule() {
  if (!ruleForm.value.name) {
    message.error('Rule name is required');
    return;
  }

  ruleFormLoading.value = true;
  try {
    const payload = {
      name: ruleForm.value.name,
      description: ruleForm.value.description || undefined,
      trigger_type: ruleForm.value.trigger_type,
      action_type: ruleForm.value.action_type,
      trigger_conditions: ruleForm.value.trigger_conditions,
      action_config: ruleForm.value.action_config,
      delay_minutes: ruleForm.value.delay_minutes || undefined,
    };

    if (editingRule.value) {
      await updateAutomationRuleApi(editingRule.value.id, payload);
      message.success('Rule updated successfully');
    } else {
      await createAutomationRuleApi(payload);
      message.success('Rule created successfully');
    }
    ruleDrawerVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('Failed to save rule:', error);
    message.error('Failed to save rule');
  } finally {
    ruleFormLoading.value = false;
  }
}

async function toggleRule(rule) {
  try {
    await toggleAutomationRuleApi(rule.id);
    message.success(`Rule ${rule.is_active ? 'deactivated' : 'activated'}`);
    fetchData();
  } catch (error) {
    console.error('Failed to toggle rule:', error);
    message.error('Failed to toggle rule');
  }
}

async function deleteRule(id) {
  try {
    await deleteAutomationRuleApi(id);
    message.success('Rule deleted');
    fetchData();
  } catch (error) {
    console.error('Failed to delete rule:', error);
    message.error('Failed to delete rule');
  }
}

async function testRule(rule) {
  try {
    await testAutomationRuleApi(rule.id);
    message.success('Test execution triggered');
    fetchData();
  } catch (error) {
    console.error('Failed to test rule:', error);
    message.error('Failed to test rule');
  }
}

// Template CRUD
function openTemplateModal(template) {
  editingTemplate.value = template || null;
  if (template) {
    templateForm.value = {
      name: template.name,
      subject: template.subject || '',
      body: template.body,
      template_type: template.template_type,
      category: template.category || 'email',
      variables: template.variables || [],
      is_default: template.is_default,
    };
  } else {
    templateForm.value = {
      name: '',
      subject: '',
      body: '',
      template_type: 'custom',
      category: 'email',
      variables: [],
      is_default: false,
    };
  }
  templateModalVisible.value = true;
}

async function saveTemplate() {
  if (!templateForm.value.name || !templateForm.value.body) {
    message.error('Name and Body are required');
    return;
  }

  templateFormLoading.value = true;
  try {
    const payload = {
      name: templateForm.value.name,
      subject: templateForm.value.subject || undefined,
      body: templateForm.value.body,
      template_type: templateForm.value.template_type || undefined,
      category: templateForm.value.category || undefined,
      variables: templateForm.value.variables.length > 0 ? templateForm.value.variables : undefined,
      is_default: templateForm.value.is_default,
    };

    if (editingTemplate.value) {
      await updateCommunicationTemplateApi(editingTemplate.value.id, payload);
      message.success('Template updated');
    } else {
      await createCommunicationTemplateApi(payload);
      message.success('Template created');
    }
    templateModalVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('Failed to save template:', error);
    message.error('Failed to save template');
  } finally {
    templateFormLoading.value = false;
  }
}

async function deleteTemplate(id) {
  try {
    await deleteCommunicationTemplateApi(id);
    message.success('Template deleted');
    fetchData();
  } catch (error) {
    console.error('Failed to delete template:', error);
    message.error('Failed to delete template');
  }
}

async function previewTemplate(template) {
  previewLoading.value = true;
  previewModalVisible.value = true;
  try {
    const result = await previewCommunicationTemplateApi(template.id);
    previewContent.value = result;
  } catch {
    // Fallback: show raw template with placeholder substitutions
    previewContent.value = {
      subject: template.subject || '(no subject)',
      body: template.body
        .replace(/\{\{candidate_name\}\}/g, 'John Doe')
        .replace(/\{\{candidate_email\}\}/g, 'john@example.com')
        .replace(/\{\{job_title\}\}/g, 'Software Engineer')
        .replace(/\{\{company_name\}\}/g, 'Acme Corp')
        .replace(/\{\{interview_date\}\}/g, dayjs().add(3, 'day').format('MMM D, YYYY'))
        .replace(/\{\{interview_time\}\}/g, '10:00 AM')
        .replace(/\{\{interviewer_name\}\}/g, 'Jane Smith')
        .replace(/\{\{stage_name\}\}/g, 'Technical Interview')
        .replace(/\{\{application_link\}\}/g, 'https://careers.example.com/apply/123'),
    };
  } finally {
    previewLoading.value = false;
  }
}

// Helper functions
function getTriggerLabel(type) {
  return triggerTypes.value.find((t) => t.value === type)?.label || type;
}

function getActionLabel(type) {
  return actionTypes.value.find((a) => a.value === type)?.label || type;
}

function getTriggerColor(type) {
  const colors = {
    application_received: 'blue',
    stage_change: 'purple',
    interview_scheduled: 'cyan',
    interview_completed: 'green',
    offer_sent: 'orange',
    offer_accepted: 'lime',
    offer_rejected: 'red',
    time_in_stage: 'gold',
    rating_received: 'magenta',
    document_uploaded: 'geekblue',
  };
  return colors[type] || 'default';
}

function getActionColor(type) {
  const colors = {
    send_email: 'blue',
    send_sms: 'cyan',
    move_stage: 'purple',
    assign_task: 'orange',
    add_tag: 'green',
    notify_user: 'magenta',
    webhook: 'geekblue',
    add_to_talent_pool: 'lime',
    schedule_reminder: 'gold',
  };
  return colors[type] || 'default';
}

function getStatusColor(status) {
  const colors = {
    success: 'success',
    failed: 'error',
    skipped: 'default',
    pending: 'processing',
    executed: 'success',
    cancelled: 'default',
  };
  return colors[status] || 'default';
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('MMM D, YYYY h:mm A');
}

function insertVariable(variable) {
  templateForm.value.body += ` ${variable}`;
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Recruitment Automation</h1>
        <Space>
          <Button @click="fetchData">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
        </Space>
      </div>

      <Spin :spinning="loading">
        <!-- Stats Overview -->
        <Row :gutter="[16, 16]" class="mb-6">
          <Col :xs="8">
            <Card>
              <Statistic
                title="Active Rules"
                :value="activeRulesCount"
                :value-style="{ color: '#52c41a' }"
              >
                <template #prefix><RobotOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="8">
            <Card>
              <Statistic
                title="Total Triggered"
                :value="totalTriggered"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix><ThunderboltOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="8">
            <Card>
              <Statistic
                title="Email Templates"
                :value="templates.length"
                :value-style="{ color: '#faad14' }"
              >
                <template #prefix><MailOutlined /></template>
              </Statistic>
            </Card>
          </Col>
        </Row>

        <Tabs v-model:activeKey="activeTab">
          <!-- Rules Tab -->
          <TabPane key="rules" tab="Automation Rules">
            <div class="mb-4 flex justify-end">
              <Button type="primary" @click="openRuleDrawer()">
                <template #icon><PlusOutlined /></template>
                Create Rule
              </Button>
            </div>

            <Table
              :columns="ruleColumns"
              :data-source="rules"
              :row-key="(record) => record.id"
              :pagination="{ pageSize: 10 }"
            >
              <template #bodyCell="{ column, record: rawRecord }">
                <template v-if="column.key === 'trigger'">
                  <Tag :color="getTriggerColor(rawRecord.trigger_type)">
                    {{ getTriggerLabel(rawRecord.trigger_type) }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'action'">
                  <Tag :color="getActionColor(rawRecord.action_type)">
                    {{ getActionLabel(rawRecord.action_type) }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'delay'">
                  <span v-if="rawRecord.delay_minutes > 0">
                    {{ rawRecord.delay_minutes }} min
                  </span>
                  <span v-else class="text-gray-400">Instant</span>
                </template>
                <template v-else-if="column.key === 'status'">
                  <Switch
                    :checked="rawRecord.is_active"
                    checked-children="ON"
                    un-checked-children="OFF"
                    @change="toggleRule(rawRecord)"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space>
                    <Tooltip title="Test Rule">
                      <Button type="link" size="small" @click="testRule(rawRecord)">
                        <PlayCircleOutlined />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button type="link" size="small" @click="openRuleDrawer(rawRecord)">
                        <EditOutlined />
                      </Button>
                    </Tooltip>
                    <Popconfirm title="Delete this rule?" @confirm="deleteRule(rawRecord.id)">
                      <Button type="link" size="small" danger>
                        <DeleteOutlined />
                      </Button>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </TabPane>

          <!-- Email Templates Tab -->
          <TabPane key="templates" tab="Email Templates">
            <div class="mb-4 flex justify-end">
              <Button type="primary" @click="openTemplateModal()">
                <template #icon><PlusOutlined /></template>
                Create Template
              </Button>
            </div>

            <Table
              :columns="templateColumns"
              :data-source="templates"
              :row-key="(record) => record.id"
              :pagination="{ pageSize: 10 }"
            >
              <template #bodyCell="{ column, record: rawRecord }">
                <template v-if="column.key === 'type'">
                  <Tag color="blue">{{ rawRecord.template_type }}</Tag>
                </template>
                <template v-else-if="column.key === 'category'">
                  <Tag color="geekblue">{{ rawRecord.category }}</Tag>
                </template>
                <template v-else-if="column.key === 'default'">
                  <CheckCircleOutlined v-if="rawRecord.is_default" class="text-green-500" />
                </template>
                <template v-else-if="column.key === 'active'">
                  <Badge
                    :status="rawRecord.is_active ? 'success' : 'default'"
                    :text="rawRecord.is_active ? 'Yes' : 'No'"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space>
                    <Tooltip title="Preview">
                      <Button type="link" size="small" @click="previewTemplate(rawRecord)">
                        <EyeOutlined />
                      </Button>
                    </Tooltip>
                    <Tooltip title="Edit">
                      <Button type="link" size="small" @click="openTemplateModal(rawRecord)">
                        <EditOutlined />
                      </Button>
                    </Tooltip>
                    <Popconfirm
                      title="Delete this template?"
                      @confirm="deleteTemplate(rawRecord.id)"
                    >
                      <Button type="link" size="small" danger>
                        <DeleteOutlined />
                      </Button>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </TabPane>

          <!-- Scheduled Actions Tab -->
          <TabPane key="scheduled" tab="Scheduled Actions">
            <Table
              :columns="scheduledColumns"
              :data-source="scheduledActions"
              row-key="id"
              :pagination="{ pageSize: 10 }"
            >
              <template #bodyCell="{ column, record: rawRecord }">
                <template v-if="column.key === 'scheduled_for'">
                  {{ formatDateTime(rawRecord.scheduled_for) }}
                </template>
                <template v-else-if="column.key === 'status'">
                  <Badge :status="getStatusColor(rawRecord.status)" :text="rawRecord.status" />
                </template>
              </template>
            </Table>
          </TabPane>

          <!-- Logs Tab -->
          <TabPane key="logs" tab="Execution Logs">
            <Table
              :columns="logColumns"
              :data-source="logs"
              :row-key="(record) => record.id"
              :pagination="{ pageSize: 20 }"
            >
              <template #bodyCell="{ column, record: rawRecord }">
                <template v-if="column.key === 'triggered_at'">
                  {{ formatDateTime(rawRecord.triggered_at) }}
                </template>
                <template v-else-if="column.key === 'executed_at'">
                  {{ formatDateTime(rawRecord.executed_at) }}
                </template>
                <template v-else-if="column.key === 'status'">
                  <Badge :status="getStatusColor(rawRecord.status)" :text="rawRecord.status" />
                </template>
              </template>
            </Table>
          </TabPane>
        </Tabs>
      </Spin>

      <!-- Rule Drawer -->
      <Drawer
        v-model:open="ruleDrawerVisible"
        :title="editingRule ? 'Edit Automation Rule' : 'Create Automation Rule'"
        :width="560"
        :body-style="{ paddingBottom: '80px' }"
      >
        <Form layout="vertical">
          <FormItem label="Rule Name" required>
            <Input v-model:value="ruleForm.name" placeholder="e.g., Send welcome email" />
          </FormItem>
          <FormItem label="Description">
            <Textarea
              v-model:value="ruleForm.description"
              :rows="2"
              placeholder="What does this rule do?"
            />
          </FormItem>
          <FormItem label="When (Trigger)">
            <Select v-model:value="ruleForm.trigger_type" placeholder="Select trigger">
              <SelectOption v-for="t in triggerTypes" :key="t.value" :value="t.value">
                <Tooltip :title="t.description" placement="right">
                  {{ t.label }}
                </Tooltip>
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Then (Action)">
            <Select v-model:value="ruleForm.action_type" placeholder="Select action">
              <SelectOption v-for="a in actionTypes" :key="a.value" :value="a.value">
                <Tooltip :title="a.description" placement="right">
                  {{ a.label }}
                </Tooltip>
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Delay (minutes)">
            <Input
              v-model:value="ruleForm.delay_minutes"
              type="number"
              :min="0"
              placeholder="0 = instant execution"
            />
          </FormItem>

          <!-- Action Config: email template selection -->
          <template v-if="ruleForm.action_type === 'send_email'">
            <FormItem label="Email Template">
              <Select
                v-model:value="ruleForm.action_config.template_id"
                placeholder="Select email template"
                allow-clear
              >
                <SelectOption v-for="t in templates" :key="t.id" :value="t.id">
                  {{ t.name }}
                </SelectOption>
              </Select>
            </FormItem>
          </template>

          <!-- Action Config: notification message -->
          <template v-if="ruleForm.action_type === 'notify_user'">
            <FormItem label="Notification Message">
              <Textarea
                v-model:value="ruleForm.action_config.message"
                :rows="2"
                placeholder="Notification message"
              />
            </FormItem>
          </template>

          <!-- Action Config: webhook URL -->
          <template v-if="ruleForm.action_type === 'webhook'">
            <FormItem label="Webhook URL">
              <Input
                v-model:value="ruleForm.action_config.url"
                placeholder="https://example.com/webhook"
              />
            </FormItem>
          </template>
        </Form>

        <div class="absolute bottom-0 left-0 right-0 border-t bg-white p-4">
          <Space>
            <Button @click="ruleDrawerVisible = false">Cancel</Button>
            <Button type="primary" :loading="ruleFormLoading" @click="saveRule">
              {{ editingRule ? 'Update' : 'Create' }}
            </Button>
          </Space>
        </div>
      </Drawer>

      <!-- Template Modal -->
      <Modal
        v-model:open="templateModalVisible"
        :title="editingTemplate ? 'Edit Communication Template' : 'Create Communication Template'"
        :width="720"
        :confirm-loading="templateFormLoading"
        @ok="saveTemplate"
      >
        <Form layout="vertical">
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Template Name" required>
                <Input v-model:value="templateForm.name" placeholder="e.g., Interview Invitation" />
              </FormItem>
            </Col>
            <Col :span="6">
              <FormItem label="Type">
                <Select v-model:value="templateForm.template_type">
                  <SelectOption v-for="t in templateTypes" :key="t.value" :value="t.value">
                    {{ t.label }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
            <Col :span="6">
              <FormItem label="Category">
                <Select v-model:value="templateForm.category">
                  <SelectOption v-for="c in templateCategories" :key="c.value" :value="c.value">
                    {{ c.label }}
                  </SelectOption>
                </Select>
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Subject">
            <Input v-model:value="templateForm.subject" placeholder="Email subject line" />
          </FormItem>
          <FormItem label="Body" required>
            <Textarea
              v-model:value="templateForm.body"
              :rows="8"
              placeholder="Template body with variable placeholders"
            />
          </FormItem>
          <FormItem label="Available Variables">
            <div class="flex flex-wrap gap-2">
              <Tag
                v-for="v in availableVariables"
                :key="v"
                color="blue"
                class="cursor-pointer"
                @click="insertVariable(v)"
              >
                {{ v }}
              </Tag>
            </div>
          </FormItem>
          <FormItem>
            <Checkbox v-model:checked="templateForm.is_default">
              Set as default template for this type
            </Checkbox>
          </FormItem>
        </Form>
      </Modal>

      <!-- Template Preview Modal -->
      <Modal
        v-model:open="previewModalVisible"
        title="Template Preview"
        :width="640"
        :footer="null"
      >
        <Spin :spinning="previewLoading">
          <div v-if="previewContent">
            <div class="mb-4">
              <strong>Subject:</strong>
              <p class="mt-1 rounded bg-gray-50 p-2">{{ previewContent.subject }}</p>
            </div>
            <div>
              <strong>Body:</strong>
              <!-- eslint-disable-next-line vue/no-v-html -->
              <div
                class="mt-1 rounded border bg-white p-4"
                v-html="previewContent.body"
              />
            </div>
          </div>
          <div v-else class="py-8 text-center text-gray-400">
            Loading preview...
          </div>
        </Spin>
      </Modal>
    </div>
  </Page>
</template>
