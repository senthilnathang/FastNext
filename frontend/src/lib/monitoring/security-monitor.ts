/**
 * Security Monitoring and Reporting System
 * Monitors security events and sends alerts
 */

interface SecurityEvent {
  id: string;
  type: SecurityEventType;
  severity: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  source: string;
  details: Record<string, any>;
  userAgent?: string;
  clientIP?: string;
  userId?: string;
  sessionId?: string;
}

type SecurityEventType =
  | 'xss_attempt'
  | 'sql_injection'
  | 'csrf_attempt'
  | 'rate_limit_exceeded'
  | 'authentication_failure'
  | 'authorization_failure'
  | 'suspicious_request'
  | 'malicious_upload'
  | 'session_hijack'
  | 'brute_force'
  | 'csp_violation'
  | 'cors_violation'
  | 'security_misconfiguration';

interface SecurityAlert {
  id: string;
  eventType: SecurityEventType;
  count: number;
  timeWindow: number;
  threshold: number;
  firstSeen: string;
  lastSeen: string;
  affectedIPs: string[];
  affectedUsers: string[];
}

class SecurityMonitor {
  private static instance: SecurityMonitor;
  private events: SecurityEvent[] = [];
  private alerts: SecurityAlert[] = [];
  private eventBuffer = new Map<string, SecurityEvent[]>();
  private isEnabled = true;
  private maxEventHistory = 10000;
  private alertThresholds: Record<SecurityEventType, { count: number; timeWindow: number }> = {
    xss_attempt: { count: 5, timeWindow: 300000 }, // 5 attempts in 5 minutes
    sql_injection: { count: 3, timeWindow: 300000 }, // 3 attempts in 5 minutes
    csrf_attempt: { count: 10, timeWindow: 600000 }, // 10 attempts in 10 minutes
    rate_limit_exceeded: { count: 100, timeWindow: 3600000 }, // 100 attempts in 1 hour
    authentication_failure: { count: 10, timeWindow: 900000 }, // 10 failures in 15 minutes
    authorization_failure: { count: 20, timeWindow: 600000 }, // 20 failures in 10 minutes
    suspicious_request: { count: 15, timeWindow: 300000 }, // 15 requests in 5 minutes
    malicious_upload: { count: 5, timeWindow: 300000 }, // 5 uploads in 5 minutes
    session_hijack: { count: 1, timeWindow: 60000 }, // 1 attempt in 1 minute
    brute_force: { count: 20, timeWindow: 600000 }, // 20 attempts in 10 minutes
    csp_violation: { count: 50, timeWindow: 3600000 }, // 50 violations in 1 hour
    cors_violation: { count: 30, timeWindow: 1800000 }, // 30 violations in 30 minutes
    security_misconfiguration: { count: 1, timeWindow: 60000 } // 1 misconfiguration in 1 minute
  };

  private constructor() {
    // Check if security monitoring should be disabled
    const disableMonitoring = process.env.NODE_ENV === 'development' ||
                              process.env.DISABLE_SECURITY_MONITORING === 'true';

    if (disableMonitoring) {
      this.isEnabled = false;
      return;
    }

    this.initializeMonitoring();
  }

  static getInstance(): SecurityMonitor {
    if (!SecurityMonitor.instance) {
      SecurityMonitor.instance = new SecurityMonitor();
    }
    return SecurityMonitor.instance;
  }

  private initializeMonitoring() {
    // Clean up old events periodically
    setInterval(() => {
      this.cleanupOldEvents();
    }, 600000); // Every 10 minutes

    // Process alerts periodically
    setInterval(() => {
      this.processAlerts();
    }, 60000); // Every minute

  }

  /**
   * Log a security event
   */
  logEvent(
    type: SecurityEventType,
    details: Record<string, any>,
    severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
    source: string = 'unknown'
  ): void {
    if (!this.isEnabled) return;

    const event: SecurityEvent = {
      id: this.generateEventId(),
      type,
      severity,
      timestamp: new Date().toISOString(),
      source,
      details,
      userAgent: this.getUserAgent(),
      clientIP: this.getClientIP(),
      userId: this.getCurrentUserId(),
      sessionId: this.getSessionId()
    };

    // Add to events history
    this.events.push(event);
    this.limitEventHistory();

    // Add to buffer for alert processing
    this.addToBuffer(event);

    // Log based on severity
    this.logEventToConsole(event);

    // Send to external monitoring if configured
    this.sendToExternalMonitoring(event);

    // Process immediate alerts for critical events
    if (severity === 'critical') {
      this.processCriticalEvent(event);
    }
  }

  private addToBuffer(event: SecurityEvent): void {
    const key = `${event.type}:${event.clientIP}`;
    if (!this.eventBuffer.has(key)) {
      this.eventBuffer.set(key, []);
    }
    this.eventBuffer.get(key)!.push(event);
  }

