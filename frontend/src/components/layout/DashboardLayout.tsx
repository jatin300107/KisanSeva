import { useState } from 'react';
import { Menu, X } from 'lucide-react';
import type { ReactNode } from 'react';
import Sidebar from './Sidebar';
import { useLanguage } from '../../context/LanguageContext';

interface DashboardLayoutProps {
  children: ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const {
    languages, language, setLanguage, loading, voiceActive,
    hasStoredLanguage, dismissFirstUse,
  } = useLanguage();

  return (
    <div className="flex min-h-screen bg-slate-50">
      <aside className="hidden min-h-screen w-64 shrink-0 flex-col justify-between border-r border-slate-200 bg-white p-4 md:flex">
        <Sidebar />
      </aside>

      <main className="min-w-0 max-w-7xl flex-1 p-8">
        <div className="md:hidden">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="mb-5 inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            {sidebarOpen ? <X size={18} /> : <Menu size={18} />}
            {sidebarOpen ? 'Close menu' : 'Open menu'}
          </button>
          {sidebarOpen && (
            <aside className="mb-5 min-h-0 w-full border-b border-slate-200 bg-white pb-4">
              <Sidebar />
            </aside>
          )}
        </div>
        <div className="mb-5 flex items-center justify-end border-b border-slate-200/60 pb-4">
          {!loading && languages.length > 0 && (
            <label className="flex items-center gap-2 text-sm font-medium text-slate-600">
              <span>Language</span>
              <select
                value={language}
                disabled={voiceActive}
                onChange={(event) => setLanguage(event.target.value)}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 shadow-sm disabled:cursor-not-allowed disabled:opacity-60"
                aria-label="Voice language"
              >
                {languages.map((item) => (
                  <option key={item.code} value={item.code}>{item.label} ({item.name})</option>
                ))}
              </select>
            </label>
          )}
        </div>
        {children}
      </main>
      {!loading && languages.length > 0 && !hasStoredLanguage && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h2 className="text-xl font-bold text-slate-900">Choose your voice language</h2>
            <p className="mt-2 text-sm text-slate-600">
              This language will be used for voice questions and report summaries.
            </p>
            <select
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
              className="mt-5 w-full rounded-xl border border-slate-200 px-3 py-3 text-sm"
              aria-label="Choose voice language"
            >
              {languages.map((item) => (
                <option key={item.code} value={item.code}>{item.label} ({item.name})</option>
              ))}
            </select>
            <button
              onClick={dismissFirstUse}
              className="mt-5 w-full rounded-xl bg-emerald-600 px-4 py-3 font-semibold text-white hover:bg-emerald-700"
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
