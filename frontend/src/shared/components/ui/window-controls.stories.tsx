import type { Meta, StoryObj } from "@storybook/nextjs";
import { WindowControls } from "./window-controls";

const meta: Meta<typeof WindowControls> = {
  title: "UI/WindowControls",
  component: WindowControls,
  parameters: {
    layout: "centered",
  },
  tags: ["autodocs"],
  argTypes: {
    variant: {
      control: { type: "select" },
      options: ["default", "compact"],
    },
    showClose: {
      control: { type: "boolean" },
    },
    showMinimize: {
      control: { type: "boolean" },
    },
    showMaximize: {
      control: { type: "boolean" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    variant: "default",
    showClose: true,
    showMinimize: true,
    showMaximize: true,
  },
};

export const Compact: Story = {
  args: {
    variant: "compact",
    showClose: true,
    showMinimize: true,
    showMaximize: true,
  },
};

export const MinimalControls: Story = {
  args: {
    variant: "compact",
    showClose: false,
    showMinimize: true,
    showMaximize: true,
  },
};

export const MaximizeOnly: Story = {
  args: {
    variant: "default",
    showClose: false,
    showMinimize: false,
    showMaximize: true,
  },
};
