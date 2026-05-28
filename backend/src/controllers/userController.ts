import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { User } from '../models/User';
import { Role, RoleType } from '../models/Role';
import { Division } from '../models/Division';
import { Driver } from '../models/Driver';
import sequelize from '../config/database';
import hrisSequelize from '../config/hrisDatabase';
import { AuthRequest } from '../middleware/authMiddleware';

// Helper to get Role ID by Name
const getRoleId = async (roleName: RoleType) => {
    const role = await Role.findOne({ where: { name: roleName } });
    return role ? role.id : null;
};

export const createUser = async (req: Request, res: Response) => {
    const transaction = await sequelize.transaction();
    try {
        const { employee_id, name, email, password, role, division_id, driverDetails } = req.body;

        // Check if user exists
        const existingUser = await User.findOne({ where: { email } });
        if (existingUser) {
            await transaction.rollback();
            return res.status(400).json({ message: 'User already exists with this email' });
        }

        const existingEmpId = await User.findOne({ where: { employee_id } });
        if (existingEmpId) {
            await transaction.rollback();
            return res.status(400).json({ message: 'User already exists with this Employee ID' });
        }

        const roleId = await getRoleId(role);
        if (!roleId) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Invalid role specified' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        const newUser = await User.create({
            employee_id,
            name,
            email,
            password_hash,
            role_id: roleId,
            division_id: division_id || null, // Optional for some roles
            must_change_password: true,
            account_type: 'LOCAL'
        }, { transaction });

        // If Role is DRIVER, create Driver Profile
        if (role === 'DRIVER') {
            if (!driverDetails || !driverDetails.contact_no || !driverDetails.nic_no) {
                await transaction.rollback();
                return res.status(400).json({ message: 'Driver details (contact_no, nic_no) are required for DRIVER role.' });
            }

            // Save contact number to User.mobile (single source of truth)
            newUser.mobile = driverDetails.contact_no;
            await newUser.save({ transaction });

            await Driver.create({
                user_id: newUser.id,
                nic_no: driverDetails.nic_no,
                allowed_vehicle_type_ids: driverDetails.allowed_vehicle_type_ids || []
            }, { transaction });
        }

        await transaction.commit();

        res.status(201).json({ message: 'User created successfully', user: { id: newUser.id, name: newUser.name, email: newUser.email } });
    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Error creating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllUsers = async (req: Request, res: Response) => {
    try {
        const users = await User.findAll({
            include: [
                { model: Role, attributes: ['name'] },
                { model: Division, attributes: ['name'] },
                { model: Driver }
            ],
            attributes: { exclude: ['password_hash'] }
        });

        // Flatten the structure for frontend consumption
        const formattedUsers = users.map(user => {
            const u = user.toJSON() as any;
            return {
                ...u,
                role: u.role ? u.role.name : null,
                driverDetails: u.driver ? {
                    contact_no: u.mobile,  // sourced from users.mobile
                    nic_no: u.driver.nic_no,
                    allowed_vehicle_type_ids: u.driver.allowed_vehicle_type_ids
                } : undefined,
                source: u.account_type === 'LOCAL' ? 'DEV_LOCAL' : 'TMS',
                account_type: u.account_type
            };
        });

        // Add HRIS users who have not setup their account yet
        const seenEmails = new Set(formattedUsers.map(u => u.email));
        const finalUsersList = [...formattedUsers];

        const [hrisUsers] = await (hrisSequelize as any).query('SELECT HRIS_NO, NAME, Email_Address, DESIGNATION FROM EMB_DB');
        let tempIndex = 0;
        for (const hUser of hrisUsers as any[]) {
            if (!hUser.Email_Address || seenEmails.has(hUser.Email_Address)) {
                continue; // Skip if they don't have an email or already setup in TMS!
            }

            seenEmails.add(hUser.Email_Address);

            finalUsersList.push({
                id: `HR-${hUser.HRIS_NO || 'UNK'}-${tempIndex++}`, // Give a temporary identifiable ID for frontend table mapping
                employee_id: String(hUser.HRIS_NO),
                name: hUser.NAME,
                email: hUser.Email_Address,
                role: 'PENDING_HRIS', // Indicates they have not logged in yet
                division_id: null,
                source: 'HRIS',
                account_type: 'HRIS',
                designation: hUser.DESIGNATION
            });
        }

        res.json(finalUsersList);
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getCurrentUserContact = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user?.userId;
        const email = req.user?.email;

        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'mobile', 'account_type', 'employee_id']
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let contactName = user.name || '';
        let contactMobile = user.mobile || '';
        let contactEmployeeId = user.employee_id || '';

        // Read-only HRIS sync for fresh name/mobile/HRIS_NO values by email.
        if (email) {
            try {
                const [rows] = await (hrisSequelize as any).query(
                    'SELECT HRIS_NO, NAME, Mobile FROM EMB_DB WHERE Email_Address = :email LIMIT 1',
                    { replacements: { email } }
                );

                const hrisRow = Array.isArray(rows) && rows.length > 0 ? rows[0] : null;
                if (hrisRow) {
                    if (hrisRow.NAME) contactName = String(hrisRow.NAME);
                    if (hrisRow.Mobile) contactMobile = String(hrisRow.Mobile);
                    if (hrisRow.HRIS_NO) contactEmployeeId = String(hrisRow.HRIS_NO);
                }
            } catch (hrisError) {
                console.warn('[getCurrentUserContact] HRIS lookup failed, falling back to TMS user table:', hrisError);
            }
        }

        res.json({
            name: contactName,
            mobile: contactMobile,
            email: user.email,
            epf_no: contactEmployeeId,
        });
    } catch (error) {
        console.error('Error fetching current user contact:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getUserById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const user = await User.findByPk(id, {
            include: [
                { model: Role, attributes: ['name'] },
                { model: Division, attributes: ['name'] },
                { model: Driver }
            ],
            attributes: { exclude: ['password_hash'] }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const u = user.toJSON() as any;
        const formattedUser = {
            ...u,
            role: u.role ? u.role.name : null,
            driverDetails: u.driver ? {
                contact_no: u.mobile,  // sourced from users.mobile
                nic_no: u.driver.nic_no,
                allowed_vehicle_type_ids: u.driver.allowed_vehicle_type_ids
            } : undefined
        };

        res.json(formattedUser);
    } catch (error) {
        console.error('Error fetching user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { employee_id, name, email, password, role, division_id, driverDetails } = req.body;
        let user: any;

        // --- PRE-REGISTER PENDING HRIS USER ---
        if (id.startsWith('HR-')) {
            user = await User.findOne({ where: { email } });
            if (!user) {
                const roleId = await getRoleId(role);
                // Create them with a dummy password hash (they must use OTP to set an actual password)
                const dummyHash = await bcrypt.hash(Math.random().toString(36), 10);
                
                await User.create({
                    employee_id: employee_id,
                    name: name,
                    email: email,
                    password_hash: dummyHash,
                    role_id: roleId || 1,
                    division_id: division_id || null,
                    must_change_password: true,
                    account_type: 'HRIS'
                });
                
                return res.json({ message: 'User pre-registered and updated successfully' });
            }
        } else {
            user = await User.findByPk(id);
        }

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (password) {
            user.password_hash = await bcrypt.hash(password, 10);
            user.must_change_password = true; // Optional: force reset if admin changes it
        }

        if (role) {
            const roleId = await getRoleId(role);
            if (roleId) user.role_id = roleId;
        }

        // Admin can update Division
        if (division_id !== undefined) user.division_id = division_id;

        // Admin can ONLY update Name and Email if the user was created as a LOCAL Dev User.
        if (user.account_type === 'LOCAL') {
            if (name) user.name = name;
            if (email) user.email = email;
            if (employee_id) user.employee_id = employee_id;
        }

        await user.save();

        // Handle Driver Details Update
        // If role is DRIVER (checked via string 'DRIVER' or if current user role is driver - we should rely on input role or fetch current role name... 
        // For simplicity, if driverDetails is present, we try to update/create driver record)
        if (driverDetails) {
            let driver = await Driver.findOne({ where: { user_id: user.id } });
            if (driver) {
                // Save contact_no to User.mobile (single source of truth)
                if (driverDetails.contact_no) user.mobile = driverDetails.contact_no;
                if (driverDetails.nic_no) driver.nic_no = driverDetails.nic_no;
                if (driverDetails.allowed_vehicle_type_ids) driver.allowed_vehicle_type_ids = driverDetails.allowed_vehicle_type_ids;
                await driver.save();
                await user.save();
            } else if (role === 'DRIVER') { // Only create if role is explicitly DRIVER
                if (driverDetails.contact_no) user.mobile = driverDetails.contact_no;
                await user.save();
                await Driver.create({
                    user_id: user.id,
                    nic_no: driverDetails.nic_no,
                    allowed_vehicle_type_ids: driverDetails.allowed_vehicle_type_ids || []
                });
            }
        }

        res.json({ message: 'User updated successfully' });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteUser = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;

        // If it's a pending HRIS user, they don't exist in our DB, so just return success
        if (id.toString().startsWith('HR-')) {
            return res.json({ message: 'Pending user removed from view successfully' });
        }

        const user = await User.findByPk(id);

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        await user.destroy();
        res.json({ message: 'User deleted successfully' });
    } catch (error) {
        console.error('Error deleting user:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getDivisions = async (req: Request, res: Response) => {
    try {
        const divisions = await Division.findAll();
        res.json(divisions);
    } catch (error) {
        console.error('Error fetching divisions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
