import { getApiUrl } from "./config";

export interface WorkflowType {
  id: number;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active: boolean;
  created_by: number;
  created_at: string;
  updated_at?: string;
}

export interface WorkflowTypeCreate {
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
}

export interface WorkflowTypeUpdate {
  name?: string;
  description?: string;
  icon?: string;
  color?: string;
  is_active?: boolean;
}

export interface WorkflowState {
  id: number;
  name: string;
  label: string;
  description?: string;
  color: string;
  bg_color: string;
  icon: string;
  is_initial: boolean;
  is_final: boolean;
  created_at: string;
}

export interface WorkflowStateCreate {
  name: string;
  label: string;
  description?: string;
  color?: string;
  bg_color?: string;
  icon?: string;
  is_initial?: boolean;
  is_final?: boolean;
}

export interface WorkflowTemplate {
  id: number;
  name: string;
  description?: string;
  workflow_type_id: number;
  default_state_id?: number;
  is_active: boolean;
  nodes: any[];
  edges: any[];
  settings: Record<string, any>;
  created_by: number;
  created_at: string;
  updated_at?: string;
  workflow_type?: WorkflowType;
  default_state?: WorkflowState;
}

export interface WorkflowTemplateCreate {
  name: string;
  description?: string;
  workflow_type_id: number;
  default_state_id?: number;
  is_active?: boolean;
  nodes?: any[];
  edges?: any[];
  settings?: Record<string, any>;
}

export interface WorkflowTemplateUpdate {
  name?: string;
  description?: string;
  default_state_id?: number;
  is_active?: boolean;
  nodes?: any[];
  edges?: any[];
  settings?: Record<string, any>;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pages: number;
  size: number;
}

