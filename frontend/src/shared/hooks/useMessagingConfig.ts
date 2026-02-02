import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messagingConfigApi } from "@/lib/api/messaging-config";

export const messagingConfigKeys = {
  all: ["messagingConfig"] as const,
  list: () => [...messagingConfigKeys.all, "list"] as const,
  detail: (id: number) => [...messagingConfigKeys.all, "detail", id] as const,
};

export function useMessagingConfigs() {
  return useQuery({ queryKey: messagingConfigKeys.list(), queryFn: () => messagingConfigApi.list() });
}

export function useMessagingConfig(id: number) {
  return useQuery({ queryKey: messagingConfigKeys.detail(id), queryFn: () => messagingConfigApi.get(id), enabled: !!id });
}

export function useCreateMessagingConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: messagingConfigApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: messagingConfigKeys.list() }) });
}

export function useUpdateMessagingConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof messagingConfigApi.update>[1] }) => messagingConfigApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: messagingConfigKeys.list() });
      qc.invalidateQueries({ queryKey: messagingConfigKeys.detail(variables.id) });
    },
  });
}

export function useDeleteMessagingConfig() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => messagingConfigApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: messagingConfigKeys.list() }),
  });
}

export function useEnsureDefaultConfig() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: messagingConfigApi.ensureDefault, onSuccess: () => qc.invalidateQueries({ queryKey: messagingConfigKeys.list() }) });
}
