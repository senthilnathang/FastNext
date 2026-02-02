'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  bookmarksApi,
  type Bookmark,
  type BookmarkListParams,
  type BookmarkToggleRequest,
  type BookmarkToggleResponse,
  type BookmarkCheckResponse,
} from '@/lib/api/bookmarks';

export const bookmarkKeys = {
  all: ['bookmarks'] as const,
  lists: () => [...bookmarkKeys.all, 'list'] as const,
  list: (params?: BookmarkListParams) => [...bookmarkKeys.lists(), params] as const,
  detail: (id: number) => [...bookmarkKeys.all, 'detail', id] as const,
  check: (type: string, refId: number) => [...bookmarkKeys.all, 'check', type, refId] as const,
};

export function useBookmarks(params?: BookmarkListParams) {
  return useQuery({
    queryKey: bookmarkKeys.list(params),
    queryFn: () => bookmarksApi.list(params),
    staleTime: 60_000,
  });
}

export function useBookmark(id: number) {
  return useQuery({
    queryKey: bookmarkKeys.detail(id),
    queryFn: () => bookmarksApi.get(id),
    enabled: !!id,
  });
}

export function useCreateBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { bookmark_type: string; reference_id: number; note?: string }) =>
      bookmarksApi.create(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookmarkKeys.lists() }),
  });
}

export function useDeleteBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => bookmarksApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookmarkKeys.lists() }),
  });
}

export function useToggleBookmark() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: BookmarkToggleRequest) => bookmarksApi.toggle(data),
    onSuccess: () => qc.invalidateQueries({ queryKey: bookmarkKeys.all }),
  });
}

export function useCheckBookmark(type: string, refId: number) {
  return useQuery({
    queryKey: bookmarkKeys.check(type, refId),
    queryFn: () => bookmarksApi.check({ bookmark_type: type, reference_ids: [refId] }),
    enabled: !!type && !!refId,
    staleTime: 30_000,
  });
}
