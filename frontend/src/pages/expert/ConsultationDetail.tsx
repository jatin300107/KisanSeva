import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft, Send, CheckCircle2, Activity, AlertTriangle } from 'lucide-react';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { Button } from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { Badge } from '../../components/ui/Badge';
import { expertApi } from '../../api/expert';
import type { ExpertConsultation } from '../../types/index';

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<ExpertConsultation | null>(null);
  const [response, setResponse] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!id) return;
    expertApi
      .getConsultations()
      .then((res) => {
        const found = res.data.consultations.find((c) => c.id === id);
        if (found) setConsultation(found);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!response.trim() || !id) return;
    setSubmitting(true);
    setError('');
    try {
      await expertApi.respondToConsultation(id, { response });
      setSuccess(true);
      setTimeout(() => navigate('/expert/dashboard'), 2000);
    } catch {
      setError('Failed to submit response. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Spinner size={36} label="Loading case details..." />
        </div>
      </DashboardLayout>
    );
  }

  if (!consultation) {
    return (
      <DashboardLayout>
        <div className="text-center py-16">
          <AlertTriangle size={40} className="text-amber-400 mx-auto mb-3" />
          <h3 className="text-lg font-bold text-slate-700">Consultation not found</h3>
          <button
            onClick={() => navigate(-1)}
            className="mt-4 text-emerald-600 text-sm font-medium hover:text-emerald-700"
          >
            Go back
          </button>
        </div>
      </DashboardLayout>
    );
  }

  const severityNum = consultation.reports?.severity ?? 0;
  const severity =
    severityNum <= 1 ? 'low'
    : severityNum <= 2 ? 'medium'
    : severityNum <= 3 ? 'high'
    : 'critical';
  const severityWidth =
    severity === 'critical' ? 'w-full'
    : severity === 'high'   ? 'w-3/4'
    : severity === 'medium' ? 'w-1/2'
    :                         'w-1/4';
  const severityBarColor =
    severity === 'critical' || severity === 'high'
      ? 'bg-red-500'
      : severity === 'medium'
      ? 'bg-amber-500'
      : 'bg-emerald-500';

  const initials =
    consultation.users?.name
      ?.split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || '?';

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto">
        {/* Breadcrumb */}
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-slate-500 hover:text-slate-800 text-sm font-medium mb-6 transition-colors"
        >
          <ArrowLeft size={16} /> Back to Dashboard
        </button>

        <div className="flex items-center justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-black text-slate-900">Case Review</h1>
            <p className="text-slate-400 text-sm mt-1">
              ID: {consultation.id?.slice(0, 8)}...
            </p>
          </div>
          {consultation.status === 'answered' ? (
            <Badge variant="success">Answered</Badge>
          ) : (
            <Badge variant="pending">Pending Review</Badge>
          )}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
          {/* Left column */}
          <div className="lg:col-span-3 flex flex-col gap-5">
            {/* Farmer info */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
            >
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                Farmer Info
              </h3>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center text-white font-bold">
                  {initials}
                </div>
                <div>
                  <p className="font-bold text-slate-800">{consultation.users?.name || 'Unknown'}</p>
                  <p className="text-slate-400 text-sm">{consultation.users?.phone || 'No phone'}</p>
                </div>
              </div>
            </motion.div>

            {/* Report summary */}
            {consultation.reports && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"
              >
                <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                  Report Summary
                </h3>
                <p className="font-bold text-slate-800 mb-2">{consultation.reports.title}</p>
                {consultation.reports.disease_name && (
                  <div className="flex items-center gap-2 mb-4">
                    <Activity size={14} className="text-rose-500" />
                    <span className="text-sm text-rose-600 font-medium">
                      {consultation.reports.disease_name}
                    </span>
                  </div>
                )}
                {consultation.reports.severity && (
                  <div>
                    <div className="flex justify-between text-xs text-slate-500 mb-1.5">
                      <span>Severity</span>
                      <span className="capitalize font-medium">{consultation.reports.severity}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${severityBarColor} ${severityWidth} transition-all duration-700`}
                      />
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* Farmer message */}
            {consultation.message && (
              <motion.div
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.15 }}
                className="bg-amber-50 border border-amber-200 rounded-2xl p-5"
              >
                <h3 className="text-xs font-semibold text-amber-600 uppercase tracking-widest mb-3">
                  Farmer&apos;s Message
                </h3>
                <p className="text-slate-700 text-sm leading-relaxed italic">
                  &ldquo;{consultation.message}&rdquo;
                </p>
              </motion.div>
            )}
          </div>

          {/* Right column – response */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-2"
          >
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 sticky top-24">
              <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-widest mb-4">
                {consultation.status === 'answered' ? 'Your Response' : 'Write Response'}
              </h3>

              {success && (
                <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl p-3 mb-4 text-sm">
                  <CheckCircle2 size={16} />
                  Response submitted! Redirecting…
                </div>
              )}

              {consultation.status === 'answered' && consultation.response ? (
                <div className="bg-slate-50 rounded-xl p-4">
                  <p className="text-slate-700 text-sm leading-relaxed whitespace-pre-wrap">
                    {consultation.response}
                  </p>
                </div>
              ) : (
                <>
                  {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl mb-4">
                      {error}
                    </div>
                  )}
                  <textarea
                    value={response}
                    onChange={(e) => setResponse(e.target.value)}
                    placeholder="Write your expert diagnosis and treatment recommendations here…"
                    rows={10}
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 resize-none transition-all focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 focus:bg-white"
                  />
                  <Button
                    variant="primary"
                    size="lg"
                    icon={<Send size={16} />}
                    loading={submitting}
                    onClick={handleSubmit}
                    disabled={!response.trim()}
                    className="w-full mt-4"
                  >
                    Submit Response
                  </Button>
                </>
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </DashboardLayout>
  );
}
