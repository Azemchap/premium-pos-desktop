import { Bell } from "lucide-react";
import { Button } from "./ui/button";

// src/components/NotificationBadge.tsx
interface NotificationBadgeProps {
    count: number;
    onClick?: () => void;
}

export function NotificationBadge({ count, onClick }: NotificationBadgeProps) {
    return (
        <Button
            variant="ghost"
            size="sm"
            onClick={onClick}
            className="relative"
        >
            <Bell className="h-5 w-5" />
            {count > 0 && (
                <span className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-xs text-destructive-foreground font-medium">
                    {count > 99 ? "99+" : count}
                </span>
            )}
        </Button>
    );
}