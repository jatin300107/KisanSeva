// ========================
// Auth Types
// ========================

export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: 'farmer' | 'vet' | 'agrologist';
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  access_token: string;
  user_id: string;
  role: string | null;
}

export interface SignUpResponse {
  message: string;
  user_id: string;
}

export interface MeResponse {
  user_id: string;
  email: string;
  role: 'farmer' | 'vet' | 'agrologist';
  name: string;
}

export interface User {
  user_id: string;
  email: string;
  role: 'farmer' | 'vet' | 'agrologist';
  name: string;
}

// ========================
// Report Types
// ========================

export interface Report {
  id: string;
  user_id: string;
  type: 'crop' | 'animal';
  title: string;
  ai_diagnosis: string;
  ai_suggestions: string;
  disease_name: string;
  severity: number;
  confidence: number;
  status: string;
  created_at: string;
}

export interface ReportAnswer {
  id: string;
  answer: string;
  question_id: string;
  questions: {
    question: string;
    type: string;
  };
}

export interface ReportImage {
  id: string;
  image_url: string;
  created_at: string;
}

export interface Consultation {
  id: string;
  message: string;
  response: string | null;
  status: 'pending' | 'answered';
  created_at: string;
}

export interface ReportDetailResponse {
  report: Report;
  answers: ReportAnswer[];
  images: ReportImage[];
  consultations: Consultation[];
}

export interface ReportsListResponse {
  reports: Report[];
}

// ========================
// Question Types
// ========================

export interface Question {
  id: string;
  question: string;
}

export interface QuestionsResponse {
  questions: Question[];
}

// ========================
// Expert Types
// ========================

export interface Expert {
  id: string;
  name: string;
  phone: string;
  role: string;
}

export interface ExpertsResponse {
  experts: Expert[];
}

// ========================
// Consultation Types (Expert side)
// ========================

export interface ExpertConsultation {
  id: string;
  message: string;
  response: string | null;
  status: 'pending' | 'answered';
  created_at: string;
  reports: {
    id: string;
    title: string;
    type: string;
    disease_name: string;
    severity: number;
  };
  users: {
    id: string;
    name: string;
    phone: string;
  };
}

export interface ExpertConsultationsResponse {
  consultations: ExpertConsultation[];
}

// ========================
// AI Report Submission
// ========================

export interface AnswerEntry {
  question_id: string;
  answer: string;
}

export interface SubmitReportRequest {
  type: 'crop' | 'animal';
  answers: AnswerEntry[];
  image_url: string | null;
}

export interface SubmitReportResponse {
  report_id: string;
  title: string;
  disease_name: string;
  ai_diagnosis: string;
  ai_suggestions: string;
  severity: number;
  confidence: number;
  image_url: string | null;
}

// ========================
// Image Upload
// ========================

export interface ImageUploadResponse {
  message: string;
  image_url: string;
}

// ========================
// Consultation Request
// ========================

export interface ConsultationRequestBody {
  message: string;
  expert_id: string;
}

export interface ConsultationRequestResponse {
  message: string;
  consultation_id: string;
}

// ========================
// Expert Response
// ========================

export interface ExpertRespondBody {
  response: string;
}

export interface ExpertRespondResponse {
  message: string;
  consultation_id: string;
}

// ========================
// Wizard State
// ========================

export type DiagnosisType = 'crop' | 'animal';

export interface WizardState {
  step: number;
  type: DiagnosisType | null;
  imageUrl: string | null;
  imageFile: File | null;
  questions: Question[];
  answers: AnswerEntry[];
  currentQuestionIndex: number;
}
