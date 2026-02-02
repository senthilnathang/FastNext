<script setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  Popconfirm,
  Progress,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Textarea,
  message,
  DescriptionsItem,
  TabPane,
} from 'ant-design-vue';
import {
  AimOutlined,
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';
import * as echarts from 'echarts';
import VChart from 'vue-echarts';

import {
  createDEIGoalApi,
  deleteDEIGoalApi,
  getDEIDashboardApi,
  getDEIGoalsApi,
  getDEIMetricsApi,
  getEEOCDataApi,
  updateDEIGoalApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTDEIDashboard',
});

// State
const loading = ref(false);
const activeTab = ref('dashboard');
const dashboard = ref(null);
const goals = ref([]);
const metrics = ref(null);
const eeocData = ref(null);

// Goal form
const goalDrawerVisible = ref(false);
const goalFormLoading = ref(false);
const editingGoal = ref(null);
const goalForm = ref({
  name: '',
  description: '',
  goal_type: 'gender',
  target_percentage: 50,
  current_percentage: 0,
  period_start: dayjs().startOf('quarter').format('YYYY-MM-DD'),
  period_end: dayjs().endOf('quarter').format('YYYY-MM-DD'),
});

// Goal types
const goalTypes = [
  { value: 'gender', label: 'Gender Diversity' },
  { value: 'ethnicity', label: 'Ethnic Diversity' },
  { value: 'disability', label: 'Disability Inclusion' },
  { value: 'veteran', label: 'Veteran Hiring' },
  { value: 'age', label: 'Age Diversity' },
];

// Table columns
const goalColumns = [
  { title: 'Goal', dataIndex: 'name', key: 'name' },
  { title: 'Type', key: 'type' },
  { title: 'Progress', key: 'progress', width: 200 },
  { title: 'Period', key: 'period' },
  { title: 'Status', key: 'status', width: 120 },
  { title: 'Actions', key: 'actions', width: 100 },
];

// Chart options — Gender distribution pie chart
const genderChartOption = computed(() => {
  if (!metrics.value) return {};

  const genderData = metrics.value.gender_distribution.candidates;
  const seriesData = Object.entries(genderData).map(([name, value]) => ({
    name,
    value,
  }));

  return {
    title: {
      text: 'Gender Distribution (Candidates)',
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
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' },
        },
        data: seriesData,
      },
    ],
  };
});

// Chart options — Pipeline demographics by stage
const pipelineChartOption = computed(() => {
  if (!dashboard.value) return {};

  const byStage = dashboard.value.pipeline_demographics.by_stage;
  const stages = Object.keys(byStage);
  const counts = Object.values(byStage);

  return {
    title: {
      text: 'Pipeline Demographics by Stage',
      left: 'center',
      textStyle: { fontSize: 14 },
    },
    tooltip: {
      trigger: 'axis',
      axisPointer: { type: 'shadow' },
    },
    grid: {
      left: '3%',
      right: '4%',
      bottom: '10%',
      containLabel: true,
    },
    xAxis: {
      type: 'category',
      data: stages,
    },
    yAxis: {
      type: 'value',
      name: 'Count',
    },
    series: [
      {
        type: 'bar',
        data: counts,
        itemStyle: {
          color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
            { offset: 0, color: '#1890ff' },
            { offset: 1, color: '#69c0ff' },
          ]),
          borderRadius: [4, 4, 0, 0],
        },
      },
    ],
  };
});

