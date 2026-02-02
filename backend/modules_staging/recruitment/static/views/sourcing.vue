<script setup>
import { computed, onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  DescriptionsItem,
  Drawer,
  Form,
  FormItem,
  Input,
  InputNumber,
  Modal,
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
  TabPane,
  Tag,
  Textarea,
  message,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  LinkOutlined,
  PlusOutlined,
  ReloadOutlined,
  TagOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';

import {
  createCandidateTagApi,
  createSourceChannelApi,
  deleteCandidateTagApi,
  deleteSourceChannelApi,
  getCandidateTagsApi,
  getSourceChannelsApi,
  getSourceStatsApi,
  updateCandidateTagApi,
  updateSourceChannelApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTSourcingList',
});

// State
const loading = ref(false);
const activeTab = ref('channels');
const sourceChannels = ref([]);
const candidateTags = ref([]);
const sourceStats = ref(null);

// Channel form
const channelDrawerVisible = ref(false);
const channelFormLoading = ref(false);
const editingChannel = ref(null);
const channelForm = ref({
  name: '',
  channel_type: 'other',
  description: '',
  url: '',
  cost_per_post: undefined,
  cost_per_click: undefined,
});

// Tag form
const tagModalVisible = ref(false);
const tagFormLoading = ref(false);
const editingTag = ref(null);
const tagForm = ref({
  name: '',
  color: '#1890ff',
  description: '',
});

// Channel types
const channelTypes = [
  { value: 'job_board', label: 'Job Board' },
  { value: 'social', label: 'Social Media' },
  { value: 'referral', label: 'Employee Referral' },
  { value: 'agency', label: 'Recruitment Agency' },
  { value: 'careers_page', label: 'Careers Page' },
  { value: 'event', label: 'Career Event' },
  { value: 'other', label: 'Other' },
];

// Tag colors
const tagColors = [
  '#1890ff', '#52c41a', '#faad14', '#f5222d', '#722ed1',
  '#13c2c2', '#eb2f96', '#fa8c16', '#2f54eb', '#a0d911',
];

// Channel table columns
const channelColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Type', dataIndex: 'channel_type_display', key: 'type' },
  { title: 'Applications', dataIndex: 'total_applications', key: 'applications' },
  { title: 'Hires', dataIndex: 'total_hires', key: 'hires' },
  { title: 'Cost', dataIndex: 'total_cost', key: 'cost' },
  { title: 'Status', dataIndex: 'is_active', key: 'status' },
  { title: 'Actions', key: 'actions', width: 120 },
];

// Tag table columns
const tagColumns = [
  { title: 'Name', dataIndex: 'name', key: 'name' },
  { title: 'Color', key: 'color', width: 100 },
  { title: 'Description', dataIndex: 'description', key: 'description', ellipsis: true },
  { title: 'Candidates', dataIndex: 'candidate_count', key: 'candidates' },
  { title: 'Actions', key: 'actions', width: 120 },
];

// Computed
const statsOverview = computed(() => {
  if (!sourceStats.value) return null;
  const { totals } = sourceStats.value;
  const totalHires = totals.hires || 0;
  const totalApplications = totals.applications || 0;
  const conversionRate = totalApplications > 0
    ? (totalHires / totalApplications) * 100
    : 0;
  const avgCostPerHire = totalHires > 0
    ? totals.total_cost / totalHires
    : 0;
  return {
    total_applications: totalApplications,
    total_hires: totalHires,
    overall_conversion_rate: conversionRate,
    average_cost_per_hire: avgCostPerHire,
  };
});

// Methods
async function fetchData() {
  loading.value = true;
  try {
    const [channelsRes, tagsRes, statsRes] = await Promise.all([
      getSourceChannelsApi(),
      getCandidateTagsApi(),
      getSourceStatsApi({ days: 90 }),
    ]);
    sourceChannels.value = channelsRes.items || [];
    candidateTags.value = tagsRes.items || [];
    sourceStats.value = statsRes;
  } catch (error) {
    console.error('Failed to fetch data:', error);
    message.error('Failed to load sourcing data');
  } finally {
    loading.value = false;
  }
}

