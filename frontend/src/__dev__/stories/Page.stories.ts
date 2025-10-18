import type { Meta, StoryObj } from "@storybook/react";

// Note: Interactive testing temporarily disabled due to Storybook setup issues
// import { expect } from "@storybook/jest";
// import { userEvent, within } from "@storybook/testing-library";

import { Page } from "./Page";

const meta = {
  title: "Example/Page",
  component: Page,
  parameters: {
    // More on how to position stories at: https://storybook.js.org/docs/configure/story-layout
    layout: "fullscreen",
  },
} satisfies Meta<typeof Page>;

export default meta;
type Story = StoryObj<typeof meta>;

export const LoggedOut: Story = {};

// More on component testing: https://storybook.js.org/docs/writing-tests/interaction-testing
// Interactive testing temporarily disabled due to Storybook setup issues
export const LoggedIn: Story = {
  args: {
    user: {
      name: "Jane Doe",
    },
  },
};
