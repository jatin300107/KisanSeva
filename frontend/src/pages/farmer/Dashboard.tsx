import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FilePlus, FileText, ArrowRight } from 'lucide-react';
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
      <div className="w-full space-y-8">
        <header className="flex flex-col justify-between gap-4 border-b border-slate-200/60 pb-6 pt-2 sm:flex-row sm:items-center">
          <div className="min-w-0">
            <h1 className="break-words text-2xl font-bold text-slate-900">
              {greeting}, {firstName}! <span aria-hidden="true">👋</span>
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              Review your recent diagnoses or start a new crop or livestock report.
            </p>
          </div>
          <button
            onClick={() => navigate('/farmer/reports/new')}
            className="flex shrink-0 items-center gap-2 self-start rounded-xl bg-emerald-600 px-4 py-2.5 font-medium text-white shadow-sm transition hover:bg-emerald-700 sm:self-auto"
          >
            <span className="text-lg">+</span> Start New Diagnosis
          </button>
        </header>

        {/* Stats */}
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-3">
          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Total Reports</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '—' : totalReports}</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Latest Disease</p>
            <p className="mt-1 truncate text-base font-bold text-slate-900">{loading ? '—' : latestDisease}</p>
          </div>
          <div className="min-w-0 rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            <p className="text-xs font-medium text-slate-500">Avg. Confidence</p>
            <p className="mt-1 text-2xl font-bold text-slate-900">{loading ? '—' : `${avgConf}%`}</p>
          </div>
        </section>

        {/* Recent reports */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold tracking-tight text-slate-900">Recent Reports</h2>
              <p className="mt-1 text-sm text-slate-500">Your latest diagnosis results.</p>
            </div>
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
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
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              {reports.slice(0, 6).map((r) => (
                <ReportCard
                  key={r.id}
                  report={r}
                  onClick={() => navigate(`/farmer/reports/${r.id}`)}
                />
              ))}
            </div>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}
