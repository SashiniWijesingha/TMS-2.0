import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany } from 'sequelize-typescript';
import { Vehicle } from './Vehicle';
import { Driver } from './Driver';
import { VehicleRequest } from './VehicleRequest';

export enum TripStatus {
    PLANNED = 'PLANNED',
    ON_GOING = 'ON_GOING',
    COMPLETED = 'COMPLETED',
    CANCELLED = 'CANCELLED'
}

@Table({
    tableName: 'trips',
    timestamps: true,
})
export class Trip extends Model {
    @ForeignKey(() => Vehicle)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare vehicle_id: number;

    @BelongsTo(() => Vehicle)
    declare vehicle: Vehicle;

    @ForeignKey(() => Driver)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare driver_id: number;

    @BelongsTo(() => Driver)
    declare driver: Driver;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false,
    })
    declare date: string;

    @Column({
        type: DataType.TIME,
        allowNull: false,
    })
    declare start_time: string;

    @Column({
        type: DataType.FLOAT,
        defaultValue: 0
    })
    declare total_distance_km: number;

    @Column({
        type: DataType.ENUM(...Object.values(TripStatus)),
        defaultValue: TripStatus.PLANNED,
    })
    declare status: TripStatus;

    @Column({
        type: DataType.STRING, // "Route: A -> B -> C -> D"
        allowNull: true
    })
    declare route_summary: string;

    @HasMany(() => VehicleRequest)
    declare requests: VehicleRequest[];
}
