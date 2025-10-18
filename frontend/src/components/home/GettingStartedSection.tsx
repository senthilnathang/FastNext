import Link from "next/link";

/**
 * Getting started section with prerequisites, setup instructions, and first steps
 */
export function GettingStartedSection() {
  return (
    <section className="py-24 bg-white dark:bg-slate-900">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
           <h2 className="text-4xl font-bold text-gray-900 dark:text-white mb-4">
             Get Started with Next.js 16
           </h2>
           <p className="text-xl text-gray-600 dark:text-gray-300">
             Experience the power of Next.js 16 App Router with our streamlined setup process.
             Get from zero to production-ready application in minutes.
             <a
               href="https://github.com/senthilnathang/FastNext/blob/main/docs/getting-started-tutorial.md"
               className="text-blue-600 hover:text-blue-700 ml-2"
               target="_blank"
               rel="noopener noreferrer"
             >
               View Quick Start Guide →
             </a>
           </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Prerequisites */}
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-6">
              <span className="text-2xl">📋</span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Prerequisites
            </h3>
             <ul className="text-gray-600 dark:text-gray-300 space-y-2 text-left">
               <li>• Node.js 20.9+ (Next.js 16)</li>
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
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Quick Setup
            </h3>
            <div className="bg-gray-50 dark:bg-slate-800 p-4 rounded-lg text-left font-mono text-sm">
              <div className="text-gray-700 dark:text-gray-300">
                # Clone FastNext Framework
                <br />
                git clone https://github.com/senthilnathang/FastNext.git
                <br />
                cd FastNext
                <br /># Start with Docker
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
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              First Steps
            </h3>
            <ul className="text-gray-600 dark:text-gray-300 space-y-2 text-left">
              <li>• Access admin dashboard</li>
              <li>• Configure database</li>
              <li>• Set up authentication</li>
              <li>• Create your first app</li>
              <li>• Deploy to production</li>
            </ul>
          </div>
         </div>

         {/* Tech Stack Showcase */}
         <div className="mt-16 text-center">
           <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-8">
             Powered by Modern Technologies
           </h3>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="text-3xl mb-3">⚡</div>
                <div className="font-semibold text-gray-900 dark:text-white">Next.js 16</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">App Router</div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="text-3xl mb-3">🎯</div>
                <div className="font-semibold text-gray-900 dark:text-white">Biome</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Fast Linting</div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="text-3xl mb-3">📊</div>
                <div className="font-semibold text-gray-900 dark:text-white">ECharts</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">Data Visualization</div>
              </div>
              <div className="bg-white dark:bg-slate-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-slate-700">
                <div className="text-3xl mb-3">⚛️</div>
                <div className="font-semibold text-gray-900 dark:text-white">React 19</div>
                <div className="text-sm text-gray-600 dark:text-gray-300">React Compiler</div>
              </div>
           </div>
         </div>

         <div className="text-center mt-12">
          <a
            href="https://github.com/senthilnathang/FastNext/tree/main/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg font-semibold text-lg transition-colors shadow-lg hover:shadow-xl"
          >
            📖 Read Full Documentation
          </a>
        </div>
      </div>
    </section>
  );
}
