import type { Meta, StoryObj } from "@storybook/react";
import { useState } from "react";
import {
  AdvancedSearch,
  type SearchState,
  type SearchFilter,
  type SortOption,
} from "@/shared/components/navigation/AdvancedSearch";

// Sample filter configurations
const sampleFilters: Omit<SearchFilter, "value">[] = [
  {
    id: "name",
    type: "text",
    field: "name",
    label: "Name",
    placeholder: "Search by name...",
  },
  {
    id: "status",
    type: "select",
    field: "status",
    label: "Status",
    options: [
      { value: "active", label: "Active" },
      { value: "pending", label: "Pending" },
      { value: "completed", label: "Completed" },
      { value: "cancelled", label: "Cancelled" },
    ],
  },
  {
    id: "priority",
    type: "select",
    field: "priority",
    label: "Priority",
    options: [
      { value: "low", label: "Low" },
      { value: "medium", label: "Medium" },
      { value: "high", label: "High" },
      { value: "urgent", label: "Urgent" },
    ],
  },
  {
    id: "tags",
    type: "multiselect",
    field: "tags",
    label: "Tags",
    options: [
      { value: "frontend", label: "Frontend" },
      { value: "backend", label: "Backend" },
      { value: "design", label: "Design" },
      { value: "devops", label: "DevOps" },
      { value: "documentation", label: "Documentation" },
    ],
  },
  {
    id: "createdAt",
    type: "date",
    field: "created_at",
    label: "Created Date",
  },
  {
    id: "dateRange",
    type: "daterange",
    field: "date_range",
    label: "Date Range",
  },
  {
    id: "isArchived",
    type: "boolean",
    field: "is_archived",
    label: "Archived",
  },
];

// Sample sort options
const sampleSorts: Omit<SortOption, "direction">[] = [
  { field: "name", label: "Name" },
  { field: "created_at", label: "Created Date" },
  { field: "updated_at", label: "Last Updated" },
  { field: "priority", label: "Priority" },
  { field: "status", label: "Status" },
];

// Initial search state
const initialSearchState: SearchState = {
  query: "",
  filters: [],
  sort: null,
  page: 1,
  pageSize: 10,
};

const meta: Meta<typeof AdvancedSearch> = {
  title: "Components/FilterBuilder",
  component: AdvancedSearch,
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "A dynamic filter builder component with support for text, select, multi-select, date, date range, and boolean filters. Includes sorting, search query, and result count display.",
      },
    },
  },
  tags: ["autodocs"],
  argTypes: {
    placeholder: {
      control: "text",
      description: "Placeholder text for the search input",
    },
    showResultCount: {
      control: "boolean",
      description: "Whether to show the result count",
    },
    resultCount: {
      control: { type: "number", min: 0 },
      description: "Number of results to display",
    },
    loading: {
      control: "boolean",
      description: "Whether the search is loading",
    },
    onSearchChange: {
      action: "search-change",
      description: "Callback when search state changes",
    },
  },
};

export default meta;
type Story = StoryObj<typeof meta>;

// Wrapper component for stories
const FilterBuilderWrapper = ({
  initialState = initialSearchState,
  ...props
}: Omit<React.ComponentProps<typeof AdvancedSearch>, "searchState" | "onSearchChange"> & {
  initialState?: SearchState;
}) => {
  const [searchState, setSearchState] = useState(initialState);

  return (
    <AdvancedSearch
      searchState={searchState}
      onSearchChange={setSearchState}
      {...props}
    />
  );
};

export const Default: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={sampleFilters}
      availableSorts={sampleSorts}
      resultCount={1234}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Default filter builder with all filter types and sorting options.",
      },
    },
  },
};

export const WithActiveFilters: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={sampleFilters}
      availableSorts={sampleSorts}
      resultCount={42}
      initialState={{
        query: "project",
        filters: [
          { id: "status-1", type: "select", field: "status", label: "Status", value: "active" },
          { id: "priority-1", type: "select", field: "priority", label: "Priority", value: "high" },
        ],
        sort: { field: "created_at", label: "Created Date", direction: "desc" },
        page: 1,
        pageSize: 10,
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Filter builder with pre-applied filters and sorting.",
      },
    },
  },
};

