import { Table, Column, Model, DataType } from 'sequelize-typescript';

@Table({ tableName: 'ride_share_suggestions', timestamps: true })
export class RideShareSuggestion extends Model {
  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare group_id: string;

  @Column({
    type: DataType.JSON,
    allowNull: false
  })
  declare request_ids: number[];

  @Column({
    type: DataType.INTEGER,
    allowNull: false
  })
  declare total_passengers: number;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare match_reason: string;

  @Column({
    type: DataType.STRING,
    allowNull: false,
    defaultValue: 'PENDING'
  })
  declare status: string;

  @Column({
    type: DataType.STRING,
    allowNull: false
  })
  declare date: string;
}