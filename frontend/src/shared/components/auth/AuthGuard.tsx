'use client';

import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/modules/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/shared/components/ui/card';
import { Button } from '@/shared/components/ui/button';
import { Skeleton } from '@/shared/components/ui/skeleton';
import { Alert, AlertDescription } from '@/shared/components/ui/alert';
import { Shield, Lock, LogIn, AlertTriangle } from 'lucide-react';

interface AuthGuardProps {
  children: React.ReactNode;
  requireAuth?: boolean;
  redirectTo?: string;
  fallback?: React.ReactNode;
  allowedRoles?: string[];
  requiredPermissions?: string[];
}

// Routes that should always be accessible without authentication
const PUBLIC_ROUTES = [
  '/',           // Landing page
  '/login',      // Login page
  '/register',   // Registration page
  '/api-docs',   // API documentation
];

// Routes that require specific roles or permissions
const ROLE_PROTECTED_ROUTES: Record<string, { roles?: string[]; permissions?: string[] }> = {
  '/admin': { roles: ['admin', 'superuser'] },
  '/admin/users': { roles: ['admin', 'superuser'], permissions: ['user.manage'] },
  '/admin/roles': { roles: ['admin', 'superuser'], permissions: ['role.manage'] },
  '/admin/permissions': { roles: ['admin', 'superuser'], permissions: ['permission.manage'] },
  '/admin/data-import': { roles: ['admin', 'superuser'] },
  '/admin/data-export': { roles: ['admin', 'superuser'] },
  '/configuration/data-import-export': { roles: ['admin', 'superuser'] },
  '/configuration/permissions': { roles: ['admin', 'superuser'] },
  '/configuration': { roles: ['admin', 'superuser'] },
  '/settings': { permissions: ['profile.edit'] },
};

/**
 * Determines if a route should be publicly accessible
 */
const isPublicRoute = (pathname: string): boolean => {
  return PUBLIC_ROUTES.includes(pathname) || pathname.startsWith('/api/');
};

/**
 * Gets role and permission requirements for a route
 */
const getRouteRequirements = (pathname: string) => {
  // Check exact matches first
  if (ROLE_PROTECTED_ROUTES[pathname]) {
    return ROLE_PROTECTED_ROUTES[pathname];
  }

  // Check for parent path matches (e.g., /admin/users-simple matches /admin/users)
  const sortedRoutes = Object.keys(ROLE_PROTECTED_ROUTES).sort((a, b) => b.length - a.length);
  for (const route of sortedRoutes) {
    if (pathname.startsWith(route)) {
      return ROLE_PROTECTED_ROUTES[route];
    }
  }

  return {};
};

/**
 * Checks if user has required roles
 */
const hasRequiredRoles = (userRoles: string[] = [], requiredRoles: string[] = [], isSuperuser: boolean = false): boolean => {
  // Superusers bypass all role checks
  if (isSuperuser) return true;
  if (requiredRoles.length === 0) return true;
  return requiredRoles.some(role => userRoles.includes(role) || role === 'superuser');
};

/**
 * Checks if user has required permissions
 */
const hasRequiredPermissions = (userPermissions: string[] = [], requiredPermissions: string[] = [], isSuperuser: boolean = false): boolean => {
  // Superusers bypass all permission checks
  if (isSuperuser) return true;
  if (requiredPermissions.length === 0) return true;
  return requiredPermissions.every(permission => userPermissions.includes(permission));
};

/**
 * Loading component for authentication verification
 */
const AuthLoadingComponent = () => (
  <div className="min-h-screen bg-background flex items-center justify-center p-4">
    <Card className="w-full max-w-md">
      <CardHeader className="text-center space-y-4">
        <div className="mx-auto w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
          <Shield className="w-6 h-6 text-primary animate-pulse" />
        </div>
        <CardTitle>Verifying Authentication</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-4 w-5/6" />
        </div>
        <div className="text-center text-sm text-muted-foreground">
          Please wait while we verify your access...
        </div>
      </CardContent>
    </Card>
  </div>
);

/**
 * Unauthorized access component
 */
