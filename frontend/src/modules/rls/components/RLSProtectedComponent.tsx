'use client';

import React, { ReactNode } from 'react';
import { useConditionalAccess } from '../hooks/useRLS';
import { Shield, Lock, AlertTriangle } from 'lucide-react';

interface RLSProtectedComponentProps {
  entityType: string;
  action: string;
  entityId?: number;
  children: ReactNode;
  fallback?: ReactNode;
  showLoader?: boolean;
  showDeniedMessage?: boolean;
  customDeniedMessage?: string;
  className?: string;
}

/**
 * Component that conditionally renders children based on RLS access control
 */
export default function RLSProtectedComponent({
  entityType,
  action,
  entityId,
  children,
  fallback,
  showLoader = true,
  showDeniedMessage = true,
  customDeniedMessage,
  className = ''
}: RLSProtectedComponentProps) {
  const { hasAccess, loading, error } = useConditionalAccess(
    entityType,
    action,
    entityId
  );

  // Show loading state
  if (loading && showLoader) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Checking permissions...</span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-md ${className}`}>
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <p className="text-sm text-red-600">
            Permission check failed: {error}
          </p>
        </div>
      </div>
    );
  }

  // Show access denied state
  if (hasAccess === false) {
    if (fallback) {
      return <>{fallback}</>;
    }

    if (showDeniedMessage) {
      return (
        <div className={`p-4 bg-gray-50 border border-gray-200 rounded-md ${className}`}>
          <div className="flex items-center">
            <Lock className="h-5 w-5 text-gray-400 mr-2" />
            <p className="text-sm text-gray-600">
              {customDeniedMessage || 
                `You don't have permission to ${action.toLowerCase()} ${entityType.toLowerCase()}.`
              }
            </p>
          </div>
        </div>
      );
    }

    return null;
  }

  // Show children if access is granted
  if (hasAccess === true) {
    return <div className={className}>{children}</div>;
  }

  // Default case (shouldn't reach here)
  return null;
}

/**
 * Higher-order component for RLS protection
 */
export function withRLSProtection<P extends object>(
  Component: React.ComponentType<P>,
  entityType: string,
  action: string,
  getEntityId?: (props: P) => number | undefined
) {
  return function RLSProtectedWrapper(props: P) {
    const entityId = getEntityId ? getEntityId(props) : undefined;

    return (
      <RLSProtectedComponent
        entityType={entityType}
        action={action}
        entityId={entityId}
      >
        <Component {...props} />
      </RLSProtectedComponent>
    );
  };
}

/**
 * Component for checking multiple permissions at once
 */
interface RLSMultiProtectedProps {
  checks: Array<{
    entityType: string;
    action: string;
    entityId?: number;
    required?: boolean; // If true, all required checks must pass
  }>;
  children: ReactNode;
  fallback?: ReactNode;
  requireAll?: boolean; // If true, all checks must pass; if false, any check passing is sufficient
  showLoader?: boolean;
  className?: string;
}

