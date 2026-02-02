<script setup>
import { onMounted, ref, watch } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  DatePicker,
  Form,
  FormItem,
  Input,
  Modal,
  Popconfirm,
  Select,
  SelectOption,
  Space,
  Spin,
  Switch,
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
  NotificationOutlined,
  PlusOutlined,
  ReloadOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import { useNotification } from '#/composables';
import {
  getAnnouncementsApi,
  createAnnouncementApi,
  updateAnnouncementApi,
  deleteAnnouncementApi,
  getAnnouncementStatsApi,
  ANNOUNCEMENT_PRIORITIES,
  ANNOUNCEMENT_TYPES,
} from '#/api/hrms_base';

defineOptions({
  name: 'HRMSAnnouncements',
});

const { success: showSuccess, error: showError } = useNotification();

const loading = ref(false);
const actionLoading = ref(false);
const announcements = ref([]);
const pagination = ref({
  current: 1,
  pageSize: 20,
  total: 0,
});

const filters = ref({
  is_published: null,
  is_active: null,
});

// Create/Edit modal
const formModalVisible = ref(false);
const isEditing = ref(false);
const editingId = ref(null);
const announcementForm = ref({
  title: '',
  content: '',
  announcement_type: 'general',
  priority: 'normal',
  start_date: null,
  end_date: null,
  is_published: false,
  requires_acknowledgment: false,
  is_active: true,
});

// Stats modal
const statsModalVisible = ref(false);
const selectedAnnouncement = ref(null);
const stats = ref(null);

const columns = [
  { title: 'Title', dataIndex: 'title', key: 'title', width: 250, ellipsis: true },
  { title: 'Type', key: 'type', width: 120 },
  { title: 'Priority', key: 'priority', width: 100 },
  { title: 'Date Range', key: 'dates', width: 180 },
  { title: 'Published', key: 'is_published', width: 90, align: 'center' },
  { title: 'Active', key: 'is_active', width: 80, align: 'center' },
  { title: 'Actions', key: 'actions', width: 150, fixed: 'right' },
];

async function fetchAnnouncements() {
  loading.value = true;
  try {
    const params = {
      skip: (pagination.value.current - 1) * pagination.value.pageSize,
      limit: pagination.value.pageSize,
    };
    if (filters.value.is_published !== null) params.is_published = filters.value.is_published;
    if (filters.value.is_active !== null) params.is_active = filters.value.is_active;

    const res = await getAnnouncementsApi(params);
    announcements.value = res.items || [];
    pagination.value.total = res.total || 0;
  } catch (err) {
    console.error('Failed to fetch announcements:', err);
    showError('Failed to load announcements');
  } finally {
    loading.value = false;
  }
}

function handleTableChange(pag) {
  pagination.value.current = pag.current;
  pagination.value.pageSize = pag.pageSize;
  fetchAnnouncements();
}

watch(filters, () => {
  pagination.value.current = 1;
  fetchAnnouncements();
}, { deep: true });

