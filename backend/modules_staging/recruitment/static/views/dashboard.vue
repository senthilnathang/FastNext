<script setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Progress,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Statistic,
  Table,
  DescriptionsItem,
} from 'ant-design-vue';
import {
  AimOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  FunnelPlotOutlined,
  ReloadOutlined,
  TeamOutlined,
  TrophyOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue';
import * as echarts from 'echarts';
import VChart from 'vue-echarts';

import {
  getAnalyticsDashboardApi,
  getHiringGoalsApi,
  getPipelineFunnelApi,
  getPipelineOverviewApi,
  getSourceEffectivenessApi,
  getTimeToHireAnalyticsApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTDashboard',
});

// State
const loading = ref(false);
const daysFilter = ref(30);
const dashboard = ref(null);
const pipelineOverview = ref(null);
const funnel = ref(null);
const timeToHire = ref(null);
const sourceEffectiveness = ref(null);
const hiringGoals = ref([]);

// Days options for date period filter
const daysOptions = [
  { value: 7, label: 'Last 7 days' },
  { value: 30, label: 'Last 30 days' },
  { value: 60, label: 'Last 60 days' },
  { value: 90, label: 'Last 90 days' },
];

/** Compute date_from / date_to from daysFilter */
function getDateRange() {
  const now = new Date();
  const from = new Date(now);
  from.setDate(from.getDate() - daysFilter.value);
  return {
    date_from: from.toISOString().slice(0, 10),
    date_to: now.toISOString().slice(0, 10),
  };
}

// ---- Chart options ----

// Hiring funnel chart
const funnelChartOption = computed(() => {
  if (!funnel.value) return {};

  const funnelData = funnel.value.funnel.map((f) => ({
    name: f.stage_name,
    value: f.candidate_count,
  }));

  return {
    title: {
      text: 'Hiring Funnel',
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} candidates',
    },
    series: [
      {
        name: 'Funnel',
        type: 'funnel',
        left: '10%',
        width: '80%',
        sort: 'descending',
        gap: 2,
        label: {
          show: true,
          position: 'inside',
          formatter: '{b}: {c}',
        },
        data: funnelData,
        itemStyle: {
          borderColor: '#fff',
          borderWidth: 1,
        },
      },
    ],
  };
});

// Source effectiveness chart
const sourceChartOption = computed(() => {
  if (!sourceEffectiveness.value) return {};

  const sources = sourceEffectiveness.value.sources.slice(0, 8);
  return {
    title: {
      text: 'Source Effectiveness',
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    legend: {
      bottom: 0,
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '15%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: sources.map((s) => s.source),
      axisLabel: { rotate: 45, interval: 0 },
    },
    yAxis: [
      {
        type: 'value',
        name: 'Count',
      },
    ],
    series: [
      {
        name: 'Applications',
        type: 'bar',
        data: sources.map((s) => s.applications),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1890ff' },
            { offset: 1, color: '#69c0ff' },
          ]),
        },
      },
      {
        name: 'Hired',
        type: 'bar',
        data: sources.map((s) => s.hired),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#52c41a' },
            { offset: 1, color: '#95de64' },
          ]),
        },
      },
    ],
  };
});

// Time-to-hire trend chart
const timeToHireChartOption = computed(() => {
  if (!timeToHire.value) return {};

  const trend = timeToHire.value.trend;
  return {
    title: {
      text: 'Time to Hire Trend',
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: trend.map((t) => t.month),
      axisLabel: {
        formatter: (value) => {
          const date = new Date(value);
          return `${date.toLocaleString('default', { month: 'short' })}`;
        },
      },
    },
    yAxis: {
      type: 'value',
      name: 'Days',
    },
    series: [
      {
        name: 'Avg Days',
        type: 'line',
        smooth: true,
        data: trend.map((t) => t.avg_days),
        itemStyle: { color: '#722ed1' },
        areaStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: 'rgba(114, 46, 209, 0.3)' },
            { offset: 1, color: 'rgba(114, 46, 209, 0.05)' },
          ]),
        },
      },
      {
        name: 'Hires',
        type: 'bar',
        data: trend.map((t) => t.hires),
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#13c2c2' },
            { offset: 1, color: '#87e8de' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
});

