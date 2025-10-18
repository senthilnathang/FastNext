import { lazy, Suspense } from "react";

// Lazy load homepage components for better performance
const HeroSection = lazy(() =>
  import("@/components/home/HeroSection").then((module) => ({
    default: module.HeroSection,
  })),
);
const FeaturesSection = lazy(() =>
  import("@/components/home/FeaturesSection").then((module) => ({
    default: module.FeaturesSection,
  })),
);
const TechStackSection = lazy(() =>
  import("@/components/home/TechStackSection").then((module) => ({
    default: module.TechStackSection,
  })),
);
const PerformanceSection = lazy(() =>
  import("@/components/home/PerformanceSection").then((module) => ({
    default: module.PerformanceSection,
  })),
);
const GettingStartedSection = lazy(() =>
  import("@/components/home/GettingStartedSection").then((module) => ({
    default: module.GettingStartedSection,
  })),
);
const Footer = lazy(() =>
  import("@/components/home/Footer").then((module) => ({
    default: module.Footer,
  })),
);

/**
 * Loading fallback component for lazy-loaded sections
 */
function SectionSkeleton() {
  return (
    <div className="py-24 animate-pulse">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mx-auto mb-4"></div>
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3 mx-auto mb-8"></div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
          <div className="h-32 bg-gray-200 dark:bg-gray-700 rounded"></div>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      <Suspense fallback={<SectionSkeleton />}>
        <HeroSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <FeaturesSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <TechStackSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <PerformanceSection />
      </Suspense>

      <Suspense fallback={<SectionSkeleton />}>
        <GettingStartedSection />
      </Suspense>

      <Suspense
        fallback={<div className="h-48 bg-gray-900 animate-pulse"></div>}
      >
        <Footer />
      </Suspense>
    </div>
  );
}
