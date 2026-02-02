<script setup>
import { ref, reactive, onMounted, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
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
  getJobsApi,
  getJobApi,
  createJobApi,
  updateJobApi,
  deleteJobApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTJobsList',
});

// State
const loading = ref(false);
const jobs = ref([]);
const pagination = reactive({
  current: 1,
  pageSize: 10,
  total: 0,
});
const searchText = ref('');

// Derive status from boolean fields
const getJobStatus = (job) => {
  if (job.closed) return 'closed';
  if (!job.is_published) return 'draft';
  return 'open';
};

// Stats (computed from jobs data)
const stats = computed(() => {
  const allJobs = jobs.value;
  return {
    active_jobs: allJobs.filter((j) => !j.closed && j.is_published).length,
    total_openings: allJobs.reduce((sum, j) => sum + (j.vacancy || 0), 0),
    total_jobs: pagination.total,
    closed_jobs: allJobs.filter((j) => j.closed).length,
  };
});

// Modal state
const modalVisible = ref(false);
const modalMode = ref('create');
const modalLoading = ref(false);
const selectedJob = ref(null);

// Form
const formRef = ref();
const formState = reactive({
  title: '',
  description: '',
  requirements: '',
  responsibilities: '',
  department_id: undefined,
  employment_type: 'full_time',
  experience_level: '',
  experience_min: undefined,
  experience_max: undefined,
  salary_min: undefined,
  salary_max: undefined,
  salary_currency: 'USD',
  vacancy: 1,
  closed: false,
  is_published: true,
  location: '',
  is_remote: false,
  end_date: '',
  start_date: new Date().toISOString().split('T')[0],
});

const formRules = {
  title: [{ required: true, message: 'Please enter job title' }],
  vacancy: [{ required: true, message: 'Please enter number of vacancies' }],
  start_date: [{ required: true, message: 'Please select a start date' }],
};

// Table columns
const columns = [
  { title: 'Job Title', dataIndex: 'title', key: 'title' },
  { title: 'Department', key: 'department', width: 150 },
  { title: 'Type', dataIndex: 'employment_type', key: 'employment_type', width: 120 },
  { title: 'Vacancies', dataIndex: 'vacancy', key: 'vacancy', width: 100 },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 180, fixed: 'right' },
];

const employmentTypes = [
  { value: 'full_time', label: 'Full-time' },
  { value: 'part_time', label: 'Part-time' },
  { value: 'contract', label: 'Contract' },
  { value: 'internship', label: 'Internship' },
];

const statusOptions = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'draft', label: 'Draft' },
];

// Computed
const modalTitle = computed(() => {
  switch (modalMode.value) {
    case 'create':
      return 'Post New Job';
    case 'edit':
      return 'Edit Job';
    case 'view':
      return 'Job Details';
    default:
      return 'Job';
  }
});

// Methods
const fetchJobs = async () => {
  loading.value = true;
  try {
    const response = await getJobsApi({
      skip: (pagination.current - 1) * pagination.pageSize,
      limit: pagination.pageSize,
    });
    jobs.value = response.items;
    pagination.total = response.total;
  } catch (error) {
    console.error('Failed to fetch jobs:', error);
    message.error('Failed to load jobs');
  } finally {
    loading.value = false;
  }
};

const handleTableChange = (pag) => {
  pagination.current = pag.current;
  pagination.pageSize = pag.pageSize;
  fetchJobs();
};

const handleSearch = () => {
  pagination.current = 1;
  fetchJobs();
};

const resetForm = () => {
  formState.title = '';
  formState.description = '';
  formState.requirements = '';
  formState.responsibilities = '';
  formState.department_id = undefined;
  formState.employment_type = 'full_time';
  formState.experience_level = '';
  formState.experience_min = undefined;
  formState.experience_max = undefined;
  formState.salary_min = undefined;
  formState.salary_max = undefined;
  formState.salary_currency = 'USD';
  formState.vacancy = 1;
  formState.closed = false;
  formState.is_published = true;
  formState.location = '';
  formState.is_remote = false;
  formState.end_date = '';
  formState.start_date = new Date().toISOString().split('T')[0];
};

const openCreateModal = () => {
  resetForm();
  selectedJob.value = null;
  modalMode.value = 'create';
  modalVisible.value = true;
};

