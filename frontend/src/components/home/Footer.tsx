import Link from "next/link";

/**
 * Footer component with links and copyright information
 */
export function Footer() {
  return (
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
  );
}