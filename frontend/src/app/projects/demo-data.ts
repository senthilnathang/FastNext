import type { Project } from "@/shared/types";

// Demo projects with start and end dates for showcasing timeline/gantt views
export const demoProjects: Project[] = [
  {
    id: 1,
    name: "E-commerce Platform",
    description: "Building a modern e-commerce platform with React and Node.js",
    user_id: 1,
    is_public: true,
    settings: {},
    start_date: "2024-01-15",
    end_date: "2024-06-30",
    created_at: "2024-01-10T09:00:00Z",
    updated_at: "2024-01-15T10:30:00Z",
  },
  {
    id: 2,
    name: "Mobile App Development",
    description: "Cross-platform mobile app using React Native",
    user_id: 1,
    is_public: false,
    settings: {},
    start_date: "2024-02-01",
    end_date: "2024-08-15",
    created_at: "2024-01-20T14:00:00Z",
    updated_at: "2024-02-01T09:00:00Z",
  },
  {
    id: 3,
    name: "Data Analytics Dashboard",
    description: "Real-time analytics dashboard with D3.js and Python backend",
    user_id: 2,
    is_public: true,
    settings: {},
    start_date: "2024-03-01",
    end_date: "2024-09-30",
    created_at: "2024-02-25T11:00:00Z",
    updated_at: "2024-03-01T08:00:00Z",
  },
  {
    id: 4,
    name: "API Gateway Service",
    description:
      "Microservices API gateway with authentication and rate limiting",
    user_id: 1,
    is_public: false,
    settings: {},
    start_date: "2024-04-01",
    end_date: "2024-07-15",
    created_at: "2024-03-20T16:00:00Z",
    updated_at: "2024-04-01T07:30:00Z",
  },
  {
    id: 5,
    name: "Machine Learning Pipeline",
    description: "Automated ML pipeline for data processing and model training",
    user_id: 3,
    is_public: true,
    settings: {},
    start_date: "2024-02-15",
    end_date: "2024-10-31",
    created_at: "2024-02-10T13:00:00Z",
    updated_at: "2024-02-15T12:00:00Z",
  },
  {
    id: 6,
    name: "DevOps Automation",
    description: "CI/CD pipeline automation with Docker and Kubernetes",
    user_id: 2,
    is_public: false,
    settings: {},
    start_date: "2024-01-01",
    end_date: "2024-05-30",
    created_at: "2023-12-20T10:00:00Z",
    updated_at: "2024-01-01T09:00:00Z",
  },
  {
    id: 7,
    name: "Blockchain Wallet",
    description: "Secure cryptocurrency wallet with multi-chain support",
    user_id: 3,
    is_public: true,
    settings: {},
    start_date: "2024-05-01",
    end_date: "2024-12-31",
    created_at: "2024-04-15T15:00:00Z",
    updated_at: "2024-05-01T10:00:00Z",
  },
  {
    id: 8,
    name: "IoT Monitoring System",
    description: "Real-time IoT device monitoring with MQTT and WebSockets",
    user_id: 2,
    is_public: false,
    settings: {},
    start_date: "2024-03-15",
    end_date: "2024-11-30",
    created_at: "2024-03-10T12:00:00Z",
    updated_at: "2024-03-15T11:00:00Z",
  },
];

// Helper function to generate progress based on current date and project timeline
export function calculateProjectProgress(project: Project): number {
  if (!project.start_date || !project.end_date) return 0;

  const startDate = new Date(project.start_date);
  const endDate = new Date(project.end_date);
  const currentDate = new Date();

  if (currentDate < startDate) return 0;
  if (currentDate > endDate) return 100;

  const totalDuration = endDate.getTime() - startDate.getTime();
  const elapsed = currentDate.getTime() - startDate.getTime();

  return Math.round((elapsed / totalDuration) * 100);
}

// Helper function to get project status based on dates
export function getProjectStatus(
  project: Project,
): "not_started" | "in_progress" | "completed" | "overdue" {
  if (!project.start_date || !project.end_date) return "in_progress";

  const startDate = new Date(project.start_date);
  const endDate = new Date(project.end_date);
  const currentDate = new Date();

  if (currentDate < startDate) return "not_started";
  if (currentDate > endDate) return "overdue";

  const progress = calculateProjectProgress(project);
  return progress >= 100 ? "completed" : "in_progress";
}

// Helper function to get days remaining in project
export function getDaysRemaining(project: Project): number | null {
  if (!project.end_date) return null;

  const endDate = new Date(project.end_date);
  const currentDate = new Date();
  const diffTime = endDate.getTime() - currentDate.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  return diffDays;
}

// Helper function to format date range for display
export function formatDateRange(startDate?: string, endDate?: string): string {
  if (!startDate && !endDate) return "No dates set";
  if (!startDate) return `Ends ${new Date(endDate!).toLocaleDateString()}`;
  if (!endDate) return `Starts ${new Date(startDate).toLocaleDateString()}`;

  const start = new Date(startDate).toLocaleDateString();
  const end = new Date(endDate).toLocaleDateString();
  return `${start} - ${end}`;
}
