import { Table, Column, Model, DataType, HasMany, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { User } from './User';
import { VehicleRequest } from './VehicleRequest';
import { SubDivision } from './SubDivision';

@Table({
    tableName: 'divisions',
    timestamps: false,
})
export class Division extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare name: string;

    @HasMany(() => User)
    declare users: User[];

    @HasMany(() => VehicleRequest)
    declare vehicleRequests: VehicleRequest[];

    @HasMany(() => SubDivision)
    declare subDivisions: SubDivision[];
}
