import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, HasOne } from 'sequelize-typescript';
import { Role } from './Role';
import { Division } from './Division';
import { SubDivision } from './SubDivision';
import { VehicleRequest } from './VehicleRequest';
import { Approval } from './Approval';
import { Notification } from './Notification';
import { Driver } from './Driver';

@Table({
    tableName: 'users',
    timestamps: true,
})
export class User extends Model {
    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
    })
    declare employee_id: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @Column({
        type: DataType.ENUM('HRIS', 'LOCAL'),
        allowNull: false,
        defaultValue: 'HRIS',
    })
    declare account_type: 'HRIS' | 'LOCAL';

    @Column({
        type: DataType.STRING,
        allowNull: false,
        unique: true,
        validate: {
            isEmail: true,
        }
    })
    declare email: string;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare password_hash: string;

    @ForeignKey(() => Role)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare role_id: number;

    @BelongsTo(() => Role)
    declare role: Role;

    @ForeignKey(() => Division)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare division_id: number;

    @BelongsTo(() => Division)
    declare division: Division;

    @ForeignKey(() => SubDivision)
    @Column({
        type: DataType.INTEGER,
        allowNull: true,
    })
    declare sub_division_id: number;

    @BelongsTo(() => SubDivision)
    declare subDivision: SubDivision;

    @Column({
        type: DataType.STRING(20),
        allowNull: true,
    })
    declare mobile: string | null;

    @Column({
        type: DataType.BOOLEAN,
        defaultValue: true,
    })
    declare must_change_password: boolean;

    @HasMany(() => VehicleRequest)
    declare requests: VehicleRequest[];

    @HasMany(() => Approval)
    declare approvals: Approval[];

    @HasMany(() => Notification)
    declare notifications: Notification[];

    @HasOne(() => Driver)
    declare driver: Driver;
}
