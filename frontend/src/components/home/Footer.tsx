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
              <a href="https://github.com/fastnext/fastnext-framework" className="text-gray-400 hover:text-white" target="_blank" rel="noopener noreferrer">
                GitHub
              </a>
              <a href="https://docs.fastnext.dev" className="text-gray-400 hover:text-white" target="_blank" rel="noopener noreferrer">
                Docs
              </a>
              <a href="https://discord.gg/fastnext" className="text-gray-400 hover:text-white" target="_blank" rel="noopener noreferrer">
                Discord
              </a>
              <a href="https://twitter.com/fastnextdev" className="text-gray-400 hover:text-white" target="_blank" rel="noopener noreferrer">
                Twitter
              </a>
            </div>
          </div>

           <div>
             <h3 className="font-semibold mb-4">Product</h3>
             <ul className="space-y-2 text-gray-400">
               <li><a href="https://github.com/fastnext/fastnext-framework" className="hover:text-white" target="_blank" rel="noopener noreferrer">GitHub Repository</a></li>
               <li><a href="https://docs.fastnext.dev" className="hover:text-white" target="_blank" rel="noopener noreferrer">Documentation</a></li>
               <li><a href="https://fastnext.dev" className="hover:text-white" target="_blank" rel="noopener noreferrer">Official Website</a></li>
             </ul>
           </div>

          <div>
            <h3 className="font-semibold mb-4">Resources</h3>
            <ul className="space-y-2 text-gray-400">
              <li><a href="https://docs.fastnext.dev" className="hover:text-white" target="_blank" rel="noopener noreferrer">Documentation</a></li>
              <li><a href="https://api.fastnext.dev" className="hover:text-white" target="_blank" rel="noopener noreferrer">API Reference</a></li>
              <li><a href="https://github.com/fastnext/fastnext-framework/tree/main/examples" className="hover:text-white" target="_blank" rel="noopener noreferrer">Examples</a></li>
              <li><a href="https://blog.fastnext.dev" className="hover:text-white" target="_blank" rel="noopener noreferrer">Blog</a></li>
            </ul>
          </div>

           <div>
             <h3 className="font-semibold mb-4">Support</h3>
             <ul className="space-y-2 text-gray-400">
               <li><a href="https://discord.gg/fastnext" className="hover:text-white" target="_blank" rel="noopener noreferrer">Community Discord</a></li>
               <li><a href="mailto:support@fastnext.dev" className="hover:text-white">Support Email</a></li>
               <li><a href="mailto:security@fastnext.dev" className="hover:text-white">Security</a></li>
             </ul>
           </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
          <p>&copy; 2025 <a href="https://fastnext.dev" className="text-blue-400 hover:text-blue-300" target="_blank" rel="noopener noreferrer">FastNext Framework</a>. MIT License.</p>
        </div>
      </div>
    </footer>
  );
}