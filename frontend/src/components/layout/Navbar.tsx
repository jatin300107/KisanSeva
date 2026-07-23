import React, { useState } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { Leaf, Menu, X, LogOut, User } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const Navbar: React.FC = () => {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const farmerLinks = [
    { to: '/farmer/dashboard', label: 'Dashboard' },
    { to: '/farmer/reports/new', label: 'New Report' },
    { to: '/farmer/reports', label: 'My Reports' },
  ];

  const expertLinks = [
    { to: '/expert/dashboard', label: 'Dashboard' },
    { to: '/expert/consultations', label: 'Consultations' },
  ];

  const links = user?.role === 'farmer' ? farmerLinks : expertLinks;

  const activeLinkClass = "border-b-2 border-emerald-500 text-emerald-600 font-medium";
  const inactiveLinkClass = "text-slate-600 hover:text-emerald-500 hover:bg-emerald-50 px-3 py-2 rounded-md transition-colors";

  return (
    <header className="fixed top-0 left-0 right-0 h-16 z-50 glass border-b border-white/20 px-4 md:px-8 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2">
        <Leaf className="w-6 h-6 text-emerald-500" />
        <span className="text-xl font-bold gradient-text">KisanSeva</span>
      </Link>

      {/* Desktop Navigation */}
      <nav className="hidden md:flex items-center gap-6">
        {isAuthenticated ? (
          <>
            {links.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) =>
                  isActive ? `px-3 py-2 ${activeLinkClass}` : inactiveLinkClass
                }
              >
                {link.label}
              </NavLink>
            ))}
            <div className="flex items-center gap-4 ml-4 pl-4 border-l border-slate-200">
              <div className="flex items-center gap-2 text-slate-700">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <User size={18} />
                </div>
                <span className="font-medium">{user?.name}</span>
              </div>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 text-slate-500 hover:text-red-500 transition-colors"
                title="Logout"
              >
                <LogOut size={20} />
              </button>
            </div>
          </>
        ) : (
          <div className="flex items-center gap-4">
            <Link to="/login" className="font-medium text-slate-600 hover:text-emerald-600 transition-colors">
              Login
            </Link>
            <Link to="/signup" className="bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2 rounded-full font-medium transition-colors shadow-sm shadow-emerald-200">
              Sign Up
            </Link>
          </div>
        )}
      </nav>

      {/* Mobile Menu Toggle */}
      <button
        className="md:hidden p-2 text-slate-600"
        onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
      >
        {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
      </button>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className="fixed inset-y-0 right-0 w-64 bg-white shadow-2xl p-6 flex flex-col z-50 md:hidden pt-20"
          >
            {isAuthenticated ? (
              <div className="flex flex-col gap-4 h-full">
                <div className="flex items-center gap-3 pb-6 border-b border-slate-100">
                  <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                    <User size={24} />
                  </div>
                  <div>
                    <div className="font-medium text-slate-800">{user?.name}</div>
                    <div className="text-sm text-slate-500 capitalize">{user?.role}</div>
                  </div>
                </div>
                
                <div className="flex flex-col gap-2 mt-4">
                  {links.map((link) => (
                    <NavLink
                      key={link.to}
                      to={link.to}
                      onClick={() => setIsMobileMenuOpen(false)}
                      className={({ isActive }) =>
                        `px-4 py-3 rounded-xl transition-colors ${
                          isActive ? 'bg-emerald-50 text-emerald-600 font-medium' : 'text-slate-600 hover:bg-slate-50'
                        }`
                      }
                    >
                      {link.label}
                    </NavLink>
                  ))}
                </div>

                <div className="mt-auto pt-6 border-t border-slate-100">
                  <button
                    onClick={() => {
                      setIsMobileMenuOpen(false);
                      handleLogout();
                    }}
                    className="flex items-center gap-3 text-red-500 w-full px-4 py-3 hover:bg-red-50 rounded-xl transition-colors"
                  >
                    <LogOut size={20} />
                    <span className="font-medium">Logout</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-4">
                <Link
                  to="/login"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 text-center rounded-xl border border-slate-200 font-medium text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="px-4 py-3 text-center rounded-xl bg-emerald-600 text-white font-medium hover:bg-emerald-700 transition-colors shadow-md shadow-emerald-200"
                >
                  Sign Up
                </Link>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
      
      {/* Mobile Drawer Backdrop */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileMenuOpen(false)}
            className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-40 md:hidden"
          />
        )}
      </AnimatePresence>
    </header>
  );
};

export default Navbar;
