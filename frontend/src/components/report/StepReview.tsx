import React from 'react';
import { motion } from 'framer-motion';
import { Edit2, Image as ImageIcon, CheckCircle } from 'lucide-react';
import type { DiagnosisType, Question, AnswerEntry } from '../../types';

interface StepReviewProps {
  type: DiagnosisType | null;
  imageUrl: string | null;
  questions: Question[];
  answers: AnswerEntry[];
  onSubmit: () => void;
  onGoToStep: (step: number) => void;
  onBack: () => void;
}

export const StepReview: React.FC<StepReviewProps> = ({
  type,
  imageUrl,
  questions,
  answers,
  onSubmit,
  onGoToStep,
  onBack
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-3xl mx-auto space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">Review Your Details</h2>
        <p className="text-gray-500">Please review the information before submitting for AI analysis.</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <div>
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Diagnosis Type</h3>
            <div className="mt-1 flex items-center text-gray-900 font-semibold text-lg capitalize">
              {type === 'crop' ? '🌾 Crop Disease' : '🐄 Livestock Disease'}
            </div>
          </div>
          <button onClick={() => onGoToStep(1)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 border-b border-gray-100 flex items-center justify-between">
          <div className="flex-1">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">Uploaded Image</h3>
            {imageUrl ? (
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                  <img src={imageUrl} alt="Uploaded" className="w-full h-full object-cover" />
                </div>
                <div className="flex items-center text-emerald-600 font-medium text-sm">
                  <CheckCircle className="w-4 h-4 mr-1.5" /> Image attached
                </div>
              </div>
            ) : (
              <div className="flex items-center text-gray-400">
                <ImageIcon className="w-5 h-5 mr-2" />
                No image provided
              </div>
            )}
          </div>
          <button onClick={() => onGoToStep(2)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
            <Edit2 className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wider">Questionnaire</h3>
            <button onClick={() => onGoToStep(3)} className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors">
              <Edit2 className="w-5 h-5" />
            </button>
          </div>
          <div className="space-y-6">
            {answers.map((ans, idx) => {
              const questionText = questions.find(q => q.id === ans.question_id)?.question;
              return (
                <div key={ans.question_id} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <p className="text-sm font-medium text-gray-900 mb-2"><span className="text-emerald-600 mr-2">Q{idx + 1}.</span> {questionText}</p>
                  <p className="text-gray-600 text-sm pl-6 border-l-2 border-emerald-200 ml-1">{ans.answer}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="flex justify-between pt-6">
        <button
          onClick={onBack}
          className="px-6 py-3 border border-gray-300 text-gray-700 rounded-xl font-medium hover:bg-gray-50 transition-colors"
        >
          Back
        </button>
        <button
          onClick={onSubmit}
          className="px-8 py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-xl font-semibold shadow-md shadow-emerald-500/20 hover:shadow-lg hover:shadow-emerald-500/30 transform hover:-translate-y-0.5 transition-all"
        >
          Submit for AI Analysis
        </button>
      </div>
    </motion.div>
  );
};
