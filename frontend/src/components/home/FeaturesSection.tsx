/**
 * Features section component showcasing key framework capabilities
 */
export function FeaturesSection() {
  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            FastNext Framework Features
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Everything you need to build secure, scalable applications with
            modern best practices built-in.
            <a
              href="https://github.com/fastnext/fastnext-framework"
              className="text-blue-600 hover:text-blue-700 ml-2"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn more on GitHub →
            </a>
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* ViewManager */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Universal ViewManager
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Multi-view data display with List, Card, Kanban, Gantt, and
              Calendar views. Advanced filtering, sorting, and bulk operations.
            </p>
          </div>

          {/* Security */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
            <div className="text-3xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Enterprise Security
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              OWASP compliant with CSP, XSS protection, RBAC, and real-time
              threat detection. validation, and enterprise workflows.
            </p>
          </div>

          {/* Workflow Engine */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
            <div className="text-3xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Visual Workflow Engine
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Drag-and-drop workflow builder with advanced analytics. State
              management, approvals, and real-time collaboration.
            </p>
          </div>

          {/* Internationalization */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-6 rounded-xl border border-teal-200 dark:border-teal-800">
            <div className="text-3xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Global Ready
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              20+ languages with RTL support. WCAG 2.1 AAA accessibility.
              Cultural adaptation and global content management.
            </p>
          </div>

          {/* Data Import/Export */}
          <div className="bg-gradient-to-br from-emerald-50 to-green-50 dark:from-emerald-900/20 dark:to-green-900/20 p-6 rounded-xl border border-emerald-200 dark:border-emerald-800">
            <div className="text-3xl mb-4">📊</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Advanced Data Management
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Powerful import/export system with CSV, Excel, and API support.
              Bulk operations and data transformation workflows.
            </p>
          </div>

          {/* Real-time Collaboration */}
          <div className="bg-gradient-to-br from-violet-50 to-purple-50 dark:from-violet-900/20 dark:to-purple-900/20 p-6 rounded-xl border border-violet-200 dark:border-violet-800">
            <div className="text-3xl mb-4">🤝</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Real-time Collaboration
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Live collaboration features with WebSocket support, real-time
              notifications, and concurrent editing capabilities.
            </p>
          </div>

          {/* API-First Architecture */}
          <div className="bg-gradient-to-br from-rose-50 to-pink-50 dark:from-rose-900/20 dark:to-pink-900/20 p-6 rounded-xl border border-rose-200 dark:border-rose-800">
            <div className="text-3xl mb-4">🔌</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              API-First Architecture
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              RESTful APIs with GraphQL support, OpenAPI documentation, and
              comprehensive API management tools.
            </p>
          </div>

          {/* Developer Experience */}
          <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 p-6 rounded-xl border border-yellow-200 dark:border-yellow-800">
            <div className="text-3xl mb-4">🚀</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Developer Experience
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Hot reload, TypeScript strict mode, comprehensive testing suite
              with Jest and Playwright, automated linting and formatting, and
              extensive documentation.
            </p>
          </div>

          {/* Scalability & Performance */}
          <div className="bg-gradient-to-br from-indigo-50 to-blue-50 dark:from-indigo-900/20 dark:to-blue-900/20 p-6 rounded-xl border border-indigo-200 dark:border-indigo-800">
            <div className="text-3xl mb-4">⚡</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
              Enterprise Scalability
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Horizontal scaling with Redis clustering, database optimization
              with indexing strategies, CDN integration, and microservices-ready
              architecture supporting 50k+ req/sec.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
