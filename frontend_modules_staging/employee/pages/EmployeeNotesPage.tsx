"use client";

import { GenericModuleList } from "../components/GenericModuleList";
import { useEmployeeNotes, useDeleteNote } from "../hooks/useEmployees";
import type { EmployeeNote } from "../types";
import { Badge } from "@/shared/components/ui/badge";

export default function EmployeeNotesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employee Notes</h1>
        <p className="text-muted-foreground">Manage employee notes and records</p>
      </div>
      <GenericModuleList<EmployeeNote>
        title="Notes"
        useListQuery={useEmployeeNotes}
        useDeleteMutation={useDeleteNote}
        columns={[
          { key: "id", header: "ID" },
          { key: "title", header: "Title" },
          {
            key: "is_private",
            header: "Visibility",
            render: (item) => (
              <Badge variant={item.is_private ? "secondary" : "default"}>
                {item.is_private ? "Private" : "Public"}
              </Badge>
            ),
          },
          {
            key: "created_at",
            header: "Created",
            render: (item) =>
              item.created_at
                ? new Date(item.created_at).toLocaleDateString()
                : "—",
          },
        ]}
      />
    </div>
  );
}
