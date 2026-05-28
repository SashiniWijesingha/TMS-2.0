import dotenv from 'dotenv';
import sequelize from './config/database';

// Load environment variables ( redundancy check, beneficial if run standalone)
dotenv.config();

const setupDatabase = async () => {
    try {
        await sequelize.authenticate();
        console.log(`Checking connection to DB...`);
        // STRICT SECURITY GUARD: Ensure we NEVER touch the HRIS or HDOC databases.
        const dbName = sequelize.config.database;
        if (dbName === process.env.DB_HRIS || dbName === process.env.DB_HDOC) {
             throw new Error(`CRITICAL SECURITY ALERT: Attempted to manipulate restricted database (${dbName}). Aborting database sync immediately.`);
        }
        console.log(`✅ Connected successfully specifically to: ${dbName} (Safe DB)`);

        // Disable FK checks to allow dropping tables with dependencies
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 0', { raw: true });

        // Force sync to drop and recreate tables (Reflects all model updates including Drivers & RideShareSuggestion)
        // WARNING: This deletes all data!
        console.log('🔄 Syncing database (force: true)...');
        await sequelize.sync({ force: true });

        // Re-enable FK checks
        await sequelize.query('SET FOREIGN_KEY_CHECKS = 1', { raw: true });

        console.log('✅ Database synchronized. All tables created.');

    } catch (error) {
        console.error('❌ Unable to connect to the database or sync failed:', error);
    } finally {
        await sequelize.close();
    }
};

// Run the setup
setupDatabase();
