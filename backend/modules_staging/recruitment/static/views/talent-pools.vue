<script setup>
import { onMounted, ref } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Avatar,
  Button,
  Card,
  Drawer,
  Form,
  FormItem,
  Input,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Textarea,
  message,
} from 'ant-design-vue';
import {
  DeleteOutlined,
  EditOutlined,
  PlusOutlined,
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
  UserAddOutlined,
} from '@ant-design/icons-vue';

import {
  addSkillZoneCandidateApi,
  createSkillZoneApi,
  deleteSkillZoneApi,
  getCandidatesApi,
  getSkillZoneCandidatesApi,
  getSkillZonesApi,
  removeSkillZoneCandidateApi,
  updateSkillZoneApi,
} from '#/api/recruitment';

defineOptions({
  name: 'RECRUITMENTTalentPoolsList',
});

const loading = ref(false);
const skillZones = ref([]);
const selectedZone = ref(null);
const zoneCandidates = ref([]);
const allCandidates = ref([]);
const searchText = ref('');
const showZoneModal = ref(false);
const showDrawer = ref(false);
const showAddCandidateModal = ref(false);
const editingZone = ref(null);
const selectedCandidateId = ref(undefined);

const zoneForm = ref({
  title: '',
  description: '',
});

const columns = [
  { title: 'Title', dataIndex: 'title', key: 'title' },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: 'Candidates',
    key: 'candidate_count',
    width: 120,
    align: 'center',
  },
  { title: 'Status', key: 'status', width: 100 },
  { title: 'Actions', key: 'actions', width: 150, fixed: 'right' },
];

const candidateColumns = [
  { title: 'Candidate', key: 'candidate', width: 250 },
  { title: 'Email', key: 'email' },
  { title: 'Reason', dataIndex: 'reason', key: 'reason', ellipsis: true },
  { title: 'Added On', key: 'added_on', width: 120 },
  { title: 'Actions', key: 'actions', width: 100, fixed: 'right' },
];

async function fetchSkillZones() {
  loading.value = true;
  try {
    const params = {};
    if (searchText.value) params.search = searchText.value;
    const response = await getSkillZonesApi(params);
    skillZones.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch skill zones:', error);
    message.error('Failed to load talent pools');
  } finally {
    loading.value = false;
  }
}

async function fetchZoneCandidates(zoneId) {
  try {
    const response = await getSkillZoneCandidatesApi({
      skill_zone_id: zoneId,
    });
    zoneCandidates.value = response.items || [];
  } catch (error) {
    console.error('Failed to fetch zone candidates:', error);
    zoneCandidates.value = [];
  }
}

async function fetchAllCandidates() {
  try {
    const response = await getCandidatesApi({ page_size: 500 });
    allCandidates.value = (response.items || []).map((c) => ({
      id: c.id,
      name: c.name,
      email: c.email,
    }));
  } catch (error) {
    console.error('Failed to fetch candidates:', error);
  }
}

function openZoneModal(zone) {
  if (zone) {
    editingZone.value = zone;
    zoneForm.value = {
      title: zone.title,
      description: zone.description || '',
    };
  } else {
    editingZone.value = null;
    zoneForm.value = {
      title: '',
      description: '',
    };
  }
  showZoneModal.value = true;
}

async function handleSaveZone() {
  if (!zoneForm.value.title) {
    message.error('Please enter a title');
    return;
  }

  try {
    if (editingZone.value) {
      await updateSkillZoneApi(editingZone.value.id, zoneForm.value);
      message.success('Talent pool updated');
    } else {
      await createSkillZoneApi(zoneForm.value);
      message.success('Talent pool created');
    }
    showZoneModal.value = false;
    fetchSkillZones();
  } catch (error) {
    console.error('Failed to save skill zone:', error);
    message.error('Failed to save talent pool');
  }
}

