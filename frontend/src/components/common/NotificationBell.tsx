
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Bell, CheckCheck, Trash2, X, BellOff, BellRing } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getNotifications, markAsRead, markAllAsRead, deleteNotification, clearAllNotifications, type Notification } from '../../services/notificationService';
import { isPushSupported, getPermissionState, getCurrentSubscription, subscribeToPush, unsubscribeFromPush } from '../../services/pushService';

const PUSH_PROMPT_PREF_KEY = 'tms.pushPromptPreference.v1';
const REMIND_LATER_DAYS = 7;

type PushPromptPreference = {
    dismissedForever: boolean;
    lastPromptAt: number | null;
};

const getDefaultPromptPreference = (): PushPromptPreference => ({
    dismissedForever: false,
    lastPromptAt: null,
});

const readPromptPreference = (): PushPromptPreference => {
    try {
        const raw = localStorage.getItem(PUSH_PROMPT_PREF_KEY);
        if (!raw) return getDefaultPromptPreference();

        const parsed = JSON.parse(raw) as Partial<PushPromptPreference>;
        return {
            dismissedForever: Boolean(parsed.dismissedForever),
            lastPromptAt: typeof parsed.lastPromptAt === 'number' ? parsed.lastPromptAt : null,
        };
    } catch {
        return getDefaultPromptPreference();
    }
};

const savePromptPreference = (preference: PushPromptPreference) => {
    localStorage.setItem(PUSH_PROMPT_PREF_KEY, JSON.stringify(preference));
};

const shouldShowPromptNow = (preference: PushPromptPreference): boolean => {
    if (preference.dismissedForever) return false;
    if (preference.lastPromptAt === null) return true;

    const msSincePrompt = Date.now() - preference.lastPromptAt;
    return msSincePrompt > REMIND_LATER_DAYS * 24 * 60 * 60 * 1000;
};

