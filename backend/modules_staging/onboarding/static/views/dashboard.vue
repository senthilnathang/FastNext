<script setup>
import { ref, onMounted, onUnmounted, computed } from 'vue';
import { Page } from '@vben/common-ui';
import {
  Card,
  Col,
  Row,
  Statistic,
  Progress,
  Table,
  Tag,
  Avatar,
  Spin,
  Empty,
  Button,
  Space,
  Badge,
  Tooltip,
  List,
} from 'ant-design-vue';

const ListItem = List.Item;
const ListItemMeta = List.Item.Meta;
import {
  RocketOutlined,
  CheckCircleOutlined,
  UserSwitchOutlined,
  ClockCircleOutlined,
  FileOutlined,
  SafetyCertificateOutlined,
  ExclamationCircleOutlined,
  UserAddOutlined,
  ReloadOutlined,
  PlusOutlined,
  ArrowRightOutlined,
  DashboardOutlined,
  SyncOutlined,
  CalendarOutlined,
  ThunderboltOutlined,
  TeamOutlined,
  EyeOutlined,
} from '@ant-design/icons-vue';

import { requestClient } from '#/api/request';
import { getTemplatesApi, getConversionsApi } from '#/api/onboarding';
import { useNotification } from '#/composables';

defineOptions({ name: 'OnboardingDashboard' });

const notify = useNotification();

// State
const loading = ref(false);
const autoRefreshTimer = ref(null);
const autoRefreshEnabled = ref(false);
const lastRefreshed = ref(null);

const stats = ref({
  processes: { total: 0, active: 0, completed_this_month: 0, ending_soon: 0, overdue: 0 },
  conversions: { ready: 0, pending: 0 },
  pending_items: { documents: 0, verifications: 0 },
  recent_processes: [],
});

const activeTemplates = ref([]);
const pendingConversions = ref([]);

// Status configuration
const processStatusConfig = {
  not_started: { label: 'Not Started', color: 'default' },
  in_progress: { label: 'In Progress', color: 'processing' },
  on_hold: { label: 'On Hold', color: 'warning' },
  completed: { label: 'Completed', color: 'success' },
  cancelled: { label: 'Cancelled', color: 'error' },
  converted: { label: 'Converted', color: 'purple' },
};

// Status distribution color map
const statusColorMap = {
  not_started: '#d9d9d9',
  in_progress: '#1890ff',
  on_hold: '#faad14',
  completed: '#52c41a',
  cancelled: '#ff4d4f',
  converted: '#722ed1',
};

// Stat cards configuration
const statCards = computed(() => {
  return [
    {
      title: 'Active Processes',
      value: stats.value.processes.active,
      icon: RocketOutlined,
      color: '#1890ff',
      bgClass: 'ob-stat-bg-blue',
      suffix: stats.value.processes.total > 0 ? ('of ' + stats.value.processes.total) : null,
    },
    {
      title: 'Completed This Month',
      value: stats.value.processes.completed_this_month,
      icon: CheckCircleOutlined,
      color: '#52c41a',
      bgClass: 'ob-stat-bg-green',
    },
    {
      title: 'Ready for Conversion',
      value: stats.value.conversions.ready,
      icon: UserSwitchOutlined,
      color: '#722ed1',
      bgClass: 'ob-stat-bg-purple',
    },
    {
      title: 'Ending Soon',
      value: stats.value.processes.ending_soon,
      icon: ClockCircleOutlined,
      color: '#faad14',
      bgClass: 'ob-stat-bg-orange',
    },
  ];
});

// Pending items configuration
const pendingItems = computed(() => {
  return [
    {
      title: 'Documents to Review',
      value: stats.value.pending_items.documents,
      icon: FileOutlined,
      color: '#ff7a45',
    },
    {
      title: 'Verifications Pending',
      value: stats.value.pending_items.verifications,
      icon: SafetyCertificateOutlined,
      color: '#eb2f96',
    },
    {
      title: 'Overdue Processes',
      value: stats.value.processes.overdue,
      icon: ExclamationCircleOutlined,
      color: '#f5222d',
    },
    {
      title: 'Pending Conversions',
      value: stats.value.conversions.pending,
      icon: UserAddOutlined,
      color: '#13c2c2',
    },
  ];
});

// Status distribution computed
const statusDistribution = computed(() => {
  const byStatus = (stats.value.processes && stats.value.processes.by_status) || {};
  const items = [];
  Object.keys(byStatus).forEach((key) => {
    const config = processStatusConfig[key] || { label: key, color: 'default' };
    items.push({
      key: key,
      label: config.label,
      count: byStatus[key],
      tagColor: config.color,
      dotColor: statusColorMap[key] || '#d9d9d9',
    });
  });
  return items;
});