  private generateEventId(): string {
    return `evt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private getUserAgent(): string {
    if (typeof window !== 'undefined') {
      return window.navigator.userAgent;
    }
    return 'server';
  }

  private getClientIP(): string {
    // This would be set by middleware or extracted from headers
    return 'unknown';
  }

  private getCurrentUserId(): string | undefined {
    // This would be extracted from current session/auth context
    return undefined;
  }

  private getSessionId(): string | undefined {
    // This would be extracted from current session
    return undefined;
  }

  private logEventToConsole(event: SecurityEvent): void {
    const logLevel = {
      low: 'info',
      medium: 'warn',
      high: 'error',
      critical: 'error'
    }[event.severity];

    const message = `Security Event [${event.type}] ${event.severity.toUpperCase()}: ${JSON.stringify(event.details)}`;

    console[logLevel as 'info' | 'warn' | 'error'](message, {
      eventId: event.id,
      timestamp: event.timestamp,
      source: event.source,
      clientIP: event.clientIP,
      userAgent: event.userAgent
    });
  }

  private sendToExternalMonitoring(event: SecurityEvent): void {
    // Send to Sentry, DataDog, or other monitoring services
    if (typeof window !== 'undefined' && (window as any).gtag) {
      // Send to Google Analytics as custom event
      (window as any).gtag('event', 'security_event', {
        event_category: 'security',
        event_label: event.type,
        value: event.severity === 'critical' ? 4 : event.severity === 'high' ? 3 : event.severity === 'medium' ? 2 : 1
      });
    }

    // Send to backend monitoring endpoint
    if (event.severity === 'high' || event.severity === 'critical') {
      this.sendToBackendMonitoring(event);
    }
  }

  private async sendToBackendMonitoring(event: SecurityEvent): Promise<void> {
    try {
      await fetch('/api/monitoring/security-events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(event)
      });
    } catch (error) {
      console.error('Failed to send security event to backend:', error);
    }
  }

  private processCriticalEvent(event: SecurityEvent): void {
    // Immediate actions for critical events
    console.error('CRITICAL SECURITY EVENT:', event);

    // Could trigger immediate alerts, notifications, etc.
    this.createAlert(event.type, [event]);
  }

  private processAlerts(): void {
    for (const [key, events] of this.eventBuffer.entries()) {
      const [eventType] = key.split(':') as [SecurityEventType, string];
      const threshold = this.alertThresholds[eventType];

      if (!threshold) continue;

      // Filter events within time window
      const now = Date.now();
      const recentEvents = events.filter(event =>
        now - new Date(event.timestamp).getTime() < threshold.timeWindow
      );

      // Check if threshold is exceeded
      if (recentEvents.length >= threshold.count) {
        this.createAlert(eventType, recentEvents);

        // Clear processed events
        this.eventBuffer.set(key, []);
      }
    }
  }

  private createAlert(eventType: SecurityEventType, events: SecurityEvent[]): void {
    const alertId = `alert_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    const alert: SecurityAlert = {
      id: alertId,
      eventType,
      count: events.length,
      timeWindow: this.alertThresholds[eventType].timeWindow,
      threshold: this.alertThresholds[eventType].count,
      firstSeen: events[0].timestamp,
      lastSeen: events[events.length - 1].timestamp,
      affectedIPs: [...new Set(events.map(e => e.clientIP).filter((ip): ip is string => Boolean(ip)))],
      affectedUsers: [...new Set(events.map(e => e.userId).filter((id): id is string => Boolean(id)))]
    };

    this.alerts.push(alert);

    console.error('SECURITY ALERT TRIGGERED:', alert);

    // Send alert notification
    this.sendAlertNotification(alert);
  }

