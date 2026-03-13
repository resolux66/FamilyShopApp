import React, { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { ShoppingCart, Users, User, LayoutDashboard, Menu, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, family } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const navLinks = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    ...(user?.role === 'admin'
      ? [{ to: '/members', label: 'Members', icon: Users }]
      : []),
    { to: '/profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top bar */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-40 no-print">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2 font-bold text-green-700 text-lg">
            <ShoppingCart className="w-5 h-5" />
            <span>FamilyCart</span>
            {family && (
              <span className="text-gray-400 font-normal text-sm ml-1 hidden sm:inline">
                — {family.name}
              </span>
            )}
          </Link>

          {/* Desktop nav */}
          <nav className="hidden sm:flex items-center gap-1">
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                className={({ isActive }) =>
                  `flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium transition-colors
                  ${isActive ? 'bg-green-50 text-green-700' : 'text-gray-600 hover:bg-gray-100'}`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Mobile hamburger */}
          <button
            className="sm:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>

        {/* Mobile nav dropdown */}
        {mobileOpen && (
          <nav className="sm:hidden border-t border-gray-100 bg-white px-4 pb-3">
            {family && (
              <p className="text-xs text-gray-500 py-2 font-medium">{family.name}</p>
            )}
            {navLinks.map(({ to, label, icon: Icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                onClick={() => setMobileOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-3 rounded-md text-sm font-medium w-full
                  ${isActive ? 'text-green-700 bg-green-50' : 'text-gray-700'}`
                }
              >
                <Icon className="w-4 h-4" />
                {label}
              </NavLink>
            ))}
          </nav>
        )}
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">{children}</main>
    </div>
  );
}
