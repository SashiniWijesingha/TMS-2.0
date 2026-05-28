import dotenv from 'dotenv';
import sequelize from './config/database';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Import existing models
import { Role, RoleType } from './models/Role';
import { Division } from './models/Division';
import { User } from './models/User';
import { Vehicle, VehicleAvailabilityStatus, VehicleOwnership } from './models/Vehicle';
import { Driver } from './models/Driver';
import { VehicleType } from './models/VehicleType';
import { SystemConfig } from './models/SystemConfig';
import { VehicleAttribute } from './models/VehicleAttribute';
import { SubDivision } from './models/SubDivision';
import { FuelType } from './models/FuelType';
import { TransportPackage, TransportPackageStatus, PackageCategory, AcType } from './models/TransportPackage';

// No need to import other models if not used directly for seeding, 
// but database.ts registers them all so it is fine.

const divisionSeedData = [
    {
        name: 'Solar Residential',
        subDivisions: [
            'Solar R - General',
            'Solar R - Hot Water',
            'Solar R - After Sales',
            'Solar R - Call Center',
            'Solar R - QAQC',
            'Solar R - Ground M./ Kurunegala',
            'Solar R - Ground M./ Habarana',
            'Solar R - Ground M./ Kosgama',
            'Solar R - Ground M./ Kekandura',
            'Solar R - Ground M./ Trinco',
            'Solar R - 1',
            'Solar R - 2'
        ]
    },
    {
        name: 'Solar C&I',
        subDivisions: [
            'Solar C&I - General',
            'Solar C&I - Projects',
            'Solar C&I - Prospective',
            'Solar C&I - After Sales',
            'Solar C&I - QAQC',
            'Solar C&I - MDB/MV',
            'Solar C&I - Utility/Ground M.',
            'Solar C&I - Utility/Ground M./ Madampe',
            'Solar C&I - Utility/Ground M./ Trinco',
            'Solar C&I - Utility/Ground M./ Aparekka',
            'Solar C&I - Utility/Ground M./ Kekandura',
            'Solar C&I - Utility/Ground M./ Kurunegala',
            'Solar C&I - Utility/Ground M./ Nawalapitiya',
            'Solar C&I - Utility/Ground M./ Kosgama',
            'Solar C&I - Utility/Ground M./ Mahiyangana',
            'Solar C&I - Utility/Ground M./ Mathugama',
            'Solar C&I - Utility/Ground M./ Veyangoda',
            'Solar C&I - Utility/Ground M./ Habarana',
            'Solar C&I - Overseas',
            'Solar C&I - Tender'
        ]
    },
    { name: 'SOLAR AMC', subDivisions: ['SOLAR AMC'] },
    { name: 'SOLAR GENERAL', subDivisions: ['SOLAR GENERAL'] },
    { name: 'HAYWIND', subDivisions: ['HAYWIND'] },
    {
        name: 'MEP',
        subDivisions: [
            'MEP AC',
            'MEP Fire',
            'SD PH',
            'SD KP',
            'SD GA',
            'SD AK',
            'SD NS',
            'MEP General'
        ]
    },
    { name: 'Hayleys Mobility', subDivisions: ['Hayleys Mobility'] },
    { name: 'UPS', subDivisions: ['UPS'] },
    { name: 'Energynet Trading', subDivisions: ['Energynet Trading'] },
    { name: 'SCD', subDivisions: ['SCD'] },
    { name: 'FIT', subDivisions: ['FIT'] },
    { name: 'Marketing', subDivisions: ['Marketing'] },
    { name: 'Warehouse', subDivisions: ['Warehouse'] },
    { name: 'BT', subDivisions: ['BT'] },
    { name: 'FSF', subDivisions: ['FSF'] },
    { name: 'Finance', subDivisions: ['Finance'] },
    { name: 'HR', subDivisions: ['HR'] },
    { name: 'General', subDivisions: ['General'] },
    { name: 'Supply Chain', subDivisions: ['Supply Chain'] },
    { name: 'Compliance', subDivisions: ['Compliance'] },
    { name: 'HEL', subDivisions: ['HEL'] },
    { name: 'Transport', subDivisions: ['Transport'] },
    { name: 'BDU', subDivisions: ['BDU'] },
    { name: 'NexGen', subDivisions: ['NexGen'] },
    { name: 'PXU', subDivisions: ['PXU'] },
    {
        name: 'Contract Administration (Legal Team)',
        subDivisions: ['Contract Administration (Legal Team)']
    },
    { name: 'Nawala Experience Center', subDivisions: ['Nawala Experience Center'] },
    { name: 'Call Center', subDivisions: ['Call Center'] }
];

