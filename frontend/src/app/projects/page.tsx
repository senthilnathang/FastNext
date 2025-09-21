'use client';

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/components/card';
import { Building2, Plus } from 'lucide-react';
import { Button } from '@/shared/components/button';

export default function ProjectsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Building2 className="h-8 w-8 text-blue-600" />
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Projects</h1>
            <p className="text-gray-600 dark:text-gray-400">
              Manage your projects and applications
            </p>
          </div>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          New Project
        </Button>
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle>Sample Project 1</CardTitle>
            <CardDescription>
              A sample project for demonstration purposes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Last updated: 2 days ago</span>
              <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                Active
              </span>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow cursor-pointer">
          <CardHeader>
            <CardTitle>Sample Project 2</CardTitle>
            <CardDescription>
              Another sample project for demonstration
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Last updated: 1 week ago</span>
              <span className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded-full">
                In Progress
              </span>
            </div>
          </CardContent>
        </Card>

        {/* Create new project card */}
        <Card className="border-dashed border-2 hover:border-blue-500 transition-colors cursor-pointer">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Plus className="h-12 w-12 text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
              Create New Project
            </h3>
            <p className="text-sm text-gray-500 text-center">
              Start a new project and build something amazing
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}