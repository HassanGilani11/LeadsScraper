import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    ChevronRight, 
    Layers, 
    Search, 
    Shield, 
    Zap, 
    BarChart3, 
    Database,
    CheckCircle2,
    ArrowRight,
    SearchCode,
    Globe,
    Linkedin,
    Map,
    XCircle,
    CheckCircle,
    Mail,
    FileText,
    Activity,
    FileSearch,
    HeartPulse,
    ShieldCheck,
    ArrowLeft
} from 'lucide-react';
import LandingFooter from '@/components/layout/LandingFooter';

const LandingPage = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-[#1b57b1]/20 selection:text-[#1b57b1]">
            {/* Navbar */}
            <nav className="fixed top-0 w-full z-50 bg-white/70 backdrop-blur-xl border-b border-slate-200/50">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between items-center h-20">
                        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                            <div className="w-10 h-10 bg-[#1b57b1] rounded-xl flex items-center justify-center shadow-lg shadow-[#1b57b1]/20">
                                <Layers className="text-white" size={24} />
                            </div>
                            <span className="text-2xl font-black tracking-tight text-slate-900">Leads<span className="text-[#1b57b1]">Scraper</span></span>
                        </div>
                        <div className="hidden md:flex items-center gap-10">
                            <a href="#features" className="text-sm font-bold text-slate-600 hover:text-[#1b57b1] transition-colors cursor-pointer">Features</a>
                            <a href="#solutions" className="text-sm font-bold text-slate-600 hover:text-[#1b57b1] transition-colors cursor-pointer">Solutions</a>
                            <a href="#compare" className="text-sm font-bold text-slate-600 hover:text-[#1b57b1] transition-colors cursor-pointer">Why Us</a>
                            <a href="#pricing" className="text-sm font-bold text-slate-600 hover:text-[#1b57b1] transition-colors cursor-pointer">Pricing</a>
                        </div>
                        <div className="flex items-center gap-4">
                            <button 
                                onClick={() => navigate('/auth')}
                                className="text-sm font-bold text-slate-600 hover:text-slate-900 transition-colors cursor-pointer"
                            >
                                Log In
                            </button>
                            <button 
                                onClick={() => navigate('/auth')}
                                className="bg-[#1b57b1] text-white px-6 py-2.5 rounded-xl text-sm font-bold hover:bg-[#154690] transition-all shadow-lg shadow-[#1b57b1]/20 active:scale-95 cursor-pointer"
                            >
                                Get Started
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 lg:pt-48 lg:pb-32 overflow-hidden">
                {/* Background Blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full -z-10 opacity-30 pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-[#1b57b1]/20 blur-[120px] rounded-full animate-pulse"></div>
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-indigo-500/10 blur-[120px] rounded-full animate-pulse" style={{ animationDelay: '2s' }}></div>
                </div>

                <motion.div 
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative text-center"
                >
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.2 }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full border border-slate-200 shadow-sm mb-8"
                    >
                        <span className="flex h-2 w-2 rounded-full bg-[#1b57b1] animate-pulse"></span>
                        <span className="text-xs font-bold text-slate-600 uppercase tracking-widest">Powered by Advanced Extraction Engines</span>
                    </motion.div>
                    
                    <motion.h1 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.3 }}
                        className="text-5xl md:text-7xl lg:text-8xl font-black text-slate-900 tracking-tight leading-[1.05] mb-8"
                    >
                        Lead Intelligence <br />
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#1b57b1] to-indigo-600">& Health Auditing.</span>
                    </motion.h1>
                    
                    <motion.p 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.5 }}
                        className="max-w-2xl mx-auto text-lg md:text-xl text-slate-500 font-medium mb-12 leading-relaxed"
                    >
                        Leads Scraper v3 goes beyond simple extraction. Perform instant **Website Health Audits**, generate **White-Label PDF Reports**, and leverage AI-driven ICP scoring.
                    </motion.p>
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.7 }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                    >
                        <button 
                            onClick={() => navigate('/auth')}
                            className="w-full sm:w-auto px-8 py-4 bg-[#1b57b1] text-white rounded-2xl text-lg font-bold hover:bg-[#154690] transition-all shadow-2xl shadow-[#1b57b1]/30 flex items-center justify-center gap-2 group hover:-translate-y-1 cursor-pointer"
                        >
                            Start Free Trial
                            <ChevronRight size={20} className="group-hover:translate-x-1 transition-transform" />
                        </button>
                    </motion.div>
                </motion.div>

                    {/* Dashboard Preview Mockup */}
                    <motion.div 
                        initial={{ opacity: 0, y: 50 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        transition={{ duration: 1, delay: 0.5 }}
                        className="mt-20 relative"
                    >
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-50 to-transparent z-10 h-40 bottom-0 top-auto"></div>
                        <div className="bg-white p-2 rounded-[2rem] border border-slate-200 shadow-[0_32px_64px_-16px_rgba(0,0,0,0.1)] overflow-hidden max-w-5xl mx-auto">
                            <div className="rounded-[1.5rem] overflow-hidden border border-slate-100 aspect-[16/9] bg-slate-50 flex items-center justify-center">
                                {/* Visual Mockup Placeholder */}
                                <div className="p-8 w-full h-full flex flex-col gap-6 opacity-40 grayscale group-hover:grayscale-0 transition-all duration-700">
                                    <div className="flex justify-between items-center bg-white p-6 rounded-2xl shadow-sm border border-slate-100">
                                        <div className="flex gap-4">
                                            <div className="w-12 h-12 rounded-xl bg-slate-100"></div>
                                            <div className="space-y-2">
                                                <div className="w-32 h-4 bg-slate-200 rounded-full"></div>
                                                <div className="w-20 h-2 bg-slate-100 rounded-full"></div>
                                            </div>
                                        </div>
                                        <div className="w-24 h-8 bg-[#1b57b1]/10 rounded-lg"></div>
                                    </div>
                                    <div className="grid grid-cols-3 gap-6 flex-1">
                                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-blue-50"></div>
                                            <div className="w-full h-4 bg-slate-100 rounded-full"></div>
                                            <div className="w-24 h-4 bg-slate-200 rounded-full"></div>
                                        </div>
                                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-indigo-50"></div>
                                            <div className="w-full h-4 bg-slate-100 rounded-full"></div>
                                            <div className="w-24 h-4 bg-slate-200 rounded-full"></div>
                                        </div>
                                        <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-6 flex flex-col gap-4">
                                            <div className="w-8 h-8 rounded-lg bg-green-50"></div>
                                            <div className="w-full h-4 bg-slate-100 rounded-full"></div>
                                            <div className="w-24 h-4 bg-slate-200 rounded-full"></div>
                                        </div>
                                    </div>
                                </div>
                                <div className="absolute inset-0 flex items-center justify-center z-20">
                                     <div className="bg-white/80 backdrop-blur-md px-6 py-3 rounded-full border border-white shadow-xl flex items-center gap-3">
                                         <div className="size-8 bg-[#1b57b1] rounded-full flex items-center justify-center">
                                             <Shield className="text-white" size={16} />
                                         </div>
                                         <span className="font-bold text-slate-800 tracking-tight">AI-Verified Accuracy: 99.8%</span>
                                     </div>
                                </div>
                            </div>
                        </div>
                </motion.div>
            </section>

            {/* Social Proof */}
            <section className="pb-20">
                <motion.div 
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    viewport={{ once: true }}
                    className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center"
                >
                    <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400 mb-10">Trusted by modern sales teams at</p>
                    <div className="flex flex-wrap justify-center items-center gap-8 md:gap-16 opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
                        {['Velocity', 'CloudSync', 'Apex', 'NextGen', 'Stellar'].map((brand, i) => (
                            <motion.span 
                                key={brand} 
                                initial={{ opacity: 0, y: 10 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: i * 0.1 }}
                                className="text-2xl font-black text-slate-800 tracking-tighter italic"
                            >
                                {brand.toUpperCase()}
                            </motion.span>
                        ))}
                    </div>
                </motion.div>
            </section>

            {/* Features Section */}
            <section id="features" className="py-24 bg-white relative scroll-mt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="text-center max-w-3xl mx-auto mb-20"
                    >
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
                            Everything you need to <br />
                            <span className="text-[#1b57b1]">scale your pipeline.</span>
                        </h2>
                        <p className="text-lg text-slate-500 font-medium leading-relaxed">
                            Stop wasting hours on manual research. Our automation toolkit does the heavy lifting while you focus on closing deals.
                        </p>
                    </motion.div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {[
                            { icon: <Zap />, title: "Smart Data Extraction", description: "Extract precise business data from any website or directory with one click using our high-performance extraction engine." },
                            { icon: <Shield />, title: "Website Health Audit", description: "Instantly diagnostic SSL status, Performance, and SEO health. Audit leads automatically during extraction." },
                            { icon: <FileText />, title: "Professional PDF Reports", description: "Generate beautiful, branded assessment reports for your leads with one click. Perfect for high-value outreach." },
                            { icon: <Linkedin />, title: "Social Discovery", description: "Automatically find LinkedIn profiles, Twitter handles, and Facebook pages for every extracted lead." },
                            { icon: <Activity />, title: "AI-Driven ICP Scoring", description: "Stop guessing. Our AI engine scores every lead from 1-100 based on your ideal customer profile and web health." },
                            { icon: <CheckCircle2 />, title: "Bulk & Auto-Auditing", description: "Process hundreds of leads at once or enable auto-auditing to enrich every new lead in the background." },
                            { icon: <SearchCode />, title: "Technographic Profiling", description: "Identify 50+ technology signatures including Shopify, Next.js, WordPress, and CRM stacks automatically." },
                            { icon: <ShieldCheck />, title: "Zero-Bounce Verification", description: "Leverage real-time email and data verification to ensure 100% deliverability for your outreach campaigns." },
                            { icon: <Globe />, title: "Global Map Extraction", description: "Scale your local targeting. Extract leads from Google Maps and local directories across 120+ countries." }
                        ].map((feature, i) => (
                            <FeatureCard key={i} {...feature} delay={i * 0.1} />
                        ))}
                    </div>
                </div>
            </section>

            {/* CTA Section */}
            <section className="py-24 bg-slate-900 relative overflow-hidden">
                <div className="absolute inset-0 opacity-10 pointer-events-none">
                    <div className="absolute top-[20%] left-[10%] w-[30%] h-[30%] bg-blue-500 blur-[100px] rounded-full"></div>
                    <div className="absolute bottom-[20%] right-[10%] w-[30%] h-[30%] bg-[#1b57b1] blur-[100px] rounded-full"></div>
                </div>
                <div className="max-w-4xl mx-auto px-4 text-center relative z-10">
                    <h2 className="text-4xl md:text-6xl font-black text-white tracking-tight mb-8">
                        Ready to supercharge <br /> your lead generation?
                    </h2>
                    <p className="text-xl text-slate-400 font-medium mb-12">
                        Join 2,000+ sales leaders using Leads Scraper to fuel their growth.
                    </p>
                    <button 
                        onClick={() => navigate('/auth')}
                        className="bg-[#1b57b1] text-white px-10 py-5 rounded-[1.5rem] text-xl font-black hover:bg-blue-600 transition-all shadow-2xl shadow-blue-500/20 active:scale-95 cursor-pointer"
                    >
                        Get Started for Free
                    </button>
                    <p className="mt-6 text-sm text-slate-500">No credit card required • 20 free credits • Instant access</p>
                </div>
            </section>

            {/* Solutions Section */}
            <section id="solutions" className="py-24 bg-white scroll-mt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex flex-col lg:flex-row items-center gap-16">
                        <div className="flex-1 space-y-8">
                            <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-tight">
                                One tool, endless <br />
                                <span className="text-[#1b57b1]">lead opportunities.</span>
                            </h2>
                            <p className="text-lg text-slate-600 font-medium leading-relaxed">
                                Whether you're targeting B2B companies on LinkedIn or local businesses on Google Maps, Leads Scraper provides the precision tools you need to build high-converting lists.
                            </p>
                            
                            <div className="space-y-4">
                                <SolutionItem 
                                    icon={<Database size={24} />}
                                    title="AI Lead Intelligence"
                                    description="Extract 25+ critical data points plus automated Website Health Audits and ICP scoring for every lead."
                                    delay={0.3}
                                />
                                <SolutionItem 
                                    icon={<FileSearch size={24} />}
                                    title="Automated Health Scanning"
                                    description="Instantly identify SSL/Security risks and Lighthouse Performance gaps. Know your lead's digital presence better than they do."
                                    delay={0.4}
                                />
                                <SolutionItem 
                                    icon={<Zap size={24} />}
                                    title="One-Click PDF Reports"
                                    description="Transform audit data into professional white-label reports. Pitch with confidence using real-time data visual insights."
                                    delay={0.5}
                                />
                            </div>
                        </div>
                        
                        <div className="flex-1 relative">
                            <div className="absolute inset-0 bg-blue-500/10 blur-[80px] rounded-full -z-10 animate-pulse"></div>
                            <div className="bg-slate-900 rounded-[2.5rem] p-4 shadow-2xl shadow-slate-900/20 transform hover:-rotate-2 transition-transform duration-500">
                                <div className="rounded-[1.8rem] overflow-hidden border border-slate-800 aspect-[4/3] bg-slate-950 flex items-center justify-center p-6 text-center">
                                    <div className="space-y-6 w-full">
                                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl animate-pulse">
                                            <div className="size-4 bg-blue-500 rounded-full"></div>
                                            <div className="h-2 w-32 bg-slate-700 rounded-full"></div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl animate-pulse delay-150">
                                            <div className="size-4 bg-emerald-500 rounded-full"></div>
                                            <div className="h-2 w-48 bg-slate-700 rounded-full"></div>
                                        </div>
                                        <div className="flex items-center gap-3 bg-white/5 border border-white/10 p-3 rounded-xl animate-pulse delay-300">
                                            <div className="size-4 bg-indigo-500 rounded-full"></div>
                                            <div className="h-2 w-24 bg-slate-700 rounded-full"></div>
                                        </div>
                                        <div className="pt-4">
                                            <p className="text-blue-400 font-mono text-xs uppercase tracking-widest mb-2 font-black">Success Rate</p>
                                            <p className="text-white text-5xl font-black tracking-tighter italic animate-bounce">100%</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Comparison Section */}
            <section id="compare" className="py-24 bg-white relative overflow-hidden scroll-mt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center max-w-3xl mx-auto mb-20">
                        <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight mb-6 leading-tight">
                            Why smarter teams <br />
                            <span className="text-[#1b57b1]">choose Leads Scraper.</span>
                        </h2>
                        <p className="text-lg text-slate-500 font-medium leading-relaxed">
                            Stop settled for generic scrapers. See how we compare to traditional lead generation methods.
                        </p>
                    </div>

                    <div className="bg-white rounded-[3rem] p-4 md:p-12 border border-slate-200/60 shadow-xl shadow-slate-100/40 relative overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full min-w-[600px] border-separate border-spacing-y-4">
                                <thead>
                                    <tr>
                                        <th className="text-left py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white rounded-tl-[2rem] border-l border-t border-slate-100 shadow-sm">Features</th>
                                        <th className="text-center py-4 px-6 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 bg-white border-t border-slate-100 shadow-sm">Traditional Tools</th>
                                        <th className="text-center py-6 px-6 text-xs font-black uppercase tracking-[0.2em] text-white bg-[#1b57b1] rounded-tr-[2rem] shadow-2xl relative z-20">Leads Scraper</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-transparent">
                                    <ComparisonRow 
                                        feature="Data Points"
                                        traditional="5 - 10 Fields"
                                        ours="25+ Deep Fields"
                                        isBetter
                                    />
                                    <ComparisonRow 
                                        feature="Technographics"
                                        traditional="Not Available"
                                        ours="50+ Tech Signatures"
                                        isBetter
                                    />
                                    <ComparisonRow 
                                        feature="Data Verification"
                                        traditional="Manual or Cached"
                                        ours="Real-time Verification"
                                        isBetter
                                    />
                                    <ComparisonRow 
                                        feature="Social Discovery"
                                        traditional="Manual Research"
                                        ours="Automated Patterns"
                                        isBetter
                                    />
                                    <ComparisonRow 
                                        feature="Lead Personalization"
                                        traditional="Bulk / Generic"
                                        ours="1:1 AI Merge tags"
                                        isBetter
                                    />
                                    <ComparisonRow 
                                        feature="ICP Scoring"
                                        traditional="Subjective"
                                        ours="Automated (1-100)"
                                        isBetter
                                    />
                                    <ComparisonRow 
                                        feature="Website Audits"
                                        traditional="Manual Check"
                                        ours="Instant SSL/SEO/Perf"
                                        isBetter
                                    />
                                    <ComparisonRow 
                                        feature="PDF Reports"
                                        traditional="Manual Copy-Paste"
                                        ours="One-Click Branded PDF"
                                        isBetter
                                    />
                                    <ComparisonRow 
                                        feature="Auto-Enrichment"
                                        traditional="On-Demand Only"
                                        ours="Background Auto-Audit"
                                        isBetter
                                    />
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </section>

            {/* Pricing Section */}
            <section id="pricing" className="py-24 bg-slate-50 scroll-mt-24">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Simple, Transparent Pricing</h2>
                        <p className="text-slate-500 font-medium mt-4">Fuel your growth at any stage.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl mx-auto">
                        <PricingCard 
                            name="Starter"
                            price="0"
                            credits="20 Leads / Day"
                            features={['Basic Scraping', 'Leads List', 'CSV Export']}
                            buttonText="Get Started"
                            onButtonClick={() => navigate('/auth')}
                            delay={0.1}
                        />
                        <PricingCard 
                            name="Pro"
                            price="19"
                            credits="100 Leads / Month"
                            features={['Advanced AI Extract', 'Campaign Management', 'Website Health Audits', 'Social Discovery', 'Personalized Email']}
                            popular
                            buttonText="Upgrade to Pro"
                            onButtonClick={() => navigate('/auth')}
                            delay={0.2}
                        />
                        <PricingCard 
                            name="Enterprise"
                            price="79"
                            credits="500 Leads / Month"
                            features={['Bulk Scraping', 'Health Dashboard', 'Professional PDF Reports', 'Audit Logs & Team Seats', 'Priority Support']}
                            buttonText="Contact Sales"
                            onButtonClick={() => navigate('/auth')}
                            delay={0.3}
                        />
                    </div>
                </div>
            </section>

            <LandingFooter />
        </div>
    );
};

