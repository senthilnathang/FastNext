'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  User,
  Lock,
  Shield,
  Activity,
  Plus,
  Download,
  Settings,
  ChevronRight,
  X
} from 'lucide-react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { API_CONFIG, getApiUrl } from '@/lib/api/config';

interface QuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
  action_type: string;
  endpoint: string;
  method: string;
  requires_confirmation: boolean;
  category: string;
}

interface QuickActionsMenuProps {
  isOpen: boolean;
  onClose: () => void;
  onActionSelect?: (action: QuickAction) => void;
}

const iconMap: { [key: string]: React.ComponentType<{ className?: string }> } = {
  user: User,
  lock: Lock,
  shield: Shield,
  activity: Activity,
  plus: Plus,
  download: Download,
  settings: Settings,
};

const categoryNames: { [key: string]: string } = {
  profile: 'Profile Management',
  security: 'Security & Privacy',
  monitoring: 'Activity & Monitoring',
  project: 'Project Management',
  data: 'Data Management',
  general: 'General Actions'
};

const categoryColors: { [key: string]: string } = {
  profile: 'bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-800',
  security: 'bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-800',
  monitoring: 'bg-green-50 border-green-200 dark:bg-green-900/20 dark:border-green-800',
  project: 'bg-purple-50 border-purple-200 dark:bg-purple-900/20 dark:border-purple-800',
  data: 'bg-yellow-50 border-yellow-200 dark:bg-yellow-900/20 dark:border-yellow-800',
  general: 'bg-gray-50 border-gray-200 dark:bg-gray-900/20 dark:border-gray-800'
};

export default function QuickActionsMenu({ isOpen, onClose, onActionSelect }: QuickActionsMenuProps) {
  const [quickActions, setQuickActions] = useState<QuickAction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (isOpen) {
      fetchQuickActions();
    }
  }, [isOpen]);

  const fetchQuickActions = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('access_token');
      
      const response = await fetch(getApiUrl(API_CONFIG.ENDPOINTS.PROFILE.QUICK_ACTIONS), {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch quick actions');
      }

      const actions = await response.json();
      setQuickActions(actions);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      console.error('Error fetching quick actions:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleActionClick = async (action: QuickAction) => {
    if (action.requires_confirmation) {
      const confirmed = window.confirm(`Are you sure you want to ${action.title.toLowerCase()}?`);
      if (!confirmed) return;
    }

    try {
      if (action.action_type === 'navigate') {
        router.push(action.endpoint);
        onClose();
      } else if (action.action_type === 'modal') {
        if (onActionSelect) {
          onActionSelect(action);
        }
        onClose();
      } else if (action.action_type === 'api') {
        // Handle direct API calls
        const token = localStorage.getItem('access_token');
        const response = await fetch(action.endpoint, {
          method: action.method,
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });

        if (!response.ok) {
          throw new Error('Action failed');
        }

        // Show success message or handle response
        alert(`${action.title} completed successfully!`);
        onClose();
      }
    } catch (err) {
      console.error('Error executing action:', err);
      alert(`Failed to ${action.title.toLowerCase()}. Please try again.`);
    }
  };

  const groupedActions = quickActions.reduce((acc, action) => {
    const category = action.category || 'general';
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(action);
    return acc;
  }, {} as { [key: string]: QuickAction[] });

  const getIcon = (iconName: string) => {
    const IconComponent = iconMap[iconName] || Settings;
    return <IconComponent className="h-5 w-5" />;
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <Card className="w-full max-w-4xl max-h-[80vh] overflow-hidden bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Quick Actions
            </h2>
            <p className="text-gray-600 dark:text-gray-300 mt-1">
              Quickly access common tasks and settings
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-gray-600 dark:text-gray-300">Loading actions...</span>
            </div>
          ) : error ? (
            <div className="text-center py-8">
              <p className="text-red-600 dark:text-red-400">{error}</p>
              <Button
                variant="outline"
                onClick={fetchQuickActions}
                className="mt-4"
              >
                Try Again
              </Button>
            </div>
          ) : (
            <div className="space-y-8">
              {Object.entries(groupedActions).map(([category, actions]) => (
                <div key={category}>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                    {categoryNames[category] || category}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {actions.map((action) => (
                      <Card
                        key={action.id}
                        className={`p-4 cursor-pointer transition-all hover:scale-105 hover:shadow-lg border-2 ${categoryColors[category] || categoryColors.general}`}
                        onClick={() => handleActionClick(action)}
                      >
                        <div className="flex items-start space-x-3">
                          <div className="flex-shrink-0 p-2 rounded-lg bg-white dark:bg-gray-700 shadow-sm">
                            {getIcon(action.icon)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                                {action.title}
                              </h4>
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            </div>
                            <p className="text-xs text-gray-600 dark:text-gray-300 mt-1 line-clamp-2">
                              {action.description}
                            </p>
                            {action.requires_confirmation && (
                              <span className="inline-block mt-2 px-2 py-1 text-xs bg-yellow-100 text-yellow-800 rounded dark:bg-yellow-900/30 dark:text-yellow-300">
                                Requires confirmation
                              </span>
                            )}
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      </Card>
    </div>
  );
}