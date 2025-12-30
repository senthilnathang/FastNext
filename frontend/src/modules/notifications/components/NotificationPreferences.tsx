"use client";

import React, { useEffect, useState } from "react";
import {
  Bell,
  BellOff,
  Clock,
  Mail,
  Save,
  Send,
  Smartphone,
} from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Card } from "@/shared/components/ui/card";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Switch } from "@/shared/components/ui/switch";
import {
  useMuteNotifications,
  useNotificationPreferences,
  useTestEmailNotification,
  useTestPushNotification,
  useUnmuteNotifications,
  useUpdateNotificationPreferences,
} from "../hooks/useNotificationPreferences";
import type { NotificationType, UpdateNotificationPreferences } from "../types";
import { NOTIFICATION_TYPE_CONFIG } from "../types";

interface NotificationPreferencesProps {
  onClose?: () => void;
  className?: string;
}

const NotificationPreferences: React.FC<NotificationPreferencesProps> = ({
  onClose,
  className = "",
}) => {
  // Fetch current preferences
  const { data: preferences, isLoading, error } = useNotificationPreferences();
  const updatePreferences = useUpdateNotificationPreferences();
  const muteNotifications = useMuteNotifications();
  const unmuteNotifications = useUnmuteNotifications();
  const testEmail = useTestEmailNotification();
  const testPush = useTestPushNotification();

  // Local form state
  const [formData, setFormData] = useState<UpdateNotificationPreferences>({
    email_enabled: true,
    email_digest: "instant",
    email_types: [],
    push_enabled: true,
    push_types: [],
    in_app_enabled: true,
    in_app_types: [],
    quiet_hours_enabled: false,
    quiet_hours_start: null,
    quiet_hours_end: null,
  });

  const [muteDuration, setMuteDuration] = useState<string>("1h");

  // Initialize form with fetched preferences
  useEffect(() => {
    if (preferences) {
      setFormData({
        email_enabled: preferences.email_enabled,
        email_digest: preferences.email_digest,
        email_types: preferences.email_types,
        push_enabled: preferences.push_enabled,
        push_types: preferences.push_types,
        in_app_enabled: preferences.in_app_enabled,
        in_app_types: preferences.in_app_types,
        quiet_hours_enabled: preferences.quiet_hours_enabled,
        quiet_hours_start: preferences.quiet_hours_start,
        quiet_hours_end: preferences.quiet_hours_end,
      });
    }
  }, [preferences]);

  // Toggle notification type for a channel
  const toggleNotificationType = (
    channel: "email_types" | "push_types" | "in_app_types",
    type: NotificationType
  ) => {
    setFormData((prev) => {
      const types = prev[channel] || [];
      const newTypes = types.includes(type)
        ? types.filter((t) => t !== type)
        : [...types, type];
      return { ...prev, [channel]: newTypes };
    });
  };

  // Handle save
  const handleSave = () => {
    updatePreferences.mutate(formData);
  };

  // Handle mute
  const handleMute = () => {
    const now = new Date();
    let muteUntil: Date;

    switch (muteDuration) {
      case "1h":
        muteUntil = new Date(now.getTime() + 60 * 60 * 1000);
        break;
      case "4h":
        muteUntil = new Date(now.getTime() + 4 * 60 * 60 * 1000);
        break;
      case "8h":
        muteUntil = new Date(now.getTime() + 8 * 60 * 60 * 1000);
        break;
      case "24h":
        muteUntil = new Date(now.getTime() + 24 * 60 * 60 * 1000);
        break;
      default:
        muteUntil = new Date(now.getTime() + 60 * 60 * 1000);
    }

    muteNotifications.mutate(muteUntil.toISOString());
  };

  const isMuted = preferences?.muted_until
    ? new Date(preferences.muted_until) > new Date()
    : false;

  if (isLoading) {
    return (
      <div className={`animate-pulse space-y-4 ${className}`}>
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded" />
        <div className="h-32 bg-gray-100 dark:bg-gray-800 rounded" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`text-center py-8 ${className}`}>
        <p className="text-red-500">Failed to load preferences</p>
        <Button variant="outline" className="mt-4" onClick={onClose}>
          Close
        </Button>
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900 dark:text-white">
          Notification Preferences
        </h2>
        {onClose && (
          <Button variant="ghost" size="sm" onClick={onClose}>
            Close
          </Button>
        )}
      </div>

      {/* Mute section */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            {isMuted ? (
              <BellOff className="w-5 h-5 text-gray-400" />
            ) : (
              <Bell className="w-5 h-5 text-blue-500" />
            )}
            <h3 className="font-medium text-gray-900 dark:text-white">
              {isMuted ? "Notifications Muted" : "Mute Notifications"}
            </h3>
          </div>
          {isMuted && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => unmuteNotifications.mutate()}
              disabled={unmuteNotifications.isPending}
            >
              Unmute
            </Button>
          )}
        </div>

        {isMuted && preferences?.muted_until && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Muted until{" "}
            {new Date(preferences.muted_until).toLocaleString()}
          </p>
        )}

        {!isMuted && (
          <div className="flex items-center gap-2">
            <select
              value={muteDuration}
              onChange={(e) => setMuteDuration(e.target.value)}
              className="px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800"
            >
              <option value="1h">1 hour</option>
              <option value="4h">4 hours</option>
              <option value="8h">8 hours</option>
              <option value="24h">24 hours</option>
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={handleMute}
              disabled={muteNotifications.isPending}
            >
              <BellOff className="w-4 h-4 mr-2" />
              Mute
            </Button>
          </div>
        )}
      </Card>

      {/* Email notifications */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Mail className="w-5 h-5 text-blue-500" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              Email Notifications
            </h3>
          </div>
          <Switch
            checked={formData.email_enabled}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, email_enabled: checked }))
            }
          />
        </div>

        {formData.email_enabled && (
          <div className="space-y-4">
            {/* Digest frequency */}
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400">
                Email Frequency
              </Label>
              <select
                value={formData.email_digest}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    email_digest: e.target.value as any,
                  }))
                }
                className="mt-1 w-full px-3 py-2 text-sm border rounded-lg bg-white dark:bg-gray-800"
              >
                <option value="instant">Instant</option>
                <option value="daily">Daily Digest</option>
                <option value="weekly">Weekly Digest</option>
                <option value="never">Never</option>
              </select>
            </div>

            {/* Notification types */}
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400">
                Notification Types
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(NOTIFICATION_TYPE_CONFIG) as NotificationType[]).map(
                  (type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.email_types?.includes(type)}
                        onChange={() => toggleNotificationType("email_types", type)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {NOTIFICATION_TYPE_CONFIG[type].label}
                      </span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Test email */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => testEmail.mutate()}
              disabled={testEmail.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Test Email
            </Button>
          </div>
        )}
      </Card>

      {/* Push notifications */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Smartphone className="w-5 h-5 text-green-500" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              Push Notifications
            </h3>
          </div>
          <Switch
            checked={formData.push_enabled}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, push_enabled: checked }))
            }
          />
        </div>

        {formData.push_enabled && (
          <div className="space-y-4">
            {/* Notification types */}
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400">
                Notification Types
              </Label>
              <div className="mt-2 grid grid-cols-2 gap-2">
                {(Object.keys(NOTIFICATION_TYPE_CONFIG) as NotificationType[]).map(
                  (type) => (
                    <label
                      key={type}
                      className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.push_types?.includes(type)}
                        onChange={() => toggleNotificationType("push_types", type)}
                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-700 dark:text-gray-300">
                        {NOTIFICATION_TYPE_CONFIG[type].label}
                      </span>
                    </label>
                  )
                )}
              </div>
            </div>

            {/* Test push */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => testPush.mutate()}
              disabled={testPush.isPending}
            >
              <Send className="w-4 h-4 mr-2" />
              Send Test Push
            </Button>
          </div>
        )}
      </Card>

      {/* In-app notifications */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Bell className="w-5 h-5 text-purple-500" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              In-App Notifications
            </h3>
          </div>
          <Switch
            checked={formData.in_app_enabled}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, in_app_enabled: checked }))
            }
          />
        </div>

        {formData.in_app_enabled && (
          <div>
            <Label className="text-sm text-gray-600 dark:text-gray-400">
              Notification Types
            </Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(Object.keys(NOTIFICATION_TYPE_CONFIG) as NotificationType[]).map(
                (type) => (
                  <label
                    key={type}
                    className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={formData.in_app_types?.includes(type)}
                      onChange={() => toggleNotificationType("in_app_types", type)}
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {NOTIFICATION_TYPE_CONFIG[type].label}
                    </span>
                  </label>
                )
              )}
            </div>
          </div>
        )}
      </Card>

      {/* Quiet hours */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h3 className="font-medium text-gray-900 dark:text-white">
              Quiet Hours
            </h3>
          </div>
          <Switch
            checked={formData.quiet_hours_enabled}
            onCheckedChange={(checked) =>
              setFormData((prev) => ({ ...prev, quiet_hours_enabled: checked }))
            }
          />
        </div>

        {formData.quiet_hours_enabled && (
          <div className="flex items-center gap-4">
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400">
                Start
              </Label>
              <Input
                type="time"
                value={formData.quiet_hours_start || "22:00"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quiet_hours_start: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
            <div>
              <Label className="text-sm text-gray-600 dark:text-gray-400">
                End
              </Label>
              <Input
                type="time"
                value={formData.quiet_hours_end || "07:00"}
                onChange={(e) =>
                  setFormData((prev) => ({
                    ...prev,
                    quiet_hours_end: e.target.value,
                  }))
                }
                className="mt-1"
              />
            </div>
          </div>
        )}

        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
          During quiet hours, you will not receive push or email notifications.
        </p>
      </Card>

      {/* Save button */}
      <div className="flex justify-end gap-2">
        {onClose && (
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
        )}
        <Button
          onClick={handleSave}
          disabled={updatePreferences.isPending}
        >
          <Save className="w-4 h-4 mr-2" />
          {updatePreferences.isPending ? "Saving..." : "Save Preferences"}
        </Button>
      </div>
    </div>
  );
};

export default NotificationPreferences;
