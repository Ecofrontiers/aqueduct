import { Link, useLocation } from 'react-router-dom';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { clsx } from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Vaults', href: '/vaults' },
  { name: 'Bioregions', href: '/bioregions' },
  { name: 'Proposals', href: '/proposals' },
  { name: 'Agents', href: '/agents' },
  { name: 'Tournaments', href: '/tournaments' },
  { name: 'Governance', href: '/governance' },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const location = useLocation();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo */}
            <Link to="/" className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-esv-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold text-lg">E</span>
              </div>
              <span className="font-semibold text-lg">Ecospatial Vault</span>
            </Link>

            {/* Navigation */}
            <nav className="hidden md:flex items-center space-x-1">
              {navigation.map((item) => (
                <Link
                  key={item.name}
                  to={item.href}
                  className={clsx(
                    'px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                    location.pathname === item.href ||
                      (item.href !== '/' && location.pathname.startsWith(item.href))
                      ? 'bg-esv-100 text-esv-700'
                      : 'text-gray-600 hover:bg-gray-100'
                  )}
                >
                  {item.name}
                </Link>
              ))}
            </nav>

            {/* Connect Button */}
            <ConnectButton showBalance={false} />
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-200 bg-white mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex justify-between items-center">
            <p className="text-sm text-gray-500">
              Ecospatial Vault Protocol - Bioregional Capital Coordination
            </p>
            <div className="flex items-center space-x-4">
              <a
                href="https://docs.ecospatial.xyz"
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                Docs
              </a>
              <a
                href="https://github.com/ecospatial"
                className="text-sm text-gray-500 hover:text-gray-900"
              >
                GitHub
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
