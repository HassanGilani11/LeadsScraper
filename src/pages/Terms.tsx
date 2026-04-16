import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowLeft, FileText } from 'lucide-react';
import LandingFooter from '@/components/layout/LandingFooter';

const Terms = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-[#1b57b1]/20 selection:text-[#1b57b1]">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 bg-[#1b57b1] rounded-xl flex items-center justify-center shadow-lg shadow-[#1b57b1]/20">
                                <Layers className="text-white" size={24} />
                            </div>
                            <span className="text-2xl font-black tracking-tight text-slate-900">Leads<span className="text-[#1b57b1]">Scraper</span></span>
                        </div>
                        <button 
                            onClick={() => navigate('/')}
                            className="flex items-center gap-2 text-sm font-bold text-slate-600 hover:text-[#1b57b1] transition-colors cursor-pointer"
                        >
                            <ArrowLeft size={18} />
                            Back to Home
                        </button>
                    </div>
                </div>
            </nav>

            <main className="pt-32 pb-20">
                <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-full border border-slate-200 mb-8">
                            <FileText className="text-slate-600" size={16} />
                            <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Terms of Service</span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-8">
                            Terms and <br />
                            <span className="text-[#1b57b1]">Conditions.</span>
                        </h1>

                        <div className="prose prose-slate prose-lg max-w-none">
                            <p className="text-lg text-slate-600 font-medium leading-relaxed mb-8">
                                Last updated: March 27, 2026
                            </p>

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Acceptance of Terms</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    By accessing or using SyntexDev, you agree to be bound by these Terms of Service. If you do not agree to all of these terms, do not access or use the services.
                                </p>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-900 mb-4">2. Use of Services</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    You are responsible for your use of the services and for any content you provide, including compliance with applicable laws, rules, and regulations. You must not use our services for any illegal or unauthorized purpose.
                                </p>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Account Registration</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    You must provide accurate and complete information when you create an account. You are responsible for keeping your account password secure.
                                </p>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Intellectual Property</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    SyntexDev and its original content, features, and functionality are and will remain the exclusive property of SyntexDev and its licensors.
                                </p>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Limitation of Liability</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    In no event shall SyntexDev, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential, or punitive damages.
                                </p>
                            </section>
                        </div>
                    </motion.div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
};

export default Terms;
