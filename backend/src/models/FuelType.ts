import { Table, Column, Model, DataType, HasMany } from 'sequelize-typescript';
import { TransportPackage } from './TransportPackage';

export enum FuelTypeStatus {
    ACTIVE = 'ACTIVE',
    INACTIVE = 'INACTIVE'
}

@Table({
    tableName: 'fuel_types',
    timestamps: true
})
export class FuelType extends Model {
    @HasMany(() => TransportPackage)
    declare packages: TransportPackage[];

    @Column({
        type: DataType.INTEGER,
        autoIncrement: true,
        primaryKey: true,
    })
    declare id: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare name: string;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false
    })
    declare current_price: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0
    })
    declare new_price: number;

    @Column({
        type: DataType.DECIMAL(10, 2),
        allowNull: true
    })
    declare previous_price: number;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare document_path: string | null;

    @Column({
        type: DataType.DATEONLY,
        allowNull: false
    })
    declare effective_date: string;

    @Column({
        type: DataType.ENUM(...Object.values(FuelTypeStatus)),
        defaultValue: FuelTypeStatus.ACTIVE,
    })
    declare status: FuelTypeStatus;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare hod_signature_path: string | null;
}