  private async sendAlertNotification(alert: SecurityAlert): Promise<void> {
    // Send to notification systems (email, Slack, PagerDuty, etc.)
    try {
      await fetch('/api/monitoring/security-alerts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(alert)
      });
    } catch (error) {
      console.error('Failed to send security alert:', error);
    }
  }

  private cleanupOldEvents(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago

    // Clean main events array
    this.events = this.events.filter(event =>
      new Date(event.timestamp).getTime() > cutoffTime
    );

    // Clean event buffer
    for (const [key, events] of this.eventBuffer.entries()) {
      const filteredEvents = events.filter(event =>
        new Date(event.timestamp).getTime() > cutoffTime
      );

      if (filteredEvents.length === 0) {
        this.eventBuffer.delete(key);
      } else {
        this.eventBuffer.set(key, filteredEvents);
      }
    }

    // Limit event history size
    this.limitEventHistory();
  }

  private limitEventHistory(): void {
    if (this.events.length > this.maxEventHistory) {
      this.events = this.events.slice(-this.maxEventHistory);
    }
  }

  /**
   * Get security events
   */
  getEvents(
    filter?: {
      type?: SecurityEventType;
      severity?: 'low' | 'medium' | 'high' | 'critical';
      timeRange?: number; // milliseconds
      clientIP?: string;
      userId?: string;
    }
  ): SecurityEvent[] {
    let filteredEvents = [...this.events];

    if (filter) {
      if (filter.type) {
        filteredEvents = filteredEvents.filter(e => e.type === filter.type);
      }

      if (filter.severity) {
        filteredEvents = filteredEvents.filter(e => e.severity === filter.severity);
      }

      if (filter.timeRange) {
        const cutoff = Date.now() - filter.timeRange;
        filteredEvents = filteredEvents.filter(e =>
          new Date(e.timestamp).getTime() > cutoff
        );
      }

      if (filter.clientIP) {
        filteredEvents = filteredEvents.filter(e => e.clientIP === filter.clientIP);
      }

      if (filter.userId) {
        filteredEvents = filteredEvents.filter(e => e.userId === filter.userId);
      }
    }

    return filteredEvents.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }

  /**
   * Get security alerts
   */
  getAlerts(): SecurityAlert[] {
    return [...this.alerts].sort((a, b) =>
      new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime()
    );
  }

  /**
   * Get security statistics
   */
  getStatistics(timeRange: number = 24 * 60 * 60 * 1000): {
    totalEvents: number;
    eventsByType: Record<SecurityEventType, number>;
    eventsBySeverity: Record<string, number>;
    totalAlerts: number;
    topIPs: Array<{ ip: string; count: number }>;
    timeline: Array<{ timestamp: string; count: number }>;
  } {
    const cutoff = Date.now() - timeRange;
    const recentEvents = this.events.filter(e =>
      new Date(e.timestamp).getTime() > cutoff
    );

    const eventsByType = {} as Record<SecurityEventType, number>;
    const eventsBySeverity = { low: 0, medium: 0, high: 0, critical: 0 };
    const ipCounts = new Map<string, number>();

    recentEvents.forEach(event => {
      // Count by type
      eventsByType[event.type] = (eventsByType[event.type] || 0) + 1;

      // Count by severity
      eventsBySeverity[event.severity]++;

      // Count by IP
      if (event.clientIP) {
        ipCounts.set(event.clientIP, (ipCounts.get(event.clientIP) || 0) + 1);
      }
    });

    // Top IPs
    const topIPs = Array.from(ipCounts.entries())
      .map(([ip, count]) => ({ ip, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    // Timeline (hourly buckets)
    const timeline = this.generateTimeline(recentEvents, timeRange);

    return {
      totalEvents: recentEvents.length,
      eventsByType,
      eventsBySeverity,
      totalAlerts: this.alerts.length,
      topIPs,
      timeline
    };
  }

  private generateTimeline(events: SecurityEvent[], timeRange: number): Array<{ timestamp: string; count: number }> {
    const bucketSize = Math.max(timeRange / 24, 60 * 60 * 1000); // At least 1 hour buckets
    const buckets = new Map<number, number>();

    events.forEach(event => {
      const eventTime = new Date(event.timestamp).getTime();
      const bucketKey = Math.floor(eventTime / bucketSize) * bucketSize;
      buckets.set(bucketKey, (buckets.get(bucketKey) || 0) + 1);
    });

    return Array.from(buckets.entries())
      .map(([timestamp, count]) => ({
        timestamp: new Date(timestamp).toISOString(),
        count
      }))
      .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  /**
   * Enable/disable monitoring
   */
  setEnabled(enabled: boolean): void {
    this.isEnabled = enabled;
  }

  /**
   * Update alert thresholds
   */
  updateThresholds(newThresholds: Partial<typeof this.alertThresholds>): void {
    this.alertThresholds = { ...this.alertThresholds, ...newThresholds };
  }
}

// Singleton instance
export const securityMonitor = SecurityMonitor.getInstance();

// Export types and monitoring functions
export type { SecurityEvent, SecurityEventType, SecurityAlert };

export function logSecurityEvent(
  type: SecurityEventType,
  details: Record<string, any>,
  severity: 'low' | 'medium' | 'high' | 'critical' = 'medium',
  source: string = 'frontend'
): void {
  securityMonitor.logEvent(type, details, severity, source);
}

export function getSecurityEvents(filter?: Parameters<typeof securityMonitor.getEvents>[0]) {
  return securityMonitor.getEvents(filter);
}

export function getSecurityAlerts() {
  return securityMonitor.getAlerts();
}

export function getSecurityStatistics(timeRange?: number) {
  return securityMonitor.getStatistics(timeRange);
}

// Initialize monitoring
const disableMonitoring = process.env.NODE_ENV === 'development' ||
                          process.env.DISABLE_SECURITY_MONITORING === 'true';

if (!disableMonitoring) {
  if (typeof window !== 'undefined') {
    // Client-side initialization
  } else {
    // Server-side initialization
  }
}