// Table columns for recent processes
const processColumns = [
  {
    title: 'Candidate',
    dataIndex: 'candidate_name',
    key: 'candidate_name',
    width: 200,
  },
  {
    title: 'Position',
    dataIndex: 'recruitment_title',
    key: 'recruitment_title',
    width: 180,
    ellipsis: true,
  },
  {
    title: 'Stage',
    dataIndex: 'current_stage_name',
    key: 'current_stage_name',
    width: 140,
  },
  {
    title: 'Status',
    dataIndex: 'status',
    key: 'status',
    width: 120,
  },
  {
    title: 'Progress',
    key: 'progress',
    width: 160,
  },
  {
    title: 'Start Date',
    dataIndex: 'start_date',
    key: 'start_date',
    width: 120,
  },
  {
    title: 'Expected End',
    dataIndex: 'expected_end_date',
    key: 'expected_end',
    width: 120,
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 90,
    fixed: 'right',
  },
];

// Navigation helper
function navigateTo(path) {
  console.log('Navigate to:', path);
}

// Fetch dashboard stats
async function fetchDashboard() {
  loading.value = true;
  try {
    const results = await Promise.all([
      requestClient.get('/onboarding/dashboard/stats').catch((err) => {
        console.error('Dashboard stats error:', err);
        return null;
      }),
      getTemplatesApi({ status: 'active', page_size: 5 }).catch((err) => {
        console.error('Templates fetch error:', err);
        return null;
      }),
      getConversionsApi({ status: 'ready', page_size: 5 }).catch((err) => {
        console.error('Conversions fetch error:', err);
        return null;
      }),
    ]);

    const dashboardData = results[0];
    const templatesData = results[1];
    const conversionsData = results[2];

    if (dashboardData) {
      stats.value = dashboardData;
      lastRefreshed.value = new Date();
    } else {
      try {
        const fallback = await requestClient.get('/onboarding/dashboard');
        if (fallback && fallback.processes) {
          stats.value = fallback;
          lastRefreshed.value = new Date();
        }
      } catch (fallbackErr) {
        notify.error('Failed to load dashboard data');
      }
    }

    if (templatesData) {
      activeTemplates.value = Array.isArray(templatesData) ? templatesData : (templatesData.items || templatesData.results || []);
    }

    if (conversionsData) {
      pendingConversions.value = Array.isArray(conversionsData) ? conversionsData : (conversionsData.items || conversionsData.results || []);
    }
  } catch (err) {
    console.error('Dashboard fetch error:', err);
    notify.error('Failed to load dashboard data');
  } finally {
    loading.value = false;
  }
}

// Progress bar status helper
function getProgressStatus(progress) {
  if (progress >= 100) return 'success';
  if (progress >= 50) return 'active';
  if (progress >= 25) return 'normal';
  return 'exception';
}

// Progress bar color helper
function getProgressColor(progress) {
  if (progress >= 100) return '#52c41a';
  if (progress >= 75) return '#1890ff';
  if (progress >= 50) return '#13c2c2';
  if (progress >= 25) return '#faad14';
  return '#ff4d4f';
}

