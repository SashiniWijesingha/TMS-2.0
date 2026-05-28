import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { User } from './User';
import { VehicleRequest } from './VehicleRequest';

@Table({
    tableName: 'notifications',
    timestamps: true,
})
export class Notification extends Model {
    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare user_id: number;

    @BelongsTo(() => User)
    declare user: User;

    @ForeignKey(() => VehicleRequest)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare request_id: number;

    @BelongsTo(() => VehicleRequest)
    declare request: VehicleRequest;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare message: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false,
    })
    declare is_read: boolean;
}
