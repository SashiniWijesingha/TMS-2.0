import { Table, Column, Model, DataType } from 'sequelize-typescript';

export enum NotificationEventType {
    NEW_REQUEST = 'NEW_REQUEST',
    REQUEST_VERIFIED = 'REQUEST_VERIFIED',
    REQUEST_APPROVED = 'REQUEST_APPROVED',
    REQUEST_REJECTED = 'REQUEST_REJECTED',
    REQUEST_RETURNED = 'REQUEST_RETURNED',
    REQUEST_ALLOCATED = 'REQUEST_ALLOCATED',
    VENDOR_ALLOCATED = 'VENDOR_ALLOCATED',
    REQUEST_COMPLETED = 'REQUEST_COMPLETED',
    DRIVER_REMINDER = 'DRIVER_REMINDER',
    ADHOC_REMINDER = 'ADHOC_REMINDER',
}

export enum NotificationTargetRole {
    REQUESTER = 'REQUESTER',
    COORDINATOR = 'COORDINATOR',
    HOD = 'HOD',
    TRANSPORT = 'TRANSPORT',
    CEO = 'CEO',
    DRIVER = 'DRIVER',
}

export const DEFAULT_NOTIFICATION_CONFIG: {
    event_type: NotificationEventType;
    target_role: NotificationTargetRole;
    enabled: boolean;
    send_sms: boolean;
    send_in_app: boolean;
    send_email: boolean;
    message_template: string;
    repeat_interval_minutes?: number | null;
}[] = [
    {
        event_type: NotificationEventType.NEW_REQUEST,
        target_role: NotificationTargetRole.COORDINATOR,
        enabled: true,
        send_sms: true,
        send_in_app: true,
        send_email: false,
        message_template: 'Hello {{recipient_name}}, new {{type}} request #{{request_id}} from {{requester}} ({{division}}), Job {{job_number}}. Please review: {{request_link}}',
    },
    {
        event_type: NotificationEventType.NEW_REQUEST,
        target_role: NotificationTargetRole.HOD,
        enabled: false,
        send_sms: false,
        send_in_app: false,
        send_email: false,
        message_template: 'Hello {{recipient_name}}, new {{type}} request #{{request_id}} has been submitted by {{requester}} ({{division}}), Job {{job_number}}. View: {{request_link}}',
    },
    {
        event_type: NotificationEventType.NEW_REQUEST,
        target_role: NotificationTargetRole.TRANSPORT,
        enabled: false,
        send_sms: false,
        send_in_app: false,
        send_email: false,
        message_template: 'Hello {{recipient_name}}, new {{type}} request #{{request_id}} is now in the workflow. Job {{job_number}}, Division {{division}}. View: {{request_link}}',
    },
    {
        // Special requests: CEO always receives an email for new special requests (send_email: true)
        event_type: NotificationEventType.NEW_REQUEST,
        target_role: NotificationTargetRole.CEO,
        enabled: false,
        send_sms: false,
        send_in_app: false,
        send_email: true,
        message_template: 'Hello {{recipient_name}}, new {{type}} request #{{request_id}} was submitted by {{requester}} ({{division}}), Job {{job_number}}. View: {{request_link}}',
    },
    {
        event_type: NotificationEventType.REQUEST_VERIFIED,
        target_role: NotificationTargetRole.REQUESTER,
        enabled: true,
        send_sms: false,
        send_in_app: true,
        send_email: false,
        message_template: 'Hi {{recipient_name}}, your request #{{request_id}} (Job {{job_number}}) has been verified by the Coordinator and forwarded for HOD approval. View: {{request_link}}',
    },
    {
        event_type: NotificationEventType.REQUEST_VERIFIED,
        target_role: NotificationTargetRole.HOD,
        enabled: true,
        send_sms: false,
        send_in_app: true,
        send_email: false,
        message_template: 'Hello {{recipient_name}}, request #{{request_id}} (Job {{job_number}}) from {{requester}} ({{division}}) has been verified by the Coordinator and is awaiting your approval. View: {{request_link}}',
    },
    {
        event_type: NotificationEventType.REQUEST_APPROVED,
        target_role: NotificationTargetRole.REQUESTER,
        enabled: true,
        send_sms: true,
        send_in_app: true,
        send_email: false,
        message_template: 'Hi {{recipient_name}}, your request #{{request_id}} (Job {{job_number}}) is approved. Transport will assign a vehicle and driver shortly. View: {{request_link}}',
    },
    {
        // Special requests: Transport always receives an email when CEO approves (send_email: true)
        event_type: NotificationEventType.REQUEST_APPROVED,
        target_role: NotificationTargetRole.TRANSPORT,
        enabled: true,
        send_sms: true,
        send_in_app: true,
        send_email: true,
        message_template: 'Hello {{recipient_name}}, request #{{request_id}} from {{division}} (Job {{job_number}}) is approved. Please allocate vehicle and driver: {{request_link}}',
    },
    {
        event_type: NotificationEventType.REQUEST_APPROVED,
        target_role: NotificationTargetRole.CEO,
        enabled: false,
        send_sms: false,
        send_in_app: false,
        send_email: false,
        message_template: 'Hello {{recipient_name}}, request #{{request_id}} (Job {{job_number}}) has been approved by HOD. View: {{request_link}}',
    },
    {
        event_type: NotificationEventType.REQUEST_REJECTED,
        target_role: NotificationTargetRole.REQUESTER,
        enabled: true,
        send_sms: false,
        send_in_app: true,
        send_email: false,
        message_template: 'Hi {{recipient_name}}, your request #{{request_id}} (Job {{job_number}}) was rejected. Please review comments and resubmit if needed: {{request_link}}',
    },
    {
        event_type: NotificationEventType.REQUEST_RETURNED,
        target_role: NotificationTargetRole.REQUESTER,
        enabled: true,
        send_sms: false,
        send_in_app: true,
        send_email: false,
        message_template: 'Hi {{recipient_name}}, your request #{{request_id}} (Job {{job_number}}) was returned for correction. Please update and resubmit: {{request_link}}',
    },
    {
        event_type: NotificationEventType.REQUEST_ALLOCATED,
        target_role: NotificationTargetRole.REQUESTER,
        enabled: true,
        send_sms: true,
        send_in_app: true,
        send_email: false,
        message_template: 'Hi {{recipient_name}}, your request #{{request_id}} is allocated. Vehicle {{vehicle_number}}, Driver {{driver_name}} ({{driver_contact}}). View: {{request_link}}',
    },
    {
        event_type: NotificationEventType.REQUEST_ALLOCATED,
        target_role: NotificationTargetRole.DRIVER,
        enabled: true,
        send_sms: true,
        send_in_app: true,
        send_email: false,
        message_template: 'Hello {{recipient_name}}, you are assigned to Job {{job_number}} with Vehicle {{vehicle_number}}. Please accept your trip here: {{trip_link}}',
    },
    {
        event_type: NotificationEventType.REQUEST_ALLOCATED,
        target_role: NotificationTargetRole.COORDINATOR,
        enabled: true,
        send_sms: false,
        send_in_app: true,
        send_email: false,
        message_template: 'Hello {{recipient_name}}, request #{{request_id}} from {{division}} has been allocated. Vehicle: {{vehicle_number}}. View: {{request_link}}',
    },
    {
        event_type: NotificationEventType.REQUEST_COMPLETED,
        target_role: NotificationTargetRole.REQUESTER,
        enabled: true,
        send_sms: false,
        send_in_app: true,
        send_email: false,
        message_template: 'Hi {{recipient_name}}, request #{{request_id}} (Job {{job_number}}) is marked completed. Thank you for using TMS. View: {{request_link}}',
    },
    {
        event_type: NotificationEventType.VENDOR_ALLOCATED,
        target_role: NotificationTargetRole.REQUESTER,
        enabled: true,
        send_sms: true,
        send_in_app: true,
        send_email: false,
        message_template: 'Hi {{recipient_name}}, request #{{request_id}} (Job {{job_number}}) is assigned to vendor {{vendor_name}}. Contact: {{vendor_contact}}. View: {{request_link}}',
    },
    {
        event_type: NotificationEventType.VENDOR_ALLOCATED,
        target_role: NotificationTargetRole.COORDINATOR,
        enabled: true,
        send_sms: false,
        send_in_app: true,
        send_email: false,
        message_template: 'Hello {{recipient_name}}, request #{{request_id}} from {{division}} has been assigned to vendor {{vendor_name}} by Transport. View: {{request_link}}',
    },
    // ── Scheduled Reminder Events ─────────────────────────────────────────────
    {
        event_type: NotificationEventType.DRIVER_REMINDER,
        target_role: NotificationTargetRole.DRIVER,
        enabled: true,
        send_sms: true,
        send_in_app: true,
        send_email: false,
        message_template: 'Urgent: {{recipient_name}}, please accept your assigned trip for Job {{job_number}} immediately: {{trip_link}}',
        repeat_interval_minutes: 15,
    },
    {
        event_type: NotificationEventType.ADHOC_REMINDER,
        target_role: NotificationTargetRole.COORDINATOR,
        enabled: true,
        send_sms: true,
        send_in_app: true,
        send_email: false,
        message_template: 'Urgent: {{recipient_name}}, Ad-Hoc request #{{request_id}} (Job {{job_number}}) needs your immediate action: {{request_link}}',
        repeat_interval_minutes: 5,
    },
    {
        event_type: NotificationEventType.ADHOC_REMINDER,
        target_role: NotificationTargetRole.HOD,
        enabled: true,
        send_sms: true,
        send_in_app: true,
        send_email: false,
        message_template: 'Urgent: {{recipient_name}}, Ad-Hoc request #{{request_id}} (Job {{job_number}}) needs your immediate action: {{request_link}}',
        repeat_interval_minutes: 5,
    },
    {
        event_type: NotificationEventType.ADHOC_REMINDER,
        target_role: NotificationTargetRole.TRANSPORT,
        enabled: true,
        send_sms: true,
        send_in_app: true,
        send_email: false,
        message_template: 'Urgent: {{recipient_name}}, Ad-Hoc request #{{request_id}} (Job {{job_number}}) needs your immediate action: {{request_link}}',
        repeat_interval_minutes: 5,
    },
];

