'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  reactionsApi,
  type Reaction,
  type ReactionSummary,
  type ToggleReactionResponse,
} from '@/lib/api/reactions';

export const reactionKeys = {
  all: ['reactions'] as const,
  summary: (messageId: number) => [...reactionKeys.all, 'summary', messageId] as const,
};

export function useReactionSummary(messageId: number) {
  return useQuery({
    queryKey: reactionKeys.summary(messageId),
    queryFn: () => reactionsApi.getSummary(messageId),
    enabled: !!messageId,
    staleTime: 30_000,
  });
}

export function useToggleReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      reactionsApi.toggle(messageId, emoji),
    onSuccess: (_data, { messageId }) =>
      qc.invalidateQueries({ queryKey: reactionKeys.summary(messageId) }),
  });
}

export function useAddReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      reactionsApi.add(messageId, emoji),
    onSuccess: (_data, { messageId }) =>
      qc.invalidateQueries({ queryKey: reactionKeys.summary(messageId) }),
  });
}

export function useRemoveReaction() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ messageId, emoji }: { messageId: number; emoji: string }) =>
      reactionsApi.remove(messageId, emoji),
    onSuccess: (_data, { messageId }) =>
      qc.invalidateQueries({ queryKey: reactionKeys.summary(messageId) }),
  });
}
