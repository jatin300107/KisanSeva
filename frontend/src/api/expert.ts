import api from './axios';
import type {
  ExpertConsultationsResponse,
  ExpertRespondBody,
  ExpertRespondResponse,
} from '../types';

export const expertApi = {
  getConsultations: (status?: string) =>
    api.get<ExpertConsultationsResponse>('/expert/consultations', {
      params: status ? { status } : {},
    }),

  respondToConsultation: (consultationId: string, body: ExpertRespondBody) =>
    api.put<ExpertRespondResponse>(`/expert/consultations/${consultationId}/respond`, body),
};
