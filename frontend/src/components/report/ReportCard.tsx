import { motion } from 'framer-motion';
import { ArrowRight, Activity, Leaf, Heart } from 'lucide-react';
import type { Report } from '../../types/index';
import { Badge } from '../ui/Badge';

const severityBarColor: Record<string, string> = {
  low:      'bg-emerald-500',
  medium:   'bg-amber-500',
  high:     'bg-red-500',
  critical: 'bg-red-700',
};

const severityBadgeVariant: Record<string, 'success' | 'warning' | 'danger'> = {
  low:      'success',
  medium:   'warning',
  high:     'danger',
  critical: 'danger',
};

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
  const barColor = severityBarColor[severityLabel];
  const badgeVariant = severityBadgeVariant[severityLabel] || 'neutral';

  return (
    <motion.div
      whileHover={{ y: -4 }}
      transition={{ duration: 0.2 }}
      onClick={onClick}
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-emerald-200 transition-all duration-300 group"
    >
      {/* Severity colour bar */}
      <div className={`h-1 ${barColor}`} />

      <div className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-7 h-7 bg-slate-100 rounded-lg flex items-center justify-center shrink-0">
                {report.type === 'crop'
                  ? <Leaf size={14} className="text-emerald-600" />
                  : <Heart size={14} className="text-rose-500" />}
              </span>
              <span className="text-xs text-slate-400 font-medium capitalize">
                {report.type} Disease
              </span>
            </div>

            <h3 className="font-bold text-slate-800 text-base leading-snug mb-1 truncate">
              {report.disease_name || 'Pending Analysis'}
            </h3>
            <p className="text-xs text-slate-500 truncate">{report.title}</p>
          </div>

          <ArrowRight
            size={16}
            className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all mt-1 shrink-0"
          />
        </div>

        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center gap-2 flex-wrap">
          {report.severity != null && (
            <Badge variant={badgeVariant}>
              <Activity size={10} /> {severityLabel}
            </Badge>
          )}
          {report.confidence != null && (
            <Badge variant="info">
              {Math.round(report.confidence * 100)}% conf.
            </Badge>
          )}
          <span className="text-xs text-slate-400 ml-auto">
            {report.created_at ? formatDate(report.created_at) : ''}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

export default ReportCard;
