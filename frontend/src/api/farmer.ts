import api from './axios';
import type {
  ReportsListResponse,
  ReportDetailResponse,
  QuestionsResponse,
  ExpertsResponse,
  ImageUploadResponse,
  ConsultationRequestBody,
  ConsultationRequestResponse,
} from '../types';

export const farmerApi = {
  uploadImage: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<ImageUploadResponse>('/farmer/reports/images', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },

  getReports: () =>
    api.get<ReportsListResponse>('/farmer/reports'),

  getReport: (reportId: string) =>
    api.get<ReportDetailResponse>(`/farmer/reports/${reportId}`),

  getQuestions: (type: 'crop' | 'animal') =>
    api.get<QuestionsResponse>('/farmer/questions', { params: { type } }),

  getExperts: (role?: string) =>
    api.get<ExpertsResponse>('/farmer/experts', { params: role ? { role } : {} }),

  requestConsultation: (reportId: string, body: ConsultationRequestBody) =>
    api.post<ConsultationRequestResponse>(`/farmer/reports/${reportId}/consultations`, body),
};