async function handleDeleteZone(id) {
  try {
    await deleteSkillZoneApi(id);
    message.success('Talent pool deleted');
    if (selectedZone.value?.id === id) {
      selectedZone.value = null;
      zoneCandidates.value = [];
      showDrawer.value = false;
    }
    fetchSkillZones();
  } catch (error) {
    console.error('Failed to delete skill zone:', error);
    message.error('Failed to delete talent pool');
  }
}

function selectZone(zone) {
  selectedZone.value = zone;
  fetchZoneCandidates(zone.id);
  showDrawer.value = true;
}

function openAddCandidateModal() {
  selectedCandidateId.value = undefined;
  showAddCandidateModal.value = true;
}

async function handleAddCandidate() {
  if (!selectedCandidateId.value || !selectedZone.value) {
    message.error('Please select a candidate');
    return;
  }

  try {
    await addSkillZoneCandidateApi({
      skill_zone_id: selectedZone.value.id,
      candidate_id: selectedCandidateId.value,
    });
    message.success('Candidate added to talent pool');
    showAddCandidateModal.value = false;
    fetchZoneCandidates(selectedZone.value.id);
    fetchSkillZones();
  } catch (error) {
    console.error('Failed to add candidate:', error);
    message.error('Failed to add candidate to talent pool');
  }
}

async function handleRemoveCandidate(id) {
  try {
    await removeSkillZoneCandidateApi(id);
    message.success('Candidate removed from talent pool');
    if (selectedZone.value) {
      fetchZoneCandidates(selectedZone.value.id);
      fetchSkillZones();
    }
  } catch (error) {
    console.error('Failed to remove candidate:', error);
    message.error('Failed to remove candidate');
  }
}

