<script setup>
import { ref, reactive, onMounted, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Divider,
  Form,
  FormItem,
  Input,
  InputNumber,
  InputSearch,
  Modal,
  Popconfirm,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Statistic,
  Table,
  Tag,
  Textarea,
  message,
} from 'ant-design-vue';
import {
  MailOutlined,
  PhoneOutlined,
  PlusOutlined,
  ReloadOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import {
  getCandidatesApi,
  getCandidateApi,
  createCandidateApi,
  updateCandidateApi,
  deleteCandidateApi,
  getStagesApi,
  getJobsApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTCandidatesList',
});

// State
const loading = ref(false);
const candidates = ref([]);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});
const searchText = ref('');

// Stages and jobs for dropdowns
const stages = ref([]);
const jobs = ref([]);

// Modal state
const modalVisible = ref(false);
const modalMode = ref('create');
const modalLoading = ref(false);
const selectedCandidate = ref(null);

// Form
const formRef = ref();
const formState = reactive({
  first_name: '',
  last_name: '',
  email: '',
  phone: '',
  mobile: '',
  linkedin_url: '',
  portfolio_url: '',
  current_company: '',
  current_position: '',
  current_salary: undefined,
  expected_salary: undefined,
  notice_period: undefined,
  experience_years: undefined,
  source: '',
  notes: '',
});

const formRules = {
  first_name: [{ required: true, message: 'Please enter first name' }],
  last_name: [{ required: true, message: 'Please enter last name' }],
  email: [
    { required: true, message: 'Please enter email' },
    { type: 'email', message: 'Please enter a valid email' },
  ],
};

// Table columns
const columns = [
  { title: 'Candidate', key: 'name', width: 220 },
  { title: 'Source', dataIndex: 'source', key: 'source', width: 120 },
  { title: 'Experience', key: 'experience', width: 120 },
  { title: 'Expected Salary', key: 'expected_salary', width: 140 },
  { title: 'Created', key: 'created_at', width: 120 },
  { title: 'Actions', key: 'actions', width: 180, fixed: 'right' },
];

// Statistics
const stats = computed(() => ({
  total: pagination.total,
  unique_sources: new Set(candidates.value.map((c) => c.source).filter(Boolean)).size,
}));

// Computed
const modalTitle = computed(() => {
  switch (modalMode.value) {
    case 'create':
      return 'Add Candidate';
    case 'edit':
      return 'Edit Candidate';
    case 'view':
      return 'Candidate Details';
    default:
      return 'Candidate';
  }
});

// Methods
const fetchCandidates = async () => {
  loading.value = true;
  try {
    const response = await getCandidatesApi({
      page: pagination.current,
      page_size: pagination.pageSize,
      search: searchText.value || undefined,
    });
    candidates.value = response.items;
    pagination.total = response.total;
  } catch (error) {
    console.error('Failed to fetch candidates:', error);
    message.error('Failed to load candidates');
  } finally {
    loading.value = false;
  }
};

const fetchStages = async () => {
  try {
    const response = await getStagesApi();
    stages.value = response.items;
  } catch (error) {
    console.error('Failed to fetch stages:', error);
  }
};

const fetchJobs = async () => {
  try {
    const response = await getJobsApi({ page_size: 100 });
    jobs.value = response.items;
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
  }
};

const handleTableChange = (pag) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchCandidates();
};

const handleSearch = () => {
  pagination.current = 1;
  fetchCandidates();
};

const resetForm = () => {
  formState.first_name = '';
  formState.last_name = '';
  formState.email = '';
  formState.phone = '';
  formState.mobile = '';
  formState.linkedin_url = '';
  formState.portfolio_url = '';
  formState.current_company = '';
  formState.current_position = '';
  formState.current_salary = undefined;
  formState.expected_salary = undefined;
  formState.notice_period = undefined;
  formState.experience_years = undefined;
  formState.source = '';
  formState.notes = '';
};

const openCreateModal = () => {
  resetForm();
  selectedCandidate.value = null;
  modalMode.value = 'create';
  modalVisible.value = true;
};