const openEditModal = async (record) => {
  modalLoading.value = true;
  modalMode.value = 'edit';
  modalVisible.value = true;
  try {
    const job = await getJobApi(record.id);
    selectedJob.value = job;
    Object.assign(formState, {
      title: job.title,
      description: job.description || '',
      requirements: job.requirements || '',
      responsibilities: job.responsibilities || '',
      department_id: job.department_id || undefined,
      employment_type: job.employment_type,
      experience_level: job.experience_level || '',
      experience_min: job.experience_min ?? undefined,
      experience_max: job.experience_max ?? undefined,
      salary_min: job.salary_min ?? undefined,
      salary_max: job.salary_max ?? undefined,
      salary_currency: job.salary_currency || 'USD',
      vacancy: job.vacancy,
      closed: job.closed,
      is_published: job.is_published,
      location: job.location || '',
      is_remote: job.is_remote,
      end_date: job.end_date || '',
      start_date: job.start_date || '',
    });
  } catch (error) {
    console.error('Failed to fetch job:', error);
    message.error('Failed to load job details');
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
    const job = await getJobApi(record.id);
    selectedJob.value = job;
  } catch (error) {
    console.error('Failed to fetch job:', error);
    message.error('Failed to load job details');
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
      await createJobApi(formState);
      message.success('Job created successfully');
    } else if (modalMode.value === 'edit' && selectedJob.value) {
      await updateJobApi(selectedJob.value.id, formState);
      message.success('Job updated successfully');
    }

    modalVisible.value = false;
    fetchJobs();
  } catch (error) {
    console.error('Failed to save job:', error);
    message.error('Failed to save job');
  } finally {
    modalLoading.value = false;
  }
};

const handleDelete = async (record) => {
  try {
    await deleteJobApi(record.id);
    message.success('Job deleted successfully');
    fetchJobs();
  } catch (error) {
    console.error('Failed to delete job:', error);
    message.error('Failed to delete job');
  }
};

const getStatusColor = (status) => {
  const colors = {
    open: 'green',
    closed: 'default',
    draft: 'orange',
    on_hold: 'blue',
  };
  return colors[status] || 'default';
};

const getEmploymentTypeLabel = (type) => {
  return employmentTypes.find((t) => t.value === type)?.label || type;
};

