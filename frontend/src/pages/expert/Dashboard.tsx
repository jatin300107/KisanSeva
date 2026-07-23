import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { expertApi } from '../../api/expert';
import type { ExpertConsultation } from '../../types';
import { useAuth } from '../../context/AuthContext';
import { MessageSquare, Clock, CheckCircle2, User, FileText, ArrowRight, ShieldCheck, Filter } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ExpertDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<ExpertConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'answered'>('all');

  const fetchConsultations = () => {
    setLoading(true);
    const param = statusFilter === 'all' ? undefined : statusFilter;
    expertApi.getConsultations(param)
      .then((res) => {
        setConsultations(res.data.consultations || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchConsultations();
  }, [statusFilter]);

  const pendingCount = consultations.filter((c) => c.status === 'pending').length;
  const answeredCount = consultations.filter((c) => c.status === 'answered').length;

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Banner */}
        <div className="bg-gradient-to-r from-teal-900 to-emerald-900 rounded-3xl p-6 md:p-8 text-white shadow-lg">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <span className="px-3 py-1 bg-emerald-800/80 border border-emerald-500/30 text-emerald-100 rounded-full text-xs font-bold uppercase tracking-wider">
                  Expert Portal ({user?.role === 'vet' ? 'Veterinary Expert' : 'Agrologist Specialist'})
                </span>
              </div>
              <h1 className="text-2xl md:text-4xl font-extrabold text-white">
                Welcome, Dr. {user?.name || 'Expert'}
              </h1>
              <p className="text-emerald-100 text-sm md:text-base mt-1 max-w-xl">
                Review farmer consultation inquiries, inspect AI diagnostic reports, and submit professional medical and agricultural treatment plans.
              </p>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-amber-100 text-amber-800 rounded-xl">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Pending Reviews</p>
              <h3 className="text-2xl font-extrabold text-slate-800">{pendingCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-emerald-100 text-emerald-800 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Responded</p>
              <h3 className="text-2xl font-extrabold text-slate-800">{answeredCount}</h3>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3.5 bg-teal-100 text-teal-800 rounded-xl">
              <MessageSquare className="w-6 h-6" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase text-slate-400">Total Consultations</p>
              <h3 className="text-2xl font-extrabold text-slate-800">{consultations.length}</h3>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
          <Filter className="w-4 h-4 text-slate-400 mr-1" />
          <button
            onClick={() => setStatusFilter('all')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              statusFilter === 'all' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            All Consultations
          </button>
          <button
            onClick={() => setStatusFilter('pending')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              statusFilter === 'pending' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Pending Action ({pendingCount})
          </button>
          <button
            onClick={() => setStatusFilter('answered')}
            className={`px-3.5 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              statusFilter === 'answered' ? 'bg-emerald-700 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Completed ({answeredCount})
          </button>
        </div>

        {/* List of Consultations */}
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-32 bg-slate-100 animate-pulse rounded-2xl" />
            ))}
          </div>
        ) : consultations.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
            <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center mx-auto">
              <MessageSquare className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-800">No Consultation Requests</h3>
            <p className="text-sm text-slate-500 max-w-sm mx-auto">
              No farmer inquiries have been assigned matching your selected status filter.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {consultations.map((item) => (
              <motion.div
                key={item.id}
                whileHover={{ scale: 1.005 }}
                onClick={() => navigate(`/expert/consultations/${item.id}`)}
                className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md hover:border-emerald-300 transition-all cursor-pointer space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-3">
                    <span className="p-2 bg-emerald-50 text-emerald-700 rounded-lg">
                      <User className="w-4 h-4" />
                    </span>
                    <div>
                      <h4 className="font-bold text-slate-800 text-base">{item.users?.name || 'Farmer Client'}</h4>
                      <p className="text-xs text-slate-500 font-medium">Contact: {item.users?.phone || 'N/A'}</p>
                    </div>
                  </div>

                  <span className={`px-3 py-1 text-xs font-bold uppercase rounded-full ${
                    item.status === 'pending' ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                  }`}>
                    {item.status === 'pending' ? '⏳ Action Required' : '✓ Answered'}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Associated Report</span>
                    <p className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      {item.reports?.title || 'Report Details'}
                    </p>
                    <p className="text-xs font-medium text-slate-600 mt-1">
                      Suspected Disease: <span className="font-bold text-emerald-700">{item.reports?.disease_name}</span> (Severity: {item.reports?.severity}/10)
                    </p>
                  </div>

                  <div>
                    <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block mb-1">Farmer's Inquiry Message</span>
                    <p className="text-sm text-slate-700 italic line-clamp-2">"{item.message}"</p>
                  </div>
                </div>

                <div className="flex justify-end items-center text-xs font-bold text-emerald-700 hover:text-emerald-800 gap-1 pt-1">
                  <span>View Case & Provide Advice</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
