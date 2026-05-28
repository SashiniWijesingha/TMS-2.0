export const Role = {
    ADMIN: 'ADMIN',
    STAFF: 'STAFF',
    COORDINATOR: 'COORDINATOR',
    HOD: 'HOD',
    TRANSPORT: 'TRANSPORT',
    DRIVER: 'DRIVER',
    CEO: 'CEO',
    MCU_USER: 'MCU_USER',
    CALL_CENTER: 'CALL_CENTER',
    WAREHOUSE: 'WAREHOUSE'
} as const;
export type Role = typeof Role[keyof typeof Role];

export const RequestType = {
    PASSENGER: 'PASSENGER',
    MATERIAL: 'MATERIAL'
} as const;
export type RequestType = typeof RequestType[keyof typeof RequestType];

export const RequestStatus = {
    PENDING_COORDINATOR: 'PENDING_COORDINATOR',
    PENDING_HOD: 'PENDING_HOD',
    PENDING_CEO: 'PENDING_CEO',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    RETURNED: 'RETURNED',
    CANCELLED: 'CANCELLED',
    ALLOCATED: 'ALLOCATED',    VENDOR_ALLOCATED: 'VENDOR_ALLOCATED',    ACCEPTED: 'ACCEPTED',
    ON_GOING: 'ON_GOING',
    COMPLETED: 'COMPLETED'
} as const;
export type RequestStatus = typeof RequestStatus[keyof typeof RequestStatus];

// ─── Project Status ─────────────────────────────────────────────────────────
export const ProjectStatus = {
    ACTIVE: 'ACTIVE',       // Ongoing with budget — requests allowed
    COMPLETED: 'COMPLETED', // Work finished — no new requests
    CLOSED: 'CLOSED',       // Officially closed — no new requests
    TAKE_OFF: 'TAKE_OFF'    // Approved but not yet started — conditional requests
} as const;
export type ProjectStatus = typeof ProjectStatus[keyof typeof ProjectStatus];

/** Budget threshold (LKR) below which a low-budget warning is shown. */
export const LOW_BUDGET_THRESHOLD = 5000;

export interface User {
    id: number | string;
    employee_id: string;
    name: string;
    email: string;
    role: Role;
    division_id?: number | null;
    sub_division_id?: number | null;
    must_change_password: boolean;
    account_type?: 'HRIS' | 'LOCAL';
    source?: string;
    driverDetails?: {
        contact_no: string;
        nic_no: string;
        allowed_vehicle_type_ids: number[];
    };
}

export interface Division {
    id: number;
    name: string;
    subDivisions?: SubDivision[];
    users?: User[];
}

export interface SubDivision {
    id: number;
    name: string;
    division_id: number;
    users?: User[];
}

export interface PassengerRequestDetails {
    id: number;
    request_id: number;
    date: string;
    time: string;
    no_of_days: number;
    no_of_passengers: number;
    vehicle_type: string; // Car / Van / Double Cab
    specification: string; // Any Car, Sedan Car, etc.
    pickup_location: string;
    drop_location: string;
    return_trip: boolean;
    share_vehicle?: boolean;
    sharing_remarks?: string;
    reason: string;
    has_stops?: boolean;
    stops?: string[];
    contact_person_name: string;
    contact_no: string;
    distance?: string;
    is_sharable_override?: boolean;
    override_reason?: string;
    service_category?: string;
    cost_centre?: string;
    cost_centre_id?: string;
    epf_no?: string;
    passenger_list?: { name: string; epf_no: string }[];
}

export interface MaterialRequestDetails {
    id: number;
    request_id: number;
    date: string;
    time: string;
    vehicle_type: string; // Lorry, Boom Truck, etc.
    // Lorry specific
    lorry_size?: string;
    lorry_type?: string;
    is_open_lorry?: boolean; // Full Body vs Open
    // Boom Truck specific
    boom_truck_size?: string;
    arm_capacity?: string;
    // Crane specific
    crane_weight?: string;
    man_bucket_height?: string;
    man_bucket_weight?: string;
    bucket_weight?: string; // Keep for legacy/form state if needed
    bucket_remarks?: string; // Keep for legacy/form state if needed

    pickup_location_1: string;
    pickup_location_2?: string;
    drop_location_1: string;
    drop_location_2?: string;
    distance?: string;
    no_of_labours: string; // No / 1 Person / 2 Person
    return_materials: boolean;
    share_vehicle?: boolean;
    sharing_remarks?: string;
    reason: string;
    contact_person_name: string;
    contact_no: string;
    epf_no?: string;
    has_stops?: boolean;
    stops?: string[];
}

export interface Trip {
    id: number;
    vehicle_id: number;
    driver_id: number;
    date: string;
    start_time: string;
    status: 'PLANNED' | 'ON_GOING' | 'COMPLETED' | 'CANCELLED';
    route_summary?: string;
    requests?: VehicleRequest[];
}