export function RLSMultiProtected({
  checks,
  children,
  fallback,
  requireAll = true,
  showLoader = true,
  className = ''
}: RLSMultiProtectedProps) {
  const accessResults = checks.map(check => 
    useConditionalAccess(check.entityType, check.action, check.entityId)
  );

  const loading = accessResults.some(result => result.loading);
  const errors = accessResults.map(result => result.error).filter(Boolean);
  const hasAccessResults = accessResults.map(result => result.hasAccess);

  // Show loading state
  if (loading && showLoader) {
    return (
      <div className={`flex items-center justify-center p-4 ${className}`}>
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-sm text-gray-600">Checking permissions...</span>
      </div>
    );
  }

  // Show error state
  if (errors.length > 0) {
    return (
      <div className={`p-4 bg-red-50 border border-red-200 rounded-md ${className}`}>
        <div className="flex items-center">
          <AlertTriangle className="h-5 w-5 text-red-400 mr-2" />
          <div>
            <p className="text-sm text-red-600 font-medium">Permission check failed:</p>
            {errors.map((error, index) => (
              <p key={index} className="text-xs text-red-500 mt-1">{error}</p>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Check access logic
  const hasAccess = requireAll
    ? hasAccessResults.every(result => result === true)
    : hasAccessResults.some(result => result === true);

  if (!hasAccess) {
    if (fallback) {
      return <>{fallback}</>;
    }

    return (
      <div className={`p-4 bg-gray-50 border border-gray-200 rounded-md ${className}`}>
        <div className="flex items-center">
          <Lock className="h-5 w-5 text-gray-400 mr-2" />
          <p className="text-sm text-gray-600">
            Insufficient permissions for this operation.
          </p>
        </div>
      </div>
    );
  }

  return <div className={className}>{children}</div>;
}

/**
 * Component for showing different content based on access level
 */
interface RLSConditionalProps {
  entityType: string;
  action: string;
  entityId?: number;
  granted: ReactNode;
  denied?: ReactNode;
  loading?: ReactNode;
  error?: ReactNode;
  className?: string;
}

export function RLSConditional({
  entityType,
  action,
  entityId,
  granted,
  denied,
  loading: loadingContent,
  error: errorContent,
  className = ''
}: RLSConditionalProps) {
  const { hasAccess, loading, error } = useConditionalAccess(
    entityType,
    action,
    entityId
  );

  if (loading) {
    return (
      <div className={className}>
        {loadingContent || (
          <div className="flex items-center p-2">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            <span className="text-sm text-gray-600">Checking...</span>
          </div>
        )}
      </div>
    );
  }

  if (error) {
    return (
      <div className={className}>
        {errorContent || (
          <div className="flex items-center p-2 text-red-600">
            <AlertTriangle className="h-4 w-4 mr-2" />
            <span className="text-sm">Error checking permission</span>
          </div>
        )}
      </div>
    );
  }

  if (hasAccess === true) {
    return <div className={className}>{granted}</div>;
  }

  if (hasAccess === false && denied) {
    return <div className={className}>{denied}</div>;
  }

  return null;
}

/**
 * Hook for creating RLS-aware button states
 */
export function useRLSButton(
  entityType: string,
  action: string,
  entityId?: number
) {
  const { hasAccess, loading, error } = useConditionalAccess(
    entityType,
    action,
    entityId
  );

  return {
    disabled: loading || error || hasAccess === false,
    loading,
    hasAccess,
    error,
    title: hasAccess === false 
      ? `You don't have permission to ${action.toLowerCase()} ${entityType.toLowerCase()}`
      : error 
        ? `Permission check failed: ${error}`
        : undefined
  };
}

/**
 * RLS-aware button component
 */
interface RLSButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  entityType: string;
  action: string;
  entityId?: number;
  children: ReactNode;
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'sm' | 'md' | 'lg';
  showIcon?: boolean;
}

export function RLSButton({
  entityType,
  action,
  entityId,
  children,
  className = '',
  disabled: externalDisabled,
  title: externalTitle,
  showIcon = true,
  ...props
}: RLSButtonProps) {
  const { disabled, loading, hasAccess, error, title } = useRLSButton(
    entityType,
    action,
    entityId
  );

  const isDisabled = disabled || externalDisabled;
  const buttonTitle = title || externalTitle;

  return (
    <button
      {...props}
      disabled={isDisabled}
      title={buttonTitle}
      className={`
        inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2
        disabled:opacity-50 disabled:pointer-events-none
        ${isDisabled ? 'cursor-not-allowed' : 'cursor-pointer'}
        ${className}
      `}
    >
      {loading && showIcon && (
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
      )}
      {hasAccess === false && showIcon && !loading && (
        <Lock className="h-4 w-4 mr-2" />
      )}
      {hasAccess === true && showIcon && !loading && (
        <Shield className="h-4 w-4 mr-2" />
      )}
      {children}
    </button>
  );
}

/**
 * RLS-aware form wrapper
 */
interface RLSFormProps {
  entityType: string;
  action: string;
  entityId?: number;
  children: ReactNode;
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  className?: string;
}

export function RLSForm({
  entityType,
  action,
  entityId,
  children,
  onSubmit,
  className = ''
}: RLSFormProps) {
  const { hasAccess, loading } = useConditionalAccess(
    entityType,
    action,
    entityId
  );

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    if (hasAccess === false || loading) {
      event.preventDefault();
      return;
    }
    
    if (onSubmit) {
      onSubmit(event);
    }
  };

  return (
    <RLSProtectedComponent
      entityType={entityType}
      action={action}
      entityId={entityId}
      className={className}
    >
      <form onSubmit={handleSubmit} className={className}>
        <fieldset disabled={loading || hasAccess === false}>
          {children}
        </fieldset>
      </form>
    </RLSProtectedComponent>
  );
}