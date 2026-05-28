import { Response } from 'express';
import { AuthRequest } from '../middleware/authMiddleware';
import { Notification } from '../models/Notification';
import { PushSubscription } from '../models/PushSubscription';

export const getNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const notifications = await Notification.findAll({
            where: { user_id: userId },
            order: [['createdAt', 'DESC']]
        });
        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        // Debug
        const fs = require('fs');
        const path = require('path');
        const logPath = path.join(__dirname, '../../error_logs.txt');
        fs.appendFileSync(logPath, `\n[${new Date().toISOString()}] Get Notifications Error: ${error}\nStack: ${(error as any).stack}\n`);

        res.status(500).json({ message: 'Failed to fetch notifications' });
    }
};

export const markRead = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByPk(id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });

        if (notification.user_id !== req.user!.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        notification.is_read = true;
        await notification.save();
        res.json({ message: 'Marked as read' });
    } catch (error) {
        console.error('Mark read error:', error);
        res.status(500).json({ message: 'Failed to update notification' });
    }
};

export const markAllRead = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        await Notification.update(
            { is_read: true },
            { where: { user_id: userId, is_read: false } }
        );
        res.json({ message: 'All notifications marked as read' });
    } catch (error) {
        console.error('Mark all read error:', error);
        res.status(500).json({ message: 'Failed to mark all as read' });
    }
};

export const deleteNotification = async (req: AuthRequest, res: Response) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findByPk(id);
        if (!notification) return res.status(404).json({ message: 'Notification not found' });

        if (notification.user_id !== req.user!.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        await notification.destroy();
        res.json({ message: 'Notification deleted' });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ message: 'Failed to delete notification' });
    }
};

export const clearAllNotifications = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        await Notification.destroy({ where: { user_id: userId } });
        res.json({ message: 'All notifications cleared' });
    } catch (error) {
        console.error('Clear all notifications error:', error);
        res.status(500).json({ message: 'Failed to clear notifications' });
    }
};

// ─── Web Push ─────────────────────────────────────────────────────────────────

export const getVapidPublicKey = (_req: AuthRequest, res: Response) => {
    const key = process.env.VAPID_PUBLIC_KEY;
    if (!key) return res.status(503).json({ message: 'Push notifications not configured on this server.' });
    res.json({ publicKey: key });
};

export const subscribePush = async (req: AuthRequest, res: Response) => {
    try {
        const userId = req.user!.userId;
        const { endpoint, keys } = req.body as { endpoint: string; keys: { p256dh: string; auth: string } };

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return res.status(400).json({ message: 'Invalid push subscription payload.' });
        }

        // Upsert: update user_id if endpoint exists, create otherwise
        await PushSubscription.upsert({
            user_id: userId,
            endpoint,
            keys: JSON.stringify(keys),
        });

        res.json({ message: 'Push subscription saved.' });
    } catch (error) {
        console.error('Subscribe push error:', error);
        res.status(500).json({ message: 'Failed to save push subscription.' });
    }
};

export const unsubscribePush = async (req: AuthRequest, res: Response) => {
    try {
        const { endpoint } = req.body as { endpoint: string };
        if (!endpoint) return res.status(400).json({ message: 'Endpoint required.' });

        await PushSubscription.destroy({ where: { endpoint, user_id: req.user!.userId } });
        res.json({ message: 'Push subscription removed.' });
    } catch (error) {
        console.error('Unsubscribe push error:', error);
        res.status(500).json({ message: 'Failed to remove push subscription.' });
    }
};
