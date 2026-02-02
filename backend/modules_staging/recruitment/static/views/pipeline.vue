<script setup>
import { computed, onMounted, ref } from 'vue';

import { KanbanBoard, Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  Col,
  Drawer,
  Rate,
  Row,
  Select,
  SelectOption,
  Space,
  Statistic,
  Table,
  Tag,
  Timeline,
  Tooltip,
  message,
  TimelineItem,
} from 'ant-design-vue';
import {
  AppstoreOutlined,
  CalendarOutlined,
  EyeOutlined,
  MailOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
  UnorderedListOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import {
  getApplicationsApi,
  getJobsApi,
  getStagesApi,
  moveApplicationStageApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTPipelineList',
});

const loading = ref(false);
const applications = ref([]);
const jobs = ref([]);
const stages = ref([]);
const selectedJobId = ref(undefined);
const showApplicationDrawer = ref(false);
const selectedApplication = ref(null);
const viewMode = ref('kanban');

const tableColumns = computed(() => [
  {
    title: '',
    key: 'avatar',
    width: 60,
  },
  {
    title: 'Candidate',
    key: 'name',
    sorter: (a, b) =>
      getCandidateName(a).localeCompare(getCandidateName(b)),
  },
  {
    title: 'Email',
    key: 'email',
  },
  {
    title: 'Position',
    key: 'position',
  },
  {
    title: 'Stage',
    key: 'stage',
    width: 150,
    filters: stages.value.map((s) => ({ text: s.name, value: s.id })),
    onFilter: (value, record) =>
      record.stage_id === value,
  },
  {
    title: 'Applied',
    key: 'applied_date',
    width: 120,
    sorter: (a, b) => {
      const dateA = a.applied_date ? new Date(a.applied_date).getTime() : 0;
      const dateB = b.applied_date ? new Date(b.applied_date).getTime() : 0;
      return dateA - dateB;
    },
  },
  {
    title: 'Rating',
    key: 'rating',
    width: 150,
    sorter: (a, b) => (a.rating || 0) - (b.rating || 0),
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
    fixed: 'right',
  },
]);

// Map stage names to colors
function getStageColor(stageName) {
  const normalized = stageName.toLowerCase();
  if (normalized.includes('applied') || normalized.includes('initial'))
    return '#1890ff';
  if (normalized.includes('screening') || normalized.includes('test'))
    return '#722ed1';
  if (normalized.includes('interview')) return '#faad14';
  if (normalized.includes('offer')) return '#52c41a';
  if (normalized.includes('hired')) return '#13c2c2';
  if (normalized.includes('reject') || normalized.includes('cancel'))
    return '#f5222d';
  return '#1890ff';
}

const columns = computed(() => {
  const sortedStages = [...stages.value].sort(
    (a, b) => a.sequence - b.sequence,
  );

  return sortedStages.map((stage) => ({
    id: stage.id,
    title: stage.name,
    color: getStageColor(stage.name),
    items: applications.value.filter((app) => app.stage_id === stage.id),
  }));
});

// Stages to display in statistics (first 5)
const displayStages = computed(() => {
  return [...stages.value]
    .sort((a, b) => a.sequence - b.sequence)
    .slice(0, 5);
});

const statistics = computed(() => {
  const total = applications.value.length;
  const byStage = {};

  for (const stage of stages.value) {
    byStage[stage.id] = applications.value.filter(
      (app) => app.stage_id === stage.id,
    ).length;
  }

  return { total, byStage };
});

async function fetchStages() {
  try {
    const response = await getStagesApi({ page_size: 100 });
    const allStages = response.items || [];

    // Deduplicate stages by name, keeping the one with lowest sequence
    const stageMap = new Map();
    allStages.sort(
      (a, b) =>
        a.sequence - b.sequence,
    );

    for (const stage of allStages) {
      if (!stageMap.has(stage.name)) {
        stageMap.set(stage.name, stage);
      }
    }

    stages.value = Array.from(stageMap.values());
  } catch (error) {
    console.error('Failed to fetch stages:', error);
    stages.value = [];
  }
}

async function fetchJobs() {
  try {
    const response = await getJobsApi({ page_size: 100, status: 'open' });
    jobs.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
  }
}

async function fetchApplications() {
  loading.value = true;
  try {
    const params = { page_size: 100 };
    if (selectedJobId.value) {
      params.job_id = selectedJobId.value;
    }
    const response = await getApplicationsApi(params);
    applications.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch applications:', error);
    message.error('Failed to load applications');
  } finally {
    loading.value = false;
  }
}

