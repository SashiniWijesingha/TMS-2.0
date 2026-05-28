import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasOne, HasMany } from 'sequelize-typescript';
import { User } from './User';
import { Division } from './Division';
import { PassengerRequestDetails } from './PassengerRequestDetails';
import { MaterialRequestDetails } from './MaterialRequestDetails';
import { Approval } from './Approval';
import { Allocation } from './Allocation';
import { Trip } from './Trip';
import { Vehicle } from './Vehicle';
import { VehicleType } from './VehicleType';

export enum RequestType {
    PASSENGER = 'PASSENGER',
    MATERIAL = 'MATERIAL'
}

export enum RequestStatus {
    PENDING_COORDINATOR = 'PENDING_COORDINATOR',
    PENDING_HOD = 'PENDING_HOD',
    PENDING_CEO = 'PENDING_CEO',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED', // HOD Rejection
    RETURNED = 'RETURNED', // Coordinator Rejection
    CANCELLED = 'CANCELLED', // Staff Cancellation
    ALLOCATED = 'ALLOCATED',
    VENDOR_ALLOCATED = 'VENDOR_ALLOCATED', // Assigned to external vendor company
    ACCEPTED = 'ACCEPTED', // Driver accepted trip
    ON_GOING = 'ON_GOING',
    COMPLETED = 'COMPLETED',
    EXPIRED = 'EXPIRED', // Auto-Expired (Past is Dead)
    DECLINED = 'DECLINED' // Officer Manually Declined (Inbox Zero)
}

export enum ProjectStatus {
    ACTIVE = 'ACTIVE',       // Ongoing, budget available — requests allowed
    COMPLETED = 'COMPLETED', // Work finished — no new requests
    CLOSED = 'CLOSED',       // Officially closed — no new requests
    TAKE_OFF = 'TAKE_OFF'    // Approved but not yet started — conditional requests
}

@Table({
    tableName: 'vehicle_requests',
    timestamps: true,
})
export class VehicleRequest extends Model {
    @Column({
        type: DataType.ENUM(...Object.values(RequestType)),
        allowNull: false,
    })
    declare request_type: RequestType;

    @Column({
        type: DataType.ENUM(...Object.values(RequestStatus)),
        defaultValue: RequestStatus.PENDING_COORDINATOR,
        allowNull: false,
    })
    declare status: RequestStatus;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare requested_by: number;

    @BelongsTo(() => User)
    declare requester: User;

    @ForeignKey(() => Division)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare division_id: number;

    @BelongsTo(() => Division)
    declare division: Division;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare sub_division: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare job_number: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare project_name: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true,
    })
    declare project_budget: number;

    @Column({
        type: DataType.BOOLEAN,
        allowNull: true,
        defaultValue: false,
    })
    declare budget_confirmed: boolean;

    @Column({
        type: DataType.ENUM(...Object.values(ProjectStatus)),
        allowNull: true,
        defaultValue: ProjectStatus.ACTIVE,
    })
    declare project_status: ProjectStatus;

    @Column({
        type: DataType.DATEONLY,
        allowNull: true,
    })
    declare project_start_date: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    declare submitted_at: Date;

    @HasOne(() => PassengerRequestDetails)
    declare passengerDetails: PassengerRequestDetails;

    @HasOne(() => MaterialRequestDetails)
    declare materialDetails: MaterialRequestDetails;

    @HasMany(() => Approval)
    declare approvals: Approval[]; // Could have multiple approval steps (Coordinator, HOD)

    @HasOne(() => Allocation)
    declare allocation: Allocation;

    @ForeignKey(() => Trip)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare trip_id: number | null;

    @BelongsTo(() => Trip)
    declare trip: Trip;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare merge_group_id: string;

    @ForeignKey(() => Vehicle)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare proposed_vehicle_id: number;

    @ForeignKey(() => VehicleType)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare proposed_vehicle_type_id: number;

    @Column({
        type: DataType.JSON,
        allowNull: true
    })
    declare proposed_attributes: any;

    @ForeignKey(() => VehicleRequest)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare parent_id: number;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    declare is_return_leg: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    declare is_special: boolean;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    declare is_adhoc: boolean;

    @Column({
        type: DataType.TEXT,
        allowNull: true,
    })
    declare special_justification: string;

    /**
     * When set, this request is hidden from approval-role dashboards until this datetime.
     * Null = visible immediately.
     * Set when a request is submitted outside business hours.
     */
    @Column({
        type: DataType.DATE,
        allowNull: true,
        defaultValue: null,
    })
    declare visible_from: Date | null;

    /**
     * True when visible_from is set and the "new request" SMS/notification
     * has NOT yet been sent. The morning-reveal job flips this to false
     * after firing the notifications.
     */
    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    declare sms_queued: boolean;

    // ── Vendor Assignment Fields ────────────────────────────────────────────
    // Populated when a Transport Officer assigns an external vendor company
    // instead of allocating a company vehicle.

    @Column({
        type: DataType.STRING(50),
        allowNull: true,
    })
    declare vendor_code: string | null;

    @Column({
        type: DataType.STRING(200),
        allowNull: true,
    })
    declare vendor_name: string | null;

    @Column({
        type: DataType.STRING(30),
        allowNull: true,
    })
    declare vendor_mobile: string | null;
    // ────────────────────────────────────────────────────────────────────────
}