@Table({
    tableName: 'notification_configs',
    timestamps: false,
})
export class NotificationConfig extends Model {
    @Column({
        type: DataType.INTEGER,
        primaryKey: true,
        autoIncrement: true,
    })
    declare id: number;

    @Column({
        // STRING instead of ENUM so new event types never require a DB ALTER TABLE.
        // Application-layer TypeScript typing still enforces valid values.
        type: DataType.STRING(100),
        allowNull: false,
    })
    declare event_type: NotificationEventType;

    @Column({
        type: DataType.ENUM(...Object.values(NotificationTargetRole)),
        allowNull: false,
    })
    declare target_role: NotificationTargetRole;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
        comment: 'If false, this rule is completely skipped',
    })
    declare enabled: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        comment: 'If true, send SMS to the target user',
    })
    declare send_sms: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
        comment: 'If true, create in-app notification',
    })
    declare send_in_app: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
        comment: 'If true, send email to the target user (only applies to roles with an email address)',
    })
    declare send_email: boolean;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
        comment: 'Supports: {{recipient_name}}, {{request_id}}, {{requester}}, {{division}}, {{job_number}}, {{type}}, {{vehicle_number}}, {{driver_name}}, {{driver_contact}}, {{vendor_name}}, {{vendor_contact}}',
    })
    declare message_template: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        defaultValue: null,
        comment: 'Only for reminder event types. How many minutes between repeated reminders.',
    })
    declare repeat_interval_minutes: number | null;
}
