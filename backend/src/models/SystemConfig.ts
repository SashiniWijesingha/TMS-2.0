import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({
    tableName: 'system_configs',
    timestamps: false,
})
export class SystemConfig extends Model {
    @Column({
        type: DataType.INTEGER,
        primaryKey: true,
        allowNull: false,
        comment: '0=Sunday, 1=Monday, ..., 6=Saturday'
    })
    declare day_of_week: number;

    @Column({
        type: DataType.TIME,
        allowNull: true,
        defaultValue: '08:00:00'
    })
    declare start_time: string;

    @Column({
        type: DataType.TIME,
        allowNull: true,
        defaultValue: '16:00:00'
    })
    declare end_time: string;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
        comment: 'If false, no requests allowed on this day'
    })
    declare is_active: boolean;
}
