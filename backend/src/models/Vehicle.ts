import { Table, Column, Model, DataType, HasMany, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { Allocation } from './Allocation';
import { VehicleType } from './VehicleType';
import { Driver } from './Driver';
import { ForeignKey, BelongsTo } from 'sequelize-typescript';
import { TransportPackage } from './TransportPackage';

export enum VehicleAvailabilityStatus {
    AVAILABLE = 'AVAILABLE',
    IN_USE = 'IN_USE',
    MAINTENANCE = 'MAINTENANCE'
}

export enum VehicleOwnership {
    COMPANY = 'COMPANY',
    VENDOR = 'VENDOR'
}

@Table({
    tableName: 'vehicles',
    timestamps: false,
})
export class Vehicle extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare vehicle_number: string;

    @ForeignKey(() => VehicleType)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare vehicle_type_id: number;

    @BelongsTo(() => VehicleType)
    declare vehicleType: VehicleType;

    @ForeignKey(() => Driver)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare assigned_driver_id: number; // For permanent assignment

    @BelongsTo(() => Driver)
    declare assignedDriver: Driver;

    @Column({
        type: DataType.STRING,
    })
    declare specification: string;

    @Column({
        type: DataType.JSON,
        allowNull: true,
        comment: 'Dynamic attributes like capacity, size, etc.'
    })
    declare attributes: any;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        defaultValue: 0,
        comment: 'Standardized seating capacity for ride sharing'
    })
    declare seating_capacity: number;

    @Column({
        type: DataType.ENUM(...Object.values(VehicleAvailabilityStatus)),
        defaultValue: VehicleAvailabilityStatus.AVAILABLE,
    })
    declare availability_status: VehicleAvailabilityStatus;

    @Column({
        type: DataType.ENUM(...Object.values(VehicleOwnership)),
        defaultValue: VehicleOwnership.COMPANY,
    })
    declare ownership: VehicleOwnership;

    @Column({
        type: DataType.JSON,
        allowNull: true,
        comment: 'Stores document paths and expiry dates'
    })
    declare documents: any;

    @HasMany(() => Allocation)
    declare allocations: Allocation[];

    @ForeignKey(() => TransportPackage)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        comment: 'The active pricing package assigned to this vehicle'
    })
    declare active_package_id: number;

    @BelongsTo(() => TransportPackage)
    declare activePackage: TransportPackage;
}
