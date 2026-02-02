<script setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Row,
  Select,
  SelectOption,
  Space,
  Spin,
  Statistic,
  Step,
  Steps,
  Table,
  Tag,
  Textarea,
  Timeline,
  Tooltip,
  message,
  DescriptionsItem,
  TimelineItem,
} from 'ant-design-vue';
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  PlusOutlined,
  ReloadOutlined,
  SendOutlined,
} from '@ant-design/icons-vue';
import dayjs from 'dayjs';

import {
  acceptOfferApi,
  createOfferApi,
  deleteOfferApi,
  getApplicationsApi,
  getOffersApi,
  rejectOfferApi,
  sendOfferApi,
  updateOfferApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTOffersList',
});

// State
const loading = ref(false);
const statusFilter = ref(undefined);

// Data
const applications = ref([]);
const offers = ref([]);

// Drawer states
const offerDrawerVisible = ref(false);
const detailDrawerVisible = ref(false);
const editingOffer = ref(null);
const viewingOffer = ref(null);

// Non-null computed for use inside v-if="viewingOffer" guarded template blocks
const activeOffer = computed(
  () => viewingOffer.value,
);

// Form
const offerForm = ref({
  application_id: undefined,
  offered_salary: undefined,
  currency: 'USD',
  joining_date: '',
  expiry_date: '',
  notes: '',
});

// Statistics
const stats = computed(() => {
  const total = offers.value.length;
  const pending = offers.value.filter((o) =>
    ['draft', 'pending'].includes(o.status),
  ).length;
  const sent = offers.value.filter((o) => o.status === 'sent').length;
  const accepted = offers.value.filter((o) => o.status === 'accepted').length;
  const declined = offers.value.filter((o) =>
    ['declined', 'rejected'].includes(o.status),
  ).length;
  const acceptanceRate =
    sent + accepted + declined > 0
      ? Math.round((accepted / (sent + accepted + declined)) * 100)
      : 0;
  return { total, pending, sent, accepted, declined, acceptanceRate };
});

// Table columns
const columns = [
  {
    title: 'Candidate',
    key: 'candidate_name',
    dataIndex: 'candidate_name',
  },
  {
    title: 'Job',
    key: 'job_title',
    dataIndex: 'job_title',
  },
  { title: 'Status', dataIndex: 'status', key: 'status', width: 140 },
  { title: 'Salary', key: 'salary', width: 150 },
  {
    title: 'Joining Date',
    dataIndex: 'joining_date',
    key: 'joining_date',
    width: 130,
  },
  {
    title: 'Expiry Date',
    dataIndex: 'expiry_date',
    key: 'expiry_date',
    width: 130,
  },
  { title: 'Actions', key: 'actions', width: 200 },
];

// Status options
const statusOptions = [
  { value: 'draft', label: 'Draft', color: 'default' },
  { value: 'pending', label: 'Pending', color: 'processing' },
  { value: 'sent', label: 'Sent', color: 'blue' },
  { value: 'accepted', label: 'Accepted', color: 'success' },
  { value: 'declined', label: 'Declined', color: 'error' },
  { value: 'rejected', label: 'Rejected', color: 'error' },
  { value: 'withdrawn', label: 'Withdrawn', color: 'default' },
  { value: 'expired', label: 'Expired', color: 'default' },
];

// Helper: get candidate full name from offer
function getCandidateName(offer) {
  if (offer.application?.candidate) {
    const c = offer.application.candidate;
    return `${c.first_name} ${c.last_name}`.trim();
  }
  return '-';
}

// Helper: get candidate email from offer
function getCandidateEmail(offer) {
  return offer.application?.candidate?.email || '-';
}

// Helper: get job title from offer
function getJobTitle(offer) {
  return offer.application?.job?.title || '-';
}

// Fetch functions
async function fetchApplications() {
  try {
    const response = await getApplicationsApi({ page_size: 200 });
    applications.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch applications:', error);
  }
}

async function fetchOffers() {
  loading.value = true;
  try {
    const params = { page_size: 100 };
    if (statusFilter.value) {
      params.status = statusFilter.value;
    }
    const response = await getOffersApi(params);
    offers.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch offers:', error);
  } finally {
    loading.value = false;
  }
}

