/**
 * Tests for Inbox API client
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { inboxApi } from '@/lib/api';
import { server } from '../../mocks/server';
import { http, HttpResponse } from 'msw';

const API_URL = 'http://localhost:8000/api/v1';

describe('Inbox API', () => {
  describe('list', () => {
    it('fetches inbox items', async () => {
      const result = await inboxApi.list({});

      expect(result.items).toBeDefined();
      expect(Array.isArray(result.items)).toBe(true);
      expect(result.total).toBeGreaterThanOrEqual(0);
    });

    it('fetches inbox items with pagination', async () => {
      const result = await inboxApi.list({ skip: 0, limit: 10 });

      expect(result.items).toBeDefined();
    });
  });

  describe('get', () => {
    it('fetches a single inbox item', async () => {
      const result = await inboxApi.get(1);

      expect(result).toBeDefined();
      expect(result.id).toBe(1);
    });

    it('throws error for non-existent item', async () => {
      server.use(
        http.get(`${API_URL}/inbox/999`, () => {
          return new HttpResponse(null, { status: 404 });
        })
      );

      await expect(inboxApi.get(999)).rejects.toThrow();
    });
  });

  describe('markRead', () => {
    it('marks item as read', async () => {
      const result = await inboxApi.markRead(1);

      expect(result.is_read).toBe(true);
    });
  });

  describe('stats', () => {
    it('fetches inbox stats', async () => {
      const result = await inboxApi.stats.get();

      expect(result.total).toBeDefined();
      expect(result.unread).toBeDefined();
      expect(result.by_type).toBeDefined();
    });
  });

  describe('labels', () => {
    it('fetches all labels', async () => {
      const result = await inboxApi.labels.list();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThan(0);
    });

    it('creates a new label', async () => {
      const newLabel = {
        name: 'Test Label',
        color: '#FF0000',
      };

      const result = await inboxApi.labels.create(newLabel);

      expect(result.id).toBeDefined();
      expect(result.name).toBe('Test Label');
    });
  });
});
