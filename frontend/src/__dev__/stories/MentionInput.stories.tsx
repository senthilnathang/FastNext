import type { Meta, StoryObj } from "@storybook/react";
import { useState, useRef } from "react";
import MentionInput, { type MentionInputRef } from "@/components/messaging/MentionInput";
import { Button } from "@/shared/components/ui/button";

// Sample users data
const sampleUsers = [
  { id: 1, username: "johndoe", full_name: "John Doe", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=john" },
  { id: 2, username: "janesmith", full_name: "Jane Smith", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane" },
  { id: 3, username: "bobwilson", full_name: "Bob Wilson" },
  { id: 4, username: "alicejohnson", full_name: "Alice Johnson", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice" },
  { id: 5, username: "charlielee", full_name: "Charlie Lee" },
  { id: 6, username: "dianamartinez", full_name: "Diana Martinez", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=diana" },
  { id: 7, username: "evanbrown", full_name: "Evan Brown" },
  { id: 8, username: "fionaclark", full_name: "Fiona Clark", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=fiona" },
  { id: 9, username: "georgewhite", full_name: "George White" },
  { id: 10, username: "hannahgreen", full_name: "Hannah Green", avatar_url: "https://api.dicebear.com/7.x/avataaars/svg?seed=hannah" },
];

const meta: Meta<typeof MentionInput> = {
  title: "Components/MentionInput",
  component: MentionInput,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A text input component with @mention functionality. Type @ to trigger the user mention dropdown with autocomplete and keyboard navigation support.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    value: {
      control: "text",
      description: "Current input value",
    },
    users: {
      description: "List of users available for mentioning",
    },
    placeholder: {
      control: "text",
      description: "Placeholder text for the input",
    },
    disabled: {
      control: "boolean",
      description: "Whether the input is disabled",
    },
    maxLength: {
      control: { type: "number", min: 0 },
      description: "Maximum character length",
    },
    rows: {
      control: { type: "number", min: 1, max: 10 },
      description: "Number of rows for the textarea",
    },
    onChange: {
      action: "changed",
      description: "Callback when value changes, includes mentions array",
    },
    onKeyDown: {
      action: "key-down",
      description: "Callback for key down events",
    },
    className: {
      control: "text",
      description: "Additional CSS classes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for controlled state
const MentionInputWrapper = (props: Omit<React.ComponentProps<typeof MentionInput>, 'value' | 'onChange'> & { initialValue?: string }) => {
  const { initialValue = "", ...rest } = props;
  const [value, setValue] = useState(initialValue);
  const [mentions, setMentions] = useState<number[]>([]);

  return (
    <div className="w-80">
      <MentionInput
        {...rest}
        value={value}
        onChange={(newValue, newMentions) => {
          setValue(newValue);
          setMentions(newMentions);
        }}
      />
      {mentions.length > 0 && (
        <div className="mt-2 text-xs text-gray-500">
          Mentioned user IDs: {mentions.join(", ")}
        </div>
      )}
    </div>
  );
};

export const Default: Story = {
  render: () => <MentionInputWrapper users={sampleUsers} />,
  parameters: {
    docs: {
      description: {
        story: "Default mention input. Type @ to see the user suggestions dropdown.",
      },
    },
  },
};

export const WithPlaceholder: Story = {
  render: () => (
    <MentionInputWrapper
      users={sampleUsers}
      placeholder="Share your thoughts... (use @ to mention someone)"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Custom placeholder text.",
      },
    },
  },
};

export const SingleRow: Story = {
  render: () => (
    <MentionInputWrapper
      users={sampleUsers}
      rows={1}
      placeholder="Quick message..."
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Single row variant for inline messages.",
      },
    },
  },
};

export const MultipleRows: Story = {
  render: () => (
    <MentionInputWrapper
      users={sampleUsers}
      rows={6}
      placeholder="Write a detailed message..."
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Multiple rows for longer content.",
      },
    },
  },
};

export const WithMaxLength: Story = {
  render: () => (
    <MentionInputWrapper
      users={sampleUsers}
      maxLength={280}
      placeholder="Limited to 280 characters (like Twitter)..."
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "With maximum character limit.",
      },
    },
  },
};

export const Disabled: Story = {
  render: () => (
    <MentionInputWrapper
      users={sampleUsers}
      disabled
      initialValue="This input is disabled"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Disabled state prevents user interaction.",
      },
    },
  },
};

