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
  LockOutlined,
} from '@ant-design/icons-vue';

defineOptions({
  name: 'HRMSAccessRules',
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
          <LockOutlined />
          <span>Access Rules</span>
        </Space>
      </template>

      <div class="info-container">
        <TypographyTitle :level="4">Row-Level Access Rules</TypographyTitle>
        <TypographyParagraph class="description-text">
          Access rules define row-level security for HRMS data. These rules
          determine which specific records a user or group can view, edit, or
          manage based on criteria such as department, role, or ownership.
          This ensures fine-grained control over sensitive HR information.
        </TypographyParagraph>

        <Alert
          message="Configuration Location"
          description="Access rules are configured through the main Security settings. Navigate to the Security section to define and manage row-level access rules for HRMS data."
          type="info"
          show-icon
          class="info-alert"
        />

        <div class="action-section">
          <Space direction="vertical" :size="12">
            <TypographyParagraph type="secondary">
              To configure access rules, go to the Security settings page.
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
