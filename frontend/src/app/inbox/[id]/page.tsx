"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { formatDistanceToNow, format } from 'date-fns';
import {
  ArrowLeft,
  Bell,
  MessageCircle,
  AtSign,
  Activity,
  CheckSquare,
  ThumbsUp,
  Star,
  Pin,
  Archive,
  Trash2,
  ExternalLink,
  Clock,
  User,
  Tag,
  MoreHorizontal,
  Check,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { inboxApi, type InboxItem, type Label, type InboxItemType } from '@/lib/api';

const getItemIcon = (type: InboxItemType) => {
  switch (type) {
    case 'notification':
      return <Bell className="w-5 h-5" />;
    case 'message':
      return <MessageCircle className="w-5 h-5" />;
    case 'mention':
      return <AtSign className="w-5 h-5" />;
    case 'activity':
      return <Activity className="w-5 h-5" />;
    case 'task':
      return <CheckSquare className="w-5 h-5" />;
    case 'approval':
      return <ThumbsUp className="w-5 h-5" />;
    default:
      return <Bell className="w-5 h-5" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent':
      return 'bg-red-100 text-red-700';
    case 'high':
      return 'bg-orange-100 text-orange-700';
    case 'normal':
      return 'bg-gray-100 text-gray-700';
    case 'low':
      return 'bg-gray-50 text-gray-500';
    default:
      return 'bg-gray-100 text-gray-700';
  }
};

const getTypeColor = (type: InboxItemType) => {
  switch (type) {
    case 'notification':
      return 'text-blue-600';
    case 'message':
      return 'text-green-600';
    case 'mention':
      return 'text-purple-600';
    case 'activity':
      return 'text-gray-600';
    case 'task':
      return 'text-amber-600';
    case 'approval':
      return 'text-cyan-600';
    default:
      return 'text-gray-600';
  }
};

export default function InboxDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);

  const [item, setItem] = useState<InboxItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [labels, setLabels] = useState<Label[]>([]);
  const [showLabelDropdown, setShowLabelDropdown] = useState(false);

  // Fetch item
  const fetchItem = useCallback(async () => {
    try {
      setLoading(true);
      const response = await inboxApi.get(id);
      setItem(response);

      // Mark as read if unread
      if (response.status === 'unread') {
        await inboxApi.markRead(id);
        setItem({ ...response, status: 'read' });
      }
    } catch (error) {
      console.error('Failed to fetch inbox item:', error);
    } finally {
      setLoading(false);
    }
  }, [id]);

  // Fetch labels
  const fetchLabels = useCallback(async () => {
    try {
      const response = await inboxApi.labels.list();
      setLabels(response);
    } catch (error) {
      console.error('Failed to fetch labels:', error);
    }
  }, []);

  useEffect(() => {
    fetchItem();
    fetchLabels();
  }, [fetchItem, fetchLabels]);

  const handleToggleStar = async () => {
    if (!item) return;
    try {
      await inboxApi.toggleStar(id);
      setItem({ ...item, is_starred: !item.is_starred });
    } catch (error) {
      console.error('Failed to toggle star:', error);
    }
  };

  const handleTogglePin = async () => {
    if (!item) return;
    try {
      await inboxApi.togglePin(id);
      setItem({ ...item, is_pinned: !item.is_pinned });
    } catch (error) {
      console.error('Failed to toggle pin:', error);
    }
  };

  const handleArchive = async () => {
    try {
      await inboxApi.archive(id);
      router.push('/inbox');
    } catch (error) {
      console.error('Failed to archive:', error);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this item?')) return;
    try {
      await inboxApi.delete(id);
      router.push('/inbox');
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  const handleCompleteAction = async () => {
    if (!item) return;
    try {
      await inboxApi.completeAction(id);
      setItem({ ...item, action_completed: true });
    } catch (error) {
      console.error('Failed to complete action:', error);
    }
  };

  const handleAddLabel = async (labelId: number) => {
    if (!item) return;
    try {
      const updated = await inboxApi.labels.addToItem(id, labelId);
      setItem(updated);
      setShowLabelDropdown(false);
    } catch (error) {
      console.error('Failed to add label:', error);
    }
  };

  const handleRemoveLabel = async (labelId: number) => {
    if (!item) return;
    try {
      const updated = await inboxApi.labels.removeFromItem(id, labelId);
      setItem(updated);
    } catch (error) {
      console.error('Failed to remove label:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="animate-pulse space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-8 h-8 bg-gray-200 rounded" />
              <div className="h-6 bg-gray-200 rounded w-48" />
            </div>
            <div className="bg-white rounded-lg border p-6 space-y-4">
              <div className="h-8 bg-gray-200 rounded w-3/4" />
              <div className="h-4 bg-gray-100 rounded w-1/2" />
              <div className="space-y-2 mt-6">
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-full" />
                <div className="h-4 bg-gray-100 rounded w-2/3" />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Bell className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Item not found</h2>
          <p className="text-gray-500 mb-4">This inbox item may have been deleted</p>
          <button
            onClick={() => router.push('/inbox')}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg"
          >
            Back to Inbox
          </button>
        </div>
      </div>
    );
  }

  const itemLabels = item.labels || [];
  const availableLabels = labels.filter((l) => !itemLabels.some((il) => il.id === l.id));

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button
                onClick={() => router.push('/inbox')}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className={`p-2 rounded-lg bg-gray-100 ${getTypeColor(item.item_type)}`}>
                {getItemIcon(item.item_type)}
              </div>
              <div>
                <span className="text-sm text-gray-500 capitalize">{item.item_type}</span>
                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${getPriorityColor(item.priority)}`}>
                  {item.priority}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleToggleStar}
                className={`p-2 rounded-lg ${
                  item.is_starred
                    ? 'text-yellow-500 bg-yellow-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={item.is_starred ? 'Unstar' : 'Star'}
              >
                <Star className={`w-5 h-5 ${item.is_starred ? 'fill-yellow-500' : ''}`} />
              </button>
              <button
                onClick={handleTogglePin}
                className={`p-2 rounded-lg ${
                  item.is_pinned
                    ? 'text-blue-500 bg-blue-50'
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
                }`}
                title={item.is_pinned ? 'Unpin' : 'Pin'}
              >
                <Pin className="w-5 h-5" />
              </button>
              <button
                onClick={handleArchive}
                className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
                title="Archive"
              >
                <Archive className="w-5 h-5" />
              </button>
              <button
                onClick={handleDelete}
                className="p-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                title="Delete"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg border shadow-sm">
          {/* Title section */}
          <div className="p-6 border-b">
            <h1 className="text-2xl font-bold text-gray-900 mb-2">{item.title}</h1>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
              {item.expires_at && (
                <span className="flex items-center gap-1 text-orange-600">
                  <Clock className="w-4 h-4" />
                  Expires {format(new Date(item.expires_at), 'MMM d, yyyy')}
                </span>
              )}
            </div>
          </div>

          {/* Labels */}
          <div className="px-6 py-4 border-b bg-gray-50">
            <div className="flex items-center gap-2 flex-wrap">
              <Tag className="w-4 h-4 text-gray-400" />
              {itemLabels.map((label) => (
                <span
                  key={label.id}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-sm"
                  style={{
                    backgroundColor: `${label.color}20`,
                    color: label.color,
                  }}
                >
                  {label.icon && <span>{label.icon}</span>}
                  {label.name}
                  <button
                    onClick={() => handleRemoveLabel(label.id)}
                    className="ml-1 p-0.5 hover:bg-white/50 rounded-full"
                  >
                    <span className="sr-only">Remove</span>
                    &times;
                  </button>
                </span>
              ))}

              {/* Add label button */}
              <div className="relative">
                <button
                  onClick={() => setShowLabelDropdown(!showLabelDropdown)}
                  className="inline-flex items-center gap-1 px-2 py-1 text-sm text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full border border-dashed"
                >
                  <span>+</span>
                  Add label
                </button>

                {showLabelDropdown && availableLabels.length > 0 && (
                  <div className="absolute top-full left-0 mt-1 w-48 bg-white border rounded-lg shadow-lg z-10">
                    <div className="py-1">
                      {availableLabels.map((label) => (
                        <button
                          key={label.id}
                          onClick={() => handleAddLabel(label.id)}
                          className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                        >
                          <span
                            className="w-3 h-3 rounded-full mr-2"
                            style={{ backgroundColor: label.color }}
                          />
                          {label.name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Summary */}
          {item.summary && (
            <div className="px-6 py-4 border-b">
              <p className="text-gray-700">{item.summary}</p>
            </div>
          )}

          {/* Body */}
          {item.body && (
            <div className="px-6 py-6">
              {item.body_html ? (
                <div
                  className="prose prose-sm max-w-none"
                  dangerouslySetInnerHTML={{ __html: item.body_html }}
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{item.body}</p>
              )}
            </div>
          )}

          {/* Action section */}
          {item.is_actionable && (
            <div className="px-6 py-4 border-t bg-gray-50">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm font-medium text-gray-700">
                    {item.action_completed ? 'Action completed' : 'Action required'}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {item.action_url && (
                    <a
                      href={item.action_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 rounded-lg border border-blue-200"
                    >
                      <ExternalLink className="w-4 h-4" />
                      {item.action_label || 'Open'}
                    </a>
                  )}

                  {!item.action_completed && (
                    <button
                      onClick={handleCompleteAction}
                      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg"
                    >
                      <Check className="w-4 h-4" />
                      Mark as done
                    </button>
                  )}

                  {item.action_completed && (
                    <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-600 bg-green-50 rounded-lg">
                      <Check className="w-4 h-4" />
                      Completed
                    </span>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Meta info */}
          <div className="px-6 py-4 border-t text-sm text-gray-500">
            <div className="flex items-center justify-between">
              <div>
                <span>Created: {format(new Date(item.created_at), 'PPpp')}</span>
                {item.read_at && (
                  <span className="ml-4">
                    Read: {formatDistanceToNow(new Date(item.read_at), { addSuffix: true })}
                  </span>
                )}
              </div>
              {item.model_name && item.record_id && (
                <span>
                  Related: {item.model_name} #{item.record_id}
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
