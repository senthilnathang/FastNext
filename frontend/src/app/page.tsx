import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800">
      {/* Hero Section */}
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
              Build enterprise-grade applications with Next.js 15, FastAPI, and comprehensive security features.
              From prototype to production in minutes, not months.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
              <Link
                href="/dashboard"
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
              >
                🚀 Get Started
              </Link>
              <Link
                href="/docs"
                className="border-2 border-gray-300 dark:border-gray-600 hover:border-blue-500 text-gray-700 dark:text-gray-300 hover:text-blue-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
              >
                📚 View Documentation
              </Link>
              <a
                href="https://github.com/fastnext/fastnext-framework"
                target="_blank"
                rel="noopener noreferrer"
                className="border-2 border-gray-300 dark:border-gray-600 hover:border-gray-500 text-gray-700 dark:text-gray-300 hover:text-gray-600 px-8 py-4 rounded-lg font-semibold text-lg transition-colors"
              >
                ⭐ GitHub
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
                <span className="text-purple-500">🔧</span>
                Full-Stack Ready
              </div>
              <div className="flex items-center gap-2">
                <span className="text-orange-500">🌍</span>
                20+ Languages
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
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
                20+ security headers included.
              </p>
            </div>

            {/* Performance */}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-900/20 dark:to-emerald-900/20 p-6 rounded-xl border border-green-200 dark:border-green-800">
              <div className="text-3xl mb-4">⚡</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">High Performance</h3>
              <p className="text-gray-600 dark:text-gray-300">
                50,000+ req/sec capacity with &lt;100ms P95 latency. Multi-level caching,
                database optimization, and horizontal scaling.
              </p>
            </div>

            {/* Data Management */}
            <div className="bg-gradient-to-br from-purple-50 to-violet-50 dark:from-purple-900/20 dark:to-violet-900/20 p-6 rounded-xl border border-purple-200 dark:border-purple-800">
              <div className="text-3xl mb-4">📊</div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">Advanced Data Management</h3>
              <p className="text-gray-600 dark:text-gray-300">
                Dynamic import/export with multi-format support. Real-time data processing,
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

      {/* Tech Stack Section */}
      <section className="py-24 bg-gray-50 dark:bg-slate-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Modern Technology Stack
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              Built with the latest technologies for maximum performance and developer experience.
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
                  <span className="text-gray-700 dark:text-gray-300">Next.js 15</span>
                  <span className="text-green-600 font-medium">App Router</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">TypeScript</span>
                  <span className="text-green-600 font-medium">Strict Mode</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Tailwind CSS + shadcn/ui</span>
                  <span className="text-green-600 font-medium">Modern UI</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">TanStack Query + tRPC</span>
                  <span className="text-green-600 font-medium">Type-Safe APIs</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Jest + Playwright</span>
                  <span className="text-green-600 font-medium">Testing Suite</span>
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
                  <span className="text-gray-700 dark:text-gray-300">FastAPI</span>
                  <span className="text-green-600 font-medium">Async/Await</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">PostgreSQL + SQLAlchemy</span>
                  <span className="text-green-600 font-medium">Enterprise DB</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Redis Cluster</span>
                  <span className="text-green-600 font-medium">12GB Cache</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">JWT + RBAC</span>
                  <span className="text-green-600 font-medium">Security</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-gray-700 dark:text-gray-300">Pydantic v2</span>
                  <span className="text-green-600 font-medium">Validation</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Getting Started Section */}
      <section className="py-24 bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
              Get Started in Minutes
            </h2>
            <p className="text-xl text-gray-600 dark:text-gray-300">
              From zero to production-ready application with our streamlined setup process.
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Prerequisites */}
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">📋</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Prerequisites</h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-2 text-left">
                <li>• Node.js 18+</li>
                <li>• Python 3.11+</li>
                <li>• PostgreSQL 15+</li>
                <li>• Redis 7+</li>
                <li>• Docker (recommended)</li>
              </ul>
            </div>

            {/* Quick Setup */}
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🚀</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Quick Setup</h3>
              <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg text-left font-mono text-sm">
                <div className="text-gray-700 dark:text-gray-300">
                  # Clone and start
                  <br />
                  git clone https://github.com/fastnext/fastnext-framework
                  <br />
                  cd FastNext
                  <br />
                  docker-compose up -d
                </div>
              </div>
            </div>

            {/* First Steps */}
            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl">🎯</span>
              </div>
              <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">First Steps</h3>
              <ul className="text-gray-600 dark:text-gray-300 space-y-2 text-left">
                <li>• Access admin dashboard</li>
                <li>• Configure database</li>
                <li>• Set up authentication</li>
                <li>• Create your first app</li>
                <li>• Deploy to production</li>
              </ul>
            </div>
          </div>

          <div className="text-center mt-12">
            <Link
              href="/docs/getting-started"
              className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              📖 Read Full Documentation
            </Link>
          </div>
        </div>
      </section>

      {/* Performance Metrics */}
      <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-bold mb-4">
              Enterprise Performance
            </h2>
            <p className="text-xl opacity-90">
              Built for scale with industry-leading performance metrics.
            </p>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">50,000+</div>
              <div className="text-blue-100">req/sec capacity</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">&lt;100ms</div>
              <div className="text-blue-100">P95 latency</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">99.99%</div>
              <div className="text-blue-100">uptime SLA</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold mb-2">85%</div>
              <div className="text-blue-100">cache hit ratio</div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="text-2xl font-bold text-blue-400 mb-4">FastNext</div>
              <p className="text-gray-400 mb-4">
                Production-ready full-stack framework for modern web applications.
              </p>
              <div className="flex space-x-4">
                <a href="https://github.com/fastnext/fastnext-framework" className="text-gray-400 hover:text-white">
                  GitHub
                </a>
                <a href="/docs" className="text-gray-400 hover:text-white">
                  Docs
                </a>
                <a href="/community" className="text-gray-400 hover:text-white">
                  Community
                </a>
              </div>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/security" className="hover:text-white">Security</Link></li>
                <li><Link href="/performance" className="hover:text-white">Performance</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Resources</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/api" className="hover:text-white">API Reference</Link></li>
                <li><Link href="/tutorials" className="hover:text-white">Tutorials</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
                <li><Link href="/status" className="hover:text-white">System Status</Link></li>
                <li><a href="mailto:security@fastnext.dev" className="hover:text-white">Security</a></li>
              </ul>
            </div>
          </div>

          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2025 FastNext Framework. MIT License.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
