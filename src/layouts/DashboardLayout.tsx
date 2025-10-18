import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { useAuthStore } from "@/store/authStore";
import { invoke } from "@tauri-apps/api/core";
import {
  BarChart3,
  Bell,
  ChevronDown,
  Database,
  Home,
  LogOut,
  Menu,
  Moon,
  Package,
  Receipt,
  Settings,
  ShoppingCart,
  Store as StoreIcon,
  Sun,
  User,
  Users
} from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

interface NavigationItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navigation: NavigationItem[] = [
  { name: "Dashboard", href: "/", icon: Home },
  { name: "Sales", href: "/sales", icon: ShoppingCart },
  { name: "Sales Records", href: "/sales-records", icon: Receipt },
  { name: "Inventory", href: "/inventory", icon: Database },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Products", href: "/products", icon: Package, roles: ["Admin", "Manager"] },
  { name: "Master Data", href: "/master-data", icon: Database, roles: ["Admin", "Manager"] },
  { name: "Users", href: "/users", icon: Users, roles: ["Admin", "Manager"] },
  { name: "Settings", href: "/settings", icon: Settings, roles: ["Admin", "Manager"] },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [storeName, setStoreName] = useState<string>("");
  const { user, logout, theme, setTheme } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();

  // Load store config and notification count
  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load store config
        const config = await invoke<any>("get_store_config");
        setStoreName(config.name || "Premium POS");
        
        // Load notification count (only unread)
        const notifications = await invoke<any[]>("get_notifications", { 
          isRead: false,
          limit: 100
        });
        setNotificationCount(notifications.length);
      } catch (error) {
        console.error("Failed to load dashboard data:", error);
      }
    };

    loadDashboardData();
    
    // Refresh notification count every 10 seconds (like social media)
    const interval = setInterval(async () => {
      try {
        const notifications = await invoke<any[]>("get_notifications", { 
          isRead: false,
          limit: 100
        });
        const newCount = notifications.length;
        
        // If count increased, show a subtle indicator
        if (newCount > notificationCount) {
          // Optional: Could add a pulse animation or sound here
          setNotificationCount(newCount);
        } else {
          setNotificationCount(newCount);
        }
      } catch (error) {
        // Silently fail
      }
    }, 10000); // Every 10 seconds like social media

    return () => clearInterval(interval);
  }, [notificationCount]);

  const hasPermission = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const filteredNavigation = navigation.filter(item => hasPermission(item.roles));

  const toggleTheme = () => {
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
  };

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    // Exact match for paths to avoid overlap (e.g., /sales vs /sales-records)
    return location.pathname === href;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-60">
          <div className="space-y-6">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
                <StoreIcon className="text-primary-foreground w-4 h-4" />
              </div>
              <div className="flex flex-col">
                <span className="font-bold text-sm leading-none">{storeName}</span>
                <span className="text-xs text-muted-foreground">POS System</span>
              </div>
            </div>

            <nav className="space-y-2">
              {filteredNavigation.map((item) => (
                <Button
                  key={item.name}
                  variant={isActive(item.href) ? "default" : "ghost"}
                  className="w-full justify-start"
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                >
                  <item.icon className="w-4 h-4 mr-2" />
                  {item.name}
                </Button>
              ))}
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-60 lg:flex-col">
        <div className="flex grow flex-col gap-y-5 overflow-y-auto border-r border-border bg-card px-6 pb-4">
          <div className="flex h-16 shrink-0 items-center">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <span className="text-primary-foreground font-bold text-sm px-1">POS</span>
              </div>
              <span className="font-bold text-xl">Premium POS</span>
            </div>
          </div>

          <nav className="flex flex-1 flex-col">
            <ul role="list" className="flex flex-1 flex-col gap-y-7">
              <li>
                <ul role="list" className="-mx-2 space-y-1">
                  {filteredNavigation.map((item) => (
                    <li key={item.name}>
                      <Button
                        variant={isActive(item.href) ? "default" : "ghost"}
                        className="w-full justify-start"
                        onClick={() => navigate(item.href)}
                      >
                        <item.icon className="w-4 h-4 mr-2" />
                        <span>{item.name}</span>
                      </Button>
                    </li>
                  ))}
                </ul>
              </li>

              <li className="mt-auto">
                <div className="space-y-2">
                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Avatar className="w-8 h-8">
                        <AvatarFallback>
                          {user ? getInitials(user.first_name, user.last_name) : "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {user?.first_name} {user?.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {user?.role}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={toggleTheme}
                      className="flex-1"
                    >
                      {theme === 'light' ? (
                        <Moon className="w-4 h-4" />
                      ) : (
                        <Sun className="w-4 h-4" />
                      )}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleLogout}
                      className="flex-1"
                    >
                      <LogOut className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </li>
            </ul>
          </nav>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-60">
        {/* Top bar */}
        <div className="sticky top-0 z-40 flex h-16 shrink-0 items-center gap-x-4 border-b border-border bg-background px-4 shadow-sm sm:gap-x-6 sm:px-6 lg:px-8">
          <Button
            variant="ghost"
            className="-m-2.5 p-2.5 lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="w-6 h-6" />
          </Button>

          {/* Separator */}
          <div className="h-6 w-px bg-border lg:hidden" />

          <div className="flex justify-end  flex-1 gap-x-4 self-stretch lg:gap-x-6">
            <div className="flex items-center gap-x-4 lg:gap-x-6">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => navigate("/notifications")} 
                className="relative hover:bg-blue-50 dark:hover:bg-blue-950 transition-colors"
              >
                <Bell className={`w-5 h-5 ${
                  notificationCount > 0 
                    ? 'text-blue-600 dark:text-blue-400 animate-pulse' 
                    : 'text-gray-600 dark:text-gray-400'
                }`} />
                {notificationCount > 0 && (
                  <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <Badge className="relative inline-flex bg-red-500 hover:bg-red-600 text-white px-1.5 min-w-[20px] h-5 text-xs font-bold shadow-lg border-2 border-background">
                      {notificationCount > 99 ? '99+' : notificationCount}
                    </Badge>
                  </span>
                )}
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback>
                        {user ? getInitials(user.first_name, user.last_name) : "U"}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden lg:block text-sm font-medium">
                      {user?.first_name} {user?.last_name}
                    </span>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuLabel>My Account</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => navigate("/profile")}>
                    <User className="w-4 h-4 mr-2" />
                    Profile
                  </DropdownMenuItem>
                  {hasPermission(["Admin", "Manager"]) && (
                    <DropdownMenuItem onClick={() => navigate("/settings")}>
                      <Settings className="w-4 h-4 mr-2" />
                      Settings
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={handleLogout}>
                    <LogOut className="w-4 h-4 mr-2" />
                    Log out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="py-8">
          <div className="mx-auto max-w-screen-2xl px-4 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}   