import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { securityApi } from "@/lib/api/security";

export const securityKeys = {
  all: ["security"] as const,
  settings: () => [...securityKeys.all, "settings"] as const,
  overview: () => [...securityKeys.all, "overview"] as const,
};

export function useSecuritySettings() {
  return useQuery({ queryKey: securityKeys.settings(), queryFn: () => securityApi.getSettings() });
}

export function useSecurityOverview() {
  return useQuery({ queryKey: securityKeys.overview(), queryFn: () => securityApi.getOverview() });
}

export function useUpdateSecuritySettings() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: securityApi.updateSettings, onSuccess: () => qc.invalidateQueries({ queryKey: securityKeys.settings() }) });
}

export function useSetup2FA() {
  return useMutation({ mutationFn: securityApi.setup2FA });
}

export function useVerify2FA() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: securityApi.verify2FA, onSuccess: () => qc.invalidateQueries({ queryKey: securityKeys.settings() }) });
}

export function useDisable2FA() {
  const qc = useQueryClient();
  return useMutation({ mutationFn: securityApi.disable2FA, onSuccess: () => qc.invalidateQueries({ queryKey: securityKeys.settings() }) });
}

export function useReportViolation() {
  return useMutation({ mutationFn: securityApi.reportViolation });
}
