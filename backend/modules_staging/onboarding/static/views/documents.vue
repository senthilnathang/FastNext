<script setup>
import { onMounted, ref, computed, reactive, h } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Textarea,
  Timeline,
  Tooltip,
  Upload,
  Avatar,
} from 'ant-design-vue';

const DescriptionsItem = Descriptions.Item;
const FormItem = Form.Item;
const SelectOption = Select.Option;
const TimelineItem = Timeline.Item;
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
  EyeOutlined,
  FileExcelOutlined,
  FileImageOutlined,
  FilePdfOutlined,
  FileTextOutlined,
  FileWordOutlined,
  InboxOutlined,
  ReloadOutlined,
  SyncOutlined,
  UploadOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';
import { useNotification } from '#/composables';
import {
  getDocumentsApi,
  getDocumentApi,
  approveDocumentApi,
  rejectDocumentApi,
  getDocumentTypesApi,
} from '#/api/onboarding';

defineOptions({ name: 'OnboardingDocuments' });

const { success: showSuccess, error: showError } = useNotification();

// State
const loading = ref(false);
const documents = ref([]);
const documentTypes = ref([]);
const candidates = ref([]);
const detailLoading = ref(false);
const actionLoading = ref(false);

const pagination = reactive({
  current: 1,
  pageSize: 20,
  total: 0,
});

const filters = ref({
  status: undefined,
  document_type: undefined,
  candidate: undefined,
});

// Drawer state
const drawerVisible = ref(false);
const selectedDocument = ref(null);

// Reject / Verify modal state
const verifyModalVisible = ref(false);
const verifyRecord = ref(null);
const verifyAction = ref('reject');
const verifyReason = ref('');

// Upload modal state
const uploadModalVisible = ref(false);
const uploadForm = reactive({
  candidate_id: undefined,
  document_type_id: undefined,
  document_number: '',
  issuing_authority: '',
  notes: '',
});
const uploadFileList = ref([]);
const uploadLoading = ref(false);

// Status configuration
const statusOptions = [
  { value: 'pending', label: 'Pending', color: 'default' },
  { value: 'submitted', label: 'Submitted', color: 'blue' },
  { value: 'under_review', label: 'Under Review', color: 'blue' },
  { value: 'approved', label: 'Approved', color: 'green' },
  { value: 'verified', label: 'Verified', color: 'green' },
  { value: 'rejected', label: 'Rejected', color: 'red' },
  { value: 'expired', label: 'Expired', color: 'default' },
  { value: 'resubmit', label: 'Resubmission Required', color: 'warning' },
];

function getStatusColor(status) {
  const found = statusOptions.find((s) => s.value === status);
  return found ? found.color : 'default';
}

function getStatusLabel(status) {
  const found = statusOptions.find((s) => s.value === status);
  return found ? found.label : status || 'Unknown';
}

// File type icon helper
function getFileIcon(filename) {
  if (!filename) return FileTextOutlined;
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return FilePdfOutlined;
  if (ext === 'doc' || ext === 'docx') return FileWordOutlined;
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return FileExcelOutlined;
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'svg' || ext === 'webp') return FileImageOutlined;
  if (ext === 'txt' || ext === 'rtf') return FileTextOutlined;
  return FileTextOutlined;
}

function getFileIconColor(filename) {
  if (!filename) return '#8c8c8c';
  const ext = filename.split('.').pop().toLowerCase();
  if (ext === 'pdf') return '#ff4d4f';
  if (ext === 'doc' || ext === 'docx') return '#1890ff';
  if (ext === 'xls' || ext === 'xlsx' || ext === 'csv') return '#52c41a';
  if (ext === 'png' || ext === 'jpg' || ext === 'jpeg' || ext === 'gif' || ext === 'svg' || ext === 'webp') return '#faad14';
  return '#8c8c8c';
}

