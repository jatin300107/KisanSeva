import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FilePlus, FileText, Leaf, Heart } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ReportCard } from '../../components/report/ReportCard';
import { Button } from '../../components/ui/Button';
import { farmerApi } from '../../api/farmer';
import type { Report } from '../../types/index';

type Filter = 'all' | 'crop' | 'animal';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 h-36">
      <div className="shimmer h-4 rounded w-3/4 mb-3" />
      <div className="shimmer h-3 rounded w-1/2 mb-2" />
      <div className="shimmer h-3 rounded w-2/3" />
    </div>
  );
}

export default function ReportHistory() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => {
    farmerApi
      .getReports()
      .then((res) => setReports(res.data.reports))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === 'all' ? reports : reports.filter((r) => r.type === filter);

  const counts = {
    all:    reports.length,
    crop:   reports.filter((r) => r.type === 'crop').length,
    animal: reports.filter((r) => r.type === 'animal').length,
  };

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-start justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900 mb-1">Report History</h1>
            <p className="text-slate-500 text-sm">All your past AI diagnoses in one place.</p>
          </div>
          <Button
            variant="primary"
            icon={<FilePlus size={16} />}
            onClick={() => navigate('/farmer/reports/new')}
            className="shrink-0"
          >
            New Diagnosis
          </Button>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 flex-wrap">
          {(['all', 'crop', 'animal'] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                filter === f
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300 hover:text-emerald-600'
              }`}
            >
              {f === 'crop'   && <Leaf  size={13} />}
              {f === 'animal' && <Heart size={13} />}
              {f === 'all' ? 'All' : f === 'crop' ? 'Crop' : 'Animal'}
              <span
                className={`text-xs rounded-full px-1.5 py-0.5 font-bold ${
                  filter === f ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {counts[f]}
              </span>
            </button>
          ))}
        </div>

        {/* Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[...Array(6)].map((_, i) => <SkeletonCard key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <FileText size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No reports found</h3>
            <p className="text-slate-400 text-sm mb-6">
              {filter === 'all'
                ? 'Start your first AI diagnosis.'
                : `No ${filter} disease reports yet.`}
            </p>
            <Button
              variant="primary"
              icon={<FilePlus size={16} />}
              onClick={() => navigate('/farmer/reports/new')}
            >
              New Diagnosis
            </Button>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            initial="hidden"
            animate="visible"
            variants={{
              hidden: {},
              visible: { transition: { staggerChildren: 0.05 } },
            }}
          >
            {filtered.map((r) => (
              <motion.div
                key={r.id}
                variants={{
                  hidden: { opacity: 0, y: 16 },
                  visible: { opacity: 1, y: 0 },
                }}
              >
                <ReportCard
                  report={r}
                  onClick={() => navigate(`/farmer/reports/${r.id}`)}
                />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </DashboardLayout>
  );
}
