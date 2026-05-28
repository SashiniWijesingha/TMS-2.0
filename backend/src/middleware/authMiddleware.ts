import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';



export interface AuthRequest extends Request {
    user?: {
        userId: number;
        email: string;
        role: string;
        divisionId: number;
    };
}

export const authenticateToken = (req: AuthRequest, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN
    const secret = process.env.JWT_SECRET;

    if (!secret) {
        console.error('[Auth] JWT_SECRET is not configured.');
        return res.sendStatus(500);
    }

    if (token == null) return res.sendStatus(401); // Unauthorized

    jwt.verify(token, secret, (err: any, user: any) => {
        if (err) {
            return res.sendStatus(401); // Unauthorized (Invalid Token)
        }
        req.user = user;
        next();
    });
};

export const authorizeRole = (allowedRoles: string[]) => {
    return (req: AuthRequest, res: Response, next: NextFunction) => {
        if (!req.user) return res.sendStatus(401);

        // Check specifically for ADMIN in both uppercase and standard usage
        const userRole = (req.user.role || '').toString().toUpperCase();
        const permitted = allowedRoles.some(r => r.toUpperCase() === userRole);

        if (!permitted) {
            return res.status(403).json({ message: 'Access denied: Insufficient privileges' });
        }
        next();
    };
};
