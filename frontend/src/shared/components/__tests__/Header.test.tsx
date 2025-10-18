import { fireEvent, render, screen } from "@testing-library/react";
import type React from "react";
import "@testing-library/jest-dom";
import { AuthProvider } from "@/modules/auth";
import { ThemeProvider } from "@/shared/services/ThemeContext";
import Header from "../layout/Header";

// Mock Next.js navigation
jest.mock("next/navigation", () => ({
  usePathname: () => "/dashboard/projects",
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
  }),
}));

// Mock Breadcrumb component
jest.mock("../navigation/Breadcrumb", () => {
  return function MockBreadcrumb() {
    return <div data-testid="breadcrumb">Home / Dashboard / Projects</div>;
  };
});

// Mock fetch API
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
Object.defineProperty(window, "localStorage", {
  value: mockLocalStorage,
});

// Mock API config
jest.mock("@/lib/api/config", () => ({
  API_CONFIG: {
    API_BASE_URL: "http://localhost:8000",
    ENDPOINTS: {
      AUTH: {
        LOGIN: "/auth/login",
        LOGOUT: "/auth/logout",
        REFRESH: "/auth/refresh",
        ME: "/auth/me",
      },
    },
  },
  getApiUrl: (endpoint: string) => `http://localhost:8000${endpoint}`,
}));

// Test wrapper with AuthProvider and ThemeProvider
const TestWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <ThemeProvider>
      <AuthProvider>{children}</AuthProvider>
    </ThemeProvider>
  );
};

describe("Header Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLocalStorage.getItem.mockReturnValue(null);
  });

  it("renders search input with correct placeholder", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    const searchInput = screen.getByPlaceholderText("Search...");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveClass("pl-8", "pr-3", "py-1.5", "w-48");
  });

  it("renders all action buttons", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    // Check for buttons by their title attributes or accessible text
    expect(screen.getByTitle("Notifications")).toBeInTheDocument();
    expect(screen.getByText("Toggle theme")).toBeInTheDocument();
  });

  it("renders user profile dropdown trigger", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    expect(screen.getByText("User")).toBeInTheDocument();
  });

  it("opens user profile dropdown when clicked", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    const userButton = screen.getByText("User").closest("button");
    expect(userButton).toBeInTheDocument();

    fireEvent.click(userButton!);

    // Check for dropdown menu items (these might be in a portal)
    // Note: Testing dropdown content might require additional setup
    // for portal testing or using a different testing approach
  });

  it("renders breadcrumb component", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    expect(screen.getByTestId("breadcrumb")).toBeInTheDocument();
    expect(screen.getByText("Home / Dashboard / Projects")).toBeInTheDocument();
  });

  it("has proper search input styling", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    const searchInput = screen.getByPlaceholderText("Search...");
    expect(searchInput).toHaveClass(
      "border",
      "border-input",
      "rounded-md",
      "focus:ring-1",
      "focus:ring-ring",
    );
  });

  it("renders theme toggle icons", () => {
    render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    const themeButton = screen.getByText("Toggle theme").closest("button");
    expect(themeButton).toBeInTheDocument();

    // Check for Sun/Moon icons (they are rendered conditionally)
    const sunIcon = themeButton.querySelector(".lucide-sun");
    const moonIcon = themeButton.querySelector(".lucide-moon");

    expect(sunIcon || moonIcon).toBeTruthy();
  });

  it("has correct header structure", () => {
    const { container } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    // Check main header structure
    const headerElement = container.querySelector("header");
    expect(headerElement).toHaveClass(
      "h-12",
      "flex",
      "items-center",
      "justify-between",
      "px-3",
    );

    // Check breadcrumb section
    const breadcrumbSection = container.querySelector('[data-testid="breadcrumb"]')?.parentElement;
    expect(breadcrumbSection).toBeInTheDocument();
  });

  it("renders with proper dark mode classes", () => {
    const { container } = render(
      <TestWrapper>
        <Header />
      </TestWrapper>,
    );

    const headerContainer = container.firstChild;
    expect(headerContainer).toHaveClass(
      "bg-background",
      "border-b",
      "border-border",
    );
  });
});
