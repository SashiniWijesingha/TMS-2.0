import sequelize from './config/database';
import { TransportPackage } from './models/TransportPackage';
import { TripEntry } from './models/TripEntry';

const deletePackage = async () => {
  try {
    await sequelize.authenticate();
    console.log('DB connected');
    
    const pkg = await TransportPackage.findOne({
      where: {
        package_name: 'Car(01-pakage)'
      }
    });

    if (!pkg) {
      console.log('Package not found');
      process.exit(0);
    }

    // Delete associated trip entries first due to Foreign Key constraint
    await TripEntry.destroy({
      where: {
        transport_package_id: pkg.id
      }
    });
    console.log(`Deleted trip entries associated with package ID: ${pkg.id}`);

    const result = await pkg.destroy();
    console.log(`Deleted package: ${pkg.package_name}`);
    
    process.exit(0);
  } catch (e) {
    console.error('Delete error', e);
    process.exit(1);
  }
};

deletePackage();