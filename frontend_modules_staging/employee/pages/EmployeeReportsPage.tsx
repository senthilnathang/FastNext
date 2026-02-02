"use client";

import { GenericModuleList } from "../components/GenericModuleList";
import { useEmployeeReports } from "../hooks/useEmployees";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import { employeeKeys } from "../hooks/useEmployees";
import type { EmployeeReport } from "../types";

function useDeleteReport() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeApi.reports.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.reports() });
    },
  });
}

export default function EmployeeReportsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Reports</h1>
        <p className="text-muted-foreground">View and manage employee reports</p>
      </div>
      <GenericModuleList<EmployeeReport>
        title="Reports"
        useListQuery={useEmployeeReports}
        useDeleteMutation={useDeleteReport}
        columns={[
          { key: "id", header: "ID" },
          { key: "name", header: "Name" },
          { key: "report_type", header: "Type" },
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
