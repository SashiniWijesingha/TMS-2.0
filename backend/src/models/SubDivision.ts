import { Table, Column, Model, DataType, ForeignKey, BelongsTo, HasMany, PrimaryKey, AutoIncrement } from 'sequelize-typescript';
import { Division } from './Division';
import { User } from './User';

@Table({
    tableName: 'sub_divisions',
    timestamps: false,
})
export class SubDivision extends Model {
    @PrimaryKey
    @AutoIncrement
    @Column(DataType.INTEGER)
    declare id: number;

    @Column({
        type: DataType.STRING,
        allowNull: false,
    })
    declare name: string;

    @ForeignKey(() => Division)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare division_id: number;

    @BelongsTo(() => Division)
    declare division: Division;

    @HasMany(() => User)
    declare users: User[];
}
