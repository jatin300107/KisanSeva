import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
}

export function Card({ children, className = '', hover = false, onClick }: CardProps) {
  return (
    <div
      onClick={onClick}
      className={`bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden transition-all duration-300 ${
        hover
          ? 'cursor-pointer hover:shadow-md hover:-translate-y-1 hover:border-emerald-200'
          : ''
      } ${className}`}
    >
      {children}
    </div>
  );
}

export default Card;
