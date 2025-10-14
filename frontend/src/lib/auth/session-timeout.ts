'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { logSecurityEvent } from '@/lib/monitoring/security-monitor';

export interface SessionTimeoutConfig {
  timeoutDuration: number; // Session timeout in milliseconds
  warningDuration: number; // Warning before timeout in milliseconds
  idleTimeout: number; // Idle timeout in milliseconds
  checkInterval: number; // Check interval in milliseconds
  onWarning?: () => void;
  onTimeout?: () => void;
  onExtend?: () => void;
  onIdle?: () => void;
}

export const DEFAULT_SESSION_CONFIG: SessionTimeoutConfig = {
  timeoutDuration: 60 * 60 * 1000, // 1 hour
  warningDuration: 5 * 60 * 1000, // 5 minutes warning
  idleTimeout: 30 * 60 * 1000, // 30 minutes idle
  checkInterval: 30 * 1000 // Check every 30 seconds
};

export interface SessionState {
  isActive: boolean;
  isWarning: boolean;
  isIdle: boolean;
  timeRemaining: number;
  lastActivity: number;
  sessionStart: number;
}

export class SessionTimeoutManager {
  private config: SessionTimeoutConfig;
  private timers: { [key: string]: NodeJS.Timeout } = {};
  private state: SessionState;
  private listeners: Set<(state: SessionState) => void> = new Set();
  private activityEvents = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

  constructor(config: Partial<SessionTimeoutConfig> = {}) {
    this.config = { ...DEFAULT_SESSION_CONFIG, ...config };
    this.state = {
      isActive: true,
      isWarning: false,
      isIdle: false,
      timeRemaining: this.config.timeoutDuration,
      lastActivity: Date.now(),
      sessionStart: Date.now()
    };

    this.bindActivityListeners();
    this.startTimers();
  }

  private bindActivityListeners(): void {
    this.activityEvents.forEach(event => {
      document.addEventListener(event, this.handleActivity, { passive: true });
    });
  }

  private unbindActivityListeners(): void {
    this.activityEvents.forEach(event => {
      document.removeEventListener(event, this.handleActivity);
    });
  }

  private handleActivity = (): void => {
    const now = Date.now();
    this.state.lastActivity = now;

    // Reset idle state
    if (this.state.isIdle) {
      this.state.isIdle = false;
      this.updateState();
      logSecurityEvent('authentication_failure', {
        sessionDuration: now - this.state.sessionStart,
        idleDuration: now - this.state.lastActivity,
        reason: 'session_activity_resumed'
      }, 'low');
    }

    // Clear warning if user is active
    if (this.state.isWarning) {
      this.state.isWarning = false;
      this.clearTimer('warning');
      this.updateState();
    }
  };

  private startTimers(): void {
    this.startMainTimer();
    this.startIdleTimer();
    this.startCheckTimer();
  }

  private startMainTimer(): void {
    this.clearTimer('main');

    const warningTime = this.config.timeoutDuration - this.config.warningDuration;

    // Set warning timer
    this.timers.warning = setTimeout(() => {
      this.state.isWarning = true;
      this.updateState();
      this.config.onWarning?.();

      logSecurityEvent('suspicious_request', {
        timeRemaining: this.config.warningDuration,
        sessionDuration: Date.now() - this.state.sessionStart,
        reason: 'session_timeout_warning'
      }, 'medium');

      // Set final timeout
      this.timers.timeout = setTimeout(() => {
        this.handleSessionTimeout();
      }, this.config.warningDuration);

    }, warningTime);
  }

  private startIdleTimer(): void {
    this.clearTimer('idle');

    this.timers.idle = setTimeout(() => {
      if (Date.now() - this.state.lastActivity >= this.config.idleTimeout) {
        this.handleIdleTimeout();
      }
    }, this.config.idleTimeout);
  }

  private startCheckTimer(): void {
    this.clearTimer('check');

    this.timers.check = setInterval(() => {
      this.updateTimeRemaining();
      this.checkIdleState();
    }, this.config.checkInterval);
  }

  private clearTimer(name: string): void {
    if (this.timers[name]) {
      clearTimeout(this.timers[name]);
      delete this.timers[name];
    }
  }

  private clearAllTimers(): void {
    Object.keys(this.timers).forEach(name => this.clearTimer(name));
  }

  private updateTimeRemaining(): void {
    const elapsed = Date.now() - this.state.sessionStart;
    this.state.timeRemaining = Math.max(0, this.config.timeoutDuration - elapsed);
    this.updateState();
  }

