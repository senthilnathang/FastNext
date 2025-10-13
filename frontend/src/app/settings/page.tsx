'use client';

import React, { Suspense } from 'react';
import { useAuth } from '@/modules/auth';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle,
  Button,
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from '@/shared/components';
import { UpdateProfileForm, ChangePasswordForm, SecuritySettings } from '@/modules/auth';
import ActivityLogViewer from '@/modules/admin/components/ActivityLogViewer';
import { useTabState } from '@/shared/hooks';
import {
  User,
  Lock,
  Shield,
  Activity,
  Settings as SettingsIcon,
  Bell,
  AlertTriangle,
  Clock
} from 'lucide-react';

// Password Expiry Warning Component
function PasswordExpiryWarning({ user }: { user: any }) {
  const getPasswordExpiryStatus = () => {
    const passwordChangedAt = (user as any).password_changed_at;
    if (!passwordChangedAt) {
      return {
        status: 'warning',
        message: 'Password has never been changed. Consider updating it for better security.',
        icon: AlertTriangle,
        color: 'yellow'
      };
    }

    const lastChanged = new Date(passwordChangedAt);
    const now = new Date();
    const daysSinceChange = Math.floor((now.getTime() - lastChanged.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceChange > 90) {
      return {
        status: 'warning',
        message: `Password was last changed ${daysSinceChange} days ago. Consider updating it regularly.`,
        icon: AlertTriangle,
        color: 'yellow'
      };
    }

    if (daysSinceChange > 60) {
      return {
        status: 'info',
        message: `Password was last changed ${daysSinceChange} days ago.`,
        icon: Clock,
        color: 'blue'
      };
    }

    return null;
  };

  const expiryStatus = getPasswordExpiryStatus();

  if (!expiryStatus) return null;

  const Icon = expiryStatus.icon;
  const colorClasses = {
    yellow: 'bg-yellow-50 border-yellow-200 text-yellow-800',
    blue: 'bg-blue-50 border-blue-200 text-blue-800',
    red: 'bg-red-50 border-red-200 text-red-800'
  };

  return (
    <Card className={`${colorClasses[expiryStatus.color as keyof typeof colorClasses]} border`}>
      <CardContent className="pt-6">
        <div className="flex items-center space-x-3">
          <Icon className="h-5 w-5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium">{expiryStatus.message}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              // Scroll to password tab
              const passwordTab = document.querySelector('[value="password"]') as HTMLElement;
              if (passwordTab) passwordTab.click();
            }}
            className="flex-shrink-0"
          >
            Update Password
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function SettingsContent() {
  const { user } = useAuth();
  
  // Use nuqs for tab state management
  const [activeTab, setActiveTab] = useTabState(
    ['profile', 'security', 'password', 'activity'] as const,
    'profile'
  );

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">

      {/* Settings Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="profile" className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>Profile</span>
          </TabsTrigger>
          <TabsTrigger value="security" className="flex items-center space-x-2">
            <Shield className="h-4 w-4" />
            <span>Security</span>
          </TabsTrigger>
          <TabsTrigger value="password" className="flex items-center space-x-2">
            <Lock className="h-4 w-4" />
            <span>Password</span>
          </TabsTrigger>
          <TabsTrigger value="activity" className="flex items-center space-x-2">
            <Activity className="h-4 w-4" />
            <span>Activity</span>
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-6">
          {/* Password Expiry Warning - Show at top on mobile */}
          <div className="block lg:hidden">
            <PasswordExpiryWarning user={user} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Profile Form */}
            <div className="lg:col-span-2">
              <UpdateProfileForm />
            </div>

             {/* Password Expiry Warning - Hidden on mobile, shown in sidebar on lg+ */}
             <div className="hidden lg:block">
               <PasswordExpiryWarning user={user} />
             </div>

             {/* User Info Card */}
             <div className="space-y-6">
               <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <User className="h-5 w-5" />
                    <span>Account Overview</span>
                  </CardTitle>
                  <CardDescription>Your account information</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Verification</p>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      user.is_verified 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-yellow-100 text-yellow-800'
                    }`}>
                      {user.is_verified ? 'Verified' : 'Pending'}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Member Since</p>
                    <p className="text-sm text-gray-900 dark:text-white">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                   <div>
                     <p className="text-sm font-medium text-gray-500">Last Login</p>
                     <p className="text-sm text-gray-900 dark:text-white">
                       {user.last_login_at ? new Date(user.last_login_at).toLocaleDateString() : 'Never'}
                     </p>
                   </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Password Changed</p>
                      <p className="text-sm text-gray-900 dark:text-white">
                        {(user as any).password_changed_at ? new Date((user as any).password_changed_at).toLocaleDateString() : 'Never'}
                      </p>
                    </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center space-x-2">
                    <Bell className="h-5 w-5" />
                    <span>Quick Actions</span>
                  </CardTitle>
                  <CardDescription>Common account tasks</CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('password')}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Change Password
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('security')}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Security Settings
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => setActiveTab('activity')}
                  >
                    <Activity className="h-4 w-4 mr-2" />
                    View Activity Log
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Security Tab */}
        <TabsContent value="security">
          <SecuritySettings />
        </TabsContent>

        {/* Password Tab */}
        <TabsContent value="password">
          <div className="max-w-2xl">
            <ChangePasswordForm />
          </div>
        </TabsContent>

        {/* Activity Tab */}
        <TabsContent value="activity">
          <ActivityLogViewer showUserActivitiesOnly={true} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600"></div>
      </div>
    }>
      <SettingsContent />
    </Suspense>
  );
}