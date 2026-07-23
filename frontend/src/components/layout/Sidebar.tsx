import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, FilePlus, FileText, MessageSquare, User } from 'lucide-react';
import { motion } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';

const Sidebar: React.FC = () => {
  const { user } = useAuth();

  const farmerItems = [
    { to: '/farmer/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/farmer/reports/new', label: 'New Report', icon: FilePlus },
    { to: '/farmer/reports', label: 'Report History', icon: FileText },
  ];

  const expertItems = [
    { to: '/expert/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/expert/consultations', label: 'Consultations', icon: MessageSquare },
  ];

  const items = user?.role === 'farmer' ? farmerItems : expertItems;

  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, x: -20 },
    show: { opacity: 1, x: 0 }
  };

  return (
    <div className="w-64 bg-white border-r border-slate-200 h-full flex flex-col justify-between py-6 z-10 flex-shrink-0">
      <div className="px-4">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4 ml-2">
          Menu
        </div>
        <motion.nav 
          variants={containerVariants} 
          initial="hidden" 
          animate="show"
          className="flex flex-col gap-1"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <motion.div key={item.to} variants={itemVariants}>
                <NavLink
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-500 text-white shadow-md shadow-emerald-200'
                        : 'text-slate-600 hover:bg-emerald-50 hover:text-emerald-600'
                    }`
                  }
                >
                  <Icon size={20} />
                  <span className="font-medium">{item.label}</span>
                </NavLink>
              </motion.div>
            );
          })}
        </motion.nav>
      </div>

      <div className="px-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 flex-shrink-0">
            <User size={20} />
          </div>
          <div className="overflow-hidden">
            <div className="font-semibold text-slate-800 truncate">{user?.name || 'User'}</div>
            <div className="text-xs font-medium text-emerald-600 uppercase tracking-wider mt-0.5">
              {user?.role || 'Guest'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
