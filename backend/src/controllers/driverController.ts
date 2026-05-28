import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Driver } from '../models/Driver';
import { Allocation } from '../models/Allocation';
import { VehicleRequest, RequestStatus } from '../models/VehicleRequest';
import { Vehicle } from '../models/Vehicle';
import { PassengerRequestDetails } from '../models/PassengerRequestDetails';
import { MaterialRequestDetails } from '../models/MaterialRequestDetails';
import { User } from '../models/User';
import fs from 'fs';

interface AuthRequest extends Request {
    user?: any;
}

interface MulterRequest extends Request {
    files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}

export const getMyAllocations = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user.userId;

        // Find the driver profile linked to this user
        const driver = await Driver.findOne({ where: { user_id: userId } });

        if (!driver) {
            return res.status(404).json({ message: 'Driver profile not found for this user.' });
        }

        // Fetch allocations for this driver
        // We want to see Allocated, On Going, and Completed (maybe recent ones)
        const allocations = await Allocation.findAll({
            where: { driver_id: driver.id },
            include: [
                {
                    model: VehicleRequest,
                    include: [
                        { model: PassengerRequestDetails },
                        { model: MaterialRequestDetails },
                        { model: User, as: 'requester', attributes: ['name', 'email', 'division_id'] }
                    ]
                },
                {
                    model: Vehicle
                }
            ],
            order: [['allocated_at', 'DESC']]
        });

        res.status(200).json(allocations);
    } catch (error: any) {
        console.error('Error fetching driver allocations:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

export const updateTripStatus = async (req: AuthRequest, res: Response) => {
    try {
        const { requestId } = req.params;
        const { status } = req.body;
        const userId = req.user.userId;

        if (![RequestStatus.ACCEPTED, RequestStatus.ON_GOING, RequestStatus.COMPLETED].includes(status)) {
            return res.status(400).json({ message: 'Invalid status update.' });
        }

        const driver = await Driver.findOne({ where: { user_id: userId } });
        if (!driver) {
            return res.status(403).json({ message: 'Not authorized as a driver.' });
        }

        const allocation = await Allocation.findOne({
            where: { request_id: requestId, driver_id: driver.id }
        });

        if (!allocation) {
            return res.status(404).json({ message: 'Allocation not found for this driver.' });
        }

        const request = await VehicleRequest.findByPk(requestId);
        if (!request) {
            return res.status(404).json({ message: 'Request not found.' });
        }

        request.status = status;
        await request.save();

        res.status(200).json({ message: `Trip status updated to ${status}`, request });

    } catch (error: any) {
        console.error('Error updating trip status:', error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
};

export const getAllDrivers = async (req: Request, res: Response) => {
    try {
        const drivers = await Driver.findAll({
            include: [
                { model: User, attributes: ['name', 'email', 'employee_id', 'mobile', 'account_type'] }
            ]
        });
        // Flatten user.mobile as contact_no and expose all driver document fields
        const result = drivers.map((d: any) => {
            const driver = d.toJSON();
            return {
                ...driver,
                contact_no: driver.user?.mobile || null,
                // document URL helpers (served from /uploads)
                license_photo_url: driver.license_photo ? (driver.license_photo.replace(/\\/g, '/').startsWith('uploads/') ? '/' + driver.license_photo.replace(/\\/g, '/') : `/uploads/${driver.license_photo.split('/uploads/').pop() || driver.license_photo.replace(/\\/g, '/').split('/').slice(-2).join('/')}`) : null,
                grama_niladhari_cert_url: driver.grama_niladhari_cert ? (driver.grama_niladhari_cert.replace(/\\/g, '/').startsWith('uploads/') ? '/' + driver.grama_niladhari_cert.replace(/\\/g, '/') : `/uploads/${driver.grama_niladhari_cert.split('/uploads/').pop() || driver.grama_niladhari_cert.replace(/\\/g, '/').split('/').slice(-2).join('/')}`) : null,
                police_report_url: driver.police_report ? (driver.police_report.replace(/\\/g, '/').startsWith('uploads/') ? '/' + driver.police_report.replace(/\\/g, '/') : `/uploads/${driver.police_report.split('/uploads/').pop() || driver.police_report.replace(/\\/g, '/').split('/').slice(-2).join('/')}`) : null,
            };
        });
        res.json(result);
    } catch (error) {
        console.error('GetAllDrivers error:', error);
        res.status(500).json({ message: 'Failed to fetch drivers' });
    }
};

/**
 * Update driver details — edits users + drivers tables ONLY, never touches EMB_DB.
 */
export const updateDriver = async (req: MulterRequest, res: Response) => {
    try {
        const { id } = req.params; // driver.id (primary key of drivers table)
        const {
            name,
            email,
            password,
            employee_id,
            contact_no,
            nic_no,
            license_no,
            license_expiry,
            work_experience,
            allowed_vehicle_type_ids,
            other_vehicle_types,
            vehicle_arrangement,
            company_vehicle_numbers
        } = req.body;

        const driver = await Driver.findByPk(id);
        if (!driver) {
            return res.status(404).json({ message: 'Driver not found' });
        }

        // Update user fields (LOCAL account only for name/email/employee_id)
        const user = await User.findByPk(driver.user_id);
        if (!user) {
            return res.status(404).json({ message: 'Associated user not found' });
        }

        // All drivers created via driver-register are LOCAL, so we can update all fields
        if (name) user.name = name;
        if (email) user.email = email;
        if (password && password.trim() !== '') {
            user.password_hash = await bcrypt.hash(password, 10);
        }
        if (employee_id) user.employee_id = employee_id;
        if (contact_no) user.mobile = contact_no;
        await user.save();

        // Update driver fields
        if (nic_no) driver.nic_no = nic_no;
        if (license_no) driver.license_no = license_no;
        if (license_expiry) driver.license_expiry = license_expiry;
        if (work_experience !== undefined) driver.work_experience = work_experience;
        if (other_vehicle_types !== undefined) driver.other_vehicle_types = other_vehicle_types;
        if (vehicle_arrangement) driver.vehicle_arrangement = vehicle_arrangement;
        if (company_vehicle_numbers) {
            driver.company_vehicle_numbers = typeof company_vehicle_numbers === 'string'
                ? JSON.parse(company_vehicle_numbers)
                : company_vehicle_numbers;
        }
        if (allowed_vehicle_type_ids) {
            driver.allowed_vehicle_type_ids = typeof allowed_vehicle_type_ids === 'string'
                ? JSON.parse(allowed_vehicle_type_ids)
                : allowed_vehicle_type_ids;
        }

        // Handle file uploads — only replace if a new file was submitted
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        if (files) {
            if (files['license_photo'] && files['license_photo'][0]) {
                // Remove old file
                if (driver.license_photo && fs.existsSync(driver.license_photo)) {
                    fs.unlinkSync(driver.license_photo);
                }
                driver.license_photo = files['license_photo'][0].path;
            }
            if (files['grama_niladhari_cert'] && files['grama_niladhari_cert'][0]) {
                if (driver.grama_niladhari_cert && fs.existsSync(driver.grama_niladhari_cert)) {
                    fs.unlinkSync(driver.grama_niladhari_cert);
                }
                driver.grama_niladhari_cert = files['grama_niladhari_cert'][0].path;
            }
            if (files['police_report'] && files['police_report'][0]) {
                if (driver.police_report && fs.existsSync(driver.police_report)) {
                    fs.unlinkSync(driver.police_report);
                }
                driver.police_report = files['police_report'][0].path;
            }
        }

        await driver.save();

        res.json({ message: 'Driver updated successfully' });
    } catch (error: any) {
        console.error('UpdateDriver error:', error);
        res.status(500).json({ message: 'Failed to update driver', error: error.message });
    }
};