const FeatureCard = ({ icon, title, description, delay = 0 }: any) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
        whileHover={{ y: -5, transition: { duration: 0.2 } }}
        className="p-8 rounded-[2.5rem] bg-white border border-slate-100 shadow-sm hover:shadow-xl hover:border-blue-100 transition-all group outline-none"
    >
        <div className="w-14 h-14 bg-slate-50 rounded-2xl flex items-center justify-center text-[#1b57b1] mb-6 group-hover:bg-[#1b57b1] group-hover:text-white transition-all duration-300 transform group-hover:-rotate-6">
            {React.cloneElement(icon, { size: 28 } as any)}
        </div>
        <h3 className="text-xl font-bold text-slate-900 mb-4 tracking-tight">{title}</h3>
        <p className="text-slate-600 font-medium leading-relaxed">{description}</p>
    </motion.div>
);

const SolutionItem = ({ icon, title, description, delay = 0 }: any) => (
    <motion.div 
        initial={{ opacity: 0, x: -20 }}
        whileInView={{ opacity: 1, x: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
        className="flex items-start gap-4 p-4 rounded-2xl hover:bg-slate-50 transition-colors group"
    >
        <div className="w-12 h-12 rounded-xl bg-blue-50 text-[#1b57b1] flex items-center justify-center shrink-0 group-hover:bg-[#1b57b1] group-hover:text-white transition-all">
            {icon}
        </div>
        <div>
            <h4 className="font-bold text-slate-900 border-none pb-0 m-0">{title}</h4>
            <p className="text-sm text-slate-500 font-medium mt-1">{description}</p>
        </div>
    </motion.div>
);

const PricingCard = ({ name, price, credits, features, popular, buttonText, onButtonClick, delay = 0 }: any) => (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay }}
        className={`p-8 rounded-[2.5rem] flex flex-col h-full transition-all relative ${popular ? 'bg-white shadow-[0_32px_64px_-16px_rgba(27,87,177,0.15)] border-2 border-[#1b57b1] scale-105 z-10' : 'bg-white border border-slate-200 shadow-sm hover:shadow-lg'}`}
    >
        {popular && <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-[#1b57b1] text-white px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] shadow-lg">Most Popular</div>}
        <div className="mb-8">
            <h3 className="text-lg font-black text-slate-900 uppercase tracking-widest mb-2">{name}</h3>
            <div className="flex items-baseline gap-1">
                <span className="text-4xl font-black text-slate-900 tracking-tighter">${price}</span>
                <span className="text-slate-400 font-bold text-sm">/month</span>
            </div>
            <p className="mt-4 font-bold text-[#1b57b1] bg-[#1b57b1]/5 px-3 py-1 rounded-lg inline-block text-xs">{credits}</p>
        </div>
        <div className="space-y-4 mb-10 flex-1">
            {features.map((f: string) => (
                <div key={f} className="flex items-center gap-3">
                    <div className="size-5 rounded-full bg-blue-50 text-[#1b57b1] flex items-center justify-center">
                        <CheckCircle2 size={12} />
                    </div>
                    <span className="text-sm font-bold text-slate-600">{f}</span>
                </div>
            ))}
        </div>
        <button 
            onClick={onButtonClick}
            className={`w-full py-4 rounded-2xl font-black text-sm transition-all flex items-center justify-center gap-2 group cursor-pointer ${popular ? 'bg-[#1b57b1] text-white hover:bg-blue-600 shadow-xl shadow-blue-500/20' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
        >
            {buttonText}
            <ArrowRight size={16} className="opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all" />
        </button>
    </motion.div>
);

const ComparisonRow = ({ feature, traditional, ours, isBetter }: any) => (
    <motion.tr 
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        className="group transition-all duration-300 hover:scale-[1.01] hover:z-10 relative"
    >
        <td className="py-6 px-6 bg-white border-l border-y border-slate-100 shadow-sm font-black text-slate-900 group-hover:bg-slate-50 transition-colors rounded-l-[1.5rem]">{feature}</td>
        <td className="py-6 px-6 bg-white border-y border-slate-100 shadow-sm text-center group-hover:bg-slate-50 transition-colors">
            <div className="flex flex-col items-center gap-2">
                <XCircle className="text-slate-500 opacity-90" size={18} />
                <span className="text-xs font-bold text-slate-500">{traditional}</span>
            </div>
        </td>
        <td className={`py-6 px-6 text-center shadow-[0_20px_40px_-15px_rgba(27,87,177,0.15)] border-x border-y border-[#1b57b1]/40 relative z-10 rounded-r-[1.5rem] ${isBetter ? 'bg-white' : 'bg-slate-50'}`}>
            <div className="flex flex-col items-center gap-2">
                <div className="size-7 bg-[#1b57b1] rounded-full flex items-center justify-center shadow-lg shadow-[#1b57b1]/20">
                    <CheckCircle className="text-white" size={16} />
                </div>
                <span className="text-sm font-black text-[#1b57b1] tracking-tight">{ours}</span>
            </div>
        </td>
    </motion.tr>
);

export default LandingPage;
