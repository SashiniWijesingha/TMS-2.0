import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Driver } from '../models/Driver';
import sequelize from '../config/database';
import fs from 'fs';

interface MulterRequest extends Request {
    files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}

export const registerDriver = async (req: MulterRequest, res: Response) => {
    const transaction = await sequelize.transaction();
    const uploadedFiles: string[] = [];

    try {
        const {
            name,
            employee_id,
            email,
            password,
            contact_no,
            nic_no,
            license_no,
            license_expiry,
            work_experience,
            other_vehicle_types,
            allowed_vehicle_type_ids,
            vehicle_arrangement,
            company_vehicle_numbers
        } = req.body;

        // Validation
        if (!name || !employee_id || !email || !password || !contact_no || !nic_no) {
            return res.status(400).json({ message: 'Missing required fields' });
        }

        // Check duplicates
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const role = await Role.findOne({ where: { name: 'DRIVER' } });
        if (!role) {
            return res.status(500).json({ message: 'Driver role not configured' });
        }

        // Create User
        const password_hash = await bcrypt.hash(password, 10);
        const newUser = await User.create({
            employee_id,
            name,
            email,
            password_hash,
            role_id: role.id,
            mobile: contact_no,
            must_change_password: true,
            account_type: 'LOCAL'
        }, { transaction });

        // Handle Files
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        const getFilePath = (fieldname: string) => {
            if (files && files[fieldname] && files[fieldname][0]) {
                const path = files[fieldname][0].path;
                uploadedFiles.push(path);
                return path;
            }
            return null;
        };

        // Create Driver Profile (contact_no is stored in User.mobile)
        await Driver.create({
            user_id: newUser.id,
            nic_no,
            license_no,
            license_expiry,
            work_experience,
            other_vehicle_types, // Save the manual entry
            vehicle_arrangement: vehicle_arrangement || 'none',
            company_vehicle_numbers: company_vehicle_numbers ? JSON.parse(company_vehicle_numbers) : [],
            license_photo: getFilePath('license_photo'),
            grama_niladhari_cert: getFilePath('grama_niladhari_cert'),
            police_report: getFilePath('police_report'),
            allowed_vehicle_type_ids: allowed_vehicle_type_ids ? JSON.parse(allowed_vehicle_type_ids) : []
        }, { transaction });

        await transaction.commit();

        res.status(201).json({
            message: 'Driver registered successfully',
            driverId: newUser.id
        });

    } catch (error: any) {
        if (transaction) await transaction.rollback();

        // Cleanup uploaded files on error
        uploadedFiles.forEach(file => {
            if (fs.existsSync(file)) fs.unlinkSync(file);
        });

        console.error('Driver registration error:', error);
        res.status(500).json({ message: 'Failed to register driver', error: error.message });
    }
};
