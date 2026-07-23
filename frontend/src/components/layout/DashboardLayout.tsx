import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import { motion, AnimatePresence } from 'framer-motion';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({ children }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 font-inter">
      <Navbar />
      
      <div className="pt-16 flex h-screen overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:block h-full">
          <Sidebar />
        </div>

        {/* Mobile Sidebar Overlay */}
        <AnimatePresence>
          {isSidebarOpen && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={() => setIsSidebarOpen(false)}
                className="fixed inset-0 bg-slate-900/20 backdrop-blur-sm z-30 md:hidden"
              />
              <motion.div
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 200 }}
                className="fixed inset-y-0 left-0 pt-16 w-64 z-30 md:hidden bg-white"
              >
                <Sidebar />
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main Content */}
        <main className="flex-1 h-full overflow-y-auto relative">
          {/* Mobile Sidebar Toggle Button */}
          <div className="md:hidden sticky top-0 bg-slate-50/80 backdrop-blur-sm border-b border-slate-200 p-4 z-20 flex justify-between items-center">
            <span className="font-semibold text-slate-700">Dashboard</span>
            <button 
              onClick={() => setIsSidebarOpen(true)}
              className="p-2 bg-white rounded-lg shadow-sm border border-slate-200 text-slate-600"
            >
              <Menu size={20} />
            </button>
          </div>
          
          <div className="p-4 md:p-8 pb-20">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