export const SearchOnly: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={[]}
      availableSorts={[]}
      placeholder="Search for anything..."
      resultCount={500}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Minimal version with only search input.",
      },
    },
  },
};

export const WithoutResultCount: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={sampleFilters}
      availableSorts={sampleSorts}
      showResultCount={false}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Filter builder without result count display.",
      },
    },
  },
};

export const Loading: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={sampleFilters}
      availableSorts={sampleSorts}
      resultCount={0}
      loading
      initialState={{
        query: "searching...",
        filters: [],
        sort: null,
        page: 1,
        pageSize: 10,
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Loading state while searching.",
      },
    },
  },
};

export const TextFiltersOnly: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={[
        { id: "name", type: "text", field: "name", label: "Name" },
        { id: "email", type: "text", field: "email", label: "Email" },
        { id: "description", type: "text", field: "description", label: "Description" },
      ]}
      availableSorts={sampleSorts}
      resultCount={150}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Filter builder with only text-based filters.",
      },
    },
  },
};

export const SelectFiltersOnly: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={[
        {
          id: "status",
          type: "select",
          field: "status",
          label: "Status",
          options: [
            { value: "active", label: "Active" },
            { value: "inactive", label: "Inactive" },
          ],
        },
        {
          id: "type",
          type: "select",
          field: "type",
          label: "Type",
          options: [
            { value: "user", label: "User" },
            { value: "admin", label: "Admin" },
            { value: "guest", label: "Guest" },
          ],
        },
        {
          id: "role",
          type: "multiselect",
          field: "role",
          label: "Roles",
          options: [
            { value: "viewer", label: "Viewer" },
            { value: "editor", label: "Editor" },
            { value: "admin", label: "Admin" },
          ],
        },
      ]}
      availableSorts={[]}
      resultCount={75}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Filter builder with select and multi-select filters.",
      },
    },
  },
};

export const DateFiltersOnly: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={[
        { id: "created", type: "date", field: "created_at", label: "Created Date" },
        { id: "updated", type: "date", field: "updated_at", label: "Updated Date" },
        { id: "range", type: "daterange", field: "date_range", label: "Date Range" },
      ]}
      availableSorts={[
        { field: "created_at", label: "Created Date" },
        { field: "updated_at", label: "Updated Date" },
      ]}
      resultCount={200}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Filter builder with date-based filters.",
      },
    },
  },
};

export const BooleanFilters: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={[
        { id: "active", type: "boolean", field: "is_active", label: "Active" },
        { id: "verified", type: "boolean", field: "is_verified", label: "Verified" },
        { id: "featured", type: "boolean", field: "is_featured", label: "Featured" },
        { id: "archived", type: "boolean", field: "is_archived", label: "Archived" },
      ]}
      availableSorts={[]}
      resultCount={89}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Filter builder with boolean (yes/no) filters.",
      },
    },
  },
};

export const SortingOnly: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={[]}
      availableSorts={sampleSorts}
      resultCount={1000}
      placeholder="Search and sort..."
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Filter builder with only sorting options.",
      },
    },
  },
};

export const ZeroResults: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={sampleFilters}
      availableSorts={sampleSorts}
      resultCount={0}
      initialState={{
        query: "nonexistent",
        filters: [
          { id: "status-1", type: "select", field: "status", label: "Status", value: "cancelled" },
        ],
        sort: null,
        page: 1,
        pageSize: 10,
      }}
    />
  ),
  parameters: {
    docs: {
      description: {
        story: "Filter builder showing zero results state.",
      },
    },
  },
};

