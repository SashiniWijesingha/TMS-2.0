import sequelize from './config/database';
import { TransportPackage } from './models/TransportPackage';

const syncDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log("Database connected. Syncing TransportPackage table...");
        await TransportPackage.sync({ alter: true });
        console.log("TransportPackage table synced successfully with the new additional_day_km_limit column.");
        process.exit(0);
    } catch (error) {
        console.error("Database sync error:", error);
        process.exit(1);
    }
};

syncDatabase();
