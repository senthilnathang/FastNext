import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import LabelManager from "@/components/inbox/LabelManager";
import type { Label } from "@/lib/api/inbox";

// Sample labels data
const sampleLabels: Label[] = [
  {
    id: 1,
    name: "Urgent",
    color: "#EF4444",
    icon: "🔥",
    description: "Requires immediate attention",
    is_system: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 2,
    name: "Bug",
    color: "#F97316",
    icon: "🐛",
    description: "Bug reports and issues",
    is_system: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 3,
    name: "Feature Request",
    color: "#22C55E",
    icon: "💡",
    description: "New feature suggestions",
    is_system: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 4,
    name: "Documentation",
    color: "#3B82F6",
    icon: "📝",
    description: "Documentation updates",
    is_system: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 5,
    name: "Question",
    color: "#8B5CF6",
    icon: "❓",
    is_system: false,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const systemLabels: Label[] = [
  {
    id: 100,
    name: "Inbox",
    color: "#6B7280",
    icon: "📥",
    is_system: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
  {
    id: 101,
    name: "Archived",
    color: "#9CA3AF",
    icon: "📦",
    is_system: true,
    created_at: "2024-01-01T00:00:00Z",
    updated_at: "2024-01-01T00:00:00Z",
  },
];

const allLabels = [...systemLabels, ...sampleLabels];

const meta: Meta<typeof LabelManager> = {
  title: "Components/LabelPicker",
  component: LabelManager,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A label manager component for creating, editing, and deleting labels. Supports custom colors, icons, and descriptions. System labels cannot be modified.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    labels: {
      description: "Array of label objects",
    },
    loading: {
      control: "boolean",
      description: "Show loading state",
    },
    onCreateLabel: {
      action: "create-label",
      description: "Callback when a new label is created",
    },
    onUpdateLabel: {
      action: "update-label",
      description: "Callback when a label is updated",
    },
    onDeleteLabel: {
      action: "delete-label",
      description: "Callback when a label is deleted",
    },
    onReorderLabels: {
      action: "reorder-labels",
      description: "Callback when labels are reordered",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    labels: sampleLabels,
    onCreateLabel: (data) => console.log("Create:", data),
    onUpdateLabel: (id, data) => console.log("Update:", id, data),
    onDeleteLabel: (id) => console.log("Delete:", id),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Default label manager with create, edit, and delete functionality.",
      },
    },
  },
};

export const Empty: Story = {
  args: {
    labels: [],
    onCreateLabel: (data) => console.log("Create:", data),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Empty state with option to create first label.",
      },
    },
  },
};

export const WithSystemLabels: Story = {
  args: {
    labels: allLabels,
    onCreateLabel: (data) => console.log("Create:", data),
    onUpdateLabel: (id, data) => console.log("Update:", id, data),
    onDeleteLabel: (id) => console.log("Delete:", id),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Labels including system labels (which cannot be edited or deleted).",
      },
    },
  },
};

export const Loading: Story = {
  args: {
    labels: [],
    loading: true,
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Loading state while fetching labels.",
      },
    },
  },
};

export const ReadOnly: Story = {
  args: {
    labels: sampleLabels,
    // No create/update/delete callbacks - read only mode
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "Read-only mode - no add button, no edit/delete actions.",
      },
    },
  },
};

export const WithReordering: Story = {
  args: {
    labels: sampleLabels,
    onCreateLabel: (data) => console.log("Create:", data),
    onUpdateLabel: (id, data) => console.log("Update:", id, data),
    onDeleteLabel: (id) => console.log("Delete:", id),
    onReorderLabels: (ids) => console.log("Reorder:", ids),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "With reordering enabled (shows grip handle on hover).",
      },
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const [labels, setLabels] = useState<Label[]>(sampleLabels);

    const handleCreate = (data: { name: string; color: string; icon?: string; description?: string }) => {
      const newLabel: Label = {
        id: Date.now(),
        ...data,
        is_system: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      setLabels((prev) => [...prev, newLabel]);
    };

    const handleUpdate = (id: number, data: { name?: string; color?: string; icon?: string; description?: string }) => {
      setLabels((prev) =>
        prev.map((label) =>
          label.id === id
            ? { ...label, ...data, updated_at: new Date().toISOString() }
            : label
        )
      );
    };

    const handleDelete = (id: number) => {
      setLabels((prev) => prev.filter((label) => label.id !== id));
    };

    return (
      <div className="w-96 p-4 border rounded-lg bg-white dark:bg-gray-900">
        <LabelManager
          labels={labels}
          onCreateLabel={handleCreate}
          onUpdateLabel={handleUpdate}
          onDeleteLabel={handleDelete}
        />
        <div className="mt-4 pt-4 border-t">
          <button
            onClick={() => setLabels(sampleLabels)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            Reset labels
          </button>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Interactive example with working CRUD operations.",
      },
    },
  },
};

