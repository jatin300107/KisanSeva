import React from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  CheckCircle2, 
  Calendar, 
  User, 
  MessageSquare, 
  Sparkles, 
  ArrowLeft,
  Stethoscope,
  ChevronDown,
  ChevronUp
} from 'lucide-react';
import type { Report, ReportImage, ReportAnswer, Consultation } from '../../types';
import Button from '../ui/Button';

interface ReportViewProps {
  report: Report;
  images: ReportImage[];
  answers: ReportAnswer[];
  consultations: Consultation[];
  onRequestConsultation: () => void;
  onBackToDashboard: () => void;
}

export const ReportView: React.FC<ReportViewProps> = ({
  report,
  images,
  answers,
  consultations,
  onRequestConsultation,
  onBackToDashboard,
}) => {
  const [showAnswers, setShowAnswers] = React.useState(false);

  const getSeverityBadge = (severity: number) => {
    if (severity <= 3) {
      return (
        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          Severity: Low ({severity}/10)
        </span>
      );
    } else if (severity <= 6) {
      return (
        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-amber-100 text-amber-800 border border-amber-300 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-amber-600" />
          Severity: Moderate ({severity}/10)
        </span>
      );
    } else {
      return (
        <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800 border border-red-300 flex items-center gap-1.5">
          <AlertTriangle className="w-4 h-4 text-red-600" />
          Severity: High ({severity}/10)
        </span>
      );
    }
  };

  const mainImage = images && images.length > 0 ? images[0].image_url : null;

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }} 
      animate={{ opacity: 1, y: 0 }} 
      className="max-w-4xl mx-auto space-y-6 pb-12"
    >
      {/* Navigation Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={onBackToDashboard}
          className="flex items-center text-sm font-semibold text-slate-600 hover:text-emerald-600 transition-colors gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </button>
        <span className="text-xs font-semibold px-3 py-1 bg-slate-100 text-slate-600 rounded-full border border-slate-200">
          Report ID: {report.id.slice(0, 8)}...
        </span>
      </div>

      {/* Main Banner */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="bg-gradient-to-r from-emerald-800 to-teal-900 p-6 md:p-8 text-white relative">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-3">
            <span className="px-3 py-1 text-xs font-bold uppercase rounded-full bg-emerald-700/80 text-emerald-100 border border-emerald-500/30">
              {report.type === 'crop' ? '🌾 Crop Diagnosis' : '🐄 Livestock Diagnosis'}
            </span>
            <div className="flex items-center text-emerald-200 text-xs font-medium gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>{new Date(report.created_at).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span>
            </div>
          </div>

          <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2">
            {report.title || 'Diagnostic Advisory Report'}
          </h1>
          
          <div className="flex items-center gap-2 text-emerald-100 font-medium text-lg">
            <span>Diagnosed Disease:</span>
            <span className="underline decoration-emerald-400 font-bold text-white">{report.disease_name}</span>
          </div>
        </div>

        {/* Diagnostic Meta Section */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div>
              <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Severity Rating</p>
              {getSeverityBadge(report.severity)}
            </div>
          </div>

          <div className="flex items-center gap-3 bg-white p-4 rounded-xl border border-slate-200">
            <div className="w-full">
              <div className="flex justify-between items-center text-xs mb-1">
                <span className="text-slate-500 font-medium uppercase tracking-wider">AI Confidence Score</span>
                <span className="font-bold text-emerald-700">{Math.round((report.confidence || 0) * 100)}%</span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <div 
                  className="bg-emerald-500 h-full rounded-full transition-all duration-1000" 
                  style={{ width: `${Math.round((report.confidence || 0) * 100)}%` }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 md:p-8 space-y-8">
          {/* Uploaded Image preview if present */}
          {mainImage && (
            <div>
              <h2 className="text-sm font-bold uppercase tracking-wider text-slate-500 mb-3">Submitted Specimen Image</h2>
              <div className="relative rounded-xl overflow-hidden max-h-72 border border-slate-200 bg-slate-900 flex justify-center">
                <img src={mainImage} alt="Specimen" className="object-contain max-h-72 w-auto" />
              </div>
            </div>
          )}

          {/* AI Diagnosis Details */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              Detailed AI Diagnosis
            </h2>
            <div className="bg-emerald-50/50 border border-emerald-100 rounded-xl p-5 text-slate-700 whitespace-pre-wrap leading-relaxed text-sm md:text-base font-normal">
              {report.ai_diagnosis}
            </div>
          </div>

          {/* AI Suggestions / Action Plan */}
          <div className="space-y-3">
            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Recommended Treatment & Advisory Plan
            </h2>
            <div className="bg-teal-50/50 border border-teal-100 rounded-xl p-5 text-slate-700 whitespace-pre-wrap leading-relaxed text-sm md:text-base font-normal">
              {report.ai_suggestions}
            </div>
          </div>

          {/* Questionnaire Answers Toggle */}
          {answers && answers.length > 0 && (
            <div className="pt-4 border-t border-slate-200">
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className="flex items-center justify-between w-full py-2 text-sm font-bold text-slate-700 hover:text-emerald-700 transition-colors"
              >
                <span>Submitted Observations ({answers.length} questions answered)</span>
                {showAnswers ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
              </button>

              {showAnswers && (
                <div className="mt-3 space-y-2 bg-slate-50 p-4 rounded-xl border border-slate-200">
                  {answers.map((ans, idx) => (
                    <div key={ans.id || idx} className="text-sm border-b border-slate-200/60 pb-2 last:border-0 last:pb-0">
                      <p className="font-semibold text-slate-800">Q: {ans.questions?.question || 'Observation Question'}</p>
                      <p className="text-slate-600 mt-0.5">A: {ans.answer}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Consultations History Section */}
          {consultations && consultations.length > 0 && (
            <div className="pt-6 border-t border-slate-200 space-y-4">
              <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-amber-600" />
                Expert Consultations
              </h2>

              <div className="space-y-3">
                {consultations.map((c) => (
                  <div key={c.id} className="p-4 rounded-xl border border-slate-200 bg-white space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="font-semibold flex items-center gap-1">
                        <User className="w-3.5 h-3.5" /> Farmer Request
                      </span>
                      <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${c.status === 'answered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
                        {c.status}
                      </span>
                    </div>
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100">{c.message}</p>

                    {c.response ? (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Expert Response:
                        </p>
                        <p className="text-sm text-slate-800 bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 font-medium">
                          {c.response}
                        </p>
                      </div>
                    ) : (
                      <p className="text-xs italic text-amber-600 font-medium">Waiting for an expert to review and respond...</p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Bar */}
          <div className="pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
            <Button variant="secondary" onClick={onBackToDashboard}>
              Back to Dashboard
            </Button>

            <Button variant="primary" onClick={onRequestConsultation} icon={<Stethoscope className="w-4 h-4" />}>
              Request Expert Consultation
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