function resetForm() {
  announcementForm.value = {
    title: '',
    content: '',
    announcement_type: 'general',
    priority: 'normal',
    start_date: null,
    end_date: null,
    is_published: false,
    requires_acknowledgment: false,
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
  announcementForm.value = {
    title: record.title,
    content: record.content || '',
    announcement_type: record.announcement_type || 'general',
    priority: record.priority || 'normal',
    start_date: record.start_date ? dayjs(record.start_date) : null,
    end_date: record.end_date ? dayjs(record.end_date) : null,
    is_published: record.is_published ?? false,
    requires_acknowledgment: record.requires_acknowledgment ?? false,
    is_active: record.is_active !== false,
  };
  formModalVisible.value = true;
}

async function handleSave() {
  if (!announcementForm.value.title.trim()) {
    showError('Title is required');
    return;
  }

  actionLoading.value = true;
  try {
    const data = {
      ...announcementForm.value,
      start_date: announcementForm.value.start_date?.format('YYYY-MM-DD') || null,
      end_date: announcementForm.value.end_date?.format('YYYY-MM-DD') || null,
    };
    if (!data.content) data.content = null;

    if (isEditing.value) {
      await updateAnnouncementApi(editingId.value, data);
      showSuccess('Announcement updated successfully');
    } else {
      await createAnnouncementApi(data);
      showSuccess('Announcement created successfully');
    }
    formModalVisible.value = false;
    fetchAnnouncements();
  } catch (err) {
    console.error('Failed to save announcement:', err);
    showError(err.response?.data?.detail || 'Failed to save announcement');
  } finally {
    actionLoading.value = false;
  }
}

async function handleDelete(record) {
  actionLoading.value = true;
  try {
    await deleteAnnouncementApi(record.id);
    showSuccess('Announcement deleted successfully');
    fetchAnnouncements();
  } catch (err) {
    console.error('Failed to delete announcement:', err);
    showError(err.response?.data?.detail || 'Failed to delete announcement');
  } finally {
    actionLoading.value = false;
  }
}

async function openStatsModal(record) {
  selectedAnnouncement.value = record;
  statsModalVisible.value = true;
  try {
    stats.value = await getAnnouncementStatsApi(record.id);
  } catch (err) {
    console.error('Failed to fetch stats:', err);
    stats.value = null;
  }
}

function getPriorityConfig(priority) {
  return ANNOUNCEMENT_PRIORITIES.find(p => p.value === priority) || { label: priority, color: 'default' };
}

function getTypeConfig(type) {
  return ANNOUNCEMENT_TYPES.find(t => t.value === type) || { label: type };
}

function formatDate(dateStr) {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('MMM D, YYYY');
}

onMounted(() => {
  fetchAnnouncements();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading || actionLoading">
      <Card>
        <template #title>
          <Space>
            <NotificationOutlined />
            <span>Announcements</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Button type="primary" @click="openCreateModal">
              <PlusOutlined /> New Announcement
            </Button>
            <Button @click="fetchAnnouncements">
              <ReloadOutlined /> Refresh
            </Button>
          </Space>
        </template>

        <!-- Filters -->
        <div class="filters-row">
          <Space wrap>
            <Select
              v-model:value="filters.is_published"
              placeholder="Published status"
              allow-clear
              style="width: 150px"
            >
              <SelectOption :value="true">Published</SelectOption>
              <SelectOption :value="false">Draft</SelectOption>
            </Select>
            <Select
              v-model:value="filters.is_active"
              placeholder="Active status"
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
          :data-source="announcements"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} announcements`,
          }"
          :scroll="{ x: 1000 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'type'">
              <Tag>{{ getTypeConfig(record.announcement_type).label }}</Tag>
            </template>
            <template v-if="column.key === 'priority'">
              <Tag :color="getPriorityConfig(record.priority).color">
                {{ getPriorityConfig(record.priority).label }}
              </Tag>
            </template>
            <template v-if="column.key === 'dates'">
              <span>{{ formatDate(record.start_date) }} - {{ formatDate(record.end_date) }}</span>
            </template>
            <template v-if="column.key === 'is_published'">
              <Tag v-if="record.is_published" color="green">Published</Tag>
              <Tag v-else color="default">Draft</Tag>
            </template>
            <template v-if="column.key === 'is_active'">
              <CheckCircleOutlined v-if="record.is_active" style="color: #52c41a" />
              <CloseCircleOutlined v-else style="color: #ff4d4f" />
            </template>
            <template v-if="column.key === 'actions'">
              <Space>
                <Tooltip title="View Stats">
                  <Button size="small" @click="openStatsModal(record)">
                    <EyeOutlined />
                  </Button>
                </Tooltip>
                <Tooltip title="Edit">
                  <Button size="small" @click="openEditModal(record)">
                    <EditOutlined />
                  </Button>
                </Tooltip>
                <Popconfirm
                  title="Delete this announcement?"
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
      :title="isEditing ? 'Edit Announcement' : 'Create Announcement'"
      @ok="handleSave"
      :confirm-loading="actionLoading"
      width="700px"
    >
      <Form layout="vertical">
        <FormItem label="Title" required>
          <Input
            v-model:value="announcementForm.title"
            placeholder="Announcement title"
          />
        </FormItem>

        <FormItem label="Content">
          <Textarea
            v-model:value="announcementForm.content"
            :rows="6"
            placeholder="Announcement content..."
          />
        </FormItem>

        <div class="form-row">
          <FormItem label="Type" style="flex: 1">
            <Select v-model:value="announcementForm.announcement_type" style="width: 100%">
              <SelectOption v-for="t in ANNOUNCEMENT_TYPES" :key="t.value" :value="t.value">
                {{ t.label }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Priority" style="flex: 1">
            <Select v-model:value="announcementForm.priority" style="width: 100%">
              <SelectOption v-for="p in ANNOUNCEMENT_PRIORITIES" :key="p.value" :value="p.value">
                <Tag :color="p.color">{{ p.label }}</Tag>
              </SelectOption>
            </Select>
          </FormItem>
        </div>

        <div class="form-row">
          <FormItem label="Start Date" style="flex: 1">
            <DatePicker
              v-model:value="announcementForm.start_date"
              style="width: 100%"
              placeholder="Start date"
            />
          </FormItem>
          <FormItem label="End Date" style="flex: 1">
            <DatePicker
              v-model:value="announcementForm.end_date"
              style="width: 100%"
              placeholder="End date"
            />
          </FormItem>
        </div>

        <div class="form-row">
          <FormItem style="flex: 1">
            <Space direction="vertical">
              <Switch v-model:checked="announcementForm.is_published" />
              <span>Published</span>
            </Space>
          </FormItem>
          <FormItem style="flex: 1">
            <Space direction="vertical">
              <Switch v-model:checked="announcementForm.requires_acknowledgment" />
              <span>Requires Acknowledgment</span>
            </Space>
          </FormItem>
          <FormItem style="flex: 1">
            <Space direction="vertical">
              <Switch v-model:checked="announcementForm.is_active" />
              <span>Active</span>
            </Space>
          </FormItem>
        </div>
      </Form>
    </Modal>

    <!-- Stats Modal -->
    <Modal
      v-model:open="statsModalVisible"
      :title="'Stats: ' + (selectedAnnouncement?.title || '')"
      :footer="null"
      width="500px"
    >
      <div v-if="stats" class="stats-container">
        <div class="stat-item">
          <div class="stat-value">{{ stats.total_views || 0 }}</div>
          <div class="stat-label">Total Views</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.unique_views || 0 }}</div>
          <div class="stat-label">Unique Views</div>
        </div>
        <div class="stat-item">
          <div class="stat-value">{{ stats.acknowledgments || 0 }}</div>
          <div class="stat-label">Acknowledgments</div>
        </div>
      </div>
      <div v-else class="text-center">
        <Spin />
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

.stats-container {
  display: flex;
  justify-content: space-around;
  padding: 20px 0;
}

.stat-item {
  text-align: center;
}

.stat-value {
  font-size: 32px;
  font-weight: bold;
  color: #1890ff;
}

.stat-label {
  font-size: 14px;
  color: #666;
  margin-top: 8px;
}

.text-center {
  text-align: center;
  padding: 40px;
}
</style>
