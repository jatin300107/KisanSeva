import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Sparkles, AlertCircle } from 'lucide-react';
import { aiApi } from '../../api/ai';
import type { DiagnosisType, AnswerEntry, SubmitReportResponse } from '../../types';

interface StepProcessingProps {
  type: DiagnosisType | null;
  answers: AnswerEntry[];
  imageUrl: string | null;
  onComplete: (res: SubmitReportResponse) => void;
  onError: () => void;
}

const MESSAGES = [
  'Analyzing image...',
  'Identifying symptoms...',
  'Cross-referencing disease database...',
  'Generating diagnosis report...',
  'Almost done...'
];

export const StepProcessing: React.FC<StepProcessingProps> = ({ type, answers, imageUrl, onComplete, onError }) => {
  const [msgIndex, setMsgIndex] = useState(0);
  const [errorState, setErrorState] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      setMsgIndex(prev => (prev + 1) % MESSAGES.length);
    }, 2500);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (type) {
      aiApi.submitReport({ type, answers, image_url: imageUrl })
        .then(res => {
          onComplete(res.data);
        })
        .catch(() => {
          setErrorState(true);
        });
    }
  }, [type, answers, imageUrl, onComplete]);

  if (errorState) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-6 max-w-lg mx-auto text-center">
        <div className="w-20 h-20 bg-red-50 text-red-500 rounded-full flex items-center justify-center">
          <AlertCircle className="w-10 h-10" />
        </div>
        <div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Analysis Failed</h3>
          <p className="text-gray-500 mb-6">We encountered an error while analyzing your report. Please try again.</p>
        </div>
        <button
          onClick={onError}
          className="px-8 py-3 bg-gray-900 text-white rounded-xl font-medium hover:bg-gray-800 transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20">
      <div className="relative mb-12">
        <div className="absolute inset-0 bg-emerald-400 blur-[40px] opacity-20 rounded-full"></div>
        <motion.div
          animate={{ scale: [1, 1.05, 1] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-32 h-32 bg-white rounded-full shadow-xl flex items-center justify-center border-4 border-emerald-50"
        >
          <Brain className="w-12 h-12 text-emerald-600" />
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 10, repeat: Infinity, ease: "linear" }}
            className="absolute inset-0 rounded-full border-2 border-dashed border-emerald-200"
          ></motion.div>
          <Sparkles className="absolute -top-2 -right-2 w-8 h-8 text-yellow-400" />
        </motion.div>
      </div>

      <div className="h-12 flex items-center justify-center mb-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={msgIndex}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="text-lg font-medium text-emerald-600"
          >
            {MESSAGES[msgIndex]}
          </motion.div>
        </AnimatePresence>
      </div>

      <p className="text-gray-500 text-sm">Please wait while our AI analyzes your case</p>
      
      <div className="mt-8 flex space-x-2">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
            className="w-2.5 h-2.5 bg-emerald-500 rounded-full"
          />
        ))}
      </div>
    </div>
  );
};
