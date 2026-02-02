<script setup>
import { onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Drawer,
  Form,
  FormItem,
  Input,
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
  EyeOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import {
  getMailTemplatesApi,
  createMailTemplateApi,
  updateMailTemplateApi,
  deleteMailTemplateApi,
  previewMailTemplateApi,
} from '#/api/hrms_base';

defineOptions({
  name: 'HRMSMailTemplates',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const templates = ref([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const filters = ref({
  model_name: '',
  is_active: null,
});

// Create/Edit drawer
const formDrawerVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const templateForm = ref({
  name: '',
  code: '',
  description: '',
  model_name: '',
  subject: '',
  body_html: '',
  body_text: '',
  is_active: true,
});

// Preview modal
const previewModalVisible = ref(false);
const previewContent = ref('');

const columns = [
  { title: 'Template Name', dataIndex: 'name', key: 'name', width: 200 },
  { title: 'Code', dataIndex: 'code', key: 'code', width: 120 },
  { title: 'Model', dataIndex: 'model_name', key: 'model_name', width: 150 },
  { title: 'Subject', dataIndex: 'subject', key: 'subject', width: 200, ellipsis: true },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 150, fixed: 'right' },
];

const MODEL_OPTIONS = [
  { value: 'user.invitation', label: 'User Invitation' },
  { value: 'user.password_reset', label: 'Password Reset' },
  { value: 'employee.onboarding', label: 'Employee Onboarding' },
  { value: 'employee.offboarding', label: 'Employee Offboarding' },
  { value: 'leave.request', label: 'Leave Request' },
  { value: 'leave.approval', label: 'Leave Approval' },
  { value: 'attendance.alert', label: 'Attendance Alert' },
  { value: 'payroll.slip', label: 'Payroll Slip' },
  { value: 'announcement.new', label: 'New Announcement' },
];

async function fetchTemplates() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (filters.value.model_name) params.model_name = filters.value.model_name;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getMailTemplatesApi(params);
    templates.value = res.items || res || [];
    pagination.value.total = res.total || templates.value.length;
  } catch (err) {
    console.error('Failed to fetch templates:', err);
    showError('Failed to load mail templates');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchTemplates();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchTemplates();
}, { deep: true });

function resetForm() {
  templateForm.value = {
    name: '',
    code: '',
    description: '',
    model_name: '',
    subject: '',
    body_html: '',
    body_text: '',
    is_active: true,
  };
}

function openCreateDrawer() {
  isEditing.value = false;
  editingId.value = null;
  resetForm();
  formDrawerVisible.value = true;
}

function openEditDrawer(record) {
  isEditing.value = true;
  editingId.value = record.id;
  templateForm.value = {
    name: record.name,
    code: record.code || '',
    description: record.description || '',
    model_name: record.model_name || '',
    subject: record.subject || '',
    body_html: record.body_html || '',
    body_text: record.body_text || '',
    is_active: record.is_active !== false,
  };
  formDrawerVisible.value = true;
}

function generateCode(name) {
  if (!isEditing.value && name && !templateForm.value.code) {
    templateForm.value.code = name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').substring(0, 30);
  }
}

async function handleSave() {
  if (!templateForm.value.name.trim()) {
    showError('Template name is required');
    return;
  }
  if (!templateForm.value.subject.trim()) {
    showError('Subject is required');
    return;
  }

  actionLoading.value = true;
  try {
    const data = { ...templateForm.value };
    if (!data.code) data.code = null;
    if (!data.description) data.description = null;
    if (!data.model_name) data.model_name = null;
    if (!data.body_text) data.body_text = null;

    if (isEditing.value) {
      await updateMailTemplateApi(editingId.value, data);
      showSuccess('Template updated successfully');
    } else {
      await createMailTemplateApi(data);
      showSuccess('Template created successfully');
    }
    formDrawerVisible.value = false;
    fetchTemplates();
  } catch (err) {
    console.error('Failed to save template:', err);
    showError(err.response?.data?.detail || 'Failed to save template');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteMailTemplateApi(record.id);
    showSuccess('Template deleted successfully');
    fetchTemplates();
  } catch (err) {
    console.error('Failed to delete template:', err);
    showError(err.response?.data?.detail || 'Failed to delete template');
  } finally {
    actionLoading.value = false;
  }
}

/**
 * Sanitize HTML to prevent XSS attacks using DOMParser
 * Removes scripts, event handlers, and dangerous elements
 */
function sanitizeHtml(html) {
  if (!html) return '';

  // Parse HTML safely
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, 'text/html');

  // Remove all script tags
  doc.querySelectorAll('script').forEach(el => el.remove());

  // Remove dangerous elements
  doc.querySelectorAll('iframe, object, embed, form, input, button, textarea, select')
    .forEach(el => el.remove());

  // Clean all elements
  doc.querySelectorAll('*').forEach(el => {
    // Remove inline event handlers (onclick, onerror, etc.)
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
    // Remove javascript: URLs from href/src
    ['href', 'src', 'action'].forEach(attrName => {
      const value = el.getAttribute(attrName);
      if (value && value.toLowerCase().trim().startsWith('javascript:')) {
        el.removeAttribute(attrName);
      }
    });
  });

  return doc.body ? doc.body.innerHTML : '';
}

async function handlePreview(record) {
  try {
    const res = await previewMailTemplateApi(record.id, {});
    const rawHtml = res.html || res.body_html || record.body_html || '';
    previewContent.value = sanitizeHtml(rawHtml);
    previewModalVisible.value = true;
  } catch (err) {
    // Fallback to raw content (sanitized)
    previewContent.value = sanitizeHtml(record.body_html || '');
    previewModalVisible.value = true;
  }
}

function getModelLabel(modelName) {
  const model = MODEL_OPTIONS.find(m => m.value === modelName);
  return model ? model.label : modelName;
}

onMounted(() => {
  fetchTemplates();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <MailOutlined />
            <span>Mail Templates</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateDrawer">
              <PlusOutlined /> New Template
            </Button>
            <Button @click="fetchTemplates">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <Select
              v-model:value="filters.model_name"
              placeholder="Filter by model"
              allow-clear
              style="width: 180px"
            >
              <SelectOption v-for="m in MODEL_OPTIONS" :key="m.value" :value="m.value">
                {{ m.label }}
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
          :data-source="templates"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} templates`,
          }"
          :scroll="{ x: 900 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'model_name'">
              <Tag v-if="record.model_name" color="blue">
                {{ getModelLabel(record.model_name) }}
              </Tag>
              <span v-else class="text-gray">-</span>
            </template>
            <template v-if="column.key === 'is_active'">
              <CheckCircleOutlined v-if="record.is_active" style="color: #52c41a" />
              <CloseCircleOutlined v-else style="color: #ff4d4f" />
            </template>
            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="Preview">
                  <Button size="small" @click="handlePreview(record)">
                    <EyeOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button size="small" @click="openEditDrawer(record)">
                    <EditOutlined />
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Delete this template?"
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

    <!-- Create/Edit Drawer -->
    <Drawer
      v-model:open="formDrawerVisible"
      :title="isEditing ? 'Edit Mail Template' : 'Create Mail Template'"
      width="700"
      :extra="h => h(Space, {}, [
        h(Button, { onClick: () => formDrawerVisible = false }, 'Cancel'),
        h(Button, { type: 'primary', loading: actionLoading, onClick: handleSave }, 'Save'),
      ])"
    >
      <Form layout="vertical">
        <FormItem label="Template Name" required>
          <Input
            v-model:value="templateForm.name"
            placeholder="e.g., Welcome Email"
            @blur="generateCode(templateForm.name)"
          />
        </FormItem>

        <div class="form-row">
          <FormItem label="Code" style="flex: 1">
            <Input
              v-model:value="templateForm.code"
              placeholder="e.g., WELCOME_EMAIL"
            />
          </FormItem>
          <FormItem label="Model" style="flex: 1">
            <Select
              v-model:value="templateForm.model_name"
              placeholder="Select model"
              allow-clear
              style="width: 100%"
            >
              <SelectOption v-for="m in MODEL_OPTIONS" :key="m.value" :value="m.value">
                {{ m.label }}
              </SelectOption>
            </Select>
          </FormItem>
        </div>

        <FormItem label="Description">
          <Textarea
            v-model:value="templateForm.description"
            :rows="2"
            placeholder="Template description..."
          />
        </FormItem>

        <FormItem label="Subject" required>
          <Input
            v-model:value="templateForm.subject"
            placeholder="Email subject (supports {{ variables }})"
          />
        </FormItem>

        <FormItem label="HTML Body">
          <Textarea
            v-model:value="templateForm.body_html"
            :rows="12"
            placeholder="HTML content (supports {{ variables }})"
            style="font-family: monospace"
          />
        </FormItem>

        <FormItem label="Plain Text Body (Optional)">
          <Textarea
            v-model:value="templateForm.body_text"
            :rows="6"
            placeholder="Plain text version..."
            style="font-family: monospace"
          />
        </FormItem>

        <FormItem label="Status">
          <Select v-model:value="templateForm.is_active" style="width: 200px">
            <SelectOption :value="true">Active</SelectOption>
            <SelectOption :value="false">Inactive</SelectOption>
          </Select>
        </FormItem>
      </Form>
    </Drawer>

    <!-- Preview Modal -->
    <Modal
      v-model:open="previewModalVisible"
      title="Email Preview"
      :footer="null"
      width="800px"
    >
      <div class="preview-container">
        <div v-html="previewContent" />
      </div>
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

.text-gray {
  color: #999;
}

.preview-container {
  padding: 16px;
  border: 1px solid #f0f0f0;
  border-radius: 4px;
  max-height: 500px;
  overflow-y: auto;
}
</style>
