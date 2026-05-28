import { Request, Response } from 'express';
import { User } from '../models/User';
import { Role } from '../models/Role';
import { Division } from '../models/Division';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { type SignOptions } from 'jsonwebtoken';
import hrisSequelize from '../config/hrisDatabase';
import { generateOTP, sendOTPEmail, sendPasswordResetOTPEmail } from '../utils/mailer';

const otpStore = new Map<string, { otp: string, expires: number, hrisData: any }>();
const resetOtpStore = new Map<string, { otp: string, expires: number }>();

const SECRET_KEY = process.env.JWT_SECRET;
const JWT_EXPIRES_IN: SignOptions['expiresIn'] =
    (process.env.JWT_EXPIRES_IN as SignOptions['expiresIn']) || '14d';

if (!SECRET_KEY) {
    console.error('JWT_SECRET is not defined in environment variables.');
    process.exit(1);
}

const MIN_PASSWORD_LENGTH = 12;

const isPasswordStrong = (password: string): boolean => {
    return typeof password === 'string' && password.length >= MIN_PASSWORD_LENGTH;
};

const findHrisUserByEmail = async (email: string): Promise<any[] | null> => {
    try {
        const [results] = await (hrisSequelize as any).query(
            'SELECT HRIS_NO, NAME, Email_Address, Mobile FROM EMB_DB WHERE Email_Address = :email',
            { replacements: { email } }
        );
        return Array.isArray(results) ? results : [];
    } catch (error) {
        console.error('[Auth] HRIS lookup failed during login setup check:', error);
        return null;
    }
};

