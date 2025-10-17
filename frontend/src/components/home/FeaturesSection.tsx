/**
 * Features section component showcasing key framework capabilities
 */
export function FeaturesSection() {
  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            Enterprise-Grade Features
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
            Everything you need to build secure, scalable applications with modern best practices built-in.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* ViewManager */}
          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 p-6 rounded-xl border border-blue-200 dark:border-blue-800">
            <div className="text-3xl mb-4">🎯</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Universal ViewManager</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Multi-view data display with List, Card, Kanban, Gantt, and Calendar views.
              Advanced filtering, sorting, and bulk operations.
            </p>
          </div>

          {/* Security */}
          <div className="bg-gradient-to-br from-red-50 to-pink-50 dark:from-red-900/20 dark:to-pink-900/20 p-6 rounded-xl border border-red-200 dark:border-red-800">
            <div className="text-3xl mb-4">🔐</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Enterprise Security</h3>
            <p className="text-gray-600 dark:text-gray-300">
              OWASP compliant with CSP, XSS protection, RBAC, and real-time threat detection.
              validation, and enterprise workflows.
            </p>
          </div>

          {/* Workflow Engine */}
          <div className="bg-gradient-to-br from-orange-50 to-amber-50 dark:from-orange-900/20 dark:to-amber-900/20 p-6 rounded-xl border border-orange-200 dark:border-orange-800">
            <div className="text-3xl mb-4">🔄</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Visual Workflow Engine</h3>
            <p className="text-gray-600 dark:text-gray-300">
              Drag-and-drop workflow builder with advanced analytics. State management,
              approvals, and real-time collaboration.
            </p>
          </div>

          {/* Internationalization */}
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 dark:from-teal-900/20 dark:to-cyan-900/20 p-6 rounded-xl border border-teal-200 dark:border-teal-800">
            <div className="text-3xl mb-4">🌍</div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Global Ready</h3>
            <p className="text-gray-600 dark:text-gray-300">
              20+ languages with RTL support. WCAG 2.1 AAA accessibility.
              Cultural adaptation and global content management.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}