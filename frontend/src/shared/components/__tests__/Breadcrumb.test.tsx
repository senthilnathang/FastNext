import { render, screen } from "@testing-library/react";
import "@testing-library/jest-dom";
import Breadcrumb from "../navigation/Breadcrumb";

// Mock Next.js navigation

let currentPath = "/dashboard";

jest.mock("next/navigation", () => ({
  usePathname: () => currentPath,
}));

describe("Breadcrumb Component", () => {
  beforeEach(() => {
    currentPath = "/dashboard";
  });

  it("renders home breadcrumb for dashboard path", () => {
    currentPath = "/dashboard";
    render(<Breadcrumb />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
  });

  it("renders multi-level breadcrumbs correctly", () => {
    currentPath = "/dashboard/projects";
    render(<Breadcrumb />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByText("Projects")).toBeInTheDocument();
  });

  it("renders deep nested breadcrumbs", () => {
    currentPath = "/admin/users/123";
    render(<Breadcrumb />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Admin")).toBeInTheDocument();
    expect(screen.getByText("Users")).toBeInTheDocument();
    expect(screen.getByText("123")).toBeInTheDocument();
  });

  it("capitalizes breadcrumb labels correctly", () => {
    currentPath = "/ai-management/model-inventory";
    render(<Breadcrumb />);

    expect(screen.getByText("Ai Management")).toBeInTheDocument();
    expect(screen.getByText("Model Inventory")).toBeInTheDocument();
  });

  it("renders home icon for first breadcrumb", () => {
    render(<Breadcrumb />);

    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveAttribute("href", "/dashboard");

    // Check for Home icon (svg element)
    const homeIcon = homeLink?.querySelector("svg");
    expect(homeIcon).toBeInTheDocument();
  });

  it("renders chevron separators between breadcrumbs", () => {
    currentPath = "/dashboard/projects";
    const { container } = render(<Breadcrumb />);

    const chevrons = container.querySelectorAll(".lucide-chevron-right");
    expect(chevrons).toHaveLength(2); // Two chevrons: Home->Dashboard, Dashboard->Projects
  });

  it("makes last breadcrumb non-clickable", () => {
    currentPath = "/dashboard/projects";
    render(<Breadcrumb />);

    // Last item should be a span, not a link
    const lastItem = screen.getByText("Projects");
    expect(lastItem.tagName).toBe("SPAN");
    expect(lastItem).toHaveClass(
      "text-gray-900",
      "dark:text-white",
      "font-medium",
    );
  });

  it("makes non-last breadcrumbs clickable", () => {
    currentPath = "/dashboard/projects/123";
    render(<Breadcrumb />);

    const homeLink = screen.getByText("Home").closest("a");
    const dashboardLink = screen.getByText("Dashboard").closest("a");
    const projectsLink = screen.getByText("Projects").closest("a");

    expect(homeLink).toHaveAttribute("href", "/dashboard");
    expect(dashboardLink).toHaveAttribute("href", "/dashboard");
    expect(projectsLink).toHaveAttribute("href", "/dashboard/projects");

    // Last item should not be a link
    const lastItem = screen.getByText("123");
    expect(lastItem.tagName).toBe("SPAN");
  });

  it("applies custom className when provided", () => {
    const { container } = render(<Breadcrumb className="custom-breadcrumb" />);

    expect(container.firstChild).toHaveClass("custom-breadcrumb");
  });

  it("renders custom breadcrumb items when provided", () => {
    const customItems = [
      { label: "Custom Home", href: "/", icon: undefined },
      { label: "Custom Page", href: "/custom" },
    ];

    render(<Breadcrumb customItems={customItems} />);

    expect(screen.getByText("Custom Home")).toBeInTheDocument();
    expect(screen.getByText("Custom Page")).toBeInTheDocument();
    expect(screen.queryByText("Home")).not.toBeInTheDocument();
  });

  it("handles root path correctly", () => {
    currentPath = "/";
    render(<Breadcrumb />);

    // Should still show Home breadcrumb
    expect(screen.getByText("Home")).toBeInTheDocument();
  });

  it("has proper hover styles on clickable breadcrumbs", () => {
    currentPath = "/dashboard/projects";
    render(<Breadcrumb />);

    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveClass(
      "hover:text-blue-600",
      "dark:hover:text-blue-400",
    );
  });
});
