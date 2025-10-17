import { invoke } from "@tauri-apps/api/core";

class NotificationService {
    private listeners: Set<() => void> = new Set();
    private intervalId: NodeJS.Timeout | null = null;
    private currentCount: number = 0;

    start() {
        this.intervalId = setInterval(() => {
            this.checkNotifications();
        }, 30000); // Check every 30 seconds

        // Initial check
        this.checkNotifications();
    }

    stop() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
    }

    subscribe(listener: () => void) {
        this.listeners.add(listener);
        return () => this.listeners.delete(listener);
    }

    getCount() {
        return this.currentCount;
    }

    private async checkNotifications() {
        try {
            const count = await invoke<number>("get_unread_notification_count");
            if (count !== this.currentCount) {
                this.currentCount = count;
                this.notifyListeners();
            }
        } catch (error) {
            console.error("Failed to check notifications:", error);
        }
    }

    private notifyListeners() {
        this.listeners.forEach((listener) => listener());
    }
}

export const notificationService = new NotificationService();