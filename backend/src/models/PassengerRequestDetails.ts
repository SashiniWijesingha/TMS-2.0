import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { VehicleRequest } from './VehicleRequest';

@Table({
    tableName: 'passenger_details',
    timestamps: false,
})
export class PassengerRequestDetails extends Model {
    @ForeignKey(() => VehicleRequest)
    @Column({
        type: DataType.INTEGER,
        allowNull: false,
    })
    declare request_id: number;

    @BelongsTo(() => VehicleRequest)
    declare request: VehicleRequest;

    @Column({ type: DataType.DATEONLY, allowNull: false })
    declare date: string;

    @Column({ type: DataType.TIME, allowNull: false })
    declare time: string;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare no_of_days: number;

    @Column({ type: DataType.INTEGER, allowNull: false })
    declare no_of_passengers: number;

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare vehicle_type: string;

    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare specification: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare pickup_location: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare drop_location: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare return_trip: boolean;

    @Column({ type: DataType.DATEONLY, allowNull: true })
    declare return_date: string;

    @Column({ type: DataType.TIME, allowNull: true })
    declare return_time: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare share_vehicle: boolean;

    @Column({ type: DataType.STRING, allowNull: true })
    declare sharing_remarks: string;

    @Column({ type: DataType.TEXT, allowNull: false })
    declare reason: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare has_stops: boolean;

    @Column({ type: DataType.JSON, allowNull: true })
    declare stops: string[];

    @Column({ type: DataType.STRING, allowNull: true })
    declare distance: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare contact_person_name: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare contact_no: string;

    // Geospatial Fields
    @Column({ type: DataType.JSON, allowNull: true })
    declare pickup_coordinates: { lat: number; lng: number; address: string };

    @Column({ type: DataType.FLOAT, allowNull: true })
    declare pickup_lat: number;

    @Column({ type: DataType.FLOAT, allowNull: true })
    declare pickup_lng: number;

    @Column({ type: DataType.JSON, allowNull: true })
    declare drop_coordinates: { lat: number; lng: number; address: string };

    @Column({ type: DataType.FLOAT, allowNull: true })
    declare drop_lat: number;

    @Column({ type: DataType.FLOAT, allowNull: true })
    declare drop_lng: number;

    @Column({ type: DataType.JSON, allowNull: true })
    declare stops_coordinates: { lat: number; lng: number; address: string }[];

    @Column({ type: DataType.JSON, allowNull: true })
    declare route_geometry: any; // GeoJSON LineString or similar

    @Column({ type: DataType.FLOAT, allowNull: true })
    declare total_distance_km: number;

    @Column({ type: DataType.FLOAT, allowNull: true })
    declare total_duration_minutes: number;

    // Coordinator Override Logic
    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare is_sharable_override: boolean;

    @Column({ type: DataType.STRING, allowNull: true })
    declare override_reason: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare service_category: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare cost_centre: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare cost_centre_id: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare gl_code: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare gl_name: string;
}

