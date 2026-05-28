import { Table, Column, Model, DataType, HasMany, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { User } from './User';

export enum RoleType {
    ADMIN = 'ADMIN',
    STAFF = 'STAFF',
    COORDINATOR = 'COORDINATOR',
    HOD = 'HOD',
    TRANSPORT = 'TRANSPORT',
    DRIVER = 'DRIVER',
    CEO = 'CEO',
    MCU_USER = 'MCU_USER',
    CALL_CENTER = 'CALL_CENTER',
    WAREHOUSE = 'WAREHOUSE'
}

@Table({
    tableName: 'roles',
    timestamps: false,
})
export class Role extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.ENUM(...Object.values(RoleType)),
        allowNull: false,
        unique: true,
    })
    declare name: RoleType;

    @HasMany(() => User)
    declare users: User[];
}
