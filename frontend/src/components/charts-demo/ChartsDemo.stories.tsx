import type { Meta, StoryObj } from "@storybook/nextjs";
import { ChartsDemo } from "./ChartsDemo";

const meta: Meta<typeof ChartsDemo> = {
  title: "Charts/ChartsDemo",
  component: ChartsDemo,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Comprehensive demo of all ECharts components including Line, Bar, Pie, Area, and Gauge charts with dashboard widgets.",
      },
    },
  },
  tags: ["autodocs"],
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};
