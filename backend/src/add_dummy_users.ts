
import dotenv from 'dotenv';
import sequelize from './config/database';
import bcrypt from 'bcryptjs';
import { User } from './models/User';
import { Role, RoleType } from './models/Role';
import { Division } from './models/Division';
import { Driver } from './models/Driver';
import { VehicleType } from './models/VehicleType';

dotenv.config();

const addDummyUsers = async () => {
    try {
        await sequelize.authenticate();
        console.log('✅ Connection established.');

        const passwordHash = await bcrypt.hash('1234', 10);

        // Fetch Roles
        const staffRole = await Role.findOne({ where: { name: RoleType.STAFF } });
        const hodRole = await Role.findOne({ where: { name: RoleType.HOD } });
        const coordRole = await Role.findOne({ where: { name: RoleType.COORDINATOR } });
        const driverRole = await Role.findOne({ where: { name: RoleType.DRIVER } });

        if (!staffRole || !driverRole || !hodRole || !coordRole) {
            console.error('❌ Roles not found. Please run initial seed first.');
            return;
        }

        // Fetch Divisions
        const divisions = await Division.findAll();
        if (divisions.length === 0) {
            console.error('❌ Divisions not found.');
            return;
        }

        console.log('🌱 Adding 20 Dummy Users (Varied Roles)...');

        // Distribution of 20 users:
        // 5 Staff
        // 5 Coordinators
        // 5 HODs
        // 5 Drivers (No Division)

        const rolesToCreate = [
            { role: staffRole, prefix: 'STF', count: 5, name: 'Staff User', emailPrefix: 'staff' },
            { role: coordRole, prefix: 'CRD', count: 5, name: 'Coordinator', emailPrefix: 'coord' },
            { role: hodRole, prefix: 'HOD', count: 5, name: 'Head of Dept', emailPrefix: 'hod' },
        ];

        let userCounter = 1;

        // 1. Create Staff, Coordinators, HODs (With Random Divisions)
        for (const config of rolesToCreate) {
            console.log(`   - Creating ${config.count} ${config.name}s...`);
            for (let i = 1; i <= config.count; i++) {
                const randomDivision = divisions[Math.floor(Math.random() * divisions.length)];
                const empId = `${config.prefix}${2000 + i}`;

                const existing = await User.findOne({ where: { employee_id: empId } });
                if (!existing) {
                    await User.create({
                        employee_id: empId,
                        name: `${config.name} ${i}`,
                        email: `${config.emailPrefix}${i}@test.com`,
                        password_hash: passwordHash,
                        role_id: config.role.id,
                        division_id: randomDivision.id,
                        must_change_password: false
                    });
                    console.log(`     ✔️ Created: ${config.emailPrefix}${i}@test.com (${randomDivision.name})`);
                }
            }
        }

        // 2. Create 5 Drivers (NO DIVISION)
        console.log(`   - Creating 5 Drivers...`);
        const vehicleTypes = await VehicleType.findAll();
        const allTypeIds = vehicleTypes.map(vt => vt.id); // Give them all types for simplicity

        for (let i = 1; i <= 5; i++) {
            const empId = `DRV${2000 + i}`;

            const existing = await User.findOne({ where: { employee_id: empId } });
            if (!existing) {
                const user = await User.create({
                    employee_id: empId,
                    name: `Driver User ${i}`,
                    email: `driver_new${i}@test.com`,
                    password_hash: passwordHash,
                    role_id: driverRole.id,
                    division_id: null, // explicit null
                    must_change_password: false
                });

                // Create Driver Profile
                await Driver.create({
                    user_id: user.id,
                    contact_no: `077${8000000 + i}`,
                    nic_no: `1995${50000 + i}V`,
                    allowed_vehicle_type_ids: allTypeIds
                });

                console.log(`     ✔️ Created: driver_new${i}@test.com (No Division)`);
            }
        }

        console.log('✅ Successfully added 20 mixed dummy users.');

    } catch (error) {
        console.error('❌ Error adding dummy users:', error);
    } finally {
        await sequelize.close();
    }
};

addDummyUsers();
