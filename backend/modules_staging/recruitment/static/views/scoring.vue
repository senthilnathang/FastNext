<script setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  Popconfirm,
  Progress,
  Rate,
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
  Tooltip,
  message,
  TabPane,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  PlusOutlined,
  ReloadOutlined,
  StarOutlined,
  TrophyOutlined,
  UserOutlined,
} from '@ant-design/icons-vue';

import {
  createScoringCriteriaApi,
  deleteScoringCriteriaApi,
  getCandidateRankingApi,
  getCandidateScoresApi,
  getJobsApi,
  getScoringCriteriaApi,
  updateScoringCriteriaApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTScoringList',
});

// State
const loading = ref(false);
const activeTab = ref('criteria');
const selectedRecruitment = ref(undefined);

// Data
const jobs = ref([]);
const scoringCriteria = ref([]);
const candidateScores = ref([]);
const rankings = ref([]);

// Modal states
const criteriaDrawerVisible = ref(false);
const scoreDrawerVisible = ref(false);
const editingCriteria = ref(null);
const viewingCandidate = ref(null);

// Form
const criteriaForm = ref({
  name: '',
  description: '',
  category: 'technical',
  weight: 1,
  max_score: 10,
  evaluation_guidelines: '',
  recruitment_id: undefined,
});

// Statistics
const stats = computed(() => {
  const totalCriteria = scoringCriteria.value.length;
  const totalScores = candidateScores.value.length;
  const avgScore =
    candidateScores.value.length > 0
      ? candidateScores.value.reduce((sum, s) => sum + (s.score || 0), 0) /
        candidateScores.value.length
      : 0;
  const topRanked = rankings.value.length;
  return { totalCriteria, totalScores, avgScore, topRanked };
});

// Criteria table columns
const criteriaColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Category', dataIndex: 'category', key: 'category' },
  { title: 'Weight', dataIndex: 'weight', key: 'weight', width: 100 },
  { title: 'Max Score', dataIndex: 'max_score', key: 'max_score', width: 100 },
  { title: 'Job', dataIndex: 'recruitment_title', key: 'recruitment_title' },
  { title: 'Actions', key: 'actions', width: 120 },
];

// Score table columns
const scoreColumns = [
  { title: 'Candidate', dataIndex: 'candidate_name', key: 'candidate_name' },
  { title: 'Criteria', dataIndex: 'criteria_name', key: 'criteria_name' },
  { title: 'Score', dataIndex: 'score', key: 'score', width: 100 },
  { title: 'Scored By', dataIndex: 'scored_by_name', key: 'scored_by_name' },
  { title: 'Notes', dataIndex: 'notes', key: 'notes' },
  { title: 'Actions', key: 'actions', width: 80 },
];

// Ranking table columns
const rankingColumns = [
  { title: 'Rank', dataIndex: 'rank', key: 'rank', width: 80 },
  { title: 'Candidate', dataIndex: 'candidate_name', key: 'candidate_name' },
  { title: 'Email', dataIndex: 'email', key: 'email' },
  { title: 'Stage', dataIndex: 'stage', key: 'stage' },
  { title: 'Avg Score', dataIndex: 'avg_score', key: 'avg_score', width: 120 },
  { title: 'Scorecards', dataIndex: 'scorecard_count', key: 'scorecard_count', width: 100 },
  { title: 'Status', dataIndex: 'hired', key: 'hired', width: 100 },
];

// Category options
const categoryOptions = [
  { value: 'technical', label: 'Technical Skills' },
  { value: 'communication', label: 'Communication' },
  { value: 'leadership', label: 'Leadership' },
  { value: 'culture_fit', label: 'Culture Fit' },
  { value: 'problem_solving', label: 'Problem Solving' },
  { value: 'experience', label: 'Experience' },
  { value: 'other', label: 'Other' },
];

// Fetch functions
async function fetchJobs() {
  try {
    const response = await getJobsApi({ page_size: 100 });
    jobs.value = (response.items || []).map((j) => ({
      id: j.id,
      title: j.title,
    }));
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
  }
}

