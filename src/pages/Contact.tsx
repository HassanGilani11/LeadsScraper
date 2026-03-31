import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { Layers, ArrowLeft, Mail, MessageSquare, Send, Loader2 } from 'lucide-react';
import LandingFooter from '@/components/layout/LandingFooter';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import CustomSelect from '@/components/ui/CustomSelect';

const Contact = () => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [subject, setSubject] = useState('General Inquiry');

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setLoading(true);

        const formData = new FormData(e.currentTarget);
        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            subject: subject,
            message: formData.get('message'),
        };

        const form = e.currentTarget;
        try {
            console.log("Invoking contact-form function with data:", data);
            const { error, data: responseData } = await supabase.functions.invoke('contact-form', {
                body: data,
            });

            if (error) {
                console.error("Function invocation error:", error);
                throw error;
            }

            console.log("Function response:", responseData);
            toast.success("Message sent successfully! We'll get back to you soon.");
            form.reset();
        } catch (err: any) {
            console.error("Extended Error Details:", err);
            toast.error(err.message || "Failed to send message. Please try again later.");
        } finally {
            setLoading(false);
        }
    };

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
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row gap-16">
                        {/* Contact Info */}
                        <div className="flex-1 space-y-8">
                            <motion.div
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ duration: 0.5 }}
                            >
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 rounded-full border border-indigo-100 mb-8">
                                    <MessageSquare className="text-[#1b57b1]" size={16} />
                                    <span className="text-xs font-bold text-[#1b57b1] uppercase tracking-widest">Contact Us</span>
                                </div>
                                
                                <h1 className="text-4xl md:text-6xl font-black text-slate-900 tracking-tight leading-tight mb-6">
                                    Let's start a <br />
                                    <span className="text-[#1b57b1]">conversation.</span>
                                </h1>
                                <p className="text-lg text-slate-500 font-medium leading-relaxed mb-12">
                                    Have questions about our lead intelligence engine? Our team is here to help you scale your outreach.
                                </p>

                                <div className="space-y-6">
                                    <ContactMethod 
                                        icon={<Mail size={24} />}
                                        title="Email Support"
                                        detail="support@leadsscraper.ai"
                                        description="We'll respond within 24 hours."
                                        delay={0.1}
                                    />
                                    <ContactMethod 
                                        icon={<MessageSquare size={24} />}
                                        title="Live Chat"
                                        detail="Available 9am - 5pm EST"
                                        description="Instant support for pro users."
                                        delay={0.2}
                                    />
                                </div>
                            </motion.div>
                        </div>

                        {/* Contact Form */}
                        <div className="flex-1 relative">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                transition={{ duration: 0.5 }}
                                className="bg-white rounded-[2.5rem] p-8 md:p-12 border border-slate-200 shadow-xl shadow-slate-200/40 relative overflow-hidden"
                            >
                                <form onSubmit={handleSubmit} className="space-y-6">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Full Name</label>
                                            <input
                                                type="text"
                                                name="fullName"
                                                required
                                                placeholder="John Doe"
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#1b57b1]/20 focus:border-[#1b57b1] outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-sm font-bold text-slate-700 ml-1">Work Email</label>
                                            <input
                                                type="email"
                                                name="email"
                                                required
                                                placeholder="john@company.com"
                                                className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#1b57b1]/20 focus:border-[#1b57b1] outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium"
                                            />
                                        </div>
                                    </div>
                                    
                                    <div className="space-y-1.5 relative z-[20]">
                                        <label className="text-sm font-bold text-slate-700 ml-1">Subject</label>
                                        <CustomSelect
                                            value={subject}
                                            onChange={setSubject}
                                            options={[
                                                { label: 'General Inquiry', value: 'General Inquiry' },
                                                { label: 'Sales & Enterprise', value: 'Sales & Enterprise' },
                                                { label: 'Technical Support', value: 'Technical Support' },
                                                { label: 'Billing Question', value: 'Billing Question' }
                                            ]}
                                        />
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-sm font-bold text-slate-700 ml-1">Message</label>
                                        <textarea
                                            name="message"
                                            required
                                            rows={4}
                                            placeholder="How can we help you?"
                                            className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-2 focus:ring-[#1b57b1]/20 focus:border-[#1b57b1] outline-none transition-all text-slate-900 placeholder:text-slate-400 font-medium resize-none"
                                        ></textarea>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-[#1b57b1] text-white py-4 rounded-2xl font-black text-lg hover:bg-[#154690] transition-all shadow-xl shadow-[#1b57b1]/20 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2 group cursor-pointer"
                                    >
                                        {loading ? (
                                            <Loader2 className="animate-spin" size={24} />
                                        ) : (
                                            <>
                                                Send Message
                                                <Send size={20} className="group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                                            </>
                                        )}
                                    </button>
                                </form>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </main>

            <LandingFooter />
        </div>
    );
};

const ContactMethod = ({ icon, title, detail, description, delay = 0 }: any) => (
    <motion.div 
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay }}
        className="flex items-start gap-4 p-6 rounded-3xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-all group"
    >
        <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#1b57b1] flex items-center justify-center shrink-0 group-hover:bg-[#1b57b1] group-hover:text-white transition-all transform group-hover:-rotate-3">
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-slate-900 m-0">{title}</h4>
            <p className="text-[#1b57b1] font-black text-lg tracking-tight my-0.5">{detail}</p>
            <p className="text-sm text-slate-400 font-medium m-0">{description}</p>
        </div>
    </motion.div>
);

export default Contact;
