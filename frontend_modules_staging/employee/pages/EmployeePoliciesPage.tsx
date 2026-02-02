"use client";

import { GenericModuleList } from "../components/GenericModuleList";
import { usePolicies } from "../hooks/useEmployees";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import { employeeKeys } from "../hooks/useEmployees";
import type { Policy } from "../types";
import { Badge } from "@/shared/components/ui/badge";

function useDeletePolicy() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeApi.policies.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.policies() });
    },
  });
}

export default function EmployeePoliciesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Policies</h1>
        <p className="text-muted-foreground">Manage organizational policies</p>
      </div>
      <GenericModuleList<Policy>
        title="Policies"
        useListQuery={usePolicies}
        useDeleteMutation={useDeletePolicy}
        columns={[
          { key: "id", header: "ID" },
          { key: "name", header: "Name" },
          { key: "description", header: "Description" },
          {
            key: "is_active",
            header: "Status",
            render: (item) => (
              <Badge variant={item.is_active ? "default" : "secondary"}>
                {item.is_active ? "Active" : "Inactive"}
              </Badge>
            ),
          },
          {
            key: "created_at",
            header: "Created",
            render: (item) =>
              item.created_at ? new Date(item.created_at).toLocaleDateString() : "—",
          },
        ]}
      />
    </div>
  );
}
