import { Table, Column, Model, DataType, ForeignKey, BelongsTo } from 'sequelize-typescript';
import { VehicleRequest } from './VehicleRequest';

@Table({
    tableName: 'material_details',
    timestamps: false,
})
export class MaterialRequestDetails extends Model {
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

    @Column({
        type: DataType.STRING,
        allowNull: false
    })
    declare vehicle_type: string;

    // For Lorry and Boom Truck
    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare lorry_size: string;

    // For Lorry type specification
    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare lorry_type: string;

    // For Boom Truck arm capacity
    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare arm_capacity: string;

    // For Crane weight capacity
    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare crane_weight: string;

    // For Man Bucket height
    @Column({
        type: DataType.STRING,
        allowNull: true,
        comment: 'Height in feet for Man Bucket'
    })
    declare man_bucket_height: string;

    @Column({
        type: DataType.STRING,
        allowNull: true,
        comment: 'Weight capacity for Man Bucket'
    })
    declare man_bucket_weight: string;

    // For Forklift weight capacity
    @Column({
        type: DataType.STRING,
        allowNull: true
    })
    declare forklift_weight: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare pickup_location_1: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare pickup_location_2: string;

    @Column({ type: DataType.STRING, allowNull: false })
    declare drop_location_1: string;

    @Column({ type: DataType.STRING, allowNull: true })
    declare drop_location_2: string;

    @Column({
        type: DataType.ENUM('No', '1 Person', '2 Person'),
        defaultValue: 'No'
    })
    declare no_of_labours: string;

    @Column({ type: DataType.BOOLEAN, defaultValue: false })
    declare return_materials: boolean;

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

    @Column({ type: DataType.JSON, allowNull: true })
    declare drop_coordinates: { lat: number; lng: number; address: string };

    @Column({ type: DataType.JSON, allowNull: true })
    declare stops_coordinates: { lat: number; lng: number; address: string }[];

    @Column({ type: DataType.JSON, allowNull: true })
    declare route_geometry: any; // GeoJSON LineString

    @Column({ type: DataType.FLOAT, allowNull: true })
    declare total_distance_km: number;

    @Column({ type: DataType.FLOAT, allowNull: true })
    declare total_duration_minutes: number;
}
