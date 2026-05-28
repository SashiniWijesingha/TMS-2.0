import { Notification } from '../models/Notification';
import { VehicleRequest } from '../models/VehicleRequest';
import { User } from '../models/User';
import { Driver } from '../models/Driver';
import { Vehicle } from '../models/Vehicle';
import { Role, RoleType } from '../models/Role';
import { NotificationConfig, NotificationEventType, NotificationTargetRole } from '../models/NotificationConfig';
import { Division } from '../models/Division';
import { sendSMS } from './smsService';
import { sendPushToUser } from './webPushService';
import { sendSpecialRequestCEOEmail, sendSpecialRequestApprovedTransportEmail } from '../utils/mailer';

// ─────────────────────────────────────────────────────────────────────────────
// Placeholder replacement helper
// ─────────────────────────────────────────────────────────────────────────────
export function renderTemplate(template: string, vars: Record<string, string>): string {
    return template.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? `{{${key}}}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// Core fire-event helper: reads NotificationConfig and dispatches SMS/in-app
// ─────────────────────────────────────────────────────────────────────────────
async function fireEvent(
    eventType: NotificationEventType,
    request: VehicleRequest,
    extras: {
        vehicle?: Vehicle;
        driver?: Driver;
        vendorName?: string;
        vendorContact?: string;
    } = {}
) {
    try {
        const rules = await NotificationConfig.findAll({
            where: { event_type: eventType, enabled: true },
        });

        if (rules.length === 0) return;

        // Build template variable map
        const division = await Division.findByPk(request.division_id);
        const requester = await User.findByPk(request.requested_by);

        // Ensure driver's User association is loaded so we can render driver_name correctly
        let resolvedDriver = extras.driver ?? null;
        if (resolvedDriver && !resolvedDriver.user && resolvedDriver.user_id) {
            resolvedDriver = await Driver.findByPk(resolvedDriver.id, { include: [User] }) ?? resolvedDriver;
        }

        const frontendUrl = (process.env.FRONTEND_URL || '').replace(/\/$/, '');
        const vars: Record<string, string> = {
            request_id: String(request.id),
            requester: requester?.name ?? 'Unknown',
            division: division?.name ?? 'Unknown',
            job_number: request.job_number ?? '',
            type: request.request_type?.toLowerCase() ?? 'request',
            vehicle_number: extras.vehicle?.vehicle_number ?? '',
            driver_name: resolvedDriver?.user?.name ?? resolvedDriver?.nic_no ?? '',
            driver_contact: resolvedDriver?.user?.mobile ?? '',
            vendor_name: extras.vendorName ?? '',
            vendor_contact: extras.vendorContact ?? '',
            trip_link: frontendUrl ? `${frontendUrl}/driver` : '',
            request_link: frontendUrl ? `${frontendUrl}/requests/${request.id}` : '',
        };

        for (const rule of rules) {
            const template = rule.message_template || '';

            // Special requests bypass coordinator & HOD entirely
            if (request.is_special && (
                rule.target_role === NotificationTargetRole.COORDINATOR ||
                rule.target_role === NotificationTargetRole.HOD
            )) continue;

            // CEO only receives notifications for special requests.
            // - NEW_REQUEST → CEO: only fire for special requests
            // - REQUEST_APPROVED → CEO: never fire (CEO is the approver, not an observer)
            if (rule.target_role === NotificationTargetRole.CEO) {
                if (eventType === NotificationEventType.REQUEST_APPROVED) continue;
                if (eventType === NotificationEventType.NEW_REQUEST && !request.is_special) continue;
            }

            if (rule.target_role === NotificationTargetRole.REQUESTER) {
                const message = renderTemplate(template, { ...vars, recipient_name: requester?.name ?? '' });
                if (rule.send_in_app) {
                    await createInAppNotification(request.requested_by, request.id, message);
                }
                if (rule.send_sms && requester?.mobile) {
                    await sendSMS(requester.mobile, message);
                }

            } else if (rule.target_role === NotificationTargetRole.COORDINATOR) {
                await notifyUsersWithRole(RoleType.COORDINATOR, request.division_id, request.id, template, vars, rule.send_sms, rule.send_in_app);

            } else if (rule.target_role === NotificationTargetRole.HOD) {
                await notifyUsersWithRole(RoleType.HOD, request.division_id, request.id, template, vars, rule.send_sms, rule.send_in_app);

            } else if (rule.target_role === NotificationTargetRole.TRANSPORT) {
                await notifyUsersWithRole(RoleType.TRANSPORT, null, request.id, template, vars, rule.send_sms, rule.send_in_app);

            } else if (rule.target_role === NotificationTargetRole.CEO) {
                await notifyUsersWithRole(RoleType.CEO, null, request.id, template, vars, rule.send_sms, rule.send_in_app);

            } else if (rule.target_role === NotificationTargetRole.DRIVER) {
                if (resolvedDriver) {
                    const message = renderTemplate(template, { ...vars, recipient_name: resolvedDriver.user?.name ?? resolvedDriver.nic_no ?? '' });
                    if (rule.send_in_app && resolvedDriver.user_id) {
                        await createInAppNotification(resolvedDriver.user_id, request.id, message);
                    }
                    if (rule.send_sms && resolvedDriver.user?.mobile) {
                        await sendSMS(resolvedDriver.user.mobile, message);
                    }
                }
            }
        }
    } catch (err) {
        console.error(`[NotificationService] fireEvent(${eventType}) error:`, err);
    }
}

async function notifyUsersWithRole(
    roleName: RoleType,
    divisionId: number | null | undefined,
    requestId: number,
    template: string,
    baseVars: Record<string, string>,
    sendSMSFlag: boolean,
    sendInApp: boolean
) {
    const whereClause: any = {};
    if (divisionId) whereClause.division_id = divisionId;

    const users = await User.findAll({
        where: whereClause,
        include: [{ model: Role, where: { name: roleName } }],
    });

    for (const user of users) {
        const message = renderTemplate(template, { ...baseVars, recipient_name: user.name ?? '' });
        if (sendInApp) {
            await createInAppNotification(user.id, requestId, message);
        }
        if (sendSMSFlag && user.mobile) {
            await sendSMS(user.mobile, message);
        }
    }
}

async function createInAppNotification(userId: number, requestId: number, message: string) {
    try {
        await Notification.create({
            user_id: userId,
            request_id: requestId,
            message,
            is_read: false,
        });
        // Fire push notification alongside in-app (skips silently if VAPID not configured)
        sendPushToUser(userId, 'TMS Notification', message, `/requests/${requestId}`).catch(
            (err) => console.error('[NotificationService] Push failed:', err)
        );
    } catch (err) {
        console.error('[NotificationService] createInAppNotification error:', err);
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Private email helpers for special requests — gated by existing config rules
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Emails all CEO users about a new special request.
 * Gated: only fires if the NEW_REQUEST → CEO notification rule is enabled in Admin settings.
 */
async function emailCEOForSpecialRequest(request: VehicleRequest) {
    const rule = await NotificationConfig.findOne({
        where: {
            event_type: NotificationEventType.NEW_REQUEST,
            target_role: NotificationTargetRole.CEO,
        },
    });
    if (!rule?.send_email) return; // Admin has turned off the Email toggle for CEO new-request notifications

    const [division, requester, ceoUsers] = await Promise.all([
        Division.findByPk(request.division_id),
        User.findByPk(request.requested_by),
        User.findAll({ include: [{ model: Role, where: { name: RoleType.CEO } }] }),
    ]);

    for (const ceo of ceoUsers) {
        if (ceo.email) {
            await sendSpecialRequestCEOEmail(
                ceo.email,
                request.id,
                requester?.name ?? 'Unknown',
                division?.name ?? 'Unknown',
                request.special_justification ?? ''
            ).catch(err => console.error('[Mailer] CEO special request email failed:', err));
        }
    }
}

/**
 * Emails all Transport users when the CEO approves a special request.
 * Gated: only fires if the REQUEST_APPROVED → TRANSPORT notification rule is enabled in Admin settings.
 */
async function emailTransportForSpecialApproval(request: VehicleRequest) {
    const rule = await NotificationConfig.findOne({
        where: {
            event_type: NotificationEventType.REQUEST_APPROVED,
            target_role: NotificationTargetRole.TRANSPORT,
        },
    });
    if (!rule?.send_email) return; // Admin has turned off the Email toggle for Transport approved-request notifications

    const [division, requester, transportUsers] = await Promise.all([
        Division.findByPk(request.division_id),
        User.findByPk(request.requested_by),
        User.findAll({ include: [{ model: Role, where: { name: RoleType.TRANSPORT } }] }),
    ]);

    for (const officer of transportUsers) {
        if (officer.email) {
            await sendSpecialRequestApprovedTransportEmail(
                officer.email,
                request.id,
                requester?.name ?? 'Unknown',
                division?.name ?? 'Unknown'
            ).catch(err => console.error('[Mailer] Transport special request email failed:', err));
        }
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// Public API — called from controllers
// ─────────────────────────────────────────────────────────────────────────────
export class NotificationService {
    /** Called after a new request is created AND is immediately visible (within hours). */
    static async notifyNewRequest(request: VehicleRequest) {
        await fireEvent(NotificationEventType.NEW_REQUEST, request);
        if (request.is_special) {
            await emailCEOForSpecialRequest(request).catch(err =>
                console.error('[Mailer] CEO email lookup failed:', err)
            );
        }
    }

    /** Called by morning-reveal job for requests that were queued overnight. */
    static async fireQueuedNewRequest(request: VehicleRequest) {
        await fireEvent(NotificationEventType.NEW_REQUEST, request);
        if (request.is_special) {
            await emailCEOForSpecialRequest(request).catch(err =>
                console.error('[Mailer] CEO email lookup (queued) failed:', err)
            );
        }
    }

    // Coordinator verified / returned
    static async notifyRequestVerification(request: VehicleRequest, status: 'VERIFIED' | 'RETURNED') {
        const eventType = status === 'VERIFIED'
            ? NotificationEventType.REQUEST_VERIFIED
            : NotificationEventType.REQUEST_RETURNED;
        await fireEvent(eventType, request);
    }

    // HOD / CEO approved or rejected
    static async notifyRequestApproval(request: VehicleRequest, status: 'APPROVED' | 'REJECTED') {
        const eventType = status === 'APPROVED'
            ? NotificationEventType.REQUEST_APPROVED
            : NotificationEventType.REQUEST_REJECTED;
        await fireEvent(eventType, request);

        // Special requests approved by CEO: also email Transport (gated by REQUEST_APPROVED → TRANSPORT rule)
        if (request.is_special && status === 'APPROVED') {
            await emailTransportForSpecialApproval(request).catch(err =>
                console.error('[Mailer] Transport email lookup failed:', err)
            );
        }
    }

    /** Called when Coordinator confirms the allocation (ALLOCATED). Notifies Requester, Driver, Coordinator. */
    static async notifyVehicleAllocation(request: VehicleRequest, vehicle: Vehicle, driver: Driver) {
        await fireEvent(NotificationEventType.REQUEST_ALLOCATED, request, { vehicle, driver });
    }

    // Vendor assigned — notifies requester and coordinator with vendor contact details
    static async notifyVendorAllocation(request: VehicleRequest) {
        await fireEvent(NotificationEventType.VENDOR_ALLOCATED, request, {
            vendorName: request.vendor_name ?? '',
            vendorContact: request.vendor_mobile ?? '',
        });
    }

    // Request completed
    static async notifyRequestCompleted(request: VehicleRequest) {
        await fireEvent(NotificationEventType.REQUEST_COMPLETED, request);
    }

    // ─── Legacy helpers (kept for backward compat & direct use) ──────────────

    static async createNotification(userId: number, requestId: number, message: string) {
        await createInAppNotification(userId, requestId, message);
    }

    static async markAsRead(userId: number, notificationId?: number) {
        if (notificationId) {
            await Notification.update(
                { is_read: true },
                { where: { id: notificationId, user_id: userId } }
            );
        } else {
            await Notification.update(
                { is_read: true },
                { where: { user_id: userId, is_read: false } }
            );
        }
    }

    static async getUserNotifications(userId: number) {
        return await Notification.findAll({
            where: { user_id: userId },
            include: [{ model: VehicleRequest, attributes: ['id', 'status', 'request_type'] }],
            order: [['createdAt', 'DESC']],
            limit: 50,
        });
    }

    static async getUnreadCount(userId: number): Promise<number> {
        return await Notification.count({
            where: { user_id: userId, is_read: false },
        });
    }

    // Transport officer decline — routes through the REQUEST_REJECTED config so admin templates apply
    static async notifyRequestDeclined(request: VehicleRequest, _reason?: string) {
        await fireEvent(NotificationEventType.REQUEST_REJECTED, request);
    }
}
