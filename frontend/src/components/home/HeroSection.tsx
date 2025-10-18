import Link from "next/link";

/**
 * Hero section component for the homepage
 * Displays the main heading, description, and call-to-action buttons
 */
export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24">
        <div className="text-center">
          <div className="flex items-center justify-center gap-4 mb-8">
            <div className="text-4xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
              FastNext Framework
            </div>
          </div>

          <h1 className="text-5xl md:text-7xl font-bold text-gray-900 dark:text-white mb-6">
            Production-Ready
            <span className="block text-blue-600">Full-Stack Development</span>
          </h1>

            <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
              FastNext Framework is a comprehensive production-ready full-stack development platform that combines Next.js 15 for the frontend,
              FastAPI for the backend, PostgreSQL for data persistence, and Redis for caching and real-time features.
              It includes enterprise-grade security with OWASP compliance, advanced workflow automation with visual builders,
              multi-view data management (List, Card, Kanban, Gantt, Calendar), and built-in internationalization support for 20+ languages.
              Deploy from prototype to production in minutes, not months, with Docker support and comprehensive API documentation.
            </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Link
              href="/dashboard"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              🚀 Get Started
            </Link>
             <a
               href="https://docs.fastnext.dev"
               target="_blank"
               rel="noopener noreferrer"
               className="border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 text-gray-700 dark:text-gray-300 hover:text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
             >
               📚 View Documentation
             </a>
            <a
              href="https://github.com/fastnext/fastnext-framework"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-gray-300 dark:border-gray-600 hover:border-gray-500 text-gray-700 dark:text-gray-300 hover:text-gray-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              ⭐ GitHub
            </a>
            <a
              href="https://fastnext.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="border-2 border-gray-300 dark:border-gray-600 hover:border-purple-500 text-gray-700 dark:text-gray-300 hover:text-purple-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
            >
              🌐 Official Website
            </a>
          </div>

          {/* Key Benefits */}
          <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-gray-600 dark:text-gray-400">
            <div className="flex items-center gap-2">
              <span className="text-green-500">✓</span>
              Enterprise Security
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-500">⚡</span>
              50k+ req/sec Performance
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-500">🔄</span>
              Visual Workflow Engine
            </div>
            <div className="flex items-center gap-2">
              <span className="text-orange-500">🎯</span>
              Universal ViewManager
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-500">🛡️</span>
              OWASP Compliant
            </div>
            <div className="flex items-center gap-2">
              <span className="text-indigo-500">🌍</span>
              20+ Languages
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}