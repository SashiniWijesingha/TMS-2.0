import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { VehicleType } from './VehicleType';

@Table({
    tableName: 'vehicle_attributes',
    timestamps: false
})
export class VehicleAttribute extends Model {
    @ForeignKey(() => VehicleType)
    @Column({
        type: DataType.INTEGER,
        allowNull: false
    })
    declare vehicle_type_id: number;

    @BelongsTo(() => VehicleType)
    declare vehicleType: VehicleType;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare key: string; // e.g., 'lorry_size', 'arm_capacity'

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare label: string; // e.g., 'Lorry Size', 'Arm Capacity'

    @Column({
        type: DataType.ENUM('SELECT', 'TEXT', 'NUMBER', 'BOOLEAN'),
        allowNull: false,
        defaultValue: 'TEXT'
    })
    declare type: string;

    @Column({
        type: DataType.JSON,
        allowNull: true,
        comment: 'JSON array of string options for SELECT type'
    })
    declare options: string[];

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare unit: string; // e.g., 'Ft', 'Ton'

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: false
    })
    declare is_required: boolean;
}
