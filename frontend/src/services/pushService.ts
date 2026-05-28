import api from './api';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
    const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
    const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
    const rawData = atob(base64);
    return Uint8Array.from([...rawData].map((c) => c.charCodeAt(0)));
}

export const isPushSupported = (): boolean =>
    'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;

export const getPermissionState = (): NotificationPermission =>
    isPushSupported() ? Notification.permission : 'denied';

export const getCurrentSubscription = async (): Promise<PushSubscription | null> => {
    if (!isPushSupported()) return null;
    const reg = await navigator.serviceWorker.ready;
    return reg.pushManager.getSubscription();
};

export const subscribeToPush = async (): Promise<boolean> => {
    if (!isPushSupported()) return false;

    const permission = await Notification.requestPermission();
    if (permission !== 'granted') return false;

    try {
        const { data } = await api.get('/notifications/vapid-public-key');
        const applicationServerKey = urlBase64ToUint8Array(data.publicKey as string);

        const reg = await navigator.serviceWorker.ready;
        const subscription = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: applicationServerKey as unknown as ArrayBuffer,
        });

        const sub = subscription.toJSON() as {
            endpoint: string;
            keys: { p256dh: string; auth: string };
        };
        await api.post('/notifications/push-subscribe', sub);
        return true;
    } catch (err) {
        console.error('[Push] Subscribe failed:', err);
        return false;
    }
};

// NOTE: This can be reused by auth logout in a future privacy mode,
// so push delivery stops immediately on sign-out for shared devices.
export const unsubscribeFromPush = async (): Promise<void> => {
    if (!isPushSupported()) return;

    const reg = await navigator.serviceWorker.ready;
    const subscription = await reg.pushManager.getSubscription();
    if (!subscription) return;

    const endpoint = subscription.endpoint;
    await subscription.unsubscribe();
    await api.post('/notifications/push-unsubscribe', { endpoint }).catch(console.error);
};
