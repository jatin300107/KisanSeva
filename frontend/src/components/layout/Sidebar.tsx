import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Leaf, LayoutDashboard, FilePlus, FileText, MessageSquare, LogOut,
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

interface NavItemDef {
  to: string;
  icon: React.ElementType;
  label: string;
  end?: boolean;
}

const farmerNav: NavItemDef[] = [
  { to: '/farmer/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/farmer/reports/new', icon: FilePlus, label: 'New Diagnosis', end: true },
  { to: '/farmer/reports', icon: FileText, label: 'My Reports', end: true },
];

const expertNav: NavItemDef[] = [
  { to: '/expert/dashboard', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/expert/dashboard', icon: MessageSquare, label: 'Consultations', end: false },
];

const roleLabels: Record<string, string> = {
  farmer: 'Farmer',
  vet: 'Veterinary Expert',
  agrologist: 'Agrologist',
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isExpert = user?.role === 'vet' || user?.role === 'agrologist';
  const navItems = isExpert ? expertNav : farmerNav;

  const initials =
    user?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  return (
    <aside className="w-64 h-full bg-white border-r border-slate-100 flex flex-col">
      {/* Logo */}
      <div className="h-16 flex items-center px-5 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center shadow-sm">
            <Leaf size={15} className="text-white" />
          </div>
          <span className="font-black text-lg text-slate-800">
            Kisan<span className="text-emerald-500">Seva</span>
          </span>
        </div>
      </div>

      {/* User card */}
      <div className="px-4 py-4 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold text-sm shrink-0">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{user?.name}</p>
            <p className="text-xs text-slate-400">{roleLabels[user?.role || ''] || user?.role}</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 px-3 py-4 flex flex-col gap-1 overflow-y-auto">
        {navItems.map((item, i) => (
          <motion.div
            key={`${item.to}-${item.label}`}
            initial={{ opacity: 0, x: -12 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.07 }}
          >
            <NavLink
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-500/25'
                    : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                }`
              }
            >
              <item.icon size={17} />
              {item.label}
            </NavLink>
          </motion.div>
        ))}
      </nav>

      {/* Bottom logout */}
      <div className="px-3 py-4 border-t border-slate-100">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 hover:bg-red-50 hover:text-red-600 transition-all duration-200"
        >
          <LogOut size={17} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
