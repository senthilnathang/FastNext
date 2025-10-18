/**
 * Technology stack section showcasing frontend and backend technologies
 */
export function TechStackSection() {
  return (
    <section className="py-24 bg-gray-50 dark:bg-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
            FastNext Framework Technology Stack
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300">
            Enterprise-grade full-stack platform built with the latest
            technologies for maximum performance, security, and developer
            experience.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          {/* Frontend */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              🎨 Frontend
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  Next.js 15
                </span>
                <span className="text-green-600 font-medium">App Router</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  TypeScript
                </span>
                <span className="text-green-600 font-medium">Strict Mode</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  Tailwind CSS + shadcn/ui
                </span>
                <span className="text-green-600 font-medium">Modern UI</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  TanStack Query + tRPC
                </span>
                <span className="text-green-600 font-medium">
                  Type-Safe APIs
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  Jest + Playwright
                </span>
                <span className="text-green-600 font-medium">
                  Testing Suite
                </span>
              </div>
            </div>
          </div>

          {/* Backend */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-xl shadow-lg">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-6 flex items-center gap-3">
              ⚙️ Backend
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  FastAPI
                </span>
                <span className="text-green-600 font-medium">Async/Await</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  PostgreSQL + SQLAlchemy
                </span>
                <span className="text-green-600 font-medium">
                  Enterprise DB
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  Redis Cluster
                </span>
                <span className="text-green-600 font-medium">12GB Cache</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  JWT + RBAC
                </span>
                <span className="text-green-600 font-medium">Security</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-gray-700 dark:text-gray-300">
                  Pydantic v2
                </span>
                <span className="text-green-600 font-medium">Validation</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
