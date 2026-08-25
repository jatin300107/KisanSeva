import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FilePlus, FileText, Activity, TrendingUp, ArrowRight } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { ReportCard } from '../../components/report/ReportCard';
import { Button } from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { farmerApi } from '../../api/farmer';
import type { Report } from '../../types/index';

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5 h-36">
      <div className="shimmer h-4 rounded w-3/4 mb-3" />
      <div className="shimmer h-3 rounded w-1/2 mb-2" />
      <div className="shimmer h-3 rounded w-2/3" />
    </div>
  );
}

export default function FarmerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    farmerApi
      .getReports()
      .then((res) => setReports(res.data.reports))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const totalReports = reports.length;
  const latestDisease = reports[0]?.disease_name || 'No diagnosis yet';
  const avgConf = reports.length
    ? Math.round(
        (reports.reduce((s, r) => s + (r.confidence ?? 0), 0) / reports.length) * 100,
      )
    : 0;

  const firstName = user?.name?.split(' ')[0] || 'Farmer';
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  return (
    <DashboardLayout>
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Hero banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-emerald-700 to-teal-800 rounded-3xl p-8 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-6"
        >
          <div>
            <p className="text-emerald-200/70 text-sm mb-1">{greeting},</p>
            <h1 className="text-3xl font-black mb-2">{firstName}! 👋</h1>
            <p className="text-emerald-100/70 text-sm max-w-sm">
              Your crops are counting on you. Start a new AI diagnosis or review your past reports.
            </p>
          </div>
          <Button
            variant="ghost"
            size="lg"
            icon={<FilePlus size={18} />}
            onClick={() => navigate('/farmer/reports/new')}
            className="bg-white text-emerald-700 hover:bg-emerald-50 shrink-0 shadow-lg"
          >
            New Diagnosis
          </Button>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Reports',   value: totalReports,   icon: FileText,   color: 'text-emerald-600', bg: 'bg-emerald-50', isText: false },
            { label: 'Latest Disease',  value: latestDisease,  icon: Activity,   color: 'text-teal-600',    bg: 'bg-teal-50',    isText: true },
            { label: 'Avg. Confidence', value: `${avgConf}%`,  icon: TrendingUp, color: 'text-amber-600',   bg: 'bg-amber-50',   isText: false },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4"
            >
              <div className={`w-12 h-12 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <s.icon size={22} className={s.color} />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium mb-0.5">{s.label}</p>
                <p className={`font-black text-slate-800 ${s.isText ? 'text-sm truncate' : 'text-2xl'}`}>
                  {loading ? '—' : s.value}
                </p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            onClick={() => navigate('/farmer/reports/new')}
            className="bg-gradient-to-br from-emerald-600 to-teal-700 rounded-2xl p-6 cursor-pointer hover:-translate-y-1 hover:shadow-xl hover:shadow-emerald-500/20 transition-all duration-300 group"
          >
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-4">
              <FilePlus size={22} className="text-white" />
            </div>
            <h3 className="text-white font-bold text-lg mb-1">New AI Diagnosis</h3>
            <p className="text-emerald-100/70 text-sm mb-4">
              Upload a photo and answer a few questions to get your report.
            </p>
            <div className="flex items-center gap-1 text-white/70 text-xs font-medium group-hover:gap-2 transition-all">
              Start now <ArrowRight size={14} />
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.25 }}
            onClick={() => navigate('/farmer/reports')}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 cursor-pointer hover:-translate-y-1 hover:shadow-md hover:border-emerald-200 transition-all duration-300 group"
          >
            <div className="w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
              <FileText size={22} className="text-slate-600" />
            </div>
            <h3 className="text-slate-800 font-bold text-lg mb-1">View All Reports</h3>
            <p className="text-slate-500 text-sm mb-4">
              Browse and filter your complete diagnosis history.
            </p>
            <div className="flex items-center gap-1 text-slate-400 text-xs font-medium group-hover:text-emerald-600 group-hover:gap-2 transition-all">
              View history <ArrowRight size={14} />
            </div>
          </motion.div>
        </div>

        {/* Recent reports */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-slate-800">Recent Reports</h2>
            {reports.length > 0 && (
              <button
                onClick={() => navigate('/farmer/reports')}
                className="text-sm text-emerald-600 font-medium hover:text-emerald-700 flex items-center gap-1 transition-colors"
              >
                View all <ArrowRight size={14} />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <FileText size={28} className="text-slate-400" />
              </div>
              <h3 className="text-lg font-bold text-slate-700 mb-2">No reports yet</h3>
              <p className="text-slate-400 text-sm mb-6">
                Create your first AI diagnosis to get started.
              </p>
              <Button
                variant="primary"
                icon={<FilePlus size={16} />}
                onClick={() => navigate('/farmer/reports/new')}
              >
                Start First Diagnosis
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {reports.slice(0, 6).map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  onClick={() => navigate(`/farmer/reports/${r.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