function getInitials(name) {
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0]?.charAt(0) || ''}${parts[1]?.charAt(0) || ''}`.toUpperCase();
  }
  return name.charAt(0).toUpperCase();
}

function formatDate(dateString) {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

onMounted(() => {
  fetchSkillZones();
  fetchAllCandidates();
});
</script>

<template>
  <Page title="Talent Pools" description="Manage talent pools and candidates">
    <Card>
      <!-- Toolbar -->
      <div class="mb-4 flex items-center justify-between">
        <Space>
          <Input
            v-model:value="searchText"
            placeholder="Search..."
            style="width: 250px"
            allow-clear
            @press-enter="fetchSkillZones"
          >
            <template #prefix>
              <SearchOutlined />
            </template>
          </Input>
          <Button @click="fetchSkillZones">Search</Button>
        </Space>
        <Space>
          <Button @click="fetchSkillZones">
            <template #icon>
              <ReloadOutlined />
            </template>
            Refresh
          </Button>
          <Button type="primary" @click="openZoneModal()">
            <template #icon>
              <PlusOutlined />
            </template>
            New Pool
          </Button>
        </Space>
      </div>

      <!-- Table -->
      <Table
        :columns="columns"
        :data-source="skillZones"
        :loading="loading"
        :pagination="false"
        :custom-row="
          (record) => ({
            onClick: () => selectZone(record),
            style: 'cursor: pointer',
          })
        "
        :row-class-name="
          (record) =>
            record.id === selectedZone?.id ? 'bg-blue-50' : ''
        "
        row-key="id"
        size="middle"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'candidate_count'">
            <Tag color="blue">
              <TeamOutlined class="mr-1" />
              {{ record.candidate_count || 0 }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'status'">
            <Tag :color="record.is_active ? 'green' : 'default'">
              {{ record.is_active ? 'Active' : 'Inactive' }}
            </Tag>
          </template>

          <template v-else-if="column.key === 'actions'">
            <Space @click.stop>
              <Button
                type="link"
                size="small"
                @click.stop="openZoneModal(record)"
              >
                <template #icon>
                  <EditOutlined />
                </template>
              </Button>
              <Popconfirm
                title="Delete this talent pool?"
                ok-text="Yes"
                cancel-text="No"
                @confirm="handleDeleteZone(record.id)"
              >
                <Button type="link" size="small" danger @click.stop>
                  <template #icon>
                    <DeleteOutlined />
                  </template>
                </Button>
              </Popconfirm>
            </Space>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center text-gray-500">
            <TeamOutlined class="mb-4 text-4xl text-gray-300" />
            <p>No talent pools found</p>
          </div>
        </template>
      </Table>
    </Card>

    <!-- Detail Drawer -->
    <Drawer
      v-model:open="showDrawer"
      :title="selectedZone?.title || 'Talent Pool'"
      width="720"
      placement="right"
    >
      <template #extra>
        <Button type="primary" size="small" @click="openAddCandidateModal">
          <template #icon>
            <UserAddOutlined />
          </template>
          Add Candidate
        </Button>
      </template>

      <div v-if="selectedZone" class="mb-4">
        <p v-if="selectedZone.description" class="mb-2 text-gray-600">
          {{ selectedZone.description }}
        </p>
        <Tag color="blue">{{ zoneCandidates.length }} candidates</Tag>
        <Tag :color="selectedZone.is_active ? 'green' : 'default'" class="ml-2">
          {{ selectedZone.is_active ? 'Active' : 'Inactive' }}
        </Tag>
      </div>

      <Table
        :columns="candidateColumns"
        :data-source="zoneCandidates"
        row-key="id"
        size="small"
        :pagination="false"
      >
        <template #bodyCell="{ column, record }">
          <template v-if="column.key === 'candidate'">
            <div v-if="record.candidate" class="flex items-center gap-2">
              <Avatar :size="32" style="background-color: #1890ff">
                {{ getInitials(record.candidate.name) }}
              </Avatar>
              <div>
                <div class="font-medium">{{ record.candidate.name }}</div>
                <div
                  v-if="record.candidate.mobile"
                  class="text-xs text-gray-500"
                >
                  {{ record.candidate.mobile }}
                </div>
              </div>
            </div>
            <span v-else class="text-gray-400">-</span>
          </template>

          <template v-else-if="column.key === 'email'">
            {{ record.candidate?.email || '-' }}
          </template>

          <template v-else-if="column.key === 'added_on'">
            {{ formatDate(record.added_on) }}
          </template>

          <template v-else-if="column.key === 'actions'">
            <Popconfirm
              title="Remove from talent pool?"
              ok-text="Yes"
              cancel-text="No"
              @confirm="handleRemoveCandidate(record.id)"
            >
              <Button type="link" size="small" danger>
                <template #icon>
                  <DeleteOutlined />
                </template>
              </Button>
            </Popconfirm>
          </template>
        </template>

        <template #emptyText>
          <div class="py-8 text-center text-gray-500">
            <TeamOutlined class="mb-4 text-4xl text-gray-300" />
            <p>No candidates in this talent pool</p>
          </div>
        </template>
      </Table>
    </Drawer>

    <!-- Zone Modal -->
    <Modal
      v-model:open="showZoneModal"
      :title="editingZone ? 'Edit Talent Pool' : 'New Talent Pool'"
      width="500px"
      @ok="handleSaveZone"
    >
      <Form layout="vertical" class="mt-4">
        <FormItem label="Title" required>
          <Input
            v-model:value="zoneForm.title"
            placeholder="Enter talent pool name"
          />
        </FormItem>
        <FormItem label="Description">
          <Textarea
            v-model:value="zoneForm.description"
            :rows="3"
            placeholder="Describe the talent pool..."
          />
        </FormItem>
      </Form>
    </Modal>

    <!-- Add Candidate Modal -->
    <Modal
      v-model:open="showAddCandidateModal"
      title="Add Candidate to Talent Pool"
      width="500px"
      @ok="handleAddCandidate"
    >
      <Form layout="vertical" class="mt-4">
        <FormItem label="Select Candidate" required>
          <Select
            v-model:value="selectedCandidateId"
            placeholder="Search and select candidate"
            show-search
            :filter-option="
              (input, option) =>
                option.label.toLowerCase().includes(input.toLowerCase())
            "
            :options="
              allCandidates.map((c) => ({
                value: c.id,
                label: `${c.name} (${c.email})`,
              }))
            "
          />
        </FormItem>
      </Form>
    </Modal>
  </Page>
</template>