async function fetchCriteria() {
  loading.value = true;
  try {
    const params = {};
    if (selectedRecruitment.value) {
      params.recruitment_id = selectedRecruitment.value;
    }
    const response = await getScoringCriteriaApi(params);
    scoringCriteria.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch criteria:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchScores() {
  if (!viewingCandidate.value) return;
  try {
    const response = await getCandidateScoresApi({
      candidate_id: viewingCandidate.value.candidate_id,
    });
    candidateScores.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch scores:', error);
  }
}

async function fetchRankings() {
  if (!selectedRecruitment.value) {
    rankings.value = [];
    return;
  }
  loading.value = true;
  try {
    const response = await getCandidateRankingApi({
      recruitment_id: selectedRecruitment.value,
    });
    rankings.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch rankings:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchData() {
  await fetchCriteria();
  if (activeTab.value === 'ranking') {
    await fetchRankings();
  }
}

// Criteria CRUD
function openCriteriaDrawer(criteria) {
  if (criteria) {
    editingCriteria.value = criteria;
    criteriaForm.value = {
      name: criteria.name,
      description: criteria.description || '',
      category: criteria.category || 'technical',
      weight: criteria.weight,
      max_score: criteria.max_score,
      evaluation_guidelines: criteria.evaluation_guidelines || '',
      recruitment_id: criteria.recruitment_id ?? undefined,
    };
  } else {
    editingCriteria.value = null;
    criteriaForm.value = {
      name: '',
      description: '',
      category: 'technical',
      weight: 1,
      max_score: 10,
      evaluation_guidelines: '',
      recruitment_id: selectedRecruitment.value,
    };
  }
  criteriaDrawerVisible.value = true;
}

async function saveCriteria() {
  try {
    if (editingCriteria.value) {
      await updateScoringCriteriaApi(editingCriteria.value.id, criteriaForm.value);
      message.success('Criteria updated successfully');
    } else {
      await createScoringCriteriaApi(criteriaForm.value);
      message.success('Criteria created successfully');
    }
    criteriaDrawerVisible.value = false;
    await fetchCriteria();
  } catch (error) {
    message.error('Failed to save criteria');
  }
}

async function deleteCriteria(id) {
  try {
    await deleteScoringCriteriaApi(id);
    message.success('Criteria deleted successfully');
    await fetchCriteria();
  } catch (error) {
    message.error('Failed to delete criteria');
  }
}

// Score viewing
function viewCandidateScores(record) {
  viewingCandidate.value = {
    candidate_id: record.candidate_id,
    candidate_name: record.candidate_name,
  };
  scoreDrawerVisible.value = true;
  fetchScores();
}

// Handle recruitment filter change
function handleRecruitmentChange() {
  fetchData();
}

// Handle tab change
function handleTabChange(key) {
  activeTab.value = String(key);
  if (key === 'ranking') {
    fetchRankings();
  }
}

// Get rank medal
function getRankDisplay(rank) {
  if (rank === 1) return { icon: TrophyOutlined, color: 'gold' };
  if (rank === 2) return { icon: TrophyOutlined, color: 'silver' };
  if (rank === 3) return { icon: TrophyOutlined, color: '#cd7f32' };
  return null;
}

onMounted(async () => {
  await fetchJobs();
  await fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Candidate Scoring & Ranking</h1>
        <Space>
          <Select
            v-model:value="selectedRecruitment"
            placeholder="Select Job"
            style="width: 250px"
            allow-clear
            show-search
            :filter-option="
              (input, option) =>
                option.label?.toLowerCase().includes(input.toLowerCase())
            "
            @change="handleRecruitmentChange"
          >
            <SelectOption
              v-for="job in jobs"
              :key="job.id"
              :value="job.id"
              :label="job.title"
            >
              {{ job.title }}
            </SelectOption>
          </Select>
          <Button @click="fetchData">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
        </Space>
      </div>

      <!-- Statistics Cards -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic
              title="Scoring Criteria"
              :value="stats.totalCriteria"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix><StarOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic
              title="Total Scores"
              :value="stats.totalScores"
              :value-style="{ color: '#722ed1' }"
            >
              <template #prefix><UserOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic
              title="Ranked Candidates"
              :value="stats.topRanked"
              :value-style="{ color: '#52c41a' }"
            >
              <template #prefix><TrophyOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="12" :sm="6">
          <Card>
            <Statistic
              title="Avg Score"
              :value="stats.avgScore.toFixed(1)"
              :value-style="{
                color: stats.avgScore >= 7 ? '#52c41a' : '#faad14',
              }"
            />
          </Card>
        </Col>
      </Row>

      <Spin :spinning="loading">
        <Card>
          <Tabs v-model:activeKey="activeTab" @change="handleTabChange">
            <!-- Scoring Criteria Tab -->
            <TabPane key="criteria" tab="Scoring Criteria">
              <div class="mb-4 flex justify-end">
                <Button type="primary" @click="openCriteriaDrawer()">
                  <template #icon><PlusOutlined /></template>
                  Add Criteria
                </Button>
              </div>
              <Table
                :columns="criteriaColumns"
                :data-source="scoringCriteria"
                :row-key="(record) => record.id"
                :pagination="{ pageSize: 10 }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'category'">
                    <Tag color="blue">
                      {{
                        categoryOptions.find((c) => c.value === record.category)
                          ?.label || record.category
                      }}
                    </Tag>
                  </template>
                  <template v-if="column.key === 'weight'">
                    <Tag color="purple">{{ record.weight }}x</Tag>
                  </template>
                  <template v-if="column.key === 'max_score'">
                    <Tag>{{ record.max_score }}</Tag>
                  </template>
                  <template v-if="column.key === 'recruitment_title'">
                    {{ record.recruitment_title || 'Global' }}
                  </template>
                  <template v-if="column.key === 'actions'">
                    <Space>
                      <Tooltip title="Edit">
                        <Button
                          size="small"
                          @click="openCriteriaDrawer(record)"
                        >
                          <EditOutlined />
                        </Button>
                      </Tooltip>
                      <Popconfirm
                        title="Delete this criteria?"
                        @confirm="deleteCriteria(record.id)"
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
            </TabPane>

            <!-- Scorecards Tab -->
            <TabPane key="scorecards" tab="Scorecards">
              <Table
                :columns="scoreColumns"
                :data-source="candidateScores"
                :row-key="(record) => record.id"
                :pagination="{ pageSize: 10 }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'score'">
                    <Progress
                      v-if="record.score != null"
                      :percent="
                        Math.round(
                          (record.score /
                            (scoringCriteria.find(
                              (c) =>
                                c.id === record.criteria_id,
                            )?.max_score || 10)) *
                            100,
                        )
                      "
                      :size="50"
                      type="circle"
                      :stroke-color="
                        record.score >= 7
                          ? '#52c41a'
                          : record.score >= 5
                            ? '#faad14'
                            : '#ff4d4f'
                      "
                    />
                    <span v-else class="text-gray-400">-</span>
                  </template>
                  <template v-if="column.key === 'notes'">
                    <span>{{ record.notes || '-' }}</span>
                  </template>
                  <template v-if="column.key === 'actions'">
                    <Tooltip title="View">
                      <Button size="small">
                        <EyeOutlined />
                      </Button>
                    </Tooltip>
                  </template>
                </template>
              </Table>
            </TabPane>

            <!-- Ranking Tab -->
            <TabPane key="ranking" tab="Candidate Ranking">
              <div
                v-if="!selectedRecruitment"
                class="py-8 text-center text-gray-500"
              >
                Please select a job to view candidate rankings
              </div>
              <Table
                v-else
                :columns="rankingColumns"
                :data-source="rankings"
                :row-key="
                  (record) => record.candidate_id
                "
                :pagination="{ pageSize: 20 }"
              >
                <template #bodyCell="{ column, record }">
                  <template v-if="column.key === 'rank'">
                    <div class="flex items-center gap-2">
                      <component
                        :is="getRankDisplay(record.rank)?.icon"
                        v-if="getRankDisplay(record.rank)"
                        :style="{
                          color: getRankDisplay(record.rank)?.color,
                          fontSize: '20px',
                        }"
                      />
                      <span :class="{ 'font-bold': record.rank <= 3 }">{{
                        record.rank
                      }}</span>
                    </div>
                  </template>
                  <template v-if="column.key === 'avg_score'">
                    <div
                      v-if="record.avg_score"
                      class="flex items-center gap-2"
                    >
                      <Rate
                        :value="record.avg_score / 20"
                        allow-half
                        disabled
                      />
                      <span>{{ record.avg_score.toFixed(1) }}%</span>
                    </div>
                    <span v-else class="text-gray-400">Not scored</span>
                  </template>
                  <template v-if="column.key === 'hired'">
                    <Tag :color="record.hired ? 'green' : 'blue'">
                      {{ record.hired ? 'Hired' : 'Active' }}
                    </Tag>
                  </template>
                  <template v-if="column.key === 'candidate_name'">
                    <Button
                      type="link"
                      size="small"
                      @click="viewCandidateScores(record)"
                    >
                      {{ record.candidate_name }}
                    </Button>
                  </template>
                </template>
              </Table>
            </TabPane>
          </Tabs>
        </Card>
      </Spin>

      <!-- Criteria Drawer -->
      <Drawer
        v-model:open="criteriaDrawerVisible"
        :title="
          editingCriteria ? 'Edit Scoring Criteria' : 'Add Scoring Criteria'
        "
        width="500"
        :footer-style="{ textAlign: 'right' }"
      >
        <Form layout="vertical">
          <FormItem label="Name" required>
            <Input
              v-model:value="criteriaForm.name"
              placeholder="e.g., Technical Proficiency"
            />
          </FormItem>
          <FormItem label="Category" required>
            <Select v-model:value="criteriaForm.category">
              <SelectOption
                v-for="opt in categoryOptions"
                :key="opt.value"
                :value="opt.value"
              >
                {{ opt.label }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Description">
            <Textarea
              v-model:value="criteriaForm.description"
              :rows="2"
              placeholder="Brief description of this criteria"
            />
          </FormItem>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Weight">
                <InputNumber
                  v-model:value="criteriaForm.weight"
                  :min="0.1"
                  :max="10"
                  :step="0.1"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Max Score">
                <InputNumber
                  v-model:value="criteriaForm.max_score"
                  :min="1"
                  :max="100"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
          </Row>
          <FormItem label="Apply to Job">
            <Select
              v-model:value="criteriaForm.recruitment_id"
              placeholder="All Jobs (Global)"
              allow-clear
            >
              <SelectOption
                v-for="job in jobs"
                :key="job.id"
                :value="job.id"
              >
                {{ job.title }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Evaluation Guidelines">
            <Textarea
              v-model:value="criteriaForm.evaluation_guidelines"
              :rows="4"
              placeholder="How should this criteria be evaluated?"
            />
          </FormItem>
        </Form>
        <template #footer>
          <Space>
            <Button @click="criteriaDrawerVisible = false">Cancel</Button>
            <Button type="primary" @click="saveCriteria">Save</Button>
          </Space>
        </template>
      </Drawer>

      <!-- Candidate Scores Drawer -->
      <Drawer
        v-model:open="scoreDrawerVisible"
        title="Candidate Scores"
        width="600"
      >
        <div v-if="viewingCandidate">
          <div class="mb-4">
            <h3 class="text-lg font-medium">
              {{ viewingCandidate.candidate_name }}
            </h3>
          </div>

          <div v-if="candidateScores.length > 0">
            <Table
              :columns="[
                {
                  title: 'Criteria',
                  dataIndex: 'criteria_name',
                  key: 'criteria_name',
                },
                { title: 'Score', dataIndex: 'score', key: 'score', width: 100 },
                {
                  title: 'Scored By',
                  dataIndex: 'scored_by_name',
                  key: 'scored_by_name',
                },
                { title: 'Notes', dataIndex: 'notes', key: 'notes' },
              ]"
              :data-source="candidateScores"
              :row-key="(r) => r.id"
              :pagination="false"
              size="small"
            />
          </div>
          <div v-else class="py-8 text-center text-gray-500">
            No scores recorded for this candidate
          </div>
        </div>
      </Drawer>
    </div>
  </Page>
</template>
