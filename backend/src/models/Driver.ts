import { Table, Column, Model, DataType, HasMany, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { Allocation } from './Allocation';
import { User } from './User';
import { Vehicle } from './Vehicle';
import { ForeignKey, BelongsTo } from 'sequelize-typescript';

@Table({
    tableName: 'drivers',
    timestamps: false,
})
export class Driver extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING,
        allowNull: true,
    })
    declare nic_no: string;

    // New Fields
    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare license_no: string;

    @Column({
        type: DataType.DATEONLY,
        allowNull: true
    })
    declare license_expiry: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare license_photo: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare grama_niladhari_cert: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare police_report: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare work_experience: string;

    @Column({
        type: DataType.TEXT,
        allowNull: true
    })
    declare other_vehicle_types: string; // New field for manual entry

    @Column({
        type: DataType.JSON, // Stores array of IDs: [1, 2]
        allowNull: false,
        defaultValue: [],
    })
    declare allowed_vehicle_type_ids: number[];

    @Column({
        type: DataType.STRING, // 'rent' | 'own' | 'none'
        allowNull: true
    })
    declare vehicle_arrangement: string;

    @Column({
        type: DataType.JSON, // Stores array of strings
        allowNull: true,
        defaultValue: [],
    })
    declare company_vehicle_numbers: string[];

    @HasMany(() => Vehicle)
    declare permanentVehicles: Vehicle[];

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare user_id: number;

    @BelongsTo(() => User)
    declare user: User;

    @HasMany(() => Allocation)
    declare allocations: Allocation[];
}