const NotificationBell: React.FC = () => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [isOpen, setIsOpen] = useState(false);
    const [isPushOn, setIsPushOn] = useState(false);
    const [pushLoading, setPushLoading] = useState(false);
    const [showPushPrompt, setShowPushPrompt] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchInterval = () => {
            getNotifications().then(setNotifications).catch(console.error);
        };
        fetchInterval();
        const interval = setInterval(fetchInterval, 30000);
        return () => clearInterval(interval);
    }, []);

    // Check current push subscription state on mount
    useEffect(() => {
        if (!isPushSupported()) return;

        getCurrentSubscription()
            .then((sub) => {
                const hasSubscription = !!sub;
                setIsPushOn(hasSubscription);

                const permission = getPermissionState();
                const preference = readPromptPreference();
                // Only prompt when permission is 'default' (not yet decided).
                // 'denied' means user blocked in browser settings — prompting is useless.
                const canPrompt = !hasSubscription && permission === 'default' && shouldShowPromptNow(preference);

                if (canPrompt) {
                    setShowPushPrompt(true);
                    savePromptPreference({
                        ...preference,
                        lastPromptAt: Date.now(),
                    });
                }
            })
            .catch(console.error);
    }, []);

    // Lock body scroll on mobile when dropdown is open
    useEffect(() => {
        if (!isOpen) return;

        const isMobile = window.matchMedia('(max-width: 767px)').matches;
        if (!isMobile) return;

        const scrollY = window.scrollY;
        document.body.style.position = 'fixed';
        document.body.style.top = `-${scrollY}px`;
        document.body.style.left = '0';
        document.body.style.right = '0';
        document.body.style.overflow = 'hidden';

        return () => {
            document.body.style.position = '';
            document.body.style.top = '';
            document.body.style.left = '';
            document.body.style.right = '';
            document.body.style.overflow = '';
            window.scrollTo(0, scrollY);
        };
    }, [isOpen]);

    const closeDropdown = useCallback(() => setIsOpen(false), []);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                closeDropdown();
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [closeDropdown]);

    const unreadCount = notifications.filter(n => !n.is_read).length;

    const handleClick = async (notification: Notification) => {
        if (!notification.is_read) {
            try {
                await markAsRead(notification.id);
                setNotifications(prev => prev.map(n => n.id === notification.id ? { ...n, is_read: true } : n));
            } catch (error) {
                console.error('Failed to mark read', error);
            }
        }
        if (notification.request_id) {
            setIsOpen(false);
            navigate(`/requests/${notification.request_id}`);
        }
    };

    const handleMarkAllRead = async () => {
        try {
            await markAllAsRead();
            setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
        } catch (error) {
            console.error('Failed to mark all read', error);
        }
    };

    const handleDelete = async (e: React.MouseEvent, id: number) => {
        e.stopPropagation();
        try {
            await deleteNotification(id);
            setNotifications(prev => prev.filter(n => n.id !== id));
        } catch (error) {
            console.error('Failed to delete notification', error);
        }
    };

    const handleClearAll = async () => {
        try {
            await clearAllNotifications();
            setNotifications([]);
        } catch (error) {
            console.error('Failed to clear notifications', error);
        }
    };

    const handlePushToggle = async () => {
        if (!isPushSupported()) {
            alert('Push notifications are not supported in this browser.');
            return;
        }
        if (getPermissionState() === 'denied') {
            alert('Notifications are blocked in your browser. Please allow them in your browser settings and try again.');
            return;
        }
        setPushLoading(true);
        try {
            if (isPushOn) {
                await unsubscribeFromPush();
                setIsPushOn(false);
            } else {
                const success = await subscribeToPush();
                setIsPushOn(success);
                if (success) {
                    setShowPushPrompt(false);
                }
            }
        } catch (err) {
            console.error('Push toggle error:', err);
        } finally {
            setPushLoading(false);
        }
    };

    const handlePromptRemindLater = () => {
        const preference = readPromptPreference();
        savePromptPreference({
            ...preference,
            lastPromptAt: Date.now(),
        });
        setShowPushPrompt(false);
    };

    const handlePromptDismissForever = () => {
        const preference = readPromptPreference();
        savePromptPreference({
            ...preference,
            dismissedForever: true,
            lastPromptAt: Date.now(),
        });
        setShowPushPrompt(false);
    };

    return (
        <div className="relative" ref={dropdownRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="relative inline-flex h-11 w-11 items-center justify-center text-slate-500 hover:text-blue-600 rounded-full hover:bg-blue-50 transition-colors"
                title="Notifications"
            >
                <Bell size={20} />
                {unreadCount > 0 && (
                    <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            {/* Auto push-notification prompt — hidden when dropdown is open to avoid overlap */}
            {showPushPrompt && !isOpen && (
                <div className="fixed inset-x-3 bottom-3 z-[70] rounded-2xl border border-blue-100 bg-white p-4 shadow-2xl sm:inset-x-auto sm:right-4 sm:bottom-4 sm:w-96">
                    <div className="mb-3">
                        <h4 className="text-sm font-semibold text-slate-900">Turn on notifications?</h4>
                        <p className="mt-1 text-xs text-slate-500">
                            Get instant trip updates even when this page is in the background.
                        </p>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                        <button
                            onClick={handlePushToggle}
                            disabled={pushLoading}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50"
                        >
                            <BellRing size={14} />
                            {pushLoading ? 'Please wait...' : 'Enable now'}
                        </button>
                        <button
                            onClick={handlePromptRemindLater}
                            className="rounded-lg border border-slate-200 px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 active:bg-slate-100"
                        >
                            Remind me later
                        </button>
                        <button
                            onClick={handlePromptDismissForever}
                            className="rounded-lg px-4 py-2.5 text-xs font-medium text-slate-400 hover:text-slate-600 active:text-slate-700"
                        >
                            Don't ask again
                        </button>
                    </div>
                </div>
            )}

            {isOpen && (
                <>
                    {/* Backdrop — visible on mobile, closes on tap */}
                    <div
                        onClick={closeDropdown}
                        aria-hidden="true"
                        className="fixed inset-0 z-40 bg-black/20 md:hidden"
                    />

                    {/* Panel — full-width sheet on mobile, absolute dropdown on desktop */}
                    <div className="fixed inset-x-0 bottom-0 top-14 z-50 flex flex-col overflow-hidden rounded-t-2xl border-t border-slate-100 bg-white shadow-xl animate-in fade-in duration-200 md:absolute md:inset-auto md:right-0 md:top-auto md:mt-2 md:bottom-auto md:w-96 md:max-h-[min(80vh,30rem)] md:rounded-2xl md:border">
                        {/* Header */}
                        <div className="flex items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/50 px-4 py-3 shrink-0">
                            <h3 className="font-semibold text-slate-800">Notifications</h3>
                            <div className="flex items-center gap-2">
                                {unreadCount > 0 && (
                                    <button
                                        onClick={handleMarkAllRead}
                                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-blue-600 hover:bg-blue-50 active:bg-blue-100 font-medium transition-colors"
                                        title="Mark all as read"
                                    >
                                        <CheckCheck size={13} />
                                        Mark all read
                                    </button>
                                )}
                                {notifications.length > 0 && (
                                    <button
                                        onClick={handleClearAll}
                                        className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-slate-400 hover:text-red-500 hover:bg-red-50 active:bg-red-100 font-medium transition-colors"
                                        title="Clear all notifications"
                                    >
                                        <Trash2 size={13} />
                                        Clear all
                                    </button>
                                )}
                                <button
                                    onClick={closeDropdown}
                                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 active:bg-slate-200 transition-colors md:hidden"
                                    aria-label="Close"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        </div>

                        {/* Scrollable notification list */}
                        <div className="flex-1 overflow-y-auto overscroll-contain">
                            {notifications.length === 0 ? (
                                <div className="p-8 text-center text-slate-400 text-sm">
                                    No notifications
                                </div>
                            ) : (
                                <div className="divide-y divide-slate-50">
                                    {notifications.map(notification => (
                                        <div
                                            key={notification.id}
                                            className={`group relative p-4 transition-colors ${
                                                notification.request_id ? 'cursor-pointer hover:bg-slate-50 active:bg-slate-100' : 'cursor-default hover:bg-slate-50/50'
                                            } ${!notification.is_read ? 'bg-blue-50/30' : ''}`}
                                            onClick={() => handleClick(notification)}
                                        >
                                            <div className="flex items-start gap-2 pr-9">
                                                {!notification.is_read && (
                                                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <p className={`text-sm leading-snug ${!notification.is_read ? 'text-slate-800 font-medium' : 'text-slate-600 ml-4'}`}>
                                                        {notification.message}
                                                    </p>
                                                    <div className="flex items-center justify-between mt-1">
                                                        <p className="text-xs text-slate-400">
                                                            {new Date(notification.createdAt).toLocaleDateString()} {new Date(notification.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        {notification.request_id && (
                                                            <span className="text-xs text-blue-500 font-medium">View →</span>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                            {/* Delete — always visible on touch, hover-reveal on desktop */}
                                            <button
                                                onClick={(e) => handleDelete(e, notification.id)}
                                                className="absolute top-2 right-2 inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 active:bg-red-100 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all"
                                                title="Dismiss"
                                            >
                                                <X size={15} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Footer: push toggle */}
                        {isPushSupported() && (
                            <div className="shrink-0 border-t border-slate-100 bg-slate-50/50 px-4 py-3">
                                <button
                                    onClick={handlePushToggle}
                                    disabled={pushLoading}
                                    className={`flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-xs font-medium transition-colors ${
                                        isPushOn
                                            ? 'text-slate-500 hover:text-red-500 hover:bg-red-50 active:bg-red-100'
                                            : 'text-slate-500 hover:text-blue-600 hover:bg-blue-50 active:bg-blue-100'
                                    } disabled:opacity-50`}
                                >
                                    {isPushOn ? <BellOff size={14} /> : <BellRing size={14} />}
                                    {pushLoading
                                        ? 'Please wait…'
                                        : isPushOn
                                        ? 'Turn off push notifications'
                                        : 'Enable push notifications'}
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
};

export default NotificationBell;
