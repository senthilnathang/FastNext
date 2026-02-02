<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';

import { Page } from '@vben/common-ui';

import {
  Alert,
  Button,
  Card,
  Space,
  TypographyTitle,
  TypographyParagraph,
} from 'ant-design-vue';
import {
  ArrowRightOutlined,
  SafetyOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'HRMSModelAccess',
});

const router = useRouter();

function navigateToSecurity() {
  router.push({ path: '/settings/security' });
}
</script>

<template>
  <Page auto-content-height>
    <Card>
      <template #title>
        <Space>
          <SafetyOutlined />
          <span>Model Access</span>
        </Space>
      </template>

      <div class="info-container">
        <TypographyTitle :level="4">HRMS Model Access Control</TypographyTitle>
        <TypographyParagraph class="description-text">
          Model Access controls which user groups can access specific HRMS
          models. This includes permissions for creating, reading, updating,
          and deleting records within each model. Proper configuration ensures
          that users only have access to the data relevant to their role.
        </TypographyParagraph>

        <Alert
          message="Configuration Location"
          description="Model access is configured through the main Security settings. Navigate to the Security section to manage model-level permissions for user groups."
          type="info"
          show-icon
          class="info-alert"
        />

        <div class="action-section">
          <Space direction="vertical" :size="12">
            <TypographyParagraph type="secondary">
              To configure model access permissions, go to the Security settings page.
            </TypographyParagraph>
            <Button type="primary" @click="navigateToSecurity">
              Go to Security Settings
              <ArrowRightOutlined />
            </Button>
          </Space>
        </div>
      </div>
    </Card>
  </Page>
</template>

<style scoped>
.info-container {
  max-width: 720px;
  padding: 16px 0;
}

.description-text {
  color: #595959;
  font-size: 14px;
  line-height: 1.8;
}

.info-alert {
  margin: 24px 0;
}

.action-section {
  margin-top: 24px;
  padding-top: 24px;
  border-top: 1px solid #f0f0f0;
}
</style>
