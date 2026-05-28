import { useState, useEffect, useRef } from 'react';
import {
    Save, Clock, Calendar, CheckCircle2, AlertCircle, Info,
    MessageSquare, Bell, BellOff, Smartphone, SmartphoneNfc,
    ChevronDown, ChevronUp, Eye, EyeOff, Settings, Zap, Mail, MailX
} from 'lucide-react';
import api from '../services/api';
import TimeInput from '../components/common/TimeInput';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface SubmissionRule {
    day_of_week: number;
    start_time: string;
    end_time: string;
    is_active: boolean;
}

interface GlobalConfig {
    delay_visibility: string;
    applies_to_passenger_normal: string;
    applies_to_passenger_adhoc: string;
    applies_to_passenger_special: string;
    applies_to_material: string;
}

const DEFAULT_GLOBAL_CONFIG: GlobalConfig = {
    delay_visibility: 'true',
    applies_to_passenger_normal: 'true',
    applies_to_passenger_adhoc: 'false',
    applies_to_passenger_special: 'false',
    applies_to_material: 'true',
};

interface NotificationRule {
    id: number;
    event_type: string;
    target_role: string;
    enabled: boolean;
    send_sms: boolean;
    send_in_app: boolean;
    send_email: boolean;
    message_template: string;
    repeat_interval_minutes: number | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

const EVENT_LABELS: Record<string, { label: string; description: string; color: string }> = {
    NEW_REQUEST:                    { label: 'New Request Submitted',             description: 'Fired when a staff member submits a new transport request. This is the only event gated by the submission window — notifications are held and fired when the window opens if submitted after hours.',           color: 'bg-blue-100 text-blue-700' },
    REQUEST_VERIFIED:               { label: 'Request Verified by Coordinator',   description: 'Coordinator reviewed and forwarded the request to HOD for approval.',              color: 'bg-cyan-100 text-cyan-700' },
    REQUEST_APPROVED:               { label: 'Request Approved',                  description: 'HOD or CEO approved the request.',                                     color: 'bg-emerald-100 text-emerald-700' },
    REQUEST_REJECTED:               { label: 'Request Rejected',                  description: 'HOD rejected the request.',                                           color: 'bg-red-100 text-red-700' },
    REQUEST_RETURNED:               { label: 'Request Returned for Correction',   description: 'Coordinator returned the request to staff for corrections.',           color: 'bg-amber-100 text-amber-700' },
    REQUEST_ALLOCATED:              { label: 'Allocation Confirmed',               description: 'Transport officer allocated a vehicle and driver — request moves to ALLOCATED. Requester and Driver are notified.',   color: 'bg-purple-100 text-purple-700' },
    VENDOR_ALLOCATED:               { label: 'Vendor Assigned',                    description: 'Transport officer assigned the request to an external vendor.',        color: 'bg-indigo-100 text-indigo-700' },
    REQUEST_COMPLETED:              { label: 'Trip Completed',                     description: 'Transport officer marked the trip as completed.',                      color: 'bg-slate-100 text-slate-700' },
    DRIVER_REMINDER:                { label: 'Driver Acceptance Reminder',         description: 'Sent automatically every 15 minutes to a driver who has not yet accepted an allocated trip. Repeats until the driver accepts.',  color: 'bg-orange-100 text-orange-700' },
    ADHOC_REMINDER:                 { label: 'Ad-Hoc Urgent Reminder',             description: 'Sent every 5 minutes to the role currently responsible for an ad-hoc request stuck in an approval stage. Continues until the request moves forward.', color: 'bg-rose-100 text-rose-700' },
};

const ROLE_LABELS: Record<string, string> = {
    REQUESTER:   'Requester (submitter)',
    COORDINATOR: 'Coordinator',
    HOD:         'Head of Department',
    TRANSPORT:   'Transport Officer',
    CEO:         'CEO',
    DRIVER:      'Driver',
};

const ROLE_TOOLTIPS: Record<string, Record<string, string>> = {
    NEW_REQUEST: {
        COORDINATOR: 'Triggered the moment a staff member submits a new request. Coordinator must review and verify it before it can move forward.',
        HOD:         'Notified when a new request is submitted (disabled by default). Enable if your HOD wants early visibility before Coordinator review.',
        TRANSPORT:   'Notified when a new request enters the system (disabled by default). Useful for early planning.',
        CEO:         'For Special requests only — CEO receives an email so they are aware a special trip has been requested.',
    },
    REQUEST_VERIFIED: {
        REQUESTER:   'Fired when the Coordinator reviews and forwards the request to HOD. Staff member is informed their request is moving forward.',
        HOD:         'Fired when the Coordinator verifies the request and forwards it for approval. HOD receives this to know a request is waiting for their decision.',
    },
    REQUEST_APPROVED: {
        REQUESTER:   'Fired when HOD (or CEO for special requests) approves the request. Staff member is told their trip is confirmed.',
        TRANSPORT:   'Fired when the request is approved. Transport Officer is prompted to assign a vehicle and driver.',
    },
    REQUEST_REJECTED: {
        REQUESTER:   'Fired when the HOD rejects the request. Staff member is informed to review the feedback and resubmit if needed.',
    },
    REQUEST_RETURNED: {
        REQUESTER:   'Fired when the Coordinator sends the request back to staff for corrections. Staff must update and resubmit.',
    },
    REQUEST_ALLOCATED: {
        REQUESTER:   'Fired when a vehicle and driver are allocated. Staff member gets the vehicle plate and driver contact.',
        DRIVER:      'Fired when allocated — Driver receives job details and a link to accept the trip.',
        COORDINATOR: 'Fired when the allocation is saved (they may also receive an in-app summary at this stage).',
    },
    VENDOR_ALLOCATED: {
        REQUESTER:   'Fired when Transport assigns the trip to an external vendor instead of an internal vehicle/driver.',
        COORDINATOR: 'Fired when Transport assigns a vendor. Coordinator is notified for reporting and awareness.',
    },
    REQUEST_COMPLETED: {
        REQUESTER:   'Fired when the Transport Officer marks the trip as completed.',
    },
    DRIVER_REMINDER: {
        DRIVER:      'Auto-sent repeatedly (at the configured interval below) to a driver who has not yet accepted their assigned trip. Stops automatically once the driver accepts.',
    },
    ADHOC_REMINDER: {
        COORDINATOR: 'Repeating reminder sent while an Ad-Hoc request is in the Coordinator\'s queue and has not been actioned.',
        HOD:         'Repeating reminder sent while an Ad-Hoc request is pending HOD approval.',
        TRANSPORT:   'Repeating reminder sent while an Ad-Hoc request needs vehicle/driver allocation by Transport.',
    },
};

const PLACEHOLDERS = [
    { key: '{{recipient_name}}', desc: "Recipient's full name" },
    { key: '{{request_id}}',    desc: 'Request ID number' },
    { key: '{{requester}}',     desc: "Requester's full name" },
    { key: '{{division}}',      desc: "Requester's division" },
    { key: '{{job_number}}',    desc: 'WBS / Job number' },
    { key: '{{type}}',          desc: 'passenger or material' },
    { key: '{{vehicle_number}}',desc: 'Allocated vehicle plate' },
    { key: '{{driver_name}}',   desc: "Driver's name" },
    { key: '{{driver_contact}}',desc: "Driver's contact number" },
    { key: '{{trip_link}}',     desc: 'Direct link to Driver Portal — drivers tap to accept trip (requires FRONTEND_URL in backend .env)' },
    { key: '{{request_link}}',  desc: 'Direct link to the specific Request Details page — works for all roles (requires FRONTEND_URL in backend .env)' },
];

const normalizeBooleanString = (value: unknown, fallback: 'true' | 'false' = 'false'): 'true' | 'false' => {
    if (value === true || value === 'true') return 'true';
    if (value === false || value === 'false') return 'false';
    return fallback;
};

const normalizeTimeForApi = (value: string): string => {
    const trimmed = (value || '').trim();
    if (!trimmed) return '00:00:00';
    return trimmed.length === 5 ? `${trimmed}:00` : trimmed;
};

const timeToMinutes = (value: string): number => {
    const [h, m] = normalizeTimeForApi(value).split(':').map(Number);
    return (h * 60) + m;
};

// ─────────────────────────────────────────────────────────────────────────────
// Small helpers
// ─────────────────────────────────────────────────────────────────────────────

const Toggle = ({
    value,
    onChange,
    disabled = false,
}: {
    value: boolean;
    onChange: (v: boolean) => void;
    disabled?: boolean;
}) => (
    <button
        type="button"
        aria-pressed={value}
        disabled={disabled}
        aria-disabled={disabled}
        onClick={() => {
            if (disabled) return;
            onChange(!value);
        }}
        className={`group relative inline-flex h-6 w-11 shrink-0 items-center rounded-full border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-55 ${
            value
                ? 'bg-blue-600 border-blue-600 shadow-[0_6px_16px_-10px_rgba(37,99,235,0.85)]'
                : 'bg-white border-slate-300 hover:border-slate-400'
        }`}
    >
        <span
            className={`pointer-events-none absolute left-0.5 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white shadow-[0_2px_8px_rgba(15,23,42,0.2)] transition-transform duration-200 ${
                value ? 'translate-x-5' : 'translate-x-0'
            }`}
        >
            <span className={`h-1.5 w-1.5 rounded-full transition-colors ${value ? 'bg-blue-600' : 'bg-slate-400'}`} />
        </span>
    </button>
);

const IconToggle = ({
    value, onChange, iconOn, iconOff, colorOn, title
}: {
    value: boolean; onChange: (v: boolean) => void;
    iconOn: React.ReactNode; iconOff: React.ReactNode;
    colorOn: string; title: string;
}) => (
    <button
        type="button"
        aria-pressed={value}
        title={title}
        onClick={() => onChange(!value)}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 ${
            value
                ? `${colorOn} shadow-[0_3px_10px_-6px_rgba(15,23,42,0.45)]`
                : 'bg-white text-slate-400 border-slate-300 hover:bg-slate-50 hover:border-slate-400 hover:text-slate-600'
        }`}
    >
        <span className="transition-transform duration-150 group-active:scale-95">
            {value ? iconOn : iconOff}
        </span>
    </button>
);

// ─────────────────────────────────────────────────────────────────────────────
// Info Tooltip
// ─────────────────────────────────────────────────────────────────────────────

const InfoTooltip = ({ text, align = 'center' }: { text: string; align?: 'left' | 'center' | 'right' }) => {
    const [show, setShow] = useState(false);
    const popAlign = align === 'left' ? 'left-0' : align === 'right' ? 'right-0' : 'left-1/2 -translate-x-1/2';
    const arrowAlign = align === 'left' ? 'left-3' : align === 'right' ? 'right-3' : 'left-1/2 -translate-x-1/2';
    return (
        <span className="relative inline-flex items-center ml-1 shrink-0">
            <button
                type="button"
                onMouseEnter={() => setShow(true)}
                onMouseLeave={() => setShow(false)}
                onFocus={() => setShow(true)}
                onBlur={() => setShow(false)}
                className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-slate-200 hover:bg-blue-100 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none focus:ring-1 focus:ring-blue-400"
                aria-label="More information"
            >
                <Info size={9} />
            </button>
            {show && (
                <span className={`absolute z-50 top-full mt-2 w-60 p-2.5 bg-slate-800 text-white text-[11px] leading-relaxed rounded-lg shadow-xl pointer-events-none ${popAlign}`}>
                    {text}
                    <span className={`absolute bottom-full ${arrowAlign} border-4 border-transparent border-b-slate-800`} />
                </span>
            )}
        </span>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Notification Rule Row
// ─────────────────────────────────────────────────────────────────────────────

const NotificationRuleRow = ({
    rule,
    onChange,
}: {
    rule: NotificationRule;
    onChange: (updated: NotificationRule) => void;
}) => {
    const [expanded, setExpanded] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const isReminder = rule.event_type === 'DRIVER_REMINDER' || rule.event_type === 'ADHOC_REMINDER';

    const insertPlaceholder = (key: string) => {
        const el = textareaRef.current;
        if (!el) return;
        const start = el.selectionStart;
        const end = el.selectionEnd;
        const newVal = rule.message_template.slice(0, start) + key + rule.message_template.slice(end);
        onChange({ ...rule, message_template: newVal });
        setTimeout(() => {
            el.focus();
            el.setSelectionRange(start + key.length, start + key.length);
        }, 0);
    };

    return (
        <div className={`border rounded-xl transition-all ${rule.enabled ? 'border-slate-200 bg-white' : 'border-slate-100 bg-slate-50'}`}>
            <div className="flex items-center gap-3 px-4 py-3">
                {/* Enable toggle */}
                <Toggle value={rule.enabled} onChange={(v) => onChange({ ...rule, enabled: v })} />

                {/* Role label */}
                <span className={`text-xs font-semibold w-44 shrink-0 flex items-center gap-0.5 ${rule.enabled ? 'text-slate-800' : 'text-slate-400'}`}>
                    <span>{ROLE_LABELS[rule.target_role] ?? rule.target_role}</span>
                    {rule.target_role === 'CEO' && rule.event_type === 'NEW_REQUEST' && (
                        <span className="ml-1.5 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-violet-100 text-violet-700 border border-violet-200 align-middle">
                            Special only
                        </span>
                    )}
                    {ROLE_TOOLTIPS[rule.event_type]?.[rule.target_role] && (
                        <InfoTooltip text={ROLE_TOOLTIPS[rule.event_type][rule.target_role]} align="left" />
                    )}
                </span>

                {/* SMS, In-App & Email toggles */}
                <div className="flex items-center gap-2">
                    <IconToggle
                        value={rule.send_sms}
                        onChange={(v) => onChange({ ...rule, send_sms: v })}
                        iconOn={<Smartphone size={14} />}
                        iconOff={<SmartphoneNfc size={14} />}
                        colorOn="bg-emerald-50 text-emerald-700 border-emerald-300"
                        title={rule.send_sms ? 'SMS: ON — click to disable' : 'SMS: OFF — click to enable'}
                    />
                    <IconToggle
                        value={rule.send_in_app}
                        onChange={(v) => onChange({ ...rule, send_in_app: v })}
                        iconOn={<Bell size={14} />}
                        iconOff={<BellOff size={14} />}
                        colorOn="bg-blue-50 text-blue-700 border-blue-300"
                        title={rule.send_in_app ? 'In-App: ON — click to disable' : 'In-App: OFF — click to enable'}
                    />
                    <IconToggle
                        value={rule.send_email}
                        onChange={(v) => onChange({ ...rule, send_email: v })}
                        iconOn={<Mail size={14} />}
                        iconOff={<MailX size={14} />}
                        colorOn="bg-violet-50 text-violet-700 border-violet-300"
                        title={rule.send_email ? 'Email: ON — click to disable' : 'Email: OFF — click to enable'}
                    />
                </div>

                {/* Status chips */}
                <div className="flex items-center gap-1.5 flex-1">
                    {rule.send_sms && rule.enabled && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">SMS</span>
                    )}
                    {rule.send_in_app && rule.enabled && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">In-App</span>
                    )}
                    {rule.send_email && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-50 text-violet-700 border border-violet-100">Email</span>
                    )}
                    {!rule.enabled && (
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">Disabled</span>
                    )}
                </div>

                {/* Expand message editor */}
                <button
                    type="button"
                    onClick={() => setExpanded(!expanded)}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-blue-600 transition-colors"
                >
                    <MessageSquare size={12} />
                    Edit Message
                    {expanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
            </div>

            {/* Repeat interval — only shown for reminder events */}
            {isReminder && (
                <div className="px-4 py-2 border-t border-slate-100 flex items-center gap-3 bg-orange-50/40">
                    <span className="text-[11px] font-semibold text-slate-600 shrink-0">Repeat every</span>
                    <input
                        type="number"
                        min={1}
                        max={1440}
                        value={rule.repeat_interval_minutes ?? ''}
                        onChange={(e) => {
                            const v = parseInt(e.target.value, 10);
                            onChange({ ...rule, repeat_interval_minutes: isNaN(v) ? null : Math.max(1, Math.min(1440, v)) });
                        }}
                        className="w-20 px-2 py-1 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-center"
                        placeholder="–"
                    />
                    <span className="text-[11px] text-slate-500">minutes (1–1440)</span>
                </div>
            )}

            {expanded && (
                <div className="px-4 pb-4 border-t border-slate-100 pt-3 space-y-2">
                    <div className="flex flex-wrap gap-1 mb-2">
                        {PLACEHOLDERS.map(p => (
                            <button
                                key={p.key}
                                type="button"
                                onClick={() => insertPlaceholder(p.key)}
                                title={p.desc}
                                className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 hover:bg-blue-100 text-slate-600 hover:text-blue-700 rounded border border-slate-200 hover:border-blue-200 transition-all"
                            >
                                {p.key}
                            </button>
                        ))}
                    </div>
                    <textarea
                        ref={textareaRef}
                        rows={3}
                        value={rule.message_template}
                        onChange={(e) => onChange({ ...rule, message_template: e.target.value })}
                        className="w-full px-3 py-2 text-xs border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-none font-mono"
                    />
                    <p className="text-[10px] text-slate-400">Click a placeholder above to insert it at cursor position.</p>
                </div>
            )}
        </div>
    );
};

// ─────────────────────────────────────────────────────────────────────────────
// Main Page
// ─────────────────────────────────────────────────────────────────────────────

const AdminSystemSettings = () => {
    const [activeTab, setActiveTab] = useState<'windows' | 'notifications'>('windows');

    // Submission windows state
    const [rules, setRules] = useState<SubmissionRule[]>([]);
    const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
        ...DEFAULT_GLOBAL_CONFIG,
    });

    // Notification config state
    const [notifRules, setNotifRules] = useState<NotificationRule[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const isDelayVisibilityEnabled = globalConfig.delay_visibility === 'true';

    useEffect(() => {
        fetchAll();
    }, []);

    const fetchAll = async () => {
        setLoading(true);
        try {
            const [rulesRes, globalRes, notifRes] = await Promise.all([
                api.get('/admin/submission-rules'),
                api.get('/admin/global-config'),
                api.get('/admin/notification-config'),
            ]);

            const fetchedRules = rulesRes.data;
            const fullRules: SubmissionRule[] = Array.from({ length: 7 }).map((_, i) => {
                const existing = fetchedRules.find((r: SubmissionRule) => r.day_of_week === i);
                return existing || { day_of_week: i, start_time: '08:00:00', end_time: '16:00:00', is_active: true };
            });
            setRules(fullRules);
            setGlobalConfig({
                ...DEFAULT_GLOBAL_CONFIG,
                delay_visibility: normalizeBooleanString(globalRes.data?.delay_visibility, 'true'),
                applies_to_passenger_normal: normalizeBooleanString(globalRes.data?.applies_to_passenger_normal, 'true'),
                applies_to_passenger_adhoc: normalizeBooleanString(globalRes.data?.applies_to_passenger_adhoc, 'false'),
                applies_to_passenger_special: normalizeBooleanString(globalRes.data?.applies_to_passenger_special, 'false'),
                applies_to_material: normalizeBooleanString(globalRes.data?.applies_to_material, 'true'),
            });
            setNotifRules(Array.isArray(notifRes.data) ? notifRes.data : []);
        } catch (err) {
            console.error('Failed to fetch settings:', err);
            setMessage({ type: 'error', text: 'Failed to load settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleRuleChange = (index: number, field: keyof SubmissionRule, value: any) => {
        setRules(prev => {
            const next = [...prev];
            next[index] = { ...next[index], [field]: value };
            return next;
        });
    };

    const handleGlobalChange = (key: keyof GlobalConfig, value: boolean) => {
        setGlobalConfig(prev => ({ ...prev, [key]: value ? 'true' : 'false' }));
    };

    const handleNotifChange = (updated: NotificationRule) => {
        setNotifRules(prev => prev.map(r => r.id === updated.id ? updated : r));
    };

    const handleSave = async () => {
        setSaving(true);
        setMessage(null);
        try {
            if (activeTab === 'windows') {
                const invalidRule = rules.find((rule) => rule.is_active && timeToMinutes(rule.start_time) >= timeToMinutes(rule.end_time));
                if (invalidRule) {
                    setMessage({
                        type: 'error',
                        text: `Invalid window for ${DAYS[invalidRule.day_of_week]}. Start time must be earlier than end time.`
                    });
                    return;
                }

                const payloadRules = rules.map((rule) => ({
                    ...rule,
                    start_time: normalizeTimeForApi(rule.start_time),
                    end_time: normalizeTimeForApi(rule.end_time),
                }));

                await Promise.all([
                    api.put('/admin/submission-rules', { rules: payloadRules }),
                    api.put('/admin/global-config', globalConfig),
                ]);
            } else {
                const payloadConfigs = notifRules.map((rule) => ({
                    id: Number(rule.id),
                    enabled: Boolean(rule.enabled),
                    send_sms: Boolean(rule.send_sms),
                    send_in_app: Boolean(rule.send_in_app),
                    send_email: Boolean(rule.send_email),
                    message_template: rule.message_template ?? '',
                    repeat_interval_minutes: rule.repeat_interval_minutes ?? null,
                }));
                await api.put('/admin/notification-config', { configs: payloadConfigs });
            }
            setMessage({ type: 'success', text: 'Settings saved successfully.' });
            await fetchAll();
            setTimeout(() => setMessage(null), 4000);
        } catch (err: any) {
            console.error('Save error:', err);
            const detail = err?.response?.data?.message;
            setMessage({ type: 'error', text: detail || 'Failed to save settings.' });
        } finally {
            setSaving(false);
        }
    };

    // Group notification rules by event type
    const groupedNotifRules = notifRules.reduce<Record<string, NotificationRule[]>>((acc, rule) => {
        if (!acc[rule.event_type]) acc[rule.event_type] = [];
        acc[rule.event_type].push(rule);
        return acc;
    }, {});

    if (loading) return (
        <div className="flex items-center justify-center min-h-[50vh]">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
        </div>
    );

    return (
        <div className="max-w-5xl mx-auto py-8 px-4 sm:px-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                <div>
                    <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
                        <Settings size={18} className="text-slate-500" />
                        System Settings
                    </h1>
                    <p className="text-xs text-slate-500 mt-0.5">
                        Control submission windows, visibility delays, SMS targets and message templates.
                    </p>
                </div>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-sm active:scale-[0.98]"
                >
                    {saving ? <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />}
                    {saving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-lg flex items-center gap-2 border text-xs font-medium ${message.type === 'success' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                    {message.type === 'success' ? <CheckCircle2 size={15} /> : <AlertCircle size={15} />}
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-1 mb-6 bg-slate-100 p-1 rounded-xl w-fit">
                {(['windows', 'notifications'] as const).map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        className={`px-5 py-2 rounded-lg text-xs font-bold transition-all ${activeTab === tab ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab === 'windows' ? (
                            <span className="flex items-center gap-1.5"><Clock size={13} /> Submission Windows</span>
                        ) : (
                            <span className="flex items-center gap-1.5"><Bell size={13} /> SMS & Notifications</span>
                        )}
                    </button>
                ))}
            </div>

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 1: Submission Windows */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'windows' && (
                <div className="space-y-5">
                    {/* Global Behaviour Cards — Row 1 */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {/* Delay Visibility */}
                        <div className={`rounded-xl border p-4 transition-all ${globalConfig.delay_visibility === 'true' ? 'border-blue-200 bg-blue-50' : 'border-slate-200 bg-white'}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <EyeOff size={13} className="text-blue-600" />
                                        Delay Dashboard Visibility
                                        <InfoTooltip align="left" text="When ON: requests submitted outside a business window are hidden from Coordinator, HOD, Transport and CEO dashboards until the next window opens. The requester always sees their own request immediately. 'New Request' SMS and notifications are also held and sent when the window opens." />
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                        Requests submitted after office hours are hidden from Coordinator / HOD / Transport / CEO dashboards until the next business window opens.
                                    </p>
                                </div>
                                <Toggle
                                    value={globalConfig.delay_visibility === 'true'}
                                    onChange={(v) => handleGlobalChange('delay_visibility', v)}
                                />
                            </div>
                        </div>

                        {/* Apply to Material */}
                        <div className={`rounded-xl border p-4 transition-all ${globalConfig.applies_to_material === 'true' ? 'border-amber-200 bg-amber-50' : 'border-slate-200 bg-white'} ${!isDelayVisibilityEnabled ? 'opacity-75' : ''}`}>
                            <div className="flex items-start justify-between gap-3">
                                <div>
                                    <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                                        <Eye size={13} className="text-amber-600" />
                                        Apply to Material Requests
                                        <InfoTooltip align="right" text="When ON: the delay and window rules also apply to material transport requests. When OFF: material requests are always visible on dashboards immediately after submission, regardless of the time of day." />
                                    </p>
                                    <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                        Submission window restrictions apply to material transport requests.
                                    </p>
                                </div>
                                <Toggle
                                    value={globalConfig.applies_to_material === 'true'}
                                    onChange={(v) => handleGlobalChange('applies_to_material', v)}
                                    disabled={!isDelayVisibilityEnabled}
                                />
                            </div>
                            {!isDelayVisibilityEnabled && (
                                <p className="mt-2 text-[10px] font-semibold text-slate-500">Enable "Delay Dashboard Visibility" to change this setting.</p>
                            )}
                        </div>
                    </div>

                    {/* Passenger Request Type Controls */}
                    <div className={`bg-white rounded-xl border border-slate-200 overflow-visible shadow-sm ${!isDelayVisibilityEnabled ? 'opacity-75' : ''}`}>
                        <div className="px-5 py-3 border-b border-slate-100 bg-slate-50/60 flex items-center gap-2">
                            <Eye size={14} className="text-indigo-500" />
                            <div>
                                <p className="text-xs font-bold text-slate-800 flex items-center gap-1">
                                    Apply Window to Passenger Request Types
                                    <InfoTooltip align="left" text="Each toggle below controls whether that passenger request subtype is subject to the submission window delay. Enable a subtype to hold its after-hours requests; disable to let them appear on dashboards immediately at any time." />
                                </p>
                                <p className="text-[11px] text-slate-500 mt-0.5">Control which passenger subtypes are subject to submission window restrictions.</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-slate-100">
                            {/* Normal */}
                            <div className={`p-4 transition-all ${globalConfig.applies_to_passenger_normal === 'true' ? 'bg-indigo-50' : 'bg-white'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 flex items-center">Normal
                                            <InfoTooltip align="left" text="Standard planned passenger trips. When ON: requests submitted outside business hours are queued and revealed to coordinators at the next window open time. Keep ON for regular 9-to-5 approval workflows." />
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                            Standard planned trips submitted through the regular request flow.
                                        </p>
                                    </div>
                                    <Toggle
                                        value={globalConfig.applies_to_passenger_normal === 'true'}
                                        onChange={(v) => handleGlobalChange('applies_to_passenger_normal', v)}
                                        disabled={!isDelayVisibilityEnabled}
                                    />
                                </div>
                                {globalConfig.applies_to_passenger_normal === 'true' && (
                                    <span className="mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">Window enforced</span>
                                )}
                            </div>

                            {/* Ad-Hoc */}
                            <div className={`p-4 transition-all ${globalConfig.applies_to_passenger_adhoc === 'true' ? 'bg-indigo-50' : 'bg-white'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 flex items-center">Ad-Hoc
                                            <InfoTooltip text="Urgent, unplanned trips. Recommended to keep OFF so coordinators see these requests immediately — even at midnight — and can action them without waiting for a business window." />
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                            Urgent unplanned trips. Off by default so they always appear immediately.
                                        </p>
                                    </div>
                                    <Toggle
                                        value={globalConfig.applies_to_passenger_adhoc === 'true'}
                                        onChange={(v) => handleGlobalChange('applies_to_passenger_adhoc', v)}
                                        disabled={!isDelayVisibilityEnabled}
                                    />
                                </div>
                                {globalConfig.applies_to_passenger_adhoc !== 'true' && (
                                    <span className="mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Always visible</span>
                                )}
                            </div>

                            {/* Special */}
                            <div className={`p-4 transition-all ${globalConfig.applies_to_passenger_special === 'true' ? 'bg-indigo-50' : 'bg-white'}`}>
                                <div className="flex items-start justify-between gap-3">
                                    <div>
                                        <p className="text-xs font-bold text-slate-800 flex items-center">Special
                                            <InfoTooltip align="right" text="Special-clearance passenger trips. Recommended to keep OFF so they are always visible immediately and can be processed without waiting for the next business window." />
                                        </p>
                                        <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                                            Special-clearance trips. Off by default so they always appear immediately.
                                        </p>
                                    </div>
                                    <Toggle
                                        value={globalConfig.applies_to_passenger_special === 'true'}
                                        onChange={(v) => handleGlobalChange('applies_to_passenger_special', v)}
                                        disabled={!isDelayVisibilityEnabled}
                                    />
                                </div>
                                {globalConfig.applies_to_passenger_special !== 'true' && (
                                    <span className="mt-2 inline-block text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Always visible</span>
                                )}
                            </div>
                        </div>
                        {!isDelayVisibilityEnabled && (
                            <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 text-[11px] text-slate-600 font-medium">
                                Passenger window toggles are locked while "Delay Dashboard Visibility" is OFF.
                            </div>
                        )}
                    </div>

                    {/* How it works info */}
                    {globalConfig.delay_visibility === 'true' && (
                        <div className="flex items-start gap-3 p-4 bg-blue-50 border border-blue-100 rounded-xl text-xs text-blue-800">
                            <Info size={16} className="shrink-0 mt-0.5" />
                            <div>
                                <p className="font-bold mb-1">How visibility delay works</p>
                                <ol className="list-decimal list-inside space-y-1 text-[11px] text-blue-700">
                                    <li>Staff submits a request after the end time (e.g. 11 PM).</li>
                                    <li>The request is saved immediately — the submitter sees it in "My Requests" right away.</li>
                                    <li>The Coordinator, HOD, Transport Officer and CEO see nothing until the next business window opens (e.g. 8 AM tomorrow).</li>
                                    <li>At 8 AM, the server reveals the request in all dashboards and fires the SMS/notifications.</li>
                                </ol>
                            </div>
                        </div>
                    )}

                    {/* Per-Day Window Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-visible shadow-sm">
                        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 flex items-center gap-3">
                            <Clock size={16} className="text-blue-500" />
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Submission Windows by Day</h2>
                                <p className="text-[11px] text-slate-500 mt-0.5">Set which days and times staff can submit requests. UTC+5:30.</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">Day</th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <span className="flex items-center gap-1">Open
                                                <InfoTooltip align="left" text="Toggle ON to allow submissions on this day. When OFF the day is closed — any request submitted on a closed day is held and only revealed on dashboards when the next open window starts." />
                                            </span>
                                        </th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <span className="flex items-center gap-1">Window Start
                                                <InfoTooltip text="Requests submitted from this time onward are immediately visible on dashboards. Requests submitted before this time (earlier in the day) were queued and revealed at this opening time." />
                                            </span>
                                        </th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <span className="flex items-center gap-1">Window End
                                                <InfoTooltip text="After this time, newly submitted requests are held and not shown on approval dashboards until the next window opens (usually the next business day at Window Start time)." />
                                            </span>
                                        </th>
                                        <th className="px-5 py-3 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                            <span className="flex items-center gap-1">Status
                                                <InfoTooltip align="right" text="Green badge shows the active time range during which submissions appear on dashboards immediately. 'Closed' means no business window is active for this day." />
                                            </span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {rules.map((rule, index) => (
                                        <tr key={rule.day_of_week} className="hover:bg-slate-50/50 transition-colors">
                                            <td className="px-5 py-3">
                                                <div className="flex items-center gap-2">
                                                    <Calendar size={13} className="text-slate-400" />
                                                    <span className="text-sm font-semibold text-slate-700">{DAYS[rule.day_of_week]}</span>
                                                </div>
                                            </td>
                                            <td className="px-5 py-3">
                                                <Toggle
                                                    value={rule.is_active}
                                                    onChange={(v) => handleRuleChange(index, 'is_active', v)}
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                <TimeInput
                                                    value={rule.start_time}
                                                    onChange={(value) => handleRuleChange(index, 'start_time', value)}
                                                    disabled={!rule.is_active}
                                                    label="start time"
                                                    ariaLabel={`Select start time for ${DAYS[rule.day_of_week]}`}
                                                    className="w-36"
                                                    inputClassName="w-36 py-1.5 text-xs"
                                                    menuClassName="p-1"
                                                    optionClassName="text-[11px]"
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                <TimeInput
                                                    value={rule.end_time}
                                                    onChange={(value) => handleRuleChange(index, 'end_time', value)}
                                                    disabled={!rule.is_active}
                                                    label="end time"
                                                    ariaLabel={`Select end time for ${DAYS[rule.day_of_week]}`}
                                                    className="w-36"
                                                    inputClassName="w-36 py-1.5 text-xs"
                                                    menuClassName="p-1"
                                                    optionClassName="text-[11px]"
                                                />
                                            </td>
                                            <td className="px-5 py-3">
                                                {rule.is_active ? (
                                                    <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-100">
                                                        {rule.start_time.slice(0, 5)} – {rule.end_time.slice(0, 5)}
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-semibold text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">Closed</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════ */}
            {/* TAB 2: SMS & Notifications */}
            {/* ═══════════════════════════════════════════════════════════════ */}
            {activeTab === 'notifications' && (
                <div className="space-y-6">
                    {/* Legend */}
                    <div className="flex flex-wrap gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-[11px] font-medium text-slate-600">
                        <span className="flex items-center gap-1.5"><Smartphone size={12} className="text-emerald-600" /> SMS — sends a text message to user&apos;s mobile</span>
                        <span className="flex items-center gap-1.5"><Bell size={12} className="text-blue-600" /> In-App — creates a bell notification inside TMS</span>
                        <span className="flex items-center gap-1.5"><Mail size={12} className="text-violet-600" /> Email — sends an email (special requests only: CEO &amp; Transport)</span>
                        <span className="flex items-center gap-1.5"><Zap size={12} className="text-slate-400" /> Toggle row on/off without losing settings</span>
                        <span className="flex items-center gap-1.5"><MessageSquare size={12} className="text-slate-400" /> Edit message — customise the SMS / notification text</span>
                    </div>

                    <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start gap-2 text-[11px] text-amber-800">
                        <Info size={14} className="shrink-0 mt-0.5" />
                        <span>SMS is only sent if the user has a <strong>mobile number</strong> stored in their TMS profile. Users without a mobile will still receive in-app notifications.</span>
                    </div>

                    {/* CEO Notifications Summary */}
                    <div className="rounded-xl border border-violet-200 bg-violet-50/60 overflow-visible">
                        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-violet-200 bg-violet-100/60">
                            <span className="text-[11px] font-bold text-violet-800 uppercase tracking-wide">CEO Notifications</span>
                            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-violet-200 text-violet-800">Special Requests Only</span>
                        </div>
                        <div className="px-4 py-3 space-y-1.5 text-[11px] text-violet-900">
                            <p className="font-medium text-violet-700 mb-2">CEO only receives notifications relevant to his role — special requests only.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                <div className="flex items-start gap-2 bg-white/70 border border-violet-100 rounded-lg px-3 py-2">
                                    <Mail size={12} className="text-violet-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-violet-800">Special Request Submitted</p>
                                        <p className="text-violet-600 mt-0.5">CEO receives an email when a special request is submitted — before it reaches him/her for approval.</p>
                                    </div>
                                </div>
                                <div className="flex items-start gap-2 bg-white/70 border border-violet-100 rounded-lg px-3 py-2">
                                    <Bell size={12} className="text-violet-500 mt-0.5 shrink-0" />
                                    <div>
                                        <p className="font-bold text-violet-800">Special Request Submitted (In-App &amp; SMS)</p>
                                        <p className="text-violet-600 mt-0.5">CEO receives an in-app notification and SMS only for <strong>special</strong> requests. Normal requests are never sent, even if the CEO row is enabled.</p>
                                    </div>
                                </div>
                            </div>
                            <p className="text-violet-500 pt-1">All other events — verified, approved, allocated, completed — are never sent to the CEO.</p>
                        </div>
                    </div>

                    {/* Events */}
                    {Object.entries(EVENT_LABELS).map(([eventKey, meta]) => {
                        // CEO does not receive REQUEST_APPROVED notifications (they act as approver, not observer)
                        const rows = (groupedNotifRules[eventKey] ?? []).filter(rule =>
                            !(eventKey === 'REQUEST_APPROVED' && rule.target_role === 'CEO')
                        );
                        if (rows.length === 0) return null;

                        const enabledCount = rows.filter(r => r.enabled).length;
                        const smsCount = rows.filter(r => r.enabled && r.send_sms).length;

                        return (
                            <div key={eventKey} className="bg-white rounded-xl border border-slate-200 overflow-visible shadow-sm">
                                {/* Event Header */}
                                <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-4 bg-slate-50/60">
                                    <div className="flex items-center gap-3 flex-wrap">
                                        <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${meta.color}`}>
                                            {meta.label}
                                        </span>
                                        <p className="text-[11px] text-slate-500">{meta.description}</p>
                                        {eventKey === 'NEW_REQUEST' && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 flex items-center gap-1">
                                                <Clock size={9} /> Window-gated
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2 shrink-0">
                                        {smsCount > 0 && (
                                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 flex items-center gap-1">
                                                <Smartphone size={9} /> {smsCount} SMS
                                            </span>
                                        )}
                                        <span className="text-[10px] text-slate-400 font-medium">{enabledCount}/{rows.length} active</span>
                                    </div>
                                </div>

                                {/* Rules */}
                                <div className="p-3 space-y-2">
                                    {rows.map(rule => (
                                        <NotificationRuleRow
                                            key={rule.id}
                                            rule={rule}
                                            onChange={handleNotifChange}
                                        />
                                    ))}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default AdminSystemSettings;
