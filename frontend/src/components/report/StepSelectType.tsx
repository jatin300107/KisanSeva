import React from 'react';
import { motion } from 'framer-motion';
import { Wheat, Bug, Check } from 'lucide-react';
import type { DiagnosisType } from '../../types';

interface StepSelectTypeProps {
  type: DiagnosisType | null;
  setType: (type: DiagnosisType) => void;
  onNext: () => void;
}

export const StepSelectType: React.FC<StepSelectTypeProps> = ({ type, setType, onNext }) => {
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="max-w-2xl mx-auto space-y-8"
    >
      <div className="text-center space-y-2">
        <h2 className="text-2xl font-semibold text-gray-900">What would you like to diagnose?</h2>
        <p className="text-gray-500">Select the category that best fits your issue.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <button
          onClick={() => setType('crop')}
          className={`relative p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
            type === 'crop'
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-200 bg-white hover:border-emerald-200 hover:shadow-md'
          }`}
        >
          {type === 'crop' && (
            <div className="absolute top-4 right-4 text-emerald-500">
              <Check className="w-6 h-6" />
            </div>
          )}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
            type === 'crop' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
          }`}>
            <Wheat className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Crop Disease</h3>
          <p className="text-gray-500">Diagnose diseases in your crops, plants, and vegetables.</p>
        </button>

        <button
          onClick={() => setType('animal')}
          className={`relative p-6 rounded-2xl border-2 transition-all duration-200 text-left ${
            type === 'animal'
              ? 'border-emerald-500 bg-emerald-50'
              : 'border-gray-200 bg-white hover:border-emerald-200 hover:shadow-md'
          }`}
        >
          {type === 'animal' && (
            <div className="absolute top-4 right-4 text-emerald-500">
              <Check className="w-6 h-6" />
            </div>
          )}
          <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-4 ${
            type === 'animal' ? 'bg-emerald-100 text-emerald-600' : 'bg-gray-100 text-gray-600'
          }`}>
            <Bug className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-semibold text-gray-900 mb-2">Livestock Disease</h3>
          <p className="text-gray-500">Diagnose diseases in your animals and livestock.</p>
        </button>
      </div>

      <div className="flex justify-end pt-6">
        <button
          onClick={onNext}
          disabled={!type}
          className="px-8 py-3 bg-emerald-600 text-white rounded-xl font-medium hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          Continue
        </button>
      </div>
    </motion.div>
  );
};
