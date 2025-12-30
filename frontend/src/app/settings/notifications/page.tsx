"use client";

import {
  ArrowLeft,
  Bell,
  BellOff,
  Globe,
  Mail,
  MessageSquare,
  Monitor,
  Save,
  Shield,
  Smartphone,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/shared/components/ui/card";
import { Label } from "@/shared/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/shared/components/ui/select";
import { Switch } from "@/shared/components/ui/switch";
import { Separator } from "@/shared/components/ui/separator";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/shared/components/ui/tabs";

// Notification preference types
interface NotificationChannel {
  id: string;
  name: string;
  description: string;
  icon: React.ElementType;
  enabled: boolean;
}

interface NotificationCategory {
  id: string;
  name: string;
  description: string;
  email: boolean;
  push: boolean;
  inApp: boolean;
}

// Default preferences
const defaultChannels: NotificationChannel[] = [
  {
    id: "email",
    name: "Email Notifications",
    description: "Receive notifications via email",
    icon: Mail,
    enabled: true,
  },
  {
    id: "push",
    name: "Push Notifications",
    description: "Receive browser push notifications",
    icon: Smartphone,
    enabled: true,
  },
  {
    id: "inApp",
    name: "In-App Notifications",
    description: "Show notifications within the application",
    icon: Bell,
    enabled: true,
  },
];

const defaultCategories: NotificationCategory[] = [
  {
    id: "security",
    name: "Security Alerts",
    description: "Login attempts, password changes, and security events",
    email: true,
    push: true,
    inApp: true,
  },
  {
    id: "system",
    name: "System Updates",
    description: "Maintenance schedules, feature updates, and system status",
    email: true,
    push: false,
    inApp: true,
  },
  {
    id: "activity",
    name: "Activity Updates",
    description: "Actions on your content, mentions, and assignments",
    email: false,
    push: true,
    inApp: true,
  },
  {
    id: "marketing",
    name: "Product Updates",
    description: "New features, tips, and promotional content",
    email: false,
    push: false,
    inApp: true,
  },
  {
    id: "team",
    name: "Team Activity",
    description: "Team member actions, invitations, and collaboration",
    email: true,
    push: true,
    inApp: true,
  },
  {
    id: "reports",
    name: "Reports & Summaries",
    description: "Weekly digests, analytics reports, and summaries",
    email: true,
    push: false,
    inApp: false,
  },
];

export default function NotificationPreferencesPage() {
  const [channels, setChannels] = React.useState<NotificationChannel[]>(defaultChannels);
  const [categories, setCategories] = React.useState<NotificationCategory[]>(defaultCategories);
  const [saving, setSaving] = React.useState(false);
  const [hasChanges, setHasChanges] = React.useState(false);

  // Sound and display preferences
  const [soundEnabled, setSoundEnabled] = React.useState(true);
  const [desktopEnabled, setDesktopEnabled] = React.useState(true);
  const [digestFrequency, setDigestFrequency] = React.useState("daily");
  const [quietHoursEnabled, setQuietHoursEnabled] = React.useState(false);
  const [quietHoursStart, setQuietHoursStart] = React.useState("22:00");
  const [quietHoursEnd, setQuietHoursEnd] = React.useState("08:00");

  const handleChannelToggle = (channelId: string) => {
    setChannels((prev) =>
      prev.map((ch) =>
        ch.id === channelId ? { ...ch, enabled: !ch.enabled } : ch
      )
    );
    setHasChanges(true);
  };

  const handleCategoryChange = (
    categoryId: string,
    channel: "email" | "push" | "inApp",
    value: boolean
  ) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId ? { ...cat, [channel]: value } : cat
      )
    );
    setHasChanges(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Replace with actual API call
      // await apiClient.put("/api/v1/users/notification-preferences", {
      //   channels,
      //   categories,
      //   soundEnabled,
      //   desktopEnabled,
      //   digestFrequency,
      //   quietHours: quietHoursEnabled ? { start: quietHoursStart, end: quietHoursEnd } : null,
      // });
      await new Promise((resolve) => setTimeout(resolve, 500));
      setHasChanges(false);
    } catch (error) {
      console.error("Failed to save preferences:", error);
    } finally {
      setSaving(false);
    }
  };

  const handleReset = () => {
    setChannels(defaultChannels);
    setCategories(defaultCategories);
    setSoundEnabled(true);
    setDesktopEnabled(true);
    setDigestFrequency("daily");
    setQuietHoursEnabled(false);
    setHasChanges(true);
  };

  // Check if a channel is disabled
  const isChannelEnabled = (channelId: string) => {
    return channels.find((ch) => ch.id === channelId)?.enabled ?? false;
  };

  return (
    <div className="container mx-auto py-6 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/settings">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Notification Preferences</h1>
            <p className="text-muted-foreground">
              Manage how and when you receive notifications
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleReset} disabled={saving}>
            Reset to Default
          </Button>
          <Button onClick={handleSave} disabled={saving || !hasChanges}>
            <Save className="h-4 w-4 mr-2" />
            {saving ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </div>

      {hasChanges && (
        <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950/30">
          <CardContent className="py-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-200">
              You have unsaved changes. Remember to save your preferences.
            </p>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="channels" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="channels">
            <Bell className="h-4 w-4 mr-2" />
            Channels
          </TabsTrigger>
          <TabsTrigger value="categories">
            <MessageSquare className="h-4 w-4 mr-2" />
            Categories
          </TabsTrigger>
          <TabsTrigger value="preferences">
            <Monitor className="h-4 w-4 mr-2" />
            Preferences
          </TabsTrigger>
        </TabsList>

        {/* Channels Tab */}
        <TabsContent value="channels" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Channels</CardTitle>
              <CardDescription>
                Choose how you want to receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {channels.map((channel) => {
                const Icon = channel.icon;
                return (
                  <div
                    key={channel.id}
                    className="flex items-center justify-between"
                  >
                    <div className="flex items-center gap-4">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <Label className="text-base">{channel.name}</Label>
                        <p className="text-sm text-muted-foreground">
                          {channel.description}
                        </p>
                      </div>
                    </div>
                    <Switch
                      checked={channel.enabled}
                      onCheckedChange={() => handleChannelToggle(channel.id)}
                    />
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Push Notification Setup */}
          {isChannelEnabled("push") && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  Push Notification Setup
                </CardTitle>
                <CardDescription>
                  Configure browser push notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Browser Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Allow notifications in your browser
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Request Permission
                  </Button>
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <Label>Test Notification</Label>
                    <p className="text-sm text-muted-foreground">
                      Send a test notification to verify setup
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Send Test
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Categories Tab */}
        <TabsContent value="categories" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notification Categories</CardTitle>
              <CardDescription>
                Choose which types of notifications you want to receive on each channel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Header Row */}
                <div className="grid grid-cols-4 gap-4 pb-2 border-b">
                  <div className="text-sm font-medium">Category</div>
                  <div className="text-sm font-medium text-center">
                    <Mail className="h-4 w-4 inline-block mr-1" />
                    Email
                  </div>
                  <div className="text-sm font-medium text-center">
                    <Smartphone className="h-4 w-4 inline-block mr-1" />
                    Push
                  </div>
                  <div className="text-sm font-medium text-center">
                    <Bell className="h-4 w-4 inline-block mr-1" />
                    In-App
                  </div>
                </div>

                {/* Category Rows */}
                {categories.map((category) => (
                  <div key={category.id} className="grid grid-cols-4 gap-4 items-center">
                    <div>
                      <Label className="text-base">{category.name}</Label>
                      <p className="text-xs text-muted-foreground">
                        {category.description}
                      </p>
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={category.email && isChannelEnabled("email")}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(category.id, "email", checked)
                        }
                        disabled={!isChannelEnabled("email")}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={category.push && isChannelEnabled("push")}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(category.id, "push", checked)
                        }
                        disabled={!isChannelEnabled("push")}
                      />
                    </div>
                    <div className="flex justify-center">
                      <Switch
                        checked={category.inApp && isChannelEnabled("inApp")}
                        onCheckedChange={(checked) =>
                          handleCategoryChange(category.id, "inApp", checked)
                        }
                        disabled={!isChannelEnabled("inApp")}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Disabled Channels Warning */}
          {channels.some((ch) => !ch.enabled) && (
            <Card className="border-muted">
              <CardContent className="py-4">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <BellOff className="h-4 w-4" />
                  <span>
                    Some channels are disabled. Enable them in the Channels tab to
                    configure category preferences.
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Preferences Tab */}
        <TabsContent value="preferences" className="space-y-6">
          {/* Sound & Display */}
          <Card>
            <CardHeader>
              <CardTitle>Sound & Display</CardTitle>
              <CardDescription>
                Configure notification sounds and display options
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    {soundEnabled ? (
                      <Volume2 className="h-5 w-5 text-primary" />
                    ) : (
                      <VolumeX className="h-5 w-5 text-muted-foreground" />
                    )}
                  </div>
                  <div>
                    <Label>Notification Sound</Label>
                    <p className="text-sm text-muted-foreground">
                      Play a sound when notifications arrive
                    </p>
                  </div>
                </div>
                <Switch
                  checked={soundEnabled}
                  onCheckedChange={(checked) => {
                    setSoundEnabled(checked);
                    setHasChanges(true);
                  }}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Monitor className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <Label>Desktop Notifications</Label>
                    <p className="text-sm text-muted-foreground">
                      Show notifications on your desktop
                    </p>
                  </div>
                </div>
                <Switch
                  checked={desktopEnabled}
                  onCheckedChange={(checked) => {
                    setDesktopEnabled(checked);
                    setHasChanges(true);
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Email Digest */}
          <Card>
            <CardHeader>
              <CardTitle>Email Digest</CardTitle>
              <CardDescription>
                Receive a summary of notifications via email
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Digest Frequency</Label>
                  <p className="text-sm text-muted-foreground">
                    How often you want to receive email summaries
                  </p>
                </div>
                <Select
                  value={digestFrequency}
                  onValueChange={(value) => {
                    setDigestFrequency(value);
                    setHasChanges(true);
                  }}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Hourly</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="never">Never</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Quiet Hours */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Quiet Hours
                <Badge variant="secondary">Do Not Disturb</Badge>
              </CardTitle>
              <CardDescription>
                Mute notifications during specific hours
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label>Enable Quiet Hours</Label>
                  <p className="text-sm text-muted-foreground">
                    Pause notifications during specified times
                  </p>
                </div>
                <Switch
                  checked={quietHoursEnabled}
                  onCheckedChange={(checked) => {
                    setQuietHoursEnabled(checked);
                    setHasChanges(true);
                  }}
                />
              </div>

              {quietHoursEnabled && (
                <>
                  <Separator />
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="quiet-start">Start Time</Label>
                      <Select
                        value={quietHoursStart}
                        onValueChange={(value) => {
                          setQuietHoursStart(value);
                          setHasChanges(true);
                        }}
                      >
                        <SelectTrigger id="quiet-start">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, "0");
                            return (
                              <SelectItem key={hour} value={`${hour}:00`}>
                                {hour}:00
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="quiet-end">End Time</Label>
                      <Select
                        value={quietHoursEnd}
                        onValueChange={(value) => {
                          setQuietHoursEnd(value);
                          setHasChanges(true);
                        }}
                      >
                        <SelectTrigger id="quiet-end">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 24 }, (_, i) => {
                            const hour = i.toString().padStart(2, "0");
                            return (
                              <SelectItem key={hour} value={`${hour}:00`}>
                                {hour}:00
                              </SelectItem>
                            );
                          })}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    Notifications will be silenced from {quietHoursStart} to{" "}
                    {quietHoursEnd}. Emergency security alerts will still be sent.
                  </p>
                </>
              )}
            </CardContent>
          </Card>

          {/* Timezone */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Globe className="h-5 w-5" />
                Timezone
              </CardTitle>
              <CardDescription>
                Set your timezone for notification scheduling
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Select defaultValue="America/New_York">
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="America/New_York">
                    Eastern Time (US & Canada)
                  </SelectItem>
                  <SelectItem value="America/Chicago">
                    Central Time (US & Canada)
                  </SelectItem>
                  <SelectItem value="America/Denver">
                    Mountain Time (US & Canada)
                  </SelectItem>
                  <SelectItem value="America/Los_Angeles">
                    Pacific Time (US & Canada)
                  </SelectItem>
                  <SelectItem value="Europe/London">London</SelectItem>
                  <SelectItem value="Europe/Paris">Paris</SelectItem>
                  <SelectItem value="Asia/Tokyo">Tokyo</SelectItem>
                  <SelectItem value="Australia/Sydney">Sydney</SelectItem>
                </SelectContent>
              </Select>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
