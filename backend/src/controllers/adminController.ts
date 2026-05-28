import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { SystemConfig } from '../models/SystemConfig';
import { Division } from '../models/Division';
import { Role } from '../models/Role';
import { NotificationConfig, NotificationEventType, NotificationTargetRole, DEFAULT_NOTIFICATION_CONFIG } from '../models/NotificationConfig';
import { GlobalConfig, GLOBAL_CONFIG_DEFAULTS } from '../models/GlobalConfig';

const DEFAULT_WINDOW_START = '08:00:00';
const DEFAULT_WINDOW_END = '16:00:00';

function normalizeTimeInput(value: unknown, fallback: string): string {
    if (typeof value !== 'string') return fallback;
    const trimmed = value.trim();
    const match = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(trimmed);
    if (!match) return fallback;

    const h = Number(match[1]);
    const m = Number(match[2]);
    const s = Number(match[3] ?? '0');

    if (!Number.isInteger(h) || !Number.isInteger(m) || !Number.isInteger(s)) return fallback;
    if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return fallback;

    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function timeToSeconds(value: string): number {
    const [h, m, s] = value.split(':').map(Number);
    return (h * 3600) + (m * 60) + (s || 0);
}

function normalizeBooleanString(value: unknown): 'true' | 'false' | null {
    if (typeof value === 'boolean') return value ? 'true' : 'false';
    if (typeof value === 'string') {
        const normalized = value.trim().toLowerCase();
        if (normalized === 'true') return 'true';
        if (normalized === 'false') return 'false';
    }
    return null;
}

export const updateSubmissionRules = async (req: AuthRequest, res: Response) => {
    try {
        const { rules } = req.body as {
            rules: Array<{
                day_of_week: number;
                start_time: string;
                end_time: string;
                is_active: boolean;
            }>;
        }; // Array of { day_of_week, start_time, end_time, is_active }

        if (!Array.isArray(rules) || rules.length === 0) {
            return res.status(400).json({ message: 'Invalid format. Expected array of rules.' });
        }

        const seenDays = new Set<number>();
        for (const rule of rules) {
            const day = Number(rule.day_of_week);
            const isActive = Boolean(rule.is_active);
            const startTime = normalizeTimeInput(rule.start_time, DEFAULT_WINDOW_START);
            const endTime = normalizeTimeInput(rule.end_time, DEFAULT_WINDOW_END);

            if (!Number.isInteger(day) || day < 0 || day > 6) {
                return res.status(400).json({ message: `Invalid day_of_week: ${rule.day_of_week}. Expected 0-6.` });
            }

            if (seenDays.has(day)) {
                return res.status(400).json({ message: `Duplicate day_of_week received: ${day}.` });
            }
            seenDays.add(day);

            if (isActive && timeToSeconds(startTime) >= timeToSeconds(endTime)) {
                return res.status(400).json({
                    message: `Invalid submission window for day ${day}. start_time must be earlier than end_time.`
                });
            }

            await SystemConfig.upsert({
                day_of_week: day,
                start_time: startTime,
                end_time: endTime,
                is_active: isActive,
            });
        }

        res.json({ message: 'Submission rules updated successfully' });
    } catch (error) {
        console.error('Update rules error:', error);
        res.status(500).json({ message: 'Failed to update rules' });
    }
};

export const getSubmissionRules = async (req: AuthRequest, res: Response) => {
    try {
        const rules = await SystemConfig.findAll({ order: [['day_of_week', 'ASC']] });
        const map = new Map(rules.map((rule) => [rule.day_of_week, rule]));

        const normalized = Array.from({ length: 7 }, (_, day) => {
            const row = map.get(day);
            if (row) return row;
            return {
                day_of_week: day,
                start_time: DEFAULT_WINDOW_START,
                end_time: DEFAULT_WINDOW_END,
                is_active: true,
            };
        });

        res.json(normalized);
    } catch (error) {
        console.error('Get rules error:', error);
        res.status(500).json({ message: 'Failed to fetch rules' });
    }
};

export const createDivision = async (req: AuthRequest, res: Response) => {
    try {
        const { name, parent_id } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Division name is required' });
        }

        const division = await Division.create({
            name,
            parent_id: parent_id || null
        });

        res.status(201).json({ message: 'Division created', division });
    } catch (error) {
        console.error('Create division error:', error);
        res.status(500).json({ message: 'Failed to create division' });
    }
};