async function handleItemMove(payload) {
  const { item, fromColumn, toColumn } = payload;

  if (fromColumn === toColumn) return;

  const targetStage = stages.value.find((s) => s.id === toColumn);
  if (!targetStage) return;

  const appIndex = applications.value.findIndex((a) => a.id === item.id);
  const oldStageId = item.stage_id;
  const oldStage = item.stage;

  // Optimistically update UI
  if (appIndex !== -1) {
    applications.value[appIndex].stage_id = toColumn;
    applications.value[appIndex].stage = targetStage;
  }

  try {
    await moveApplicationStageApi(item.id, targetStage.id);
    message.success(`Moved ${getCandidateName(item)} to ${targetStage.name}`);
  } catch (error) {
    console.error('Failed to move application stage:', error);
    message.error('Failed to update application stage');
    // Revert on failure
    if (appIndex !== -1) {
      applications.value[appIndex].stage_id = oldStageId;
      applications.value[appIndex].stage = oldStage;
    }
  }
}

function handleItemClick(payload) {
  selectedApplication.value = payload.item;
  showApplicationDrawer.value = true;
}

function handleJobChange(value) {
  selectedJobId.value = value;
  fetchApplications();
}

async function handleStageChange(application, newStageId) {
  const newStage = stages.value.find((s) => s.id === newStageId);
  if (!newStage || application.stage_id === newStage.id) return;

  const oldStageId = application.stage_id;
  const oldStage = application.stage;

  // Optimistically update UI
  const appIndex = applications.value.findIndex(
    (a) => a.id === application.id,
  );
  if (appIndex !== -1) {
    applications.value[appIndex].stage_id = newStage.id;
    applications.value[appIndex].stage = newStage;
  }

  try {
    await moveApplicationStageApi(application.id, newStage.id);
    message.success(
      `Moved ${getCandidateName(application)} to ${newStage.name}`,
    );
  } catch (error) {
    console.error('Failed to update application stage:', error);
    message.error('Failed to update application stage');
    // Revert on failure
    if (appIndex !== -1) {
      applications.value[appIndex].stage_id = oldStageId;
      applications.value[appIndex].stage = oldStage;
    }
  }
}

function handleViewApplication(application) {
  selectedApplication.value = application;
  showApplicationDrawer.value = true;
}

function toggleViewMode(mode) {
  viewMode.value = mode;
}

