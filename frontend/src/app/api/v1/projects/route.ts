import { NextRequest, NextResponse } from 'next/server';
import type { CreateProjectRequest } from '@/shared/types';
import { projectsStore } from '@/lib/data/projects';

// GET /api/v1/projects - List projects
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const skip = parseInt(searchParams.get('skip') || '0');
    const limit = parseInt(searchParams.get('limit') || '100');
    const search = searchParams.get('search');
    const is_public = searchParams.get('is_public');

    const filters = {
      search: search || undefined,
      is_public: is_public ? is_public === 'true' : undefined,
      skip,
      limit
    };

    const filteredProjects = projectsStore.filter(filters);

    return NextResponse.json(filteredProjects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

// POST /api/v1/projects - Create project
export async function POST(request: NextRequest) {
  try {
    const body: CreateProjectRequest = await request.json();

    // Validate required fields
    if (!body.name) {
      return NextResponse.json(
        { error: 'Project name is required' },
        { status: 400 }
      );
    }

    // Validate date fields if provided
    if (body.start_date && body.end_date) {
      const startDate = new Date(body.start_date);
      const endDate = new Date(body.end_date);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return NextResponse.json(
          { error: 'Invalid date format. Use YYYY-MM-DD format.' },
          { status: 400 }
        );
      }
      
      if (endDate < startDate) {
        return NextResponse.json(
          { error: 'End date must be after start date' },
          { status: 400 }
        );
      }
    }

    // Create new project
    const newProject = projectsStore.create({
      name: body.name,
      description: body.description || undefined,
      user_id: 1, // TODO: Get from authentication
      is_public: body.is_public || false,
      settings: body.settings || {},
      start_date: body.start_date || undefined,
      end_date: body.end_date || undefined
    });

    return NextResponse.json(newProject, { status: 201 });
  } catch (error) {
    console.error('Error creating project:', error);
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    );
  }
}