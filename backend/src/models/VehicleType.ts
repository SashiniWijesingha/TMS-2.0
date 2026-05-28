import { Table, Column, Model, DataType, HasMany, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { Vehicle } from './Vehicle';
import { VehicleAttribute } from './VehicleAttribute';

@Table({
    tableName: 'vehicle_types',
    timestamps: false
})
export class VehicleType extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.ENUM('PASSENGER', 'MATERIAL'),
        allowNull: false,
        defaultValue: 'PASSENGER'
    })
    declare category: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true
    })
    declare name: string;

    @HasMany(() => Vehicle)
    declare vehicles: Vehicle[];

    @HasMany(() => VehicleAttribute)
    declare attributes: VehicleAttribute[];
}
