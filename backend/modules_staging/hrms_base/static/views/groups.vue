<script setup>
import { onMounted, ref, computed } from 'vue';

import { Page } from '@vben/common-ui';

import {
  Button,
  Card,
  Empty,
  Input,
  Space,
  Spin,
  Table,
  Tag,
  Tooltip,
} from 'ant-design-vue';
import {
  ReloadOutlined,
  SearchOutlined,
  TeamOutlined,
} from '@ant-design/icons-vue';

import { useNotification } from '#/composables';
import { requestClient } from '#/api/request';

defineOptions({
  name: 'HRMSGroups',
});

const { error: showError } = useNotification();

const loading = ref(false);
const groups = ref([]);
const searchText = ref('');
const hasError = ref(false);

const columns = [
  {
    title: 'Name',
    dataIndex: 'name',
    key: 'name',
    width: 250,
    ellipsis: true,
  },
  {
    title: 'Description',
    dataIndex: 'description',
    key: 'description',
    ellipsis: true,
  },
  {
    title: 'Members Count',
    dataIndex: 'members_count',
    key: 'members_count',
    width: 140,
    align: 'center',
  },
  {
    title: 'Active',
    dataIndex: 'is_active',
    key: 'is_active',
    width: 100,
    align: 'center',
  },
  {
    title: 'Actions',
    key: 'actions',
    width: 100,
    align: 'center',
  },
];

const filteredGroups = computed(() => {
  if (!searchText.value) {
    return groups.value;
  }
  const query = searchText.value.toLowerCase();
  return groups.value.filter(
    (g) =>
      (g.name && g.name.toLowerCase().includes(query)) ||
      (g.description && g.description.toLowerCase().includes(query)),
  );
});

async function fetchGroups() {
  loading.value = true;
  hasError.value = false;
  try {
    const res = await requestClient.get('/users/groups/?limit=100');
    groups.value = res.items || res.results || (Array.isArray(res) ? res : []);
  } catch (err) {
    console.error('Failed to fetch groups:', err);
    hasError.value = true;
    groups.value = [];
    if (err?.response?.status !== 404) {
      showError('Failed to load groups');
    }
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  fetchGroups();
});
</script>

<template>
  <Page auto-content-height>
    <Spin :spinning="loading">
      <Card>
        <template #title>
          <Space>
            <TeamOutlined />
            <span>Groups</span>
          </Space>
        </template>
        <template #extra>
          <Space>
            <Tooltip title="Refresh">
              <Button @click="fetchGroups">
                <ReloadOutlined /> Refresh
              </Button>
            </Tooltip>
          </Space>
        </template>

        <template v-if="hasError">
          <div class="empty-container">
            <Empty description="Groups are managed through Settings > Groups.">
              <template #image>
                <TeamOutlined class="empty-icon" />
              </template>
            </Empty>
          </div>
        </template>

        <template v-else>
          <!-- Search bar -->
          <div class="search-row">
            <Input
              v-model:value="searchText"
              placeholder="Search groups by name or description..."
              allow-clear
              class="search-input"
            >
              <template #prefix>
                <SearchOutlined style="color: #bfbfbf" />
              </template>
            </Input>
          </div>

          <Table
            :columns="columns"
            :data-source="filteredGroups"
            :pagination="{
              pageSize: 20,
              showSizeChanger: true,
              showTotal: (total) => `Total ${total} groups`,
            }"
            :scroll="{ x: 700 }"
            row-key="id"
          >
            <template #bodyCell="{ column, record }">
              <template v-if="column.key === 'name'">
                <span class="group-name">{{ record.name }}</span>
              </template>
              <template v-if="column.key === 'description'">
                <span>{{ record.description || '-' }}</span>
              </template>
              <template v-if="column.key === 'members_count'">
                <Tag color="blue">
                  {{ record.members_count ?? record.user_count ?? 0 }} members
                </Tag>
              </template>
              <template v-if="column.key === 'is_active'">
                <Tag v-if="record.is_active !== false" color="green">Active</Tag>
                <Tag v-else color="default">Inactive</Tag>
              </template>
              <template v-if="column.key === 'actions'">
                <Tooltip title="Managed via Settings">
                  <Button size="small" disabled>
                    View
                  </Button>
                </Tooltip>
              </template>
            </template>
          </Table>
        </template>
      </Card>
    </Spin>
  </Page>
</template>

<style scoped>
.search-row {
  margin-bottom: 16px;
}

.search-input {
  max-width: 400px;
}

.group-name {
  font-weight: 500;
}

.empty-container {
  padding: 60px 0;
  text-align: center;
}

.empty-icon {
  font-size: 48px;
  color: #d9d9d9;
}
</style>
