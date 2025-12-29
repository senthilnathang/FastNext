/**
 * MSW Request Handlers
 *
 * Define mock API handlers for testing.
 * These handlers intercept network requests and return mock data.
 */

import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:8000/api/v1';

// Mock data
export const mockUsers = [
  {
    id: 1,
    email: 'admin@test.com',
    username: 'admin',
    full_name: 'Admin User',
    is_active: true,
    is_superuser: true,
    is_verified: true,
  },
  {
    id: 2,
    email: 'user@test.com',
    username: 'user',
    full_name: 'Regular User',
    is_active: true,
    is_superuser: false,
    is_verified: true,
  },
];

export const mockProjects = [
  {
    id: 1,
    name: 'Test Project',
    description: 'A test project for development',
    user_id: 1,
    is_public: false,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'Public Project',
    description: 'A public test project',
    user_id: 1,
    is_public: true,
    created_at: '2024-01-02T00:00:00Z',
  },
];

export const mockInboxItems = [
  {
    id: 1,
    user_id: 1,
    item_type: 'notification',
    title: 'Welcome to FastNext',
    preview: 'Thank you for joining our platform.',
    is_read: false,
    is_archived: false,
    is_starred: false,
    priority: 'normal',
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    user_id: 1,
    item_type: 'message',
    title: 'New message from Admin',
    preview: 'Hello! This is a test message.',
    is_read: true,
    is_archived: false,
    is_starred: true,
    priority: 'high',
    created_at: '2024-01-02T00:00:00Z',
  },
];

export const mockMessages = [
  {
    id: 1,
    model_name: 'projects',
    record_id: 1,
    user_id: 1,
    subject: 'Project kickoff',
    body: 'Welcome to the project!',
    message_type: 'comment',
    level: 'info',
    is_deleted: false,
    created_at: '2024-01-01T00:00:00Z',
  },
];

export const mockLabels = [
  { id: 1, name: 'Important', color: '#EF4444', description: 'Important items' },
  { id: 2, name: 'Work', color: '#3B82F6', description: 'Work related' },
  { id: 3, name: 'Personal', color: '#10B981', description: 'Personal items' },
];

export const mockModules = [
  {
    name: 'base',
    version: '1.0.0',
    state: 'installed',
    description: 'Base module with core features',
    auto_install: true,
  },
  {
    name: 'messaging',
    version: '1.0.0',
    state: 'installed',
    description: 'Messaging and communication module',
    auto_install: false,
  },
];

// API Handlers
export const handlers = [
  // Auth endpoints
  http.post(`${API_URL}/auth/login`, async ({ request }) => {
    const body = await request.formData();
    const username = body.get('username');
    const password = body.get('password');

    if (username === 'admin@test.com' && password === 'testpassword123') {
      return HttpResponse.json({
        access_token: 'mock-jwt-token',
        token_type: 'bearer',
      });
    }

    return new HttpResponse(null, { status: 401 });
  }),

  http.get(`${API_URL}/users/me`, ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (!auth || !auth.startsWith('Bearer ')) {
      return new HttpResponse(null, { status: 401 });
    }

    return HttpResponse.json(mockUsers[0]);
  }),

  // Users endpoints
  http.get(`${API_URL}/users`, () => {
    return HttpResponse.json({
      items: mockUsers,
      total: mockUsers.length,
      page: 1,
      pages: 1,
      size: 20,
    });
  }),

  http.get(`${API_URL}/users/:id`, ({ params }) => {
    const user = mockUsers.find((u) => u.id === Number(params.id));
    if (!user) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(user);
  }),

  // Projects endpoints
  http.get(`${API_URL}/projects`, () => {
    return HttpResponse.json({
      items: mockProjects,
      total: mockProjects.length,
      page: 1,
      pages: 1,
      size: 20,
    });
  }),

  http.get(`${API_URL}/projects/:id`, ({ params }) => {
    const project = mockProjects.find((p) => p.id === Number(params.id));
    if (!project) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(project);
  }),

  http.post(`${API_URL}/projects`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newProject = {
      id: mockProjects.length + 1,
      ...body,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(newProject, { status: 201 });
  }),

  // Inbox endpoints
  http.get(`${API_URL}/inbox`, () => {
    return HttpResponse.json({
      items: mockInboxItems,
      total: mockInboxItems.length,
      page: 1,
      pages: 1,
      size: 20,
    });
  }),

  http.get(`${API_URL}/inbox/stats`, () => {
    return HttpResponse.json({
      total: mockInboxItems.length,
      unread: mockInboxItems.filter((i) => !i.is_read).length,
      by_type: {
        notification: 1,
        message: 1,
      },
      by_priority: {
        normal: 1,
        high: 1,
      },
      actionable: 0,
      starred: 1,
      pinned: 0,
    });
  }),

  // Labels endpoints (must be before /inbox/:id to avoid matching "labels" as an id)
  http.get(`${API_URL}/inbox/labels`, () => {
    return HttpResponse.json(mockLabels);
  }),

  http.post(`${API_URL}/inbox/labels`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newLabel = {
      id: mockLabels.length + 1,
      ...body,
    };
    return HttpResponse.json(newLabel, { status: 201 });
  }),

  http.get(`${API_URL}/inbox/:id`, ({ params }) => {
    const item = mockInboxItems.find((i) => i.id === Number(params.id));
    if (!item) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(item);
  }),

  http.post(`${API_URL}/inbox/:id/read`, ({ params }) => {
    const item = mockInboxItems.find((i) => i.id === Number(params.id));
    if (!item) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ ...item, is_read: true });
  }),

  // Messages endpoints
  http.get(`${API_URL}/messages`, ({ request }) => {
    const url = new URL(request.url);
    const modelName = url.searchParams.get('model_name');
    const recordId = url.searchParams.get('record_id');

    let filtered = mockMessages;
    if (modelName) {
      filtered = filtered.filter((m) => m.model_name === modelName);
    }
    if (recordId) {
      filtered = filtered.filter((m) => m.record_id === Number(recordId));
    }

    return HttpResponse.json({
      items: filtered,
      total: filtered.length,
    });
  }),

  http.post(`${API_URL}/messages`, async ({ request }) => {
    const body = await request.json() as Record<string, unknown>;
    const newMessage = {
      id: mockMessages.length + 1,
      ...body,
      created_at: new Date().toISOString(),
    };
    return HttpResponse.json(newMessage, { status: 201 });
  }),

  // Modules endpoints
  http.get(`${API_URL}/modules`, () => {
    return HttpResponse.json(mockModules);
  }),

  http.get(`${API_URL}/modules/:name`, ({ params }) => {
    const module = mockModules.find((m) => m.name === params.name);
    if (!module) {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json(module);
  }),
];