const vehicleTypeSeedData = [
    { name: 'Car', category: 'PASSENGER' },
    { name: 'Van', category: 'PASSENGER' },
    { name: 'Crew Cab', category: 'PASSENGER' },
    { name: 'Double Cab', category: 'PASSENGER' },
    { name: 'Lorry', category: 'MATERIAL' },
    { name: 'Dimo Batta', category: 'MATERIAL' },
    { name: 'Bolero', category: 'MATERIAL' }
];

const vehicleAttributeSeedData = [
    {
        vehicleType: 'Car',
        key: 'specification',
        label: 'Specification',
        type: 'SELECT',
        options: ['Any Car', 'Sedan Car'],
        is_required: true,
        unit: null
    },
    {
        vehicleType: 'Van',
        key: 'specification',
        label: 'Specification',
        type: 'SELECT',
        options: ['A/C Van', 'Non A/C Van', 'KDH 9 Seat', 'KDH 14 Seat'],
        is_required: true,
        unit: null
    },
    {
        vehicleType: 'Double Cab',
        key: 'specification',
        label: 'Specification',
        type: 'SELECT',
        options: ['Any Double Cab'],
        is_required: true,
        unit: null
    }
];

const vehicleSeedData = [
    {
        vehicle_number: 'CAR-101',
        vehicle_type: 'Car',
        specification: 'Sedan Car',
        availability_status: VehicleAvailabilityStatus.AVAILABLE,
        ownership: VehicleOwnership.COMPANY,
        seating_capacity: 4,
        attributes: {
            specification: 'Sedan Car',
            boot_capacity: '420L',
            fuel_type: 'Petrol'
        }
    },
    {
        vehicle_number: 'CAR-102',
        vehicle_type: 'Car',
        specification: 'Any Car',
        availability_status: VehicleAvailabilityStatus.AVAILABLE,
        ownership: VehicleOwnership.VENDOR,
        seating_capacity: 4,
        attributes: {
            specification: 'Any Car',
            boot_capacity: '390L',
            fuel_type: 'Hybrid'
        }
    },
    {
        vehicle_number: 'VAN-301',
        vehicle_type: 'Van',
        specification: 'KDH 14 Seat',
        availability_status: VehicleAvailabilityStatus.AVAILABLE,
        ownership: VehicleOwnership.COMPANY,
        seating_capacity: 14,
        attributes: {
            specification: 'KDH 14 Seat',
            boot_capacity: '1100L',
            fuel_type: 'Diesel'
        }
    },
    {
        vehicle_number: 'VAN-302',
        vehicle_type: 'Van',
        specification: 'KDH 9 Seat',
        availability_status: VehicleAvailabilityStatus.AVAILABLE,
        ownership: VehicleOwnership.VENDOR,
        seating_capacity: 9,
        attributes: {
            specification: 'KDH 9 Seat',
            boot_capacity: '850L',
            fuel_type: 'Diesel'
        }
    },
    {
        vehicle_number: 'VAN-303',
        vehicle_type: 'Van',
        specification: 'A/C Van',
        availability_status: VehicleAvailabilityStatus.AVAILABLE,
        ownership: VehicleOwnership.COMPANY,
        seating_capacity: 12,
        attributes: {
            specification: 'A/C Van',
            boot_capacity: '900L',
            fuel_type: 'Diesel'
        }
    },
    {
        vehicle_number: 'VAN-304',
        vehicle_type: 'Van',
        specification: 'Non A/C Van',
        availability_status: VehicleAvailabilityStatus.MAINTENANCE,
        ownership: VehicleOwnership.COMPANY,
        seating_capacity: 10,
        attributes: {
            specification: 'Non A/C Van',
            boot_capacity: '800L',
            fuel_type: 'Diesel'
        }
    },
    {
        vehicle_number: 'DC-601',
        vehicle_type: 'Double Cab',
        specification: 'Any Double Cab',
        availability_status: VehicleAvailabilityStatus.IN_USE,
        ownership: VehicleOwnership.COMPANY,
        seating_capacity: 5,
        attributes: {
            specification: 'Any Double Cab',
            boot_capacity: '600L',
            fuel_type: 'Diesel'
        }
    }
];


const seedDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection has been established successfully.');

        // 1. Create Roles
        console.log('🌱 Seeding Roles...');
        const rolesData = Object.values(RoleType).map(role => ({ name: role }));
        await Role.bulkCreate(rolesData, { ignoreDuplicates: true });

        // 2. Create Divisions & SubDivisions
        console.log('🌱 Seeding Divisions & SubDivisions...');
        await Division.bulkCreate(divisionSeedData.map(({ name }) => ({ name })), { ignoreDuplicates: true });

        const divisionMap = new Map<string, number>();
        for (const { name } of divisionSeedData) {
            const division = await Division.findOne({ where: { name } });
            if (division) {
                divisionMap.set(name, division.id);
            }
        }

        const subDivisionsToCreate = divisionSeedData.flatMap(({ name, subDivisions }) => {
            const divisionId = divisionMap.get(name);
            if (!divisionId) {
                return [];
            }

            return subDivisions.map(subDivisionName => ({
                name: subDivisionName,
                division_id: divisionId
            }));
        });

        await SubDivision.bulkCreate(subDivisionsToCreate);

        // 3. Create Users
        console.log('🌱 Seeding Users...');

        const commonPasswordHash = await bcrypt.hash('1234', 10);

        const usersToCreate = [
          {
            name: "System Admin",
            email: "admin@gmail.com",
            role: RoleType.ADMIN,
                        division: "General",
                        subDivision: "General",
            employee_id: "EMP001",
            mobile: "0767082957",
          },
          {
            name: "Staff Member",
            email: "staff@test.com",
            role: RoleType.STAFF,
                        division: "HR",
                        subDivision: "HR",
            employee_id: "EMP002",
            mobile: "0767082957",
          },
          {
            name: "Coordinator User",
            email: "coordinator@test.com",
            role: RoleType.COORDINATOR,
            division: "HR",
                        subDivision: "HR",
            employee_id: "EMP003",
            mobile: "0767082957",
          },
          {
            name: "HOD User",
            email: "hod@test.com",
            role: RoleType.HOD,
                        division: "Solar C&I",
                        subDivision: "Solar C&I - General",
            employee_id: "EMP004",
            mobile: "0767082957",
          },
          {
            name: "Transport Officer",
            email: "transport@test.com",
            role: RoleType.TRANSPORT,
                        division: "Transport",
                        subDivision: "Transport",
            employee_id: "EMP005",
            mobile: "0767082957",
          },
        ];

        for (const userData of usersToCreate) {
            const role = await Role.findOne({ where: { name: userData.role } });
            const division = await Division.findOne({ where: { name: userData.division } });

            if (role && division) {
                                const subDivision = userData.subDivision
                                        ? await SubDivision.findOne({ where: { name: userData.subDivision, division_id: division.id } })
                                        : null;

                await User.create({
                    employee_id: userData.employee_id,
                    name: userData.name,
                    email: userData.email,
                    password_hash: commonPasswordHash,
                    role_id: role.id,
                    division_id: division.id,
                                        sub_division_id: subDivision?.id || null,
                    must_change_password: false,
                    account_type: 'LOCAL',
                    mobile: (userData as any).mobile || null
                });
                console.log(`   - Created ${userData.role}: ${userData.email}`);
            }
        }

        // 3.1 Create additional mixed dummy users for testing
        console.log('🌱 Seeding Additional Mixed Dummy Users...');
        const allDivisions = await Division.findAll();

        if (allDivisions.length > 0) {
            const staffRole = await Role.findOne({ where: { name: RoleType.STAFF } });
            const hodRole = await Role.findOne({ where: { name: RoleType.HOD } });
            const coordRole = await Role.findOne({ where: { name: RoleType.COORDINATOR } });

            const mixedRolesToCreate = [
                { role: staffRole, prefix: 'STF', count: 5, name: 'Staff User', emailPrefix: 'staff' },
                { role: coordRole, prefix: 'CRD', count: 5, name: 'Coordinator', emailPrefix: 'coord' },
                { role: hodRole, prefix: 'HOD', count: 5, name: 'Head of Dept', emailPrefix: 'hod' }
            ];

            for (const config of mixedRolesToCreate) {
                if (!config.role) {
                    continue;
                }

                for (let i = 1; i <= config.count; i++) {
                    const randomDivision = allDivisions[Math.floor(Math.random() * allDivisions.length)];
                    const empId = `${config.prefix}${2000 + i}`;

                    const existing = await User.findOne({ where: { employee_id: empId } });
                    if (!existing) {
                        await User.create({
                            employee_id: empId,
                            name: `${config.name} ${i}`,
                            email: `${config.emailPrefix}${i}@test.com`,
                            password_hash: commonPasswordHash,
                            role_id: config.role.id,
                            division_id: randomDivision.id,
                            sub_division_id: null,
                            must_change_password: false,
                            account_type: 'LOCAL'
                        });
                    }
                }
            }

            console.log('   - Created additional mixed dummy users (staff/coordinator/hod)');
        }

        // 4. Create System Config (Defaults)
        console.log('🌱 Seeding System Configuration...');
        const configData = [];
        for (let i = 0; i < 7; i++) {
            configData.push({
                day_of_week: i,
                start_time: '08:00:00',
                end_time: '17:00:00',
                is_active: true
            });
        }
        await SystemConfig.bulkCreate(configData);

        // 5. Create Vehicle Types
        console.log('🌱 Seeding Vehicle Types...');
        const typeMap: Record<string, number> = {};

        for (const vehicleType of vehicleTypeSeedData) {
            const [vt] = await VehicleType.findOrCreate({
                where: { name: vehicleType.name },
                defaults: { category: vehicleType.category }
            });

            if (vt.category !== vehicleType.category) {
                vt.category = vehicleType.category;
                await vt.save();
            }

            typeMap[vehicleType.name] = vt.id;
        }

        // 5.1 Create Fuel Types
        console.log('🌱 Seeding Fuel Types...');
        const fuelTypeSeedData = [
            { name: 'Petrol', current_price: 370.00, effective_date: '2026-05-01', status: 'ACTIVE' },
            { name: 'Diesel', current_price: 340.00, effective_date: '2026-05-01', status: 'ACTIVE' },
            { name: 'Hybrid', current_price: 360.00, effective_date: '2026-05-01', status: 'ACTIVE' },
            { name: 'Electric', current_price: 250.00, effective_date: '2026-05-01', status: 'ACTIVE' }
        ];

        const fuelTypeMap: Record<string, number> = {};
        for (const fuel of fuelTypeSeedData) {
            const [ft] = await FuelType.findOrCreate({
                where: { name: fuel.name },
                defaults: {
                    current_price: fuel.current_price,
                    previous_price: null,
                    effective_date: fuel.effective_date,
                    status: fuel.status as any
                }
            });
            fuelTypeMap[fuel.name] = ft.id;
        }

        // 5.2 Create Transport Packages
        console.log('🌱 Seeding Transport Packages...');
        const transportPackagesSeedData = [
            {
                vehicle_type: 'Car',
                fuel_type: 'Petrol',
                ac_type: AcType.AC,
                package_name: 'Car Monthly Package',
                package_category: PackageCategory.MONTHLY,
                km_limit: 3000,
                day_limit: 30,
                base_amount: 180000.00,
                extra_km_rate: 60.00,
                additional_day_rate: 6000.00,
                ot_rate: 500.00,
                night_out_rate: 1500.00,
                effective_date: '2026-05-01',
                status: TransportPackageStatus.ACTIVE
            },
            {
                vehicle_type: 'Van',
                fuel_type: 'Diesel',
                ac_type: AcType.AC,
                package_name: 'Van Per KM Package',
                package_category: PackageCategory.PER_KM,
                km_limit: null,
                day_limit: null,
                base_amount: null,
                extra_km_rate: 120.00,
                additional_day_rate: null,
                ot_rate: 600.00,
                night_out_rate: 2000.00,
                effective_date: '2026-05-01',
                status: TransportPackageStatus.ACTIVE
            },
            {
                vehicle_type: 'Double Cab',
                fuel_type: 'Diesel',
                ac_type: AcType.AC,
                package_name: 'Double Cab Monthly Package',
                package_category: PackageCategory.MONTHLY,
                km_limit: 2500,
                day_limit: 30,
                base_amount: 220000.00,
                extra_km_rate: 80.00,
                additional_day_rate: 7500.00,
                ot_rate: 600.00,
                night_out_rate: 2000.00,
                effective_date: '2026-05-01',
                status: TransportPackageStatus.ACTIVE
            },
            {
                vehicle_type: 'Crew Cab',
                fuel_type: 'Diesel',
                ac_type: AcType.AC,
                package_name: 'Crew Cab Monthly Package',
                package_category: PackageCategory.MONTHLY,
                km_limit: 2000,
                day_limit: 30,
                base_amount: 240000.00,
                extra_km_rate: 90.00,
                additional_day_rate: 8000.00,
                ot_rate: 650.00,
                night_out_rate: 2000.00,
                effective_date: '2026-05-01',
                status: TransportPackageStatus.ACTIVE
            },
            {
                vehicle_type: 'Lorry',
                fuel_type: 'Diesel',
                ac_type: AcType.NON_AC,
                package_name: 'Lorry Per KM Package',
                package_category: PackageCategory.PER_KM,
                km_limit: null,
                day_limit: null,
                base_amount: null,
                extra_km_rate: 150.00,
                additional_day_rate: null,
                ot_rate: 700.00,
                night_out_rate: 2500.00,
                effective_date: '2026-05-01',
                status: TransportPackageStatus.ACTIVE
            },
            {
                vehicle_type: 'Dimo Batta',
                fuel_type: 'Diesel',
                ac_type: AcType.NON_AC,
                package_name: 'Dimo Batta Per KM Package',
                package_category: PackageCategory.PER_KM,
                km_limit: null,
                day_limit: null,
                base_amount: null,
                extra_km_rate: 100.00,
                additional_day_rate: null,
                ot_rate: 550.00,
                night_out_rate: 1800.00,
                effective_date: '2026-05-01',
                status: TransportPackageStatus.ACTIVE
            },
            {
                vehicle_type: 'Bolero',
                fuel_type: 'Diesel',
                ac_type: AcType.NON_AC,
                package_name: 'Bolero Daily Package',
                package_category: PackageCategory.DAILY,
                km_limit: 100,
                day_limit: 1,
                base_amount: 8000.00,
                extra_km_rate: 70.00,
                additional_day_rate: 8000.00,
                ot_rate: 500.00,
                night_out_rate: 1500.00,
                effective_date: '2026-05-01',
                status: TransportPackageStatus.ACTIVE
            }
        ];

        for (const pkg of transportPackagesSeedData) {
            const vTypeId = typeMap[pkg.vehicle_type];
            const fTypeId = fuelTypeMap[pkg.fuel_type];

            if (vTypeId && fTypeId) {
                await TransportPackage.findOrCreate({
                    where: {
                        vehicle_type_id: vTypeId,
                        fuel_type_id: fTypeId,
                        ac_type: pkg.ac_type,
                        package_name: pkg.package_name,
                        package_category: pkg.package_category,
                        effective_date: pkg.effective_date,
                    },
                    defaults: {
                        vehicle_type_id: vTypeId,
                        fuel_type_id: fTypeId,
                        ac_type: pkg.ac_type,
                        package_name: pkg.package_name,
                        package_category: pkg.package_category,
                        km_limit: pkg.km_limit,
                        day_limit: pkg.day_limit,
                        base_amount: pkg.base_amount,
                        extra_km_rate: pkg.extra_km_rate,
                        additional_day_rate: pkg.additional_day_rate,
                        ot_rate: pkg.ot_rate,
                        night_out_rate: pkg.night_out_rate,
                        effective_date: pkg.effective_date,
                        status: pkg.status
                    }
                });
            }
        }

        // 6. Seed Vehicle Attributes (Dynamic Configuration)
        console.log('🌱 Seeding Vehicle Attributes...');
        for (const attr of vehicleAttributeSeedData) {
            const typeId = typeMap[attr.vehicleType];
            if (typeId) {
                await VehicleAttribute.create({
                    vehicle_type_id: typeId,
                    key: attr.key,
                    label: attr.label,
                    type: attr.type,
                    options: attr.options,
                    unit: attr.unit,
                    is_required: attr.is_required
                });
            }
        }


        // 7. Create Dummy Vehicles with Details
        console.log('🌱 Seeding Vehicles...');
        await Vehicle.bulkCreate(
            vehicleSeedData
                .filter(vehicle => typeMap[vehicle.vehicle_type])
                .map(vehicle => ({
                    vehicle_number: vehicle.vehicle_number,
                    vehicle_type_id: typeMap[vehicle.vehicle_type],
                    specification: vehicle.specification,
                    availability_status: vehicle.availability_status,
                    ownership: vehicle.ownership,
                    attributes: vehicle.attributes,
                    seating_capacity: vehicle.seating_capacity
                }))
        );

        // 7.1 Create additional no-division dummy drivers (all vehicle type permissions)
        console.log('🌱 Seeding Additional Dummy Drivers (No Division)...');
        const seedDriverRole = await Role.findOne({ where: { name: RoleType.DRIVER } });
        const allTypeIds = Object.values(typeMap);

        if (seedDriverRole && allTypeIds.length > 0) {
            for (let i = 1; i <= 5; i++) {
                const empId = `DRV${2000 + i}`;
                const existing = await User.findOne({ where: { employee_id: empId } });

                if (!existing) {
                    const driverUser = await User.create({
                      employee_id: empId,
                      name: `Driver Saman ${i}`,
                      email: `driver_new${i}@test.com`,
                      password_hash: commonPasswordHash,
                      role_id: seedDriverRole.id,
                      division_id: null,
                      sub_division_id: null,
                      mobile: `0767082957`,
                      must_change_password: false,
                      account_type: "LOCAL",
                    });

                    await Driver.create({
                        user_id: driverUser.id,
                        nic_no: `1995${50000 + i}V`,
                        allowed_vehicle_type_ids: allTypeIds
                    });
                }
            }

            console.log('   - Created additional no-division dummy drivers');
        }

                // 8. Seed Dummy Requests for Optimization Demo
        console.log('🌱 Seeding Dummy Requests & Generating Clusters...');
        const { VehicleRequest, RequestStatus } = require('./models/VehicleRequest');
        const { PassengerRequestDetails } = require('./models/PassengerRequestDetails');
        const { RouteService } = require('./services/RouteService');

        const staffUser = await User.findOne({ where: { employee_id: 'EMP002' } });
        const hrDiv = await Division.findOne({ where: { name: 'HR' } });
        const fitDiv = await Division.findOne({ where: { name: 'FIT' } });

        if (staffUser && hrDiv) {
            // Date = Tomorrow
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const dateStr = tomorrow.toISOString().split('T')[0];

            // Create Request 1
            const r1 = await VehicleRequest.create({
                request_type: 'PASSENGER',
                requested_by: staffUser.id,
                division_id: hrDiv.id,
                job_number: 'JOB-001',
                project_name: 'Audit Visit',
                status: RequestStatus.PENDING_COORDINATOR,
                submitted_at: new Date()
            });
            await PassengerRequestDetails.create({
              request_id: r1.id,
              no_of_passengers: 2,
              date: dateStr,
              time: "09:00:00",
              pickup_location: "Colombo Fort",
              drop_location: "Kandy",
              pickup_lat: 6.9319,
              pickup_lng: 79.8478, // Fort
              drop_lat: 7.2906,
              drop_lng: 80.6337, // Kandy
              pickup_coordinates: {
                lat: 6.9319,
                lng: 79.8478,
                address: "Colombo Fort",
              },
              drop_coordinates: { lat: 7.2906, lng: 80.6337, address: "Kandy" },
              share_vehicle: true,
              reason: "Audit",
              contact_person_name: "Test User",
              contact_no: "0767082957",
              vehicle_type: "Car",
              no_of_days: 1,
            });

            // Create Request 2 (Overlap)
            const r2 = await VehicleRequest.create({
                request_type: 'PASSENGER',
                requested_by: staffUser.id,
                division_id: hrDiv.id, // Same division for local coord check
                job_number: 'JOB-002',
                project_name: 'Site Inspection',
                status: RequestStatus.PENDING_COORDINATOR,
                submitted_at: new Date()
            });
            await PassengerRequestDetails.create({
              request_id: r2.id,
              no_of_passengers: 1,
              date: dateStr,
              time: "09:15:00", // +15 mins
              pickup_location: "Colombo Pettah",
              drop_location: "Peradeniya",
              pickup_lat: 6.935,
              pickup_lng: 79.85, // Near Fort
              drop_lat: 7.285,
              drop_lng: 80.63, // Very close to Kandy (Demo)
              pickup_coordinates: {
                lat: 6.935,
                lng: 79.85,
                address: "Colombo Pettah",
              },
              drop_coordinates: {
                lat: 7.285,
                lng: 80.63,
                address: "Peradeniya",
              },
              share_vehicle: true,
              reason: "Inspection",
              contact_person_name: "Test User 2",
              contact_no: "0767082957",
              vehicle_type: "Car",
              no_of_days: 1,
            });

            console.log('   - Created 2 Overlapping Requests for ' + dateStr);

            // Create Request 3 (FIT Department - Cross Logic Test)
            if (fitDiv) {
                const r3 = await VehicleRequest.create({
                  request_type: "PASSENGER",
                  requested_by: staffUser.id, // Using same user for simplicity, but different division logic
                  division_id: hrDiv.id, // FIT Division
                  job_number: "JOB-FIT-001",
                  project_name: "Network Repair",
                  status: RequestStatus.PENDING_COORDINATOR,
                  submitted_at: new Date(),
                });
                await PassengerRequestDetails.create({
                  request_id: r3.id,
                  no_of_passengers: 2,
                  date: dateStr,
                  time: "09:05:00", // Matches the other 2
                  pickup_location: "Colombo Fort",
                  drop_location: "Kandy",
                  pickup_lat: 6.932,
                  pickup_lng: 79.848,
                  drop_lat: 7.291,
                  drop_lng: 80.634,
                  pickup_coordinates: {
                    lat: 6.932,
                    lng: 79.848,
                    address: "Colombo Fort",
                  },
                  drop_coordinates: {
                    lat: 7.291,
                    lng: 80.634,
                    address: "Kandy",
                  },
                  share_vehicle: true,
                  reason: "Cabling",
                  contact_person_name: "IT Tech",
                  contact_no: "0767082957",
                  vehicle_type: "Van",
                  no_of_days: 1,
                });
                console.log('   - Created 1 FIT Dept Request (Cross-Division Overlap)');
            }

            // Trigger Cache (Wait for it to finish for demo purposes)
            console.log('🔄 Triggering Background Cache Scan...');
            await RouteService.scanAndCache(dateStr);
            console.log('✅ Optimization Cache populated.');
        }

        console.log('✅ Seeding completed successfully!');

    } catch (error) {
        console.error('❌ Seeding failed:', error);
    } finally {
        await sequelize.close();
    }
};

// Run the seed
seedDatabase();
