import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recordRulesApi } from "@/lib/api/record-rules";

export const recordRulesKeys = {
  all: ["recordRules"] as const,
  list: () => [...recordRulesKeys.all, "list"] as const,
  forModel: (modelName: string) => [...recordRulesKeys.all, "forModel", modelName] as const,
  detail: (id: number) => [...recordRulesKeys.all, "detail", id] as const,
};

export function useRecordRules() {
  return useQuery({ queryKey: recordRulesKeys.list(), queryFn: () => recordRulesApi.list() });
}

export function useModelRecordRules(modelName: string) {
  return useQuery({ queryKey: recordRulesKeys.forModel(modelName), queryFn: () => recordRulesApi.getForModel(modelName), enabled: !!modelName });
}

export function useRecordRule(id: number) {
  return useQuery({ queryKey: recordRulesKeys.detail(id), queryFn: () => recordRulesApi.get(id), enabled: !!id });
}

export function useCreateRecordRule() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: recordRulesApi.create, onSuccess: () => qc.invalidateQueries({ queryKey: recordRulesKeys.all }) });
}

export function useUpdateRecordRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: number; data: Parameters<typeof recordRulesApi.update>[1] }) => recordRulesApi.update(id, data),
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: recordRulesKeys.list() });
      qc.invalidateQueries({ queryKey: recordRulesKeys.detail(variables.id) });
    },
  });
}

export function useDeleteRecordRule() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => recordRulesApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: recordRulesKeys.all }),
  });
}

export function useCheckRecordAccess() {
  return useMutation({ mutationFn: recordRulesApi.checkAccess });
}
