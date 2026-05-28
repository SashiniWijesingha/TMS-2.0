import React, { useState, useRef, useEffect, useCallback } from 'react';
import { ChevronDown, Search, X } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

export interface ComboSelectOption {
    value: number;
    label: string;     // primary text shown in input when selected
    sub?: string;      // secondary info shown in dropdown row
    badge?: string;    // small pill shown at the right of the row
    badgeVariant?: 'default' | 'success' | 'danger' | 'warning';
    disabled?: boolean;
}

interface ComboSelectProps {
    options: ComboSelectOption[];
    value: number | '';
    onChange: (value: number | '') => void;
    placeholder?: string;
    icon?: React.ReactNode;
    disabled?: boolean;
    emptyMessage?: string;
    id?: string;
}

const ComboSelect: React.FC<ComboSelectProps> = ({
    options,
    value,
    onChange,
    placeholder = 'Search or select…',
    icon,
    disabled = false,
    emptyMessage = 'No matches found.',
    id,
}) => {
    const [query, setQuery] = useState('');
    const [open, setOpen] = useState(false);
    const [highlighted, setHighlighted] = useState<number>(-1);

    const wrapperRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const listRef = useRef<HTMLUListElement>(null);

    // Derive which option is currently selected
    const selectedOption = options.find(o => o.value === value) ?? null;

    // What text shows in the input box
    const inputDisplayValue = open ? query : (selectedOption?.label ?? '');

    // Filtered list
    const filtered = query.trim() === ''
        ? options
        : options.filter(o =>
            o.label.toLowerCase().includes(query.toLowerCase()) ||
            (o.sub ?? '').toLowerCase().includes(query.toLowerCase())
        );

    // Close on outside click
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
                setQuery('');
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, []);

    // Reset query when closed
    useEffect(() => {
        if (!open) {
            setQuery('');
            setHighlighted(-1);
        }
    }, [open]);

    // Scroll highlighted item into view
    useEffect(() => {
        if (highlighted >= 0 && listRef.current) {
            const item = listRef.current.children[highlighted] as HTMLElement;
            item?.scrollIntoView({ block: 'nearest' });
        }
    }, [highlighted]);

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setHighlighted(-1);
        if (!open) setOpen(true);
    };

    const handleFocus = () => {
        if (!disabled) {
            setOpen(true);
            setQuery('');
        }
    };

    const handleSelect = useCallback((opt: ComboSelectOption) => {
        if (opt.disabled) return;
        onChange(opt.value);
        setOpen(false);
        setQuery('');
        inputRef.current?.blur();
    }, [onChange]);

    const handleClear = (e: React.MouseEvent) => {
        e.stopPropagation();
        onChange('');
        setQuery('');
        setOpen(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!open) {
            if (e.key === 'ArrowDown' || e.key === 'Enter') {
                setOpen(true);
                return;
            }
        }
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlighted(h => Math.min(h + 1, filtered.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlighted(h => Math.max(h - 1, 0));
                break;
            case 'Enter':
                e.preventDefault();
                if (highlighted >= 0 && filtered[highlighted]) {
                    handleSelect(filtered[highlighted]);
                }
                break;
            case 'Escape':
                setOpen(false);
                break;
        }
    };

    return (
        <div className="relative" ref={wrapperRef}>
            {/* Input row */}
            <div
                className={`relative flex items-center border rounded-xl transition-colors ${
                    open
                        ? 'border-indigo-400 ring-2 ring-indigo-100'
                        : 'border-slate-200 hover:border-slate-300'
                } ${disabled ? 'bg-slate-50 cursor-not-allowed' : 'bg-white cursor-text'}`}
                onClick={() => { if (!disabled) { setOpen(true); inputRef.current?.focus(); } }}
            >
                {/* Leading icon */}
                <span className="pl-3 text-slate-400 shrink-0">
                    {open
                        ? <Search size={16} className="text-indigo-400" />
                        : (icon ?? <Search size={16} />)
                    }
                </span>

                <input
                    ref={inputRef}
                    id={id}
                    type="text"
                    autoComplete="off"
                    disabled={disabled}
                    placeholder={open ? 'Type to search…' : placeholder}
                    value={inputDisplayValue}
                    onChange={handleInputChange}
                    onFocus={handleFocus}
                    onKeyDown={handleKeyDown}
                    className={`flex-1 py-3 px-3 text-sm outline-none bg-transparent text-slate-800 placeholder:text-slate-400 ${disabled ? 'cursor-not-allowed' : ''}`}
                />

                {/* Trailing: clear × or chevron */}
                {value !== '' && !disabled ? (
                    <button
                        type="button"
                        onClick={handleClear}
                        className="pr-3 text-slate-400 hover:text-slate-600 shrink-0"
                        tabIndex={-1}
                    >
                        <X size={15} />
                    </button>
                ) : (
                    <span className="pr-3 text-slate-400 shrink-0 pointer-events-none">
                        <ChevronDown size={16} className={`transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
                    </span>
                )}
            </div>

            {/* Dropdown */}
            <AnimatePresence>
                {open && (
                    <motion.div
                        initial={{ opacity: 0, y: 6, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.98 }}
                        transition={{ duration: 0.13 }}
                        className="absolute z-[60] mt-1.5 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden"
                    >
                        <ul
                            ref={listRef}
                            className="max-h-56 overflow-y-auto py-1"
                        >
                            {filtered.length > 0 ? filtered.map((opt, idx) => (
                                <li key={opt.value}>
                                    <button
                                        type="button"
                                        disabled={opt.disabled}
                                        onMouseDown={(e) => { e.preventDefault(); handleSelect(opt); }}
                                        onMouseEnter={() => setHighlighted(idx)}
                                        className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-2 text-sm transition-colors
                                            ${opt.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                                            ${idx === highlighted && !opt.disabled ? 'bg-indigo-50 text-indigo-800' : 'hover:bg-slate-50 text-slate-700'}
                                            ${opt.value === value ? 'font-semibold' : ''}
                                        `}
                                    >
                                        <span className="flex flex-col min-w-0">
                                            <span className="truncate">{opt.label}</span>
                                            {opt.sub && (
                                                <span className="text-[11px] text-slate-400 truncate">{opt.sub}</span>
                                            )}
                                        </span>
                                        {opt.badge && (
                                            <span className={`shrink-0 text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                                                opt.badgeVariant === 'danger'
                                                    ? 'bg-red-100 text-red-700'
                                                    : opt.badgeVariant === 'success'
                                                        ? 'bg-emerald-100 text-emerald-700'
                                                        : opt.badgeVariant === 'warning'
                                                            ? 'bg-amber-100 text-amber-700'
                                                            : 'bg-indigo-100 text-indigo-700'
                                            }`}>
                                                {opt.badge}
                                            </span>
                                        )}
                                        {opt.value === value && (
                                            <span className="shrink-0 w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                        )}
                                    </button>
                                </li>
                            )) : (
                                <li className="px-4 py-3 text-sm text-slate-400 text-center">{emptyMessage}</li>
                            )}
                        </ul>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default ComboSelect;