async function fetchData() {
  await Promise.all([fetchOffers(), fetchApplications()]);
}

// Get status color
function getStatusColor(status) {
  return statusOptions.find((s) => s.value === status)?.color || 'default';
}

// Get status step
function getStatusStep(status) {
  const steps = ['draft', 'pending', 'sent', 'accepted'];
  const index = steps.indexOf(status);
  if (status === 'declined' || status === 'rejected') return 3;
  if (status === 'withdrawn' || status === 'expired') return 0;
  return index >= 0 ? index : 0;
}

// Format salary
function formatSalary(offer) {
  if (!offer.offered_salary) return '-';
  const amount = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: offer.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(offer.offered_salary);
  return amount;
}

// Format date
function formatDate(date) {
  if (!date) return '-';
  return dayjs(date).format('MMM D, YYYY');
}

// Get application label for select
function getApplicationLabel(app) {
  const candidateName = app.candidate
    ? `${app.candidate.first_name} ${app.candidate.last_name}`.trim()
    : `Candidate #${app.candidate_id}`;
  const jobTitle = app.job?.title || `Job #${app.job_id}`;
  return `${candidateName} - ${jobTitle}`;
}

// Open offer drawer
function openOfferDrawer(offer) {
  if (offer) {
    editingOffer.value = offer;
    offerForm.value = {
      application_id: offer.application_id,
      offered_salary: offer.offered_salary,
      currency: offer.currency || 'USD',
      joining_date: offer.joining_date || '',
      expiry_date: offer.expiry_date || '',
      notes: offer.notes || '',
    };
  } else {
    editingOffer.value = null;
    offerForm.value = {
      application_id: undefined,
      offered_salary: undefined,
      currency: 'USD',
      joining_date: '',
      expiry_date: '',
      notes: '',
    };
  }
  offerDrawerVisible.value = true;
}

// Save offer
async function saveOffer() {
  if (!offerForm.value.application_id) {
    message.error('Please select an application');
    return;
  }
  if (!offerForm.value.offered_salary) {
    message.error('Please enter the offered salary');
    return;
  }
  try {
    const data = { ...offerForm.value };
    if (editingOffer.value) {
      await updateOfferApi(editingOffer.value.id, data);
      message.success('Offer updated successfully');
    } else {
      await createOfferApi(data);
      message.success('Offer created successfully');
    }
    offerDrawerVisible.value = false;
    await fetchOffers();
  } catch (error) {
    message.error('Failed to save offer');
  }
}

// Delete offer
async function deleteOffer(id) {
  try {
    await deleteOfferApi(id);
    message.success('Offer deleted successfully');
    await fetchOffers();
  } catch (error) {
    message.error('Failed to delete offer');
  }
}

// View offer details
function viewOffer(offer) {
  viewingOffer.value = offer;
  detailDrawerVisible.value = true;
}

// Offer actions
async function handleSend(offer) {
  const candidateName = getCandidateName(offer);
  Modal.confirm({
    title: 'Send Offer',
    content: `Send offer to ${candidateName}?`,
    onOk: async () => {
      try {
        await sendOfferApi(offer.id);
        message.success('Offer sent successfully');
        await fetchOffers();
      } catch (error) {
        message.error('Failed to send offer');
      }
    },
  });
}

async function handleAccept(offer) {
  try {
    await acceptOfferApi(offer.id);
    message.success('Offer marked as accepted');
    await fetchOffers();
    if (viewingOffer.value?.id === offer.id) {
      viewingOffer.value = {
        ...viewingOffer.value,
        status: 'accepted',
      };
    }
  } catch (error) {
    message.error('Failed to accept offer');
  }
}

async function handleDecline(offer) {
  try {
    await rejectOfferApi(offer.id);
    message.success('Offer marked as declined');
    await fetchOffers();
    if (viewingOffer.value?.id === offer.id) {
      viewingOffer.value = {
        ...viewingOffer.value,
        status: 'declined',
      };
    }
  } catch (error) {
    message.error('Failed to decline offer');
  }
}