const openEditModal = async (record) => {
  modalLoading.value = true;
  modalMode.value = 'edit';
  modalVisible.value = true;
  try {
    const candidate = await getCandidateApi(record.id);
    selectedCandidate.value = candidate;
    Object.assign(formState, {
      first_name: candidate.first_name,
      last_name: candidate.last_name,
      email: candidate.email,
      phone: candidate.phone || '',
      mobile: candidate.mobile || '',
      linkedin_url: candidate.linkedin_url || '',
      portfolio_url: candidate.portfolio_url || '',
      current_company: candidate.current_company || '',
      current_position: candidate.current_position || '',
      current_salary: candidate.current_salary ?? undefined,
      expected_salary: candidate.expected_salary ?? undefined,
      notice_period: candidate.notice_period ?? undefined,
      experience_years: candidate.experience_years ?? undefined,
      source: candidate.source || '',
      notes: candidate.notes || '',
    });
  } catch (error) {
    console.error('Failed to fetch candidate:', error);
    message.error('Failed to load candidate details');
    modalVisible.value = false;
  } finally {
    modalLoading.value = false;
  }
};

const openViewModal = async (record) => {
  modalLoading.value = true;
  modalMode.value = 'view';
  modalVisible.value = true;
  try {
    const candidate = await getCandidateApi(record.id);
    selectedCandidate.value = candidate;
  } catch (error) {
    console.error('Failed to fetch candidate:', error);
    message.error('Failed to load candidate details');
    modalVisible.value = false;
  } finally {
    modalLoading.value = false;
  }
};

const handleSubmit = async () => {
  try {
    await formRef.value?.validate();
    modalLoading.value = true;

    if (modalMode.value === 'create') {
      await createCandidateApi(formState);
      message.success('Candidate added successfully');
    } else if (modalMode.value === 'edit' && selectedCandidate.value) {
      await updateCandidateApi(selectedCandidate.value.id, formState);
      message.success('Candidate updated successfully');
    }

    modalVisible.value = false;
    fetchCandidates();
  } catch (error) {
    console.error('Failed to save candidate:', error);
    message.error('Failed to save candidate');
  } finally {
    modalLoading.value = false;
  }
};

const handleDelete = async (record) => {
  try {
    await deleteCandidateApi(record.id);
    message.success('Candidate deleted successfully');
    fetchCandidates();
  } catch (error) {
    console.error('Failed to delete candidate:', error);
    message.error('Failed to delete candidate');
  }
};

const getCandidateFullName = (candidate) => {
  return `${candidate.first_name} ${candidate.last_name}`.trim();
};

const getInitials = (candidate) => {
  const first = candidate.first_name?.charAt(0) || '';
  const last = candidate.last_name?.charAt(0) || '';
  return `${first}${last}`.toUpperCase() || 'C';
};

const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return dayjs(dateStr).format('MMM DD, YYYY');
};

