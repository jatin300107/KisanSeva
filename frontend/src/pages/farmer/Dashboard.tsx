import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { farmerApi } from '../../api/farmer';
import type { Report } from '../../types';
import { ReportCard } from '../../components/report/ReportCard';
import Button from '../../components/ui/Button';
import { useAuth } from '../../context/AuthContext';
import { FilePlus, FileText, Activity, Clock, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function FarmerDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    farmerApi.getReports()
      .then((res) => {
        setReports(res.data.reports || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const recentReports = reports.slice(0, 5);
  const latestReport = reports[0];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 rounded-3xl p-6 md:p-8 text-white shadow-lg relative overflow-hidden">
          <div className="relative z-10 max-w-2xl">
            <span className="px-3 py-1 bg-emerald-700/70 border border-emerald-500/30 text-emerald-100 rounded-full text-xs font-semibold uppercase tracking-wider">
              Farmer Dashboard
            </span>
            <h1 className="text-2xl md:text-4xl font-extrabold mt-3 mb-2">
              Welcome back, {user?.name || 'Farmer'}! 👋
            </h1>
            <p className="text-emerald-100 text-sm md:text-base leading-relaxed mb-6">
              Monitor your crop health and livestock vitality with AI-powered diagnostics. Get instant advisory reports and connect with expert advisors.
            </p>
            <Button
              variant="primary"
              onClick={() => navigate('/farmer/reports/new')}
              icon={<FilePlus className="w-5 h-5" />}
              className="shadow-xl"
            >
              Start New Diagnosis
            </Button>
          </div>
        </div>

        {/* Overview Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-emerald-100 text-emerald-700 rounded-xl">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Total Reports</p>
              <h3 className="text-2xl font-extrabold text-slate-800">{reports.length}</h3>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-teal-100 text-teal-700 rounded-xl">
              <Activity className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Latest Diagnosis</p>
              <h3 className="text-base font-bold text-slate-800 line-clamp-1">{latestReport?.disease_name || 'No reports yet'}</h3>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-amber-100 text-amber-700 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Recent Activity</p>
              <h3 className="text-sm font-bold text-slate-800">{latestReport ? 'Report generated' : 'Ready for diagnosis'}</h3>
            </div>
          </motion.div>
        </div>

        {/* Recent Reports List */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-slate-800">Recent Diagnostic Reports</h2>
            {reports.length > 0 && (
              <button
                onClick={() => navigate('/farmer/reports')}
                className="text-sm font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
              >
                View All <ArrowRight className="w-4 h-4" />
              </button>
            )}
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-44 bg-slate-100 animate-pulse rounded-2xl" />
              ))}
            </div>
          ) : reports.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-4">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <FilePlus className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-800">No Reports Found</h3>
                <p className="text-sm text-slate-500 max-w-md mx-auto mt-1">
                  You haven't run any AI diagnoses yet. Create your first report to get started.
                </p>
              </div>
              <Button variant="primary" onClick={() => navigate('/farmer/reports/new')}>
                Create First Report
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {recentReports.map((report) => (
                <ReportCard
                  key={report.id}
                  report={report}
                  onClick={() => navigate(`/farmer/reports/${report.id}`)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
