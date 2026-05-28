import {
    Table,
    Column,
    Model,
    DataType,
    PrimaryKey,
    AutoIncrement,
    ForeignKey,
    BelongsTo
} from 'sequelize-typescript';
import { Driver } from './Driver';
import { Vehicle } from './Vehicle';
import { TransportPackage } from './TransportPackage';

@Table({
    tableName: 'trip_entries',
    timestamps: true
})
export class TripEntry extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => Driver)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare driver_id: number;

    @BelongsTo(() => Driver)
    declare driver: Driver;

    @ForeignKey(() => Vehicle)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare vehicle_id: number;

    @BelongsTo(() => Vehicle)
    declare vehicle: Vehicle;

    @ForeignKey(() => TransportPackage)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare transport_package_id: number;

    @BelongsTo(() => TransportPackage)
    declare transportPackage: TransportPackage;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false
    })
    declare entry_date: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    declare start_km: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    declare end_km: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    declare total_km: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare extra_km: number;

    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare total_trip_days: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare ot_hours: number;

    @Column({
        type: DataType.INTEGER,
        allowNull: false,
        defaultValue: 0
    })
    declare night_out_count: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare package_name: string;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare package_category: string;

    @Column({
        type: DataType.INTEGER,
        allowNull: true
    })
    declare km_limit: number | null;

    @Column({
        type: DataType.INTEGER,
        allowNull: true
    })
    declare additional_day_km_limit: number | null;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    declare base_amount: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    declare extra_km_rate: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare fuel_adjustment: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    declare additional_day_rate: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    declare ot_rate: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    declare night_out_rate: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare base_amount_total: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare extra_km_amount: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare additional_day_amount: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare ot_amount: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare night_out_amount: number;

    @Column({
        type: DataType.DECIMAL(12, 2),
        allowNull: false
    })
    declare final_amount: number;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare hod_signature_filename: string | null;
}