function openChannelDrawer(channel) {
  editingChannel.value = channel || null;
  if (channel) {
    channelForm.value = {
      name: channel.name,
      channel_type: channel.channel_type,
      description: channel.description || '',
      url: channel.url || '',
      cost_per_post: channel.cost_per_post ?? undefined,
      cost_per_click: channel.cost_per_click ?? undefined,
    };
  } else {
    channelForm.value = {
      name: '',
      channel_type: 'other',
      description: '',
      url: '',
      cost_per_post: undefined,
      cost_per_click: undefined,
    };
  }
  channelDrawerVisible.value = true;
}

async function saveChannel() {
  if (!channelForm.value.name) {
    message.error('Name is required');
    return;
  }

  channelFormLoading.value = true;
  try {
    const formData = {
      name: channelForm.value.name,
      channel_type: channelForm.value.channel_type,
      description: channelForm.value.description || undefined,
      url: channelForm.value.url || undefined,
      cost_per_post: channelForm.value.cost_per_post,
      cost_per_click: channelForm.value.cost_per_click,
    };
    if (editingChannel.value) {
      await updateSourceChannelApi(editingChannel.value.id, formData);
      message.success('Channel updated successfully');
    } else {
      await createSourceChannelApi(formData);
      message.success('Channel created successfully');
    }
    channelDrawerVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('Failed to save channel:', error);
    message.error('Failed to save channel');
  } finally {
    channelFormLoading.value = false;
  }
}

async function deleteChannel(id) {
  try {
    await deleteSourceChannelApi(id);
    message.success('Channel deactivated');
    fetchData();
  } catch (error) {
    console.error('Failed to delete channel:', error);
    message.error('Failed to delete channel');
  }
}

function openTagModal(tag) {
  editingTag.value = tag || null;
  if (tag) {
    tagForm.value = {
      name: tag.name,
      color: tag.color || '#1890ff',
      description: tag.description || '',
    };
  } else {
    tagForm.value = {
      name: '',
      color: '#1890ff',
      description: '',
    };
  }
  tagModalVisible.value = true;
}

async function saveTag() {
  if (!tagForm.value.name) {
    message.error('Name is required');
    return;
  }

  tagFormLoading.value = true;
  try {
    if (editingTag.value) {
      await updateCandidateTagApi(editingTag.value.id, tagForm.value);
      message.success('Tag updated successfully');
    } else {
      await createCandidateTagApi(tagForm.value);
      message.success('Tag created successfully');
    }
    tagModalVisible.value = false;
    fetchData();
  } catch (error) {
    console.error('Failed to save tag:', error);
    message.error('Failed to save tag');
  } finally {
    tagFormLoading.value = false;
  }
}

async function deleteTag(id) {
  try {
    await deleteCandidateTagApi(id);
    message.success('Tag deleted');
    fetchData();
  } catch (error) {
    console.error('Failed to delete tag:', error);
    message.error('Failed to delete tag');
  }
}

function formatCurrency(value) {
  if (value === null || value === undefined) return '-';
  return `$${value.toLocaleString()}`;
}

onMounted(() => {
  fetchData();
});
</script>

