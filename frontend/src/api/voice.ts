import api from './axios';
import type { VoiceLanguage } from '../context/LanguageContext';

export const voiceApi = {
  getLanguages: () => api.get<VoiceLanguage[]>('/voice/languages'),
};