export const PrefilledWithMention: Story = {
  render: () => (
    <MentionInputWrapper
      users={sampleUsers}
      initialValue="Hey @johndoe, can you review this?"
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Pre-filled with an existing mention.",
      },
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const [value, setValue] = useState("");
    const [mentions, setMentions] = useState<number[]>([]);
    const [messages, setMessages] = useState<Array<{ text: string; mentions: number[] }>>([]);
    const inputRef = useRef<MentionInputRef>(null);

    const handleSubmit = () => {
      if (value.trim()) {
        setMessages((prev) => [...prev, { text: value, mentions }]);
        setValue("");
        setMentions([]);
      }
    };

    return (
      <div className="w-96 p-4 border rounded-lg bg-white dark:bg-gray-900">
        <div className="space-y-4">
          {/* Messages list */}
          <div className="space-y-2 min-h-24 max-h-48 overflow-y-auto">
            {messages.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4">
                No messages yet. Type a message below!
              </p>
            ) : (
              messages.map((msg, i) => (
                <div key={i} className="p-2 bg-gray-100 dark:bg-gray-800 rounded text-sm">
                  <p>{msg.text}</p>
                  {msg.mentions.length > 0 && (
                    <p className="text-xs text-gray-500 mt-1">
                      Mentioned: {msg.mentions.map((id) =>
                        sampleUsers.find((u) => u.id === id)?.full_name
                      ).join(", ")}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Input area */}
          <div className="space-y-2">
            <MentionInput
              ref={inputRef}
              value={value}
              onChange={(newValue, newMentions) => {
                setValue(newValue);
                setMentions(newMentions);
              }}
              users={sampleUsers}
              placeholder="Type a message..."
              rows={2}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSubmit();
                }
              }}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-500">
                Press Enter to send, Shift+Enter for new line
              </span>
              <Button size="sm" onClick={handleSubmit}>
                Send
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Interactive chat-like example with message submission.",
      },
    },
  },
};

export const WithRefMethods: Story = {
  render: () => {
    const [value, setValue] = useState("");
    const [mentions, setMentions] = useState<number[]>([]);
    const inputRef = useRef<MentionInputRef>(null);

    return (
      <div className="w-80 space-y-4">
        <MentionInput
          ref={inputRef}
          value={value}
          onChange={(newValue, newMentions) => {
            setValue(newValue);
            setMentions(newMentions);
          }}
          users={sampleUsers}
          placeholder="Type a message..."
        />
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.focus()}>
            Focus
          </Button>
          <Button size="sm" variant="outline" onClick={() => inputRef.current?.blur()}>
            Blur
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => inputRef.current?.insertMention(sampleUsers[0])}
          >
            Insert @johndoe
          </Button>
        </div>
        <p className="text-xs text-gray-500">
          Use ref methods to control the input programmatically
        </p>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Demonstrating ref methods: focus(), blur(), and insertMention().",
      },
    },
  },
};

export const DarkMode: Story = {
  render: () => <MentionInputWrapper users={sampleUsers} />,
  parameters: {
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#1f2937" }],
    },
    docs: {
      description: {
        story: "Mention input in dark mode theme.",
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

export const InCommentForm: Story = {
  render: () => {
    const [value, setValue] = useState("");
    const [mentions, setMentions] = useState<number[]>([]);

    return (
      <div className="w-96 p-4 border rounded-lg bg-white dark:bg-gray-900">
        <h3 className="font-semibold mb-3">Add a comment</h3>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center">
            <span className="text-xs font-medium">You</span>
          </div>
          <div className="flex-1 space-y-2">
            <MentionInput
              value={value}
              onChange={(newValue, newMentions) => {
                setValue(newValue);
                setMentions(newMentions);
              }}
              users={sampleUsers}
              placeholder="Write a comment..."
              rows={2}
            />
            <div className="flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setValue("")}>
                Cancel
              </Button>
              <Button size="sm" disabled={!value.trim()}>
                Comment
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Mention input integrated in a comment form UI.",
      },
    },
  },
};

export const MobileView: Story = {
  render: () => <MentionInputWrapper users={sampleUsers} />,
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "Mention input on mobile viewport.",
      },
    },
  },
};