<template>
  <Page auto-content-height>
    <div class="p-4">
      <div class="mb-6 flex items-center justify-between">
        <h1 class="text-2xl font-bold">Candidate Sourcing</h1>
        <Space>
          <Button @click="fetchData">
            <template #icon><ReloadOutlined /></template>
            Refresh
          </Button>
        </Space>
      </div>

      <Spin :spinning="loading">
        <!-- Stats Overview -->
        <Row :gutter="[16, 16]" class="mb-6">
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Total Applications"
                :value="statsOverview?.total_applications || 0"
                :value-style="{ color: '#1890ff' }"
              >
                <template #prefix><TeamOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Total Hires"
                :value="statsOverview?.total_hires || 0"
                :value-style="{ color: '#52c41a' }"
              >
                <template #prefix><TeamOutlined /></template>
              </Statistic>
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Conversion Rate"
                :value="statsOverview?.overall_conversion_rate || 0"
                suffix="%"
                :precision="1"
                :value-style="{ color: '#722ed1' }"
              />
            </Card>
          </Col>
          <Col :xs="12" :sm="6">
            <Card>
              <Statistic
                title="Avg Cost/Hire"
                :value="statsOverview?.average_cost_per_hire || 0"
                prefix="$"
                :precision="0"
                :value-style="{ color: '#faad14' }"
              >
                <template #prefix><DollarOutlined /></template>
              </Statistic>
            </Card>
          </Col>
        </Row>

        <Tabs v-model:activeKey="activeTab">
          <!-- Source Channels Tab -->
          <TabPane key="channels" tab="Source Channels">
            <div class="mb-4 flex justify-end">
              <Button type="primary" @click="openChannelDrawer()">
                <template #icon><PlusOutlined /></template>
                Add Channel
              </Button>
            </div>

            <Table
              :columns="channelColumns"
              :data-source="sourceChannels"
              :row-key="(record) => record.id"
              :pagination="{ pageSize: 10 }"
            >
              <template #bodyCell="{ column, record: rawRecord }">
                <template v-if="column.key === 'type'">
                  <Tag color="blue">{{ rawRecord.channel_type_display }}</Tag>
                </template>
                <template v-else-if="column.key === 'cost'">
                  {{ formatCurrency(rawRecord.total_cost) }}
                </template>
                <template v-else-if="column.key === 'status'">
                  <Badge
                    :status="rawRecord.is_active ? 'success' : 'default'"
                    :text="rawRecord.is_active ? 'Active' : 'Inactive'"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space>
                    <Button type="link" size="small" @click="openChannelDrawer(rawRecord)">
                      <EditOutlined />
                    </Button>
                    <Popconfirm
                      title="Deactivate this channel?"
                      @confirm="deleteChannel(rawRecord.id)"
                    >
                      <Button type="link" size="small" danger>
                        <DeleteOutlined />
                      </Button>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </TabPane>

          <!-- Candidate Tags Tab -->
          <TabPane key="tags" tab="Candidate Tags">
            <div class="mb-4 flex justify-end">
              <Button type="primary" @click="openTagModal()">
                <template #icon><PlusOutlined /></template>
                Add Tag
              </Button>
            </div>

            <Table
              :columns="tagColumns"
              :data-source="candidateTags"
              :row-key="(record) => record.id"
              :pagination="{ pageSize: 10 }"
            >
              <template #bodyCell="{ column, record: rawRecord }">
                <template v-if="column.key === 'name'">
                  <Tag :color="rawRecord.color ?? undefined">
                    <TagOutlined /> {{ rawRecord.name }}
                  </Tag>
                </template>
                <template v-else-if="column.key === 'color'">
                  <div
                    :style="{
                      width: '24px',
                      height: '24px',
                      borderRadius: '4px',
                      backgroundColor: rawRecord.color ?? '#ccc',
                    }"
                  />
                </template>
                <template v-else-if="column.key === 'actions'">
                  <Space>
                    <Button
                      type="link"
                      size="small"
                      :disabled="rawRecord.is_system"
                      @click="openTagModal(rawRecord)"
                    >
                      <EditOutlined />
                    </Button>
                    <Popconfirm
                      title="Delete this tag?"
                      :disabled="rawRecord.is_system"
                      @confirm="deleteTag(rawRecord.id)"
                    >
                      <Button type="link" size="small" danger :disabled="rawRecord.is_system">
                        <DeleteOutlined />
                      </Button>
                    </Popconfirm>
                  </Space>
                </template>
              </template>
            </Table>
          </TabPane>

          <!-- Source Stats Tab -->
          <TabPane key="stats" tab="Source Effectiveness">
            <Row :gutter="[16, 16]">
              <Col
                v-for="channel in sourceStats?.sources || []"
                :key="channel.channel_id"
                :xs="24"
                :sm="12"
                :lg="8"
              >
                <Card :title="channel.channel_name">
                  <template #extra>
                    <Tag color="blue">{{ channel.channel_type }}</Tag>
                  </template>
                  <Descriptions :column="2" size="small">
                    <DescriptionsItem label="Applications">
                      {{ channel.applications }}
                    </DescriptionsItem>
                    <DescriptionsItem label="Hires">
                      {{ channel.hires }}
                    </DescriptionsItem>
                    <DescriptionsItem label="Cost">
                      {{ formatCurrency(channel.cost) }}
                    </DescriptionsItem>
                    <DescriptionsItem label="Cost/Hire">
                      {{ channel.cost_per_hire ? formatCurrency(channel.cost_per_hire) : '-' }}
                    </DescriptionsItem>
                  </Descriptions>
                  <div class="mt-4">
                    <div class="mb-1 text-sm text-gray-500">Conversion Rate</div>
                    <Progress
                      :percent="channel.conversion_rate"
                      :status="channel.conversion_rate >= 10 ? 'success' : 'normal'"
                    />
                  </div>
                </Card>
              </Col>
            </Row>
          </TabPane>
        </Tabs>
      </Spin>

      <!-- Channel Drawer -->
      <Drawer
        v-model:open="channelDrawerVisible"
        :title="editingChannel ? 'Edit Source Channel' : 'Add Source Channel'"
        :width="480"
        :body-style="{ paddingBottom: '80px' }"
      >
        <Form layout="vertical">
          <FormItem label="Name" required>
            <Input v-model:value="channelForm.name" placeholder="e.g., LinkedIn, Indeed" />
          </FormItem>
          <FormItem label="Type">
            <Select v-model:value="channelForm.channel_type">
              <SelectOption v-for="type in channelTypes" :key="type.value" :value="type.value">
                {{ type.label }}
              </SelectOption>
            </Select>
          </FormItem>
          <FormItem label="Description">
            <Textarea
              v-model:value="channelForm.description"
              :rows="3"
              placeholder="Optional description"
            />
          </FormItem>
          <FormItem label="URL">
            <Input v-model:value="channelForm.url" placeholder="https://...">
              <template #prefix><LinkOutlined /></template>
            </Input>
          </FormItem>
          <Row :gutter="16">
            <Col :span="12">
              <FormItem label="Cost per Post">
                <InputNumber
                  v-model:value="channelForm.cost_per_post"
                  :min="0"
                  :precision="2"
                  prefix="$"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
            <Col :span="12">
              <FormItem label="Cost per Click">
                <InputNumber
                  v-model:value="channelForm.cost_per_click"
                  :min="0"
                  :precision="2"
                  prefix="$"
                  style="width: 100%"
                />
              </FormItem>
            </Col>
          </Row>
        </Form>

        <div class="absolute bottom-0 left-0 right-0 border-t bg-white p-4">
          <Space>
            <Button @click="channelDrawerVisible = false">Cancel</Button>
            <Button type="primary" :loading="channelFormLoading" @click="saveChannel">
              {{ editingChannel ? 'Update' : 'Create' }}
            </Button>
          </Space>
        </div>
      </Drawer>

      <!-- Tag Modal -->
      <Modal
        v-model:open="tagModalVisible"
        :title="editingTag ? 'Edit Tag' : 'Add Tag'"
        :confirm-loading="tagFormLoading"
        @ok="saveTag"
      >
        <Form layout="vertical">
          <FormItem label="Name" required>
            <Input v-model:value="tagForm.name" placeholder="Tag name" />
          </FormItem>
          <FormItem label="Color">
            <div class="flex flex-wrap gap-2">
              <div
                v-for="color in tagColors"
                :key="color"
                :style="{
                  width: '32px',
                  height: '32px',
                  borderRadius: '4px',
                  backgroundColor: color,
                  cursor: 'pointer',
                  border: tagForm.color === color ? '3px solid #000' : '1px solid #d9d9d9',
                }"
                @click="tagForm.color = color"
              />
            </div>
          </FormItem>
          <FormItem label="Description">
            <Textarea
              v-model:value="tagForm.description"
              :rows="2"
              placeholder="Optional description"
            />
          </FormItem>
        </Form>
      </Modal>
    </div>
  </Page>
</template>
