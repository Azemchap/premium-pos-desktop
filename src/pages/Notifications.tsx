// src/pages/Notifications.tsx - World-class Notification Center
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import { formatDistance } from "date-fns";
import {
  AlertTriangle,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle,
  Clock,
  DollarSign,
  Info,
  Mail,
  Package,
  Trash2,
  XCircle
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface Notification {
  id: number;
  notification_type: string;
  title: string;
  message: string;
  severity: string;
  is_read: boolean;
  user_id?: number;
  reference_id?: number;
  reference_type?: string;
  created_at: string;
}

interface NotificationStats {
  total: number;
  unread: number;
  low_stock: number;
  system: number;
}

export default function Notifications() {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterType, setFilterType] = useState("all");
  const [filterRead, setFilterRead] = useState("all");
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const [notifs, statsData] = await Promise.all([
        invoke<Notification[]>("get_notifications", {
          userId: user?.id,
          isRead: filterRead === "all" ? undefined : filterRead === "unread" ? false : true,
          notificationType: filterType !== "all" ? filterType : undefined,
          limit: 100,
        }),
        invoke<NotificationStats>("get_notification_stats", {
          userId: user?.id,
        }),
      ]);

      setNotifications(notifs);
      setStats(statsData);
    } catch (error) {
      console.error("Failed to load notifications:", error);
      toast.error("❌ Failed to load notifications");
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id: number) => {
    try {
      await invoke("mark_notification_read", { notificationId: id });
      toast.success("✅ Marked as read");
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark as read:", error);
      toast.error("❌ Failed to mark as read");
    }
  };

  const markAllAsRead = async () => {
    try {
      await invoke("mark_all_notifications_read", { userId: user?.id });
      toast.success("✅ All notifications marked as read");
      loadNotifications();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
      toast.error("❌ Failed to mark all as read");
    }
  };

  const deleteNotification = async () => {
    if (!deleteId) return;

    try {
      await invoke("delete_notification", { notificationId: deleteId });
      toast.success("🗑️ Notification deleted");
      setDeleteId(null);
      loadNotifications();
    } catch (error) {
      console.error("Failed to delete notification:", error);
      toast.error("❌ Failed to delete notification");
    }
  };

  const checkLowStock = async () => {
    try {
      // Show loading state
      const loadingToast = toast.loading("🔍 Checking inventory...");
      
      const count = await invoke<number>("check_low_stock_alerts");
      
      // Dismiss loading toast
      toast.dismiss(loadingToast);
      
      if (count > 0) {
        toast.success(`✅ Found ${count} new low stock alert(s)`, {
          description: "Only new items were added to avoid duplicates"
        });
        loadNotifications();
      } else {
        toast.info("✨ No new low stock items", {
          description: "All low stock items already have alerts"
        });
      }
    } catch (error) {
      console.error("Failed to check low stock:", error);
      toast.error("❌ Failed to check low stock");
    }
  };

  const clearAllNotifications = async () => {
    if (!confirm("Are you sure you want to delete all notifications? This action cannot be undone.")) {
      return;
    }
    
    try {
      const loadingToast = toast.loading("🗑️ Clearing notifications...");
      
      // Delete all notifications
      await Promise.all(
        notifications.map((notification) =>
          invoke("delete_notification", { notificationId: notification.id })
        )
      );
      
      toast.dismiss(loadingToast);
      toast.success("✅ All notifications cleared", {
        description: "You'll see new notifications when you check low stock again"
      });
      
      // Clear local state immediately
      setNotifications([]);
      setStats({ total: 0, unread: 0, low_stock: 0, system: 0 });
    } catch (error) {
      console.error("Failed to clear all notifications:", error);
      toast.error("❌ Failed to clear notifications");
    }
  };

  useEffect(() => {
    loadNotifications();
    
    // Auto-check low stock every 5 minutes
    const interval = setInterval(checkLowStock, 300000);
    return () => clearInterval(interval);
  }, [filterType, filterRead]);

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case "low_stock":
        return <Package className="w-5 h-5" />;
      case "payment":
      case "invoice":
        return <DollarSign className="w-5 h-5" />;
      case "email":
        return <Mail className="w-5 h-5" />;
      case "system":
        return <Info className="w-5 h-5" />;
      default:
        return <Bell className="w-5 h-5" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "error":
        return "border-l-4 border-red-500 bg-red-50/80 dark:bg-red-950/50 hover:bg-red-100 dark:hover:bg-red-950";
      case "warning":
        return "border-l-4 border-yellow-500 bg-yellow-50/80 dark:bg-yellow-950/50 hover:bg-yellow-100 dark:hover:bg-yellow-950";
      case "success":
        return "border-l-4 border-green-500 bg-green-50/80 dark:bg-green-950/50 hover:bg-green-100 dark:hover:bg-green-950";
      default:
        return "border-l-4 border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 hover:bg-blue-100 dark:hover:bg-blue-950";
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "error":
        return <XCircle className="w-4 h-4 text-red-600 dark:text-red-400" />;
      case "warning":
        return <AlertTriangle className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />;
      case "success":
        return <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />;
      default:
        return <Info className="w-4 h-4 text-blue-600 dark:text-blue-400" />;
    }
  };

  const getIconColor = (type: string, severity: string) => {
    // Color coding for light mode visibility
    switch (severity) {
      case "error":
        return "text-red-600 dark:text-red-400";
      case "warning":
        return "text-yellow-600 dark:text-yellow-400";
      case "success":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-blue-600 dark:text-blue-400";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground mt-1">
            Stay updated with alerts and system messages
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={checkLowStock} size="sm">
            <Package className="w-4 h-4 mr-2" />
            Check Low Stock
          </Button>
          {stats && stats.unread > 0 && (
            <Button onClick={markAllAsRead} size="sm">
              <CheckCheck className="w-4 h-4 mr-2" />
              Mark All Read ({stats.unread})
            </Button>
          )}
          {notifications.length > 0 && (
            <Button onClick={clearAllNotifications} variant="destructive" size="sm">
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </Button>
          )}
        </div>
      </div>

      {/* Enhanced Stats with better light mode styling */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 md:gap-6">
          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Total</p>
                  <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Bell className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow border-red-200 dark:border-red-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Unread</p>
                  <p className="text-3xl font-bold text-red-600 dark:text-red-400">{stats.unread}</p>
                </div>
                <div className="p-3 rounded-xl bg-red-100 dark:bg-red-900/30">
                  <BellOff className="w-7 h-7 text-red-600 dark:text-red-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow border-yellow-200 dark:border-yellow-900">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Low Stock</p>
                  <p className="text-3xl font-bold text-yellow-600 dark:text-yellow-400">{stats.low_stock}</p>
                </div>
                <div className="p-3 rounded-xl bg-yellow-100 dark:bg-yellow-900/30">
                  <Package className="w-7 h-7 text-yellow-600 dark:text-yellow-400" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-2 hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">System</p>
                  <p className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.system}</p>
                </div>
                <div className="p-3 rounded-xl bg-blue-100 dark:bg-blue-900/30">
                  <Info className="w-7 h-7 text-blue-600 dark:text-blue-400" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Filters - Enhanced */}
      <Card className="bg-gradient-to-r from-blue-50/50 to-purple-50/50 dark:from-blue-950/20 dark:to-purple-950/20">
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Filter by Type</label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="bg-white dark:bg-gray-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="low_stock">📦 Low Stock</SelectItem>
                  <SelectItem value="system">⚙️ System</SelectItem>
                  <SelectItem value="payment">💳 Payment</SelectItem>
                  <SelectItem value="invoice">📄 Invoice</SelectItem>
                  <SelectItem value="email">📧 Email</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-900 dark:text-gray-100">Filter by Status</label>
              <Select value={filterRead} onValueChange={setFilterRead}>
                <SelectTrigger className="bg-white dark:bg-gray-950">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Notifications</SelectItem>
                  <SelectItem value="unread">🔴 Unread Only</SelectItem>
                  <SelectItem value="read">✅ Read Only</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))
        ) : notifications.length === 0 ? (
          <Card className="border-2 border-dashed">
            <CardContent className="text-center py-16">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-gradient-to-br from-blue-100 to-purple-100 dark:from-blue-900/30 dark:to-purple-900/30 flex items-center justify-center">
                <Bell className="w-10 h-10 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-2 text-gray-900 dark:text-white">
                You're all caught up! 🎉
              </h3>
              <p className="text-muted-foreground mb-6">
                No notifications to display. Check back later for updates.
              </p>
              <Button
                variant="outline"
                onClick={checkLowStock}
                className="shadow-sm"
              >
                <Package className="w-4 h-4 mr-2" />
                Check Low Stock Now
              </Button>
            </CardContent>
          </Card>
        ) : (
          notifications.map((notification) => (
            <Card
              key={notification.id}
              className={`${getSeverityColor(notification.severity)} ${
                !notification.is_read 
                  ? "shadow-md border-2" 
                  : "opacity-80 hover:opacity-100"
              } transition-all duration-200`}
            >
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start space-x-3 flex-1 min-w-0">
                    <div className={`mt-1 p-2 rounded-lg ${
                      notification.severity === 'error' 
                        ? 'bg-red-200 dark:bg-red-900/40' 
                        : notification.severity === 'warning'
                        ? 'bg-yellow-200 dark:bg-yellow-900/40'
                        : notification.severity === 'success'
                        ? 'bg-green-200 dark:bg-green-900/40'
                        : 'bg-blue-200 dark:bg-blue-900/40'
                    }`}>
                      <div className={getIconColor(notification.notification_type, notification.severity)}>
                        {getNotificationIcon(notification.notification_type)}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-semibold text-gray-900 dark:text-white">
                          {notification.title}
                        </h3>
                        {getSeverityIcon(notification.severity)}
                        {!notification.is_read && (
                          <Badge variant="destructive" className="text-xs animate-pulse">
                            New
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300 mb-2 leading-relaxed">
                        {notification.message}
                      </p>
                      <div className="flex items-center gap-3 flex-wrap">
                        <span className="text-xs text-gray-600 dark:text-gray-400 flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {formatDistance(new Date(notification.created_at), new Date(), {
                            addSuffix: true,
                          })}
                        </span>
                        <Badge variant="outline" className="text-xs capitalize bg-white/50 dark:bg-gray-900/50">
                          {notification.notification_type.replace('_', ' ')}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!notification.is_read && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => markAsRead(notification.id)}
                        title="Mark as read"
                        className="hover:bg-green-100 dark:hover:bg-green-900/30"
                      >
                        <CheckCheck className="w-4 h-4 text-green-600 dark:text-green-400" />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setDeleteId(notification.id)}
                      title="Delete notification"
                      className="hover:bg-red-100 dark:hover:bg-red-900/30"
                    >
                      <Trash2 className="w-4 h-4 text-red-600 dark:text-red-400" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteId !== null} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Notification?</AlertDialogTitle>
            <AlertDialogDescription>
              This notification will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={deleteNotification}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