// Stage distribution chart (from pipeline overview)
const stageChartOption = computed(() => {
  if (!pipelineOverview.value) return {};

  const dist = pipelineOverview.value.stage_distribution;
  const entries = Object.entries(dist);
  if (entries.length === 0) return {};

  return {
    title: {
      text: 'Candidates by Stage',
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)',
    },
    legend: {
      bottom: 0,
    },
    series: [
      {
        type: 'pie',
        radius: ['40%', '70%'],
        avoidLabelOverlap: false,
        itemStyle: {
          borderRadius: 10,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: {
          show: true,
          formatter: '{b}: {c}',
        },
        data: entries.map(([name, value]) => ({ name, value })),
      },
    ],
  };
});

// Hiring goals table columns
const goalColumns = [
  { title: 'Goal', dataIndex: 'name', key: 'name' },
  { title: 'Progress', key: 'progress', width: 200 },
  { title: 'Current / Target', key: 'numbers', width: 140 },
  { title: 'Period', key: 'period', width: 180 },
  { title: 'Status', key: 'status', width: 100 },
];

// ---- Data fetching ----

async function fetchData() {
  loading.value = true;
  try {
    const dateRange = getDateRange();

    const [
      dashboardRes,
      overviewRes,
      funnelRes,
      timeToHireRes,
      sourceRes,
      goalsRes,
    ] = await Promise.all([
      getAnalyticsDashboardApi(),
      getPipelineOverviewApi({ date_from: dateRange.date_from, date_to: dateRange.date_to }),
      getPipelineFunnelApi({ date_from: dateRange.date_from, date_to: dateRange.date_to }),
      getTimeToHireAnalyticsApi({ date_from: dateRange.date_from, date_to: dateRange.date_to }),
      getSourceEffectivenessApi({ date_from: dateRange.date_from, date_to: dateRange.date_to }),
      getHiringGoalsApi({ is_active: true }),
    ]);

    dashboard.value = dashboardRes;
    pipelineOverview.value = overviewRes;
    funnel.value = funnelRes;
    timeToHire.value = timeToHireRes;
    sourceEffectiveness.value = sourceRes;
    hiringGoals.value = goalsRes.items || [];
  } catch (error) {
    console.error('Failed to fetch analytics:', error);
  } finally {
    loading.value = false;
  }
}

function onDaysChange() {
  fetchData();
}

