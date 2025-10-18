/**
 * Performance metrics section showcasing enterprise-grade performance
 */
export function PerformanceSection() {
  return (
    <section className="py-24 bg-gradient-to-r from-blue-600 to-purple-600 text-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-4xl font-bold mb-4">
            FastNext Framework Performance
          </h2>
          <p className="text-xl opacity-90">
            Built for scale with industry-leading performance metrics.
            <a
              href="https://benchmarks.fastnext.dev"
              className="text-blue-300 hover:text-blue-200 ml-2 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              View Benchmarks →
            </a>
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
  );
}
