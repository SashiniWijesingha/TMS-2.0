import { VehicleRequest, RequestStatus } from '../models/VehicleRequest';
import { Allocation } from '../models/Allocation';
import { Driver } from '../models/Driver';
import { User } from '../models/User';
import { Role, RoleType } from '../models/Role';
import { Notification } from '../models/Notification';
import { NotificationConfig, NotificationEventType, NotificationTargetRole } from '../models/NotificationConfig';
import { NotificationService, renderTemplate } from './notificationService';
import { sendSMS } from './smsService';
import { Op } from 'sequelize';
import hrisSequelize from '../config/hrisDatabase';

const lastReminderSent = new Map<number, number>();
const lastAdhocReminderSent = new Map<string, number>(); // key: `${requestId}-${role}`
const NOTIFICATION_RETENTION_DAYS = 7;

// ─────────────────────────────────────────────────────────────────────────────
// Morning Reveal Job
// Fires every 2 minutes. Finds requests whose visible_from has passed but whose
// "new request" notifications haven't been sent yet (sms_queued = true).
// Once fired, marks sms_queued = false so it never fires twice.
// ─────────────────────────────────────────────────────────────────────────────
async function runMorningRevealJob() {
    try {
        const now = new Date();
        const queued = await VehicleRequest.findAll({
            where: {
                sms_queued: true,
                visible_from: { [Op.lte]: now },
            },
        });

        if (queued.length > 0) {
            console.log(`[MorningReveal] ${queued.length} request(s) becoming visible — sending notifications.`);
        }

        for (const req of queued) {
            try {
                await NotificationService.fireQueuedNewRequest(req);
                await req.update({ sms_queued: false });
            } catch (err) {
                console.error(`[MorningReveal] Failed for request #${req.id}:`, err);
            }
        }
    } catch (e) {
        console.error('[MorningReveal] Job error:', e);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Driver Reminder Job (existing — unchanged logic)
// ─────────────────────────────────────────────────────────────────────────────
async function runDriverReminderJob() {
    try {
        const tenMinsAgo = new Date(Date.now() - 10 * 60 * 1000);

        const pendingRequests = await VehicleRequest.findAll({
            where: {
                status: RequestStatus.ALLOCATED,
                updatedAt: { [Op.lt]: tenMinsAgo },
            },
            include: [{ model: Allocation, include: [{ model: Driver, include: [{ model: User }] }] }],
        });

        const driverRule = await NotificationConfig.findOne({
            where: { event_type: NotificationEventType.DRIVER_REMINDER, target_role: NotificationTargetRole.DRIVER },
        });

        for (const req of pendingRequests) {
            const now = Date.now();
            const lastSent = lastReminderSent.get(req.id) || 0;

            if (now - lastSent > (driverRule?.repeat_interval_minutes ?? 15) * 60 * 1000) {
                if (driverRule && !driverRule.enabled) continue;

                const driver = req.allocation?.driver;
                if (driver) {
                    const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
                    const vars = { job_number: req.job_number ?? '', request_id: String(req.id), recipient_name: driver.user?.name ?? driver.nic_no ?? '', trip_link: frontendUrl ? `${frontendUrl}/driver` : '', request_link: frontendUrl ? `${frontendUrl}/requests/${req.id}` : '' };
                    const template = driverRule?.message_template ?? 'URGENT REMINDER: Please accept your assigned trip (Job #{{job_number}}) in the TMS Driver Portal immediately.';
                    const message = renderTemplate(template, vars);

                    if ((!driverRule || driverRule.send_sms) && driver.user?.mobile) {
                        await sendSMS(driver.user.mobile, message);
                    }
                    if ((!driverRule || driverRule.send_in_app) && driver.user_id) {
                        await Notification.create({ user_id: driver.user_id, request_id: req.id, message, is_read: false });
                    }
                    lastReminderSent.set(req.id, now);
                }
            }
        }
    } catch (e) {
        console.error('[ReminderService] Driver reminder error:', e);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// AD-HOC Urgent Reminder Job
// Fires every 2 minutes. Finds AD-HOC requests stuck in approval stages and
// sends urgent SMS + in-app reminders to the role currently responsible.
// Reminders repeat every 5 minutes until the request moves to the next stage.
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_TO_TARGET_ROLE: Record<string, { role: RoleType; divisionScoped: boolean }> = {
    [RequestStatus.PENDING_COORDINATOR]: { role: RoleType.COORDINATOR, divisionScoped: true },
    [RequestStatus.PENDING_HOD]:         { role: RoleType.HOD,         divisionScoped: true },
    [RequestStatus.APPROVED]:            { role: RoleType.TRANSPORT,   divisionScoped: false },
};

async function runAdhocReminderJob() {
    try {
        const adhocRequests = await VehicleRequest.findAll({
            where: {
                is_adhoc: true,
                status: [
                    RequestStatus.PENDING_COORDINATOR,
                    RequestStatus.PENDING_HOD,
                    RequestStatus.APPROVED,
                ],
            },
        });

        if (adhocRequests.length === 0) return;

        const now = Date.now();

        for (const req of adhocRequests) {
            const target = STATUS_TO_TARGET_ROLE[req.status];
            if (!target) continue;

            const reminderKey = `${req.id}-${target.role}`;
            const lastSent = lastAdhocReminderSent.get(reminderKey) || 0;

            const adhocRule = await NotificationConfig.findOne({
                where: { event_type: NotificationEventType.ADHOC_REMINDER, target_role: target.role.toUpperCase() as NotificationTargetRole },
            });

            const intervalMs = (adhocRule?.repeat_interval_minutes ?? 5) * 60 * 1000;
            if (now - lastSent < intervalMs) continue;

            const ruleEnabled = !adhocRule || adhocRule.enabled;
            if (!ruleEnabled) continue;

            const whereClause: any = {};
            if (target.divisionScoped && req.division_id) {
                whereClause.division_id = req.division_id;
            }

            const users = await User.findAll({
                where: whereClause,
                include: [{ model: Role, where: { name: target.role } }],
            });

            const defaultTemplate = 'URGENT: Ad-Hoc request #{{request_id}} (Job: {{job_number}}) requires your immediate action. Please review and process in TMS now.';
            const baseVars = { request_id: String(req.id), job_number: req.job_number ?? 'N/A' };

            for (const user of users) {
                const message = renderTemplate(adhocRule?.message_template ?? defaultTemplate, { ...baseVars, recipient_name: user.name ?? '' });
                if (adhocRule?.send_in_app ?? true) {
                    try {
                        await Notification.create({
                            user_id: user.id,
                            request_id: req.id,
                            message,
                            is_read: false,
                        });
                    } catch (err) {
                        console.error(`[AdhocReminder] In-app notification failed for user ${user.id}:`, err);
                    }
                }

                if ((adhocRule?.send_sms ?? true) && user.mobile) {
                    try {
                        await sendSMS(user.mobile, message);
                    } catch (err) {
                        console.error(`[AdhocReminder] SMS failed for user ${user.id}:`, err);
                    }
                }
            }

            if (users.length > 0) {
                console.log(`[AdhocReminder] Sent urgent reminders for AD-HOC #${req.id} to ${users.length} ${target.role}(s)`);
            }

            lastAdhocReminderSent.set(reminderKey, now);
        }
    } catch (e) {
        console.error('[AdhocReminder] Job error:', e);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Notification Cleanup Job
// Removes notifications older than retention window to prevent unbounded growth.
// ─────────────────────────────────────────────────────────────────────────────
async function runNotificationCleanupJob() {
    try {
        const cutoffDate = new Date(Date.now() - NOTIFICATION_RETENTION_DAYS * 24 * 60 * 60 * 1000);
        const deletedCount = await Notification.destroy({
            where: {
                createdAt: { [Op.lt]: cutoffDate },
            },
        });

        if (deletedCount > 0) {
            console.log(`[NotificationCleanup] Deleted ${deletedCount} notification(s) older than ${NOTIFICATION_RETENTION_DAYS} days.`);
        }
    } catch (e) {
        console.error('[NotificationCleanup] Job error:', e);
    }
}

export const startDriverReminders = () => {
    console.log('[ReminderService] Starting driver reminder cron (5 min), morning reveal cron (2 min), adhoc reminder cron (2 min), notification cleanup cron (24 hrs)...');

    // Morning reveal: check every 2 minutes
    setInterval(runMorningRevealJob, 2 * 60 * 1000);
    runMorningRevealJob(); // also run once on startup to catch any backlog

    // AD-HOC urgent reminder: check every 2 minutes
    setInterval(runAdhocReminderJob, 2 * 60 * 1000);

    // Driver reminder: check every 5 minutes
    setInterval(runDriverReminderJob, 5 * 60 * 1000);

    // Notification cleanup: run every 24 hours
    setInterval(runNotificationCleanupJob, 24 * 60 * 60 * 1000);
    runNotificationCleanupJob(); // run once on startup to trim backlog

    // Departed employee cleanup: run every 24 hours at night
    setInterval(runDepartedEmployeeCleanupJob, 24 * 60 * 60 * 1000);
    runDepartedEmployeeCleanupJob(); // run once on startup
};

async function runDepartedEmployeeCleanupJob() {
    try {
        console.log('[ReminderService] Running nightly departed-employee account cleanup...');

        // Fetch all active HRIS emails from EMB_DB
        const [hrisRows] = await (hrisSequelize as any).query('SELECT Email_Address FROM EMB_DB WHERE Email_Address IS NOT NULL');
        const activeEmails = new Set((hrisRows as any[]).map((r: any) => (r.Email_Address || '').trim().toLowerCase()));

        // Find all TMS users linked to HRIS whose email is no longer in EMB_DB
        const staleUsers = await User.findAll({ where: { account_type: 'HRIS' } });
        const toDelete = staleUsers.filter(u => u.email && !activeEmails.has(u.email.trim().toLowerCase()));

        if (toDelete.length === 0) {
            console.log('[ReminderService] Departed-employee cleanup: no stale accounts found.');
            return;
        }

        for (const u of toDelete) {
            await u.destroy();
            console.log(`[ReminderService] Removed departed employee TMS account: ${u.email}`);
        }

        console.log(`[ReminderService] Departed-employee cleanup complete. Removed ${toDelete.length} stale account(s).`);
    } catch (err) {
        console.error('[ReminderService] Departed-employee cleanup job failed:', err);
    }
}