const UnauthorizedComponent = ({
  reason = 'authentication',
  onLogin,
  pathname
}: {
  reason?: 'authentication' | 'roles' | 'permissions';
  onLogin: () => void;
  pathname: string;
}) => {
  const messages = {
    authentication: {
      title: 'Authentication Required',
      description: 'Please log in to access this page.',
      icon: <LogIn className="w-6 h-6 text-blue-500" />,
      action: 'Log In'
    },
    roles: {
      title: 'Insufficient Role Permissions',
      description: 'You do not have the required role to access this page.',
      icon: <Lock className="w-6 h-6 text-orange-500" />,
      action: 'Contact Administrator'
    },
    permissions: {
      title: 'Access Denied',
      description: 'You do not have the required permissions to access this page.',
      icon: <AlertTriangle className="w-6 h-6 text-red-500" />,
      action: 'Request Access'
    }
  };

  const message = messages[reason];

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-12 h-12 bg-destructive/10 rounded-full flex items-center justify-center">
            {message.icon}
          </div>
          <CardTitle>{message.title}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>
              {message.description}
            </AlertDescription>
          </Alert>

          <div className="text-sm text-muted-foreground">
            <strong>Attempted to access:</strong> {pathname}
          </div>

          <div className="flex gap-2">
            {reason === 'authentication' && (
              <Button onClick={onLogin} className="flex-1">
                <LogIn className="w-4 h-4 mr-2" />
                {message.action}
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => window.history.back()}
              className={reason === 'authentication' ? 'flex-1' : 'w-full'}
            >
              Go Back
            </Button>
          </div>

          {reason !== 'authentication' && (
            <div className="text-xs text-center text-muted-foreground">
              Contact your administrator if you believe this is an error
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

/**
 * AuthGuard - Comprehensive authentication and authorization guard
 *
 * Features:
 * - Route-based authentication verification
 * - Role-based access control (RBAC)
 * - Permission-based access control
 * - Automatic redirect preservation
 * - Loading states during verification
 * - Comprehensive error handling
 * - Custom fallback components
 */
export default function AuthGuard({
  children,
  requireAuth = true,
  redirectTo = '/login',
  fallback,
  allowedRoles = [],
  requiredPermissions = []
}: AuthGuardProps) {
  const { user, isLoading, isAuthenticated } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasCheckedAuth, setHasCheckedAuth] = useState(false);

  // Store current path for redirect after login
  useEffect(() => {
    if (!isAuthenticated && pathname !== '/login' && pathname !== '/register' && pathname !== '/') {
      sessionStorage.setItem('redirectAfterLogin', pathname);
    }
  }, [pathname, isAuthenticated]);

  // Check authentication and authorization
  useEffect(() => {
    if (!isLoading) {
      setHasCheckedAuth(true);
    }
  }, [isLoading]);

  // Handle automatic redirects for protected routes
  useEffect(() => {
    if (hasCheckedAuth && !isLoading) {
      // Skip checks for public routes
      if (isPublicRoute(pathname)) {
        return;
      }

      // Check if authentication is required
      if (requireAuth && !isAuthenticated) {
        router.push(`${redirectTo}?reason=authentication&redirect=${encodeURIComponent(pathname)}`);
        return;
      }

      // Check role and permission requirements
      if (isAuthenticated && user) {
        const routeRequirements = getRouteRequirements(pathname);
        const combinedRoles = [...allowedRoles, ...(routeRequirements.roles || [])];
        const combinedPermissions = [...requiredPermissions, ...(routeRequirements.permissions || [])];

        const hasRoles = hasRequiredRoles(user.roles, combinedRoles, user.is_superuser);
        const hasPermissions = hasRequiredPermissions(user.permissions, combinedPermissions, user.is_superuser);

        if (!hasRoles || !hasPermissions) {
          // Don't redirect, just show unauthorized component
          return;
        }
      }
    }
  }, [hasCheckedAuth, isLoading, isAuthenticated, user, pathname, requireAuth, redirectTo, router, allowedRoles, requiredPermissions]);

  // Show loading state while checking authentication
  if (isLoading || !hasCheckedAuth) {
    return fallback || <AuthLoadingComponent />;
  }

  // Skip guards for public routes
  if (isPublicRoute(pathname)) {
    return <>{children}</>;
  }

  // Check authentication requirement
  if (requireAuth && !isAuthenticated) {
    return (
      <UnauthorizedComponent
        reason="authentication"
        onLogin={() => router.push(`${redirectTo}?redirect=${encodeURIComponent(pathname)}`)}
        pathname={pathname}
      />
    );
  }

  // Check authorization requirements
  if (isAuthenticated && user) {
    const routeRequirements = getRouteRequirements(pathname);
    const combinedRoles = [...allowedRoles, ...(routeRequirements.roles || [])];
    const combinedPermissions = [...requiredPermissions, ...(routeRequirements.permissions || [])];

    const hasRoles = hasRequiredRoles(user.roles, combinedRoles, user.is_superuser);
    const hasPermissions = hasRequiredPermissions(user.permissions, combinedPermissions, user.is_superuser);

    if (!hasRoles) {
      return (
        <UnauthorizedComponent
          reason="roles"
          onLogin={() => {}}
          pathname={pathname}
        />
      );
    }

    if (!hasPermissions) {
      return (
        <UnauthorizedComponent
          reason="permissions"
          onLogin={() => {}}
          pathname={pathname}
        />
      );
    }
  }

  // All checks passed - render children
  return <>{children}</>;
}

/**
 * Higher-order component for wrapping pages with authentication
 */
export function withAuthGuard<P extends object>(
  Component: React.ComponentType<P>,
  options?: Omit<AuthGuardProps, 'children'>
) {
  return function AuthGuardedComponent(props: P) {
    return (
      <AuthGuard {...options}>
        <Component {...props} />
      </AuthGuard>
    );
  };
}

/**
 * Hook for checking authentication status in components
 */
export function useAuthGuard(requirements?: {
  roles?: string[];
  permissions?: string[];
}) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const pathname = usePathname();

  const routeRequirements = getRouteRequirements(pathname);
  const combinedRoles = [...(requirements?.roles || []), ...(routeRequirements.roles || [])];
  const combinedPermissions = [...(requirements?.permissions || []), ...(routeRequirements.permissions || [])];

  const hasRoles = hasRequiredRoles(user?.roles, combinedRoles, user?.is_superuser);
  const hasPermissions = hasRequiredPermissions(user?.permissions, combinedPermissions, user?.is_superuser);

  return {
    isAuthenticated,
    isLoading,
    hasRequiredAccess: hasRoles && hasPermissions,
    hasRoles,
    hasPermissions,
    user,
    isPublicRoute: isPublicRoute(pathname),
  };
}
