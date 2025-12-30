"use client";

import { Building } from "lucide-react";

export default function AccountsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Building className="h-6 w-6" />
          Accounts
        </h1>
        <p className="text-gray-500 mt-1">Manage company accounts</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500">
        Accounts list will be displayed here.
      </div>
    </div>
  );
}
