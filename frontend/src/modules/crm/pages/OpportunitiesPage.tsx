"use client";

import { TrendingUp } from "lucide-react";

export default function OpportunitiesPage() {
  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
          <TrendingUp className="h-6 w-6" />
          Opportunities
        </h1>
        <p className="text-gray-500 mt-1">Track sales opportunities</p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 text-center text-gray-500">
        Opportunities pipeline will be displayed here.
      </div>
    </div>
  );
}
