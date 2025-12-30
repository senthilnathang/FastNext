import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import { Smile, MessageSquare } from "lucide-react";
import { EmojiPicker } from "@/shared/components/communication/EmojiPicker";
import { Button } from "@/shared/components/ui/button";

const meta: Meta<typeof EmojiPicker> = {
  title: "Components/EmojiPicker",
  component: EmojiPicker,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A comprehensive emoji picker component with categories, search, recent emojis, and keyboard navigation. Stores recent emojis in localStorage.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    onEmojiSelect: {
      action: "emoji-selected",
      description: "Callback when an emoji is selected",
    },
    disabled: {
      control: "boolean",
      description: "Whether the picker trigger is disabled",
    },
    open: {
      control: "boolean",
      description: "Controlled open state",
    },
    onOpenChange: {
      action: "open-change",
      description: "Callback when open state changes",
    },
    trigger: {
      description: "Custom trigger element",
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
    onEmojiSelect: (emoji) => console.log("Selected:", emoji),
  },
  parameters: {
    docs: {
      description: {
        story: "Default emoji picker with standard trigger button.",
      },
    },
  },
};

export const WithCustomTrigger: Story = {
  args: {
    onEmojiSelect: (emoji) => console.log("Selected:", emoji),
    trigger: (
      <Button variant="outline" size="sm">
        <Smile className="h-4 w-4 mr-2" />
        Add Reaction
      </Button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Emoji picker with a custom trigger button.",
      },
    },
  },
};

export const IconOnlyTrigger: Story = {
  args: {
    onEmojiSelect: (emoji) => console.log("Selected:", emoji),
    trigger: (
      <button
        type="button"
        className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
      >
        <MessageSquare className="h-5 w-5" />
      </button>
    ),
  },
  parameters: {
    docs: {
      description: {
        story: "Emoji picker with an icon-only trigger.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    onEmojiSelect: (emoji) => console.log("Selected:", emoji),
    disabled: true,
  },
  parameters: {
    docs: {
      description: {
        story: "Disabled state prevents opening the picker.",
      },
    },
  },
};

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false);
    const [selectedEmoji, setSelectedEmoji] = useState<string>("");

    return (
      <div className="flex flex-col items-center gap-4">
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setOpen(true)}>
            Open Picker
          </Button>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Close Picker
          </Button>
        </div>
        <EmojiPicker
          open={open}
          onOpenChange={setOpen}
          onEmojiSelect={(emoji) => {
            setSelectedEmoji(emoji);
            setOpen(false);
          }}
        />
        {selectedEmoji && (
          <p className="text-lg">
            Selected: <span className="text-3xl">{selectedEmoji}</span>
          </p>
        )}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Controlled emoji picker with external open state management.",
      },
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const [emojis, setEmojis] = useState<string[]>([]);

    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <EmojiPicker onEmojiSelect={(emoji) => setEmojis((prev) => [...prev, emoji])} />
        <div className="mt-4">
          <p className="text-sm text-gray-500 mb-2">Selected emojis:</p>
          <div className="flex flex-wrap gap-2 min-h-10 p-3 bg-gray-100 dark:bg-gray-800 rounded-lg min-w-48">
            {emojis.length === 0 ? (
              <span className="text-gray-400 text-sm">Click the button to select emojis</span>
            ) : (
              emojis.map((emoji, i) => (
                <span key={i} className="text-2xl">
                  {emoji}
                </span>
              ))
            )}
          </div>
          {emojis.length > 0 && (
            <button
              onClick={() => setEmojis([])}
              className="mt-2 text-sm text-blue-600 hover:text-blue-800"
            >
              Clear all
            </button>
          )}
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Interactive example showing multiple emoji selections.",
      },
    },
  },
};

export const WithMessageInput: Story = {
  render: () => {
    const [message, setMessage] = useState("");

    return (
      <div className="w-80 p-4 border rounded-lg bg-white dark:bg-gray-900">
        <div className="relative">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type a message..."
            className="w-full p-3 pr-12 border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows={3}
          />
          <div className="absolute right-2 bottom-2">
            <EmojiPicker
              onEmojiSelect={(emoji) => setMessage((prev) => prev + emoji)}
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-gray-500">
          Click the emoji button to add emojis to your message
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Emoji picker integrated with a message input field.",
      },
    },
  },
};

export const DarkMode: Story = {
  args: {
    onEmojiSelect: (emoji) => console.log("Selected:", emoji),
  },
  parameters: {
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#1f2937" }],
    },
    docs: {
      description: {
        story: "Emoji picker in dark mode theme.",
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

export const InToolbar: Story = {
  render: () => {
    const [message, setMessage] = useState("");

    return (
      <div className="w-96">
        <div className="p-3 border rounded-lg bg-white dark:bg-gray-900">
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Write something..."
            className="w-full p-2 border-0 resize-none focus:outline-none"
            rows={2}
          />
          <div className="flex items-center gap-2 pt-2 border-t mt-2">
            <EmojiPicker
              onEmojiSelect={(emoji) => setMessage((prev) => prev + emoji)}
              trigger={
                <button
                  type="button"
                  className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
                  title="Add emoji"
                >
                  <Smile className="h-5 w-5" />
                </button>
              }
            />
            <button
              type="button"
              className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded transition-colors"
              title="Attach file"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
              </svg>
            </button>
            <div className="flex-1" />
            <Button size="sm">Send</Button>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Emoji picker as part of a message composer toolbar.",
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    onEmojiSelect: (emoji) => console.log("Selected:", emoji),
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "Emoji picker on mobile viewport.",
      },
    },
  },
};
