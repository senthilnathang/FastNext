'use client';

import { useEffect, useState } from 'react';
import { useSessionTimeout, formatTimeRemaining } from '@/lib/auth/session-timeout';
import { Button } from '@/shared/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/shared/components/ui/dialog';
import { Progress } from '@/shared/components/ui/progress';
import { Clock, Shield, AlertTriangle } from 'lucide-react';

interface SessionTimeoutWarningProps {
  userRole?: string;
}

export function SessionTimeoutWarning({
  userRole
}: SessionTimeoutWarningProps) {
  const {
    extendSession,
    forceTimeout,
    timeRemaining,
    isWarning,
    isIdle,
    isActive
  } = useSessionTimeout({
    onTimeout: () => {
      // Redirect to login or show expired message
      window.location.href = '/auth/login?reason=session_timeout';
    },
    onExtend: () => {
    },
    onIdle: () => {
      // Could show idle notification
    }
  });

  const [showDialog, setShowDialog] = useState(false);
  const [autoExtendCount, setAutoExtendCount] = useState(0);

  useEffect(() => {
    setShowDialog(isWarning && isActive);
  }, [isWarning, isActive]);

  const handleExtendSession = () => {
    extendSession();
    setAutoExtendCount(prev => prev + 1);
    setShowDialog(false);
  };

  const handleLogout = () => {
    forceTimeout();
    setShowDialog(false);
  };

  const progressValue = (timeRemaining / (5 * 60 * 1000)) * 100; // 5 minutes warning period

  if (!isActive) {
    return null;
  }

  return (
    <>
      {/* Idle Indicator */}
      {isIdle && (
        <div className="fixed top-4 right-4 z-50">
          <div className="bg-yellow-100 border border-yellow-400 text-yellow-700 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="text-sm font-medium">Session idle</span>
          </div>
        </div>
      )}

      {/* Session Warning Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-[425px]" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              Session Expiring Soon
            </DialogTitle>
            <DialogDescription>
              Your session will expire due to inactivity. Do you want to extend your session?
            </DialogDescription>
          </DialogHeader>

          <div className="py-4 space-y-4">
            {/* Time Remaining Display */}
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600 mb-2">
                {formatTimeRemaining(timeRemaining)}
              </div>
              <div className="text-sm text-gray-600">
                Time remaining
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-2">
              <Progress
                value={progressValue}
                className="w-full"
                // Custom colors based on urgency
                style={{
                  '--progress-background': progressValue > 60 ? '#10b981' :
                                         progressValue > 30 ? '#f59e0b' : '#ef4444'
                } as any}
              />
              <div className="text-xs text-gray-500 text-center">
                Session timeout progress
              </div>
            </div>

            {/* Security Information */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <Shield className="h-4 w-4 text-blue-600 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-800">Security Notice</p>
                  <p className="text-blue-700">
                    Sessions expire automatically for your security.
                    {autoExtendCount > 0 && (
                      <span className="block mt-1 text-xs">
                        Extended {autoExtendCount} time{autoExtendCount !== 1 ? 's' : ''} this session.
                      </span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* User Role Info */}
            {userRole && (
              <div className="text-xs text-gray-500 text-center">
                Session policy: {userRole} user
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={handleLogout}
              className="flex-1"
            >
              Logout Now
            </Button>
            <Button
              onClick={handleExtendSession}
              className="flex-1"
            >
              Extend Session
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// Session Status Component for UI
export function SessionStatus() {
  const { sessionState, timeRemaining, isIdle } = useSessionTimeout();

  if (!sessionState.isActive) {
    return null;
  }

  const hours = Math.floor(timeRemaining / (1000 * 60 * 60));
  const minutes = Math.floor((timeRemaining % (1000 * 60 * 60)) / (1000 * 60));

  return (
    <div className="flex items-center gap-2 text-sm text-gray-600">
      <Clock className="h-4 w-4" />
      <span>
        Session: {hours > 0 ? `${hours}h ` : ''}{minutes}m
      </span>
      {isIdle && (
        <span className="inline-block w-2 h-2 bg-yellow-400 rounded-full"
              title="Session is idle" />
      )}
    </div>
  );
}

// Hook for programmatic session management
export function useSessionManagement() {
  const { extendSession, forceTimeout, sessionState } = useSessionTimeout();

  const refreshSession = async () => {
    try {
      // Call your refresh endpoint
      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        credentials: 'include'
      });

      if (response.ok) {
        extendSession();
        return true;
      }
      return false;
    } catch (error) {
      console.error('Failed to refresh session:', error);
      return false;
    }
  };

  const logout = async () => {
    try {
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include'
      });
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      forceTimeout();
    }
  };

  return {
    sessionState,
    refreshSession,
    logout,
    extendSession,
    forceTimeout
  };
}
