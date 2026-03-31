import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface CustomSelectProps {
    value: string;
    onChange: (value: string) => void;
    options: { label: string, value: string }[];
    placeholder?: string;
    icon?: React.ElementType;
    className?: string;
    isBold?: boolean;
    align?: 'left' | 'right';
}

const CustomSelect: React.FC<CustomSelectProps> = ({ 
    value, 
    onChange, 
    options, 
    placeholder, 
    icon: Icon, 
    className = "", 
    isBold = false,
    align = 'right'
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const selectedOption = options.find(opt => opt.value === value);

    useEffect(() => {
        setMounted(true);
    }, []);

    const updateCoords = () => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            setCoords({
                top: rect.bottom,
                left: rect.left,
                width: rect.width
            });
        }
    };

    useLayoutEffect(() => {
        if (isOpen) {
            updateCoords();
        }
    }, [isOpen]);

    useEffect(() => {
        if (!isOpen) return;

        window.addEventListener('resize', updateCoords);
        window.addEventListener('scroll', updateCoords, true);

        const handleClickOutside = (event: MouseEvent) => {
            const target = event.target as Node;
            const isClickInsideContainer = containerRef.current?.contains(target);
            const isClickInsideDropdown = dropdownRef.current?.contains(target);

            if (!isClickInsideContainer && !isClickInsideDropdown) {
                setIsOpen(false);
            }
        };

        // Use a small timeout to avoid immediate closure if the click that opened
        // the menu also triggers the document listener
        const timer = setTimeout(() => {
            document.addEventListener('mousedown', handleClickOutside);
        }, 0);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateCoords);
            window.removeEventListener('scroll', updateCoords, true);
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);

    if (!mounted) return (
        <div className={`relative h-full ${className}`} ref={containerRef}>
            <div className="w-full h-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 opacity-50" />
        </div>
    );

    return (
        <div className={`relative h-full ${className}`} ref={containerRef}>
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={`w-full h-[46px] md:h-[56px] bg-slate-50 border border-slate-200 rounded-xl px-3 sm:px-4 text-sm text-slate-900 flex items-center justify-between gap-2 hover:bg-slate-100 transition-all shadow-inner ${isOpen ? 'ring-2 ring-[#1b57b1]/10 border-[#1b57b1]' : ''} ${isBold ? 'font-bold' : ''}`}
            >
                <div className="flex items-center gap-2 truncate leading-none">
                    {Icon && <Icon size={16} className="text-slate-400 flex-shrink-0" />}
                    <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
                </div>
                <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {createPortal(
                <AnimatePresence>
                    {isOpen && (
                        <motion.div
                            ref={dropdownRef}
                            initial={{ opacity: 0, y: -10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.15 }}
                            className="fixed bg-white rounded-xl shadow-2xl border border-slate-200 py-2 z-[999999] overflow-hidden"
                            style={{ 
                                top: coords.top + 8,
                                left: align === 'right' 
                                    ? 'auto' 
                                    : coords.left,
                                right: align === 'right'
                                    ? window.innerWidth - (coords.left + coords.width)
                                    : 'auto',
                                width: 'auto',
                                minWidth: Math.max(180, coords.width),
                                maxHeight: 240,
                                originY: 0
                            }}
                        >
                            <div className="max-h-60 overflow-y-auto pr-1">
                                <div className="pb-1">
                                    {options.map((option) => (
                                        <button
                                            key={option.value}
                                            type="button"
                                            onClick={() => {
                                                onChange(option.value);
                                                setIsOpen(false);
                                            }}
                                            className={`w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 transition-colors flex items-center justify-between ${value === option.value ? 'bg-blue-50/50 text-[#1b57b1] font-bold' : 'text-slate-700'}`}
                                        >
                                            <span className="truncate mr-2">{option.label}</span>
                                            {value === option.value && <div className="h-1.5 w-1.5 rounded-full bg-[#1b57b1] flex-shrink-0"></div>}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>,
                document.body
            )}
        </div>
    );
};

export default CustomSelect;
