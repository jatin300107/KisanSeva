import api from './axios';
import type { SubmitReportRequest, SubmitReportResponse, ReportNarrationResponse } from '../types';

export const aiApi = {
  submitReport: (data: SubmitReportRequest) =>
    api.post<SubmitReportResponse>('/ai/reports/submit', data),
  getReportNarration: (reportId: string, lang = 'hi-IN') =>
    api.get<ReportNarrationResponse>(`/ai/reports/${reportId}/narration`, {
      params: { lang },
    }),
};

export default aiApi;