  private checkIdleState(): void {
    const idleTime = Date.now() - this.state.lastActivity;

    if (!this.state.isIdle && idleTime >= this.config.idleTimeout) {
      this.handleIdleTimeout();
    }
  }

  private handleSessionTimeout(): void {
    this.state.isActive = false;
    this.state.timeRemaining = 0;
    this.updateState();

    logSecurityEvent('authorization_failure', {
      sessionDuration: Date.now() - this.state.sessionStart,
      reason: 'session_timeout'
    }, 'medium');

    this.config.onTimeout?.();
    this.destroy();
  }

  private handleIdleTimeout(): void {
    this.state.isIdle = true;
    this.updateState();

    logSecurityEvent('authorization_failure', {
      idleDuration: Date.now() - this.state.lastActivity,
      sessionDuration: Date.now() - this.state.sessionStart,
      reason: 'session_idle_timeout'
    }, 'low');

    this.config.onIdle?.();
  }

  public extendSession(additionalTime?: number): void {
    const extension = additionalTime || this.config.timeoutDuration;

    // Reset session start time
    this.state.sessionStart = Date.now();
    this.state.timeRemaining = extension;
    this.state.isWarning = false;
    this.state.lastActivity = Date.now();

    // Restart timers
    this.clearAllTimers();
    this.startTimers();

    this.updateState();

    logSecurityEvent('authentication_failure', {
      extensionDuration: extension,
      newExpiryTime: Date.now() + extension,
      reason: 'session_extended'
    }, 'low');

    this.config.onExtend?.();
  }

  public forceTimeout(): void {
    logSecurityEvent('authorization_failure', {
      sessionDuration: Date.now() - this.state.sessionStart,
      reason: 'session_force_timeout'
    }, 'medium');

    this.handleSessionTimeout();
  }

  public getState(): SessionState {
    return { ...this.state };
  }

  public subscribe(listener: (state: SessionState) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private updateState(): void {
    this.listeners.forEach(listener => listener(this.getState()));
  }

  public destroy(): void {
    this.clearAllTimers();
    this.unbindActivityListeners();
    this.listeners.clear();
  }
}

// React Hook for Session Timeout
export function useSessionTimeout(config?: Partial<SessionTimeoutConfig>) {
  const managerRef = useRef<SessionTimeoutManager | null>(null);
  const [sessionState, setSessionState] = useState<SessionState>({
    isActive: true,
    isWarning: false,
    isIdle: false,
    timeRemaining: config?.timeoutDuration || DEFAULT_SESSION_CONFIG.timeoutDuration,
    lastActivity: Date.now(),
    sessionStart: Date.now()
  });

  const extendSession = useCallback((additionalTime?: number) => {
    managerRef.current?.extendSession(additionalTime);
  }, []);

  const forceTimeout = useCallback(() => {
    managerRef.current?.forceTimeout();
  }, []);

  useEffect(() => {
    managerRef.current = new SessionTimeoutManager(config);

    const unsubscribe = managerRef.current.subscribe(setSessionState);

    return () => {
      unsubscribe();
      managerRef.current?.destroy();
    };
  }, [config]);

  return {
    sessionState,
    extendSession,
    forceTimeout,
    timeRemaining: sessionState.timeRemaining,
    isWarning: sessionState.isWarning,
    isIdle: sessionState.isIdle,
    isActive: sessionState.isActive
  };
}

// Utility functions
export function formatTimeRemaining(milliseconds: number): string {
  const minutes = Math.floor(milliseconds / (1000 * 60));
  const seconds = Math.floor((milliseconds % (1000 * 60)) / 1000);

  if (minutes > 0) {
    return `${minutes}m ${seconds}s`;
  }
  return `${seconds}s`;
}

export function getSessionTimeoutConfig(userRole?: string): SessionTimeoutConfig {
  const baseConfig = { ...DEFAULT_SESSION_CONFIG };

  // Adjust timeout based on user role
  switch (userRole) {
    case 'admin':
      return {
        ...baseConfig,
        timeoutDuration: 30 * 60 * 1000, // 30 minutes for admin
        warningDuration: 2 * 60 * 1000, // 2 minutes warning
        idleTimeout: 15 * 60 * 1000 // 15 minutes idle
      };

    case 'user':
      return {
        ...baseConfig,
        timeoutDuration: 2 * 60 * 60 * 1000, // 2 hours for regular users
        warningDuration: 10 * 60 * 1000, // 10 minutes warning
        idleTimeout: 45 * 60 * 1000 // 45 minutes idle
      };

    default:
      return baseConfig;
  }
}