// Get candidate initials
function getInitials(name) {
  if (!name) return 'C';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return (parts[0].charAt(0) + parts[1].charAt(0)).toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

// Format date string
function formatDate(dateStr) {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch (e) {
    return dateStr;
  }
}

// Auto-refresh toggle
function toggleAutoRefresh() {
  autoRefreshEnabled.value = !autoRefreshEnabled.value;
  if (autoRefreshEnabled.value) {
    autoRefreshTimer.value = setInterval(fetchDashboard, 60000);
    notify.success('Auto-refresh enabled', 'Dashboard will refresh every 60 seconds');
  } else {
    if (autoRefreshTimer.value) {
      clearInterval(autoRefreshTimer.value);
      autoRefreshTimer.value = null;
    }
    notify.info('Auto-refresh disabled');
  }
}

// Last refreshed display
const lastRefreshedText = computed(() => {
  if (!lastRefreshed.value) return '';
  return 'Last updated: ' + lastRefreshed.value.toLocaleTimeString();
});

// Has any pending items
const totalPending = computed(() => {
  return pendingItems.value.reduce((sum, item) => sum + item.value, 0);
});

// Lifecycle
onMounted(() => {
  fetchDashboard();
});

onUnmounted(() => {
  if (autoRefreshTimer.value) {
    clearInterval(autoRefreshTimer.value);
  }
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <div class="mv-p-6">
        <!-- Page Header -->
        <div class="mv-page-header mv-mb-6">
          <div>
            <h1 class="mv-page-title">
              <DashboardOutlined class="mv-mr-2" />
              Onboarding Dashboard
            </h1>
            <p class="mv-page-subtitle mv-mt-1">
              Overview of all onboarding activities and metrics
            </p>
            <span v-if="lastRefreshedText" class="mv-text-xs mv-text-muted">
              {{ lastRefreshedText }}
            </span>
          </div>
          <Space>
            <Tooltip :title="autoRefreshEnabled ? 'Disable auto-refresh' : 'Enable auto-refresh (60s)'">
              <Button
                :type="autoRefreshEnabled ? 'primary' : 'default'"
                :ghost="autoRefreshEnabled"
                @click="toggleAutoRefresh"
              >
                <template #icon><SyncOutlined :spin="autoRefreshEnabled" /></template>
                Auto
              </Button>
            </Tooltip>
            <Button @click="fetchDashboard" :loading="loading">
              <template #icon><ReloadOutlined /></template>
              Refresh
            </Button>
            <Button type="primary" @click="navigateTo('/onboarding/processes/new')">
              <template #icon><PlusOutlined /></template>
              Start New Onboarding
            </Button>
          </Space>
        </div>

        <!-- Stat Cards -->
        <Row :gutter="[16, 16]" class="mv-mb-6">
          <Col v-for="stat in statCards" :key="stat.title" :xs="12" :sm="12" :md="6">
            <Card size="small" class="ob-stat-card mv-card-hover" hoverable>
              <div class="ob-stat-item">
                <div class="ob-stat-icon" :class="stat.bgClass">
                  <component :is="stat.icon" :style="{ fontSize: '24px', color: stat.color }" />
                </div>
                <div class="ob-stat-info">
                  <div class="mv-text-secondary mv-text-sm">{{ stat.title }}</div>
                  <div class="ob-stat-number" :style="{ color: stat.color }">
                    {{ stat.value }}
                    <span v-if="stat.suffix" class="ob-stat-suffix">
                      {{ stat.suffix }}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <!-- Main Content Grid -->
        <Row :gutter="[16, 16]">
          <!-- Left Column: Active Processes Table -->
          <Col :xs="24" :lg="16">
            <Card title="Recent Onboarding Processes" :body-style="{ padding: 0 }">
              <template #extra>
                <Button type="link" size="small" @click="navigateTo('/onboarding/processes')">
                  View All <ArrowRightOutlined />
                </Button>
              </template>

              <Table
                v-if="stats.recent_processes && stats.recent_processes.length"
                :columns="processColumns"
                :data-source="stats.recent_processes"
                :pagination="false"
                :scroll="{ x: 1000 }"
                row-key="id"
                size="small"
                class="ob-processes-table"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'candidate_name'">
                    <div class="mv-flex mv-items-center mv-gap-2">
                      <Avatar :size="32" :style="{ backgroundColor: '#1890ff', fontSize: '13px' }">
                        {{ getInitials(record.candidate_name) }}
                      </Avatar>
                      <div>
                        <div class="mv-font-medium">{{ record.candidate_name || 'Unknown' }}</div>
                        <div v-if="record.candidate_email" class="mv-text-xs mv-text-muted">
                          {{ record.candidate_email }}
                        </div>
                      </div>
                    </div>
                  </template>

                  <template v-else-if="column.key === 'current_stage_name'">
                    <Tag color="blue">
                      {{ record.current_stage_name || 'Not Started' }}
                    </Tag>
                  </template>

                  <template v-else-if="column.key === 'status'">
                    <Tag :color="(processStatusConfig[record.status] || {}).color || 'default'">
                      {{ (processStatusConfig[record.status] || {}).label || record.status }}
                    </Tag>
                  </template>

                  <template v-else-if="column.key === 'progress'">
                    <div class="ob-progress-cell">
                      <Progress
                        :percent="record.overall_progress || 0"
                        :status="getProgressStatus(record.overall_progress || 0)"
                        :stroke-color="getProgressColor(record.overall_progress || 0)"
                        size="small"
                      />
                    </div>
                  </template>

                  <template v-else-if="column.key === 'start_date'">
                    {{ formatDate(record.start_date) }}
                  </template>

                  <template v-else-if="column.key === 'expected_end'">
                    {{ formatDate(record.expected_end_date) }}
                  </template>

                  <template v-else-if="column.key === 'actions'">
                    <Button
                      type="link"
                      size="small"
                      @click="navigateTo('/onboarding/processes/' + record.id)"
                    >
                      <template #icon><EyeOutlined /></template>
                      View
                    </Button>
                  </template>
                </template>
              </Table>

              <Empty
                v-else
                description="No active onboarding processes"
                class="mv-py-6"
              >
                <Button type="primary" @click="navigateTo('/onboarding/processes/new')">
                  <template #icon><PlusOutlined /></template>
                  Start First Onboarding
                </Button>
              </Empty>
            </Card>

            <!-- Average Progress Card -->
            <Card title="Average Progress Overview" class="mv-mt-4">
              <Row :gutter="[24, 16]">
                <Col :xs="24" :sm="8">
                  <div class="ob-progress-gauge">
                    <Progress
                      type="dashboard"
                      :percent="stats.progress ? stats.progress.average_overall : 0"
                      :stroke-color="{ '0%': '#108ee9', '100%': '#87d068' }"
                      :width="100"
                    />
                    <div class="mv-mt-2 mv-font-medium mv-text-center">Overall</div>
                  </div>
                </Col>
                <Col :xs="24" :sm="8">
                  <div class="ob-progress-gauge">
                    <Progress
                      type="dashboard"
                      :percent="stats.progress ? stats.progress.average_tasks : 0"
                      stroke-color="#722ed1"
                      :width="100"
                    />
                    <div class="mv-mt-2 mv-font-medium mv-text-center">Tasks</div>
                  </div>
                </Col>
                <Col :xs="24" :sm="8">
                  <div class="ob-progress-gauge">
                    <Progress
                      type="dashboard"
                      :percent="stats.progress ? stats.progress.average_documents : 0"
                      stroke-color="#13c2c2"
                      :width="100"
                    />
                    <div class="mv-mt-2 mv-font-medium mv-text-center">Documents</div>
                  </div>
                </Col>
              </Row>
            </Card>

            <!-- Status Distribution Card -->
            <Card title="Status Distribution" class="mv-mt-4" v-if="statusDistribution.length > 0">
              <Row :gutter="[16, 16]">
                <Col
                  v-for="item in statusDistribution"
                  :key="item.key"
                  :xs="12"
                  :sm="8"
                  :md="6"
                >
                  <Statistic :title="item.label" :value="item.count">
                    <template #suffix>
                      <Tag :color="item.tagColor" size="small" class="mv-ml-1">
                        {{ item.label }}
                      </Tag>
                    </template>
                  </Statistic>
                </Col>
              </Row>
            </Card>
          </Col>

          <!-- Right Column: Sidebar -->
          <Col :xs="24" :lg="8">
            <!-- Pending Items Card -->
            <Card class="mv-mb-4">
              <template #title>
                <span>Pending Items</span>
                <Badge
                  v-if="totalPending > 0"
                  :count="totalPending"
                  :offset="[8, -2]"
                  :number-style="{ backgroundColor: '#ff4d4f' }"
                  class="mv-ml-2"
                />
              </template>
              <div class="ob-pending-list">
                <div
                  v-for="item in pendingItems"
                  :key="item.title"
                  class="ob-pending-item"
                >
                  <div class="mv-flex mv-items-center mv-gap-3">
                    <component
                      :is="item.icon"
                      :style="{ fontSize: '18px', color: item.color }"
                    />
                    <span class="mv-text-sm">{{ item.title }}</span>
                  </div>
                  <Badge
                    :count="item.value"
                    :show-zero="true"
                    :number-style="{
                      backgroundColor: item.value > 0 ? item.color : '#d9d9d9',
                      fontSize: '12px',
                    }"
                  />
                </div>
              </div>
            </Card>

            <!-- Ready for Conversion Card -->
            <Card class="mv-mb-4">
              <template #title>
                <span>
                  <UserSwitchOutlined class="mv-mr-1" />
                  Ready for Conversion
                </span>
              </template>
              <template #extra>
                <Button type="link" size="small" @click="navigateTo('/onboarding/conversions')">
                  View All
                </Button>
              </template>

              <List
                v-if="pendingConversions.length > 0"
                :data-source="pendingConversions"
                size="small"
              >
                <template #renderItem="{ item }">
                  <ListItem>
                    <ListItemMeta>
                      <template #avatar>
                        <Avatar :size="36" :style="{ backgroundColor: '#722ed1', fontSize: '13px' }">
                          {{ getInitials(item.candidate_name || item.name) }}
                        </Avatar>
                      </template>
                      <template #title>
                        <div class="mv-flex mv-items-center mv-gap-2">
                          <span class="mv-font-medium">{{ item.candidate_name || item.name || 'Unknown' }}</span>
                          <Tag color="success" size="small">Ready</Tag>
                        </div>
                      </template>
                      <template #description>
                        <div class="mv-text-xs mv-text-secondary">
                          <span v-if="item.job_position || item.position">{{ item.job_position || item.position }}</span>
                          <span v-if="item.joining_date">
                            <CalendarOutlined class="mv-ml-2 mv-mr-1" />
                            {{ formatDate(item.joining_date) }}
                          </span>
                        </div>
                      </template>
                    </ListItemMeta>
                    <template #actions>
                      <Button
                        type="primary"
                        size="small"
                        ghost
                        @click="navigateTo('/onboarding/conversions/' + item.id + '/convert')"
                      >
                        Convert
                      </Button>
                    </template>
                  </ListItem>
                </template>
              </List>

              <Empty
                v-else
                description="No candidates ready for conversion"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </Card>

            <!-- Active Templates Card -->
            <Card class="mv-mb-4">
              <template #title>
                <span>
                  <ThunderboltOutlined class="mv-mr-1" />
                  Active Templates
                </span>
              </template>
              <template #extra>
                <Button type="link" size="small" @click="navigateTo('/onboarding/templates')">
                  Manage
                </Button>
              </template>

              <List
                v-if="activeTemplates.length > 0"
                :data-source="activeTemplates"
                size="small"
              >
                <template #renderItem="{ item }">
                  <ListItem>
                    <ListItemMeta>
                      <template #avatar>
                        <Avatar :size="36" :style="{ backgroundColor: '#1890ff' }">
                          <template #icon><FileOutlined /></template>
                        </Avatar>
                      </template>
                      <template #title>
                        <div class="mv-flex mv-items-center mv-gap-2">
                          <span class="mv-font-medium">{{ item.name || 'Untitled Template' }}</span>
                          <Tag v-if="item.is_default" color="blue" size="small">Default</Tag>
                        </div>
                      </template>
                      <template #description>
                        <div class="mv-text-xs mv-text-secondary">
                          <span v-if="item.stages_count != null">
                            <TeamOutlined class="mv-mr-1" />
                            {{ item.stages_count }} stages
                          </span>
                          <span v-if="item.tasks_count != null" class="mv-ml-2">
                            {{ item.tasks_count }} tasks
                          </span>
                          <span v-if="item.duration_days != null" class="mv-ml-2">
                            <ClockCircleOutlined class="mv-mr-1" />
                            {{ item.duration_days }}d
                          </span>
                        </div>
                      </template>
                    </ListItemMeta>
                  </ListItem>
                </template>
              </List>

              <Empty
                v-else
                description="No active templates"
                :image="Empty.PRESENTED_IMAGE_SIMPLE"
              />
            </Card>

            <!-- Quick Actions Card -->
            <Card title="Quick Actions" class="mv-mb-4">
              <div class="ob-quick-actions">
                <Button block class="ob-action-btn" @click="navigateTo('/onboarding/processes/new')">
                  <template #icon><PlusOutlined /></template>
                  New Onboarding Process
                </Button>
                <Button block class="ob-action-btn" @click="navigateTo('/onboarding/conversions')">
                  <template #icon><UserSwitchOutlined /></template>
                  Convert to Employee
                </Button>
                <Button block class="ob-action-btn" @click="navigateTo('/onboarding/documents')">
                  <template #icon><FileOutlined /></template>
                  Review Documents
                </Button>
                <Button block class="ob-action-btn" @click="navigateTo('/onboarding/verifications')">
                  <template #icon><SafetyCertificateOutlined /></template>
                  Verify Candidates
                </Button>
              </div>
            </Card>

            <!-- Overdue Alert Card -->
            <Card
              v-if="stats.processes.overdue > 0"
              class="ob-alert-card"
              :body-style="{ padding: '16px' }"
            >
              <div class="mv-flex mv-items-center mv-gap-3">
                <ExclamationCircleOutlined
                  :style="{ fontSize: '24px', color: '#f5222d' }"
                />
                <div>
                  <div class="mv-font-semibold" style="color: #cf1322;">
                    {{ stats.processes.overdue }} Overdue Process{{ stats.processes.overdue > 1 ? 'es' : '' }}
                  </div>
                  <div class="mv-text-xs mv-text-secondary">
                    These processes have exceeded their expected end date
                  </div>
                </div>
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    </Spin>
  </Page>
</template>