export const Interactive: Story = {
  render: () => {
    const [searchState, setSearchState] = useState<SearchState>(initialSearchState);
    const [resultCount, setResultCount] = useState(1000);

    // Simulate filtering
    const handleSearchChange = (newState: SearchState) => {
      setSearchState(newState);
      // Simulate varying result counts based on filters
      const filterPenalty = newState.filters.length * 100;
      const queryPenalty = newState.query ? 300 : 0;
      setResultCount(Math.max(0, 1000 - filterPenalty - queryPenalty));
    };

    return (
      <div className="space-y-6">
        <AdvancedSearch
          searchState={searchState}
          onSearchChange={handleSearchChange}
          availableFilters={sampleFilters}
          availableSorts={sampleSorts}
          resultCount={resultCount}
        />
        <div className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg">
          <h3 className="font-semibold mb-2">Current Search State:</h3>
          <pre className="text-xs overflow-auto p-2 bg-white dark:bg-gray-900 rounded">
            {JSON.stringify(searchState, null, 2)}
          </pre>
        </div>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Interactive example showing the search state as you modify filters.",
      },
    },
  },
};

export const InDataTable: Story = {
  render: () => {
    const [searchState, setSearchState] = useState<SearchState>({
      ...initialSearchState,
      filters: [
        { id: "status-1", type: "select", field: "status", label: "Status", value: "active" },
      ],
    });

    const sampleData = [
      { id: 1, name: "Project Alpha", status: "Active", priority: "High", created: "2024-01-15" },
      { id: 2, name: "Project Beta", status: "Active", priority: "Medium", created: "2024-01-18" },
      { id: 3, name: "Project Gamma", status: "Active", priority: "Low", created: "2024-01-20" },
    ];

    return (
      <div className="space-y-4">
        <AdvancedSearch
          searchState={searchState}
          onSearchChange={setSearchState}
          availableFilters={sampleFilters.slice(0, 4)}
          availableSorts={sampleSorts.slice(0, 3)}
          resultCount={sampleData.length}
        />
        <table className="w-full border-collapse">
          <thead>
            <tr className="border-b bg-gray-50 dark:bg-gray-800">
              <th className="text-left py-2 px-3 text-sm font-medium">Name</th>
              <th className="text-left py-2 px-3 text-sm font-medium">Status</th>
              <th className="text-left py-2 px-3 text-sm font-medium">Priority</th>
              <th className="text-left py-2 px-3 text-sm font-medium">Created</th>
            </tr>
          </thead>
          <tbody>
            {sampleData.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="py-2 px-3 text-sm">{row.name}</td>
                <td className="py-2 px-3 text-sm">{row.status}</td>
                <td className="py-2 px-3 text-sm">{row.priority}</td>
                <td className="py-2 px-3 text-sm text-gray-500">{row.created}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  },
  parameters: {
    docs: {
      description: {
        story: "Filter builder integrated with a data table.",
      },
    },
  },
};

export const DarkMode: Story = {
  render: () => (
    <FilterBuilderWrapper
      availableFilters={sampleFilters}
      availableSorts={sampleSorts}
      resultCount={567}
      initialState={{
        query: "test",
        filters: [
          { id: "status-1", type: "select", field: "status", label: "Status", value: "pending" },
        ],
        sort: { field: "name", label: "Name", direction: "asc" },
        page: 1,
        pageSize: 10,
      }}
    />
  ),
  parameters: {
    backgrounds: {
      default: "dark",
      values: [{ name: "dark", value: "#1f2937" }],
    },
    docs: {
      description: {
        story: "Filter builder in dark mode theme.",
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
    <div className="p-4">
      <FilterBuilderWrapper
        availableFilters={sampleFilters.slice(0, 4)}
        availableSorts={sampleSorts.slice(0, 3)}
        resultCount={123}
      />
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: "mobile1",
    },
    docs: {
      description: {
        story: "Filter builder on mobile viewport - responsive layout.",
      },
    },
  },
};

export const TabletView: Story = {
  render: () => (
    <div className="p-4">
      <FilterBuilderWrapper
        availableFilters={sampleFilters}
        availableSorts={sampleSorts}
        resultCount={456}
      />
    </div>
  ),
  parameters: {
    viewport: {
      defaultViewport: "tablet",
    },
    docs: {
      description: {
        story: "Filter builder on tablet viewport.",
      },
    },
  },
};
