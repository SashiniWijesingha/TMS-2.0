const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
require('dotenv').config();

async function createAdmin() {
    try {
        // Database configuration from .env
        const connection = await mysql.createConnection({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_TMS,
            port: process.env.DB_PORT || 3306,
        });

        console.log('Connected to database.');

        const email = 'sashiniwijesingha83@gmail.com';
        const rawPassword = 'sashi123';
        const name = 'Sashini Wijesingha';
        const employeeId = 'ADM001';
        const roleId = 1; // ADMIN role ID

        // Check if user already exists
        const [existing] = await connection.execute('SELECT id FROM users WHERE email = ?', [email]);
        if (existing.length > 0) {
            console.log(`User with email ${email} already exists.`);
            await connection.end();
            return;
        }

        // Hash the password with bcrypt (salt rounds = 10 as in application)
        const passwordHash = await bcrypt.hash(rawPassword, 10);

        // Insert user into 'users' table
        const [result] = await connection.execute(
            'INSERT INTO users (employee_id, name, email, password_hash, role_id, account_type, must_change_password, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [
                employeeId,
                name,
                email,
                passwordHash,
                roleId,
                'LOCAL',
                0, // must_change_password = false
                new Date(),
                new Date()
            ]
        );

        console.log(`Admin user created successfully! ID: ${result.insertId}`);
        await connection.end();
    } catch (error) {
        console.error('Error creating admin user:', error);
    }
}

createAdmin();