// Lifecycle
onMounted(() => {
  fetchCandidates();
  fetchStages();
  fetchJobs();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-2xl font-bold">Candidates</h1>
        <Space>
          <InputSearch
            v-model:value="searchText"
            placeholder="Search candidates..."
            style="width: 250px"
            @search="handleSearch"
            @press-enter="handleSearch"
          />
          <Button @click="fetchCandidates">
            <template #icon>
              <ReloadOutlined />
            </template>
          </Button>
          <Button type="primary" @click="openCreateModal">
            <template #icon>
              <PlusOutlined />
            </template>
            Add Candidate
          </Button>
        </Space>
      </div>

      <!-- Statistics Row -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="24" :sm="12">
          <Card size="small">
            <Statistic
              title="Total Candidates"
              :value="stats.total"
              :value-style="{ color: '#1890ff', fontSize: '20px' }"
            >
              <template #prefix>
                <TeamOutlined />
              </template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="24" :sm="12">
          <Card size="small">
            <Statistic
              title="Unique Sources"
              :value="stats.unique_sources"
              :value-style="{ color: '#722ed1', fontSize: '20px' }"
            />
          </Card>
        </Col>
      </Row>

      <!-- List View -->
      <Card>
        <Table
          :columns="columns"
          :data-source="candidates"
          :loading="loading"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} candidates`,
          }"
          :scroll="{ x: 1100 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'name'">
              <div class="flex items-center gap-3">
                <Avatar :size="40">
                  {{ getInitials(record) }}
                </Avatar>
                <div>
                  <div class="font-medium">{{ getCandidateFullName(record) }}</div>
                  <div class="text-xs text-gray-500">{{ record.email }}</div>
                </div>
              </div>
            </template>
            <template v-if="column.key === 'experience'">
              {{ record.experience_years ? `${record.experience_years} years` : '-' }}
            </template>
            <template v-if="column.key === 'expected_salary'">
              {{ record.expected_salary ? `$${record.expected_salary.toLocaleString()}` : '-' }}
            </template>
            <template v-if="column.key === 'created_at'">
              {{ formatDate(record.created_at) }}
            </template>
            <template v-if="column.key === 'actions'">
              <Space>
                <Button type="link" size="small" @click="openViewModal(record)">
                  View
                </Button>
                <Button type="link" size="small" @click="openEditModal(record)">
                  Edit
                </Button>
                <Popconfirm
                  title="Are you sure you want to delete this candidate?"
                  ok-text="Yes"
                  cancel-text="No"
                  @confirm="handleDelete(record)"
                >
                  <Button type="link" size="small" danger>Delete</Button>
                </Popconfirm>
              </Space>
            </template>
          </template>
        </Table>
      </Card>

      <!-- Create/Edit/View Modal -->
      <Modal
        v-model:open="modalVisible"
        :title="modalTitle"
        :width="800"
        :footer="modalMode === 'view' ? null : undefined"
        @cancel="modalVisible = false"
      >
        <Spin :spinning="modalLoading">
          <!-- View Mode -->
          <template v-if="modalMode === 'view' && selectedCandidate">
            <div class="mb-4 flex items-center gap-4">
              <Avatar :size="64">
                {{ getInitials(selectedCandidate) }}
              </Avatar>
              <div>
                <h2 class="m-0 text-xl font-bold">{{ getCandidateFullName(selectedCandidate) }}</h2>
                <p class="text-gray-500">{{ selectedCandidate.current_position || 'No current position' }}</p>
              </div>
            </div>

            <Divider>Contact Information</Divider>
            <Descriptions :column="2" bordered size="small">
              <DescriptionsItem label="Email">
                <MailOutlined class="mr-2" />{{ selectedCandidate.email }}
              </DescriptionsItem>
              <DescriptionsItem label="Phone">
                <PhoneOutlined class="mr-2" />{{ selectedCandidate.phone || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Mobile">
                {{ selectedCandidate.mobile || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="LinkedIn">
                <a v-if="selectedCandidate.linkedin_url" :href="selectedCandidate.linkedin_url" target="_blank">
                  {{ selectedCandidate.linkedin_url }}
                </a>
                <span v-else>-</span>
              </DescriptionsItem>
              <DescriptionsItem label="Portfolio" :span="2">
                <a v-if="selectedCandidate.portfolio_url" :href="selectedCandidate.portfolio_url" target="_blank">
                  {{ selectedCandidate.portfolio_url }}
                </a>
                <span v-else>-</span>
              </DescriptionsItem>
            </Descriptions>

            <Divider>Professional Information</Divider>
            <Descriptions :column="2" bordered size="small">
              <DescriptionsItem label="Current Company">
                {{ selectedCandidate.current_company || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Current Position">
                {{ selectedCandidate.current_position || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Experience">
                {{ selectedCandidate.experience_years ? `${selectedCandidate.experience_years} years` : '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Notice Period">
                {{ selectedCandidate.notice_period ? `${selectedCandidate.notice_period} days` : '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Current Salary">
                {{ selectedCandidate.current_salary ? `$${selectedCandidate.current_salary.toLocaleString()}` : '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Expected Salary">
                {{ selectedCandidate.expected_salary ? `$${selectedCandidate.expected_salary.toLocaleString()}` : '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Source">
                {{ selectedCandidate.source || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Created">
                {{ formatDate(selectedCandidate.created_at) }}
              </DescriptionsItem>
            </Descriptions>

            <template v-if="selectedCandidate.skills?.length">
              <Divider>Skills</Divider>
              <Space wrap>
                <Tag v-for="skill in selectedCandidate.skills" :key="skill.id" color="blue">
                  {{ skill.name }}
                </Tag>
              </Space>
            </template>

            <template v-if="selectedCandidate.notes">
              <Divider>Notes</Divider>
              <p>{{ selectedCandidate.notes }}</p>
            </template>

            <template v-if="selectedCandidate.resume_url">
              <Divider>Documents</Divider>
              <a :href="selectedCandidate.resume_url" target="_blank">View Resume</a>
            </template>
          </template>

          <!-- Create/Edit Form -->
          <template v-else>
            <Form
              ref="formRef"
              :model="formState"
              :rules="formRules"
              layout="vertical"
            >
              <Divider orientation="left">Basic Information</Divider>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem label="First Name" name="first_name">
                    <Input v-model:value="formState.first_name" placeholder="Enter first name" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Last Name" name="last_name">
                    <Input v-model:value="formState.last_name" placeholder="Enter last name" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Email" name="email">
                    <Input v-model:value="formState.email" placeholder="Enter email" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Phone" name="phone">
                    <Input v-model:value="formState.phone" placeholder="Enter phone number" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Mobile" name="mobile">
                    <Input v-model:value="formState.mobile" placeholder="Enter mobile number" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Source" name="source">
                    <Select v-model:value="formState.source" placeholder="Select source" allow-clear>
                      <SelectOption value="linkedin">LinkedIn</SelectOption>
                      <SelectOption value="referral">Referral</SelectOption>
                      <SelectOption value="job_board">Job Board</SelectOption>
                      <SelectOption value="website">Website</SelectOption>
                      <SelectOption value="agency">Agency</SelectOption>
                      <SelectOption value="other">Other</SelectOption>
                    </Select>
                  </FormItem>
                </Col>
              </Row>

              <Divider orientation="left">Professional Information</Divider>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem label="Current Company" name="current_company">
                    <Input v-model:value="formState.current_company" placeholder="Current company" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Current Position" name="current_position">
                    <Input v-model:value="formState.current_position" placeholder="Current position" />
                  </FormItem>
                </Col>
                <Col :span="8">
                  <FormItem label="Experience (years)" name="experience_years">
                    <InputNumber
                      v-model:value="formState.experience_years"
                      :min="0"
                      style="width: 100%"
                      placeholder="Years"
                    />
                  </FormItem>
                </Col>
                <Col :span="8">
                  <FormItem label="Current Salary" name="current_salary">
                    <InputNumber
                      v-model:value="formState.current_salary"
                      :min="0"
                      style="width: 100%"
                      placeholder="Current salary"
                    />
                  </FormItem>
                </Col>
                <Col :span="8">
                  <FormItem label="Expected Salary" name="expected_salary">
                    <InputNumber
                      v-model:value="formState.expected_salary"
                      :min="0"
                      style="width: 100%"
                      placeholder="Expected salary"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Notice Period (days)" name="notice_period">
                    <InputNumber
                      v-model:value="formState.notice_period"
                      :min="0"
                      style="width: 100%"
                      placeholder="Notice period"
                    />
                  </FormItem>
                </Col>
              </Row>

              <Divider orientation="left">Links</Divider>
              <Row :gutter="16">
                <Col :span="12">
                  <FormItem label="LinkedIn URL" name="linkedin_url">
                    <Input v-model:value="formState.linkedin_url" placeholder="https://linkedin.com/in/..." />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Portfolio URL" name="portfolio_url">
                    <Input v-model:value="formState.portfolio_url" placeholder="https://..." />
                  </FormItem>
                </Col>
              </Row>

              <Divider orientation="left">Notes</Divider>
              <Row :gutter="16">
                <Col :span="24">
                  <FormItem label="Notes" name="notes">
                    <Textarea
                      v-model:value="formState.notes"
                      :rows="3"
                      placeholder="Additional notes about the candidate"
                    />
                  </FormItem>
                </Col>
              </Row>
            </Form>
          </template>
        </Spin>

        <template v-if="modalMode !== 'view'" #footer>
          <Button @click="modalVisible = false">Cancel</Button>
          <Button type="primary" :loading="modalLoading" @click="handleSubmit">
            {{ modalMode === 'create' ? 'Add Candidate' : 'Update Candidate' }}
          </Button>
        </template>
      </Modal>
    </div>
  </Page>
</template>
