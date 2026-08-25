import { Loader2 } from 'lucide-react';

interface SpinnerProps {
  size?: number;
  className?: string;
  label?: string;
}

export function Spinner({ size = 24, className = '', label }: SpinnerProps) {
  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <Loader2 size={size} className="animate-spin text-emerald-600" />
      {label && <p className="text-sm text-slate-500">{label}</p>}
    </div>
  );
}

export default Spinner;
