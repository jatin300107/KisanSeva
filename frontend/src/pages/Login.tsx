import { motion } from 'framer-motion';
import { Leaf, Brain, Users, Globe, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import LoginForm from '../components/auth/LoginForm';

const benefits = [
  { icon: Brain,        label: 'Instant AI crop & livestock diagnosis' },
  { icon: Users,        label: 'Request a consultation when needed' },
  { icon: Globe,        label: 'Bilingual reports in English & Hindi' },
  { icon: CheckCircle2, label: 'Review your diagnosis and observations in one place' },
];

export default function Login() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 lg:max-w-[720px] gradient-hero flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        <div className="absolute top-16 right-16 w-72 h-72 bg-emerald-400/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-16 left-8 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />

        {/* Logo */}
        <div className="flex items-center gap-3 relative">
          <div className="w-10 h-10 bg-white/20 backdrop-blur-sm border border-white/30 rounded-xl flex items-center justify-center">
            <Leaf size={20} className="text-emerald-300" />
          </div>
          <span className="font-black text-2xl text-white">KisanSeva</span>
        </div>

        {/* Main content */}
        <div className="relative min-w-0 max-w-xl">
          <h2 className="max-w-lg text-4xl font-black text-white mb-4 leading-snug break-words">
            Protect your farm with the power of AI
          </h2>
          <p className="max-w-md text-emerald-100/70 text-base leading-6 mb-8 break-words">
            India&apos;s most trusted agricultural diagnosis platform.
          </p>
          <div className="flex flex-col gap-3">
            {benefits.map((b) => (
              <div key={b.label} className="flex min-w-0 items-start gap-3">
                <div className="w-7 h-7 bg-emerald-500/30 border border-emerald-400/30 rounded-lg flex items-center justify-center shrink-0">
                  <b.icon size={14} className="text-emerald-200" />
                </div>
                <span className="min-w-0 max-w-md text-emerald-100/80 text-sm leading-5 break-words">{b.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative max-w-md text-emerald-100/60 text-sm leading-5 break-words">
          Keep your crop and livestock observations organized in one workspace.
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white">
        {/* Mobile logo */}
        <div className="lg:hidden flex items-center gap-2 mb-8">
          <div className="w-9 h-9 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center">
            <Leaf size={18} className="text-white" />
          </div>
          <span className="font-black text-xl text-slate-800">KisanSeva</span>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-sm"
        >
          <div className="mb-8">
            <h1 className="text-3xl font-black text-slate-900 mb-2">Welcome back</h1>
            <p className="text-slate-500 text-sm">
              Don&apos;t have an account?{' '}
              <Link to="/signup" className="text-emerald-600 font-semibold hover:text-emerald-700">
                Sign up free
              </Link>
            </p>
          </div>
          <LoginForm />
        </motion.div>
      </div>
    </div>
  );
}
