import api from './axios';
import type { LoginRequest, LoginResponse, SignUpRequest, SignUpResponse, MeResponse } from '../types';

export const authApi = {
  signup: (data: SignUpRequest) =>
    api.post<SignUpResponse>('/auth/signup', data),

  login: (data: LoginRequest) =>
    api.post<LoginResponse>('/auth/login', data),

  getMe: () =>
    api.get<MeResponse>('/auth/me'),
};
