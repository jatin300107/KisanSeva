import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, AlertCircle } from 'lucide-react';
import { farmerApi } from '../../api/farmer';
import type { DiagnosisType, Question, AnswerEntry } from '../../types';
import VoiceMode from '../voice/VoiceMode';

interface StepQuestionnaireProps {
  type: DiagnosisType | null;
  questions: Question[];
  setQuestions: (q: Question[]) => void;
  answers: AnswerEntry[];
  setAnswers: (a: AnswerEntry[]) => void;
  currentQuestionIndex: number;
  setCurrentQuestionIndex: (i: number) => void;
  onNext: () => void;
  onBack: () => void;
}

export const StepQuestionnaire: React.FC<StepQuestionnaireProps> = ({
  type,
  questions,
  setQuestions,
  answers,
  setAnswers,
  currentQuestionIndex,
  setCurrentQuestionIndex,
  onNext,
  onBack,
}) => {
  const [loading, setLoading] = useState(false);
  const [currentAnswer, setCurrentAnswer] = useState('');
  /** Default directly to 'voice' as Voice QA is mandatory */
  const [mode, setMode] = useState<'voice' | 'typed'>('voice');

  // Fetch questions on mount
  useEffect(() => {
    if (questions.length === 0 && type) {
      setLoading(true);
      farmerApi.getQuestions(type)
        .then((res) => {
          setQuestions(res.data.questions || []);
          setLoading(false);
        })
        .catch(() => setLoading(false));
    }
  }, [type, questions.length, setQuestions]);

  // Pre-fill answer input when question changes in fallback mode
  useEffect(() => {
    if (questions.length > 0 && currentQuestionIndex < questions.length) {
      const qId = questions[currentQuestionIndex].id;
      const existingAnswer = answers.find(a => a.question_id === qId);
      setCurrentAnswer(existingAnswer ? existingAnswer.answer : '');
    }
  }, [currentQuestionIndex, questions, answers]);

  const handleNext = () => {
    if (!currentAnswer.trim()) return;
    const qId = questions[currentQuestionIndex].id;
    const newAnswers = [...answers];
    const existingIndex = newAnswers.findIndex(a => a.question_id === qId);
    if (existingIndex >= 0) {
      newAnswers[existingIndex].answer = currentAnswer;
    } else {
      newAnswers.push({ question_id: qId, answer: currentAnswer });
    }
    setAnswers(newAnswers);
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      onNext();
    }
  };

  const handlePrev = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    } else {
      onBack();
    }
  };

  // Voice session completed — merge answers, jump to review & report creation
  const handleVoiceComplete = (voiceAnswers: AnswerEntry[]) => {
    setAnswers(voiceAnswers);
    onNext(); // Proceed directly to StepReview -> Report Creation
  };

  // Voice session ended early or failed — merge partial answers, switch to typed form as fallback
  const handleSwitchToTyped = (partialAnswers: AnswerEntry[]) => {
    if (partialAnswers.length > 0) {
      setAnswers(partialAnswers);
      const answeredIds = new Set(partialAnswers.map(a => a.question_id));
      const firstUnanswered = questions.findIndex(q => !answeredIds.has(q.id));
      setCurrentQuestionIndex(firstUnanswered >= 0 ? firstUnanswered : 0);
    }
    setMode('typed');
  };

  // ── Loading ─────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin" />
        <p className="text-gray-600 font-medium text-sm">
          Loading AI consultation questions...
        </p>
      </div>
    );
  }

  // ── Mandatory Voice Mode ────────────────────────────────────────────────
  if (mode === 'voice') {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        <VoiceMode
          category={type as 'crop' | 'animal'}
          questions={questions}
          onVoiceComplete={handleVoiceComplete}
          onSwitchToTyped={handleSwitchToTyped}
        />

        {/* Back navigation to Step 2 (Upload Image) */}
        <div className="flex justify-start pt-4 border-t border-slate-100">
          <button
            onClick={onBack}
            className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-medium text-sm hover:bg-slate-50 transition-colors"
          >
            ← Back to Image Upload
          </button>
        </div>
      </div>
    );
  }

  // ── Typed mode (Strictly an emergency fallback if mic is blocked/failed) ───
  const progress = questions.length > 0 ? (currentQuestionIndex / questions.length) * 100 : 0;

  return (
    <div className="max-w-2xl mx-auto">
      {/* Notice that user is in fallback mode */}
      <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-800 text-sm">
          <AlertCircle size={18} className="shrink-0 text-amber-600" />
          <span>Voice mode unavailable. Please complete the questions below.</span>
        </div>
        <button
          onClick={() => setMode('voice')}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-semibold hover:bg-emerald-700 transition-colors shrink-0"
        >
          <Mic size={13} />
          Retry Voice QA
        </button>
      </div>

      {/* Progress header */}
      <div className="mb-8">
        <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="relative min-h-[260px]">
        <AnimatePresence mode="wait">
          {questions[currentQuestionIndex] && (
            <motion.div
              key={currentQuestionIndex}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
              className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6"
            >
              <h3 className="text-xl font-semibold text-gray-900 leading-tight">
                {questions[currentQuestionIndex].question}
              </h3>
              <textarea
                value={currentAnswer}
                onChange={(e) => setCurrentAnswer(e.target.value)}
                placeholder="Type your answer here..."
                className="w-full min-h-[120px] p-4 text-gray-700 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-all resize-none"
                autoFocus
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <div className="flex justify-between pt-8">
        <button
          onClick={handlePrev}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          {currentQuestionIndex === 0 ? 'Back' : 'Previous'}
        </button>
        <button
          onClick={handleNext}
          disabled={!currentAnswer.trim()}
          className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
        >
          {currentQuestionIndex === questions.length - 1 ? 'Review & Submit' : 'Next'}
        </button>
      </div>
    </div>
  );
};

export default StepQuestionnaire;
