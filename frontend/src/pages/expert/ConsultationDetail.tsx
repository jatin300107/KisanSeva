import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import DashboardLayout from '../../components/layout/DashboardLayout';
import { expertApi } from '../../api/expert';
import type { ExpertConsultation } from '../../types';
import Button from '../../components/ui/Button';
import Spinner from '../../components/ui/Spinner';
import { ArrowLeft, User, Phone, FileText, Send, CheckCircle2, AlertCircle } from 'lucide-react';

export default function ConsultationDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [consultation, setConsultation] = useState<ExpertConsultation | null>(null);
  const [loading, setLoading] = useState(true);
  const [responseMsg, setResponseMsg] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    expertApi.getConsultations()
      .then((res) => {
        const found = (res.data.consultations || []).find((c) => c.id === id);
        if (found) {
          setConsultation(found);
          if (found.response) {
            setResponseMsg(found.response);
          }
        } else {
          setError('Consultation case not found');
        }
        setLoading(false);
      })
      .catch(() => {
        setError('Failed to fetch consultation details');
        setLoading(false);
      });
  }, [id]);

  const handleSubmitResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id || !responseMsg.trim()) return;

    setSubmitting(true);
    setError(null);

    try {
      await expertApi.respondToConsultation(id, { response: responseMsg.trim() });
      setSubmitting(false);
      navigate('/expert/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.detail || 'Failed to submit response');
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => navigate('/expert/dashboard')}
          className="flex items-center text-sm font-semibold text-slate-600 hover:text-emerald-700 transition-colors gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Consultations
        </button>

        {loading ? (
          <div className="py-20 flex justify-center">
            <Spinner size={32} label="Loading Case Details..." />
          </div>
        ) : error || !consultation ? (
          <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-4">
            <h3 className="text-lg font-bold text-slate-800">Case Error</h3>
            <p className="text-sm text-slate-500">{error || 'Case unavailable'}</p>
            <Button variant="primary" onClick={() => navigate('/expert/dashboard')}>
              Back to Dashboard
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Header */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-100 pb-4">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Consultation ID</span>
                  <h1 className="text-xl font-extrabold text-slate-800">{consultation.id}</h1>
                </div>

                <span className={`px-3.5 py-1 text-xs font-bold uppercase rounded-full ${
                  consultation.status === 'answered' ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}>
                  {consultation.status === 'answered' ? '✓ Answered' : '⏳ Pending Response'}
                </span>
              </div>

              {/* Farmer Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-emerald-100 text-emerald-800 rounded-full">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Farmer Name</span>
                    <h4 className="font-bold text-slate-800 text-sm">{consultation.users?.name || 'N/A'}</h4>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-teal-100 text-teal-800 rounded-full">
                    <Phone className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-xs text-slate-400 font-semibold uppercase">Phone Number</span>
                    <h4 className="font-bold text-slate-800 text-sm">{consultation.users?.phone || 'N/A'}</h4>
                  </div>
                </div>
              </div>

              {/* Report summary */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-600" /> Diagnosis Summary
                </h3>
                <div className="bg-emerald-50/50 p-4 rounded-xl border border-emerald-100 text-sm space-y-1">
                  <p className="font-bold text-slate-800">{consultation.reports?.title}</p>
                  <p className="text-slate-700">Diagnosed Condition: <span className="font-bold text-emerald-800">{consultation.reports?.disease_name}</span></p>
                  <p className="text-slate-600 text-xs">Severity Assessment: <span className="font-bold">{consultation.reports?.severity}/10</span></p>
                </div>
              </div>

              {/* Farmer's Inquiry */}
              <div className="space-y-2">
                <h3 className="text-sm font-bold uppercase text-slate-500 tracking-wider">Farmer's Inquiry</h3>
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-slate-800 text-sm italic leading-relaxed">
                  "{consultation.message}"
                </div>
              </div>
            </div>

            {/* Expert Response Form */}
            <div className="bg-white rounded-2xl border border-slate-200 p-6 md:p-8 shadow-sm space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                Submit Expert Advisory & Response
              </h2>

              {error && (
                <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs font-medium flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleSubmitResponse} className="space-y-4">
                <textarea
                  rows={6}
                  disabled={consultation.status === 'answered'}
                  value={responseMsg}
                  onChange={(e) => setResponseMsg(e.target.value)}
                  placeholder="Provide your professional recommendations, medical dosages, or agricultural best-practices..."
                  className="w-full p-4 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm text-slate-800 placeholder-slate-400 outline-none disabled:bg-slate-50 disabled:text-slate-600"
                />

                {consultation.status !== 'answered' ? (
                  <div className="flex justify-end">
                    <Button
                      variant="primary"
                      type="submit"
                      loading={submitting}
                      disabled={!responseMsg.trim()}
                      icon={<Send className="w-4 h-4" />}
                    >
                      Submit Response
                    </Button>
                  </div>
                ) : (
                  <div className="p-3 bg-emerald-50 text-emerald-800 text-xs font-semibold rounded-xl border border-emerald-200">
                    Response has been submitted and sent to the farmer.
                  </div>
                )}
              </form>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
