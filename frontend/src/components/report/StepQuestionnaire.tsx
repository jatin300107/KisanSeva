import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { farmerApi } from '../../api/farmer';
import type { DiagnosisType, Question, AnswerEntry } from '../../types';

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

  useEffect(() => {
    if (questions.length === 0 && type) {
      setLoading(true);
      farmerApi.getQuestions(type)
        .then((res) => {
          setQuestions(res.data.questions || []);
          setLoading(false);
        })
        .catch(() => {
          setLoading(false);
        });
    }
  }, [type, questions.length, setQuestions]);

  useEffect(() => {
    if (questions.length > 0) {
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

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="w-12 h-12 border-4 border-emerald-200 border-t-emerald-600 rounded-full animate-spin"></div>
        <p className="text-gray-500 font-medium">Loading questionnaire...</p>
      </div>
    );
  }

  if (questions.length === 0) return null;

  const progress = ((currentQuestionIndex) / questions.length) * 100;

  return (
    <div className="max-w-2xl mx-auto">
      <div className="mb-8">
        <div className="flex justify-between text-sm font-medium text-gray-500 mb-2">
          <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
          <span>{Math.round(progress)}% Complete</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div className="bg-emerald-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
        </div>
      </div>

      <div className="relative min-h-[300px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentQuestionIndex}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 space-y-6"
          >
            <h3 className="text-2xl font-semibold text-gray-900 leading-tight">
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
        </AnimatePresence>
      </div>

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
          {currentQuestionIndex === questions.length - 1 ? 'Review' : 'Next'}
        </button>
      </div>
    </div>
  );
};
