import { useRef } from 'react';
import { motion, useInView } from 'framer-motion';
import {
  Leaf, Brain, Camera, Users, Globe, Shield, Clock,
  ArrowRight, ChevronDown, Sparkles, CheckCircle2,
  FileText, Zap,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import Navbar from '../components/layout/Navbar';

const features = [
  { icon: Brain,   title: 'AI-Powered Diagnosis', desc: 'Upload images and get instant disease identification using our trained agricultural AI model.', color: 'emerald' },
  { icon: Camera,  title: 'Photo Analysis',       desc: 'Simply photograph your crop or animal — no special equipment or expertise needed.', color: 'teal' },
  { icon: Users,   title: 'Expert Network',       desc: 'Connect directly with certified veterinarians and agrologists for deeper consultation.', color: 'blue' },
  { icon: Globe,   title: 'Bilingual Reports',    desc: 'Receive full diagnosis reports in both English and Hindi for wider accessibility.', color: 'violet' },
  { icon: Shield,  title: '95% Accuracy',         desc: 'Our model is trained on thousands of validated disease cases from agricultural experts.', color: 'amber' },
  { icon: Clock,   title: '2-Min Reports',        desc: 'Get comprehensive AI-backed diagnosis reports in under 2 minutes.', color: 'rose' },
];

const steps = [
  { icon: Camera,       label: 'Capture',  desc: 'Take a clear photo of the affected crop or animal' },
  { icon: FileText,     label: 'Describe', desc: 'Answer a few targeted diagnostic questions' },
  { icon: Brain,        label: 'Analyze',  desc: 'Our AI processes and cross-references the disease database' },
  { icon: CheckCircle2, label: 'Report',   desc: 'Receive a detailed bilingual diagnosis and treatment plan' },
];

const stats = [
  { value: '95%',  label: 'Diagnosis Accuracy' },
  { value: '2 min', label: 'Avg. Report Time' },
  { value: '500+', label: 'Verified Experts' },
  { value: '10K+', label: 'Farmers Helped' },
];

const iconColorMap: Record<string, string> = {
  emerald: 'bg-emerald-100 text-emerald-700',
  teal:    'bg-teal-100 text-teal-700',
  blue:    'bg-blue-100 text-blue-700',
  violet:  'bg-violet-100 text-violet-700',
  amber:   'bg-amber-100 text-amber-700',
  rose:    'bg-rose-100 text-rose-700',
};

function FadeInSection({ children }: { children: React.ReactNode }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-80px' });
  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 40 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.6 }}
    >
      {children}
    </motion.div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Hero ── */}
      <section className="gradient-hero min-h-screen flex flex-col items-center justify-center text-center px-4 pt-24 pb-20 relative overflow-hidden">
        {/* Decorative blobs */}
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl pointer-events-none" />
        {/* Floating leaves */}
        <span className="absolute top-32 left-24 text-emerald-400/30 animate-float pointer-events-none"><Leaf size={36} /></span>
        <span className="absolute top-52 right-32 text-teal-300/25 animate-float-delayed pointer-events-none"><Leaf size={26} /></span>
        <span className="absolute bottom-36 left-36 text-emerald-300/15 animate-float-slow pointer-events-none"><Leaf size={52} /></span>

        {/* Badge */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-sm font-medium px-4 py-2 rounded-full mb-8"
        >
          <Sparkles size={14} />
          Trusted by 10,000+ farmers across India
        </motion.div>

        {/* Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.1 }}
          className="text-5xl md:text-7xl font-black text-white leading-tight mb-6 max-w-4xl"
        >
          Diagnose Crop &amp; Livestock
          <br />
          <span className="gradient-text">Diseases with AI</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="text-emerald-100/75 text-lg md:text-xl max-w-2xl mb-10 leading-relaxed"
        >
          Upload a photo, answer a few questions, and receive an expert-backed diagnosis in minutes.
          Protect your harvest before it&apos;s too late.
        </motion.p>

        {/* CTA buttons */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.3 }}
          className="flex flex-col sm:flex-row gap-4 mb-16"
        >
          <Link
            to="/signup"
            className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-8 py-4 rounded-xl hover:bg-emerald-50 transition-colors shadow-xl"
          >
            Start Free Diagnosis <ArrowRight size={18} />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-2 border border-emerald-400/40 text-white font-semibold px-8 py-4 rounded-xl hover:bg-white/10 transition-colors"
          >
            See How It Works <ChevronDown size={18} />
          </a>
        </motion.div>

        {/* Stats strip */}
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.45 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 bg-white/10 backdrop-blur-sm border border-white/20 rounded-2xl px-8 py-5"
        >
          {stats.map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-3xl font-black text-white">{s.value}</div>
              <div className="text-emerald-200/65 text-xs mt-1">{s.label}</div>
            </div>
          ))}
        </motion.div>
      </section>

      {/* ── Features ── */}
      <section id="features" className="py-24 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-16">
              <span className="text-emerald-600 font-semibold text-sm uppercase tracking-widest">Features</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mt-3 mb-4">
                Everything to protect your harvest
              </h2>
              <p className="text-slate-500 text-lg max-w-xl mx-auto">
                Powerful tools built for modern Indian farmers and agricultural experts.
              </p>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-white rounded-2xl p-6 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-1 transition-all duration-300"
              >
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-4 ${iconColorMap[f.color]}`}>
                  <f.icon size={22} />
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{f.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{f.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-24 px-4 bg-emerald-50/60">
        <div className="max-w-5xl mx-auto">
          <FadeInSection>
            <div className="text-center mb-16">
              <span className="text-emerald-600 font-semibold text-sm uppercase tracking-widest">Process</span>
              <h2 className="text-4xl md:text-5xl font-black text-slate-900 mt-3 mb-4">How It Works</h2>
              <p className="text-slate-500 text-lg max-w-xl mx-auto">
                Four simple steps to get an AI-powered diagnosis for your farm.
              </p>
            </div>
          </FadeInSection>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 relative">
            {steps.map((s, i) => (
              <motion.div
                key={s.label}
                initial={{ opacity: 0, y: 28 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.15, duration: 0.5 }}
                className="relative text-center"
              >
                <div className="w-16 h-16 bg-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-lg shadow-emerald-600/25">
                  <s.icon size={26} />
                </div>
                <div className="absolute -top-3 -left-1 w-7 h-7 bg-white rounded-full border-2 border-emerald-500 flex items-center justify-center text-emerald-600 font-black text-xs shadow-sm">
                  {i + 1}
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-2">{s.label}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="gradient-hero py-28 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="w-16 h-16 bg-emerald-400/20 border border-emerald-300/30 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <Zap size={28} className="text-emerald-300" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-6">
              Ready to protect your farm?
            </h2>
            <p className="text-emerald-100/70 text-lg mb-10">
              Join thousands of farmers using AI to safeguard their livelihood.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 bg-white text-emerald-700 font-bold px-9 py-4 rounded-xl hover:bg-emerald-50 transition-colors shadow-xl"
              >
                Create Free Account <ArrowRight size={18} />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center gap-2 border border-emerald-400/40 text-white font-semibold px-9 py-4 rounded-xl hover:bg-white/10 transition-colors"
              >
                Sign In
              </Link>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="bg-slate-900 py-10 px-4">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-white font-black text-xl">
            <div className="w-8 h-8 bg-emerald-500 rounded-lg flex items-center justify-center">
              <Leaf size={16} className="text-white" />
            </div>
            KisanSeva
          </div>
          <p className="text-slate-400 text-sm">
            © {new Date().getFullYear()} KisanSeva. Built with ❤️ for Indian farmers.
          </p>
          <div className="flex gap-6">
            <Link to="/login" className="text-slate-400 hover:text-white text-sm transition-colors">Login</Link>
            <Link to="/signup" className="text-slate-400 hover:text-white text-sm transition-colors">Sign Up</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
