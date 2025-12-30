"use client";

import { List } from "lucide-react";

export default function DemoItemsPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <List className="h-6 w-6" />
          Demo Items
        </h1>
        <p className="text-gray-500 mt-1">
          Sample items demonstrating CRUD operations
        </p>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-6 text-center text-gray-500">
          Demo items will be displayed here when the module is fully configured.
        </div>
      </div>
    </div>
  );
}