export const InSettingsPanel: Story = {
  render: () => {
    const [labels, setLabels] = useState<Label[]>(sampleLabels);

    return (
      <div className="w-[500px] p-6 border rounded-lg bg-white dark:bg-gray-900">
        <div className="mb-6">
          <h2 className="text-xl font-semibold">Settings</h2>
          <p className="text-sm text-gray-500 mt-1">
            Manage your inbox labels and categories
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">
              Label Management
            </h3>
            <LabelManager
              labels={labels}
              onCreateLabel={(data) => {
                const newLabel: Label = {
                  id: Date.now(),
                  ...data,
                  is_system: false,
                  created_at: new Date().toISOString(),
                  updated_at: new Date().toISOString(),
                };
                setLabels((prev) => [...prev, newLabel]);
              }}
              onUpdateLabel={(id, data) => {
                setLabels((prev) =>
                  prev.map((label) =>
                    label.id === id ? { ...label, ...data } : label
                  )
                );
              }}
              onDeleteLabel={(id) => {
                setLabels((prev) => prev.filter((label) => label.id !== id));
              }}
            />
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Label manager integrated in a settings panel UI.",
      },
    },
  },
};

export const DarkMode: Story = {
  args: {
    labels: sampleLabels,
    onCreateLabel: (data) => console.log("Create:", data),
    onUpdateLabel: (id, data) => console.log("Update:", id, data),
    onDeleteLabel: (id) => console.log("Delete:", id),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="dark w-96 p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#1f2937" }],
    },
    docs: {
      description: {
        story: "Label manager in dark mode theme.",
      },
    },
  },
};

export const ManyLabels: Story = {
  args: {
    labels: [
      ...sampleLabels,
      { id: 6, name: "Improvement", color: "#06B6D4", icon: "🔧", is_system: false, created_at: "", updated_at: "" },
      { id: 7, name: "Security", color: "#DC2626", icon: "🔒", is_system: false, created_at: "", updated_at: "" },
      { id: 8, name: "Performance", color: "#059669", icon: "⚡", is_system: false, created_at: "", updated_at: "" },
      { id: 9, name: "Testing", color: "#7C3AED", icon: "🧪", is_system: false, created_at: "", updated_at: "" },
      { id: 10, name: "Design", color: "#EC4899", icon: "🎨", is_system: false, created_at: "", updated_at: "" },
      { id: 11, name: "DevOps", color: "#F59E0B", icon: "🚀", is_system: false, created_at: "", updated_at: "" },
      { id: 12, name: "Backend", color: "#10B981", icon: "🔧", is_system: false, created_at: "", updated_at: "" },
    ] as Label[],
    onCreateLabel: (data) => console.log("Create:", data),
    onUpdateLabel: (id, data) => console.log("Update:", id, data),
    onDeleteLabel: (id) => console.log("Delete:", id),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="w-96">
        <Story />
      </div>
    ),
  ],
  parameters: {
    docs: {
      description: {
        story: "With many labels showing scrolling behavior.",
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    labels: sampleLabels,
    onCreateLabel: (data) => console.log("Create:", data),
    onUpdateLabel: (id, data) => console.log("Update:", id, data),
    onDeleteLabel: (id) => console.log("Delete:", id),
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="w-full p-4">
        <Story />
      </div>
    ),
  ],
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "Label manager on mobile viewport.",
      },
    },
  },
};
