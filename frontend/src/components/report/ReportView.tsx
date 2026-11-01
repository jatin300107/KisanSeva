import React from 'react';
import { motion } from 'framer-motion';
import type { ReactNode } from 'react';
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
import ReportNarrationPlayer from './ReportNarrationPlayer';

interface ReportViewProps {
  report: Report;
  images: ReportImage[];
  answers: ReportAnswer[];
  consultations: Consultation[];
  onRequestConsultation: () => void;
  onBackToDashboard: () => void;
}

function renderInlineMarkdown(value: string): ReactNode[] {
  const parts = value.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g);
  return parts.filter(Boolean).map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index} className="font-bold text-slate-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={index}>{part.slice(1, -1)}</em>;
    }
    return <span key={index}>{part}</span>;
  });
}

function RichReportText({ content }: { content: string }) {
  const lines = content.split(/\r?\n/);
  const blocks: ReactNode[] = [];
  let listItems: string[] = [];

  const flushList = () => {
    if (listItems.length === 0) return;
    blocks.push(
      <ul key={`list-${blocks.length}`} className="my-3 list-disc space-y-2 pl-5 marker:text-emerald-600">
        {listItems.map((item, index) => (
          <li key={index} className="pl-1">
            {renderInlineMarkdown(item)}
          </li>
        ))}
      </ul>,
    );
    listItems = [];
  };

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed) {
      flushList();
      return;
    }

    const bullet = trimmed.match(/^(?:[*-])\s+(.*)$/);
    if (bullet) {
      listItems.push(bullet[1]);
      return;
    }

    flushList();
    const heading = trimmed.match(/^#{1,6}\s+(.*)$/);
    blocks.push(
      heading ? (
        <h3 key={`heading-${index}`} className="mb-2 mt-4 text-base font-bold text-slate-900 first:mt-0">
          {renderInlineMarkdown(heading[1])}
        </h3>
      ) : (
        <p key={`paragraph-${index}`} className="mb-3 last:mb-0">
          {renderInlineMarkdown(trimmed)}
        </p>
      ),
    );
  });

  flushList();
  return <div>{blocks}</div>;
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
      className="page-shell space-y-6 pb-12"
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

      {/* Report header */}
      <div className="surface overflow-hidden">
        <div className="h-1 bg-gradient-to-r from-emerald-500 to-teal-500" />
        <div className="p-5 sm:p-7">
          {mainImage && (
            <div className="mb-6 overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
              <img src={mainImage} alt="Submitted specimen" className="mx-auto max-h-80 w-full object-contain" />
            </div>
          )}

          <div className="flex min-w-0 flex-col gap-4">
            <div className="flex min-w-0 flex-wrap items-center gap-2">
              <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-700">
                {report.type === 'crop' ? 'Crop' : 'Livestock'}
              </span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600">
                <Calendar className="mr-1 inline-block h-3.5 w-3.5" />
                {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            </div>

            <div className="min-w-0">
              <h1 className="max-w-4xl break-words text-2xl font-bold leading-tight tracking-tight text-slate-900 sm:text-3xl">
                {report.title || 'Diagnostic Advisory Report'}
              </h1>
              <p className="mt-2 break-words text-base font-semibold leading-6 text-emerald-700">
                Diagnosed: {report.disease_name || 'Pending analysis'}
              </p>
            </div>

            <div className="grid min-w-0 grid-cols-1 gap-3 border-t border-slate-100 pt-4 sm:grid-cols-2">
              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Severity</p>
                <div className="min-w-0">{getSeverityBadge(report.severity)}</div>
              </div>
              <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-2 flex items-center justify-between gap-3 text-xs">
                  <span className="font-semibold uppercase tracking-wider text-slate-500">Confidence</span>
                  <span className="shrink-0 font-bold text-emerald-700">{Math.round((report.confidence || 0) * 100)}%</span>
                </div>
                <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                  <div
                    className="h-full rounded-full bg-emerald-500 transition-all duration-1000"
                    style={{ width: `${Math.round((report.confidence || 0) * 100)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="space-y-7 border-t border-slate-200 bg-white p-5 sm:p-7">
          {/* Audio Summary Narration Player */}
          <ReportNarrationPlayer reportId={report.id} />

          {/* AI Diagnosis Details */}
          <section className="min-w-0 rounded-xl border border-emerald-100 bg-emerald-50/40 p-5 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
              <Sparkles className="w-5 h-5 text-emerald-600" />
              AI Diagnosis
            </h2>
            <div className="max-w-none break-words [overflow-wrap:anywhere] text-sm leading-7 text-slate-700 sm:text-base">
              <RichReportText content={report.ai_diagnosis || 'No diagnosis details are available.'} />
            </div>
          </section>

          {/* AI Suggestions / Action Plan */}
          <section className="min-w-0 rounded-xl border border-teal-100 bg-teal-50/40 p-5 sm:p-6">
            <h2 className="mb-3 flex items-center gap-2 text-base font-bold text-slate-900 sm:text-lg">
              <Stethoscope className="w-5 h-5 text-teal-600" />
              Recommendations
            </h2>
            <div className="break-words [overflow-wrap:anywhere] text-sm leading-7 text-slate-700 sm:text-base">
              <RichReportText content={report.ai_suggestions || 'No recommendations are available.'} />
            </div>
          </section>

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
                    <p className="text-sm text-slate-700 bg-slate-50 p-3 rounded-lg border border-slate-100 break-words leading-6">{c.message}</p>

                    {c.response ? (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Expert Response:
                        </p>
                        <p className="text-sm text-slate-800 bg-emerald-50/70 p-3 rounded-lg border border-emerald-100 font-medium break-words leading-6">
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