export interface VehicleRequest {
    id: number;
    request_type: RequestType;
    status: RequestStatus;
    requested_by: number;
    requester?: User;
    division_id: number;
    division?: Division;
    sub_division?: string;
    job_number: string;
    project_name: string;
    project_budget?: number;
    budget_confirmed?: boolean;
    project_status?: ProjectStatus;
    project_start_date?: string;   // ISO date string (YYYY-MM-DD)
    submitted_at: string;
    created_at: string;
    passengerDetails?: PassengerRequestDetails;
    materialDetails?: MaterialRequestDetails;
    is_special?: boolean;
    special_justification?: string | null;
    approvals?: Approval[];
    allocation?: Allocation;
    trip_id?: number;
    trip?: Trip;
    merge_group_id?: string | null;
    // Vendor assignment fields
    vendor_code?: string | null;
    vendor_name?: string | null;
    vendor_mobile?: string | null;
}

export interface Allocation {
    id: number;
    request_id: number;
    vehicle_id: number;
    driver_id: number;
    vehicle?: Vehicle;
    driver?: Driver;
    request?: VehicleRequest;
    allocated_at: string;
}

export const VehicleAvailabilityStatus = {
    AVAILABLE: 'AVAILABLE',
    IN_USE: 'IN_USE',
    MAINTENANCE: 'MAINTENANCE'
} as const;
export type VehicleAvailabilityStatus = typeof VehicleAvailabilityStatus[keyof typeof VehicleAvailabilityStatus];

export const VehicleOwnership = {
    COMPANY: 'COMPANY',
    VENDOR: 'VENDOR'
} as const;
export type VehicleOwnership = typeof VehicleOwnership[keyof typeof VehicleOwnership];

// ... (imports)

export interface VehicleType {
    id: number;
    name: string;
}

export interface Vehicle {
    id: number;
    vehicle_number: string;
    vehicle_type_id: number;
    vehicleType?: VehicleType; // Populated by backend
    specification: string;
    availability_status: VehicleAvailabilityStatus;
    assigned_driver_id?: number | null;
    assignedDriver?: Driver;
    active_package_id?: number | null;
    activePackage?: TransportPackage;
    seating_capacity: number;
    ownership: VehicleOwnership;
    attributes?: any;

    // Legacy support for frontend display if backend sends flattened 'vehicle_type' string
    vehicle_type?: string;
}

export interface Driver {
    id: number;
    contact_no?: string; // virtual - populated from user.mobile by the API
    nic_no?: string;
    user_id: number;
    user?: User;
    allowed_vehicle_type_ids: number[];
    name?: string; // Legacy or flattened
}

export const ApprovalRole = {
    COORDINATOR: 'COORDINATOR',
    HOD: 'HOD',
    CEO: 'CEO'
} as const;
export type ApprovalRole = typeof ApprovalRole[keyof typeof ApprovalRole];

export const ApprovalStatus = {
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',
    RETURNED: 'RETURNED'
} as const;
export type ApprovalStatus = typeof ApprovalStatus[keyof typeof ApprovalStatus];

export interface Approval {
    id: number;
    request_id: number;
    approved_by: number;
    approver?: User;
    role: ApprovalRole;
    status: ApprovalStatus;
    comment?: string;
    approved_at: string;
}

export interface RequestFormProps {
    initialData?: any;
    isEditMode?: boolean;
    subType?: string;
    serviceCategory?: string;
    onSubmit?: (data: any) => Promise<void>;
}

// ── Vendor (from HRIS PAYEE_NAME / VENDOR_MOBILE) ────────────────────────────
export interface Vendor {
    VENDOR_CODE: string;
    NAME: string;
    MOBILE_NUMBER: string;
}

export interface FuelType {
    id: number;
    name: string;
    current_price: number;
    new_price: number;
    previous_price: number | null;
    effective_date: string;
    status: 'ACTIVE' | 'INACTIVE';
    document_path?: string | null;
    hod_signature_path?: string | null;
}

export interface TransportPackage {
    id: number;
    vehicle_type_id: number;
    vehicleType?: {
        id: number;
        name: string;
        category: string;
    };
    fuel_type_id: number;
    fuelType?: {
        id: number;
        name: string;
        current_price: number;
    };
    ac_type: 'AC' | 'NON_AC';
    package_name: string;
    package_category: 'MONTHLY' | 'PER_KM' | 'DAILY';
    km_limit: number | null;
    day_limit: number | null;
    base_amount: number | null;
    extra_km_rate: number;
    fuel_efficiency: number;
    additional_day_rate: number | null;
    additional_day_km_limit: number | null;
    ot_rate: number;
    night_out_rate: number;
    effective_date: string;
    status: 'ACTIVE' | 'INACTIVE';
    createdAt?: string;
    updatedAt?: string;
}

export interface TripEntry {
    id: number;
    driver_id: number;
    vehicle_id: number;
    transport_package_id: number;
    entry_date: string;
    start_km: number;
    end_km: number;
    total_km: number;
    extra_km: number;
    total_trip_days: number;
    ot_hours: number;
    night_out_count: number;
    package_name: string;
    package_category: string;
    km_limit: number | null;
    additional_day_km_limit: number | null;
    base_amount: number;
    extra_km_rate: number;
    additional_day_rate: number;
    ot_rate: number;
    night_out_rate: number;
    base_amount_total: number;
    extra_km_amount: number;
    additional_day_amount: number;
    ot_amount: number;
    night_out_amount: number;
    final_amount: number;
    status?: string;
    vehicle?: { id: number; vehicle_number: string; vehicle_type_id?: number };
    driver?: { id: number; user?: { id: number; name: string } };
    transportPackage?: TransportPackage;
    createdAt?: string;
    updatedAt?: string;
}
