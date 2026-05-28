import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { VehicleRequest } from './VehicleRequest';
import { User } from './User';

export enum ApprovalRole {
    COORDINATOR = 'COORDINATOR',
    HOD = 'HOD',
    CEO = 'CEO'
}

export enum ApprovalStatus {
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    RETURNED = 'RETURNED'
}

@Table({
    tableName: 'approvals',
    timestamps: true,
})
export class Approval extends Model {
    @ForeignKey(() => VehicleRequest)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare request_id: number;

    @BelongsTo(() => VehicleRequest)
    declare request: VehicleRequest;

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare approved_by: number;

    @BelongsTo(() => User)
    declare approver: User;

    @Column({
        type: DataType.ENUM(...Object.values(ApprovalRole)),
        allowNull: false,
    })
    declare role: ApprovalRole;

    @Column({
        type: DataType.ENUM(...Object.values(ApprovalStatus)),
        allowNull: false,
    })
    declare status: ApprovalStatus;

    @Column({
        type: DataType.TEXT,
    })
    declare comment: string;

    @Column({
        type: DataType.DATE,
        allowNull: false,
        defaultValue: DataType.NOW,
    })
    declare approved_at: Date;
}
