"use client";

import { GenericModuleList } from "../components/GenericModuleList";
import { useDisciplinaryActions } from "../hooks/useEmployees";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import { employeeKeys } from "../hooks/useEmployees";
import type { DisciplinaryAction } from "../types";

function useDeleteDisciplinaryAction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeApi.disciplinaryActions.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.disciplinaryActions() });
    },
  });
}

export default function EmployeeDisciplinaryPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Disciplinary Actions</h1>
        <p className="text-muted-foreground">Manage employee disciplinary records</p>
      </div>
      <GenericModuleList<DisciplinaryAction>
        title="Disciplinary Actions"
        useListQuery={useDisciplinaryActions}
        useDeleteMutation={useDeleteDisciplinaryAction}
        columns={[
          { key: "id", header: "ID" },
          { key: "name", header: "Name" },
          { key: "action_type", header: "Type" },
          { key: "description", header: "Description" },
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
