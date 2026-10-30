export interface VoiceClientOptions {
  apiBase?: string;
  getAccessToken: () => string | Promise<string>;
  category: 'animal' | 'crop';
  language?: string;
  onState?: (state: string) => void;
  onEvent?: (event: Record<string, unknown>) => void;
  onLevel?: (level: number) => void;
}

export interface VoiceClient {
  start: () => Promise<void>;
  stop: () => void;
  sendEndOfSpeech: () => void;
}

export function createVoiceClient(options: VoiceClientOptions): VoiceClient;