// Can perform action
function canSend(offer) {
  return ['draft', 'pending'].includes(offer.status);
}

function canEdit(offer) {
  return ['draft', 'pending'].includes(offer.status);
}

function canDelete(offer) {
  return ['draft', 'withdrawn'].includes(offer.status);
}

function canMarkResponse(offer) {
  return ['sent'].includes(offer.status);
}

onMounted(async () => {
  await fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Offers</h1>
        <Space>
          <Select
            v-model:value="statusFilter"
            placeholder="Filter by Status"
            style="width: 180px"
            allow-clear
            @change="fetchOffers"
          >
            <SelectOption
              v-for="s in statusOptions"
              :key="s.value"
              :value="s.value"
            >
              {{ s.label }}
            </SelectOption>
          </Select>
          <Button @click="fetchData">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
          <Button type="primary" @click="openOfferDrawer()">
            <template #icon><PlusOutlined /></template>
            Create Offer
          </Button>
        </Space>
      </div>

      <!-- Statistics Cards -->
      <Row :gutter="[16, 16]" class="mb-6">
        <Col :xs="8" :sm="4">
          <Card>
            <Statistic
              title="Total Offers"
              :value="stats.total"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix><FileTextOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="8" :sm="4">
          <Card>
            <Statistic
              title="Pending"
              :value="stats.pending"
              :value-style="{ color: '#faad14' }"
            />
          </Card>
        </Col>
        <Col :xs="8" :sm="4">
          <Card>
            <Statistic
              title="Sent"
              :value="stats.sent"
              :value-style="{ color: '#1890ff' }"
            >
              <template #prefix><SendOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="8" :sm="4">
          <Card>
            <Statistic
              title="Accepted"
              :value="stats.accepted"
              :value-style="{ color: '#52c41a' }"
            >
              <template #prefix><CheckCircleOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="8" :sm="4">
          <Card>
            <Statistic
              title="Declined"
              :value="stats.declined"
              :value-style="{ color: '#ff4d4f' }"
            >
              <template #prefix><CloseCircleOutlined /></template>
            </Statistic>
          </Card>
        </Col>
        <Col :xs="8" :sm="4">
          <Card>
            <Statistic
              title="Accept Rate"
              :value="stats.acceptanceRate"
              suffix="%"
              :value-style="{
                color: stats.acceptanceRate >= 50 ? '#52c41a' : '#faad14',
              }"
            />
          </Card>
        </Col>
      </Row>

      <!-- Offers Table -->
      <Spin :spinning="loading">
        <Card>
          <Table
            :columns="columns"
            :data-source="offers"
            :row-key="(record) => record.id"
            :pagination="{ pageSize: 10, showSizeChanger: true }"
          >
            <template #bodyCell="{ column, record: rawRecord }">
              <template v-if="column.key === 'candidate_name'">
                {{ getCandidateName(rawRecord) }}
              </template>
              <template v-if="column.key === 'job_title'">
                {{ getJobTitle(rawRecord) }}
              </template>
              <template v-if="column.key === 'status'">
                <Tag
                  :color="
                    getStatusColor(
                      rawRecord.status,
                    )
                  "
                >
                  {{
                    statusOptions.find(
                      (s) =>
                        s.value ===
                        rawRecord.status,
                    )?.label || rawRecord.status
                  }}
                </Tag>
              </template>
              <template v-if="column.key === 'salary'">
                <div class="flex items-center gap-1">
                  <DollarOutlined />
                  {{ formatSalary(rawRecord) }}
                </div>
              </template>
              <template v-if="column.key === 'joining_date'">
                {{
                  formatDate(
                    rawRecord.joining_date,
                  )
                }}
              </template>
              <template v-if="column.key === 'expiry_date'">
                <span
                  :class="{
                    'text-red-500':
                      rawRecord.expiry_date &&
                      dayjs(
                        rawRecord.expiry_date,
                      ).isBefore(dayjs()),
                  }"
                >
                  {{
                    formatDate(
                      rawRecord.expiry_date,
                    )
                  }}
                </span>
              </template>
              <template v-if="column.key === 'actions'">
                <Space size="small">
                  <Tooltip title="View Details">
                    <Button
                      size="small"
                      @click="
                        viewOffer(rawRecord)
                      "
                    >
                      <EyeOutlined />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    v-if="canEdit(rawRecord)"
                    title="Edit"
                  >
                    <Button
                      size="small"
                      @click="
                        openOfferDrawer(
                          rawRecord,
                        )
                      "
                    >
                      <EditOutlined />
                    </Button>
                  </Tooltip>
                  <Tooltip
                    v-if="canSend(rawRecord)"
                    title="Send"
                  >
                    <Button
                      size="small"
                      type="primary"
                      @click="
                        handleSend(rawRecord)
                      "
                    >
                      <SendOutlined />
                    </Button>
                  </Tooltip>
                  <Popconfirm
                    v-if="canDelete(rawRecord)"
                    title="Delete this offer?"
                    @confirm="
                      deleteOffer(
                        rawRecord.id,
                      )
                    "
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

      <!-- Create/Edit Offer Drawer -->
      <Drawer
        v-model:open="offerDrawerVisible"
        :title="editingOffer ? 'Edit Offer' : 'Create Offer'"
        width="600"
        :footer-style="{ textAlign: 'right' }"
      >
        <Form layout="vertical">
          <FormItem label="Application" required>
            <Select
              v-model:value="offerForm.application_id"
              placeholder="Select Application"
              show-search
              :filter-option="
                (input, option) =>
                  option.label?.toLowerCase().includes(input.toLowerCase())
              "
            >
              <SelectOption
                v-for="app in applications"
                :key="app.id"
                :value="app.id"
                :label="getApplicationLabel(app)"
              >
                {{ getApplicationLabel(app) }}
              </SelectOption>
            </Select>
          </FormItem>

          <Divider>Compensation</Divider>

          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Offered Salary" required>
                <InputNumber
                  v-model:value="offerForm.offered_salary"
                  style="width: 100%"
                  :min="0"
                  :formatter="
                    (value) =>
                      `$ ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',')
                  "
                  :parser="
                    (value) =>
                      Number(value.replace(/\$\s?|(,*)/g, ''))
                  "
                />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Currency">
                <Select v-model:value="offerForm.currency">
                  <SelectOption value="USD">USD</SelectOption>
                  <SelectOption value="EUR">EUR</SelectOption>
                  <SelectOption value="GBP">GBP</SelectOption>
                  <SelectOption value="INR">INR</SelectOption>
                </Select>
              </FormItem>
            </Col>
          </Row>

          <Divider>Dates</Divider>

          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Joining Date">
                <Input
                  v-model:value="offerForm.joining_date"
                  type="date"
                />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Expiry Date">
                <Input
                  v-model:value="offerForm.expiry_date"
                  type="date"
                />
              </FormItem>
            </Col>
          </Row>

          <FormItem label="Notes">
            <Textarea
              v-model:value="offerForm.notes"
              :rows="4"
              placeholder="Additional notes about this offer..."
            />
          </FormItem>
        </Form>
        <template #footer>
          <Space>
            <Button @click="offerDrawerVisible = false">Cancel</Button>
            <Button type="primary" @click="saveOffer">
              {{ editingOffer ? 'Update' : 'Create' }} Offer
            </Button>
          </Space>
        </template>
      </Drawer>

      <!-- Offer Details Drawer -->
      <Drawer
        v-model:open="detailDrawerVisible"
        title="Offer Details"
        width="650"
      >
        <div v-if="viewingOffer">
          <!-- Status Progress -->
          <Card class="mb-4">
            <Steps :current="getStatusStep(activeOffer.status)" size="small">
              <Step title="Draft" />
              <Step title="Pending" />
              <Step title="Sent" />
              <Step
                :title="
                  activeOffer.status === 'declined' ||
                  activeOffer.status === 'rejected'
                    ? 'Declined'
                    : 'Accepted'
                "
              />
            </Steps>
          </Card>

          <!-- Candidate Info -->
          <Card title="Candidate Information" class="mb-4">
            <Descriptions :column="2">
              <DescriptionsItem label="Name">
                {{ getCandidateName(activeOffer) }}
              </DescriptionsItem>
              <DescriptionsItem label="Email">
                {{ getCandidateEmail(activeOffer) }}
              </DescriptionsItem>
              <DescriptionsItem label="Job">
                {{ getJobTitle(activeOffer) }}
              </DescriptionsItem>
              <DescriptionsItem label="Status">
                <Tag :color="getStatusColor(activeOffer.status)">
                  {{
                    statusOptions.find(
                      (s) => s.value === activeOffer.status,
                    )?.label || activeOffer.status
                  }}
                </Tag>
              </DescriptionsItem>
            </Descriptions>
          </Card>

          <!-- Compensation -->
          <Card title="Compensation" class="mb-4">
            <Descriptions :column="2">
              <DescriptionsItem label="Offered Salary">
                {{ formatSalary(activeOffer) }}
              </DescriptionsItem>
              <DescriptionsItem label="Currency">
                {{ activeOffer.currency || 'USD' }}
              </DescriptionsItem>
            </Descriptions>
          </Card>

          <!-- Dates & Details -->
          <Card title="Offer Details" class="mb-4">
            <Descriptions :column="2">
              <DescriptionsItem label="Offer Date">
                {{ formatDate(activeOffer.offer_date) }}
              </DescriptionsItem>
              <DescriptionsItem label="Joining Date">
                {{ formatDate(activeOffer.joining_date) }}
              </DescriptionsItem>
              <DescriptionsItem label="Expiry Date">
                <span
                  :class="{
                    'text-red-500':
                      activeOffer.expiry_date &&
                      dayjs(activeOffer.expiry_date).isBefore(dayjs()),
                  }"
                >
                  {{ formatDate(activeOffer.expiry_date) }}
                </span>
              </DescriptionsItem>
              <DescriptionsItem label="Created">
                {{ formatDate(activeOffer.created_at) }}
              </DescriptionsItem>
            </Descriptions>
          </Card>

          <!-- Notes -->
          <Card v-if="activeOffer.notes" title="Notes" class="mb-4">
            <p>{{ activeOffer.notes }}</p>
          </Card>

          <!-- Offer Letter -->
          <Card
            v-if="activeOffer.offer_letter_url"
            title="Offer Letter"
            class="mb-4"
          >
            <a
              :href="activeOffer.offer_letter_url"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Offer Letter
            </a>
          </Card>

          <!-- Timeline -->
          <Card title="Activity Timeline" class="mb-4">
            <Timeline>
              <TimelineItem color="blue">
                <p><strong>Offer Created</strong></p>
                <p class="text-gray-500">
                  {{ formatDate(activeOffer.created_at) }}
                </p>
              </TimelineItem>
              <TimelineItem
                v-if="activeOffer.status === 'sent'"
                color="blue"
              >
                <p><strong>Sent to Candidate</strong></p>
              </TimelineItem>
              <TimelineItem
                v-if="activeOffer.status === 'accepted'"
                color="green"
              >
                <p><strong>Accepted</strong></p>
              </TimelineItem>
              <TimelineItem
                v-if="
                  activeOffer.status === 'declined' ||
                  activeOffer.status === 'rejected'
                "
                color="red"
              >
                <p><strong>Declined</strong></p>
              </TimelineItem>
            </Timeline>
          </Card>

          <!-- Actions -->
          <div v-if="canMarkResponse(activeOffer)" class="mt-4 flex gap-2">
            <Button type="primary" @click="handleAccept(activeOffer)">
              <template #icon><CheckCircleOutlined /></template>
              Mark as Accepted
            </Button>
            <Button danger @click="handleDecline(activeOffer)">
              <template #icon><CloseCircleOutlined /></template>
              Mark as Declined
            </Button>
          </div>
          <div v-if="canSend(activeOffer)" class="mt-4">
            <Button type="primary" @click="handleSend(activeOffer)">
              <template #icon><SendOutlined /></template>
              Send Offer
            </Button>
          </div>
        </div>
      </Drawer>
    </div>
  </Page>
</template>
