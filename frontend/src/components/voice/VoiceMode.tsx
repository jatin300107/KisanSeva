import { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mic, MicOff, Volume2, Loader2, StopCircle, CheckCircle,
  AlertTriangle, Keyboard, X, Sparkles, Headphones, MessageSquare,
} from 'lucide-react';
import { createVoiceClient } from '../../voice/voiceClient';
import type { AnswerEntry, Question } from '../../types';

// ─── Config ──────────────────────────────────────────────────────────────────
const VOICE_LANGUAGE = 'hi-IN';
const ENABLE_TAP_TO_SEND = false; // show "Done speaking" button when true
// An empty base keeps local HTTP and WebSocket traffic on the Vite origin,
// where the /voice proxy forwards both requests and upgrades.
const API_BASE = import.meta.env.VITE_API_URL || '';

// ─── Types ────────────────────────────────────────────────────────────────────
type VoiceState =
  | 'connecting'
  | 'agent_speaking'
  | 'listening'
  | 'thinking'
  | 'done'
  | 'error'
  | 'idle';

interface ChatBubble {
  id: string;
  role: 'agent' | 'user';
  text: string;
  isFinal?: boolean;
}

interface VoiceAnswerSaved {
  question_id: string;
  status: 'answered' | 'unclear' | 'refused' | 'skipped' | 'unanswered';
  value: string;
}

interface VoiceDoneEvent {
  status: 'completed' | 'abandoned' | 'failed' | 'timeout';
  answers: Record<string, { status: string; value: string }>;
}

interface VoiceQuestionEvent {
  id: string;
  text: string;
  index: number;
  total: number;
}

interface VoiceModeProps {
  /** "crop" or "animal" — already chosen by the user */
  category: 'crop' | 'animal';
  /** Questions already loaded by StepQuestionnaire (same ids) */
  questions: Question[];
  /** Called when voice session ends; fills typed answers then shows review */
  onVoiceComplete: (answers: AnswerEntry[]) => void;
  /** Called when user wants to switch back to typed mode */
  onSwitchToTyped: (partialAnswers: AnswerEntry[]) => void;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getAccessToken(): string {
  return localStorage.getItem('access_token') || '';
}

let _bubbleId = 0;
function uid() { return `b${++_bubbleId}`; }

// ─── Component ────────────────────────────────────────────────────────────────
export default function VoiceMode({
  category,
  questions,
  onVoiceComplete,
  onSwitchToTyped,
}: VoiceModeProps) {
  const [voiceState, setVoiceState] = useState<VoiceState>('idle');
  const [bubbles, setBubbles] = useState<ChatBubble[]>([]);
  const [micLevel, setMicLevel] = useState(0);
  const [progress, setProgress] = useState<{ index: number; total: number } | null>(null);
  const [ttsFailed, setTtsFailed] = useState<string | null>(null);
  const [confirmStop, setConfirmStop] = useState(false);
  const [clientError, setClientError] = useState<{ code: string; message: string } | null>(null);

  // Accumulated answers from answer_saved events
  const savedAnswers = useRef<Record<string, VoiceAnswerSaved>>({});
  const clientRef = useRef<ReturnType<typeof createVoiceClient> | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const isActive = voiceState !== 'idle' && voiceState !== 'done' && voiceState !== 'error';

  // Auto-scroll chat
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [bubbles]);

