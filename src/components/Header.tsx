import React, { useState } from 'react';
import { Menu, Search, X } from 'lucide-react';

export type AppRoute =
  | 'home'
  | 'explore'
  | 'observations'
  | 'detail'
  | 'discoveries'
  | 'about';

interface HeaderProps {
  currentRoute: AppRoute;
  onNavigate: (route: AppRoute) => void;
  onSearchSubmit: (query: string) => void;
}

const NAV_ITEMS: Array<{ route: AppRoute; label: string }> = [
  { route: 'home', label: 'Home' },
  { route: 'explore', label: 'Explore' },
  { route: 'observations', label: 'Observations' },
  { route: 'discoveries', label: 'Discoveries' },
  { route: 'about', label: 'About' },
];

export const Header: React.FC<HeaderProps> = ({
  currentRoute,
  onNavigate,
  onSearchSubmit,
}) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [query, setQuery] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    onSearchSubmit(query.trim());
    setSearchOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-[#DADCE0]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Single-line Brand Wordmark */}
        <a
          href="#home"
          onClick={(e) => {
            e.preventDefault();
            onNavigate('home');
            setMobileMenuOpen(false);
          }}
          className="text-xl font-bold tracking-tight text-[#0B3D91] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#1A73B8]"
        >
          AFTERLIGHT
        </a>

        {/* Zone 2: Clean Single-Line Navigation Links */}
        <nav
          aria-label="Primary navigation"
          className="hidden md:flex items-center gap-7"
        >
          {NAV_ITEMS.map((item) => {
            const isActive =
              currentRoute === item.route ||
              (item.route === 'observations' && currentRoute === 'detail');
            return (
              <a
                key={item.route}
                href={`#${item.route}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.route);
                }}
                aria-current={isActive ? 'page' : undefined}
                className={`py-5 text-sm font-medium whitespace-nowrap shrink-0 border-b-2 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73B8] ${
                  isActive
                    ? 'border-[#0B3D91] text-[#0B3D91]'
                    : 'border-transparent text-[#4B5563] hover:text-[#202124] hover:border-[#DADCE0]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>

        {/* Zone 3: Primary Search Action + Mobile Toggle */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => setSearchOpen((prev) => !prev)}
            aria-label={searchOpen ? 'Close search bar' : 'Search objects or coordinates'}
            aria-expanded={searchOpen}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium text-[#202124] border border-[#DADCE0] hover:border-[#0B3D91] hover:text-[#0B3D91] bg-white transition-colors whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#1A73B8]"
          >
            {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4" />}
            <span className="hidden sm:inline">Search</span>
          </button>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            aria-label={mobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            aria-expanded={mobileMenuOpen}
            className="md:hidden inline-flex items-center justify-center p-2 text-[#202124] border border-[#DADCE0] hover:border-[#0B3D91]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Expandable Search Drawer */}
      {searchOpen && (
        <div className="border-t border-[#DADCE0] bg-[#F5F6F7]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 py-3">
            <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-2">
              <label htmlFor="header-sky-search" className="sr-only">
                Search an object, celestial region or coordinates
              </label>
              <input
                id="header-sky-search"
                type="text"
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search an object, celestial region or coordinates (e.g., WISE 0855 or 08h55m10.831s -07d14m42.53s)..."
                className="flex-1 bg-white border border-[#DADCE0] px-3.5 py-2 text-sm text-[#202124] placeholder:text-[#6B7280] focus:outline-none focus:border-[#0B3D91]"
              />
              <button
                type="submit"
                className="px-5 py-2 bg-[#0B3D91] text-white text-sm font-medium hover:bg-[#1A73B8] transition-colors whitespace-nowrap shrink-0"
              >
                Resolve Sky Target
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Mobile Navigation Drawer */}
      {mobileMenuOpen && (
        <nav
          aria-label="Mobile navigation"
          className="md:hidden border-t border-[#DADCE0] bg-white px-4 py-3 flex flex-col gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const isActive = currentRoute === item.route;
            return (
              <a
                key={item.route}
                href={`#${item.route}`}
                onClick={(e) => {
                  e.preventDefault();
                  onNavigate(item.route);
                  setMobileMenuOpen(false);
                }}
                className={`px-3 py-2.5 text-sm font-medium ${
                  isActive
                    ? 'bg-[#F5F6F7] text-[#0B3D91]'
                    : 'text-[#4B5563] hover:bg-[#F5F6F7] hover:text-[#202124]'
                }`}
              >
                {item.label}
              </a>
            );
          })}
        </nav>
      )}
    </header>
  );
};
