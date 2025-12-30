import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  CollapsibleThread,
  ThreadReply,
} from "@/shared/components/inbox/CollapsibleThread";
import { Avatar, AvatarFallback, AvatarImage } from "@/shared/components/ui/avatar";

// Sample user data
const users = [
  { name: "John Doe", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=john", initials: "JD" },
  { name: "Jane Smith", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=jane", initials: "JS" },
  { name: "Bob Wilson", avatar: "", initials: "BW" },
  { name: "Alice Johnson", avatar: "https://api.dicebear.com/7.x/avataaars/svg?seed=alice", initials: "AJ" },
];

// Message header component for stories
const MessageHeader = ({
  user,
  timestamp,
  subject,
}: {
  user: typeof users[0];
  timestamp: string;
  subject?: string;
}) => (
  <div>
    <div className="flex items-center gap-3">
      <Avatar className="h-10 w-10">
        {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
        <AvatarFallback>{user.initials}</AvatarFallback>
      </Avatar>
      <div>
        <div className="flex items-center gap-2">
          <span className="font-semibold text-sm">{user.name}</span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>
        {subject && <p className="text-sm font-medium mt-0.5">{subject}</p>}
      </div>
    </div>
    <p className="text-sm text-muted-foreground mt-3">
      This is the main message content. It can contain multiple paragraphs, links, and other content.
    </p>
  </div>
);

// Reply component for stories
const Reply = ({
  user,
  content,
  timestamp,
  isLast = false,
}: {
  user: typeof users[0];
  content: string;
  timestamp: string;
  isLast?: boolean;
}) => (
  <ThreadReply isLast={isLast}>
    <div className="flex items-start gap-3">
      <Avatar className="h-8 w-8">
        {user.avatar && <AvatarImage src={user.avatar} alt={user.name} />}
        <AvatarFallback className="text-xs">{user.initials}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{user.name}</span>
          <span className="text-xs text-muted-foreground">{timestamp}</span>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{content}</p>
      </div>
    </div>
  </ThreadReply>
);

const meta: Meta<typeof CollapsibleThread> = {
  title: "Components/CollapsibleThread",
  component: CollapsibleThread,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A collapsible message thread component with expand/collapse toggle, reply count indicator, animated height transition, and thread line visual. Perfect for email threads, comment systems, and messaging interfaces.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    replyCount: {
      control: { type: "number", min: 0 },
      description: "Number of replies in the thread",
    },
    defaultOpen: {
      control: "boolean",
      description: "Whether the thread is initially expanded",
    },
    open: {
      control: "boolean",
      description: "Controlled open state",
    },
    showThreadLine: {
      control: "boolean",
      description: "Whether to show the thread line visual",
    },
    variant: {
      control: { type: "select" },
      options: ["default", "flat", "outlined"],
      description: "Visual variant of the thread container",
    },
    size: {
      control: { type: "select" },
      options: ["sm", "default", "lg"],
      description: "Size variant affecting text and spacing",
    },
    disabled: {
      control: "boolean",
      description: "Whether the thread expand/collapse is disabled",
    },
    onOpenChange: {
      action: "open-change",
      description: "Callback when open state changes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" subject="Project Update" />}
        replyCount={3}
      >
        <Reply user={users[1]} content="Thanks for the update! Looking good." timestamp="1 hour ago" />
        <Reply user={users[2]} content="I have a few questions about the timeline." timestamp="45 mins ago" />
        <Reply user={users[0]} content="Sure, let's discuss in our next meeting." timestamp="30 mins ago" isLast />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Default collapsible thread with replies.",
      },
    },
  },
};

export const NoReplies: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" />}
        replyCount={0}
      >
        {/* No replies */}
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Thread with no replies - the expand button is hidden.",
      },
    },
  },
};

export const SingleReply: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" subject="Quick Question" />}
        replyCount={1}
      >
        <Reply user={users[1]} content="Here's the answer to your question!" timestamp="1 hour ago" isLast />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Thread with a single reply (note: '1 reply' instead of '1 replies').",
      },
    },
  },
};

export const InitiallyExpanded: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" subject="Important Discussion" />}
        replyCount={2}
        defaultOpen
      >
        <Reply user={users[1]} content="I agree with this approach." timestamp="1 hour ago" />
        <Reply user={users[2]} content="Let's proceed with the plan." timestamp="30 mins ago" isLast />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Thread that starts in expanded state.",
      },
    },
  },
};

export const WithoutThreadLine: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" />}
        replyCount={2}
        showThreadLine={false}
        defaultOpen
      >
        <Reply user={users[1]} content="First reply without thread line." timestamp="1 hour ago" showConnector={false} />
        <Reply user={users[2]} content="Second reply without thread line." timestamp="30 mins ago" isLast showConnector={false} />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Thread without the visual thread line.",
      },
    },
  },
};

