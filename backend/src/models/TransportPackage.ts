import { Table, Column, Model, DataType, PrimaryKey, AutoIncrement, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { VehicleType } from './VehicleType';
import { FuelType } from './FuelType';

export enum TransportPackageStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE'
}

export enum PackageCategory {
    MONTHLY = 'MONTHLY',
    PER_KM = 'PER_KM',
    DAILY = 'DAILY'
}

export enum AcType {
    AC = 'AC',
    NON_AC = 'NON_AC'
}

@Table({
    tableName: 'transport_packages',
    timestamps: true
})
export class TransportPackage extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @ForeignKey(() => VehicleType)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare vehicle_type_id: number;

    @BelongsTo(() => VehicleType)
    declare vehicleType: VehicleType;

    @ForeignKey(() => FuelType)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare fuel_type_id: number;

    @BelongsTo(() => FuelType)
    declare fuelType: FuelType;

    @Column({
        type: DataType.ENUM(...Object.values(AcType)),
        allowNull: false
    })
    declare ac_type: AcType;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare package_name: string;

    @Column({
        type: DataType.ENUM(...Object.values(PackageCategory)),
        allowNull: false
    })
    declare package_category: PackageCategory;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        comment: 'KM limit for monthly or package-based pricing'
    })
    declare km_limit: number | null;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        comment: 'Day limit for monthly or package-based pricing'
    })
    declare day_limit: number | null;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Base amount for the package'
    })
    declare base_amount: number | null;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Rate per extra KM'
    })
    declare extra_km_rate: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true,
        defaultValue: 0,
        comment: 'Fuel efficiency consumption (KM per Liter)'
    })
    declare fuel_efficiency: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true,
        comment: 'Rate for additional days'
    })
    declare additional_day_rate: number | null;

    @Column({
        type: DataType.INTEGER,
        allowNull: true,
        comment: 'KM limit for the additional day'
    })
    declare additional_day_km_limit: number | null;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        comment: 'OT charges per hour'
    })
    declare ot_rate: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Night out charges'
    })
    declare night_out_rate: number;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false
    })
    declare effective_date: string;

    @Column({
        type: DataType.ENUM(...Object.values(TransportPackageStatus)),
        defaultValue: TransportPackageStatus.ACTIVE
    })
    declare status: TransportPackageStatus;
}
