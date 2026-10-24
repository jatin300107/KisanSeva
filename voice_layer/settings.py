from pydantic_settings import BaseSettings, SettingsConfigDict


class ProviderSettings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Gemini
    gemini_api_key: str
    gemini_model: str = "gemini-3.5-flash-lite"
    gemini_thinking_level: str = "low"
    gemini_timeout_s: float = 5.0 
    # Gnani shared
    gnani_api_key: str
    gnani_connect_timeout_s: float = 10.0

    # Gnani TTS (SSE over HTTP POST)
    gnani_tts_url: str = "https://api.vachana.ai/api/v1/tts/sse"
    gnani_tts_model: str = "timbre-v2.5"
    gnani_tts_voice: str = "Nalini"
    gnani_tts_speed: float = 1.0
    gnani_tts_timeout_s: float = 20.0    # max wait between events

    # Gnani STT (WSS, config in headers)
    gnani_stt_url: str = "wss://api.vachana.ai/stt/v3/stream"
    gnani_stt_format: str = "verbatim"   # "transcribe" gives digits
    gnani_stt_vad_threshold: float = 0.6
    gnani_stt_min_silence_ms: int = 800
    gnani_stt_min_speech_ms: int = 200
    gnani_stt_bias_words: list[str] = []

    
    stt_answer_gap_s: float = 1.2       
    stt_no_speech_timeout_s: float = 8.0
    stt_max_utterance_s: float = 30.0
    stt_energy_threshold: float = 500.0  