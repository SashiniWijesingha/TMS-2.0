/// <reference lib="webworker" />
/// <reference types="vite-plugin-pwa/client" />
import { precacheAndRoute, cleanupOutdatedCaches, createHandlerBoundToURL } from 'workbox-precaching';
import { registerRoute, NavigationRoute } from 'workbox-routing';
import { CacheFirst, StaleWhileRevalidate } from 'workbox-strategies';
import { ExpirationPlugin } from 'workbox-expiration';

export {}; // ensure this is treated as a module

declare const self: ServiceWorkerGlobalScope;

self.skipWaiting();
(self as unknown as ServiceWorkerGlobalScope).clients.claim();

// ── Precache everything in the Vite build manifest ───────────────────────────
precacheAndRoute(self.__WB_MANIFEST);
cleanupOutdatedCaches();

// ── SPA navigation fallback ─────────────────────────────────────────────────
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')));

// ── Cache images (cache-first, 30 days) ──────────────────────────────────────
registerRoute(
    ({ request }) => request.destination === 'image',
    new CacheFirst({
        cacheName: 'image-cache',
        plugins: [
            new ExpirationPlugin({ maxEntries: 100, maxAgeSeconds: 60 * 60 * 24 * 30 }),
        ],
    })
);

// ── Cache JS/CSS (stale-while-revalidate) ────────────────────────────────────
registerRoute(
    ({ request }) => request.destination === 'script' || request.destination === 'style',
    new StaleWhileRevalidate({ cacheName: 'static-resources' })
);

// ── Web Push: show OS notification ──────────────────────────────────────────
self.addEventListener('push', (event: PushEvent) => {
    const data = (event.data?.json() ?? {}) as {
        title?: string;
        body?: string;
        url?: string;
        tag?: string;
    };

    const title = data.title ?? 'TMS Notification';
    const options = {
        body: data.body ?? '',
        icon: '/pwa/icon-192.png',
        badge: '/pwa/favicon-64.png',
        data: { url: data.url ?? '/' },
        vibrate: [200, 100, 200],
        tag: data.tag ?? 'tms',
        renotify: true,
    };

    event.waitUntil(self.registration.showNotification(title, options as NotificationOptions));
});

// ── Web Push: navigate to linked request when notification is clicked ─────────
self.addEventListener('notificationclick', (event: NotificationEvent) => {
    event.notification.close();
    const url: string = (event.notification.data?.url as string) ?? '/';

    event.waitUntil(
        self.clients
            .matchAll({ type: 'window', includeUncontrolled: true })
            .then((clientList: readonly Client[]) => {
                for (const client of clientList) {
                    if ('navigate' in client) {
                        const wc = client as WindowClient;
                        wc.navigate(url);
                        return wc.focus();
                    }
                }
                return self.clients.openWindow(url);
            })
    );
});