function daysRemaining(periodEnd) {
  const end = new Date(periodEnd);
  const now = new Date();
  const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(0, diff);
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Recruitment Analytics</h1>
        <Space>
          <Select
            v-model:value="daysFilter"
            style="width: 150px"
            @change="onDaysChange"
          >
            <SelectOption
              v-for="opt in daysOptions"
              :key="opt.value"
              :value="opt.value"
            >
              {{ opt.label }}
            </SelectOption>
          </Select>
          <Button @click="fetchData">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
        </Space>
      </div>

      <Spin :spinning="loading">
        <!-- KPI Cards: Open positions, Candidates, Hires, Goals -->
        <Row :gutter="[16, 16]" class="mb-6">
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Open Positions"
                :value="dashboard?.summary.open_positions || 0"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix><TeamOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Candidates (30d)"
                :value="dashboard?.summary.candidates_last_30_days || 0"
                :value-style="{ color: '#52c41a' }"
              >
                <template #prefix><UserAddOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Hires (30d)"
                :value="dashboard?.summary.hires_last_30_days || 0"
                :value-style="{ color: '#722ed1' }"
              >
                <template #prefix><TrophyOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Active Goals"
                :value="dashboard?.summary.active_goals || 0"
                :value-style="{ color: '#faad14' }"
              >
                <template #prefix><AimOutlined /></template>
              </Statistic>
            </Card>
          </Col>
        </Row>

        <!-- Pipeline Overview Stats -->
        <Row :gutter="[16, 16]" class="mb-6">
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Avg Time to Hire"
                :value="timeToHire?.avg_days_to_hire || 0"
                suffix="days"
                :precision="1"
                :value-style="{ color: '#13c2c2' }"
              >
                <template #prefix><ClockCircleOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Hire Rate"
                :value="pipelineOverview?.summary.hire_rate || 0"
                suffix="%"
                :precision="1"
                :value-style="{ color: '#eb2f96' }"
              >
                <template #prefix><CheckCircleOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Total in Pipeline"
                :value="pipelineOverview?.summary.active_candidates || 0"
                :value-style="{ color: '#fa8c16' }"
              >
                <template #prefix><FunnelPlotOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Avg per Position"
                :value="dashboard?.quick_stats.avg_candidates_per_position || 0"
                :precision="1"
                :value-style="{ color: '#2f54eb' }"
              >
                <template #prefix><TeamOutlined /></template>
              </Statistic>
            </Card>
          </Col>
        </Row>

        <!-- Charts Row 1: Funnel + Source Effectiveness -->
        <Row :gutter="[16, 16]" class="mb-6">
          <Col :xs="24" :lg="12">
            <Card>
              <VChart
                :option="funnelChartOption"
                style="height: 350px"
                autoresize
              />
            </Card>
          </Col>
          <Col :xs="24" :lg="12">
            <Card>
              <VChart
                :option="sourceChartOption"
                style="height: 350px"
                autoresize
              />
            </Card>
          </Col>
        </Row>

        <!-- Charts Row 2: Time to Hire Trend + Stage Analytics -->
        <Row :gutter="[16, 16]" class="mb-6">
          <Col :xs="24" :lg="12">
            <Card>
              <VChart
                :option="timeToHireChartOption"
                style="height: 300px"
                autoresize
              />
            </Card>
          </Col>
          <Col :xs="24" :lg="12">
            <Card>
              <VChart
                :option="stageChartOption"
                style="height: 300px"
                autoresize
              />
            </Card>
          </Col>
        </Row>

        <!-- Hiring Goals Progress -->
        <Card v-if="hiringGoals.length > 0" title="Hiring Goals" class="mb-6">
          <template #extra>
            <AimOutlined />
          </template>
          <Table
            :columns="goalColumns"
            :data-source="hiringGoals"
            :row-key="(record) => record.id"
            :pagination="false"
            size="small"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'progress'">
                <Progress
                  :percent="record.progress_percentage"
                  :status="record.progress_percentage >= 100 ? 'success' : 'active'"
                  size="small"
                />
              </template>
              <template v-else-if="column.key === 'numbers'">
                {{ record.current_hires }} / {{ record.target_hires }}
              </template>
              <template v-else-if="column.key === 'period'">
                {{ record.period_start }} - {{ record.period_end }}
              </template>
              <template v-else-if="column.key === 'status'">
                <Badge
                  :status="daysRemaining(record.period_end) > 0 ? 'processing' : 'default'"
                  :text="daysRemaining(record.period_end) > 0 ? `${daysRemaining(record.period_end)}d left` : 'Ended'"
                />
              </template>
            </template>
          </Table>
        </Card>

        <!-- Dashboard Hiring Goals quick view + Pipeline Summary -->
        <Row :gutter="[16, 16]">
          <Col :xs="24" :lg="12">
            <Card title="Goal Progress Overview">
              <template v-if="dashboard?.hiring_goals.length">
                <div
                  v-for="goal in dashboard.hiring_goals"
                  :key="goal.id"
                  class="mb-3"
                >
                  <div class="mb-1 flex items-center justify-between">
                    <span class="text-sm font-medium">{{ goal.name }}</span>
                    <span class="text-xs text-gray-500">
                      {{ goal.current }} / {{ goal.target }}
                    </span>
                  </div>
                  <Progress
                    :percent="goal.progress"
                    :status="goal.status === 'completed' ? 'success' : goal.status === 'behind' ? 'exception' : 'active'"
                    size="small"
                  />
                </div>
              </template>
              <template v-else>
                <p class="text-gray-400">No active hiring goals</p>
              </template>
            </Card>
          </Col>
          <Col :xs="24" :lg="12">
            <Card title="Pipeline Summary">
              <template v-if="pipelineOverview">
                <Descriptions :column="1" size="small">
                  <DescriptionsItem label="Total Candidates">
                    {{ pipelineOverview.summary.total_candidates }}
                  </DescriptionsItem>
                  <DescriptionsItem label="Active">
                    <Badge status="processing" :text="`${pipelineOverview.summary.active_candidates}`" />
                  </DescriptionsItem>
                  <DescriptionsItem label="Hired">
                    <Badge status="success" :text="`${pipelineOverview.summary.hired_candidates}`" />
                  </DescriptionsItem>
                  <DescriptionsItem label="Rejected">
                    <Badge status="error" :text="`${pipelineOverview.summary.rejected_candidates}`" />
                  </DescriptionsItem>
                  <DescriptionsItem label="Hire Rate">
                    {{ pipelineOverview.summary.hire_rate?.toFixed(1) || 0 }}%
                  </DescriptionsItem>
                  <DescriptionsItem label="Funnel Conversion Stages">
                    {{ funnel?.conversions.length || 0 }} transitions tracked
                  </DescriptionsItem>
                </Descriptions>
              </template>
              <template v-else>
                <p class="text-gray-400">No pipeline data available</p>
              </template>
            </Card>
          </Col>
        </Row>
      </Spin>
    </div>
  </Page>
</template>
