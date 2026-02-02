<script setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  DatePicker,
  Progress,
  Row,
  Select,
  SelectOption,
  Space,
  Statistic,
  Table,
  Tag,
  message,
  RangePicker,
} from 'ant-design-vue';
import {
  BarChartOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  FileSearchOutlined,
  ReloadOutlined,
  SolutionOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import {
  exportReportApi,
  generateReportApi,
  getPipelineOverviewApi,
  getSourceEffectivenessApi,
  getTimeToHireAnalyticsApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTReportsList',
});

const loading = ref(false);
const exporting = ref(false);

const reportType = ref('hiring');
const dateRange = ref([
  dayjs().subtract(30, 'day'),
  dayjs(),
]);
const exportFormat = ref('csv');

// Report data
const reportResult = ref(null);
const pipelineData = ref(null);

const timeToHireData = ref(null);

const sourceData = ref(null);

// Computed date params
const dateParams = computed(() => ({
  date_from: dateRange.value[0]?.format('YYYY-MM-DD'),
  date_to: dateRange.value[1]?.format('YYYY-MM-DD'),
}));

// Pipeline stage colors
const stageColors = {
  applied: 'blue',
  screening: 'purple',
  interview: 'orange',
  offer: 'cyan',
  hired: 'green',
  rejected: 'red',
};

// Pipeline stage summary for visualization
const pipelineSummary = computed(() => {
  if (!pipelineData.value) return [];
  const dist = pipelineData.value.stage_distribution;
  const total = pipelineData.value.summary.total_candidates || 1;

  return Object.entries(dist).map(([stage, count]) => ({
    name: stage.charAt(0).toUpperCase() + stage.slice(1),
    count,
    percentage: Math.round((count / total) * 100),
    color: stageColors[stage.toLowerCase()] || 'default',
  }));
});

// Hiring report table columns
const hiringColumns = computed(() => [
  { title: 'Metric', dataIndex: 'metric', key: 'metric', width: 250 },
  { title: 'Value', dataIndex: 'value', key: 'value', width: 150 },
  { title: 'Details', dataIndex: 'details', key: 'details' },
]);

// Hiring report table data from reportResult
const hiringTableData = computed(() => {
  if (!reportResult.value || reportResult.value.report_type !== 'hiring') return [];
  const data = reportResult.value.data;
  return Object.entries(data).map(([key, val], idx) => ({
    key: idx,
    metric: key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase()),
    value: typeof val === 'object' ? JSON.stringify(val) : String(val ?? '-'),
    details: typeof val === 'object' ? JSON.stringify(val, null, 2) : '',
  }));
});

// Source effectiveness table columns
const sourceColumns = computed(() => [
  { title: 'Source', dataIndex: 'source', key: 'source', width: 180 },
  { title: 'Applications', dataIndex: 'applications', key: 'applications', width: 120 },
  { title: 'Interviewed', dataIndex: 'interviewed', key: 'interviewed', width: 120 },
  { title: 'Hired', dataIndex: 'hired', key: 'hired', width: 100 },
  { title: 'Hire Rate', key: 'hire_rate', width: 120 },
  { title: 'Interview Rate', key: 'interview_rate', width: 130 },
  { title: 'Effectiveness', key: 'effectiveness_score', width: 130 },
]);

// Time-to-hire trend columns
const trendColumns = computed(() => [
  { title: 'Month', dataIndex: 'month', key: 'month', width: 150 },
  { title: 'Avg Days to Hire', dataIndex: 'avg_days', key: 'avg_days', width: 160 },
  { title: 'Hires', dataIndex: 'hires', key: 'hires', width: 100 },
]);

// Report type options
const reportTypeOptions = [
  { value: 'hiring', label: 'Hiring Report' },
  { value: 'pipeline', label: 'Pipeline Overview' },
  { value: 'source', label: 'Source Effectiveness' },
  { value: 'time_to_hire', label: 'Time-to-Hire Analytics' },
];

async function fetchReport() {
  loading.value = true;
  try {
    switch (reportType.value) {
      case 'hiring': {
        const params = {
          report_type: 'hiring',
          ...dateParams.value,
        };
        const raw = await generateReportApi(params);
        reportResult.value = {
          report_type: 'hiring',
          period: { from: raw.period_start, to: raw.period_end },
          data: raw,
        };
        break;
      }
      case 'pipeline': {
        const res = await getPipelineOverviewApi(dateParams.value);
        pipelineData.value = {
          summary: res.summary,
          time_metrics: res.time_metrics,
          stage_distribution: res.stage_distribution,
          source_distribution: res.source_distribution,
        };
        break;
      }
      case 'source': {
        const res = await getSourceEffectivenessApi(dateParams.value);
        sourceData.value = {
          sources: res.sources,
          recommendations: res.recommendations,
        };
        break;
      }
      case 'time_to_hire': {
        const res = await getTimeToHireAnalyticsApi(dateParams.value);
        timeToHireData.value = {
          total_hires: res.total_hires,
          avg_days_to_hire: res.avg_days_to_hire,
          median_days_to_hire: res.median_days_to_hire,
          min_days_to_hire: res.min_days_to_hire,
          max_days_to_hire: res.max_days_to_hire,
          trend: res.trend,
        };
        break;
      }
    }
  } catch (error) {
    console.error('Failed to fetch report:', error);
    message.error('Failed to load report data');
  } finally {
    loading.value = false;
  }
}

