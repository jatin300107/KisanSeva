import { motion } from 'framer-motion';
import { ArrowRight, Leaf, Heart } from 'lucide-react';
import type { Report } from '../../types/index';

/** Backend severity is a number 1-4 (or 0-1 float). Normalise to label. */
function getSeverityLabel(severity: number): string {
  if (severity <= 1) return 'low';
  if (severity <= 2) return 'medium';
  if (severity <= 3) return 'high';
  return 'critical';
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

interface ReportCardProps {
  report: Report;
  onClick?: () => void;
}

export function ReportCard({ report, onClick }: ReportCardProps) {
  const severityLabel = getSeverityLabel(report.severity ?? 0);

  return (
    <motion.div
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="h-full min-w-0 cursor-pointer rounded-xl border border-slate-200/80 bg-white shadow-sm transition-all duration-300 group hover:border-emerald-200 hover:shadow-md"
    >
      <div className="flex h-full min-h-[218px] flex-col p-5">
        <div className="flex min-w-0 flex-1 items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2 mb-3">
              <span className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                {report.type === 'crop'
                  ? <Leaf size={14} className="text-emerald-600" />
                  : <Heart size={14} className="text-rose-500" />}
              </span>
              <span className="min-w-0 text-xs text-slate-400 font-medium capitalize break-words">
                {report.type} Disease
              </span>
            </div>

            <h3 className="mb-2 line-clamp-1 break-words text-base font-bold leading-6 text-slate-900">
              {report.disease_name || 'Pending Analysis'}
            </h3>
            <p className="line-clamp-1 break-words text-sm leading-5 text-slate-500">{report.title || 'Diagnosis report'}</p>
          </div>

          <ArrowRight
            size={16}
            className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all mt-1 shrink-0"
          />
        </div>

        <div className="mt-5 flex min-w-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {report.severity != null && (
            <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
              severityLabel === 'low'
                ? 'bg-emerald-50 text-emerald-700'
                : severityLabel === 'medium'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-red-50 text-red-700'
            }`}>
              {severityLabel}
            </span>
          )}
          {report.confidence != null && (
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700">
              {Math.round(report.confidence * 100)}% conf.
            </span>
          )}
          <span className="text-xs text-slate-400 sm:ml-auto">
            {report.created_at ? formatDate(report.created_at) : ''}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default ReportCard;
