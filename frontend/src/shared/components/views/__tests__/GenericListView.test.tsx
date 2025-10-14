import { fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import "@testing-library/jest-dom";
import { GenericListView } from "../GenericListView";

// Mock the permissions hook
jest.mock("@/modules/admin/hooks/useGenericPermissions", () => ({
  useGenericPermissions: () => ({
    checkCreate: jest.fn(() => true),
    checkRead: jest.fn(() => true),
    checkUpdate: jest.fn(() => true),
    checkDelete: jest.fn(() => true),
  }),
}));

// Mock dropdown components
jest.mock("@/shared/components/ui/dropdown-menu", () => ({
  DropdownMenu: ({ children }: any) => {
    // Extract the trigger and content from children
    const childrenArray = React.Children.toArray(children);
    const trigger = childrenArray.find(
      (child: any) =>
        child &&
        React.isValidElement(child) &&
        child.type &&
        child.type.name === "DropdownMenuTrigger",
    );
    const content = childrenArray.find(
      (child: any) =>
        child &&
        React.isValidElement(child) &&
        child.type &&
        child.type.name === "DropdownMenuContent",
    );

    console.log("DropdownMenu mock called", {
      trigger: !!trigger,
      content: !!content,
    });

    return (
      <div data-testid="dropdown-menu">
        {trigger}
        {/* Always render content for testing */}
        {content &&
          React.cloneElement(content as React.ReactElement, {
            style: {
              display: "block",
              position: "static",
              visibility: "visible",
            },
          })}
      </div>
    );
  },
  DropdownMenuContent: ({ children, align, ...props }: any) => (
    <div data-testid="dropdown-content" data-align={align} {...props}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <div data-testid="dropdown-item" onClick={onClick} className={className}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children, asChild, ...props }: any) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, {
        ...props,
        "data-testid": "dropdown-trigger",
        "aria-haspopup": "menu",
        "data-state": "open", // Always open for testing
      });
    }
    return (
      <div data-testid="dropdown-trigger" {...props}>
        {children}
      </div>
    );
  },
}));

// Mock UI components
jest.mock("@/shared/components/ui", () => ({
  Button: ({ children, onClick, disabled, variant, size, ...props }: any) => (
    <button
      onClick={onClick}
      disabled={disabled}
      data-variant={variant}
      data-size={size}
      {...props}
    >
      {children}
    </button>
  ),
  Input: ({ value, onChange, placeholder, ...props }: any) => (
    <input
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      {...props}
    />
  ),
  Card: ({ children, ...props }: any) => (
    <div data-testid="card" {...props}>
      {children}
    </div>
  ),
  CardContent: ({ children }: any) => (
    <div data-testid="card-content">{children}</div>
  ),
  CardHeader: ({ children }: any) => (
    <div data-testid="card-header">{children}</div>
  ),
  CardTitle: ({ children }: any) => (
    <div data-testid="card-title">{children}</div>
  ),
  Badge: ({ children, variant }: any) => (
    <span data-testid="badge" data-variant={variant}>
      {children}
    </span>
  ),
  Checkbox: ({ checked, onCheckedChange, ...props }: any) => (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => onCheckedChange?.(e.target.checked)}
      {...props}
    />
  ),
  DropdownMenu: ({ children }: any) => {
    // Extract the trigger and content from children
    const childrenArray = React.Children.toArray(children);
    const trigger = childrenArray.find(
      (child: any) =>
        child &&
        React.isValidElement(child) &&
        child.type &&
        child.type.name === "DropdownMenuTrigger",
    );
    const content = childrenArray.find(
      (child: any) =>
        child &&
        React.isValidElement(child) &&
        child.type &&
        child.type.name === "DropdownMenuContent",
    );

    console.log("DropdownMenu mock called", {
      trigger: !!trigger,
      content: !!content,
    });

    return (
      <div data-testid="dropdown-menu">
        {trigger}
        {/* Always render content for testing */}
        {content &&
          React.cloneElement(content as React.ReactElement, {
            style: {
              display: "block",
              position: "static",
              visibility: "visible",
            },
          })}
      </div>
    );
  },
  DropdownMenuContent: ({ children, align, ...props }: any) => (
    <div data-testid="dropdown-content" data-align={align} {...props}>
      {children}
    </div>
  ),
  DropdownMenuItem: ({ children, onClick, className }: any) => (
    <div data-testid="dropdown-item" onClick={onClick} className={className}>
      {children}
    </div>
  ),
  DropdownMenuTrigger: ({ children, asChild, ...props }: any) => {
    if (asChild && React.isValidElement(children)) {
      return React.cloneElement(children as React.ReactElement, {
        ...props,
        "data-testid": "dropdown-trigger",
        "aria-haspopup": "menu",
        "data-state": "open", // Always open for testing
      });
    }
    return (
      <div data-testid="dropdown-trigger" {...props}>
        {children}
      </div>
    );
  },
  Table: ({ children, ...props }: any) => (
    <table data-testid="table" {...props}>
      {children}
    </table>
  ),
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableCell: ({ children }: any) => <td>{children}</td>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
}));

