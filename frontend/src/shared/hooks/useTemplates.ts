'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  templatesApi,
  type TextTemplate,
  type TemplateListParams,
  type CreateTemplateData,
  type UpdateTemplateData,
} from '@/lib/api/templates';

export const templateKeys = {
  all: ['templates'] as const,
  lists: () => [...templateKeys.all, 'list'] as const,
  list: (params?: TemplateListParams) => [...templateKeys.lists(), params] as const,
  detail: (id: number) => [...templateKeys.all, 'detail', id] as const,
};

export function useTemplates(params?: TemplateListParams) {
  return useQuery({
    queryKey: templateKeys.list(params),
    queryFn: () => templatesApi.list(params),
    staleTime: 60_000,
  });
}

export function useTemplate(id: number) {
  return useQuery({
    queryKey: templateKeys.detail(id),
    queryFn: () => templatesApi.get(id),
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateTemplateData) => templatesApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.lists() }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: UpdateTemplateData }) =>
      templatesApi.update(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.lists() }),
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => templatesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: templateKeys.lists() }),
  });
}