// Table columns
const columns = [
  { title: 'Document Name', dataIndex: 'document_name', key: 'document_name', width: 200, ellipsis: true },
  { title: 'Type', dataIndex: 'document_type_name', key: 'document_type_name', width: 140 },
  { title: 'Category', dataIndex: 'category', key: 'category', width: 120 },
  { title: 'Employee', dataIndex: 'employee_name', key: 'employee_name', width: 180 },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 140 },
  { title: 'Submitted', dataIndex: 'submitted_at', key: 'submitted_at', width: 140 },
  { title: 'Reviewed By', dataIndex: 'reviewed_by_name', key: 'reviewed_by_name', width: 150 },
  { title: 'Actions', key: 'actions', width: 200, fixed: 'right' },
];

// Statistics
const submittedCount = computed(() => {
  return documents.value.filter((d) => d.status === 'submitted').length;
});
const approvedCount = computed(() => {
  return documents.value.filter((d) => d.status === 'approved' || d.status === 'verified').length;
});
const rejectedCount = computed(() => {
  return documents.value.filter((d) => d.status === 'rejected').length;
});
const totalCount = computed(() => pagination.total);

// Fetch documents
async function fetchDocuments() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.current - 1) * pagination.pageSize,
      limit: pagination.pageSize,
    };
    if (filters.value.status) params.status = filters.value.status;
    if (filters.value.document_type) params.document_type = filters.value.document_type;
    if (filters.value.candidate) params.candidate_id = filters.value.candidate;

    const res = await getDocumentsApi(params);
    documents.value = res.items || res.results || [];
    pagination.total = res.total || res.count || 0;
  } catch (err) {
    console.error('Failed to fetch documents:', err);
    showError('Failed to load documents');
  } finally {
    loading.value = false;
  }
}

// Fetch document types for filter
async function fetchDocumentTypes() {
  try {
    const res = await getDocumentTypesApi();
    documentTypes.value = res.items || res.results || res || [];
  } catch (err) {
    console.error('Failed to fetch document types:', err);
  }
}

// Fetch candidates for filter and upload
async function fetchCandidates() {
  try {
    const res = await requestClient.get('/recruitment/candidates/', { params: { limit: 100 } });
    candidates.value = res.items || res.results || res || [];
  } catch (err) {
    console.error('Failed to fetch candidates:', err);
  }
}

// Table change handler
function handleTableChange(pag) {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchDocuments();
}

// Filter handlers
function handleStatusFilter(value) {
  filters.value.status = value;
  pagination.current = 1;
  fetchDocuments();
}

function handleTypeFilter(value) {
  filters.value.document_type = value;
  pagination.current = 1;
  fetchDocuments();
}

function handleCandidateFilter(value) {
  filters.value.candidate = value;
  pagination.current = 1;
  fetchDocuments();
}

// Open detail drawer
async function openDetailDrawer(record) {
  drawerVisible.value = true;
  detailLoading.value = true;
  try {
    const doc = await getDocumentApi(record.id);
    selectedDocument.value = doc;
  } catch (err) {
    console.error('Failed to fetch document details:', err);
    showError('Failed to load document details');
    drawerVisible.value = false;
  } finally {
    detailLoading.value = false;
  }
}

// Approve document
async function handleApprove(record) {
  actionLoading.value = true;
  try {
    await approveDocumentApi(record.id);
    showSuccess('Document approved successfully');
    fetchDocuments();
    if (drawerVisible.value && selectedDocument.value && selectedDocument.value.id === record.id) {
      selectedDocument.value.status = 'approved';
    }
  } catch (err) {
    console.error('Failed to approve document:', err);
    showError('Failed to approve document');
  } finally {
    actionLoading.value = false;
  }
}

// Open verify/reject/resubmit modal
function openVerifyModal(record, action) {
  verifyRecord.value = record;
  verifyAction.value = action || 'reject';
  verifyReason.value = '';
  verifyModalVisible.value = true;
}

