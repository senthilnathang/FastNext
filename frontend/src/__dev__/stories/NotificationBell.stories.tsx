import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  NotificationBell,
  type Notification,
} from "@/shared/components/notifications/NotificationBell";

// Mock function helper
const fn = () => () => {};

// Sample notifications data
const now = new Date();

const sampleNotifications: Notification[] = [
  {
    id: "1",
    title: "New message from John",
    message: "Hey, I wanted to discuss the project timeline with you. When are you available?",
    type: "info",
    isRead: false,
    createdAt: new Date(now.getTime() - 5 * 60 * 1000), // 5 minutes ago
    actionUrl: "/messages/123",
  },
  {
    id: "2",
    title: "Build successful",
    message: "Your deployment to production completed successfully.",
    type: "success",
    isRead: false,
    createdAt: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
  },
  {
    id: "3",
    title: "Warning: Storage limit",
    message: "You are approaching your storage quota. Consider upgrading your plan.",
    type: "warning",
    isRead: false,
    createdAt: new Date(now.getTime() - 2 * 60 * 60 * 1000), // 2 hours ago
    actionUrl: "/settings/billing",
  },
  {
    id: "4",
    title: "Payment failed",
    message: "Your last payment attempt was unsuccessful. Please update your payment method.",
    type: "error",
    isRead: true,
    createdAt: new Date(now.getTime() - 24 * 60 * 60 * 1000), // 1 day ago
    actionUrl: "/settings/payment",
  },
  {
    id: "5",
    title: "System maintenance",
    message: "Scheduled maintenance will occur this weekend from 2 AM to 6 AM UTC.",
    type: "system",
    isRead: true,
    createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
  },
];

const manyNotifications: Notification[] = Array.from({ length: 12 }, (_, i) => ({
  id: String(i + 1),
  title: `Notification ${i + 1}`,
  message: `This is the message for notification ${i + 1}. It contains some details about what happened.`,
  type: (["info", "success", "warning", "error", "system"] as const)[i % 5],
  isRead: i > 3,
  createdAt: new Date(now.getTime() - i * 60 * 60 * 1000),
}));

const meta: Meta<typeof NotificationBell> = {
  title: "Components/NotificationBell",
  component: NotificationBell,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A notification bell component that displays notifications in a popover. Supports different notification types, mark as read, delete, and navigation to notification center.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    notifications: {
      description: "Array of notification objects",
    },
    unreadCount: {
      control: { type: "number", min: 0 },
      description: "Override the unread count badge",
    },
    maxDisplayed: {
      control: { type: "number", min: 1, max: 20 },
      description: "Maximum number of notifications to display",
    },
    isLoading: {
      control: "boolean",
      description: "Show loading state",
    },
    onMarkAsRead: {
      action: "mark-as-read",
      description: "Callback when a notification is marked as read",
    },
    onMarkAllAsRead: {
      action: "mark-all-read",
      description: "Callback when mark all as read is clicked",
    },
    onDelete: {
      action: "delete",
      description: "Callback when a notification is deleted",
    },
    onNotificationClick: {
      action: "notification-click",
      description: "Callback when a notification is clicked",
    },
    onViewAll: {
      action: "view-all",
      description: "Callback when view all is clicked",
    },
    onSettingsClick: {
      action: "settings-click",
      description: "Callback when settings button is clicked",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    notifications: sampleNotifications,
    maxDisplayed: 5,
    onMarkAsRead: fn(),
    onMarkAllAsRead: fn(),
    onDelete: fn(),
    onSettingsClick: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: "Default notification bell with various notification types.",
      },
    },
  },
};

export const Empty: Story = {
  args: {
    notifications: [],
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state when there are no notifications.",
      },
    },
  },
};

export const AllUnread: Story = {
  args: {
    notifications: sampleNotifications.map((n) => ({ ...n, isRead: false })),
    onMarkAsRead: fn(),
    onMarkAllAsRead: fn(),
    onDelete: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: "All notifications are unread, showing the full badge count.",
      },
    },
  },
};

export const AllRead: Story = {
  args: {
    notifications: sampleNotifications.map((n) => ({ ...n, isRead: true })),
    onMarkAsRead: fn(),
    onDelete: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: "All notifications are read, no badge is shown.",
      },
    },
  },
};

export const ManyNotifications: Story = {
  args: {
    notifications: manyNotifications,
    maxDisplayed: 5,
    onMarkAsRead: fn(),
    onMarkAllAsRead: fn(),
    onDelete: fn(),
    onSettingsClick: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: "With many notifications, only the first few are shown with a view all link.",
      },
    },
  },
};

export const Loading: Story = {
  args: {
    notifications: [],
    isLoading: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Loading state while fetching notifications.",
      },
    },
  },
};

export const HighUnreadCount: Story = {
  args: {
    notifications: manyNotifications,
    unreadCount: 150,
    onMarkAsRead: fn(),
    onMarkAllAsRead: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: "When unread count exceeds 99, it shows 99+.",
      },
    },
  },
};

export const WithSettings: Story = {
  args: {
    notifications: sampleNotifications,
    onMarkAsRead: fn(),
    onDelete: fn(),
    onSettingsClick: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: "With settings button enabled for notification preferences.",
      },
    },
  },
};

export const TypeVariants: Story = {
  args: {
    notifications: [
      {
        id: "1",
        title: "Info notification",
        message: "This is an informational message.",
        type: "info",
        isRead: false,
        createdAt: now,
      },
      {
        id: "2",
        title: "Success notification",
        message: "Operation completed successfully!",
        type: "success",
        isRead: false,
        createdAt: now,
      },
      {
        id: "3",
        title: "Warning notification",
        message: "Please review this before proceeding.",
        type: "warning",
        isRead: false,
        createdAt: now,
      },
      {
        id: "4",
        title: "Error notification",
        message: "Something went wrong. Please try again.",
        type: "error",
        isRead: false,
        createdAt: now,
      },
      {
        id: "5",
        title: "System notification",
        message: "System update available.",
        type: "system",
        isRead: false,
        createdAt: now,
      },
    ],
    onMarkAsRead: fn(),
    onDelete: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: "Showcase of all notification type variants.",
      },
    },
  },
};

export const DarkMode: Story = {
  args: {
    notifications: sampleNotifications,
    onMarkAsRead: fn(),
    onMarkAllAsRead: fn(),
    onDelete: fn(),
    onSettingsClick: fn(),
  },
  parameters: {
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#1f2937" }],
    },
    docs: {
      description: {
        story: "Notification bell in dark mode theme.",
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

export const Interactive: Story = {
  render: () => {
    const [notifications, setNotifications] = useState(sampleNotifications);

    const handleMarkAsRead = (id: string | number) => {
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
    };

    const handleMarkAllAsRead = () => {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
    };

    const handleDelete = (id: string | number) => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    };

    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <NotificationBell
          notifications={notifications}
          onMarkAsRead={handleMarkAsRead}
          onMarkAllAsRead={handleMarkAllAsRead}
          onDelete={handleDelete}
          onNotificationClick={(n) => console.log("Clicked:", n)}
          onSettingsClick={() => alert("Settings clicked!")}
        />
        <p className="text-sm text-gray-500 mt-4">
          Click the bell icon to interact with notifications
        </p>
        <button
          onClick={() => setNotifications(sampleNotifications)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reset notifications
        </button>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Interactive example with working mark as read and delete functionality.",
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    notifications: sampleNotifications,
    onMarkAsRead: fn(),
    onMarkAllAsRead: fn(),
    onDelete: fn(),
    onSettingsClick: fn(),
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "Notification bell on mobile viewport.",
      },
    },
  },
};
