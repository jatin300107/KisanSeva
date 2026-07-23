import React from 'react';
import { motion } from 'framer-motion';
import { Calendar, ArrowRight, Activity } from 'lucide-react';
import type { Report } from '../../types';

interface ReportCardProps {
  report: Report;
  onClick?: () => void;
}

export const ReportCard: React.FC<ReportCardProps> = ({ report, onClick }) => {
  const getSeverityBadge = (severity: number) => {
    if (severity <= 3) {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">Severity: Low ({severity}/10)</span>;
    } else if (severity <= 6) {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-200">Severity: Moderate ({severity}/10)</span>;
    } else {
      return <span className="px-2.5 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 border border-red-200">Severity: High ({severity}/10)</span>;
    }
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <motion.div
      whileHover={{ y: -4, scale: 1.01 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="bg-white rounded-xl shadow-sm border border-slate-200 p-5 hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer flex flex-col justify-between"
    >
      <div>
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className={`px-2.5 py-0.5 text-xs font-bold uppercase rounded-md ${report.type === 'crop' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-teal-50 text-teal-700 border border-teal-200'}`}>
            {report.type === 'crop' ? '🌾 Crop' : '🐄 Animal'}
          </span>
          <div className="flex items-center text-slate-400 text-xs gap-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>{formatDate(report.created_at)}</span>
          </div>
        </div>

        <h3 className="font-bold text-slate-800 text-lg mb-1 line-clamp-1 group-hover:text-emerald-600 transition-colors">
          {report.title || 'Diagnostic Report'}
        </h3>
        
        <p className="text-sm font-medium text-emerald-700 mb-4 flex items-center gap-1.5">
          <Activity className="w-4 h-4" />
          <span>{report.disease_name}</span>
        </p>
      </div>

      <div className="pt-3 border-t border-slate-100 flex items-center justify-between mt-2">
        <div className="flex items-center gap-2">
          {getSeverityBadge(report.severity)}
          <span className="text-xs text-slate-500 font-medium bg-slate-100 px-2 py-0.5 rounded-full">
            {Math.round((report.confidence || 0) * 100)}% Match
          </span>
        </div>
        <div className="p-1.5 rounded-full bg-slate-50 group-hover:bg-emerald-50 text-slate-400 group-hover:text-emerald-600 transition-colors">
          <ArrowRight className="w-4 h-4" />
        </div>
      </div>
    </motion.div>
  );
};
