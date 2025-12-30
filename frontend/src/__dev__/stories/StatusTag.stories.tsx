import type { Meta, StoryObj } from "@storybook/react";
import { Badge, type BadgeProps } from "@/shared/components/ui/badge";
import { STATUS_VARIANTS, LABEL_COLORS, type StatusVariant } from "@/shared/constants/theme";

// Create a StatusTag wrapper component that uses the Badge
interface StatusTagProps {
  status: StatusVariant;
  size?: "sm" | "default" | "lg";
  className?: string;
}

const statusColorMap: Record<string, BadgeProps["variant"]> = {
  green: "success",
  yellow: "warning",
  red: "destructive",
  blue: "default",
  gray: "secondary",
};

const StatusTag = ({ status, size = "default", className = "" }: StatusTagProps) => {
  const statusConfig = STATUS_VARIANTS[status];
  const variant = statusColorMap[statusConfig.color] || "secondary";

  const sizeClasses = {
    sm: "text-xs px-2 py-0.5",
    default: "text-xs px-2.5 py-0.5",
    lg: "text-sm px-3 py-1",
  };

  return (
    <Badge variant={variant} className={`${sizeClasses[size]} ${className}`}>
      {statusConfig.label}
    </Badge>
  );
};

// Color-based label component
interface ColorLabelProps {
  color: typeof LABEL_COLORS[number]["name"];
  children: React.ReactNode;
  className?: string;
}

