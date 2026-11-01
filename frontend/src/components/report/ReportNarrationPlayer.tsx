import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Volume2, Loader2, Pause, Play, RotateCcw, AlertCircle, Subtitles } from 'lucide-react';
import { aiApi } from '../../api/ai';
import { useLanguage } from '../../context/LanguageContext';

interface ReportNarrationPlayerProps {
  reportId: string;
}

type PlayerState = 'idle' | 'loading' | 'playing' | 'paused' | 'error';

/**
 * Resolves full audio URL whether backend returns a relative or absolute URL.
 */
function resolveAudioUrl(url: string): string {
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:')) {
    return url;
  }
  const base = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
  return `${base.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

/**
 * Format seconds into mm:ss
 */
function formatTime(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

export const ReportNarrationPlayer: React.FC<ReportNarrationPlayerProps> = ({ reportId }) => {
  const [playerState, setPlayerState] = useState<PlayerState>('idle');
  const [cachedAudioUrl, setCachedAudioUrl] = useState<string | null>(null);
  const [captionText, setCaptionText] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const { language } = useLanguage();

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const cachedLanguageRef = useRef<string | null>(null);
  const selectedLanguageRef = useRef(language);
  selectedLanguageRef.current = language;

  useEffect(() => {
    setCachedAudioUrl(null);
    setCaptionText(null);
    setPlayerState('idle');
    setCurrentTime(0);
    setDuration(0);
    cachedLanguageRef.current = null;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.src = '';
    }
  }, [language]);

  // Stop playback when component unmounts (leaving the page)
  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      if (audio) {
        audio.pause();
        audio.src = '';
      }
    };
  }, []);

  // Sync state with HTML audio events
  const handleTimeUpdate = () => {
    if (audioRef.current) {
      setCurrentTime(audioRef.current.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) {
      setDuration(audioRef.current.duration || 0);
    }
  };

  const handleEnded = () => {
    setPlayerState('paused');
    setCurrentTime(0);
  };

  const handleAudioError = () => {
    setPlayerState('error');
    setErrorMessage('Could not prepare audio');
  };

  const startPlayback = useCallback(async () => {
    // Prevent duplicate calls if already loading
    if (playerState === 'loading') return;

    // If audio_url was already fetched and remembered in state for this page visit
    if (cachedAudioUrl && cachedLanguageRef.current === language && audioRef.current) {
      try {
        await audioRef.current.play();
        setPlayerState('playing');
      } catch {
        setPlayerState('paused');
      }
      return;
    }

    // First time loading: fire API request once
    setPlayerState('loading');
    setErrorMessage(null);

    try {
      const response = await aiApi.getReportNarration(reportId, language);
      const { audio_url, text } = response.data;
      if (selectedLanguageRef.current !== language) return;

      setCachedAudioUrl(audio_url);
      cachedLanguageRef.current = language;
      setCaptionText(text);

      const resolvedUrl = resolveAudioUrl(audio_url);

      if (audioRef.current) {
        audioRef.current.src = resolvedUrl;
        audioRef.current.load();
        try {
          await audioRef.current.play();
          setPlayerState('playing');
        } catch {
          // If browser autoplay blocks immediate playback, stay in paused state ready for user tap
          setPlayerState('paused');
        }
      }
    } catch (err: unknown) {
      setPlayerState('error');
      // Format friendly error messages based on status codes
      let msg = 'Could not prepare audio';
      if (typeof err === 'object' && err !== null && 'response' in err) {
        const response = (err as { response?: { status?: number; data?: { detail?: string } } }).response;
        if (response?.status === 404) {
          msg = 'Report not found';
        } else if (response?.status === 400) {
          msg = 'Unsupported language for narration';
        } else if (response?.status === 502) {
          msg = 'Narration unavailable at the moment';
        } else if (response?.data?.detail) {
          msg = response.data.detail;
        }
      }
      setErrorMessage(msg);
    }
  }, [cachedAudioUrl, language, playerState, reportId]);

  const pausePlayback = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      setPlayerState('paused');
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (audioRef.current) {
      audioRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  return (
    <div className="w-full bg-emerald-50/70 border border-emerald-200/90 rounded-2xl p-4 sm:p-5 transition-all shadow-sm">
      {/* Hidden native HTML audio element */}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onError={handleAudioError}
        preload="auto"
      />

      <div className="flex flex-col gap-3">
        {/* Top Control Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-600/10 border border-emerald-600/20 flex items-center justify-center text-emerald-700">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Audio Summary
              </h3>
              <p
                className="text-xs text-slate-500 font-medium"
                style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif" }}
              >
                Report summary ({language})
              </p>
            </div>
          </div>

          {/* Primary Action Button according to state */}
          {playerState === 'idle' && (
            <button
              onClick={startPlayback}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all min-h-[48px]"
            >
              <Volume2 className="w-4 h-4" />
              <span>Listen to summary</span>
            </button>
          )}

          {playerState === 'loading' && (
            <button
              disabled
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-700/60 text-white font-medium text-sm cursor-not-allowed opacity-90 min-h-[48px]"
            >
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Preparing audio...</span>
            </button>
          )}

          {playerState === 'playing' && (
            <button
              onClick={pausePlayback}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-amber-600 text-white font-semibold text-sm shadow-md shadow-amber-600/20 hover:bg-amber-700 active:scale-95 transition-all min-h-[48px]"
            >
              <Pause className="w-4 h-4" />
              <span>Pause</span>
            </button>
          )}

          {playerState === 'paused' && (
            <button
              onClick={startPlayback}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm shadow-md shadow-emerald-600/20 hover:bg-emerald-700 active:scale-95 transition-all min-h-[48px]"
            >
              <Play className="w-4 h-4" />
              <span>Play</span>
            </button>
          )}

          {playerState === 'error' && (
            <div className="w-full sm:w-auto flex items-center gap-2">
              <span className="text-xs text-red-600 font-medium flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" />
                {errorMessage || 'Could not prepare audio'}
              </span>
              <button
                onClick={startPlayback}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-red-600 text-white text-xs font-semibold hover:bg-red-700 active:scale-95 transition-all min-h-[38px]"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Retry
              </button>
            </div>
          )}
        </div>

        {/* Progress Bar & Timing (visible during playing and paused states) */}
        {(playerState === 'playing' || playerState === 'paused' || (duration > 0 && playerState !== 'loading')) && (
          <div className="pt-2 border-t border-emerald-200/60 flex flex-col gap-1.5">
            <div className="flex items-center gap-3">
              <input
                type="range"
                min={0}
                max={duration || 100}
                step={0.1}
                value={currentTime}
                onChange={handleSeek}
                className="w-full h-2 bg-emerald-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
              />
            </div>
            <div className="flex justify-between text-xs font-medium text-slate-500 px-0.5">
              <span>{formatTime(currentTime)}</span>
              <span>{formatTime(duration)}</span>
            </div>
          </div>
        )}

        {/* Captions Section */}
        {captionText && (
          <div className="mt-1 pt-3 border-t border-emerald-200/60 space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-800 uppercase tracking-wider">
              <Subtitles className="w-3.5 h-3.5" />
              <span>Summary Caption</span>
            </div>
            <div
              className="bg-white/90 border border-emerald-100 rounded-xl p-3 text-sm text-slate-700 leading-relaxed break-words"
              style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif" }}
            >
              {captionText}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportNarrationPlayer;
