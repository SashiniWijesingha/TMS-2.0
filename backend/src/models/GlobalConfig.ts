import { Table, Column, Model, DataType } from 'sequelize-typescript';

/**
 * Global system-wide key-value configuration.
 * Used for settings that apply across the entire system rather than per-day.
 *
 * Default keys:
 *   delay_visibility         "true"  — hide off-hours submissions from approval dashboards
 *   applies_to_passenger     "true"  — submission window applies to PASSENGER requests
 *   applies_to_material      "true"  — submission window applies to MATERIAL requests
 */

export const GLOBAL_CONFIG_DEFAULTS: Record<string, string> = {
    delay_visibility: 'true',
    applies_to_passenger_normal: 'true',   // Standard / regular passenger trips
    applies_to_passenger_adhoc: 'false',   // Ad-Hoc — urgent, bypasses window by default
    applies_to_passenger_special: 'false', // Special — urgent, bypasses window by default
    applies_to_material: 'true',
    availability_avg_speed_kmh: '35',
    availability_default_duration_min: '120',
    availability_min_buffer_min: '30',
    availability_buffer_ratio: '0.2',
    availability_unexpected_buffer_min: '15',
    availability_long_distance_km: '100',
    availability_long_distance_rest_min: '60',
};

@Table({
    tableName: 'global_configs',
    timestamps: false,
})
export class GlobalConfig extends Model {
    @Column({
        type: DataType.STRING(100),
        primaryKey: true,
        allowNull: false,
        comment: 'Setting key',
    })
    declare key: string;

    @Column({
        type: DataType.STRING(500),
        allowNull: true,
        comment: 'Setting value (always string; cast at application layer)',
    })
    declare value: string | null;
}
