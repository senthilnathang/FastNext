import type { Project } from "@/shared/types";

// In-memory storage for development - replace with actual database
class ProjectsDataStore {
  private projects: Project[] = [
    {
      id: 1,
      name: "Sample Project",
      description: "A sample project for demonstration",
      user_id: 1,
      is_public: true,
      settings: {},
      start_date: "2024-01-15",
      end_date: "2024-06-30",
      created_at: "2024-01-01T00:00:00Z",
      updated_at: "2024-01-01T00:00:00Z",
    },
    {
      id: 2,
      name: "Backend API Development",
      description: "Building RESTful APIs with FastAPI",
      user_id: 1,
      is_public: false,
      settings: {},
      start_date: "2024-02-01",
      end_date: "2024-05-15",
      created_at: "2024-01-25T10:00:00Z",
      updated_at: "2024-02-01T09:00:00Z",
    },
    {
      id: 3,
      name: "Frontend Dashboard",
      description: "React dashboard with timeline features",
      user_id: 1,
      is_public: true,
      settings: {},
      start_date: "2024-03-01",
      end_date: "2024-08-30",
      created_at: "2024-02-20T14:00:00Z",
      updated_at: "2024-03-01T11:00:00Z",
    },
  ];

  private nextId = 4;

  getAll(): Project[] {
    return [...this.projects];
  }

  getById(id: number): Project | undefined {
    return this.projects.find((p) => p.id === id);
  }

  create(
    projectData: Omit<Project, "id" | "created_at" | "updated_at">,
  ): Project {
    const now = new Date().toISOString();
    const newProject: Project = {
      ...projectData,
      id: this.nextId++,
      created_at: now,
      updated_at: now,
    };

    this.projects.push(newProject);
    return newProject;
  }

  update(
    id: number,
    updates: Partial<Omit<Project, "id" | "created_at">>,
  ): Project | null {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index === -1) {
      return null;
    }

    const updatedProject: Project = {
      ...this.projects[index],
      ...updates,
      updated_at: new Date().toISOString(),
    };

    this.projects[index] = updatedProject;
    return updatedProject;
  }

  delete(id: number): boolean {
    const index = this.projects.findIndex((p) => p.id === id);
    if (index === -1) {
      return false;
    }

    this.projects.splice(index, 1);
    return true;
  }

  filter(filters: {
    search?: string;
    is_public?: boolean;
    user_id?: number;
    skip?: number;
    limit?: number;
  }): Project[] {
    let filtered = [...this.projects];

    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(search) ||
          (p.description && p.description.toLowerCase().includes(search)),
      );
    }

    if (filters.is_public !== undefined) {
      filtered = filtered.filter((p) => p.is_public === filters.is_public);
    }

    if (filters.user_id !== undefined) {
      filtered = filtered.filter((p) => p.user_id === filters.user_id);
    }

    // Apply pagination
    const skip = filters.skip || 0;
    const limit = filters.limit || 100;

    return filtered.slice(skip, skip + limit);
  }
}

// Singleton instance
export const projectsStore = new ProjectsDataStore();
