import React, { useState } from 'react';
import { AnimatePresence } from 'framer-motion';
import { Check } from 'lucide-react';
import type { DiagnosisType, Question, AnswerEntry, SubmitReportResponse } from '../../types';
import { StepSelectType } from './StepSelectType';
import { StepUploadImage } from './StepUploadImage';
import { StepQuestionnaire } from './StepQuestionnaire';
import { StepReview } from './StepReview';
import { StepProcessing } from './StepProcessing';

const STEPS = ['Select Type', 'Upload Image', 'Questionnaire', 'Review', 'Processing'];

export const ReportWizard: React.FC<{ onComplete: (res: SubmitReportResponse) => void }> = ({ onComplete }) => {
  const [step, setStep] = useState(1);
  const [type, setType] = useState<DiagnosisType | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<AnswerEntry[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);

  const nextStep = () => setStep(prev => Math.min(prev + 1, 5));
  const prevStep = () => setStep(prev => Math.max(prev - 1, 1));
  const goToStep = (s: number) => setStep(s);

  return (
    <div className="w-full">
      {/* Progress Bar */}
      <div className="mb-12 relative px-4">
        <div className="absolute top-1/2 left-0 w-full h-1 bg-gray-200 -translate-y-1/2 z-0 rounded-full" />
        <div 
          className="absolute top-1/2 left-0 h-1 bg-emerald-500 -translate-y-1/2 z-0 rounded-full transition-all duration-500" 
          style={{ width: `${((step - 1) / (STEPS.length - 1)) * 100}%` }}
        />
        <div className="relative z-10 flex justify-between">
          {STEPS.map((label, idx) => {
            const stepNum = idx + 1;
            const isActive = step === stepNum;
            const isCompleted = step > stepNum;
            
            return (
              <div key={label} className="flex flex-col items-center">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center border-2 font-semibold transition-colors duration-300 ${
                  isActive ? 'bg-emerald-600 border-emerald-600 text-white' : 
                  isCompleted ? 'bg-emerald-500 border-emerald-500 text-white' : 
                  'bg-white border-gray-300 text-gray-400'
                }`}>
                  {isCompleted ? <Check className="w-5 h-5" /> : stepNum}
                </div>
                <span className={`text-xs mt-2 font-medium hidden sm:block ${
                  isActive ? 'text-emerald-700' : isCompleted ? 'text-gray-700' : 'text-gray-400'
                }`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Step Content */}
      <div className="bg-white/50 backdrop-blur-xl rounded-3xl p-6 md:p-10 shadow-sm border border-gray-100 min-h-[500px]">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <StepSelectType key="step1" type={type} setType={setType} onNext={nextStep} />
          )}
          {step === 2 && (
            <StepUploadImage key="step2" imageUrl={imageUrl} imageFile={imageFile} setImageUrl={setImageUrl} setImageFile={setImageFile} onNext={nextStep} onBack={prevStep} />
          )}
          {step === 3 && (
            <StepQuestionnaire key="step3" type={type} questions={questions} setQuestions={setQuestions} answers={answers} setAnswers={setAnswers} currentQuestionIndex={currentQuestionIndex} setCurrentQuestionIndex={setCurrentQuestionIndex} onNext={nextStep} onBack={prevStep} />
          )}
          {step === 4 && (
            <StepReview key="step4" type={type} imageUrl={imageUrl} questions={questions} answers={answers} onSubmit={nextStep} onGoToStep={goToStep} onBack={prevStep} />
          )}
          {step === 5 && (
            <StepProcessing key="step5" type={type} answers={answers} imageUrl={imageUrl} onComplete={onComplete} onError={() => setStep(4)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