// Chart options — Gender by pipeline (candidates vs hired)
const genderHiredChartOption = computed(() => {
  if (!metrics.value) return {};

  const candidates = metrics.value.gender_distribution.candidates;
  const hired = metrics.value.gender_distribution.hired;
  const labels = [
    ...new Set([...Object.keys(candidates), ...Object.keys(hired)]),
  ];

  return {
    title: {
      text: 'Gender: Candidates vs Hired',
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
      data: labels,
    },
    yAxis: {
      type: 'value',
      name: 'Count',
    },
    series: [
      {
        name: 'Candidates',
        type: 'bar',
        data: labels.map((l) => candidates[l] || 0),
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
        data: labels.map((l) => hired[l] || 0),
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

// Chart options — EEOC ethnicity breakdown pie chart
const ethnicityChartOption = computed(() => {
  if (!eeocData.value) return {};

  const data = Object.entries(eeocData.value.ethnicity_breakdown).map(
    ([name, value]) => ({ name, value }),
  );

  return {
    title: {
      text: 'Ethnicity Breakdown (EEOC)',
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
          borderRadius: 6,
          borderColor: '#fff',
          borderWidth: 2,
        },
        label: { show: false, position: 'center' },
        emphasis: {
          label: { show: true, fontSize: 16, fontWeight: 'bold' },
        },
        data,
      },
    ],
  };
});

// Methods
async function fetchData() {
  loading.value = true;
  try {
    const [dashboardRes, goalsRes, metricsRes, eeocRes] = await Promise.all([
      getDEIDashboardApi(),
      getDEIGoalsApi(),
      getDEIMetricsApi(),
      getEEOCDataApi(),
    ]);
    dashboard.value = dashboardRes;
    goals.value = goalsRes.items || [];
    metrics.value = metricsRes;
    eeocData.value = eeocRes;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    message.error('Failed to load DEI data');
  } finally {
    loading.value = false;
  }
}

function openGoalDrawer(goal) {
  editingGoal.value = goal || null;
  if (goal) {
    goalForm.value = {
      name: goal.name,
      description: goal.description || '',
      goal_type: goal.goal_type,
      target_percentage: goal.target_percentage,
      current_percentage: goal.current_percentage,
      period_start: goal.period_start,
      period_end: goal.period_end,
    };
  } else {
    goalForm.value = {
      name: '',
      description: '',
      goal_type: 'gender',
      target_percentage: 50,
      current_percentage: 0,
      period_start: dayjs().startOf('quarter').format('YYYY-MM-DD'),
      period_end: dayjs().endOf('quarter').format('YYYY-MM-DD'),
    };
  }
  goalDrawerVisible.value = true;
}

async function saveGoal() {
  if (!goalForm.value.name) {
    message.error('Name is required');
    return;
  }

  goalFormLoading.value = true;
  try {
    if (editingGoal.value) {
      await updateDEIGoalApi(editingGoal.value.id, goalForm.value);
      message.success('Goal updated successfully');
    } else {
      await createDEIGoalApi(goalForm.value);
      message.success('Goal created successfully');
    }
    goalDrawerVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('Failed to save goal:', error);
    message.error('Failed to save goal');
  } finally {
    goalFormLoading.value = false;
  }
}

async function deleteGoal(id) {
  try {
    await deleteDEIGoalApi(id);
    message.success('Goal deactivated');
    fetchData();
  } catch (error) {
    console.error('Failed to delete goal:', error);
    message.error('Failed to delete goal');
  }
}

function getGoalTypeColor(type) {
  const colors = {
    gender: 'pink',
    ethnicity: 'purple',
    disability: 'blue',
    veteran: 'green',
    age: 'orange',
  };
  return colors[type] || 'default';
}

function getGoalStatus(goal) {
  const ratio = goal.target_percentage > 0
    ? goal.current_percentage / goal.target_percentage
    : 0;
  return ratio >= 0.8;
}

function getGoalTypeLabel(type) {
  return goalTypes.find((t) => t.value === type)?.label || type;
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold">DEI Dashboard</h1>
        <Space>
          <Button @click="fetchData">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
          <Button type="primary" @click="openGoalDrawer()">
            <template #icon><PlusOutlined /></template>
            New Goal
          </Button>
        </Space>
      </div>

      <Spin :spinning="loading">
        <Tabs v-model:activeKey="activeTab">
          <!-- Dashboard Tab -->
          <TabPane key="dashboard" tab="Overview">
            <!-- Summary Cards -->
            <Row :gutter="[16, 16]" class="mb-6">
              <Col :xs="12" :sm="6">
                <Card>
                  <Statistic
                    title="Active Goals"
                    :value="dashboard?.goals.length || 0"
                    :value-style="{ color: '#1890ff' }"
                  >
                    <template #prefix><AimOutlined /></template>
                  </Statistic>
                </Card>
              </Col>
              <Col :xs="12" :sm="6">
                <Card>
                  <Statistic
                    title="On Track"
                    :value="dashboard?.goals.filter((g) => g.status === 'on_track').length || 0"
                    :value-style="{ color: '#52c41a' }"
                  >
                    <template #prefix><CheckCircleOutlined /></template>
                  </Statistic>
                </Card>
              </Col>
              <Col :xs="12" :sm="6">
                <Card>
                  <Statistic
                    title="Needs Attention"
                    :value="dashboard?.goals.filter((g) => g.status !== 'on_track').length || 0"
                    :value-style="{ color: '#faad14' }"
                  >
                    <template #prefix><ExclamationCircleOutlined /></template>
                  </Statistic>
                </Card>
              </Col>
              <Col :xs="12" :sm="6">
                <Card>
                  <Statistic
                    title="Pipeline Total"
                    :value="dashboard?.pipeline_demographics.total || 0"
                    :value-style="{ color: '#722ed1' }"
                  >
                    <template #prefix><TeamOutlined /></template>
                  </Statistic>
                </Card>
              </Col>
            </Row>

            <!-- Goals Progress -->
            <Card title="Goal Progress" class="mb-6">
              <Row :gutter="[16, 16]">
                <Col
                  v-for="goal in dashboard?.goals || []"
                  :key="goal.id"
                  :xs="24"
                  :sm="12"
                  :lg="8"
                >
                  <Card size="small" :bordered="false" class="bg-gray-50">
                    <div class="mb-2 flex items-center justify-between">
                      <span class="font-medium">{{ goal.name }}</span>
                      <Tag :color="getGoalTypeColor(goal.goal_type)">
                        {{ getGoalTypeLabel(goal.goal_type) }}
                      </Tag>
                    </div>
                    <Progress
                      :percent="goal.progress"
                      :status="goal.status === 'on_track' ? 'success' : 'exception'"
                      :stroke-color="goal.status === 'on_track' ? '#52c41a' : '#faad14'"
                    />
                    <div class="mt-2 flex justify-between text-sm text-gray-500">
                      <span>Current: {{ goal.current_percentage }}%</span>
                      <span>Target: {{ goal.target_percentage }}%</span>
                    </div>
                  </Card>
                </Col>
              </Row>
            </Card>

            <!-- Recommendations -->
            <Card
              v-if="dashboard?.recommendations && dashboard.recommendations.length > 0"
              title="Recommendations"
              class="mb-6"
            >
              <ul class="list-disc pl-5">
                <li
                  v-for="(rec, idx) in dashboard.recommendations"
                  :key="idx"
                  class="mb-1 text-gray-600"
                >
                  {{ rec }}
                </li>
              </ul>
            </Card>

            <!-- Charts -->
            <Row :gutter="[16, 16]">
              <Col :xs="24" :lg="12">
                <Card>
                  <VChart
                    :option="pipelineChartOption"
                    style="height: 350px"
                    autoresize
                  />
                </Card>
              </Col>
              <Col :xs="24" :lg="12">
                <Card>
                  <VChart
                    :option="genderChartOption"
                    style="height: 350px"
                    autoresize
                  />
                </Card>
              </Col>
            </Row>
          </TabPane>

          <!-- Goals Tab -->
          <TabPane key="goals" tab="Goals Management">
            <Table
              :columns="goalColumns"
              :data-source="goals"
              :row-key="(record) => record.id"
              :pagination="{ pageSize: 10 }"
            >
              <template #bodyCell="{ column, record }">
                <template v-if="column.key === 'type'">
                  <Tag :color="getGoalTypeColor(record.goal_type)">
                    {{ getGoalTypeLabel(record.goal_type) }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'progress'">
                  <div>
                    <Progress
                      :percent="record.progress_percentage"
                      :status="getGoalStatus(record) ? 'success' : 'exception'"
                      size="small"
                    />
                    <div class="text-xs text-gray-400">
                      {{ record.current_percentage }}% / {{ record.target_percentage }}%
                    </div>
                  </div>
                </template>
                <template v-else-if="column.key === 'period'">
                  {{ record.period_start }} - {{ record.period_end }}
                </template>
                <template v-else-if="column.key === 'status'">
                  <Badge
                    :status="getGoalStatus(record) ? 'success' : 'warning'"
                    :text="getGoalStatus(record) ? 'On Track' : 'At Risk'"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space>
                    <Button type="link" size="small" @click="openGoalDrawer(record)">
                      <EditOutlined />
                    </Button>
                    <Popconfirm title="Deactivate this goal?" @confirm="deleteGoal(record.id)">
                      <Button type="link" size="small" danger>
                        <DeleteOutlined />
                      </Button>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </TabPane>

          <!-- Metrics Tab -->
          <TabPane key="metrics" tab="Detailed Metrics">
            <Row :gutter="[16, 16]" class="mb-6">
              <Col :xs="24" :lg="12">
                <Card title="Pipeline Summary">
                  <Descriptions :column="1" bordered size="small">
                    <DescriptionsItem label="Total Candidates">
                      {{ metrics?.summary.total_candidates || 0 }}
                    </DescriptionsItem>
                    <DescriptionsItem label="Total Hired">
                      {{ metrics?.summary.total_hired || 0 }}
                    </DescriptionsItem>
                    <DescriptionsItem label="Hire Rate">
                      <Tag color="blue">{{ metrics?.summary.hire_rate || 0 }}%</Tag>
                    </DescriptionsItem>
                  </Descriptions>
                </Card>
              </Col>
              <Col :xs="24" :lg="12">
                <Card title="Gender Breakdown (Candidates)">
                  <Descriptions :column="1" bordered size="small">
                    <DescriptionsItem
                      v-for="(count, gender) in metrics?.gender_distribution.candidates_percentage || {}"
                      :key="String(gender)"
                      :label="String(gender)"
                    >
                      <div class="flex items-center justify-between">
                        <span>{{ metrics?.gender_distribution.candidates[String(gender)] || 0 }}</span>
                        <Tag color="purple">{{ count }}%</Tag>
                      </div>
                    </DescriptionsItem>
                  </Descriptions>
                </Card>
              </Col>
            </Row>

            <!-- Gender Candidates vs Hired chart -->
            <Row :gutter="[16, 16]" class="mb-6">
              <Col :xs="24" :lg="12">
                <Card>
                  <VChart
                    :option="genderHiredChartOption"
                    style="height: 350px"
                    autoresize
                  />
                </Card>
              </Col>
              <Col :xs="24" :lg="12">
                <Card title="Goals Progress">
                  <div v-for="gp in metrics?.goals_progress || []" :key="gp.id" class="mb-4">
                    <div class="mb-1 font-medium">{{ gp.name }}</div>
                    <Progress
                      :percent="gp.progress"
                      :status="gp.progress >= 80 ? 'success' : 'active'"
                      size="small"
                    />
                  </div>
                  <div v-if="!metrics?.goals_progress?.length" class="text-gray-400">
                    No goals progress data available.
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>

          <!-- EEOC Tab -->
          <TabPane key="eeoc" tab="EEOC Data">
            <Row :gutter="[16, 16]" class="mb-6">
              <Col :xs="12" :sm="6">
                <Card>
                  <Statistic
                    title="Total Responses"
                    :value="eeocData?.total_responses || 0"
                    :value-style="{ color: '#1890ff' }"
                  />
                </Card>
              </Col>
              <Col :xs="12" :sm="6">
                <Card>
                  <Statistic
                    title="Voluntary Responses"
                    :value="eeocData?.voluntary_responses || 0"
                    :value-style="{ color: '#52c41a' }"
                  />
                </Card>
              </Col>
              <Col :xs="12" :sm="6">
                <Card>
                  <Statistic
                    title="Response Rate"
                    :value="
                      eeocData && eeocData.total_responses > 0
                        ? Math.round((eeocData.voluntary_responses / eeocData.total_responses) * 100)
                        : 0
                    "
                    suffix="%"
                    :value-style="{ color: '#722ed1' }"
                  />
                </Card>
              </Col>
              <Col :xs="12" :sm="6">
                <Card>
                  <Statistic
                    title="Ethnicity Categories"
                    :value="Object.keys(eeocData?.ethnicity_breakdown || {}).length"
                    :value-style="{ color: '#eb2f96' }"
                  />
                </Card>
              </Col>
            </Row>

            <Row :gutter="[16, 16]" class="mb-6">
              <Col :xs="24" :lg="12">
                <Card>
                  <VChart
                    :option="ethnicityChartOption"
                    style="height: 350px"
                    autoresize
                  />
                </Card>
              </Col>
              <Col :xs="24" :lg="12">
                <Card title="EEOC Breakdown Details">
                  <Tabs size="small">
                    <TabPane key="gender" tab="Gender">
                      <Descriptions :column="1" bordered size="small">
                        <DescriptionsItem
                          v-for="(count, label) in eeocData?.gender_breakdown || {}"
                          :key="String(label)"
                          :label="String(label)"
                        >
                          {{ count }}
                        </DescriptionsItem>
                      </Descriptions>
                    </TabPane>
                    <TabPane key="ethnicity" tab="Ethnicity">
                      <Descriptions :column="1" bordered size="small">
                        <DescriptionsItem
                          v-for="(count, label) in eeocData?.ethnicity_breakdown || {}"
                          :key="String(label)"
                          :label="String(label)"
                        >
                          {{ count }}
                        </DescriptionsItem>
                      </Descriptions>
                    </TabPane>
                    <TabPane key="veteran" tab="Veteran">
                      <Descriptions :column="1" bordered size="small">
                        <DescriptionsItem
                          v-for="(count, label) in eeocData?.veteran_breakdown || {}"
                          :key="String(label)"
                          :label="String(label)"
                        >
                          {{ count }}
                        </DescriptionsItem>
                      </Descriptions>
                    </TabPane>
                    <TabPane key="disability" tab="Disability">
                      <Descriptions :column="1" bordered size="small">
                        <DescriptionsItem
                          v-for="(count, label) in eeocData?.disability_breakdown || {}"
                          :key="String(label)"
                          :label="String(label)"
                        >
                          {{ count }}
                        </DescriptionsItem>
                      </Descriptions>
                    </TabPane>
                  </Tabs>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Spin>

      <!-- Goal Drawer -->
      <Drawer
        v-model:open="goalDrawerVisible"
        :title="editingGoal ? 'Edit DEI Goal' : 'Create DEI Goal'"
        :width="480"
        :body-style="{ paddingBottom: '80px' }"
      >
        <Form layout="vertical">
          <FormItem label="Goal Name" required>
            <Input v-model:value="goalForm.name" placeholder="e.g., Q1 Gender Diversity Target" />
          </FormItem>
          <FormItem label="Goal Type">
            <Select v-model:value="goalForm.goal_type">
              <SelectOption v-for="t in goalTypes" :key="t.value" :value="t.value">
                {{ t.label }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Description">
            <Textarea
              v-model:value="goalForm.description"
              :rows="3"
              placeholder="Describe this goal"
            />
          </FormItem>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Target %">
                <InputNumber
                  v-model:value="goalForm.target_percentage"
                  :min="0"
                  :max="100"
                  :precision="1"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Current %">
                <InputNumber
                  v-model:value="goalForm.current_percentage"
                  :min="0"
                  :max="100"
                  :precision="1"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
          </Row>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Period Start">
                <DatePicker
                  v-model:value="goalForm.period_start"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Period End">
                <DatePicker
                  v-model:value="goalForm.period_end"
                  value-format="YYYY-MM-DD"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
          </Row>
        </Form>

        <div class="absolute bottom-0 left-0 right-0 border-t bg-white p-4">
          <Space>
            <Button @click="goalDrawerVisible = false">Cancel</Button>
            <Button type="primary" :loading="goalFormLoading" @click="saveGoal">
              {{ editingGoal ? 'Update' : 'Create' }}
            </Button>
          </Space>
        </div>
      </Drawer>
    </div>
  </Page>
</template>