function formatDate(dateString) {
  if (!dateString) return '-';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function getInitials(application) {
  const candidate = application.candidate;
  if (candidate?.first_name && candidate?.last_name) {
    return `${candidate.first_name.charAt(0)}${candidate.last_name.charAt(0)}`.toUpperCase();
  }
  if (candidate?.first_name) {
    return candidate.first_name.charAt(0).toUpperCase();
  }
  return 'C';
}

function getCandidateName(application) {
  const candidate = application.candidate;
  if (candidate?.first_name && candidate?.last_name) {
    return `${candidate.first_name} ${candidate.last_name}`;
  }
  if (candidate?.first_name) {
    return candidate.first_name;
  }
  return 'Unknown';
}

function getStageName(application) {
  return application.stage?.name || 'Unknown';
}

function getCandidateEmail(application) {
  return application.candidate?.email || '';
}

function getCandidateExperience(application) {
  return application.candidate?.experience_years ?? null;
}

function getJobTitle(application) {
  return application.job?.title || 'No position';
}

onMounted(() => {
  fetchJobs();
  fetchStages();
  fetchApplications();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-2xl font-bold">Recruitment Pipeline</h1>
        <Space>
          <Select
            v-model:value="selectedJobId"
            placeholder="Filter by Job"
            style="width: 250px"
            allow-clear
            @change="handleJobChange"
          >
            <SelectOption v-for="job in jobs" :key="job.id" :value="job.id">
              {{ job.title }}
            </SelectOption>
          </Select>
          <Button @click="fetchApplications">
            <template #icon>
              <ReloadOutlined />
            </template>
          </Button>

          <!-- View Toggle Buttons -->
          <div class="view-toggle-group">
            <Tooltip title="Kanban View">
              <Button
                :type="viewMode === 'kanban' ? 'primary' : 'default'"
                @click="toggleViewMode('kanban')"
              >
                <template #icon>
                  <AppstoreOutlined />
                </template>
              </Button>
            </Tooltip>
            <Tooltip title="List View">
              <Button
                :type="viewMode === 'list' ? 'primary' : 'default'"
                @click="toggleViewMode('list')"
              >
                <template #icon>
                  <UnorderedListOutlined />
                </template>
              </Button>
            </Tooltip>
          </div>
        </Space>
      </div>

      <!-- Statistics -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="12" :sm="8" :md="4">
          <Card size="small">
            <Statistic
              title="Total"
              :value="statistics.total"
              :value-style="{ color: '#1890ff', fontSize: '20px' }"
            >
              <template #prefix>
                <TeamOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col
          v-for="stage in displayStages"
          :key="stage.id"
          :xs="12"
          :sm="8"
          :md="4"
        >
          <Card size="small">
            <Statistic
              :title="stage.name"
              :value="statistics.byStage[stage.id] || 0"
              :value-style="{
                color: getStageColor(stage.name),
                fontSize: '20px',
              }"
            />
          </Card>
        </Col>
      </Row>

      <!-- Kanban Board -->
      <Card v-if="viewMode === 'kanban'" :body-style="{ padding: 0 }">
        <KanbanBoard
          :columns="columns"
          :loading="loading"
          :column-width="280"
          :column-gap="12"
          empty-text="No applications"
          @item-move="handleItemMove"
          @item-click="handleItemClick"
        >
          <template #item="{ item }">
            <div class="candidate-card">
              <div class="candidate-header">
                <Avatar
                  :size="36"
                  :style="{
                    backgroundColor: getStageColor(getStageName(item)),
                  }"
                >
                  {{ getInitials(item) }}
                </Avatar>
                <div class="candidate-info">
                  <div class="candidate-name">
                    {{ getCandidateName(item) }}
                  </div>
                  <div class="candidate-job text-xs text-gray-500">
                    {{ getJobTitle(item) }}
                  </div>
                </div>
              </div>

              <div class="candidate-meta">
                <div class="meta-item">
                  <MailOutlined class="text-gray-400" />
                  <span class="truncate text-xs text-gray-600">
                    {{ getCandidateEmail(item) }}
                  </span>
                </div>
                <div v-if="getCandidateExperience(item)" class="meta-item">
                  <UserOutlined class="text-gray-400" />
                  <span class="text-xs text-gray-600">
                    {{ getCandidateExperience(item) }} years exp.
                  </span>
                </div>
              </div>

              <div class="candidate-footer">
                <div class="flex items-center gap-2">
                  <CalendarOutlined class="text-gray-400" />
                  <span class="text-xs text-gray-500">
                    {{ formatDate(item.applied_date) }}
                  </span>
                </div>
                <Rate
                  v-if="item.rating"
                  :value="item.rating"
                  disabled
                  :count="5"
                  style="font-size: 12px"
                />
              </div>
            </div>
          </template>

          <template #column-footer>
            <Button type="dashed" block size="small" class="mt-2">
              <PlusOutlined />
              Add Application
            </Button>
          </template>
        </KanbanBoard>
      </Card>

      <!-- List View -->
      <Card v-else>
        <Table
          :columns="tableColumns"
          :data-source="applications"
          :loading="loading"
          :scroll="{ x: 1000 }"
          row-key="id"
        >
          <template #bodyCell="{ column, record: rawRecord }">
            <template v-if="column.key === 'avatar'">
              <Avatar
                :size="40"
                :style="{
                  backgroundColor: getStageColor(
                    getStageName(rawRecord),
                  ),
                }"
              >
                {{ getInitials(rawRecord) }}
              </Avatar>
            </template>

            <template v-if="column.key === 'name'">
              <div>
                <div class="font-medium">
                  {{ getCandidateName(rawRecord) }}
                </div>
                <div
                  v-if="getCandidateExperience(rawRecord)"
                  class="text-xs text-gray-500"
                >
                  {{ getCandidateExperience(rawRecord) }}
                  years experience
                </div>
              </div>
            </template>

            <template v-if="column.key === 'email'">
              <span>
                {{ getCandidateEmail(rawRecord) }}
              </span>
            </template>

            <template v-if="column.key === 'position'">
              <Tag
                v-if="rawRecord.job?.title"
                color="blue"
              >
                {{ rawRecord.job?.title }}
              </Tag>
              <span v-else class="text-gray-400">-</span>
            </template>

            <template v-if="column.key === 'stage'">
              <Select
                :value="rawRecord.stage_id"
                style="width: 140px"
                size="small"
                @change="
                  (value) =>
                    handleStageChange(rawRecord, value)
                "
              >
                <SelectOption
                  v-for="stg in stages"
                  :key="stg.id"
                  :value="stg.id"
                >
                  <Tag :color="getStageColor(stg.name)" style="margin: 0">
                    {{ stg.name }}
                  </Tag>
                </SelectOption>
              </Select>
            </template>

            <template v-if="column.key === 'applied_date'">
              <div class="flex items-center gap-1 text-gray-500">
                <CalendarOutlined />
                <span>
                  {{ formatDate(rawRecord.applied_date) }}
                </span>
              </div>
            </template>

            <template v-if="column.key === 'rating'">
              <Rate
                :value="rawRecord.rating || 0"
                disabled
                :count="5"
                style="font-size: 14px"
              />
            </template>

            <template v-if="column.key === 'actions'">
              <Button
                type="link"
                size="small"
                @click="handleViewApplication(rawRecord)"
              >
                <template #icon>
                  <EyeOutlined />
                </template>
                View
              </Button>
            </template>
          </template>

          <template #emptyText>
            <div class="py-8 text-center text-gray-500">
              <UserOutlined class="mb-4 text-4xl text-gray-300" />
              <p>No applications found</p>
            </div>
          </template>
        </Table>
      </Card>

      <!-- Application Drawer -->
      <Drawer
        v-model:open="showApplicationDrawer"
        :title="
          selectedApplication
            ? getCandidateName(selectedApplication)
            : ''
        "
        width="500"
        placement="right"
      >
        <template v-if="selectedApplication">
          <div class="candidate-details">
            <!-- Header -->
            <div class="mb-6 flex items-center gap-4">
              <Avatar
                :size="64"
                :style="{
                  backgroundColor: getStageColor(
                    getStageName(selectedApplication),
                  ),
                }"
              >
                {{ getInitials(selectedApplication) }}
              </Avatar>
              <div>
                <h3 class="text-lg font-semibold">
                  {{ getCandidateName(selectedApplication) }}
                </h3>
                <Tag
                  :color="
                    getStageColor(getStageName(selectedApplication))
                  "
                >
                  {{ getStageName(selectedApplication) }}
                </Tag>
              </div>
            </div>

            <!-- Contact Info -->
            <Card title="Contact Information" size="small" class="mb-4">
              <div class="space-y-3">
                <div class="flex items-center gap-3">
                  <MailOutlined class="text-gray-400" />
                  <a
                    :href="`mailto:${getCandidateEmail(selectedApplication)}`"
                    class="text-blue-500"
                  >
                    {{ getCandidateEmail(selectedApplication) }}
                  </a>
                </div>
              </div>
            </Card>

            <!-- Application Details -->
            <Card title="Application Details" size="small" class="mb-4">
              <div class="space-y-3">
                <div class="flex justify-between">
                  <span class="text-gray-500">Position:</span>
                  <span>{{ getJobTitle(selectedApplication) }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Experience:</span>
                  <span>
                    {{
                      getCandidateExperience(selectedApplication)
                        ? `${getCandidateExperience(selectedApplication)} years`
                        : '-'
                    }}
                  </span>
                </div>
                <div class="flex justify-between">
                  <span class="text-gray-500">Applied:</span>
                  <span>
                    {{ formatDate(selectedApplication.applied_date) }}
                  </span>
                </div>
                <div
                  v-if="selectedApplication.rating"
                  class="flex justify-between"
                >
                  <span class="text-gray-500">Rating:</span>
                  <Rate
                    :value="selectedApplication.rating"
                    disabled
                    :count="5"
                  />
                </div>
              </div>
            </Card>

            <!-- Timeline -->
            <Card title="Activity" size="small">
              <Timeline>
                <TimelineItem color="blue">
                  <p class="text-sm font-medium">Applied</p>
                  <p class="text-xs text-gray-500">
                    {{ formatDate(selectedApplication.applied_date) }}
                  </p>
                </TimelineItem>
                <TimelineItem
                  v-if="
                    selectedApplication.stage?.name &&
                    !selectedApplication.stage.name
                      .toLowerCase()
                      .includes('applied') &&
                    !selectedApplication.stage.name
                      .toLowerCase()
                      .includes('initial')
                  "
                  color="purple"
                >
                  <p class="text-sm font-medium">Moved to Screening</p>
                </TimelineItem>
                <TimelineItem
                  v-if="
                    selectedApplication.stage?.name &&
                    (selectedApplication.stage.name
                      .toLowerCase()
                      .includes('interview') ||
                      selectedApplication.stage.name
                        .toLowerCase()
                        .includes('offer') ||
                      selectedApplication.stage.name
                        .toLowerCase()
                        .includes('hired'))
                  "
                  color="orange"
                >
                  <p class="text-sm font-medium">Interview Scheduled</p>
                </TimelineItem>
                <TimelineItem
                  v-if="
                    selectedApplication.stage?.name &&
                    (selectedApplication.stage.name
                      .toLowerCase()
                      .includes('offer') ||
                      selectedApplication.stage.name
                        .toLowerCase()
                        .includes('hired'))
                  "
                  color="green"
                >
                  <p class="text-sm font-medium">Offer Extended</p>
                </TimelineItem>
                <TimelineItem
                  v-if="
                    selectedApplication.stage?.name &&
                    selectedApplication.stage.name
                      .toLowerCase()
                      .includes('hired')
                  "
                  color="cyan"
                >
                  <p class="text-sm font-medium">Hired</p>
                </TimelineItem>
              </Timeline>
            </Card>
          </div>
        </template>
      </Drawer>
    </div>
  </Page>
</template>
