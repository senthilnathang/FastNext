"use client";

import dynamic from "next/dynamic";
import { Suspense } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Shield } from "lucide-react";

// Lazy load the Project ACL Manager component
const ProjectACLManager = dynamic(
  () => import("@/modules/acl/components/ProjectACLManager"),
  {
    loading: () => (
      <div className="flex items-center justify-center p-8">
        <Card className="w-full max-w-2xl">
          <CardContent className="p-8">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
              <span className="ml-2">Loading Project ACL Manager...</span>
            </div>
          </CardContent>
        </Card>
      </div>
    ),
  }
);

interface ProjectsACLPageProps {
  searchParams: { [key: string]: string | string[] | undefined };
}

export default function ProjectsACLPage({ searchParams }: ProjectsACLPageProps) {
  const projectId = typeof searchParams.projectId === 'string' ? searchParams.projectId : undefined;

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Project ACL Management</h1>
        <p className="text-gray-600 mt-2">
          Manage access control permissions for projects. Grant or revoke specific permissions for users on individual projects.
        </p>
      </div>

      <Suspense fallback={
        <Card className="w-full">
          <CardContent className="p-8">
            <div className="text-center">
              <Shield className="mx-auto h-12 w-12 text-gray-400 animate-pulse" />
              <span className="ml-2">Loading...</span>
            </div>
          </CardContent>
        </Card>
      }>
        {projectId ? (
          <ProjectACLManager projectId={projectId} />
        ) : (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Select a Project
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Please select a project from the projects list to manage its ACL permissions.
              </p>
            </CardContent>
          </Card>
        )}
      </Suspense>
    </div>
  );
}