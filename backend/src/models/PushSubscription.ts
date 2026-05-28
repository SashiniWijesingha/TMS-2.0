import { Table, Column, Model, DataType, ForeignKey, BelongsTo, Index, BeforeValidate } from 'sequelize-typescript';
import { createHash } from 'crypto';
import { User } from './User';

@Table({
    tableName: 'push_subscriptions',
    timestamps: true,
})
export class PushSubscription extends Model {
    @BeforeValidate
    static deriveEndpointHash(instance: PushSubscription) {
        if (!instance.endpoint) return;
        instance.endpoint_hash = createHash('sha256').update(instance.endpoint).digest('hex');
    }

    @ForeignKey(() => User)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare user_id: number;

    @BelongsTo(() => User)
    declare user: User;

    // The browser-assigned endpoint URL (can be long for utf8mb4 indexes)
    @Column({
        type: DataType.STRING(2083),
        allowNull: false,
    })
    declare endpoint: string;

    // Fixed-length hash used as a safe unique key for upsert/conflict detection
    @Index({ unique: true })
    @Column({
        type: DataType.CHAR(64),
        allowNull: false,
        unique: true,
    })
    declare endpoint_hash: string;

    // JSON string: { p256dh: string; auth: string }
    @Column({
        type: DataType.TEXT,
        allowNull: false,
    })
    declare keys: string;
}
