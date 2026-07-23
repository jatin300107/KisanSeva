import React from 'react';
import { motion } from 'framer-motion';

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
}

export const Card: React.FC<CardProps> = ({ children, className = '', hover = false }) => {
  return (
    <motion.div
      whileHover={hover ? { scale: 1.02, y: -2 } : {}}
      transition={{ type: 'spring', stiffness: 300 }}
      className={`bg-white rounded-2xl shadow-lg border border-transparent ${hover ? 'hover:border-emerald-200 hover:shadow-xl' : ''} transition-all duration-300 ${className}`}
    >
      {children}
    </motion.div>
  );
};
