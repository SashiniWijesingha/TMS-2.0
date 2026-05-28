import sequelize from './config/database';
import { Vehicle } from './models/Vehicle';

const syncDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connected. Syncing Vehicle table...");
        await Vehicle.sync({ alter: true });
        console.log("Vehicle table synced successfully with the new active_package_id column.");
        process.exit(0);
    } catch (error) {
        console.error("Database sync error:", error);
        process.exit(1);
    }
};

syncDatabase();
