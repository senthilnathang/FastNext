import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  CompanySwitcher,
  type Company,
} from "@/shared/components/company/CompanySwitcher";

// Mock function helper
const fn = () => () => {};

// Sample companies data
const sampleCompanies: Company[] = [
  {
    id: "1",
    name: "Acme Corporation",
    slug: "acme-corp",
    description: "Leading technology solutions provider",
    isDefault: true,
  },
  {
    id: "2",
    name: "TechStart Inc",
    slug: "techstart",
    logo: "https://api.dicebear.com/7.x/identicon/svg?seed=techstart",
    description: "Innovative startup accelerator",
  },
  {
    id: "3",
    name: "Global Dynamics",
    slug: "global-dynamics",
    logo: "https://api.dicebear.com/7.x/identicon/svg?seed=global",
    description: "Enterprise solutions",
  },
  {
    id: "4",
    name: "Creative Studios",
    slug: "creative-studios",
    description: "Design and creative agency",
  },
  {
    id: "5",
    name: "DataFlow Analytics",
    slug: "dataflow",
    logo: "https://api.dicebear.com/7.x/identicon/svg?seed=dataflow",
  },
];

// Single company for minimal case
const singleCompany: Company[] = [
  {
    id: "1",
    name: "Solo Enterprise",
    slug: "solo",
    isDefault: true,
  },
];

// Many companies for scrolling test
const manyCompanies: Company[] = Array.from({ length: 15 }, (_, i) => ({
  id: String(i + 1),
  name: `Company ${i + 1}`,
  slug: `company-${i + 1}`,
  description: `Description for company ${i + 1}`,
}));

const meta: Meta<typeof CompanySwitcher> = {
  title: "Components/CompanySwitcher",
  component: CompanySwitcher,
  parameters: {
    layout: "centered",
    docs: {
      description: {
        component:
          "A dropdown component for switching between different companies/organizations. Supports multiple sizes, add company action, and persists selection to localStorage.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    size: {
      control: { type: "select" },
      options: ["sm", "md", "lg"],
      description: "Size variant of the switcher",
    },
    showAddButton: {
      control: "boolean",
      description: "Whether to show the add company button",
    },
    disabled: {
      control: "boolean",
      description: "Whether the switcher is disabled",
    },
    onCompanyChange: {
      action: "company-changed",
      description: "Callback when a company is selected",
    },
    onAddCompany: {
      action: "add-company",
      description: "Callback when add company button is clicked",
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
    companies: sampleCompanies,
    showAddButton: false,
    disabled: false,
    size: "md",
  },
  parameters: {
    docs: {
      description: {
        story: "Default company switcher with multiple companies to choose from.",
      },
    },
  },
};

export const WithAddButton: Story = {
  args: {
    companies: sampleCompanies,
    showAddButton: true,
    onAddCompany: fn(),
    size: "md",
  },
  parameters: {
    docs: {
      description: {
        story: "Company switcher with an add company button for creating new organizations.",
      },
    },
  },
};

export const SmallSize: Story = {
  args: {
    companies: sampleCompanies,
    size: "sm",
  },
  parameters: {
    docs: {
      description: {
        story: "Small size variant, suitable for compact layouts.",
      },
    },
  },
};

export const LargeSize: Story = {
  args: {
    companies: sampleCompanies,
    size: "lg",
  },
  parameters: {
    docs: {
      description: {
        story: "Large size variant for prominent placement.",
      },
    },
  },
};

export const SingleCompany: Story = {
  args: {
    companies: singleCompany,
    size: "md",
  },
  parameters: {
    docs: {
      description: {
        story: "When only one company exists, the switcher still works but has minimal interaction.",
      },
    },
  },
};

export const ManyCompanies: Story = {
  args: {
    companies: manyCompanies,
    size: "md",
    showAddButton: true,
    onAddCompany: fn(),
  },
  parameters: {
    docs: {
      description: {
        story: "With many companies, the list becomes scrollable.",
      },
    },
  },
};

export const Disabled: Story = {
  args: {
    companies: sampleCompanies,
    disabled: true,
    size: "md",
  },
  parameters: {
    docs: {
      description: {
        story: "Disabled state prevents user interaction.",
      },
    },
  },
};

export const WithPreselectedCompany: Story = {
  args: {
    companies: sampleCompanies,
    defaultCompanyId: "3",
    size: "md",
  },
  parameters: {
    docs: {
      description: {
        story: "Pre-select a specific company using defaultCompanyId.",
      },
    },
  },
};

export const DarkMode: Story = {
  args: {
    companies: sampleCompanies,
    showAddButton: true,
    onAddCompany: fn(),
    size: "md",
  },
  parameters: {
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#1f2937" }],
    },
    docs: {
      description: {
        story: "Company switcher in dark mode theme.",
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

export const AllSizes: Story = {
  render: () => (
    <div className="flex flex-col items-start gap-4">
      <div className="flex items-center gap-4">
        <span className="w-16 text-sm text-gray-500">Small:</span>
        <CompanySwitcher companies={sampleCompanies} size="sm" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-16 text-sm text-gray-500">Medium:</span>
        <CompanySwitcher companies={sampleCompanies} size="md" />
      </div>
      <div className="flex items-center gap-4">
        <span className="w-16 text-sm text-gray-500">Large:</span>
        <CompanySwitcher companies={sampleCompanies} size="lg" />
      </div>
    </div>
  ),
  parameters: {
    docs: {
      description: {
        story: "Comparison of all size variants side by side.",
      },
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);

    return (
      <div className="flex flex-col items-center gap-4 p-4">
        <CompanySwitcher
          companies={sampleCompanies}
          showAddButton
          onCompanyChange={(company) => setSelectedCompany(company)}
          onAddCompany={() => alert("Add company clicked!")}
        />
        {selectedCompany && (
          <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm">
            <p><strong>Selected:</strong> {selectedCompany.name}</p>
            <p><strong>ID:</strong> {selectedCompany.id}</p>
            <p><strong>Slug:</strong> {selectedCompany.slug}</p>
          </div>
        )}
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Interactive example showing company selection feedback.",
      },
    },
  },
};

export const MobileView: Story = {
  args: {
    companies: sampleCompanies,
    showAddButton: true,
    onAddCompany: fn(),
    size: "md",
  },
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "Company switcher on mobile viewport.",
      },
    },
  },
};
