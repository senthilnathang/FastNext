"use client";

/**
 * Employee List Page
 */

import { EmployeeListTable } from "../components/EmployeeListTable";

export default function EmployeeListPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Employees</h1>
        <p className="text-muted-foreground">
          Manage your employee records
        </p>
      </div>
      <EmployeeListTable />
    </div>
  );
}
