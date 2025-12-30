import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import MessageReactions from "@/components/messaging/MessageReactions";
import type { MessageReaction } from "@/lib/api/messages";

// Sample users for reactions
const users = [
  { id: 1, full_name: "John Doe" },
  { id: 2, full_name: "Jane Smith" },
  { id: 3, full_name: "Bob Wilson" },
  { id: 4, full_name: "Alice Johnson" },
  { id: 5, full_name: "Charlie Lee" },
];

// Helper to create reaction
const createReaction = (emoji: string, userId: number): MessageReaction => ({
  id: Math.random(),
  message_id: 1,
  user_id: userId,
  emoji,
  created_at: new Date().toISOString(),
  user: users.find((u) => u.id === userId),
});

// Sample reactions data
const sampleReactions: MessageReaction[] = [
  createReaction("👍", 1),
  createReaction("👍", 2),
  createReaction("👍", 3),
  createReaction("❤️", 1),
  createReaction("❤️", 2),
  createReaction("😄", 4),
  createReaction("🎉", 5),
];

const manyReactions: MessageReaction[] = [
  ...sampleReactions,
  createReaction("🚀", 1),
  createReaction("🚀", 2),
  createReaction("🚀", 3),
  createReaction("🚀", 4),
  createReaction("👀", 1),
  createReaction("👀", 2),
  createReaction("🔥", 3),
  createReaction("🔥", 4),
  createReaction("🔥", 5),
  createReaction("💯", 1),
];

const meta: Meta<typeof MessageReactions> = {
  title: "Components/ReactionBar",
  component: MessageReactions,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A reaction bar component for displaying and managing message reactions. Shows grouped reactions with counts, allows adding/removing reactions, and displays who reacted on hover.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    reactions: {
      description: "Array of reaction objects",
    },
    currentUserId: {
      control: { type: "number" },
      description: "ID of the current user (to highlight own reactions)",
    },
    disabled: {
      control: "boolean",
      description: "Whether reactions are disabled",
    },
    onAdd: {
      action: "add-reaction",
      description: "Callback when a reaction is added",
    },
    onRemove: {
      action: "remove-reaction",
      description: "Callback when a reaction is removed",
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
    reactions: sampleReactions,
    currentUserId: 1,
    onAdd: (emoji) => console.log("Add:", emoji),
    onRemove: (emoji) => console.log("Remove:", emoji),
  },
  parameters: {
    docs: {
      description: {
        story: "Default reaction bar with multiple grouped reactions.",
      },
    },
  },
};

export const Empty: Story = {
  args: {
    reactions: [],
    currentUserId: 1,
    onAdd: (emoji) => console.log("Add:", emoji),
  },
  parameters: {
    docs: {
      description: {
        story: "Empty state with only add reaction button.",
      },
    },
  },
};

export const SingleReaction: Story = {
  args: {
    reactions: [createReaction("👍", 2)],
    currentUserId: 1,
    onAdd: (emoji) => console.log("Add:", emoji),
    onRemove: (emoji) => console.log("Remove:", emoji),
  },
  parameters: {
    docs: {
      description: {
        story: "Single reaction from another user.",
      },
    },
  },
};

export const OwnReaction: Story = {
  args: {
    reactions: [createReaction("👍", 1)],
    currentUserId: 1,
    onAdd: (emoji) => console.log("Add:", emoji),
    onRemove: (emoji) => console.log("Remove:", emoji),
  },
  parameters: {
    docs: {
      description: {
        story: "Reaction from the current user (highlighted).",
      },
    },
  },
};

export const ManyReactions: Story = {
  args: {
    reactions: manyReactions,
    currentUserId: 1,
    onAdd: (emoji) => console.log("Add:", emoji),
    onRemove: (emoji) => console.log("Remove:", emoji),
  },
  parameters: {
    docs: {
      description: {
        story: "Many different reactions showing wrapping behavior.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    reactions: sampleReactions,
    currentUserId: 1,
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Disabled state - reactions visible but not interactive.",
      },
    },
  },
};

