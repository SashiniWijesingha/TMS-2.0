import { Response } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { AuthRequest } from '../middleware/authMiddleware';
import { User } from '../models/User';

const HANDOFF_EXPIRY_SECONDS = 120;

export const createMaterialSsoHandoff = async (req: AuthRequest, res: Response) => {
    try {
        const materialServiceUrl = process.env.MATERIAL_SERVICE_URL;
        const signingSecret = process.env.MATERIAL_SSO_SECRET || process.env.JWT_SECRET;

        if (!materialServiceUrl) {
            return res.status(503).json({ message: 'Material service is not configured.' });
        }

        if (!signingSecret) {
            return res.status(500).json({ message: 'Material SSO secret is not configured.' });
        }

        const userId = req.user?.userId;
        if (!userId) {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = await User.findByPk(userId, {
            attributes: ['id', 'name', 'email', 'employee_id'],
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found.' });
        }

        const token = jwt.sign(
            {
                sub: String(user.id),
                userId: user.id,
                email: user.email,
                role: req.user?.role,
                employeeId: user.employee_id,
                name: user.name,
                nonce: randomBytes(12).toString('hex'),
                source: 'tms-frontend',
            },
            signingSecret,
            {
                expiresIn: HANDOFF_EXPIRY_SECONDS,
                issuer: 'tms-backend',
                audience: 'material-service',
            }
        );

        const redirectUrl = new URL(materialServiceUrl);
        redirectUrl.searchParams.set('sso', token);

        const returnTo = typeof req.body?.returnTo === 'string' ? req.body.returnTo.trim() : '';
        if (returnTo.startsWith('/')) {
            redirectUrl.searchParams.set('returnTo', returnTo);
        }

        return res.json({
            redirectUrl: redirectUrl.toString(),
            expiresInSeconds: HANDOFF_EXPIRY_SECONDS,
        });
    } catch (error) {
        console.error('[MaterialSSO] Failed to create handoff token:', error);
        return res.status(500).json({ message: 'Failed to create material SSO handoff.' });
    }
};
