"use client";

import dynamic from "next/dynamic";

// Lazy load the ACL manager component
const ACLManager = dynamic(
  () => import("@/modules/acl/components/ACLManager"),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading ACL Manager...</span>
      </div>
    ),
    ssr: false,
  },
);

export default function ACLsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <ACLManager />
    </div>
  );
}