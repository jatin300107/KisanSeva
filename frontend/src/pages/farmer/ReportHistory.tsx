import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { farmerApi } from '../../api/farmer';
import type { Report } from '../../types';
import { ReportCard } from '../../components/report/ReportCard';
import Button from '../../components/ui/Button';
import { FilePlus, Filter } from 'lucide-react';

export default function ReportHistory() {
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'crop' | 'animal'>('all');

  useEffect(() => {
    farmerApi.getReports()
      .then((res) => {
        setReports(res.data.reports || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredReports = reports.filter((r) => {
    if (filter === 'crop') return r.type === 'crop';
    if (filter === 'animal') return r.type === 'animal';
    return true;
  });

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-slate-800">Diagnostic Reports</h1>
            <p className="text-sm text-slate-500 mt-1">View your entire history of crop and livestock disease assessments</p>
          </div>

          <Button
            variant="primary"
            onClick={() => navigate('/farmer/reports/new')}
            icon={<FilePlus className="w-4 h-4" />}
          >
            New Report
          </Button>
        </div>

        {/* Filter Controls */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          <button
            onClick={() => setFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'all' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All ({reports.length})
          </button>
          <button
            onClick={() => setFilter('crop')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'crop' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🌾 Crop ({reports.filter((r) => r.type === 'crop').length})
          </button>
          <button
            onClick={() => setFilter('animal')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              filter === 'animal' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            🐄 Livestock ({reports.filter((r) => r.type === 'animal').length})
          </button>
        </div>

        {/* Content Grid */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <div key={n} className="h-44 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <h3 className="text-lg font-bold text-slate-800">No Reports Match Filter</h3>
            <p className="text-sm text-slate-500">There are no diagnostic reports matching your selected category.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredReports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                onClick={() => navigate(`/farmer/reports/${report.id}`)}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
