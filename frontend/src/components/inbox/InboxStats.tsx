import React from 'react';
import {
  Inbox,
  Bell,
  MessageCircle,
  AtSign,
  CheckSquare,
  ThumbsUp,
  Star,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Activity,
} from 'lucide-react';
import type { InboxStats as InboxStatsType } from '@/lib/api/inbox';

interface InboxStatsProps {
  stats: InboxStatsType;
  loading?: boolean;
  layout?: 'horizontal' | 'vertical' | 'compact';
  showTrends?: boolean;
  className?: string;
}

interface StatCardProps {
  label: string;
  value: number;
  icon: React.ReactNode;
  color: string;
  trend?: number;
  compact?: boolean;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  icon,
  color,
  trend,
  compact = false,
}) => {
  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <div className={`p-1.5 rounded-lg ${color}`}>{icon}</div>
        <div>
          <span className="text-lg font-semibold text-gray-900">{value}</span>
          <span className="text-xs text-gray-500 ml-1">{label}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-4 p-4 bg-white rounded-lg border">
      <div className={`p-3 rounded-xl ${color}`}>{icon}</div>
      <div className="flex-1">
        <p className="text-sm text-gray-500">{label}</p>
        <div className="flex items-end gap-2">
          <span className="text-2xl font-semibold text-gray-900">{value}</span>
          {trend !== undefined && (
            <span
              className={`flex items-center text-xs font-medium ${
                trend >= 0 ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3 mr-0.5" />
              ) : (
                <TrendingDown className="w-3 h-3 mr-0.5" />
              )}
              {Math.abs(trend)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

const InboxStats: React.FC<InboxStatsProps> = ({
  stats,
  loading = false,
  layout = 'horizontal',
  showTrends = false,
  className = '',
}) => {
  const typeStats = [
    {
      key: 'notification',
      label: 'Notifications',
      icon: <Bell className="w-5 h-5 text-blue-600" />,
      color: 'bg-blue-100',
      value: stats.by_type?.notification || 0,
    },
    {
      key: 'message',
      label: 'Messages',
      icon: <MessageCircle className="w-5 h-5 text-green-600" />,
      color: 'bg-green-100',
      value: stats.by_type?.message || 0,
    },
    {
      key: 'mention',
      label: 'Mentions',
      icon: <AtSign className="w-5 h-5 text-purple-600" />,
      color: 'bg-purple-100',
      value: stats.by_type?.mention || 0,
    },
    {
      key: 'task',
      label: 'Tasks',
      icon: <CheckSquare className="w-5 h-5 text-amber-600" />,
      color: 'bg-amber-100',
      value: stats.by_type?.task || 0,
    },
    {
      key: 'approval',
      label: 'Approvals',
      icon: <ThumbsUp className="w-5 h-5 text-cyan-600" />,
      color: 'bg-cyan-100',
      value: stats.by_type?.approval || 0,
    },
  ];

  if (loading) {
    return (
      <div className={`${layout === 'horizontal' ? 'grid grid-cols-4 gap-4' : 'space-y-4'} ${className}`}>
        {[...Array(4)].map((_, i) => (
          <div key={i} className="animate-pulse p-4 bg-white rounded-lg border">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gray-200 rounded-xl" />
              <div className="flex-1 space-y-2">
                <div className="h-4 bg-gray-200 rounded w-1/2" />
                <div className="h-6 bg-gray-100 rounded w-1/3" />
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (layout === 'compact') {
    return (
      <div className={`flex items-center gap-6 ${className}`}>
        <StatCard
          label="Unread"
          value={stats.unread}
          icon={<Inbox className="w-4 h-4 text-blue-600" />}
          color="bg-blue-100"
          compact
        />
        <StatCard
          label="Action"
          value={stats.actionable}
          icon={<AlertCircle className="w-4 h-4 text-amber-600" />}
          color="bg-amber-100"
          compact
        />
        <StatCard
          label="Starred"
          value={stats.starred}
          icon={<Star className="w-4 h-4 text-yellow-600" />}
          color="bg-yellow-100"
          compact
        />
      </div>
    );
  }

  if (layout === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {/* Main stats */}
        <div className="grid grid-cols-2 gap-4">
          <StatCard
            label="Total Items"
            value={stats.total}
            icon={<Inbox className="w-5 h-5 text-gray-600" />}
            color="bg-gray-100"
          />
          <StatCard
            label="Unread"
            value={stats.unread}
            icon={<Activity className="w-5 h-5 text-blue-600" />}
            color="bg-blue-100"
          />
          <StatCard
            label="Action Required"
            value={stats.actionable}
            icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
            color="bg-amber-100"
          />
          <StatCard
            label="Starred"
            value={stats.starred}
            icon={<Star className="w-5 h-5 text-yellow-600" />}
            color="bg-yellow-100"
          />
        </div>

        {/* By type breakdown */}
        <div className="bg-white rounded-lg border p-4">
          <h4 className="text-sm font-medium text-gray-700 mb-3">By Type</h4>
          <div className="space-y-3">
            {typeStats.map((stat) => (
              <div key={stat.key} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${stat.color}`}>{stat.icon}</div>
                  <span className="text-sm text-gray-700">{stat.label}</span>
                </div>
                <span className="text-sm font-medium text-gray-900">{stat.value}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Horizontal layout (default)
  return (
    <div className={`grid grid-cols-2 md:grid-cols-4 gap-4 ${className}`}>
      <StatCard
        label="Total Items"
        value={stats.total}
        icon={<Inbox className="w-5 h-5 text-gray-600" />}
        color="bg-gray-100"
      />
      <StatCard
        label="Unread"
        value={stats.unread}
        icon={<Activity className="w-5 h-5 text-blue-600" />}
        color="bg-blue-100"
        trend={showTrends ? 5 : undefined}
      />
      <StatCard
        label="Action Required"
        value={stats.actionable}
        icon={<AlertCircle className="w-5 h-5 text-amber-600" />}
        color="bg-amber-100"
      />
      <StatCard
        label="Starred"
        value={stats.starred}
        icon={<Star className="w-5 h-5 text-yellow-600" />}
        color="bg-yellow-100"
      />
    </div>
  );
};

// Unread badge component for nav items
interface InboxBadgeProps {
  count: number;
  variant?: 'default' | 'dot' | 'minimal';
  max?: number;
  className?: string;
}

export const InboxBadge: React.FC<InboxBadgeProps> = ({
  count,
  variant = 'default',
  max = 99,
  className = '',
}) => {
  if (count === 0) return null;

  if (variant === 'dot') {
    return (
      <span className={`w-2 h-2 bg-blue-500 rounded-full ${className}`} />
    );
  }

  if (variant === 'minimal') {
    return (
      <span className={`text-xs font-medium text-blue-600 ${className}`}>
        {count > max ? `${max}+` : count}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-semibold text-white bg-blue-500 rounded-full ${className}`}
    >
      {count > max ? `${max}+` : count}
    </span>
  );
};

export default InboxStats;
