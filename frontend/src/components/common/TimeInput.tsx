import { useEffect, useMemo, useRef, useState } from 'react';
import { Clock } from 'lucide-react';

type TimeInputProps = {
    value: string;
    onChange: (value: string) => void;
    disabled?: boolean;
    error?: boolean;
    label?: string;
    placeholder?: string;
    className?: string;
    inputClassName?: string;
    menuClassName?: string;
    optionClassName?: string;
    stepMinutes?: number;
    ariaLabel?: string;
};

const normalizeTime = (value: string): string => {
    const trimmed = (value || '').trim();
    if (!trimmed) return '';

    const match = trimmed.match(/^(\d{1,2})(?::(\d{1,2}))?(?::\d{1,2})?$/);
    if (!match) return '';

    const hours = Number(match[1]);
    const minutes = Number(match[2] ?? '0');
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return '';
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '';

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};

const buildTimes = (stepMinutes: number): string[] => {
    const options: string[] = [];
    const step = Math.max(1, Math.min(60, Math.floor(stepMinutes)));

    for (let hours = 0; hours < 24; hours += 1) {
        for (let minutes = 0; minutes < 60; minutes += step) {
            options.push(`${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`);
        }
    }

    return options;
};

const formatTimeLabel = (value: string): string => {
    const normalized = normalizeTime(value);
    if (!normalized) return '';
    const [hoursText, minutesText] = normalized.split(':');
    const hours = Number(hoursText);
    const suffix = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 === 0 ? 12 : hours % 12;
    return `${hour12}:${minutesText} ${suffix}`;
};

const TimeInput = ({
    value,
    onChange,
    disabled = false,
    error = false,
    label = 'time',
    placeholder = 'HH:MM',
    className = '',
    inputClassName = '',
    menuClassName = '',
    optionClassName = '',
    stepMinutes = 15,
    ariaLabel,
}: TimeInputProps) => {
    const wrapperRef = useRef<HTMLDivElement>(null);
    const [open, setOpen] = useState(false);
    const [draft, setDraft] = useState(normalizeTime(value));
    const options = useMemo(() => buildTimes(stepMinutes), [stepMinutes]);

    useEffect(() => {
        setDraft(normalizeTime(value));
    }, [value]);

    useEffect(() => {
        const handlePointerDown = (event: MouseEvent) => {
            if (!wrapperRef.current || wrapperRef.current.contains(event.target as Node)) return;
            setOpen(false);
            const normalized = normalizeTime(draft);
            if (normalized) {
                onChange(normalized);
            } else {
                setDraft(normalizeTime(value));
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setOpen(false);
            }
        };

        document.addEventListener('mousedown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [draft, onChange, value]);

    const commitDraft = () => {
        const normalized = normalizeTime(draft);
        if (normalized) {
            setDraft(normalized);
            onChange(normalized);
        } else {
            setDraft(normalizeTime(value));
        }
    };

    return (
        <div ref={wrapperRef} className={`relative ${className}`}>
            <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                spellCheck={false}
                disabled={disabled}
                aria-label={ariaLabel || `${label} input`}
                placeholder={placeholder}
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onFocus={() => setOpen(false)}
                onBlur={commitDraft}
                onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                        event.preventDefault();
                        commitDraft();
                        setOpen(false);
                    }
                }}
                className={`w-full rounded-lg border bg-slate-50 py-2.5 pl-11 pr-3 text-sm font-medium outline-none transition-all focus:bg-white focus:ring-2 ${error ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20' : 'border-slate-200 focus:border-blue-500 focus:ring-blue-500/20'} ${disabled ? 'cursor-not-allowed opacity-60' : ''} ${inputClassName}`}
            />
            <button
                type="button"
                aria-label={`Open ${label} picker`}
                disabled={disabled}
                onMouseDown={(event) => event.preventDefault()}
                onClick={() => setOpen((prev) => !prev)}
                className={`absolute left-2 top-1/2 -translate-y-1/2 rounded-md p-1.5 text-slate-400 transition-colors hover:bg-slate-100 hover:text-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:cursor-not-allowed disabled:opacity-40 ${menuClassName}`}
            >
                <Clock size={16} />
            </button>

            {open && !disabled && (
                <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                    <div className="mb-2 flex items-center justify-between px-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">Choose time</span>
                        <span className="text-[11px] text-slate-400">{stepMinutes}-minute steps</span>
                    </div>
                    <div className="grid max-h-64 grid-cols-3 gap-1 overflow-y-auto pr-1">
                        {options.map((option) => {
                            const selected = normalizeTime(draft) === option;
                            return (
                                <button
                                    key={option}
                                    type="button"
                                    onClick={() => {
                                        setDraft(option);
                                        onChange(option);
                                        setOpen(false);
                                    }}
                                    className={`rounded-lg px-2 py-2 text-xs font-semibold transition-colors ${selected ? 'bg-blue-600 text-white' : 'bg-slate-50 text-slate-700 hover:bg-blue-50 hover:text-blue-700'} ${optionClassName}`}
                                >
                                    {formatTimeLabel(option)}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default TimeInput;