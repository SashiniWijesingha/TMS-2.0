import sequelize from './config/database';
import { TransportPackage } from './models/TransportPackage';
import { VehicleType } from './models/VehicleType';

const seedPackage = async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    const vt = await VehicleType.findOne({ where: { name: 'Sedan Car' } });
    if (!vt) throw new Error('Vehicle type not found');
    await TransportPackage.create({
      package_name: 'Test Package',
      package_category: 'Standard',
      extra_km_rate: 5.0,
      status: 'ACTIVE',
      vehicle_type_id: vt.id,
      fuel_type_id: 1, // assume existing fuel type
    });
    console.log('Package seeded');
    process.exit(0);
  } catch (e) {
    console.error('Seed error', e);
    process.exit(1);
  }
};

seedPackage();