  // Stop session on tab hide (mobile audio suspend)
  useEffect(() => {
    const handler = () => {
      if (document.hidden && isActive && clientRef.current) {
        clientRef.current.stop();
        addSystemBubble('Session paused — the tab went to the background. You can continue by typing.');
        switchToTypedWithPartial();
      }
    };
    document.addEventListener('visibilitychange', handler);
    return () => document.removeEventListener('visibilitychange', handler);
  }, [isActive]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Bubble helpers ───────────────────────────────────────────────────────
  function addBubble(role: ChatBubble['role'], text: string, isFinal = true): string {
    const id = uid();
    setBubbles(prev => [...prev, { id, role, text, isFinal }]);
    return id;
  }

  function addSystemBubble(text: string) {
    setBubbles(prev => [...prev, { id: uid(), role: 'agent', text, isFinal: true }]);
  }

  // ── Answer conversion ────────────────────────────────────────────────────
  function buildAnswerEntries(): AnswerEntry[] {
    const entries: AnswerEntry[] = [];
    for (const q of questions) {
      const saved = savedAnswers.current[q.id];
      if (
        saved &&
        saved.status === 'answered' &&
        saved.value &&
        saved.value.trim()
      ) {
        entries.push({ question_id: q.id, answer: saved.value });
      }
    }
    return entries;
  }

  function switchToTypedWithPartial() {
    onSwitchToTyped(buildAnswerEntries());
  }

  // ── Event handler ────────────────────────────────────────────────────────
  const handleEvent = useCallback((ev: Record<string, unknown>) => {
    const type = ev.type as string;

    if (type === 'question') {
      const q = ev as unknown as VoiceQuestionEvent;
      setProgress({ index: q.index, total: q.total });
    }

    if (type === 'agent_text') {
      addBubble('agent', ev.text as string);
    }

    if (type === 'transcript') {
      const text = (ev.text as string) || '';
      const isFinal = Boolean(ev.final);
      if (text) addBubble('user', text, isFinal);
    }

    if (type === 'answer_saved') {
      const a = ev as unknown as VoiceAnswerSaved;
      savedAnswers.current[a.question_id] = a;
    }

    if (type === 'tts_failed') {
      setTtsFailed(ev.text as string);
    }

    if (type === 'done') {
      const d = ev as unknown as VoiceDoneEvent;
      if (d.status === 'completed' || d.status === 'abandoned') {
        // Merge done.answers into savedAnswers for completeness
        for (const [qid, val] of Object.entries(d.answers || {})) {
          savedAnswers.current[qid] = { question_id: qid, ...val } as VoiceAnswerSaved;
        }
        addSystemBubble('✓ Voice consultation completed! Proceeding to report creation...');
        setTimeout(() => {
          onVoiceComplete(buildAnswerEntries());
        }, 1200);
      } else {
        // failed / timeout — fall back to typed with partial
        addSystemBubble(
          d.status === 'timeout'
            ? 'Session timed out. Your answers so far have been saved — you can continue by typing.'
            : 'Something went wrong. Your answers so far have been saved — you can continue by typing.',
        );
        setVoiceState('error');
      }
    }

    if (type === 'error') {
      const code = ev.code as string;
      addSystemBubble(`Error (${code}). Your answers have been saved — continue by typing.`);
      setVoiceState('error');
    }

    if (type === 'client_error') {
      const code = ev.code as string;
      const message = ev.message as string;
      setClientError({ code, message });
      setVoiceState('error');
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Start / stop ─────────────────────────────────────────────────────────
  function startVoice() {
    if (isActive) return;
    savedAnswers.current = {};
    setBubbles([]);
    setClientError(null);
    setTtsFailed(null);
    setProgress(null);
    setConfirmStop(false);

    const client = createVoiceClient({
      apiBase: API_BASE,
      getAccessToken,
      category,
      language: VOICE_LANGUAGE,
      onState: (s: string) => setVoiceState(s as VoiceState),
      onEvent: handleEvent,
      onLevel: (l: number) => setMicLevel(l),
    });
    clientRef.current = client;
    client.start();
  }

  function handleStop() {
    if (!isActive) return;
    if (!confirmStop) {
      setConfirmStop(true);
      return;
    }
    clientRef.current?.stop();
    setConfirmStop(false);
    switchToTypedWithPartial();
  }

  // ── Render ────────────────────────────────────────────────────────────────
  if (voiceState === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center py-6 px-4 max-w-lg mx-auto text-center">
        {/* Animated Microphone Hero */}
        <div className="relative mb-6">
          <div className="absolute inset-0 rounded-full bg-emerald-400/20 animate-ping" style={{ animationDuration: '3s' }} />
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center shadow-xl shadow-emerald-500/30 relative">
            <Mic size={42} className="text-white" />
          </div>
          <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-amber-400 border-2 border-white flex items-center justify-center shadow-sm">
            <Sparkles size={16} className="text-amber-900" />
          </div>
        </div>

        <div className="space-y-2 mb-6">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
            <Headphones size={13} />
            Mandatory Voice Consultation • आवाज़ से सलाह
          </span>
          <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
            AI Voice Consultation
          </h2>
          <p className="text-sm text-slate-600 max-w-md" style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif" }}>
            हमारा AI विशेषज्ञ आपसे आपके {category === 'crop' ? 'फसल' : 'पशु'} के लक्षणों के बारे में हिंदी में सवाल पूछेगा।
          </p>
        </div>

        {/* Feature Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full mb-8 text-left">
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5">
            <Volume2 size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800">Hindi Audio</p>
              <p className="text-[11px] text-slate-500">Agent speaks questions out loud</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5">
            <Mic size={18} className="text-teal-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800">Speak Answers</p>
              <p className="text-[11px] text-slate-500">Reply naturally into microphone</p>
            </div>
          </div>
          <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3 flex items-start gap-2.5">
            <MessageSquare size={18} className="text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-bold text-slate-800">Fast Diagnosis</p>
              <p className="text-[11px] text-slate-500">Takes 1-2 minutes to complete</p>
            </div>
          </div>
        </div>

        {/* Start Voice Button */}
        <button
          onClick={startVoice}
          className="w-full sm:w-auto px-8 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700 text-white font-bold rounded-2xl shadow-xl shadow-emerald-600/30 hover:shadow-2xl hover:shadow-emerald-600/40 active:scale-95 transition-all duration-200 flex items-center justify-center gap-3 text-base min-h-[56px] group"
        >
          <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center group-hover:scale-110 transition-transform">
            <Mic size={18} className="text-white" />
          </div>
          <span style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif" }}>
            Start Voice Consultation (बोलना शुरू करें)
          </span>
        </button>

        <p className="text-xs text-slate-400 mt-4">
          Requires microphone permission • served in Hindi
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 min-h-[480px]">
      {/* ── Header: State indicator + progress ─── */}
      <div className="flex items-center justify-between gap-3 px-1">
        <StateIndicator state={voiceState} />
        {progress && (
          <span className="text-xs text-slate-400 font-medium shrink-0">
            {progress.index} / {progress.total}
          </span>
        )}
      </div>

      {/* ── Progress bar ─── */}
      {progress && (
        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full"
            initial={false}
            animate={{ width: `${(progress.index / progress.total) * 100}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
      )}

      {/* ── TTS failed banner ─── */}
      {ttsFailed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-sm text-amber-800 flex items-start gap-2">
          <AlertTriangle size={16} className="shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Audio failed — </span>
            {ttsFailed}
          </div>
        </div>
      )}

      {/* ── Client error banner ─── */}
      {clientError && (
        <ClientErrorBanner
          code={clientError.code}
          message={clientError.message}
          onSwitchToTyped={() => onSwitchToTyped(buildAnswerEntries())}
        />
      )}

      {/* ── Chat bubbles ─── */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto flex flex-col gap-3 py-2 px-1 max-h-72 scroll-smooth"
        style={{ fontFamily: "'Noto Sans Devanagari', 'Inter', sans-serif" }}
      >
        <AnimatePresence initial={false}>
          {bubbles.map(b => (
            <motion.div
              key={b.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`flex ${b.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm leading-relaxed ${
                  b.role === 'agent'
                    ? 'bg-emerald-50 border border-emerald-100 text-slate-700 rounded-tl-sm'
                    : 'bg-slate-800 text-white rounded-tr-sm'
                } ${!b.isFinal && b.role === 'user' ? 'opacity-60 italic' : ''}`}
              >
                {b.text}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {bubbles.length === 0 && (
          <div className="flex-1 flex items-center justify-center text-slate-400 text-sm">
            Connecting to voice session…
          </div>
        )}
      </div>

      {/* ── Mic level visualiser (listening only) ─── */}
      <AnimatePresence>
        {voiceState === 'listening' && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex flex-col items-center gap-2 py-2"
          >
            <MicLevelBars level={micLevel} />
            <span className="text-xs text-emerald-600 font-medium animate-pulse">Speak now</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Bottom controls ─── */}
      <div className="flex items-center gap-3 pt-2">
        {/* Stop button */}
        {confirmStop ? (
          <div className="flex gap-2 flex-1">
            <button
              onClick={() => setConfirmStop(false)}
              className="flex-1 px-4 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition-colors min-h-[52px]"
            >
              Cancel
            </button>
            <button
              onClick={handleStop}
              className="flex-1 px-4 py-3 rounded-xl bg-red-500 text-white font-semibold text-sm hover:bg-red-600 transition-colors min-h-[52px]"
            >
              Stop & switch to typing
            </button>
          </div>
        ) : (
          <>
            <button
              onClick={handleStop}
              disabled={!isActive}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-red-200 text-red-600 font-medium text-sm hover:bg-red-50 transition-colors disabled:opacity-40 min-h-[52px]"
            >
              <StopCircle size={17} />
              Stop
            </button>

            {/* "Done speaking" — hidden behind flag */}
            {ENABLE_TAP_TO_SEND && voiceState === 'listening' && (
              <button
                onClick={() => clientRef.current?.sendEndOfSpeech()}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-emerald-600 text-white font-semibold text-sm hover:bg-emerald-700 transition-colors min-h-[52px]"
              >
                <CheckCircle size={17} />
                Done speaking
              </button>
            )}

            <button
              onClick={() => onSwitchToTyped(buildAnswerEntries())}
              className="flex items-center gap-2 px-4 py-3 rounded-xl border border-slate-200 text-slate-500 font-medium text-sm hover:bg-slate-50 transition-colors ml-auto min-h-[52px]"
            >
              <Keyboard size={15} />
              Type instead
            </button>
          </>
        )}
      </div>

      {/* Error fallback action */}
      {(voiceState === 'error') && !clientError && (
        <button
          onClick={() => onSwitchToTyped(buildAnswerEntries())}
          className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-900 transition-colors min-h-[52px]"
        >
          <Keyboard size={16} />
          Continue with typed answers
        </button>
      )}
    </div>
  );
}

// ─── State Indicator ─────────────────────────────────────────────────────────
function StateIndicator({ state }: { state: VoiceState }) {
  const configs: Record<VoiceState, { icon: React.ReactNode; label: string; color: string }> = {
    connecting:     { icon: <Loader2 size={16} className="animate-spin" />, label: 'Connecting…',     color: 'text-slate-500' },
    agent_speaking: { icon: <SpeakerWave />,                                label: 'Agent speaking',  color: 'text-emerald-600' },
    listening:      { icon: <Mic size={16} />,                              label: 'Speak now',       color: 'text-emerald-600' },
    thinking:       { icon: <Loader2 size={16} className="animate-spin" />, label: 'Processing…',    color: 'text-teal-500' },
    done:           { icon: <CheckCircle size={16} />,                      label: 'Done',            color: 'text-emerald-600' },
    error:          { icon: <X size={16} />,                                label: 'Session ended',  color: 'text-red-500' },
    idle:           { icon: <Mic size={16} />,                              label: '',                color: 'text-slate-400' },
  };

  const c = configs[state] || configs.idle;
  return (
    <div className={`flex items-center gap-2 text-sm font-medium ${c.color}`}>
      {c.icon}
      {c.label}
    </div>
  );
}


// ─── Animated speaker waves ───────────────────────────────────────────────────
function SpeakerWave() {
  return (
    <span className="flex items-end gap-0.5 h-4">
      {([0, 0.15, 0.3] as number[]).map((delay: number, i: number) => (
        <motion.span
          key={i}
          className="w-0.5 bg-emerald-500 rounded-full"
          animate={{ height: ['4px', '14px', '4px'] }}
          transition={{ duration: 0.7, delay, repeat: Infinity, ease: 'easeInOut' }}
        />
      ))}
      <Volume2 size={14} className="ml-1" />
    </span>
  );
}

// ─── Mic level bars ───────────────────────────────────────────────────────────
function MicLevelBars({ level }: { level: number }) {
  const bars = 7;
  return (
    <div className="flex items-end gap-1 h-8">
      {Array.from({ length: bars }, (_: unknown, i: number) => {
        const threshold = i / bars;
        const active = level > threshold;
        return (
          <motion.div
            key={i}
            className={`w-2 rounded-full transition-colors duration-75 ${
              active ? 'bg-emerald-500' : 'bg-slate-200'
            }`}
            animate={{ height: active ? `${20 + i * 4}px` : '8px' }}
            transition={{ duration: 0.1 }}
          />
        );
      })}
    </div>
  );
}

// ─── Client error banner ──────────────────────────────────────────────────────
function ClientErrorBanner({
  code,
  message: _message,
  onSwitchToTyped,
}: {
  code: string;
  message: string;
  onSwitchToTyped: () => void;
}) {
  const isMicDenied = code === 'mic_denied';
  return (
    <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm">
      <div className="flex items-start gap-2 mb-3">
        <MicOff size={16} className="text-red-500 shrink-0 mt-0.5" />
        <div className="text-red-800">
          {isMicDenied ? (
            <>
              <p className="font-semibold mb-1">Microphone access denied</p>
              <p>
                To use voice, allow microphone access in your browser settings
                (usually the padlock icon in the address bar), then refresh the page.
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold mb-1">Voice connection error ({code})</p>
              <p>Your answers so far have been saved. You can continue by typing.</p>
            </>
          )}
        </div>
      </div>
      <button
        onClick={onSwitchToTyped}
        className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 text-white font-semibold text-sm hover:bg-slate-900 transition-colors"
      >
        <Keyboard size={15} />
        {isMicDenied ? 'Switch to typed answers' : 'Continue with typed answers'}
      </button>
    </div>
  );
}

export { VoiceMode };