async function handleExport() {
  exporting.value = true;
  try {
    const params = {
      report_type: reportType.value,
      ...dateParams.value,
      format: exportFormat.value,
    };
    const blob = await exportReportApi(params);
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    const ext = exportFormat.value === 'csv' ? 'csv' : 'pdf';
    link.download = `recruitment_${reportType.value}_report_${dayjs().format('YYYY-MM-DD')}.${ext}`;
    link.click();
    URL.revokeObjectURL(url);
    message.success('Report exported successfully');
  } catch (error) {
    console.error('Failed to export report:', error);
    message.error('Failed to export report');
  } finally {
    exporting.value = false;
  }
}

onMounted(() => {
  fetchReport();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <h1 class="mb-6 text-2xl font-bold">Recruitment Reports</h1>

      <!-- Filters -->
      <Card class="mb-6">
        <div class="flex flex-wrap items-center gap-4">
          <div class="flex items-center gap-2">
            <span class="text-gray-500">Report Type:</span>
            <Select
              v-model:value="reportType"
              :options="reportTypeOptions"
              style="width: 220px"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-500">Date Range:</span>
            <RangePicker
              v-model:value="dateRange"
              :allow-clear="false"
              style="width: 280px"
            />
          </div>
          <div class="flex items-center gap-2">
            <span class="text-gray-500">Export As:</span>
            <Select
              v-model:value="exportFormat"
              style="width: 100px"
            >
              <SelectOption value="csv">CSV</SelectOption>
              <SelectOption value="pdf">PDF</SelectOption>
            </Select>
          </div>
          <Space>
            <Button type="primary" :loading="loading" @click="fetchReport">
              <template #icon>
                <ReloadOutlined />
              </template>
              Generate
            </Button>
            <Button :loading="exporting" @click="handleExport">
              <template #icon>
                <DownloadOutlined />
              </template>
              Export
            </Button>
          </Space>
        </div>
      </Card>

      <!-- Hiring Report -->
      <template v-if="reportType === 'hiring'">
        <Card v-if="reportResult" class="mb-6">
          <template #title>
            <div class="flex items-center gap-2">
              <BarChartOutlined />
              <span>Hiring Report</span>
            </div>
          </template>
          <template #extra>
            <Tag color="blue">
              {{ reportResult.period.from }} - {{ reportResult.period.to }}
            </Tag>
          </template>
          <Table
            :columns="hiringColumns"
            :data-source="hiringTableData"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 600 }"
            row-key="key"
            size="middle"
          />
          <div class="mt-3 text-xs text-gray-400">
            Generated at: {{ reportResult.generated_at }}
          </div>
        </Card>
      </template>

      <!-- Pipeline Overview -->
      <template v-if="reportType === 'pipeline' && pipelineData">
        <Row :gutter="[16, 16]" class="mb-6">
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <Statistic
                title="Total Candidates"
                :value="pipelineData.summary.total_candidates"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix>
                  <TeamOutlined />
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <Statistic
                title="Active Candidates"
                :value="pipelineData.summary.active_candidates"
                :value-style="{ color: '#52c41a' }"
              >
                <template #prefix>
                  <SolutionOutlined />
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <Statistic
                title="Hired"
                :value="pipelineData.summary.hired_candidates"
                :value-style="{ color: '#13c2c2' }"
              >
                <template #prefix>
                  <UserAddOutlined />
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <Statistic
                title="Rejected"
                :value="pipelineData.summary.rejected_candidates"
                :value-style="{ color: '#ff4d4f' }"
              >
                <template #prefix>
                  <FileSearchOutlined />
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <Statistic
                title="Avg Time to Hire"
                :value="pipelineData.time_metrics.avg_time_to_hire_days ?? '-'"
                suffix="days"
                :value-style="{ color: '#faad14' }"
              >
                <template #prefix>
                  <ClockCircleOutlined />
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <div class="text-center">
                <div class="mb-2 text-sm text-gray-500">Hire Rate</div>
                <Progress
                  type="circle"
                  :percent="Math.round(pipelineData.summary.hire_rate * 100)"
                  :width="60"
                  :stroke-color="pipelineData.summary.hire_rate >= 0.2 ? '#52c41a' : '#faad14'"
                />
              </div>
            </Card>
          </Col>
        </Row>

        <Row :gutter="[16, 16]" class="mb-6">
          <Col :xs="24" :lg="12">
            <Card title="Stage Distribution" size="small">
              <div class="space-y-4">
                <div
                  v-for="item in pipelineSummary"
                  :key="item.name"
                  class="space-y-1"
                >
                  <div class="flex items-center justify-between">
                    <Tag :color="item.color">{{ item.name }}</Tag>
                    <span class="text-sm text-gray-500">
                      {{ item.count }} candidates ({{ item.percentage }}%)
                    </span>
                  </div>
                  <Progress
                    :percent="item.percentage"
                    :show-info="false"
                    size="small"
                    :stroke-color="stageColors[item.name.toLowerCase()] || '#1890ff'"
                  />
                </div>
              </div>
            </Card>
          </Col>
          <Col :xs="24" :lg="12">
            <Card title="Pipeline Funnel" size="small">
              <div class="space-y-3">
                <div
                  v-for="(item, index) in pipelineSummary"
                  :key="item.name"
                  class="flex items-center justify-between rounded p-2"
                  :style="{
                    backgroundColor: `${stageColors[item.name.toLowerCase()] || '#1890ff'}15`,
                    width: `${Math.max(100 - index * 12, 30)}%`,
                  }"
                >
                  <span class="font-medium">{{ item.name }}</span>
                  <span>{{ item.count }}</span>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        <Card title="Source Distribution" size="small" class="mb-6">
          <div class="space-y-3">
            <div
              v-for="(count, source) in pipelineData.source_distribution"
              :key="source"
              class="flex items-center justify-between"
            >
              <span class="font-medium">{{ source }}</span>
              <Tag color="blue">{{ count }} candidates</Tag>
            </div>
            <div
              v-if="Object.keys(pipelineData.source_distribution).length === 0"
              class="text-gray-400"
            >
              No source data available for this period.
            </div>
          </div>
        </Card>
      </template>

      <!-- Source Effectiveness -->
      <template v-if="reportType === 'source' && sourceData">
        <Card class="mb-6">
          <template #title>
            <div class="flex items-center gap-2">
              <CheckCircleOutlined />
              <span>Source Effectiveness</span>
            </div>
          </template>
          <Table
            :columns="sourceColumns"
            :data-source="sourceData.sources"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 900 }"
            row-key="source"
            size="middle"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'hire_rate'">
                <Tag :color="record.hire_rate >= 20 ? 'green' : 'orange'">
                  {{ record.hire_rate.toFixed(1) }}%
                </Tag>
              </template>
              <template v-if="column.key === 'interview_rate'">
                {{ record.interview_rate.toFixed(1) }}%
              </template>
              <template v-if="column.key === 'effectiveness_score'">
                <Progress
                  :percent="Math.round(record.effectiveness_score)"
                  :stroke-color="record.effectiveness_score >= 50 ? '#52c41a' : '#faad14'"
                  size="small"
                  style="width: 100px"
                />
              </template>
            </template>
          </Table>
        </Card>

        <Card
          v-if="sourceData.recommendations.length > 0"
          title="Recommendations"
          size="small"
        >
          <ul class="list-disc space-y-1 pl-5">
            <li
              v-for="(rec, idx) in sourceData.recommendations"
              :key="idx"
              class="text-sm text-gray-600"
            >
              {{ rec }}
            </li>
          </ul>
        </Card>
      </template>

      <!-- Time-to-Hire Analytics -->
      <template v-if="reportType === 'time_to_hire' && timeToHireData">
        <Row :gutter="[16, 16]" class="mb-6">
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <Statistic
                title="Total Hires"
                :value="timeToHireData.total_hires"
                :value-style="{ color: '#52c41a' }"
              >
                <template #prefix>
                  <UserAddOutlined />
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <Statistic
                title="Avg Days to Hire"
                :value="timeToHireData.avg_days_to_hire ?? '-'"
                suffix="days"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix>
                  <ClockCircleOutlined />
                </template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <Statistic
                title="Median Days"
                :value="timeToHireData.median_days_to_hire ?? '-'"
                suffix="days"
                :value-style="{ color: '#722ed1' }"
              />
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <Statistic
                title="Min Days"
                :value="timeToHireData.min_days_to_hire ?? '-'"
                suffix="days"
                :value-style="{ color: '#13c2c2' }"
              />
            </Card>
          </Col>
          <Col :xs="12" :sm="8" :lg="4">
            <Card>
              <Statistic
                title="Max Days"
                :value="timeToHireData.max_days_to_hire ?? '-'"
                suffix="days"
                :value-style="{ color: '#ff4d4f' }"
              />
            </Card>
          </Col>
        </Row>

        <Card title="Monthly Trend" class="mb-6">
          <Table
            :columns="trendColumns"
            :data-source="timeToHireData.trend"
            :loading="loading"
            :pagination="false"
            :scroll="{ x: 400 }"
            row-key="month"
            size="middle"
          />
        </Card>
      </template>

      <!-- Empty state when no data loaded yet -->
      <Card
        v-if="!loading && !reportResult && !pipelineData && !sourceData && !timeToHireData"
        class="text-center"
      >
        <div class="py-12 text-gray-400">
          <BarChartOutlined style="font-size: 48px" />
          <p class="mt-4 text-lg">
            Select a report type and click Generate to view recruitment reports.
          </p>
        </div>
      </Card>
    </div>
  </Page>
</template>