const ColorLabel = ({ color, children, className = "" }: ColorLabelProps) => {
  const colorConfig = LABEL_COLORS.find((c) => c.name === color) || LABEL_COLORS[0];

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${className}`}
      style={{
        backgroundColor: colorConfig.bg,
        color: colorConfig.text,
        borderWidth: 1,
        borderColor: colorConfig.border,
      }}
    >
      {children}
    </span>
  );
};

const meta: Meta<typeof StatusTag> = {
  title: "Components/StatusTag",
  component: StatusTag,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "Status tag components for displaying various states like active, pending, completed, etc. Built on the Badge component with predefined status variants from the theme.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    status: {
      control: { type: "select" },
      options: Object.keys(STATUS_VARIANTS),
      description: "Status variant to display",
    },
    size: {
      control: { type: "select" },
      options: ["sm", "default", "lg"],
      description: "Size of the status tag",
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
    status: "active",
    size: "default",
  },
  parameters: {
    docs: {
      description: {
        story: "Default active status tag.",
      },
    },
  },
};

export const AllStatuses: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(STATUS_VARIANTS) as StatusVariant[]).map((status) => (
        <StatusTag key={status} status={status} />
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All available status variants.",
      },
    },
  },
};

export const SuccessStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusTag status="active" />
      <StatusTag status="approved" />
      <StatusTag status="completed" />
      <StatusTag status="published" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Success/positive status states (green).",
      },
    },
  },
};

export const WarningStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusTag status="pending" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Warning/attention status states (yellow).",
      },
    },
  },
};

export const ErrorStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusTag status="rejected" />
      <StatusTag status="failed" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Error/negative status states (red).",
      },
    },
  },
};

export const NeutralStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusTag status="inactive" />
      <StatusTag status="draft" />
      <StatusTag status="archived" />
      <StatusTag status="cancelled" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Neutral status states (gray).",
      },
    },
  },
};

export const InfoStates: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <StatusTag status="processing" />
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Informational status states (blue).",
      },
    },
  },
};

export const AllSizes: Story = {
  render: () => (
    <div className="flex items-center gap-4">
      <div className="text-center">
        <StatusTag status="active" size="sm" />
        <p className="text-xs text-gray-500 mt-1">Small</p>
      </div>
      <div className="text-center">
        <StatusTag status="active" size="default" />
        <p className="text-xs text-gray-500 mt-1">Default</p>
      </div>
      <div className="text-center">
        <StatusTag status="active" size="lg" />
        <p className="text-xs text-gray-500 mt-1">Large</p>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All available size variants.",
      },
    },
  },
};

export const ColorLabels: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {LABEL_COLORS.map((color) => (
        <ColorLabel key={color.name} color={color.name}>
          {color.name.charAt(0).toUpperCase() + color.name.slice(1)}
        </ColorLabel>
      ))}
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "All available label colors from the theme.",
      },
    },
  },
};

export const InTable: Story = {
  render: () => (
    <div className="w-full max-w-lg">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b">
            <th className="text-left py-2 px-3 text-sm font-medium">Name</th>
            <th className="text-left py-2 px-3 text-sm font-medium">Status</th>
            <th className="text-left py-2 px-3 text-sm font-medium">Date</th>
          </tr>
        </thead>
        <tbody>
          <tr className="border-b">
            <td className="py-2 px-3 text-sm">Project Alpha</td>
            <td className="py-2 px-3"><StatusTag status="active" size="sm" /></td>
            <td className="py-2 px-3 text-sm text-gray-500">Jan 15, 2024</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-3 text-sm">Project Beta</td>
            <td className="py-2 px-3"><StatusTag status="pending" size="sm" /></td>
            <td className="py-2 px-3 text-sm text-gray-500">Jan 20, 2024</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-3 text-sm">Project Gamma</td>
            <td className="py-2 px-3"><StatusTag status="completed" size="sm" /></td>
            <td className="py-2 px-3 text-sm text-gray-500">Jan 10, 2024</td>
          </tr>
          <tr className="border-b">
            <td className="py-2 px-3 text-sm">Project Delta</td>
            <td className="py-2 px-3"><StatusTag status="failed" size="sm" /></td>
            <td className="py-2 px-3 text-sm text-gray-500">Jan 18, 2024</td>
          </tr>
          <tr>
            <td className="py-2 px-3 text-sm">Project Epsilon</td>
            <td className="py-2 px-3"><StatusTag status="draft" size="sm" /></td>
            <td className="py-2 px-3 text-sm text-gray-500">Jan 22, 2024</td>
          </tr>
        </tbody>
      </table>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status tags used in a data table.",
      },
    },
  },
};

export const InCard: Story = {
  render: () => (
    <div className="w-80 p-4 border rounded-lg bg-white dark:bg-gray-900">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold">Task: Update Documentation</h3>
        <StatusTag status="processing" size="sm" />
      </div>
      <p className="text-sm text-gray-500 mb-4">
        Review and update the API documentation for v2.0 release.
      </p>
      <div className="flex items-center gap-2">
        <span className="text-xs text-gray-400">Assigned to:</span>
        <span className="text-xs font-medium">John Doe</span>
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status tag used in a card header.",
      },
    },
  },
};

export const WithIcons: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Badge variant="success" className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
        </svg>
        Verified
      </Badge>
      <Badge variant="warning" className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
        Warning
      </Badge>
      <Badge variant="destructive" className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        Error
      </Badge>
      <Badge variant="secondary" className="flex items-center gap-1">
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
        </svg>
        Pending
      </Badge>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Status tags with icons for additional visual context.",
      },
    },
  },
};

export const DarkMode: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(STATUS_VARIANTS) as StatusVariant[]).map((status) => (
        <StatusTag key={status} status={status} />
      ))}
    </div>
  ),
  parameters: {
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#1f2937" }],
    },
    docs: {
      description: {
        story: "Status tags in dark mode theme.",
      },
    },
  },
  decorators: [
    (Story: React.ComponentType) => (
      <div className="dark p-4">
        <Story />
      </div>
    ),
  ],
};

export const MobileView: Story = {
  render: () => (
    <div className="flex flex-wrap gap-2">
      {(Object.keys(STATUS_VARIANTS) as StatusVariant[]).slice(0, 6).map((status) => (
        <StatusTag key={status} status={status} size="sm" />
      ))}
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "Status tags on mobile viewport.",
      },
    },
  },
};
