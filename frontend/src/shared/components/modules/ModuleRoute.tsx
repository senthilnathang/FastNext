/**
 * ModuleRoute Component
 *
 * A wrapper component that conditionally renders content based on
 * whether a module is installed. Shows a fallback UI when the module
 * is not installed.
 */

"use client";

import React, { useEffect, useState, type ReactNode } from "react";
import { useModules, useIsModuleInstalled } from "@/shared/hooks/useModules";
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Button } from "@/shared/components/ui/button";
import { AlertCircle, Package, Loader2 } from "lucide-react";
import { registerInstalledModules, isModuleAvailable } from "@/modules";

export interface ModuleRouteProps {
  /** The module name to check */
  moduleName: string;
  /** Content to render if module is installed */
  children: ReactNode;
  /** Custom fallback when module is not installed */
  fallback?: ReactNode;
  /** Whether to show install button in fallback */
  showInstallButton?: boolean;
  /** Custom title for the module not installed message */
  notInstalledTitle?: string;
  /** Custom message for module not installed */
  notInstalledMessage?: string;
}

/**
 * Default fallback component when module is not installed
 */
function DefaultModuleNotInstalled({
  moduleName,
  title,
  message,
  showInstallButton,
  onInstall,
  installing,
}: {
  moduleName: string;
  title?: string;
  message?: string;
  showInstallButton?: boolean;
  onInstall?: () => void;
  installing?: boolean;
}) {
  const available = isModuleAvailable(moduleName);

  return (
    <div className="flex items-center justify-center min-h-[400px] p-8">
      <Card className="max-w-md w-full">
        <CardHeader className="text-center">
          <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
            {available ? (
              <Package className="h-6 w-6 text-muted-foreground" />
            ) : (
              <AlertCircle className="h-6 w-6 text-destructive" />
            )}
          </div>
          <CardTitle>
            {title || `${moduleName.charAt(0).toUpperCase() + moduleName.slice(1)} Module Not Installed`}
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center">
          <p className="text-muted-foreground mb-4">
            {message ||
              (available
                ? `The ${moduleName} module is not installed. Install it to access this feature.`
                : `The ${moduleName} module is not available in this installation.`)}
          </p>
          {showInstallButton && available && onInstall && (
            <Button onClick={onInstall} disabled={installing}>
              {installing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {installing ? "Installing..." : `Install ${moduleName} Module`}
            </Button>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * ModuleRoute component
 *
 * Wraps route content to only render when the required module is installed.
 */
export function ModuleRoute({
  moduleName,
  children,
  fallback,
  showInstallButton = true,
  notInstalledTitle,
  notInstalledMessage,
}: ModuleRouteProps) {
  const { installModule, isModuleLoaded, initialized } = useModules();
  const [installing, setInstalling] = useState(false);
  const [registered, setRegistered] = useState(false);

  // Register modules when we know which ones are installed
  useEffect(() => {
    if (initialized && !registered) {
      // This will be called once on app initialization
      setRegistered(true);
    }
  }, [initialized, registered]);

  const isInstalled = isModuleLoaded(moduleName);

  const handleInstall = async () => {
    setInstalling(true);
    try {
      const result = await installModule(moduleName);
      if (result.success) {
        // Module installed, register it
        registerInstalledModules([moduleName]);
      }
    } finally {
      setInstalling(false);
    }
  };

  // Show loading state while initializing
  if (!initialized) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Module is installed, render children
  if (isInstalled) {
    return <>{children}</>;
  }

  // Module not installed, show fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  return (
    <DefaultModuleNotInstalled
      moduleName={moduleName}
      title={notInstalledTitle}
      message={notInstalledMessage}
      showInstallButton={showInstallButton}
      onInstall={handleInstall}
      installing={installing}
    />
  );
}

/**
 * Higher-order component to wrap a component with ModuleRoute
 */
export function withModuleRoute<P extends object>(
  Component: React.ComponentType<P>,
  moduleName: string,
  options?: Omit<ModuleRouteProps, "moduleName" | "children">
) {
  const WrappedComponent = (props: P) => (
    <ModuleRoute moduleName={moduleName} {...options}>
      <Component {...props} />
    </ModuleRoute>
  );

  WrappedComponent.displayName = `withModuleRoute(${Component.displayName || Component.name || "Component"})`;

  return WrappedComponent;
}

/**
 * Component that only renders children if ALL specified modules are installed
 */
export function RequireModules({
  modules,
  children,
  fallback,
}: {
  modules: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isModuleLoaded, initialized } = useModules();

  if (!initialized) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const allInstalled = modules.every((m) => isModuleLoaded(m));

  if (!allInstalled) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
}

/**
 * Component that only renders children if ANY of the specified modules are installed
 */
export function RequireAnyModule({
  modules,
  children,
  fallback,
}: {
  modules: string[];
  children: ReactNode;
  fallback?: ReactNode;
}) {
  const { isModuleLoaded, initialized } = useModules();

  if (!initialized) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const anyInstalled = modules.some((m) => isModuleLoaded(m));

  if (!anyInstalled) {
    if (fallback) {
      return <>{fallback}</>;
    }
    return null;
  }

  return <>{children}</>;
}

export default ModuleRoute;