export const createRole = async (req: AuthRequest, res: Response) => {
    try {
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Role name is required' });
        }

        // Note: Creating a role here adds it to DB, but permissions are code-based.
        // This is useful for labeling new types of staff.
        const role = await Role.create({ name });

        res.status(201).json({ message: 'Role created', role });
    } catch (error) {
        console.error('Create role error:', error);
        res.status(500).json({ message: 'Failed to create role' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// NOTIFICATION CONFIG
// ─────────────────────────────────────────────────────────────────────────────

async function seedNotificationConfigDefaults() {
    for (const def of DEFAULT_NOTIFICATION_CONFIG) {
        await NotificationConfig.findOrCreate({
            where: { event_type: def.event_type, target_role: def.target_role },
            defaults: def as any,
        });
    }
}

export const getNotificationConfig = async (req: AuthRequest, res: Response) => {
    try {
        // Backfill any missing default rows while preserving customized existing rows.
        await seedNotificationConfigDefaults();

        const eventOrder = Object.values(NotificationEventType);
        const roleOrder = Object.values(NotificationTargetRole);

        const configs = await NotificationConfig.findAll({
            order: [['event_type', 'ASC'], ['target_role', 'ASC']],
        });

        const ordered = [...configs].sort((a, b) => {
            const eventDiff = eventOrder.indexOf(a.event_type) - eventOrder.indexOf(b.event_type);
            if (eventDiff !== 0) return eventDiff;
            return roleOrder.indexOf(a.target_role) - roleOrder.indexOf(b.target_role);
        });

        res.json(ordered);
    } catch (error) {
        console.error('Get notification config error:', error);
        res.status(500).json({ message: 'Failed to fetch notification configuration' });
    }
};

export const updateNotificationConfig = async (req: AuthRequest, res: Response) => {
    try {
        const { configs } = req.body as {
            configs: {
                id: number;
                enabled: boolean;
                send_sms: boolean;
                send_in_app: boolean;
                send_email: boolean;
                message_template: string;
                repeat_interval_minutes?: number | null;
            }[];
        };

        if (!Array.isArray(configs)) {
            return res.status(400).json({ message: 'Expected array of configs' });
        }

        const invalidIds: number[] = [];

        for (const c of configs) {
            const id = Number(c.id);
            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({ message: 'Each config must include a valid integer id.' });
            }

            const existing = await NotificationConfig.findByPk(id);
            if (!existing) {
                invalidIds.push(id);
                continue;
            }

            const enabled = Boolean(c.enabled);
            const sendSms = Boolean(c.send_sms);
            const sendInApp = Boolean(c.send_in_app);
            const sendEmail = Boolean(c.send_email);
            const messageTemplate = typeof c.message_template === 'string' ? c.message_template.trim() : '';

            let repeatIntervalMinutes: number | null = null;
            if (c.repeat_interval_minutes != null) {
                const parsed = Number(c.repeat_interval_minutes);
                if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 1440) {
                    repeatIntervalMinutes = parsed;
                }
            }

            await NotificationConfig.update(
                {
                    enabled,
                    send_sms: sendSms,
                    send_in_app: sendInApp,
                    send_email: sendEmail,
                    message_template: messageTemplate,
                    repeat_interval_minutes: repeatIntervalMinutes,
                },
                { where: { id } }
            );
        }

        if (invalidIds.length > 0) {
            return res.status(400).json({ message: `Unknown notification config ids: ${invalidIds.join(', ')}` });
        }

        res.json({ message: 'Notification configuration saved successfully' });
    } catch (error) {
        console.error('Update notification config error:', error);
        res.status(500).json({ message: 'Failed to update notification configuration' });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL CONFIG
// ─────────────────────────────────────────────────────────────────────────────

async function seedGlobalConfigDefaults() {
    for (const [key, value] of Object.entries(GLOBAL_CONFIG_DEFAULTS)) {
        await GlobalConfig.findOrCreate({ where: { key }, defaults: { key, value } });
    }
}

export const getGlobalConfig = async (req: AuthRequest, res: Response) => {
    try {
        // Ensure missing default keys are always available, even in partially populated DBs.
        await seedGlobalConfigDefaults();
        const rows = await GlobalConfig.findAll();

        // Return as a plain object map for easy consumption on frontend
        const map: Record<string, string> = { ...GLOBAL_CONFIG_DEFAULTS };
        for (const row of rows) {
            map[row.key] = row.value ?? '';
        }

        res.json(map);
    } catch (error) {
        console.error('Get global config error:', error);
        res.status(500).json({ message: 'Failed to fetch global configuration' });
    }
};

export const updateGlobalConfig = async (req: AuthRequest, res: Response) => {
    try {
        const settings = req.body as Record<string, string>;
        const allowedKeys = new Set(Object.keys(GLOBAL_CONFIG_DEFAULTS));

        for (const key of Object.keys(settings)) {
            if (!allowedKeys.has(key)) {
                return res.status(400).json({ message: `Unknown global config key: ${key}` });
            }
        }

        for (const [key, value] of Object.entries(settings)) {
            const defaultValue = GLOBAL_CONFIG_DEFAULTS[key];
            const numericDefault = Number(defaultValue);
            const expectsNumeric = Number.isFinite(numericDefault);

            if (expectsNumeric) {
                const parsed = Number(value);
                if (!Number.isFinite(parsed)) {
                    return res.status(400).json({ message: `Invalid value for ${key}. Expected a number.` });
                }
                await GlobalConfig.upsert({ key, value: String(parsed) });
            } else {
                const normalized = normalizeBooleanString(value);
                if (!normalized) {
                    return res.status(400).json({ message: `Invalid value for ${key}. Expected true/false.` });
                }
                await GlobalConfig.upsert({ key, value: normalized });
            }
        }

        res.json({ message: 'Global configuration saved successfully' });
    } catch (error) {
        console.error('Update global config error:', error);
        res.status(500).json({ message: 'Failed to update global configuration' });
    }
};

