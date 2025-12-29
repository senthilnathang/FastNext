import React from 'react';
import { Check, CheckCheck, Clock, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface ReadReceipt {
  user_id: number;
  user_name: string;
  user_avatar?: string;
  read_at: string;
}

interface ReadReceiptsProps {
  status: 'sending' | 'sent' | 'delivered' | 'read';
  receipts?: ReadReceipt[];
  showDetails?: boolean;
  compact?: boolean;
  className?: string;
}

const ReadReceipts: React.FC<ReadReceiptsProps> = ({
  status,
  receipts = [],
  showDetails = false,
  compact = true,
  className = '',
}) => {
  const getStatusIcon = () => {
    switch (status) {
      case 'sending':
        return <Clock className="w-3 h-3 text-gray-400" />;
      case 'sent':
        return <Check className="w-3 h-3 text-gray-400" />;
      case 'delivered':
        return <CheckCheck className="w-3 h-3 text-gray-400" />;
      case 'read':
        return <CheckCheck className="w-3 h-3 text-blue-500" />;
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'sending':
        return 'Sending...';
      case 'sent':
        return 'Sent';
      case 'delivered':
        return 'Delivered';
      case 'read':
        return receipts.length > 0
          ? `Read by ${receipts.length}`
          : 'Read';
    }
  };

  if (compact) {
    return (
      <div
        className={`inline-flex items-center gap-1 ${className}`}
        title={getStatusText()}
      >
        {getStatusIcon()}
        {status === 'read' && receipts.length > 0 && (
          <span className="text-xs text-gray-500">{receipts.length}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`${className}`}>
      <div className="flex items-center gap-1 text-xs text-gray-500">
        {getStatusIcon()}
        <span>{getStatusText()}</span>
      </div>

      {showDetails && status === 'read' && receipts.length > 0 && (
        <div className="mt-2 space-y-1">
          {receipts.map((receipt) => (
            <div
              key={receipt.user_id}
              className="flex items-center gap-2 text-xs"
            >
              <div className="w-5 h-5 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden flex-shrink-0">
                {receipt.user_avatar ? (
                  <img
                    src={receipt.user_avatar}
                    alt={receipt.user_name}
                    className="w-5 h-5 object-cover"
                  />
                ) : (
                  <User className="w-3 h-3 text-gray-500" />
                )}
              </div>
              <span className="text-gray-700 truncate flex-1">
                {receipt.user_name}
              </span>
              <span className="text-gray-400 whitespace-nowrap">
                {formatDistanceToNow(new Date(receipt.read_at), { addSuffix: true })}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// Tooltip version for hover display
interface ReadReceiptsTooltipProps {
  receipts: ReadReceipt[];
  children: React.ReactNode;
  className?: string;
}

export const ReadReceiptsTooltip: React.FC<ReadReceiptsTooltipProps> = ({
  receipts,
  children,
  className = '',
}) => {
  const [showTooltip, setShowTooltip] = React.useState(false);

  if (receipts.length === 0) {
    return <>{children}</>;
  }

  return (
    <div
      className={`relative inline-block ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {children}

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50">
          <div className="bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
            <div className="font-medium mb-1">Read by:</div>
            <div className="space-y-1 max-h-32 overflow-y-auto">
              {receipts.map((receipt) => (
                <div key={receipt.user_id} className="flex items-center gap-2">
                  <div className="w-4 h-4 rounded-full bg-gray-700 flex items-center justify-center overflow-hidden">
                    {receipt.user_avatar ? (
                      <img
                        src={receipt.user_avatar}
                        alt={receipt.user_name}
                        className="w-4 h-4 object-cover"
                      />
                    ) : (
                      <span className="text-[10px]">
                        {receipt.user_name.charAt(0)}
                      </span>
                    )}
                  </div>
                  <span>{receipt.user_name}</span>
                </div>
              ))}
            </div>
            {/* Arrow */}
            <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px">
              <div className="border-4 border-transparent border-t-gray-900" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Avatar stack for showing who read the message
interface ReadReceiptAvatarsProps {
  receipts: ReadReceipt[];
  maxVisible?: number;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

export const ReadReceiptAvatars: React.FC<ReadReceiptAvatarsProps> = ({
  receipts,
  maxVisible = 3,
  size = 'sm',
  className = '',
}) => {
  const sizeClasses = {
    sm: 'w-5 h-5 text-[10px]',
    md: 'w-6 h-6 text-xs',
    lg: 'w-8 h-8 text-sm',
  };

  const visibleReceipts = receipts.slice(0, maxVisible);
  const remainingCount = receipts.length - maxVisible;

  if (receipts.length === 0) return null;

  return (
    <div className={`flex items-center -space-x-1.5 ${className}`}>
      {visibleReceipts.map((receipt, index) => (
        <div
          key={receipt.user_id}
          className={`${sizeClasses[size]} rounded-full bg-gray-200 border-2 border-white flex items-center justify-center overflow-hidden`}
          style={{ zIndex: visibleReceipts.length - index }}
          title={`${receipt.user_name} - ${formatDistanceToNow(new Date(receipt.read_at), { addSuffix: true })}`}
        >
          {receipt.user_avatar ? (
            <img
              src={receipt.user_avatar}
              alt={receipt.user_name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-gray-500 font-medium">
              {receipt.user_name.charAt(0)}
            </span>
          )}
        </div>
      ))}

      {remainingCount > 0 && (
        <div
          className={`${sizeClasses[size]} rounded-full bg-gray-300 border-2 border-white flex items-center justify-center`}
          title={`+${remainingCount} more`}
        >
          <span className="text-gray-600 font-medium">+{remainingCount}</span>
        </div>
      )}
    </div>
  );
};

export default ReadReceipts;
