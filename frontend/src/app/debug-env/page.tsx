"use client";

import { API_CONFIG } from "@/shared/services/api/config";

export default function DebugEnvPage() {
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Environment Debug</h1>
      <div className="space-y-2">
        <p>
          <strong>API_BASE_URL:</strong> {API_CONFIG.API_BASE_URL || "EMPTY"}
        </p>
        <p>
          <strong>NEXT_PUBLIC_API_URL:</strong>{" "}
          {process.env.NEXT_PUBLIC_API_URL || "UNDEFINED"}
        </p>
        <p>
          <strong>NODE_ENV:</strong> {process.env.NODE_ENV}
        </p>
      </div>
      <div className="mt-4">
        <h2 className="text-lg font-semibold">All NEXT_PUBLIC env vars:</h2>
        <pre className="bg-gray-100 p-2 mt-2 rounded">
          {JSON.stringify(
            Object.keys(process.env)
              .filter((key) => key.startsWith("NEXT_PUBLIC"))
              .reduce((acc, key) => ({ ...acc, [key]: process.env[key] }), {}),
            null,
            2,
          )}
        </pre>
      </div>
    </div>
  );
}
