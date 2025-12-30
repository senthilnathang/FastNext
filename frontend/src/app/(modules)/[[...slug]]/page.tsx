/**
 * Dynamic Module Route Handler
 *
 * Handles routes for dynamically installed modules (demo, crm, marketplace).
 * Checks if the module is installed and renders the appropriate component.
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Package, AlertCircle } from "lucide-react";
import { modulesApi } from "@/lib/api/modules";

// Module component registry - lazy loaded
const moduleComponents: Record<string, Record<string, () => Promise<{ default: React.ComponentType }>>> = {
  demo: {
    "": () => import("@/modules/demo/pages/DemoPage"),
    "items": () => import("@/modules/demo/pages/DemoItemsPage"),
  },
  crm: {
    "": () => import("@/modules/crm/pages/CRMDashboard"),
    "leads": () => import("@/modules/crm/pages/LeadsPage"),
    "opportunities": () => import("@/modules/crm/pages/OpportunitiesPage"),
    "contacts": () => import("@/modules/crm/pages/ContactsPage"),
    "accounts": () => import("@/modules/crm/pages/AccountsPage"),
    "activities": () => import("@/modules/crm/pages/ActivitiesPage"),
    "settings": () => import("@/modules/crm/pages/SettingsPage"),
  },
  marketplace: {
    "": () => import("@/modules/marketplace/pages/MarketplacePage"),
    "cart": () => import("@/modules/marketplace/pages/CartPage"),
    "orders": () => import("@/modules/marketplace/pages/OrdersPage"),
    "licenses": () => import("@/modules/marketplace/pages/LicensesPage"),
    "publisher": () => import("@/modules/marketplace/pages/PublisherPage"),
  },
};

// Available modules that can be dynamically loaded
const DYNAMIC_MODULES = ["demo", "crm", "marketplace"];

interface ModulePageProps {
  params: Promise<{ slug?: string[] }>;
}

export default function ModulePage({ params }: ModulePageProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [moduleName, setModuleName] = useState<string | null>(null);
  const [subPath, setSubPath] = useState<string>("");
  const [Component, setComponent] = useState<React.ComponentType | null>(null);

  useEffect(() => {
    const checkAndLoadModule = async () => {
      try {
        // Await params since it's a Promise in Next.js 15
        const resolvedParams = await params;
        const slug = resolvedParams.slug || [];

        if (slug.length === 0) {
          // No module specified, redirect to dashboard
          router.push("/dashboard");
          return;
        }

        const modName = slug[0];
        const path = slug.slice(1).join("/");

        setModuleName(modName);
        setSubPath(path);

        // Check if this is a dynamic module
        if (!DYNAMIC_MODULES.includes(modName)) {
          setError("not_found");
          setLoading(false);
          return;
        }

        // Check if module is installed
        const response = await modulesApi.list({ state: "installed" });
        const installed = response.items.some(
          (m) => m.name === modName && m.state === "installed"
        );

        if (!installed) {
          setIsInstalled(false);
          setLoading(false);
          return;
        }

        setIsInstalled(true);

        // Load the component
        const modulePages = moduleComponents[modName];
        if (!modulePages) {
          setError("no_pages");
          setLoading(false);
          return;
        }

        const componentLoader = modulePages[path] || modulePages[""];
        if (!componentLoader) {
          setError("page_not_found");
          setLoading(false);
          return;
        }

        try {
          const mod = await componentLoader();
          setComponent(() => mod.default);
        } catch (importError) {
          console.error("Failed to load module component:", importError);
          setError("component_load_failed");
        }
      } catch (err) {
        console.error("Module loading error:", err);
        setError("load_failed");
      } finally {
        setLoading(false);
      }
    };

    checkAndLoadModule();
  }, [params, router]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-gray-500">Loading module...</p>
        </div>
      </div>
    );
  }

  if (error === "not_found") {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Page Not Found
          </h2>
          <p className="text-gray-500">
            The requested page does not exist.
          </p>
        </div>
      </div>
    );
  }

  if (!isInstalled && moduleName) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-3">
            Module Not Installed
          </h2>
          <p className="text-gray-500 mb-6">
            The <span className="font-medium">{moduleName}</span> module is not
            installed. Install it from the Modules page to access this feature.
          </p>
          <button
            onClick={() => router.push("/admin/modules")}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Package className="h-4 w-4 mr-2" />
            Go to Modules
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Failed to Load Module
          </h2>
          <p className="text-gray-500">
            There was an error loading the module component.
          </p>
        </div>
      </div>
    );
  }

  if (Component) {
    return <Component />;
  }

  return null;
}
