import { fireEvent, render, screen } from "@testing-library/react";
import QuickActionButton from "../../ui/QuickActionButton";

// Mock the QuickActionsMenu component
jest.mock("../../ui/QuickActionsMenu", () => {
  return function MockQuickActionsMenu({
    isOpen,
    onClose,
  }: {
    isOpen: boolean;
    onClose: () => void;
  }) {
    return isOpen ? (
      <div data-testid="quick-actions-menu">
        <button onClick={onClose} data-testid="close-menu">
          Close
        </button>
        <div>Menu Content</div>
      </div>
    ) : null;
  };
});

describe("QuickActionButton Component", () => {
  it("renders button with correct text and icon", () => {
    render(<QuickActionButton />);

    const button = screen.getByRole("button", { name: /quick actions/i });
    expect(button).toBeInTheDocument();
    expect(button).toHaveClass("flex", "items-center", "space-x-2");

    // Check if the Zap icon is present (lucide-react icons typically have specific classes)
    expect(button.querySelector(".lucide")).toBeInTheDocument();
  });

  it("opens menu when button is clicked", () => {
    render(<QuickActionButton />);

    const button = screen.getByRole("button", { name: /quick actions/i });

    // Menu should not be visible initially
    expect(screen.queryByTestId("quick-actions-menu")).not.toBeInTheDocument();

    // Click the button
    fireEvent.click(button);

    // Menu should now be visible
    expect(screen.getByTestId("quick-actions-menu")).toBeInTheDocument();
  });

  it("closes menu when close is triggered", () => {
    render(<QuickActionButton />);

    const button = screen.getByRole("button", { name: /quick actions/i });

    // Open the menu
    fireEvent.click(button);
    expect(screen.getByTestId("quick-actions-menu")).toBeInTheDocument();

    // Close the menu
    const closeButton = screen.getByTestId("close-menu");
    fireEvent.click(closeButton);

    // Menu should be closed
    expect(screen.queryByTestId("quick-actions-menu")).not.toBeInTheDocument();
  });

  it("accepts custom className", () => {
    render(<QuickActionButton className="custom-class" />);

    const button = screen.getByRole("button", { name: /quick actions/i });
    expect(button).toHaveClass("custom-class");
  });

  it("uses correct button variant and size", () => {
    render(<QuickActionButton />);

    const button = screen.getByRole("button", { name: /quick actions/i });
    // The button should have outline variant and sm size classes
    expect(button).toHaveClass("border", "border-input"); // outline variant classes
    expect(button).toHaveClass("md:h-8", "md:px-3", "md:text-xs"); // sm size classes
  });

  it("maintains menu state correctly", () => {
    render(<QuickActionButton />);

    const button = screen.getByRole("button", { name: /quick actions/i });

    // Initial state - menu closed
    expect(screen.queryByTestId("quick-actions-menu")).not.toBeInTheDocument();

    // Open menu
    fireEvent.click(button);
    expect(screen.getByTestId("quick-actions-menu")).toBeInTheDocument();

    // Close menu
    fireEvent.click(screen.getByTestId("close-menu"));
    expect(screen.queryByTestId("quick-actions-menu")).not.toBeInTheDocument();

    // Open menu again
    fireEvent.click(button);
    expect(screen.getByTestId("quick-actions-menu")).toBeInTheDocument();
  });

  it("has accessible button properties", () => {
    render(<QuickActionButton />);

    const button = screen.getByRole("button", { name: /quick actions/i });
    expect(button).toBeEnabled();
    // Note: The button component doesn't explicitly set type="button" but it's still a button element
    expect(button.tagName).toBe("BUTTON");
  });
});
