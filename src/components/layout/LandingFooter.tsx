import React from 'react';
import { Link } from 'react-router-dom';
import { Layers } from 'lucide-react';

const LandingFooter = () => {
    return (
        <footer className="py-12 bg-white border-t border-slate-200">
            <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
                    <div className="w-8 h-8 bg-[#1b57b1] rounded-lg flex items-center justify-center">
                        <Layers className="text-white" size={18} />
                    </div>
                    <span className="text-xl font-black tracking-tight text-slate-900">Leads<span className="text-[#1b57b1]">Scraper</span></span>
                </div>
                <div className="flex gap-8 text-sm font-bold text-slate-500">
                    <Link to="/privacy" className="hover:text-slate-900 transition-colors">Privacy</Link>
                    <Link to="/terms" className="hover:text-slate-900 transition-colors">Terms</Link>
                    <Link to="/contact" className="hover:text-slate-900 transition-colors">Contact</Link>
                </div>
                <p className="text-sm text-slate-400 font-medium">&copy; {new Date().getFullYear()} SyntexDev. Built for Growth.</p>
            </div>
        </footer>
    );
};

export default LandingFooter;
