import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { VehicleRequest } from './VehicleRequest';
import { Vehicle } from './Vehicle';
import { Driver } from './Driver';

@Table({
    tableName: 'allocations',
    timestamps: false,
})
export class Allocation extends Model {
    @ForeignKey(() => VehicleRequest)
    @Column({
        type: DataType.INTEGER,
        unique: true, // One allocation per request
        allowNull: false,
    })
    declare request_id: number;

    @BelongsTo(() => VehicleRequest)
    declare request: VehicleRequest;

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
        type: DataType.DATE,
        defaultValue: DataType.NOW,
    })
    declare allocated_at: Date;
}