// Mock icons
jest.mock("lucide-react", () => ({
  Plus: () => <span data-testid="plus-icon" />,
  Search: () => <span data-testid="search-icon" />,
  MoreHorizontal: () => <span data-testid="more-icon" />,
  Eye: () => <span data-testid="eye-icon" />,
  Edit: () => <span data-testid="edit-icon" />,
  Trash2: () => <span data-testid="trash-icon" />,
  RefreshCw: () => <span data-testid="refresh-icon" />,
}));

// Test data
interface TestItem {
  id: number;
  name: string;
  email: string;
  status: "active" | "inactive";
}

const mockItems: TestItem[] = [
  { id: 1, name: "John Doe", email: "john@example.com", status: "active" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", status: "inactive" },
  { id: 3, name: "Bob Johnson", email: "bob@example.com", status: "active" },
];

const mockColumns = [
  { key: "name", label: "Name", sortable: true },
  { key: "email", label: "Email", sortable: true },
  {
    key: "status",
    label: "Status",
    render: (value: string, item: TestItem) => (
      <span data-testid={`status-${item.id}`}>{value}</span>
    ),
  },
];

describe("GenericListView Component", () => {
  const defaultProps = {
    data: mockItems,
    columns: mockColumns,
    resourceName: "users",
    projectId: "test-project",
  };

  it("renders the component with title and items", () => {
    render(
      <GenericListView<TestItem>
        {...defaultProps}
        title="Test Users"
        subtitle="Manage your test users"
      />,
    );

    expect(screen.getByText("Test Users")).toBeInTheDocument();
    expect(screen.getByText("Manage your test users")).toBeInTheDocument();
    expect(screen.getByRole("table")).toBeInTheDocument();
  });

  it("renders table headers correctly", () => {
    render(<GenericListView<TestItem> {...defaultProps} />);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Email")).toBeInTheDocument();
    expect(screen.getByText("Status")).toBeInTheDocument();
  });

  it("renders table data correctly", () => {
    render(<GenericListView<TestItem> {...defaultProps} />);

    expect(screen.getByText("John Doe")).toBeInTheDocument();
    expect(screen.getByText("john@example.com")).toBeInTheDocument();
    expect(screen.getByText("Jane Smith")).toBeInTheDocument();
    expect(screen.getByText("jane@example.com")).toBeInTheDocument();
    expect(screen.getByText("Bob Johnson")).toBeInTheDocument();
    expect(screen.getByText("bob@example.com")).toBeInTheDocument();
  });

  it("renders custom column content", () => {
    render(<GenericListView<TestItem> {...defaultProps} />);

    expect(screen.getByTestId("status-1")).toHaveTextContent("active");
    expect(screen.getByTestId("status-2")).toHaveTextContent("inactive");
    expect(screen.getByTestId("status-3")).toHaveTextContent("active");
  });

  it("shows create button when onCreateClick is provided and user has permission", () => {
    const mockOnCreate = jest.fn();
    render(
      <GenericListView<TestItem>
        {...defaultProps}
        onCreateClick={mockOnCreate}
        createButtonText="Add User"
      />,
    );

    const createButton = screen.getByRole("button", { name: /add user/i });
    expect(createButton).toBeInTheDocument();
    expect(screen.getByTestId("plus-icon")).toBeInTheDocument();
  });

  it("calls onCreateClick when create button is clicked", () => {
    const mockOnCreate = jest.fn();
    render(
      <GenericListView<TestItem>
        {...defaultProps}
        onCreateClick={mockOnCreate}
      />,
    );

    const createButton = screen.getByRole("button", { name: /create new/i });
    fireEvent.click(createButton);

    expect(mockOnCreate).toHaveBeenCalledTimes(1);
  });

  it("shows search input when searchable is true", () => {
    render(
      <GenericListView<TestItem>
        {...defaultProps}
        searchable={true}
        searchPlaceholder="Search users..."
      />,
    );

    const searchInput = screen.getByPlaceholderText("Search users...");
    expect(searchInput).toBeInTheDocument();
    expect(screen.getByTestId("search-icon")).toBeInTheDocument();
  });

  it("calls onSearch when search input changes", () => {
    const mockOnSearch = jest.fn();
    render(
      <GenericListView<TestItem>
        {...defaultProps}
        searchable={true}
        onSearch={mockOnSearch}
      />,
    );

    const searchInput = screen.getByRole("textbox");
    fireEvent.change(searchInput, { target: { value: "john" } });

    expect(mockOnSearch).toHaveBeenCalledWith("john");
  });

  it("shows refresh button when onRefresh is provided", () => {
    const mockOnRefresh = jest.fn();
    render(
      <GenericListView<TestItem> {...defaultProps} onRefresh={mockOnRefresh} />,
    );

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    expect(refreshButton).toBeInTheDocument();
  });

  it("calls onRefresh when refresh button is clicked", () => {
    const mockOnRefresh = jest.fn();
    render(
      <GenericListView<TestItem> {...defaultProps} onRefresh={mockOnRefresh} />,
    );

    const refreshButton = screen.getByRole("button", { name: /refresh/i });
    fireEvent.click(refreshButton);

    expect(mockOnRefresh).toHaveBeenCalledTimes(1);
  });

  it("shows action menu for each item with view/edit/delete options", () => {
    const mockOnViewClick = jest.fn();
    const mockOnEditClick = jest.fn();
    const mockOnDeleteClick = jest.fn();

    render(
      <GenericListView<TestItem>
        {...defaultProps}
        onViewClick={mockOnViewClick}
        onEditClick={mockOnEditClick}
        onDeleteClick={mockOnDeleteClick}
      />,
    );

    // Check that dropdown menus are present (one for each item)
    const dropdownMenus = screen.getAllByTestId("dropdown-menu");
    expect(dropdownMenus).toHaveLength(mockItems.length);

    // Check that dropdown content is visible (one for each item)
    const dropdownContents = screen.getAllByTestId("dropdown-content");
    expect(dropdownContents).toHaveLength(mockItems.length);

    // Check that action items are present (view, edit, delete per item)
    const dropdownItems = screen.getAllByTestId("dropdown-item");
    expect(dropdownItems).toHaveLength(mockItems.length * 3); // 3 actions per item

    // Check that action text is visible (multiple instances)
    expect(screen.getAllByText("View")).toHaveLength(mockItems.length);
    expect(screen.getAllByText("Edit")).toHaveLength(mockItems.length);
    expect(screen.getAllByText("Delete")).toHaveLength(mockItems.length);
  });

  it("calls onViewClick when view action is clicked", () => {
    const mockOnViewClick = jest.fn();

    render(
      <GenericListView<TestItem>
        {...defaultProps}
        onViewClick={mockOnViewClick}
      />,
    );

    const viewButtons = screen.getAllByTestId("dropdown-item");
    // View button is the first item in each dropdown (index 0, 3, 6, etc.)
    fireEvent.click(viewButtons[0]);

    expect(mockOnViewClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it("calls onEditClick when edit action is clicked", () => {
    const mockOnEditClick = jest.fn();

    render(
      <GenericListView<TestItem>
        {...defaultProps}
        onEditClick={mockOnEditClick}
      />,
    );

    const editButtons = screen.getAllByTestId("dropdown-item");
    // Since only edit buttons are rendered (no view/delete handlers provided), index 0 is the first item's edit button
    fireEvent.click(editButtons[0]);

    expect(mockOnEditClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it("calls onDeleteClick when delete action is clicked", () => {
    const mockOnDeleteClick = jest.fn();

    render(
      <GenericListView<TestItem>
        {...defaultProps}
        onDeleteClick={mockOnDeleteClick}
      />,
    );

    const deleteButtons = screen.getAllByTestId("dropdown-item");
    // Since only delete buttons are rendered (no view/edit handlers provided), index 0 is the first item's delete button
    fireEvent.click(deleteButtons[0]);

    expect(mockOnDeleteClick).toHaveBeenCalledWith(mockItems[0]);
  });

  it("shows custom actions when provided", () => {
    const mockCustomAction = jest.fn();
    const customActions = [
      {
        label: "Custom Action",
        action: mockCustomAction,
      },
    ];

    render(
      <GenericListView<TestItem>
        {...defaultProps}
        onViewClick={jest.fn()}
        onEditClick={jest.fn()}
        onDeleteClick={jest.fn()}
        customActions={customActions}
      />,
    );

    // Check that custom action is present in addition to default actions
    const dropdownItems = screen.getAllByTestId("dropdown-item");
    expect(dropdownItems).toHaveLength(mockItems.length * 4); // view, edit, delete, custom per item

    // Check that custom action text is present
    expect(screen.getAllByText("Custom Action")).toHaveLength(mockItems.length);
  });

  it("shows empty state when no items are provided", () => {
    render(
      <GenericListView<TestItem>
        {...defaultProps}
        data={[]}
        emptyStateTitle="No users found"
        emptyStateDescription="Create your first user to get started."
      />,
    );

    expect(screen.getByText("No users found")).toBeInTheDocument();
    expect(
      screen.getByText("Create your first user to get started."),
    ).toBeInTheDocument();
  });

  it("shows loading state when loading prop is true", () => {
    render(<GenericListView<TestItem> {...defaultProps} loading={true} />);

    expect(screen.getByText("Loading...")).toBeInTheDocument();
  });

  it("shows error state when error prop is provided", () => {
    render(
      <GenericListView<TestItem>
        {...defaultProps}
        error="Failed to load users"
      />,
    );

    expect(screen.getByText("Failed to load users")).toBeInTheDocument();
  });

  it("supports selectable mode with checkboxes", () => {
    const mockOnSelectionChange = jest.fn();

    render(
      <GenericListView<TestItem>
        {...defaultProps}
        selectable={true}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    // Check that checkboxes are present (one for select all + one for each item)
    const checkboxes = screen.getAllByRole("checkbox");
    expect(checkboxes).toHaveLength(mockItems.length + 1);
  });

  it("calls onSelectionChange when items are selected", () => {
    const mockOnSelectionChange = jest.fn();

    render(
      <GenericListView<TestItem>
        {...defaultProps}
        selectable={true}
        onSelectionChange={mockOnSelectionChange}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");

    // Select first item (skip the select all checkbox at index 0)
    fireEvent.click(checkboxes[1]);

    expect(mockOnSelectionChange).toHaveBeenCalledWith([mockItems[0]]);
  });

  it("shows bulk actions when items are selected", () => {
    const mockBulkAction = jest.fn();
    const mockOnSelectionChange = jest.fn();

    const bulkActions = [
      {
        label: "Delete Selected",
        action: mockBulkAction,
      },
    ];

    render(
      <GenericListView<TestItem>
        {...defaultProps}
        selectable={true}
        onSelectionChange={mockOnSelectionChange}
        bulkActions={bulkActions}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");

    // Select first item (skip the select all checkbox at index 0)
    fireEvent.click(checkboxes[1]);

    const bulkActionButton = screen.getByRole("button", {
      name: "Actions (1)",
    });
    expect(bulkActionButton).toBeInTheDocument();
  });

  it("calls bulk action when bulk action button is clicked", () => {
    const mockBulkAction = jest.fn();
    const mockOnSelectionChange = jest.fn();

    const bulkActions = [
      {
        label: "Delete Selected",
        action: mockBulkAction,
      },
    ];

    const { rerender } = render(
      <GenericListView<TestItem>
        {...defaultProps}
        selectable={true}
        selectedItems={[]}
        onSelectionChange={mockOnSelectionChange}
        bulkActions={bulkActions}
      />,
    );

    const checkboxes = screen.getAllByRole("checkbox");

    // Select first item (skip the select all checkbox at index 0)
    fireEvent.click(checkboxes[1]);

    // Mock the parent updating selectedItems based on onSelectionChange
    rerender(
      <GenericListView<TestItem>
        {...defaultProps}
        selectable={true}
        selectedItems={[mockItems[0]]}
        onSelectionChange={mockOnSelectionChange}
        bulkActions={bulkActions}
      />,
    );

    // The bulk actions are rendered as dropdown items in the search/filter area
    const bulkActionItems = screen.getAllByTestId("dropdown-item");
    // The bulk action should be the only dropdown item (since it's in the bulk actions dropdown)
    fireEvent.click(bulkActionItems[0]);

    expect(mockBulkAction).toHaveBeenCalledWith([mockItems[0]]);
  });

  it("shows pagination when pagination prop is provided", () => {
    const mockOnPageChange = jest.fn();

    render(
      <GenericListView<TestItem>
        {...defaultProps}
        pagination={{
          current: 1,
          total: 25,
          pageSize: 10,
          onPageChange: mockOnPageChange,
        }}
      />,
    );

    expect(screen.getByText("Page 1 of 3")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /next/i })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /previous/i }),
    ).toBeInTheDocument();
  });

  it("calls onPageChange when pagination buttons are clicked", () => {
    const mockOnPageChange = jest.fn();

    render(
      <GenericListView<TestItem>
        {...defaultProps}
        pagination={{
          current: 1,
          total: 25,
          pageSize: 10,
          onPageChange: mockOnPageChange,
        }}
      />,
    );

    const nextButton = screen.getByRole("button", { name: /next/i });
    fireEvent.click(nextButton);

    expect(mockOnPageChange).toHaveBeenCalledWith(2);
  });

  it("applies custom className when provided", () => {
    const { container } = render(
      <GenericListView<TestItem>
        {...defaultProps}
        className="custom-list-view"
      />,
    );

    const rootDiv = container.firstChild as HTMLElement;
    expect(rootDiv).toHaveClass("custom-list-view");
  });
});