// Legacy alias
function openRejectModal(record) {
  openVerifyModal(record, 'reject');
}

// Confirm verify action (reject or resubmit)
async function handleVerifyAction() {
  if (!verifyReason.value.trim()) {
    showError('Please provide a reason');
    return;
  }
  actionLoading.value = true;
  try {
    if (verifyAction.value === 'reject') {
      await rejectDocumentApi(verifyRecord.value.id, verifyReason.value);
      showSuccess('Document rejected');
    } else if (verifyAction.value === 'resubmit') {
      await requestClient.post('/onboarding/documents/' + verifyRecord.value.id + '/request-resubmission', {
        reason: verifyReason.value,
      });
      showSuccess('Resubmission requested');
    }
    verifyModalVisible.value = false;
    verifyRecord.value = null;
    fetchDocuments();
  } catch (err) {
    console.error('Failed to process document action:', err);
    showError('Failed to process action');
  } finally {
    actionLoading.value = false;
  }
}

function cancelVerify() {
  verifyModalVisible.value = false;
  verifyRecord.value = null;
  verifyReason.value = '';
}

// Delete document
async function handleDelete(record) {
  try {
    await requestClient.delete('/onboarding/documents/' + record.id);
    showSuccess('Document deleted successfully');
    fetchDocuments();
    if (drawerVisible.value && selectedDocument.value && selectedDocument.value.id === record.id) {
      drawerVisible.value = false;
      selectedDocument.value = null;
    }
  } catch (err) {
    console.error('Failed to delete document:', err);
    showError('Failed to delete document');
  }
}

// Upload modal handlers
function openUploadModal() {
  uploadForm.candidate_id = undefined;
  uploadForm.document_type_id = undefined;
  uploadForm.document_number = '';
  uploadForm.issuing_authority = '';
  uploadForm.notes = '';
  uploadFileList.value = [];
  uploadModalVisible.value = true;
}

function handleBeforeUpload(file) {
  uploadFileList.value = [file];
  return false;
}

function handleRemoveFile() {
  uploadFileList.value = [];
  return true;
}

async function handleUploadSubmit() {
  if (!uploadForm.candidate_id) {
    showError('Please select a candidate');
    return;
  }
  if (!uploadForm.document_type_id) {
    showError('Please select a document type');
    return;
  }
  if (uploadFileList.value.length === 0) {
    showError('Please select a file to upload');
    return;
  }

  uploadLoading.value = true;
  try {
    const formData = new FormData();
    formData.append('file', uploadFileList.value[0]);
    formData.append('candidate_id', uploadForm.candidate_id);
    formData.append('document_type_id', uploadForm.document_type_id);
    if (uploadForm.document_number) {
      formData.append('document_number', uploadForm.document_number);
    }
    if (uploadForm.issuing_authority) {
      formData.append('issuing_authority', uploadForm.issuing_authority);
    }
    if (uploadForm.notes) {
      formData.append('notes', uploadForm.notes);
    }

    const token = localStorage.getItem('accessToken');
    const response = await fetch('/api/v1/onboarding/documents/upload', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + token,
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Upload failed: ' + response.status);
    }

    showSuccess('Document uploaded successfully');
    uploadModalVisible.value = false;
    fetchDocuments();
  } catch (err) {
    console.error('Failed to upload document:', err);
    showError('Failed to upload document');
  } finally {
    uploadLoading.value = false;
  }
}