// Lifecycle
onMounted(() => {
  fetchJobs();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <h1 class="mb-6 text-2xl font-bold">Job Postings</h1>

      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="24" :sm="6">
          <Card>
            <Statistic
              title="Active Jobs"
              :value="stats.active_jobs"
              :value-style="{ color: '#52c41a' }"
            />
          </Card>
        </Col>
        <Col :xs="24" :sm="6">
          <Card>
            <Statistic
              title="Total Openings"
              :value="stats.total_openings"
              :value-style="{ color: '#1890ff' }"
            />
          </Card>
        </Col>
        <Col :xs="24" :sm="6">
          <Card>
            <Statistic
              title="Total Jobs"
              :value="stats.total_jobs"
              :value-style="{ color: '#722ed1' }"
            />
          </Card>
        </Col>
        <Col :xs="24" :sm="6">
          <Card>
            <Statistic
              title="Closed Jobs"
              :value="stats.closed_jobs"
              :value-style="{ color: '#13c2c2' }"
            />
          </Card>
        </Col>
      </Row>

      <Card>
        <div class="mb-4 flex items-center justify-between">
          <InputSearch
            v-model:value="searchText"
            placeholder="Search jobs..."
            style="width: 300px"
            @search="handleSearch"
            @press-enter="handleSearch"
          />
          <Button type="primary" @click="openCreateModal">Post New Job</Button>
        </div>
        <Table
          :columns="columns"
          :data-source="jobs"
          :loading="loading"
          :pagination="{
            current: pagination.current,
            pageSize: pagination.pageSize,
            total: pagination.total,
            showSizeChanger: true,
            showTotal: (total) => `Total ${total} jobs`,
          }"
          :scroll="{ x: 1000 }"
          row-key="id"
          @change="handleTableChange"
        >
          <template #bodyCell="{ column, record }">
            <template v-if="column.key === 'department'">
              {{ record.department?.name || '-' }}
            </template>
            <template v-if="column.key === 'employment_type'">
              {{ getEmploymentTypeLabel(record.employment_type) }}
            </template>
            <template v-if="column.key === 'status'">
              <Tag :color="getStatusColor(getJobStatus(record))">
                {{ getJobStatus(record).toUpperCase() }}
              </Tag>
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
                  title="Are you sure you want to delete this job?"
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
        :width="720"
        :footer="modalMode === 'view' ? null : undefined"
        @cancel="modalVisible = false"
      >
        <Spin :spinning="modalLoading">
          <!-- View Mode -->
          <template v-if="modalMode === 'view' && selectedJob">
            <Descriptions :column="2" bordered>
              <DescriptionsItem label="Job Title" :span="2">
                {{ selectedJob.title }}
              </DescriptionsItem>
              <DescriptionsItem label="Department">
                {{ selectedJob.department?.name || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Employment Type">
                {{ getEmploymentTypeLabel(selectedJob.employment_type) }}
              </DescriptionsItem>
              <DescriptionsItem label="Vacancies">
                {{ selectedJob.vacancy }}
              </DescriptionsItem>
              <DescriptionsItem label="Status">
                <Tag :color="getStatusColor(getJobStatus(selectedJob))">
                  {{ getJobStatus(selectedJob).toUpperCase() }}
                </Tag>
              </DescriptionsItem>
              <DescriptionsItem label="Remote">
                {{ selectedJob.is_remote ? 'Yes' : 'No' }}
              </DescriptionsItem>
              <DescriptionsItem label="Location">
                {{ selectedJob.location || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Salary Range" :span="2">
                <template v-if="selectedJob.salary_min || selectedJob.salary_max">
                  {{ selectedJob.salary_currency || 'USD' }}
                  {{ selectedJob.salary_min || 0 }} - {{ selectedJob.salary_max || 'Open' }}
                </template>
                <template v-else>Not specified</template>
              </DescriptionsItem>
              <DescriptionsItem label="Experience Level">
                {{ selectedJob.experience_level || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Experience Years">
                <template v-if="selectedJob.experience_min || selectedJob.experience_max">
                  {{ selectedJob.experience_min || 0 }} - {{ selectedJob.experience_max || 'N/A' }} years
                </template>
                <template v-else>Not specified</template>
              </DescriptionsItem>
              <DescriptionsItem label="Description" :span="2">
                {{ selectedJob.description || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Requirements" :span="2">
                {{ selectedJob.requirements || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Responsibilities" :span="2">
                {{ selectedJob.responsibilities || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="End Date">
                {{ selectedJob.end_date || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Start Date">
                {{ selectedJob.start_date || '-' }}
              </DescriptionsItem>
              <DescriptionsItem label="Skills" :span="2">
                <template v-if="selectedJob.skills?.length">
                  <Tag
                    v-for="skill in selectedJob.skills"
                    :key="skill.id"
                    color="blue"
                    style="margin-right: 4px"
                  >
                    {{ skill.name }}
                  </Tag>
                </template>
                <template v-else>No skills specified</template>
              </DescriptionsItem>
            </Descriptions>
          </template>

          <!-- Create/Edit Form -->
          <template v-else>
            <Form
              ref="formRef"
              :model="formState"
              :rules="formRules"
              layout="vertical"
            >
              <Row :gutter="16">
                <Col :span="24">
                  <FormItem label="Job Title" name="title">
                    <Input v-model:value="formState.title" placeholder="Enter job title" />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Employment Type" name="employment_type">
                    <Select v-model:value="formState.employment_type">
                      <SelectOption
                        v-for="type in employmentTypes"
                        :key="type.value"
                        :value="type.value"
                      >
                        {{ type.label }}
                      </SelectOption>
                    </Select>
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Published">
                    <Select v-model:value="formState.is_published">
                      <SelectOption :value="true">Published</SelectOption>
                      <SelectOption :value="false">Draft</SelectOption>
                    </Select>
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Number of Vacancies" name="vacancy">
                    <InputNumber
                      v-model:value="formState.vacancy"
                      :min="0"
                      style="width: 100%"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Experience Level" name="experience_level">
                    <Input
                      v-model:value="formState.experience_level"
                      placeholder="e.g., Senior, Mid-level"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Minimum Salary" name="salary_min">
                    <InputNumber
                      v-model:value="formState.salary_min"
                      :min="0"
                      style="width: 100%"
                      placeholder="Min salary"
                    />
                  </FormItem>
                </Col>
                <Col :span="12">
                  <FormItem label="Maximum Salary" name="salary_max">
                    <InputNumber
                      v-model:value="formState.salary_max"
                      :min="0"
                      style="width: 100%"
                      placeholder="Max salary"
                    />
                  </FormItem>
                </Col>
                <Col :span="24">
                  <FormItem label="Location" name="location">
                    <Input v-model:value="formState.location" placeholder="Enter location" />
                  </FormItem>
                </Col>
                <Col :span="24">
                  <FormItem label="Description" name="description">
                    <Textarea
                      v-model:value="formState.description"
                      :rows="4"
                      placeholder="Enter job description"
                    />
                  </FormItem>
                </Col>
                <Col :span="24">
                  <FormItem label="Requirements" name="requirements">
                    <Textarea
                      v-model:value="formState.requirements"
                      :rows="3"
                      placeholder="Enter job requirements"
                    />
                  </FormItem>
                </Col>
                <Col :span="24">
                  <FormItem label="Responsibilities" name="responsibilities">
                    <Textarea
                      v-model:value="formState.responsibilities"
                      :rows="3"
                      placeholder="Enter job responsibilities"
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
            {{ modalMode === 'create' ? 'Create' : 'Update' }}
          </Button>
        </template>
      </Modal>
    </div>
  </Page>
</template>
