import React from 'react';
import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export const Spinner: React.FC<SpinnerProps> = ({ size = 24, className = '', label }) => {
  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <Loader2 size={size} className="animate-spin text-emerald-500" />
      {label && <span className="mt-2 text-sm text-gray-500">{label}</span>}
    </div>
  );
};

export default Spinner;
