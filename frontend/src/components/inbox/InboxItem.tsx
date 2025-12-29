import React from 'react';
import { formatDistanceToNow } from 'date-fns';
import {
  Bell,
  MessageCircle,
  AtSign,
  Activity,
  CheckSquare,
  ThumbsUp,
  Star,
  Pin,
  MoreHorizontal,
  Check,
  Archive,
  Trash2,
  ExternalLink,
} from 'lucide-react';
import type { InboxItem as InboxItemType, InboxItemType as ItemType, InboxPriority } from '@/lib/api/inbox';

interface InboxItemProps {
  item: InboxItemType;
  isSelected?: boolean;
  onSelect?: (id: number) => void;
  onClick?: (item: InboxItemType) => void;
  onMarkRead?: (id: number) => void;
  onToggleStar?: (id: number) => void;
  onTogglePin?: (id: number) => void;
  onArchive?: (id: number) => void;
  onDelete?: (id: number) => void;
  showCheckbox?: boolean;
  compact?: boolean;
  className?: string;
}

const getItemIcon = (type: ItemType) => {
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

const getPriorityStyles = (priority: InboxPriority): string => {
  switch (priority) {
    case 'urgent':
      return 'border-l-4 border-l-red-500';
    case 'high':
      return 'border-l-4 border-l-orange-500';
    case 'normal':
      return '';
    case 'low':
      return 'border-l-4 border-l-gray-300';
  }
};

const getIconColor = (type: ItemType, priority: InboxPriority): string => {
  if (priority === 'urgent') return 'text-red-500';
  if (priority === 'high') return 'text-orange-500';

  switch (type) {
    case 'notification':
      return 'text-blue-500';
    case 'message':
      return 'text-green-500';
    case 'mention':
      return 'text-purple-500';
    case 'activity':
      return 'text-gray-500';
    case 'task':
      return 'text-amber-500';
    case 'approval':
      return 'text-cyan-500';
    default:
      return 'text-gray-500';
  }
};

const InboxItem: React.FC<InboxItemProps> = ({
  item,
  isSelected = false,
  onSelect,
  onClick,
  onMarkRead,
  onToggleStar,
  onTogglePin,
  onArchive,
  onDelete,
  showCheckbox = false,
  compact = false,
  className = '',
}) => {
  const [showMenu, setShowMenu] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  const isUnread = item.status === 'unread';

  // Close menu on outside click
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleClick = () => {
    if (onClick) onClick(item);
    if (onMarkRead && isUnread) onMarkRead(item.id);
  };

  return (
    <div
      className={`group relative flex items-start p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
        isUnread ? 'bg-blue-50/50' : 'bg-white'
      } ${isSelected ? 'bg-blue-100' : ''} ${getPriorityStyles(item.priority)} ${className}`}
      onClick={handleClick}
    >
      {/* Checkbox */}
      {showCheckbox && (
        <div className="mr-3 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
          <input
            type="checkbox"
            checked={isSelected}
            onChange={() => onSelect?.(item.id)}
            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Icon */}
      <div className={`flex-shrink-0 ${getIconColor(item.item_type, item.priority)}`}>
        {item.icon ? (
          <span className="text-xl">{item.icon}</span>
        ) : (
          getItemIcon(item.item_type)
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 ml-3">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isUnread && (
                <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />
              )}
              <h4
                className={`text-sm truncate ${
                  isUnread ? 'font-semibold text-gray-900' : 'font-medium text-gray-700'
                }`}
              >
                {item.title}
              </h4>
              {item.is_pinned && (
                <Pin className="w-3 h-3 text-blue-500 flex-shrink-0" />
              )}
              {item.is_starred && (
                <Star className="w-3 h-3 text-yellow-500 fill-yellow-500 flex-shrink-0" />
              )}
            </div>

            {!compact && item.summary && (
              <p className={`text-sm mt-0.5 line-clamp-2 ${isUnread ? 'text-gray-700' : 'text-gray-500'}`}>
                {item.summary}
              </p>
            )}

            {/* Labels */}
            {item.labels && item.labels.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {item.labels.map((label) => (
                  <span
                    key={label.id}
                    className="inline-flex items-center px-2 py-0.5 rounded-full text-xs"
                    style={{
                      backgroundColor: `${label.color}20`,
                      color: label.color,
                    }}
                  >
                    {label.icon && <span className="mr-1">{label.icon}</span>}
                    {label.name}
                  </span>
                ))}
              </div>
            )}

            {/* Meta info */}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>
                {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
              </span>
              {item.is_actionable && !item.action_completed && (
                <span className="text-amber-600 font-medium">Action required</span>
              )}
              {item.action_completed && (
                <span className="text-green-600 font-medium flex items-center">
                  <Check className="w-3 h-3 mr-1" />
                  Completed
                </span>
              )}
            </div>
          </div>

          {/* Time */}
          <div className="ml-4 flex-shrink-0 text-xs text-gray-400">
            {formatDistanceToNow(new Date(item.created_at), { addSuffix: false })}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div
        className="ml-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        {onToggleStar && (
          <button
            onClick={() => onToggleStar(item.id)}
            className="p-1 text-gray-400 hover:text-yellow-500 hover:bg-gray-100 rounded"
            title={item.is_starred ? 'Unstar' : 'Star'}
          >
            <Star className={`w-4 h-4 ${item.is_starred ? 'fill-yellow-500 text-yellow-500' : ''}`} />
          </button>
        )}

        {item.action_url && (
          <a
            href={item.action_url}
            className="p-1 text-gray-400 hover:text-blue-500 hover:bg-gray-100 rounded"
            title={item.action_label || 'Open'}
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {showMenu && (
            <div className="absolute right-0 mt-1 w-40 bg-white border rounded-lg shadow-lg z-10">
              <div className="py-1">
                {onMarkRead && (
                  <button
                    onClick={() => {
                      onMarkRead(item.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Check className="w-4 h-4 mr-2" />
                    {isUnread ? 'Mark read' : 'Mark unread'}
                  </button>
                )}
                {onTogglePin && (
                  <button
                    onClick={() => {
                      onTogglePin(item.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Pin className="w-4 h-4 mr-2" />
                    {item.is_pinned ? 'Unpin' : 'Pin'}
                  </button>
                )}
                {onArchive && (
                  <button
                    onClick={() => {
                      onArchive(item.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    <Archive className="w-4 h-4 mr-2" />
                    Archive
                  </button>
                )}
                {onDelete && (
                  <button
                    onClick={() => {
                      onDelete(item.id);
                      setShowMenu(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboxItem;