// Format file size
function formatFileSize(bytes) {
  if (!bytes) return '-';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Format date
function formatDate(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function formatDateTime(dateStr) {
  if (!dateStr) return '-';
  const d = new Date(dateStr);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const hours = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear() + ' ' + hours + ':' + mins;
}

// Timeline dot color helper
function getTimelineDotColor(logEntry) {
  if (!logEntry || !logEntry.action) return 'gray';
  const action = logEntry.action.toLowerCase();
  if (action === 'approved' || action === 'verified' || action === 'passed') return 'green';
  if (action === 'rejected' || action === 'failed') return 'red';
  if (action === 'resubmit' || action === 'resubmission_requested') return 'orange';
  if (action === 'submitted' || action === 'uploaded') return 'blue';
  return 'gray';
}

// Lifecycle
onMounted(() => {
  fetchDocuments();
  fetchDocumentTypes();
  fetchCandidates();
});
</script>

<template>
  <Page auto-content-height>
    <div class="mv-p-4">
      <!-- Header -->
      <div class="mv-page-header mv-mb-4">
        <div>
          <h1 class="mv-page-title">
            <FileTextOutlined class="mv-mr-2" />
            Onboarding Documents
          </h1>
          <p class="mv-text-secondary mv-mt-1">
            Manage and review employee onboarding documents
          </p>
        </div>
        <Space>
          <Button type="primary" @click="openUploadModal">
            <template #icon><UploadOutlined /></template>
            Upload Document
          </Button>
          <Button @click="fetchDocuments">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
        </Space>
      </div>

      <!-- Statistics -->
      <Row :gutter="[16, 16]" class="mv-mb-4">
        <Col :xs="12" :sm="6">
          <Card size="small">
            <Statistic
              title="Submitted"
              :value="submittedCount"
              :value-style="{ color: '#1890ff', fontSize: '24px' }"
            >
              <template #prefix><ClockCircleOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card size="small">
            <Statistic
              title="Approved"
              :value="approvedCount"
              :value-style="{ color: '#52c41a', fontSize: '24px' }"
            >
              <template #prefix><CheckCircleOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card size="small">
            <Statistic
              title="Rejected"
              :value="rejectedCount"
              :value-style="{ color: '#ff4d4f', fontSize: '24px' }"
            >
              <template #prefix><CloseCircleOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card size="small">
            <Statistic
              title="Total Documents"
              :value="totalCount"
              :value-style="{ fontSize: '24px' }"
            >
              <template #prefix><FileTextOutlined /></template>
            </Statistic>
          </Card>
        </Col>
      </Row>

      <!-- Documents Table -->
      <Card>
        <template #title>
          <Space>
            <FileTextOutlined />
            <span>Documents</span>
          </Space>
        </template>
        <template #extra>
          <Space wrap>
            <Select
              :value="filters.candidate"
              placeholder="Filter by candidate"
              allow-clear
              show-search
              :filter-option="(input, option) => {
                return (option.label || '').toLowerCase().includes(input.toLowerCase());
              }"
              style="width: 200px"
              @change="handleCandidateFilter"
            >
              <SelectOption
                v-for="cand in candidates"
                :key="cand.id"
                :value="cand.id"
                :label="cand.name || (cand.first_name + ' ' + (cand.last_name || ''))"
              >
                <Space>
                  <UserOutlined />
                  {{ cand.name || (cand.first_name + ' ' + (cand.last_name || '')) }}
                </Space>
              </SelectOption>
            </Select>
            <Select
              :value="filters.status"
              placeholder="Filter by status"
              allow-clear
              style="width: 180px"
              @change="handleStatusFilter"
            >
              <SelectOption
                v-for="opt in statusOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </SelectOption>
            </Select>
            <Select
              :value="filters.document_type"
              placeholder="Filter by type"
              allow-clear
              show-search
              :filter-option="(input, option) => {
                return (option.label || '').toLowerCase().includes(input.toLowerCase());
              }"
              style="width: 180px"
              @change="handleTypeFilter"
            >
              <SelectOption
                v-for="dt in documentTypes"
                :key="dt.id"
                :value="dt.id"
                :label="dt.name"
              >
                {{ dt.name }}
              </SelectOption>
            </Select>
          </Space>
        </template>

        <Table
          :columns="columns"
          :data-source="documents"
          :loading="loading"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => 'Total ' + total + ' documents',
          }"
          :scroll="{ x: 1300 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'document_name'">
              <Space>
                <component :is="getFileIcon(record.file_name || record.document_name)" :style="{ color: getFileIconColor(record.file_name || record.document_name) }" />
                <span>{{ record.document_name || record.name || '-' }}</span>
              </Space>
            </template>
            <template v-if="column.key === 'category'">
              <Tag v-if="record.category">{{ record.category }}</Tag>
              <span v-else>-</span>
            </template>
            <template v-if="column.key === 'employee_name'">
              <Space>
                <Avatar size="small" :style="{ backgroundColor: '#1890ff' }">
                  <template #icon><UserOutlined /></template>
                </Avatar>
                <span>{{ record.employee_name || record.onboarding_employee_name || '-' }}</span>
              </Space>
            </template>
            <template v-if="column.key === 'status'">
              <Tag :color="getStatusColor(record.status)">
                {{ getStatusLabel(record.status) }}
              </Tag>
            </template>
            <template v-if="column.key === 'submitted_at'">
              {{ formatDate(record.submitted_at || record.created_at) }}
            </template>
            <template v-if="column.key === 'reviewed_by_name'">
              <span>{{ record.reviewed_by_name || '-' }}</span>
            </template>
            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="View Details">
                  <Button type="text" size="small" @click="openDetailDrawer(record)">
                    <template #icon><EyeOutlined /></template>
                  </Button>
                </Tooltip>
                <template v-if="record.status === 'submitted' || record.status === 'pending' || record.status === 'under_review'">
                  <Popconfirm
                    title="Approve this document?"
                    @confirm="handleApprove(record)"
                  >
                    <Tooltip title="Approve">
                      <Button type="text" size="small">
                        <template #icon><CheckCircleOutlined style="color: #52c41a" /></template>
                      </Button>
                    </Tooltip>
                  </Popconfirm>
                  <Tooltip title="Reject">
                    <Button type="text" size="small" @click="openRejectModal(record)">
                      <template #icon><CloseCircleOutlined style="color: #ff4d4f" /></template>
                    </Button>
                  </Tooltip>
                  <Tooltip title="Request Resubmission">
                    <Button type="text" size="small" @click="openVerifyModal(record, 'resubmit')">
                      <template #icon><ExclamationCircleOutlined style="color: #fa8c16" /></template>
                    </Button>
                  </Tooltip>
                </template>
                <Popconfirm
                  title="Are you sure you want to delete this document?"
                  ok-text="Delete"
                  ok-type="danger"
                  @confirm="handleDelete(record)"
                >
                  <Tooltip title="Delete">
                    <Button type="text" size="small" danger>
                      <template #icon><DeleteOutlined /></template>
                    </Button>
                  </Tooltip>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <!-- Document Detail Drawer -->
      <Drawer
        v-model:open="drawerVisible"
        title="Document Details"
        :width="600"
      >
        <Spin :spinning="detailLoading">
          <template v-if="selectedDocument">
            <Descriptions :column="1" bordered size="small" class="mv-mb-4">
              <DescriptionsItem label="Document Name">
                {{ selectedDocument.document_name || selectedDocument.name || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Document Type">
                {{ selectedDocument.document_type_name || '-' }}
              </DescriptionsItem>
              <DescriptionsItem v-if="selectedDocument.category" label="Category">
                <Tag>{{ selectedDocument.category }}</Tag>
              </DescriptionsItem>
              <DescriptionsItem label="Employee">
                {{ selectedDocument.employee_name || selectedDocument.onboarding_employee_name || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Status">
                <Tag :color="getStatusColor(selectedDocument.status)">
                  {{ getStatusLabel(selectedDocument.status) }}
                </Tag>
              </DescriptionsItem>
              <DescriptionsItem label="Submitted">
                {{ formatDateTime(selectedDocument.submitted_at || selectedDocument.created_at) }}
              </DescriptionsItem>
              <DescriptionsItem v-if="selectedDocument.reviewed_by_name" label="Reviewed By">
                {{ selectedDocument.reviewed_by_name }}
              </DescriptionsItem>
              <DescriptionsItem v-if="selectedDocument.reviewed_at" label="Reviewed At">
                {{ formatDateTime(selectedDocument.reviewed_at) }}
              </DescriptionsItem>
              <DescriptionsItem v-if="selectedDocument.document_number" label="Document Number">
                {{ selectedDocument.document_number }}
              </DescriptionsItem>
              <DescriptionsItem v-if="selectedDocument.issuing_authority" label="Issuing Authority">
                {{ selectedDocument.issuing_authority }}
              </DescriptionsItem>
              <DescriptionsItem v-if="selectedDocument.expiry_date" label="Expiry Date">
                {{ formatDate(selectedDocument.expiry_date) }}
              </DescriptionsItem>
            </Descriptions>

            <!-- File Preview Card -->
            <Card
              v-if="selectedDocument.file_url || selectedDocument.file || selectedDocument.file_name"
              size="small"
              class="mv-mb-4"
            >
              <template #title>
                <Space>
                  <component
                    :is="getFileIcon(selectedDocument.file_name || selectedDocument.document_name)"
                    :style="{ color: getFileIconColor(selectedDocument.file_name || selectedDocument.document_name), fontSize: '18px' }"
                  />
                  <span>Attached File</span>
                </Space>
              </template>
              <div class="doc-file-preview">
                <div class="doc-file-info">
                  <component
                    :is="getFileIcon(selectedDocument.file_name || selectedDocument.document_name)"
                    :style="{ color: getFileIconColor(selectedDocument.file_name || selectedDocument.document_name), fontSize: '36px' }"
                  />
                  <div class="doc-file-meta">
                    <div class="doc-file-name">
                      {{ selectedDocument.file_name || selectedDocument.document_name || 'Document' }}
                    </div>
                    <div class="doc-file-size mv-text-secondary">
                      {{ formatFileSize(selectedDocument.file_size) }}
                    </div>
                  </div>
                </div>
                <Button
                  type="primary"
                  :href="selectedDocument.file_url || selectedDocument.file"
                  target="_blank"
                >
                  <template #icon><DownloadOutlined /></template>
                  Download
                </Button>
              </div>
            </Card>

            <!-- Notes -->
            <div v-if="selectedDocument.notes" class="mv-mb-3">
              <h4 class="mv-font-bold mv-mb-1">Notes</h4>
              <div class="mv-detail-notes">
                {{ selectedDocument.notes }}
              </div>
            </div>

            <!-- Rejection Reason -->
            <div v-if="selectedDocument.rejection_reason" class="mv-mb-3">
              <h4 class="mv-font-bold mv-mb-1 mv-text-danger">Rejection Reason</h4>
              <div class="mv-detail-rejection">
                {{ selectedDocument.rejection_reason }}
              </div>
            </div>

            <!-- Verification History Timeline -->
            <div
              v-if="selectedDocument.verification_logs && selectedDocument.verification_logs.length > 0"
              class="mv-mb-4"
            >
              <Divider />
              <h4 class="mv-font-bold mv-mb-3">Verification History</h4>
              <Timeline>
                <TimelineItem
                  v-for="(log, index) in selectedDocument.verification_logs"
                  :key="index"
                  :color="getTimelineDotColor(log)"
                >
                  <div class="doc-timeline-item">
                    <div class="doc-timeline-header">
                      <Tag :color="getTimelineDotColor(log)">
                        {{ log.action || 'Action' }}
                      </Tag>
                      <span class="mv-text-secondary" style="font-size: 12px;">
                        {{ formatDateTime(log.created_at || log.timestamp) }}
                      </span>
                    </div>
                    <div v-if="log.performed_by_name || log.user_name" style="font-size: 13px; margin-top: 4px;">
                      By: {{ log.performed_by_name || log.user_name }}
                    </div>
                    <div v-if="log.notes || log.reason" class="mv-text-secondary" style="font-size: 12px; margin-top: 2px;">
                      {{ log.notes || log.reason }}
                    </div>
                  </div>
                </TimelineItem>
              </Timeline>
            </div>

            <Divider />

            <!-- Actions from drawer -->
            <template v-if="selectedDocument.status === 'submitted' || selectedDocument.status === 'pending' || selectedDocument.status === 'under_review'">
              <Space>
                <Popconfirm
                  title="Approve this document?"
                  @confirm="handleApprove(selectedDocument)"
                >
                  <Button type="primary">
                    <CheckCircleOutlined /> Approve
                  </Button>
                </Popconfirm>
                <Button danger @click="openRejectModal(selectedDocument)">
                  <CloseCircleOutlined /> Reject
                </Button>
                <Button @click="openVerifyModal(selectedDocument, 'resubmit')" style="color: #fa8c16; border-color: #fa8c16;">
                  <ExclamationCircleOutlined /> Request Resubmission
                </Button>
              </Space>
            </template>
          </template>
        </Spin>
      </Drawer>

      <!-- Verify / Reject / Resubmit Modal -->
      <Drawer
        v-model:open="verifyModalVisible"
        :title="verifyAction === 'reject' ? 'Reject Document' : 'Request Resubmission'"
        :width="420"
        @close="cancelVerify"
      >
        <template v-if="verifyRecord">
          <div v-if="verifyAction === 'resubmit'" class="doc-resubmit-banner mv-mb-4">
            <ExclamationCircleOutlined style="font-size: 20px; color: #fa8c16;" />
            <span>This will request the employee to resubmit the document.</span>
          </div>

          <Descriptions :column="1" size="small" bordered class="mv-mb-4">
            <DescriptionsItem label="Document">
              {{ verifyRecord.document_name || verifyRecord.name || '-' }}
            </DescriptionsItem>
            <DescriptionsItem label="Employee">
              {{ verifyRecord.employee_name || verifyRecord.onboarding_employee_name || '-' }}
            </DescriptionsItem>
          </Descriptions>

          <Form layout="vertical">
            <FormItem
              :label="verifyAction === 'reject' ? 'Rejection Reason' : 'Resubmission Reason'"
              required
            >
              <Textarea
                v-model:value="verifyReason"
                :rows="4"
                :placeholder="verifyAction === 'reject'
                  ? 'Please provide the reason for rejecting this document'
                  : 'Please explain why the document needs to be resubmitted'"
              />
            </FormItem>
          </Form>

          <div class="mv-mt-4">
            <Space>
              <Button
                v-if="verifyAction === 'reject'"
                type="primary"
                danger
                :loading="actionLoading"
                @click="handleVerifyAction"
              >
                Confirm Rejection
              </Button>
              <Button
                v-else
                type="primary"
                :loading="actionLoading"
                style="background: #fa8c16; border-color: #fa8c16;"
                @click="handleVerifyAction"
              >
                <SyncOutlined /> Request Resubmission
              </Button>
              <Button @click="cancelVerify">Cancel</Button>
            </Space>
          </div>
        </template>
      </Drawer>

      <!-- Upload Document Modal -->
      <Modal
        v-model:open="uploadModalVisible"
        title="Upload Document"
        :width="560"
        :footer="null"
        destroy-on-close
      >
        <Form layout="vertical">
          <FormItem label="Candidate" required>
            <Select
              v-model:value="uploadForm.candidate_id"
              placeholder="Select a candidate"
              show-search
              :filter-option="(input, option) => {
                return (option.label || '').toLowerCase().includes(input.toLowerCase());
              }"
              style="width: 100%"
            >
              <SelectOption
                v-for="cand in candidates"
                :key="cand.id"
                :value="cand.id"
                :label="cand.name || (cand.first_name + ' ' + (cand.last_name || ''))"
              >
                <Space>
                  <UserOutlined />
                  {{ cand.name || (cand.first_name + ' ' + (cand.last_name || '')) }}
                </Space>
              </SelectOption>
            </Select>
          </FormItem>

          <FormItem label="Document Type" required>
            <Select
              v-model:value="uploadForm.document_type_id"
              placeholder="Select document type"
              show-search
              :filter-option="(input, option) => {
                return (option.label || '').toLowerCase().includes(input.toLowerCase());
              }"
              style="width: 100%"
            >
              <SelectOption
                v-for="dt in documentTypes"
                :key="dt.id"
                :value="dt.id"
                :label="dt.name"
              >
                {{ dt.name }}
              </SelectOption>
            </Select>
          </FormItem>

          <FormItem label="File" required>
            <Upload
              :file-list="uploadFileList"
              :before-upload="handleBeforeUpload"
              :max-count="1"
              @remove="handleRemoveFile"
            >
              <div v-if="uploadFileList.length === 0" class="doc-upload-dragger">
                <p class="doc-upload-icon">
                  <InboxOutlined style="font-size: 36px; color: #1890ff;" />
                </p>
                <p class="doc-upload-text">Click or drag file to upload</p>
                <p class="doc-upload-hint mv-text-secondary">
                  PDF, Word, Excel, or image files accepted
                </p>
              </div>
            </Upload>
          </FormItem>

          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Document Number">
                <Input
                  v-model:value="uploadForm.document_number"
                  placeholder="e.g., ID-12345"
                />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Issuing Authority">
                <Input
                  v-model:value="uploadForm.issuing_authority"
                  placeholder="e.g., Government"
                />
              </FormItem>
            </Col>
          </Row>

          <FormItem label="Notes">
            <Textarea
              v-model:value="uploadForm.notes"
              :rows="3"
              placeholder="Additional notes about this document"
            />
          </FormItem>

          <div style="text-align: right; margin-top: 16px;">
            <Space>
              <Button @click="uploadModalVisible = false">Cancel</Button>
              <Button
                type="primary"
                :loading="uploadLoading"
                @click="handleUploadSubmit"
              >
                <UploadOutlined /> Upload
              </Button>
            </Space>
          </div>
        </Form>
      </Modal>
    </div>
  </Page>
</template>

<style scoped>
.mv-detail-notes {
  padding: 12px;
  background: #f5f5f5;
  border-radius: 6px;
  font-size: 13px;
  line-height: 1.6;
}

.mv-detail-rejection {
  padding: 12px;
  background: #fff2f0;
  border-radius: 6px;
  font-size: 13px;
  color: #cf1322;
  line-height: 1.6;
}

.mv-text-danger {
  color: #ff4d4f;
}

.doc-file-preview {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.doc-file-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.doc-file-meta {
  display: flex;
  flex-direction: column;
}

.doc-file-name {
  font-weight: 500;
  font-size: 14px;
  word-break: break-all;
}

.doc-file-size {
  font-size: 12px;
  margin-top: 2px;
}

.doc-timeline-item {
  padding-bottom: 4px;
}

.doc-timeline-header {
  display: flex;
  align-items: center;
  gap: 8px;
}

.doc-resubmit-banner {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 12px;
  background: #fff7e6;
  border: 1px solid #ffd591;
  border-radius: 6px;
  font-size: 13px;
}

.doc-upload-dragger {
  padding: 24px;
  border: 2px dashed #d9d9d9;
  border-radius: 8px;
  text-align: center;
  cursor: pointer;
  transition: border-color 0.3s;
}

.doc-upload-dragger:hover {
  border-color: #1890ff;
}

.doc-upload-icon {
  margin-bottom: 8px;
}

.doc-upload-text {
  font-size: 14px;
  margin-bottom: 4px;
}

.doc-upload-hint {
  font-size: 12px;
}
</style>
