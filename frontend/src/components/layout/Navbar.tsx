import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Leaf, Menu, X, LogOut, LayoutDashboard, FileText, FilePlus, MessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

function NavItemLight({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors px-1 py-0.5 border-b-2 ${
          isActive
            ? 'text-emerald-300 border-emerald-400'
            : 'text-slate-300 border-transparent hover:text-white'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

function NavItemDark({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `text-sm font-medium transition-colors px-1 py-0.5 border-b-2 ${
          isActive
            ? 'text-emerald-600 border-emerald-500'
            : 'text-slate-600 border-transparent hover:text-slate-900'
        }`
      }
    >
      {label}
    </NavLink>
  );
}

export default function Navbar() {
  const { user, isAuthenticated, logout } = useAuth();
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 30);
    window.addEventListener('scroll', handler, { passive: true });
    return () => window.removeEventListener('scroll', handler);
  }, []);

  const isExpert = user?.role === 'vet' || user?.role === 'agrologist';
  const useDark = scrolled || isAuthenticated;

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const initials =
    user?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <nav
      className={`fixed top-0 inset-x-0 z-50 h-16 flex items-center transition-all duration-300 ${
        useDark ? 'glass shadow-sm border-b border-slate-200/60' : 'bg-transparent'
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-md">
            <Leaf size={16} className="text-white" />
          </div>
          <span className={`font-black text-xl ${useDark ? 'text-slate-800' : 'text-white'}`}>
            Kisan<span className="text-emerald-500">Seva</span>
          </span>
        </Link>

        {/* Desktop Nav */}
        <div className="hidden md:flex items-center gap-6">
          {!isAuthenticated && (
            useDark ? (
              <>
                <NavItemDark to="/" label="Home" />
              </>
            ) : (
              <>
                <NavItemLight to="/" label="Home" />
              </>
            )
          )}
          {isAuthenticated && !isExpert && (
            <>
              <NavItemDark to="/farmer/dashboard" label="Dashboard" />
              <NavItemDark to="/farmer/reports" label="My Reports" />
              <NavItemDark to="/farmer/reports/new" label="New Diagnosis" />
            </>
          )}
          {isAuthenticated && isExpert && (
            <>
              <NavItemDark to="/expert/dashboard" label="Dashboard" />
              <NavItemDark to="/expert/dashboard" label="Consultations" />
            </>
          )}
        </div>

        {/* Right actions */}
        <div className="hidden md:flex items-center gap-3">
          {!isAuthenticated ? (
            <>
              <Link
                to="/login"
                className={`text-sm font-medium px-4 py-2 rounded-xl transition-colors ${
                  useDark
                    ? 'text-slate-600 hover:bg-slate-100'
                    : 'text-white hover:bg-white/10'
                }`}
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="text-sm font-semibold bg-gradient-to-r from-emerald-600 to-teal-600 text-white px-5 py-2.5 rounded-xl hover:from-emerald-700 hover:to-teal-700 transition-all shadow-md"
              >
                Get Started
              </Link>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {initials}
              </div>
              <span className="text-sm font-medium text-slate-700">{user?.name?.split(' ')[0]}</span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors"
                title="Sign out"
              >
                <LogOut size={15} />
              </button>
            </div>
          )}
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 rounded-lg"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          {mobileOpen ? (
            <X size={22} className={useDark ? 'text-slate-800' : 'text-white'} />
          ) : (
            <Menu size={22} className={useDark ? 'text-slate-800' : 'text-white'} />
          )}
        </button>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="absolute top-16 inset-x-0 bg-white border-b border-slate-200 shadow-lg py-4 px-6 flex flex-col gap-4 md:hidden"
          >
            {!isAuthenticated && (
              <>
                <Link to="/login" className="text-slate-700 font-medium" onClick={() => setMobileOpen(false)}>
                  Login
                </Link>
                <Link to="/signup" className="text-emerald-600 font-semibold" onClick={() => setMobileOpen(false)}>
                  Get Started
                </Link>
              </>
            )}
            {isAuthenticated && !isExpert && (
              <>
                <Link to="/farmer/dashboard" className="flex items-center gap-2 text-slate-700" onClick={() => setMobileOpen(false)}>
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <Link to="/farmer/reports" className="flex items-center gap-2 text-slate-700" onClick={() => setMobileOpen(false)}>
                  <FileText size={16} /> Reports
                </Link>
                <Link to="/farmer/reports/new" className="flex items-center gap-2 text-slate-700" onClick={() => setMobileOpen(false)}>
                  <FilePlus size={16} /> New Diagnosis
                </Link>
              </>
            )}
            {isAuthenticated && isExpert && (
              <>
                <Link to="/expert/dashboard" className="flex items-center gap-2 text-slate-700" onClick={() => setMobileOpen(false)}>
                  <LayoutDashboard size={16} /> Dashboard
                </Link>
                <Link to="/expert/dashboard" className="flex items-center gap-2 text-slate-700" onClick={() => setMobileOpen(false)}>
                  <MessageSquare size={16} /> Consultations
                </Link>
              </>
            )}
            {isAuthenticated && (
              <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-medium">
                <LogOut size={16} /> Logout
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  );
}