export const ReadOnly: Story = {
  args: {
    reactions: sampleReactions,
    currentUserId: 1,
    // No onAdd or onRemove - makes it read-only
  },
  parameters: {
    docs: {
      description: {
        story: "Read-only mode - no add button, no click handlers.",
      },
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const [reactions, setReactions] = useState<MessageReaction[]>(sampleReactions);
    const currentUserId = 1;

    const handleAdd = (emoji: string) => {
      // Check if user already reacted with this emoji
      const existing = reactions.find(
        (r) => r.emoji === emoji && r.user_id === currentUserId
      );
      if (existing) return;

      const newReaction = createReaction(emoji, currentUserId);
      setReactions((prev) => [...prev, newReaction]);
    };

    const handleRemove = (emoji: string) => {
      setReactions((prev) =>
        prev.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId))
      );
    };

    return (
      <div className="p-4 space-y-4">
        <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-3">
            This is a sample message with reactions. Click to add or remove your reactions!
          </p>
          <MessageReactions
            reactions={reactions}
            currentUserId={currentUserId}
            onAdd={handleAdd}
            onRemove={handleRemove}
          />
        </div>
        <p className="text-xs text-gray-500">
          Hover over reactions to see who reacted
        </p>
        <button
          onClick={() => setReactions(sampleReactions)}
          className="text-sm text-blue-600 hover:text-blue-800"
        >
          Reset reactions
        </button>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Interactive example with working add/remove functionality.",
      },
    },
  },
};

export const InMessageCard: Story = {
  render: () => {
    const [reactions, setReactions] = useState<MessageReaction[]>(sampleReactions);
    const currentUserId = 1;

    const handleAdd = (emoji: string) => {
      const existing = reactions.find(
        (r) => r.emoji === emoji && r.user_id === currentUserId
      );
      if (existing) return;
      setReactions((prev) => [...prev, createReaction(emoji, currentUserId)]);
    };

    const handleRemove = (emoji: string) => {
      setReactions((prev) =>
        prev.filter((r) => !(r.emoji === emoji && r.user_id === currentUserId))
      );
    };

    return (
      <div className="w-96 p-4 border rounded-lg bg-white dark:bg-gray-900 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <span className="text-sm font-medium text-blue-700">JD</span>
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="font-medium text-sm">John Doe</span>
              <span className="text-xs text-gray-500">2 hours ago</span>
            </div>
            <p className="text-sm text-gray-700 dark:text-gray-300 mt-1">
              Just shipped the new feature! Thanks everyone for the great collaboration on this project.
            </p>
            <div className="mt-3">
              <MessageReactions
                reactions={reactions}
                currentUserId={currentUserId}
                onAdd={handleAdd}
                onRemove={handleRemove}
              />
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Reaction bar integrated in a message card UI.",
      },
    },
  },
};

export const DarkMode: Story = {
  args: {
    reactions: sampleReactions,
    currentUserId: 1,
    onAdd: (emoji) => console.log("Add:", emoji),
    onRemove: (emoji) => console.log("Remove:", emoji),
  },
  parameters: {
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#1f2937" }],
    },
    docs: {
      description: {
        story: "Reaction bar in dark mode theme.",
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

export const HighCounts: Story = {
  args: {
    reactions: [
      ...Array.from({ length: 99 }, (_, i) => createReaction("👍", (i % 5) + 1)),
      ...Array.from({ length: 50 }, (_, i) => createReaction("❤️", (i % 5) + 1)),
    ],
    currentUserId: 1,
    onAdd: (emoji) => console.log("Add:", emoji),
    onRemove: (emoji) => console.log("Remove:", emoji),
  },
  parameters: {
    docs: {
      description: {
        story: "Reactions with high counts.",
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    reactions: sampleReactions,
    currentUserId: 1,
    onAdd: (emoji) => console.log("Add:", emoji),
    onRemove: (emoji) => console.log("Remove:", emoji),
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "Reaction bar on mobile viewport.",
      },
    },
  },
};
