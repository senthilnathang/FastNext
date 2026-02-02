"use client";

import { GenericModuleList } from "../components/GenericModuleList";
import { useEmployeeDocuments, useDeleteDocument } from "../hooks/useEmployees";
import type { EmployeeDocument } from "../types";

export default function EmployeeDocumentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employee Documents</h1>
        <p className="text-muted-foreground">Manage employee documents and files</p>
      </div>
      <GenericModuleList<EmployeeDocument>
        title="Documents"
        useListQuery={useEmployeeDocuments}
        useDeleteMutation={useDeleteDocument}
        columns={[
          { key: "id", header: "ID" },
          { key: "name", header: "Name" },
          { key: "document_type", header: "Type" },
          {
            key: "is_verified",
            header: "Verified",
            render: (item) => (item.is_verified ? "Yes" : "No"),
          },
          {
            key: "expiry_date",
            header: "Expiry",
            render: (item) =>
              item.expiry_date
                ? new Date(item.expiry_date).toLocaleDateString()
                : "—",
          },
        ]}
      />
    </div>
  );
}