export const VariantFlat: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        variant="flat"
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" />}
        replyCount={2}
      >
        <Reply user={users[1]} content="Reply in flat variant." timestamp="1 hour ago" />
        <Reply user={users[2]} content="Another reply." timestamp="30 mins ago" isLast />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Flat variant without shadow.",
      },
    },
  },
};

export const VariantOutlined: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        variant="outlined"
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" />}
        replyCount={2}
      >
        <Reply user={users[1]} content="Reply in outlined variant." timestamp="1 hour ago" />
        <Reply user={users[2]} content="Another reply." timestamp="30 mins ago" isLast />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Outlined variant with thicker border.",
      },
    },
  },
};

export const Disabled: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" />}
        replyCount={3}
        disabled
      >
        <Reply user={users[1]} content="Can't expand this thread." timestamp="1 hour ago" isLast />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Disabled thread - cannot be expanded/collapsed.",
      },
    },
  },
};

export const Controlled: Story = {
  render: () => {
    const [open, setOpen] = useState(false);

    return (
      <div className="w-[500px] space-y-4">
        <div className="flex gap-2">
          <button
            onClick={() => setOpen(true)}
            className="px-3 py-1.5 text-sm bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Expand
          </button>
          <button
            onClick={() => setOpen(false)}
            className="px-3 py-1.5 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
          >
            Collapse
          </button>
        </div>
        <CollapsibleThread
          header={<MessageHeader user={users[0]} timestamp="2 hours ago" subject="Controlled Thread" />}
          replyCount={2}
          open={open}
          onOpenChange={setOpen}
        >
          <Reply user={users[1]} content="This thread is externally controlled." timestamp="1 hour ago" />
          <Reply user={users[2]} content="Use the buttons above to control it." timestamp="30 mins ago" isLast />
        </CollapsibleThread>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Controlled thread with external state management.",
      },
    },
  },
};

export const CustomTrigger: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" />}
        replyCount={3}
        triggerContent={<span className="text-blue-600">Show conversation (3)</span>}
      >
        <Reply user={users[1]} content="First reply." timestamp="1 hour ago" />
        <Reply user={users[2]} content="Second reply." timestamp="45 mins ago" />
        <Reply user={users[3]} content="Third reply." timestamp="30 mins ago" isLast />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Thread with custom trigger content.",
      },
    },
  },
};

export const NestedThread: Story = {
  render: () => (
    <div className="w-[600px]">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="3 hours ago" subject="Main Discussion" />}
        replyCount={2}
        defaultOpen
      >
        <ThreadReply>
          <CollapsibleThread
            variant="flat"
            header={
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={users[1].avatar} alt={users[1].name} />
                  <AvatarFallback className="text-xs">{users[1].initials}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm">{users[1].name}</span>
                    <span className="text-xs text-muted-foreground">2 hours ago</span>
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    This is a nested reply with its own thread.
                  </p>
                </div>
              </div>
            }
            replyCount={1}
          >
            <Reply user={users[2]} content="Reply to the nested thread." timestamp="1 hour ago" isLast />
          </CollapsibleThread>
        </ThreadReply>
        <Reply user={users[3]} content="Regular reply after nested thread." timestamp="30 mins ago" isLast />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Nested threads for complex conversation structures.",
      },
    },
  },
};

export const ManyReplies: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="1 day ago" subject="Long Discussion Thread" />}
        replyCount={10}
        defaultOpen
      >
        {Array.from({ length: 10 }, (_, i) => (
          <Reply
            key={i}
            user={users[i % 4]}
            content={`Reply ${i + 1}: This is a sample reply in a long thread.`}
            timestamp={`${10 - i} hours ago`}
            isLast={i === 9}
          />
        ))}
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Thread with many replies.",
      },
    },
  },
};

export const DarkMode: Story = {
  render: () => (
    <div className="w-[500px]">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" subject="Dark Mode Thread" />}
        replyCount={2}
        defaultOpen
      >
        <Reply user={users[1]} content="This looks great in dark mode!" timestamp="1 hour ago" />
        <Reply user={users[2]} content="Agreed, very nice." timestamp="30 mins ago" isLast />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#1f2937" }],
    },
    docs: {
      description: {
        story: "Collapsible thread in dark mode theme.",
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
    <div className="w-full p-4">
      <CollapsibleThread
        header={<MessageHeader user={users[0]} timestamp="2 hours ago" subject="Mobile View" />}
        replyCount={2}
        size="sm"
      >
        <Reply user={users[1]} content="This works well on mobile!" timestamp="1 hour ago" />
        <Reply user={users[2]} content="Responsive design." timestamp="30 mins ago" isLast />
      </CollapsibleThread>
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "Collapsible thread on mobile viewport.",
      },
    },
  },
};
