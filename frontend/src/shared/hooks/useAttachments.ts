'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  attachmentsApi,
  type Attachment,
  type AttachmentListParams,
  type AttachmentUploadResponse,
} from '@/lib/api/attachments';

export const attachmentKeys = {
  all: ['attachments'] as const,
  lists: () => [...attachmentKeys.all, 'list'] as const,
  list: (params?: AttachmentListParams) => [...attachmentKeys.lists(), params] as const,
  detail: (id: number) => [...attachmentKeys.all, 'detail', id] as const,
};

export function useAttachments(params?: AttachmentListParams) {
  return useQuery({
    queryKey: attachmentKeys.list(params),
    queryFn: () => attachmentsApi.list(params!),
    enabled: !!params,
    staleTime: 60_000,
  });
}

export function useAttachment(id: number) {
  return useQuery({
    queryKey: attachmentKeys.detail(id),
    queryFn: () => attachmentsApi.get(id),
    enabled: !!id,
  });
}

export function useUploadAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, attachableType, attachableId }: {
      file: File;
      attachableType: string;
      attachableId: number;
    }) => attachmentsApi.upload(file, attachableType, attachableId),
    onSuccess: () => qc.invalidateQueries({ queryKey: attachmentKeys.lists() }),
  });
}

export function useDeleteAttachment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => attachmentsApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: attachmentKeys.lists() }),
  });
}
