import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface ComboboxProps {
    label: string;
    name: string;
    value: string;
    options: string[];
    onChange: (e: any) => void;
    required?: boolean;
    placeholder?: string;
    className?: string;
    icon?: React.ElementType;
    labelClassName?: string;
    wrapperClassName?: string;
    disabled?: boolean;
}

const Combobox = ({
    label,
    name,
    value,
    options,
    onChange,
    required = false,
    placeholder,
    className = '',
    labelClassName = 'block text-sm font-medium text-slate-700 mb-2',
    wrapperClassName = '',
    icon: Icon,
    disabled = false
}: ComboboxProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleFocus = () => {
        if (!disabled) setIsOpen(true);
    };

    const handleSelect = (option: string) => {
        // Create a synthetic event to match standard input onChange
        onChange({ target: { name, value: option } });
        setIsOpen(false);
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onChange(e);
        if (!isOpen) setIsOpen(true);
    };

    const toggleDropdown = () => {
        if (disabled) return;
        if (isOpen) {
            setIsOpen(false);
        } else {
            setIsOpen(true);
            if (inputRef.current) {
                inputRef.current.focus();
            }
        }
    };

    const filteredOptions = options.filter(opt =>
        opt.toLowerCase().includes((value || '').toLowerCase()) && opt !== value
    );

    const displayOptions = (value || '').trim() === '' ? options : filteredOptions;

    return (
        <div className={`relative ${wrapperClassName}`} ref={wrapperRef}>
            {label && <label className={labelClassName}>{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
            <div className={`relative group ${className}`}>
                {Icon ? (
                    <Icon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                ) : (
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                )}

                <input
                    ref={inputRef}
                    type="text"
                    name={name}
                    value={value}
                    onChange={handleChange}
                    onFocus={handleFocus}
                    required={required}
                    disabled={disabled}
                    placeholder={placeholder || "Select or type..."}
                    autoComplete="off"
                    className={`w-full pl-10 pr-10 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-blue-300 focus:border-transparent outline-none transition-all cursor-text text-slate-700 ${disabled ? 'bg-slate-50 text-slate-400 cursor-not-allowed hover:border-slate-200' : ''}`}
                />
                <button
                    type="button"
                    onClick={toggleDropdown}
                    disabled={disabled}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-slate-400 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors disabled:cursor-not-allowed disabled:hover:text-slate-400 disabled:hover:bg-transparent"
                >
                    <ChevronDown size={16} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
            </div>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.98 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        className="absolute z-50 w-full mt-2 bg-white border border-slate-200 rounded-xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar"
                    >
                        {displayOptions.length > 0 ? (
                            <div className="py-2">
                                {displayOptions.map((opt) => (
                                    <button
                                        key={opt}
                                        type="button"
                                        onClick={() => handleSelect(opt)}
                                        className="w-full text-left px-4 py-2.5 hover:bg-blue-50 transition-colors block text-slate-700 hover:text-blue-700 text-sm"
                                    >
                                        {opt}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 text-center">
                                <p className="text-slate-500 text-sm">No matches found.</p>
                                <p className="text-slate-400 text-xs mt-1">Using "{value}" as new value.</p>
                            </div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default Combobox;
