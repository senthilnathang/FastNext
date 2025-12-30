"use client";

import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="h-6 w-6" />
          CRM Settings
        </h1>
        <p className="text-gray-500 mt-1">Configure CRM module settings</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500">
        CRM settings will be displayed here.
      </div>
    </div>
  );
}
