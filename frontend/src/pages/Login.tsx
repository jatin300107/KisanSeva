import React from 'react';
import { motion } from 'framer-motion';
import { Leaf } from 'lucide-react';
import { LoginForm } from '../components/auth/LoginForm';

const Login: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-white">
      {/* Left side - Branding */}
      <div className="w-full md:w-1/2 bg-gradient-to-br from-emerald-500 via-green-600 to-emerald-800 text-white p-8 md:p-12 flex flex-col justify-between relative overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 -mr-20 -mt-20 w-64 h-64 rounded-full bg-white opacity-10 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 rounded-full bg-emerald-300 opacity-20 blur-3xl"></div>
        
        <div className="relative z-10">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex items-center space-x-3 mb-16"
          >
            <div className="bg-white p-2 rounded-xl">
              <Leaf className="w-8 h-8 text-emerald-600" />
            </div>
            <span className="text-2xl font-bold tracking-tight">KisanSeva</span>
          </motion.div>
          
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="max-w-md"
          >
            <h1 className="text-4xl md:text-5xl font-bold leading-tight mb-6">
              Empowering farmers with smart agriculture.
            </h1>
            <p className="text-emerald-50 text-lg">
              Get intelligent diagnosis for your crops and livestock, connect with experts, and boost your agricultural yield.
            </p>
          </motion.div>
        </div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="relative z-10 text-emerald-100/80 text-sm mt-12 md:mt-0"
        >
          &copy; {new Date().getFullYear()} KisanSeva Platform. All rights reserved.
        </motion.div>
      </div>

      {/* Right side - Form */}
      <div className="w-full md:w-1/2 flex items-center justify-center p-6 md:p-12 bg-gray-50/50">
        <LoginForm />
      </div>
    </div>
  );
};

export default Login;
