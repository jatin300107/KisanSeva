import api from './axios';
import type { SubmitReportRequest, SubmitReportResponse } from '../types';

export const aiApi = {
  submitReport: (data: SubmitReportRequest) =>
    api.post<SubmitReportResponse>('/ai/reports/submit', data),
};
