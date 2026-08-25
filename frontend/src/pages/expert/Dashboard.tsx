import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MessageSquare, CheckCircle2, Clock, ArrowRight, Activity } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Badge } from '../../components/ui/Badge';
import { useAuth } from '../../context/AuthContext';
import { expertApi } from '../../api/expert';
import type { ExpertConsultation } from '../../types/index';

type StatusFilter = 'all' | 'pending' | 'answered';

function statusBadge(status: string) {
  if (status === 'pending')  return <Badge variant="pending">Pending</Badge>;
  if (status === 'answered') return <Badge variant="success">Answered</Badge>;
  return <Badge variant="neutral">{status}</Badge>;
}

function SkeletonRow() {
  return (
    <div className="bg-white rounded-2xl border border-slate-100 p-5">
      <div className="shimmer h-4 rounded w-1/2 mb-3" />
      <div className="shimmer h-3 rounded w-3/4 mb-2" />
      <div className="shimmer h-3 rounded w-1/3" />
    </div>
  );
}

export default function ExpertDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [consultations, setConsultations] = useState<ExpertConsultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>('all');

  useEffect(() => {
    expertApi
      .getConsultations()
      .then((res) => setConsultations(res.data.consultations))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filtered =
    filter === 'all'
      ? consultations
      : consultations.filter((c) => c.status === filter);

  const pending  = consultations.filter((c) => c.status === 'pending').length;
  const answered = consultations.filter((c) => c.status === 'answered').length;

  const roleLabel =
    user?.role === 'vet'
      ? 'Veterinary Expert'
      : user?.role === 'agrologist'
      ? 'Agrologist'
      : 'Expert';
  const firstName = user?.name?.split(' ')[0] || 'Expert';

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        {/* Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-r from-teal-800 to-emerald-900 rounded-3xl p-8 text-white"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 bg-teal-600/40 border border-teal-400/30 text-teal-200 text-xs font-semibold px-3 py-1 rounded-full mb-4">
                {roleLabel}
              </div>
              <h1 className="text-3xl font-black mb-2">Welcome, {firstName}!</h1>
              <p className="text-teal-100/70 text-sm max-w-md">
                Review farmer-submitted cases and provide your expert consultation.
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-5xl font-black text-amber-300">{loading ? '—' : pending}</div>
              <div className="text-teal-200/70 text-xs mt-1">Pending reviews</div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Pending',     value: pending,              icon: Clock,         bg: 'bg-amber-50',   color: 'text-amber-600' },
            { label: 'Answered',    value: answered,             icon: CheckCircle2,  bg: 'bg-emerald-50', color: 'text-emerald-600' },
            { label: 'Total Cases', value: consultations.length, icon: MessageSquare, bg: 'bg-blue-50',    color: 'text-blue-600' },
          ].map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-3"
            >
              <div className={`w-10 h-10 ${s.bg} rounded-xl flex items-center justify-center shrink-0`}>
                <s.icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-xs text-slate-400">{s.label}</p>
                <p className="text-2xl font-black text-slate-800">{loading ? '—' : s.value}</p>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 flex-wrap">
          {(['all', 'pending', 'answered'] as StatusFilter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all capitalize ${
                filter === f
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'bg-white border border-slate-200 text-slate-600 hover:border-emerald-300'
              }`}
            >
              {f}
            </button>
          ))}
        </div>

        {/* Consultations list */}
        {loading ? (
          <div className="flex flex-col gap-3">
            {[...Array(4)].map((_, i) => <SkeletonRow key={i} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-white rounded-2xl border border-slate-100 p-16 text-center">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <MessageSquare size={28} className="text-slate-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-700 mb-2">No consultations yet</h3>
            <p className="text-slate-400 text-sm">Check back soon for new cases.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map((c, i) => (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                onClick={() => navigate(`/expert/consultations/${c.id}`)}
                className="bg-white rounded-2xl border border-slate-100 p-5 cursor-pointer hover:shadow-md hover:border-emerald-200 hover:-translate-y-0.5 transition-all duration-300 group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-full flex items-center justify-center text-white text-xs font-bold shrink-0">
                        {c.users?.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-800 text-sm">
                          {c.users?.name || 'Unknown'}
                        </p>
                        <p className="text-xs text-slate-400">{c.users?.phone || ''}</p>
                      </div>
                      {statusBadge(c.status)}
                    </div>

                    {c.reports && (
                      <div className="ml-12">
                        <p className="font-medium text-slate-700 text-sm mb-1">
                          {c.reports.title}
                        </p>
                        <div className="flex items-center gap-2 flex-wrap">
                          {c.reports.disease_name && (
                            <span className="text-xs text-rose-600 font-medium flex items-center gap-1">
                              <Activity size={11} /> {c.reports.disease_name}
                            </span>
                          )}
                          {c.reports.severity && (
                            <span className="text-xs text-slate-400 capitalize">
                              • {c.reports.severity} severity
                            </span>
                          )}
                        </div>
                        {c.message && (
                          <p className="text-xs text-slate-500 italic mt-2 line-clamp-2">
                            &ldquo;{c.message}&rdquo;
                          </p>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <span className="text-xs text-slate-400">
                      {new Date(c.created_at).toLocaleDateString('en-IN', {
                        day: 'numeric',
                        month: 'short',
                      })}
                    </span>
                    <ArrowRight
                      size={15}
                      className="text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-1 transition-all"
                    />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
