export interface SubmissionRule {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
}

const DEFAULT_START = '08:00:00';
const DEFAULT_END = '16:00:00';

function toHHMM(value: string, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const match = value.trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
    if (!match) return fallback;

    const hours = Number(match[1]);
    const minutes = Number(match[2]);
    if (!Number.isInteger(hours) || !Number.isInteger(minutes)) return fallback;
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return fallback;

    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function timeToMinutes(value: string): number {
    const hhmm = toHHMM(value, '00:00');
    const [h, m] = hhmm.split(':').map(Number);
    return h * 60 + m;
}

export function formatTime12h(value: string): string {
    const hhmm = toHHMM(value, '08:00');
    const [h, m] = hhmm.split(':').map(Number);
    const suffix = h >= 12 ? 'PM' : 'AM';
    const hour12 = h % 12 === 0 ? 12 : h % 12;
    return `${hour12}:${String(m).padStart(2, '0')} ${suffix}`;
}

export function getRuleForDate(rules: SubmissionRule[], date: Date): SubmissionRule {
    const day = date.getDay();
    const existing = rules.find((r) => r.day_of_week === day);

    if (existing) {
        return {
            ...existing,
            start_time: toHHMM(existing.start_time, '08:00'),
            end_time: toHHMM(existing.end_time, '16:00'),
        };
    }

    return {
        day_of_week: day,
        start_time: toHHMM(DEFAULT_START, '08:00'),
        end_time: toHHMM(DEFAULT_END, '16:00'),
        is_active: true,
    };
}

export function parseDateInput(dateValue: string): Date | null {
    if (!dateValue) return null;
    const parsed = new Date(`${dateValue}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}