class WorkflowAPI {
  private getAuthHeaders() {
    const token =
      typeof window !== "undefined"
        ? localStorage.getItem("access_token")
        : null;
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    };
  }

  // Workflow Types API
  async getWorkflowTypes(
    params: { skip?: number; limit?: number; search?: string } = {},
  ): Promise<PaginatedResponse<WorkflowType>> {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set("skip", params.skip.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.search) searchParams.set("search", params.search);

    const response = await fetch(
      `${getApiUrl("/api/v1/workflow-types")}?${searchParams}`,
      {
        headers: this.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch workflow types");
    }

    return response.json();
  }

  async createWorkflowType(data: WorkflowTypeCreate): Promise<WorkflowType> {
    const response = await fetch(getApiUrl("/api/v1/workflow-types"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create workflow type");
    }

    return response.json();
  }

  async updateWorkflowType(
    id: number,
    data: WorkflowTypeUpdate,
  ): Promise<WorkflowType> {
    const response = await fetch(getApiUrl(`/api/v1/workflow-types/${id}`), {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to update workflow type");
    }

    return response.json();
  }

  async deleteWorkflowType(id: number): Promise<{ message: string }> {
    const response = await fetch(getApiUrl(`/api/v1/workflow-types/${id}`), {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    });

    if (!response.ok) {
      throw new Error("Failed to delete workflow type");
    }

    return response.json();
  }

  // Workflow States API
  async getWorkflowStates(
    params: { skip?: number; limit?: number; search?: string } = {},
  ): Promise<PaginatedResponse<WorkflowState>> {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set("skip", params.skip.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.search) searchParams.set("search", params.search);

    const response = await fetch(
      `${getApiUrl("/api/v1/workflow-states")}?${searchParams}`,
      {
        headers: this.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch workflow states");
    }

    return response.json();
  }

  async createWorkflowState(data: WorkflowStateCreate): Promise<WorkflowState> {
    const response = await fetch(getApiUrl("/api/v1/workflow-states"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create workflow state");
    }

    return response.json();
  }

  // Workflow Templates API
  async getWorkflowTemplates(
    params: {
      skip?: number;
      limit?: number;
      search?: string;
      workflow_type_id?: number;
    } = {},
  ): Promise<PaginatedResponse<WorkflowTemplate>> {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set("skip", params.skip.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.search) searchParams.set("search", params.search);
    if (params.workflow_type_id)
      searchParams.set("workflow_type_id", params.workflow_type_id.toString());

    const response = await fetch(
      `${getApiUrl("/api/v1/workflow-templates")}?${searchParams}`,
      {
        headers: this.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch workflow templates");
    }

    return response.json();
  }

  async getWorkflowTemplate(id: number): Promise<WorkflowTemplate> {
    const response = await fetch(
      getApiUrl(`/api/v1/workflow-templates/${id}`),
      {
        headers: this.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch workflow template");
    }

    return response.json();
  }

  async createWorkflowTemplate(
    data: WorkflowTemplateCreate,
  ): Promise<WorkflowTemplate> {
    const response = await fetch(getApiUrl("/api/v1/workflow-templates"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create workflow template");
    }

    return response.json();
  }

  async updateWorkflowTemplate(
    id: number,
    data: WorkflowTemplateUpdate,
  ): Promise<WorkflowTemplate> {
    const response = await fetch(
      getApiUrl(`/api/v1/workflow-templates/${id}`),
      {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update workflow template");
    }

    return response.json();
  }

  async deleteWorkflowTemplate(id: number): Promise<{ message: string }> {
    const response = await fetch(
      getApiUrl(`/api/v1/workflow-templates/${id}`),
      {
        method: "DELETE",
        headers: this.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to delete workflow template");
    }

    return response.json();
  }

  // Workflow Instances API
  async getWorkflowInstances(
    params: {
      skip?: number;
      limit?: number;
      entity_type?: string;
      status?: string;
      workflow_type_id?: number;
    } = {},
  ): Promise<PaginatedResponse<any>> {
    const searchParams = new URLSearchParams();
    if (params.skip) searchParams.set("skip", params.skip.toString());
    if (params.limit) searchParams.set("limit", params.limit.toString());
    if (params.entity_type) searchParams.set("entity_type", params.entity_type);
    if (params.status) searchParams.set("status", params.status);
    if (params.workflow_type_id)
      searchParams.set("workflow_type_id", params.workflow_type_id.toString());

    const response = await fetch(
      `${getApiUrl("/api/v1/workflow-instances")}?${searchParams}`,
      {
        headers: this.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch workflow instances");
    }

    return response.json();
  }

  async getWorkflowInstance(id: number): Promise<any> {
    const response = await fetch(
      getApiUrl(`/api/v1/workflow-instances/${id}`),
      {
        headers: this.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch workflow instance");
    }

    return response.json();
  }

  async createWorkflowInstance(data: any): Promise<any> {
    const response = await fetch(getApiUrl("/api/v1/workflow-instances"), {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error("Failed to create workflow instance");
    }

    return response.json();
  }

  async updateWorkflowInstance(id: number, data: any): Promise<any> {
    const response = await fetch(
      getApiUrl(`/api/v1/workflow-instances/${id}`),
      {
        method: "PUT",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(data),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to update workflow instance");
    }

    return response.json();
  }

  async executeWorkflowAction(instanceId: number, action: any): Promise<any> {
    const response = await fetch(
      getApiUrl(`/api/v1/workflow-instances/${instanceId}/actions`),
      {
        method: "POST",
        headers: this.getAuthHeaders(),
        body: JSON.stringify(action),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to execute workflow action");
    }

    return response.json();
  }

  async getWorkflowHistory(instanceId: number): Promise<any[]> {
    const response = await fetch(
      getApiUrl(`/api/v1/workflow-instances/${instanceId}/history`),
      {
        headers: this.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch workflow history");
    }

    return response.json();
  }

  async getAvailableActions(instanceId: number): Promise<any> {
    const response = await fetch(
      getApiUrl(`/api/v1/workflow-instances/${instanceId}/available-actions`),
      {
        headers: this.getAuthHeaders(),
      },
    );

    if (!response.ok) {
      throw new Error("Failed to fetch available actions");
    }

    return response.json();
  }
}

export const workflowAPI = new WorkflowAPI();
