'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { workflowAPI, WorkflowTypeCreate, WorkflowTypeUpdate, WorkflowStateCreate, WorkflowTemplateCreate, WorkflowTemplateUpdate } from '@/shared/services/api/workflow';

// Workflow Types hooks
export function useWorkflowTypes(params: {
  skip?: number;
  limit?: number;
  search?: string;
} = {}) {
  return useQuery({
    queryKey: ['workflow-types', params],
    queryFn: () => workflowAPI.getWorkflowTypes(params),
  });
}

export function useCreateWorkflowType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: WorkflowTypeCreate) => workflowAPI.createWorkflowType(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-types'] });
    },
  });
}

export function useUpdateWorkflowType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WorkflowTypeUpdate }) => 
      workflowAPI.updateWorkflowType(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-types'] });
    },
  });
}

export function useDeleteWorkflowType() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => workflowAPI.deleteWorkflowType(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-types'] });
    },
  });
}

// Workflow States hooks
export function useWorkflowStates(params: {
  skip?: number;
  limit?: number;
  search?: string;
} = {}) {
  return useQuery({
    queryKey: ['workflow-states', params],
    queryFn: () => workflowAPI.getWorkflowStates(params),
  });
}

export function useCreateWorkflowState() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: WorkflowStateCreate) => workflowAPI.createWorkflowState(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-states'] });
    },
  });
}

// Workflow Templates hooks
export function useWorkflowTemplates(params: {
  skip?: number;
  limit?: number;
  search?: string;
  workflow_type_id?: number;
} = {}) {
  return useQuery({
    queryKey: ['workflow-templates', params],
    queryFn: () => workflowAPI.getWorkflowTemplates(params),
  });
}

export function useWorkflowTemplate(id: number) {
  return useQuery({
    queryKey: ['workflow-template', id],
    queryFn: () => workflowAPI.getWorkflowTemplate(id),
    enabled: !!id,
  });
}

export function useCreateWorkflowTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: WorkflowTemplateCreate) => workflowAPI.createWorkflowTemplate(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
    },
  });
}

export function useUpdateWorkflowTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: WorkflowTemplateUpdate }) => 
      workflowAPI.updateWorkflowTemplate(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-template', id] });
    },
  });
}

export function useDeleteWorkflowTemplate() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (id: number) => workflowAPI.deleteWorkflowTemplate(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-templates'] });
    },
  });
}

// Workflow Instances hooks
export function useWorkflowInstances(params: {
  skip?: number;
  limit?: number;
  entity_type?: string;
  status?: string;
  workflow_type_id?: number;
} = {}) {
  return useQuery({
    queryKey: ['workflow-instances', params],
    queryFn: () => workflowAPI.getWorkflowInstances(params),
  });
}

export function useWorkflowInstance(id: number) {
  return useQuery({
    queryKey: ['workflow-instance', id],
    queryFn: () => workflowAPI.getWorkflowInstance(id),
    enabled: !!id,
  });
}

export function useCreateWorkflowInstance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: any) => workflowAPI.createWorkflowInstance(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
    },
  });
}

export function useUpdateWorkflowInstance() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: any }) => 
      workflowAPI.updateWorkflowInstance(id, data),
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instance', id] });
    },
  });
}

export function useExecuteWorkflowAction() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ instanceId, action }: { instanceId: number; action: any }) => 
      workflowAPI.executeWorkflowAction(instanceId, action),
    onSuccess: (_, { instanceId }) => {
      queryClient.invalidateQueries({ queryKey: ['workflow-instances'] });
      queryClient.invalidateQueries({ queryKey: ['workflow-instance', instanceId] });
    },
  });
}