export const login = async (req: Request, res: Response) => {
    let { email, password } = req.body;
    email = email?.trim().toLowerCase();

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required.' });
    }

    try {
        const user = await User.findOne({
            where: { email },
            include: [
                { model: Role, attributes: ['name'] },
                { model: Division, attributes: ['id', 'name'] }
            ]
        });

        const isPreRegistered = user && user.account_type === 'HRIS' && user.must_change_password;

        if (!user || isPreRegistered) {
            // Check if it's an initial login using the employee HRIS_NO
            const results = await findHrisUserByEmail(email);

            if (results === null) {
                if (isPreRegistered) {
                    return res.status(503).json({
                        message: 'Account setup is temporarily unavailable. Please try again shortly.'
                    });
                }

                return res.status(401).json({ message: 'This account does not exist or invalid credentials.' });
            }

            if (results && results.length > 0) {
                // It's a valid HRIS employee trying to setup!
                const hrisUser = results[0];
                const hrisNo = hrisUser.HRIS_NO ? String(hrisUser.HRIS_NO) : '';

                if (hrisNo && password === hrisNo) {
                    const otp = generateOTP();
                    
                    // Store OTP temporarily for 10 minutes
                    otpStore.set(email, {
                        otp,
                        expires: Date.now() + 10 * 60 * 1000, // 10 minutes
                        hrisData: hrisUser
                    });

                    // Send the email
                    try {
                        await sendOTPEmail(email, otp);
                        return res.json({ 
                            message: 'A verification code has been sent to your email to setup your account.',
                            status: 'REQUIRE_FIRST_TIME_SETUP' 
                        });
                    } catch (emailError) {
                        console.error("Error sending OTP email:", emailError);
                        return res.status(500).json({ message: 'Error sending verification email.' });
                    }
                }
            }

            return res.status(401).json({ message: 'This account does not exist or invalid credentials.' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password_hash);

        if (!isPasswordValid) {
            return res.status(401).json({ message: 'Invalid email or password' });
        }

        // --- HRIS EMPLOYMENT VALIDATION ---
        // If this is an HRIS-linked account, verify the employee still exists in EMB_DB.
        // If they've left the organisation, block login and remove the stale TMS record.
        if (user.account_type === 'HRIS') {
            try {
                const [hrisCheck] = await (hrisSequelize as any).query(
                    'SELECT HRIS_NO FROM EMB_DB WHERE Email_Address = :email',
                    { replacements: { email } }
                );
                if (!hrisCheck || (hrisCheck as any[]).length === 0) {
                    // Employee no longer in HRIS — auto-cleanup and block access
                    await user.destroy();
                    console.log(`[Auth] Blocked login and removed stale TMS account for departed employee: ${email}`);
                    return res.status(401).json({ message: 'Your account has been deactivated. Please contact HR or the system administrator.' });
                }
            } catch (hrisCheckError) {
                // If HRIS is unreachable, fail-open and log — do not block legitimate users
                console.error('[Auth] HRIS employment check failed, proceeding with login:', hrisCheckError);
            }
        }
        // ----------------------------------

        // --- SILENT SYNC FOR HRIS USERS ---
        if (user.account_type === 'HRIS') {
            try {
                const [results] = await (hrisSequelize as any).query(
                    'SELECT HRIS_NO, NAME, Mobile FROM EMB_DB WHERE Email_Address = :email',
                    { replacements: { email } }
                );

                if (results && results.length > 0) {
                    const hrisUser = results[0];
                    let hasChanges = false;
                    
                    if (hrisUser.NAME && user.name !== hrisUser.NAME) {
                        user.name = hrisUser.NAME;
                        hasChanges = true;
                    }
                    if (hrisUser.HRIS_NO && user.employee_id !== String(hrisUser.HRIS_NO)) {
                        user.employee_id = String(hrisUser.HRIS_NO);
                        hasChanges = true;
                    }
                    if (hrisUser.Mobile && user.mobile !== hrisUser.Mobile) {
                        user.mobile = hrisUser.Mobile;
                        hasChanges = true;
                    }
                    
                    if (hasChanges) {
                        await user.save();
                    }
                }
            } catch (syncError) {
                console.error("Silent sync failed, proceeding with login anyway:", syncError);
            }
        }
        // ----------------------------------

        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: user.role?.name,
                divisionId: user.division_id
            },
            SECRET_KEY,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({ token, role: user.role?.name, name: user.name });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

import { AuthRequest } from '../middleware/authMiddleware';

export const changePassword = async (req: AuthRequest, res: Response) => {
    const { currentPassword, newPassword } = req.body;
    const userId = req.user?.userId;

    if (!userId) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    if (!isPasswordStrong(newPassword)) {
        return res.status(400).json({ message: `New password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
    }

    try {
        const user = await User.findByPk(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Verify current password
        const isPasswordValid = await bcrypt.compare(currentPassword, user.password_hash);
        if (!isPasswordValid) {
            return res.status(400).json({ message: 'Invalid current password' });
        }

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password_hash = hashedPassword;
        user.must_change_password = false; // Reset flag if it was set
        await user.save();

        res.json({ message: 'Password updated successfully' });

    } catch (error) {
        console.error('Change password error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const verifyOtpAndSetup = async (req: Request, res: Response) => {
    let { email, otp, newPassword } = req.body;
    email = email?.trim().toLowerCase();

    if (!isPasswordStrong(newPassword)) {
        return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
    }

    const storeData = otpStore.get(email);
    if (!storeData) {
        return res.status(400).json({ message: 'OTP session expired or invalid.' });
    }

    if (storeData.otp !== otp) {
        return res.status(400).json({ message: 'Invalid verification code.' });
    }

    if (Date.now() > storeData.expires) {
        otpStore.delete(email);
        return res.status(400).json({ message: 'OTP has expired. Please log in again.' });
    }

    try {
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        let user = await User.findOne({ 
            where: { email },
            include: [{ model: Role, attributes: ['name'] }]
        });
        
        let roleName = 'STAFF';

        if (user) {
            // User was pre-registered by admin
            user.password_hash = hashedPassword;
            user.must_change_password = false;
            if (storeData.hrisData.Mobile) {
                user.mobile = storeData.hrisData.Mobile;
            }
            await user.save();
            
            // Re-fetch or use existing role to sign token
            if (user.role) {
                 roleName = user.role.name;
            }
        } else {
            // Find default STAFF role
            let role = await Role.findOne({ where: { name: 'STAFF' } });
            roleName = role ? role.name : 'STAFF';
            const employeeId = storeData.hrisData.HRIS_NO ? String(storeData.hrisData.HRIS_NO) : `EMP-${Date.now()}`;

            user = await User.create({
                employee_id: employeeId,
                name: storeData.hrisData.NAME,
                email: email,
                password_hash: hashedPassword,
                role_id: role ? role.id : 1, // Defaulting safely
                must_change_password: false,
                account_type: 'HRIS', // Important to save them as HRIS
                mobile: storeData.hrisData.Mobile || null
            });
        }

        // Clean up OTP store
        otpStore.delete(email);

        // Generate instant login token
        const token = jwt.sign(
            {
                userId: user.id,
                email: user.email,
                role: roleName,
                divisionId: user.division_id
            },
            SECRET_KEY as string,
            { expiresIn: JWT_EXPIRES_IN }
        );

        res.json({ token, role: roleName, name: user.name });

    } catch (error) {
        console.error('Setup error:', error);
        res.status(500).json({ message: 'Internal server error during account setup' });
    }
};

export const requestPasswordReset = async (req: Request, res: Response) => {
    let { email } = req.body;
    email = email?.trim().toLowerCase();
    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            // Generic message to prevent email enumeration
            return res.json({ message: 'If an account with this email exists, a verification code has been sent.' });
        }
        
        const otp = generateOTP();
        resetOtpStore.set(email, {
            otp,
            expires: Date.now() + 10 * 60 * 1000 // 10 minutes
        });
        
        await sendPasswordResetOTPEmail(email, otp);
        return res.json({ message: 'If an account with this email exists, a verification code has been sent.' });
    } catch (error) {
        console.error('Password reset request error:', error);
        return res.status(500).json({ message: 'Internal server error while requesting password reset' });
    }
};

export const resetPasswordWithOtp = async (req: Request, res: Response) => {
    let { email, otp, newPassword } = req.body;
    email = email?.trim().toLowerCase();

    if (!isPasswordStrong(newPassword)) {
        return res.status(400).json({ message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
    }

    const storeData = resetOtpStore.get(email);
    if (!storeData) {
        return res.status(400).json({ message: 'OTP session expired or invalid. Please request a new code.' });
    }

    if (storeData.otp !== otp) {
        return res.status(400).json({ message: 'Invalid verification code.' });
    }

    if (Date.now() > storeData.expires) {
        resetOtpStore.delete(email);
        return res.status(400).json({ message: 'Verification code has expired. Please request a new one.' });
    }

    try {
        const user = await User.findOne({ where: { email } });
        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const hashedPassword = await bcrypt.hash(newPassword, 10);
        user.password_hash = hashedPassword;
        user.must_change_password = false;
        await user.save();

        resetOtpStore.delete(email);
        return res.json({ message: 'Your password has been reset successfully.' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Internal server error while resetting password' });
    }
};
