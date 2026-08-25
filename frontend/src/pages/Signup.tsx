import { motion } from 'framer-motion';
import { Leaf, Sprout, Stethoscope, FlaskConical } from 'lucide-react';
import { Link } from 'react-router-dom';
import SignupForm from '../components/auth/SignupForm';

const roles = [
  { icon: Sprout,      label: 'Farmer',             desc: 'Get AI diagnosis for your crops & animals' },
  { icon: Stethoscope, label: 'Veterinary Expert',  desc: 'Review livestock disease cases from farmers' },
  { icon: FlaskConical,label: 'Agrologist',          desc: 'Consult on crop diseases & treatments' },
];

export default function Signup() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 gradient-hero flex-col justify-between p-12 relative overflow-hidden">
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
        <div className="relative">
          <h2 className="text-4xl font-black text-white mb-4 leading-snug">
            Join the farming revolution
          </h2>
          <p className="text-emerald-100/70 text-base mb-8">
            Whether you&apos;re a farmer or an expert, KisanSeva connects you to smarter agriculture.
          </p>
          <div className="flex flex-col gap-4">
            {roles.map((r) => (
              <div
                key={r.label}
                className="flex items-start gap-3 bg-white/10 border border-white/15 rounded-xl p-4"
              >
                <div className="w-9 h-9 bg-emerald-500/30 border border-emerald-400/30 rounded-lg flex items-center justify-center shrink-0">
                  <r.icon size={18} className="text-emerald-200" />
                </div>
                <div>
                  <p className="text-white font-semibold text-sm">{r.label}</p>
                  <p className="text-emerald-100/60 text-xs mt-0.5">{r.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom stat */}
        <div className="glass-dark rounded-2xl p-5 text-center relative">
          <div className="text-4xl font-black text-white mb-1">10,000+</div>
          <div className="text-emerald-200/70 text-sm">Farmers already using KisanSeva</div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 bg-white overflow-y-auto">
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
            <h1 className="text-3xl font-black text-slate-900 mb-2">Create account</h1>
            <p className="text-slate-500 text-sm">
              Already have an account?{' '}
              <Link to="/login" className="text-emerald-600 font-semibold hover:text-emerald-700">
                Sign in
              </Link>
            </p>
          </div>
          <SignupForm />
        </motion.div>
      </div>
    </div>
  );
}
