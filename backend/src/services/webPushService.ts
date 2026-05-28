import webpush from 'web-push';
import { PushSubscription } from '../models/PushSubscription';

let pushConfigured = false;

// ─────────────────────────────────────────────────────────────────────────────
// Initialise VAPID keys from .env.
// If keys are missing, generates a new pair and logs it once so the admin can
// copy them into .env. Push notifications are disabled until keys are set.
// ─────────────────────────────────────────────────────────────────────────────
export function initWebPush() {
    const publicKey = process.env.VAPID_PUBLIC_KEY;
    const privateKey = process.env.VAPID_PRIVATE_KEY;
    const email = process.env.VAPID_EMAIL || 'admin@tms.local';

    if (!publicKey || !privateKey) {
        const generated = webpush.generateVAPIDKeys();
        console.warn('');
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn('[WebPush] VAPID keys not found in .env — generated new ones:');
        console.warn(`  VAPID_PUBLIC_KEY=${generated.publicKey}`);
        console.warn(`  VAPID_PRIVATE_KEY=${generated.privateKey}`);
        console.warn('  VAPID_EMAIL=your-email@domain.com');
        console.warn('Add the three lines above to your .env and restart the server.');
        console.warn('Push notifications are DISABLED until then.');
        console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.warn('');
        return;
    }

    webpush.setVapidDetails(`mailto:${email}`, publicKey, privateKey);
    pushConfigured = true;
    console.log('[WebPush] VAPID keys loaded — push notifications enabled.');
}

// ─────────────────────────────────────────────────────────────────────────────
// Send a push notification to all subscriptions for a given user.
// Silently removes any expired/invalid subscriptions (HTTP 410).
// ─────────────────────────────────────────────────────────────────────────────
export async function sendPushToUser(
    userId: number,
    title: string,
    body: string,
    url?: string
): Promise<void> {
    if (!pushConfigured) return;

    const subscriptions = await PushSubscription.findAll({ where: { user_id: userId } });
    if (subscriptions.length === 0) return;

    const payload = JSON.stringify({ title, body, url: url ?? '/', tag: `tms-${Date.now()}` });

    await Promise.all(
        subscriptions.map(async (sub) => {
            try {
                const keys = JSON.parse(sub.keys) as { p256dh: string; auth: string };
                await webpush.sendNotification(
                    { endpoint: sub.endpoint, keys },
                    payload
                );
            } catch (err: any) {
                // 410 Gone = subscription no longer valid — clean it up
                if (err.statusCode === 410 || err.statusCode === 404) {
                    await sub.destroy();
                } else {
                    console.error(`[WebPush] Failed to send to user ${userId}:`, err.message);
                }
            }
        })
    );
}
