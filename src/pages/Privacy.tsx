import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowLeft, Shield } from 'lucide-react';
import LandingFooter from '@/components/layout/LandingFooter';

const Privacy = () => {
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
                        <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 rounded-full border border-blue-100 mb-8">
                            <Shield className="text-[#1b57b1]" size={16} />
                            <span className="text-xs font-bold text-[#1b57b1] uppercase tracking-widest">Privacy Policy</span>
                        </div>
                        
                        <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-8">
                            Your privacy is our <br />
                            <span className="text-[#1b57b1]">top priority.</span>
                        </h1>

                        <div className="prose prose-slate prose-lg max-w-none">
                            <p className="text-lg text-slate-600 font-medium leading-relaxed mb-8">
                                Last updated: March 27, 2026
                            </p>

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-900 mb-4">1. Information We Collect</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    We collect information you provide directly to us when you create an account, use our scraper tools, or communicate with us. This may include your name, email address, company information, and payment details.
                                </p>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-900 mb-4">2. How We Use Your Information</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    We use the information we collect to provide, maintain, and improve our services, process transactions, send technical notices, and respond to your comments and questions.
                                </p>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-900 mb-4">3. Data Security</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    We take reasonable measures to help protect information about you from loss, theft, misuse, and unauthorized access, disclosure, alteration, and destruction.
                                </p>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-900 mb-4">4. Sharing of Information</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    We do not share your personal data with third parties except as described in this policy, such as with your consent or to comply with legal obligations.
                                </p>
                            </section>

                            <section className="mb-12">
                                <h2 className="text-2xl font-bold text-slate-900 mb-4">5. Contact Us</h2>
                                <p className="text-slate-600 leading-relaxed">
                                    If you have any questions about this Privacy Policy, please contact us at privacy@leadsscraper.ai.
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

export default Privacy;
