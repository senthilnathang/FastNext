"use client";

import { Package } from "lucide-react";

export default function DemoPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <Package className="h-6 w-6" />
          Demo Module
        </h1>
        <p className="text-gray-500 mt-1">
          Demonstration module showcasing the FastNext module system
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Module Features
          </h3>
          <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
            <li>- Dynamic loading</li>
            <li>- Menu integration</li>
            <li>- API endpoints</li>
            <li>- Database models</li>
          </ul>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="font-semibold text-gray-900 dark:text-white mb-2">
            Status
          </h3>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
              Installed
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
