import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Brain, Users, FileText, Camera, ClipboardList, Sparkles, FileCheck, ArrowRight, Leaf } from 'lucide-react';
import Navbar from '../components/layout/Navbar';

const Landing: React.FC = () => {
  const fadeIn = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } }
  };

  const staggerContainer = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2 }
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 font-inter font-sans">
      <Navbar />

      {/* Hero Section */}
      <section className="relative h-screen flex items-center justify-center pt-16 overflow-hidden">
        {/* Background Gradients & Elements */}
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900 via-emerald-800 to-teal-900 z-0" />
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] z-0" />
        
        {/* Floating elements */}
        <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
          <motion.div 
            animate={{ y: [0, -20, 0], rotate: [0, 5, 0] }} 
            transition={{ repeat: Infinity, duration: 5, ease: "easeInOut" }}
            className="absolute top-1/4 left-[10%] text-emerald-400/30"
          >
            <Leaf size={64} />
          </motion.div>
          <motion.div 
            animate={{ y: [0, 30, 0], rotate: [0, -10, 0] }} 
            transition={{ repeat: Infinity, duration: 7, ease: "easeInOut" }}
            className="absolute bottom-1/3 right-[15%] text-emerald-300/20"
          >
            <Leaf size={96} />
          </motion.div>
          <div className="absolute top-1/3 right-[20%] w-32 h-32 bg-emerald-500/20 rounded-full blur-3xl" />
          <div className="absolute bottom-1/4 left-[20%] w-48 h-48 bg-teal-400/20 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <motion.div
            initial="hidden"
            animate="visible"
            variants={staggerContainer}
            className="space-y-8"
          >
            <motion.div variants={fadeIn} className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-emerald-100 text-sm font-medium mb-4">
              <Sparkles size={16} />
              <span>Smart farming for a better tomorrow</span>
            </motion.div>

            <motion.h1 variants={fadeIn} className="text-5xl md:text-7xl font-extrabold text-white tracking-tight leading-tight">
              AI-Powered <br className="hidden md:block" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-300 to-teal-200">
                Agricultural Diagnosis
              </span>
            </motion.h1>

            <motion.p variants={fadeIn} className="max-w-2xl mx-auto text-lg md:text-xl text-emerald-50/80 leading-relaxed">
              Protect your crops and livestock with intelligent disease detection. Get expert-backed reports in minutes, tailored for farmers and agrologists.
            </motion.p>

            <motion.div variants={fadeIn} className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <Link 
                to="/signup" 
                className="w-full sm:w-auto px-8 py-4 bg-white text-emerald-900 rounded-full font-bold text-lg hover:bg-emerald-50 transition-all hover:scale-105 shadow-[0_0_40px_rgba(16,185,129,0.3)] flex items-center justify-center gap-2"
              >
                Get Started <ArrowRight size={20} />
              </Link>
              <button 
                onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
                className="w-full sm:w-auto px-8 py-4 bg-white/10 backdrop-blur-md text-white border border-white/20 rounded-full font-bold text-lg hover:bg-white/20 transition-all flex items-center justify-center"
              >
                Learn More
              </button>
            </motion.div>
          </motion.div>
        </div>
        
        {/* Curved bottom separator */}
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-50" style={{ clipPath: 'polygon(0 100%, 100% 100%, 100% 0, 0 100%)' }}></div>
        <div className="absolute bottom-0 left-0 right-0 h-16 bg-slate-50" style={{ clipPath: 'polygon(0 100%, 100% 100%, 0 0)' }}></div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-24 px-4 md:px-8 max-w-7xl mx-auto relative z-10">
        <div className="text-center mb-16">
          <motion.h2 
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
          >
            Powerful Features for Modern Farmers
          </motion.h2>
          <p className="text-slate-600 max-w-2xl mx-auto text-lg">
            Our platform combines cutting-edge AI with expert agricultural knowledge to bring you the best disease management tools.
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8">
          {[
            {
              icon: Brain,
              title: "AI Diagnosis",
              desc: "Upload images and get instant AI-powered disease identification for crops and livestock."
            },
            {
              icon: Users,
              title: "Expert Consultation",
              desc: "Connect with veterinary and agricultural experts for personalized advice and second opinions."
            },
            {
              icon: FileText,
              title: "Bilingual Reports",
              desc: "Receive detailed, easy-to-understand reports in both English and Hindi."
            }
          ].map((feature, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ delay: i * 0.2 }}
              className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/50 hover:-translate-y-2 transition-transform duration-300 border border-slate-100"
            >
              <div className="w-16 h-16 rounded-2xl bg-emerald-100 flex items-center justify-center text-emerald-600 mb-6">
                <feature.icon size={32} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 bg-white relative overflow-hidden border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="text-center mb-20">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-3xl md:text-4xl font-bold text-slate-900 mb-4"
            >
              How It Works
            </motion.h2>
            <p className="text-slate-600 text-lg">Simple steps to get expert insights</p>
          </div>

          <div className="relative">
            {/* Connecting line */}
            <div className="hidden md:block absolute top-1/2 left-0 right-0 h-1 bg-emerald-100 -translate-y-1/2 z-0"></div>
            
            <div className="grid md:grid-cols-4 gap-12 relative z-10">
              {[
                { icon: Camera, title: "Upload Image", step: "01" },
                { icon: ClipboardList, title: "Answer Questions", step: "02" },
                { icon: Sparkles, title: "AI Analysis", step: "03" },
                { icon: FileCheck, title: "Get Report", step: "04" }
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: i * 0.15 }}
                  className="flex flex-col items-center text-center"
                >
                  <div className="w-24 h-24 rounded-full bg-white border-4 border-emerald-50 shadow-xl flex items-center justify-center mb-6 relative group hover:border-emerald-200 transition-colors">
                    <div className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-emerald-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                      {item.step}
                    </div>
                    <item.icon size={40} className="text-emerald-500 group-hover:scale-110 transition-transform" />
                  </div>
                  <h3 className="text-lg font-bold text-slate-800">{item.title}</h3>
                </motion.div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500 to-teal-600 z-0"></div>
        <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/connected.png')] z-0"></div>
        
        <div className="max-w-4xl mx-auto px-4 relative z-10 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="bg-white/10 backdrop-blur-lg rounded-3xl p-12 border border-white/20 shadow-2xl"
          >
            <h2 className="text-4xl font-bold text-white mb-6">Ready to protect your farm?</h2>
            <p className="text-emerald-50 text-xl mb-10 max-w-2xl mx-auto">
              Join thousands of farmers using KisanSeva to safeguard their crops and livestock.
            </p>
            <Link 
              to="/signup" 
              className="inline-flex items-center gap-2 px-10 py-4 bg-white text-emerald-700 rounded-full font-bold text-lg hover:bg-emerald-50 transition-transform hover:scale-105 shadow-xl"
            >
              Sign Up Now <ArrowRight size={20} />
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-slate-900 text-slate-400 py-12">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2 text-white">
              <Leaf className="w-6 h-6 text-emerald-500" />
              <span className="text-2xl font-bold tracking-tight">KisanSeva</span>
            </div>
            <div className="text-sm">
              &copy; {new Date().getFullYear()} KisanSeva. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
