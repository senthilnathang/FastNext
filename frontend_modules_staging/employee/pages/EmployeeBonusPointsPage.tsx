"use client";

import { GenericModuleList } from "../components/GenericModuleList";
import { useBonusPoints } from "../hooks/useEmployees";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "../api/employeeApi";
import { employeeKeys } from "../hooks/useEmployees";
import type { BonusPoint } from "../types";

function useDeleteBonusPoint() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => employeeApi.bonusPoints.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: employeeKeys.bonusPoints() });
    },
  });
}

export default function EmployeeBonusPointsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Bonus Points</h1>
        <p className="text-muted-foreground">Track and manage employee bonus points</p>
      </div>
      <GenericModuleList<BonusPoint>
        title="Bonus Points"
        useListQuery={useBonusPoints}
        useDeleteMutation={useDeleteBonusPoint}
        columns={[
          { key: "id", header: "ID" },
          { key: "name", header: "Name" },
          { key: "points", header: "Points", render: (item) => String(item.points ?? 0) },
          { key: "reason", header: "Reason" },
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
