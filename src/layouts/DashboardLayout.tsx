import MobileBottomNav from "@/components/MobileBottomNav";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/authStore";
import { useCartStore } from "@/store/cartStore";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import {
  Bell,
  Building2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Clock,
  Database,
  DollarSign,
  FileText,
  Globe,
  Home,
  LogOut,
  Megaphone,
  Menu,
  Moon,
  MoreHorizontal,
  Package,
  PackageX,
  Receipt,
  Search,
  Settings,
  ShoppingBag,
  ShoppingCart,
  Store,
  Sun,
  Tag,
  TrendingUp,
  Truck,
  User,
  UserCog,
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

interface NavigationGroup {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  items: NavigationItem[];
  roles?: string[];
}

interface StoreConfig {
  id: number;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  currency: string;
  logo_url?: string;
  created_at: string;
  updated_at: string;
}

// Store settings items (shown in store selector dropdown) - only essentials
const storeSettingsItems: NavigationItem[] = [
  { name: "General Settings", href: "/settings", icon: Settings },
  { name: "Integrations", href: "/settings/integrations", icon: Globe, roles: ["Admin"] },
];

// Core items - always visible at top (no collapsible)
const coreItems: NavigationItem[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "New Sale", href: "/sales", icon: ShoppingCart },
  { name: "Sales Records", href: "/sales-records", icon: Receipt },
  { name: "Returns", href: "/returns", icon: PackageX },
  { name: "Inventory", href: "/inventory", icon: Database },
];

// Products group
const productsGroup: NavigationGroup = {
  id: "products",
  name: "Products",
  icon: Package,
  items: [
    { name: "Product Catalog", href: "/products", icon: Package },
    { name: "Master Data", href: "/master-data", icon: Tag, roles: ["Admin"] },
    { name: "Inventory", href: "/inventory", icon: Database },
    { name: "Customers", href: "/customers", icon: Users },
    { name: "Suppliers", href: "/suppliers", icon: Truck },
    { name: "Purchase Orders", href: "/purchase-orders", icon: ShoppingBag },
  ],
};

// Finance group
const financeGroup: NavigationGroup = {
  id: "finance",
  name: "Finance",
  icon: DollarSign,
  roles: ["Admin", "Manager"],
  items: [
    { name: "Reports", href: "/reports", icon: TrendingUp },
    { name: "Expenses", href: "/expenses", icon: DollarSign },
    { name: "Finance Overview", href: "/finance", icon: FileText },
  ],
};

// HR & Staff Management group
const hrGroup: NavigationGroup = {
  id: "hr",
  name: "Staff Management",
  icon: UserCog,
  roles: ["Admin", "Manager"],
  items: [
    { name: "Employees", href: "/employees", icon: UserCog },
    { name: "Users", href: "/users", icon: Users },
    { name: "Time Tracking", href: "/time-tracking", icon: Clock },
  ],
};

// "More" section - miscellaneous items
const moreGroup: NavigationGroup = {
  id: "more",
  name: "More",
  icon: MoreHorizontal,
  items: [
    { name: "Appointments", href: "/appointments", icon: Calendar },
    { name: "Promotions", href: "/promotions", icon: Megaphone, roles: ["Admin", "Manager"] },
    { name: "Organization", href: "/organization", icon: Building2, roles: ["Admin"] },
  ],
};

const navigationGroups: NavigationGroup[] = [productsGroup, financeGroup, hrGroup, moreGroup];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string>("products");
  const [storeMenuOpen, setStoreMenuOpen] = useState(false);
  const [notificationCount, setNotificationCount] = useState(0);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const { user, logout, theme, setTheme } = useAuthStore();
  const { getItemCount } = useCartStore();
  const navigate = useNavigate();
  const location = useLocation();
  const cartItemCount = getItemCount();

  const hapticFeedback = async (intensity: 'light' | 'medium' | 'heavy') => {
    try {
      await invoke("haptic_feedback", { intensity });
    } catch (error) {
      // No-op on non-mobile
    }
  };

  // Load store config
  useEffect(() => {
    const loadStoreConfig = async () => {
      try {
        const config = await invoke<StoreConfig>("get_store_config");
        setStoreConfig(config);
      } catch (error) {
        console.error("Failed to load store config:", error);
      }
    };
    loadStoreConfig();
  }, []);

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const notifications = await invoke<any[]>("get_notifications", {
          isRead: false,
          limit: 100
        });
        setNotificationCount(notifications.length);
      } catch (error) {
        console.error("Failed to load notifications:", error);
      }
    };

    loadNotifications();
    const interval = setInterval(loadNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const hasPermission = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light');

  const handleLogout = async () => {
    await hapticFeedback('medium');
    logout();
    navigate("/login");
  };

  const getInitials = (firstName: string, lastName: string) =>
    `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();

  const isActive = (href: string) => {
    if (href === "/") return location.pathname === "/" || location.pathname === "/dashboard";
    return location.pathname === href || location.pathname.startsWith(href + "/");
  };

  // Toggle group - accordion behavior (only one open at a time, always keep one open)
  const toggleGroup = (groupId: string) => {
    // Don't allow closing the currently open group, only switch to another
    if (openGroup !== groupId) {
      setOpenGroup(groupId);
    }
  };

  // Nav item component with reduced spacing
  const NavItem = ({ item, onClick, indent = false }: { item: NavigationItem; onClick?: () => void; indent?: boolean }) => (
    <button
      onClick={() => {
        navigate(item.href);
        onClick?.();
      }}
      className={cn(
        "w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors",
        "hover:bg-muted/80",
        indent && "pl-9",
        isActive(item.href)
          ? "bg-primary/10 text-primary"
          : "text-muted-foreground hover:text-foreground"
      )}
    >
      {!indent && <item.icon className="w-4 h-4 shrink-0" />}
      <span>{item.name}</span>
    </button>
  );

  // Collapsible group component with animation
  const CollapsibleGroup = ({ group, onNavigate }: { group: NavigationGroup; onNavigate?: () => void }) => {
    const isOpen = openGroup === group.id;
    const Icon = group.icon;
    const visibleItems = group.items.filter(item => hasPermission(item.roles));

    if (visibleItems.length === 0) return null;

    return (
      <div className="space-y-0.5">
        <button
          onClick={() => toggleGroup(group.id)}
          className={cn(
            "w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium rounded-md transition-colors",
            "hover:bg-muted/80 text-muted-foreground hover:text-foreground",
            isOpen && "text-foreground"
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          <span className="flex-1 text-left">{group.name}</span>
          <ChevronRight
            className={cn(
              "w-4 h-4 shrink-0 transition-transform duration-200 ease-out",
              isOpen && "rotate-90"
            )}
          />
        </button>

        {/* Animated content */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-200 ease-out",
            isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"
          )}
        >
          <div className="py-0.5 space-y-0.5">
            {visibleItems.map((item) => (
              <NavItem key={item.href} item={item} onClick={onNavigate} indent />
            ))}
          </div>
        </div>
      </div>
    );
  };

  // Store selector with popover (no layout shift)
  const StoreSelector = ({ onNavigate }: { onNavigate?: () => void }) => {
    const visibleSettings = storeSettingsItems.filter(item => hasPermission(item.roles));
    const logoSrc = storeConfig?.logo_url ? convertFileSrc(storeConfig.logo_url) : null;

    return (
      <div className="p-3 border-b border-border/50">
        <Popover open={storeMenuOpen} onOpenChange={setStoreMenuOpen}>
          <PopoverTrigger asChild>
            <button className="w-full flex items-center gap-2 p-2 rounded-md hover:bg-muted/60 transition-colors">
              {/* Store logo or fallback */}
              <div className="w-8 h-8 rounded-md bg-primary/10 flex items-center justify-center overflow-hidden shrink-0">
                {logoSrc ? (
                  <img
                    src={logoSrc}
                    alt={storeConfig?.name || "Store"}
                    className="w-full h-full object-cover"
                    onError={(e) => { e.currentTarget.style.display = 'none'; }}
                  />
                ) : (
                  <Store className="w-4 h-4 text-primary" />
                )}
              </div>
              <div className="flex-1 text-left min-w-0">
                <p className="text-[13px] font-semibold truncate">
                  {storeConfig?.name || "My Business"}
                </p>
              </div>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-muted-foreground transition-transform duration-200",
                  storeMenuOpen && "rotate-180"
                )}
              />
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-[200px] p-1" align="start" side="bottom" sideOffset={4}>
            <div className="space-y-0.5">
              {visibleSettings.map((item) => (
                <button
                  key={item.href}
                  onClick={() => {
                    navigate(item.href);
                    onNavigate?.();
                    setStoreMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-md transition-colors",
                    "hover:bg-muted/80",
                    isActive(item.href)
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                >
                  <item.icon className="w-4 h-4 shrink-0" />
                  <span>{item.name}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      </div>
    );
  };

  // Sidebar content - shared between desktop and mobile
  const SidebarContent = ({ onNavigate }: { onNavigate?: () => void }) => (
    <div className="flex flex-col h-full">
      {/* Store selector at top with popover settings */}
      <StoreSelector onNavigate={onNavigate} />

      {/* Navigation with scroll */}
      <ScrollArea className="flex-1">
        <nav className="px-3 py-3 space-y-4">
          {/* Core items - no group label */}
          <div className="space-y-0.5">
            {coreItems.filter(item => hasPermission(item.roles)).map((item) => (
              <NavItem key={item.href} item={item} onClick={onNavigate} />
            ))}
          </div>

          {/* Separator */}
          <Separator className="my-2" />

          {/* Collapsible groups */}
          <div className="space-y-1">
            {navigationGroups
              .filter(group => hasPermission(group.roles))
              .map((group) => (
                <CollapsibleGroup key={group.id} group={group} onNavigate={onNavigate} />
              ))}
          </div>
        </nav>
      </ScrollArea>

      {/* Bottom section - just theme toggle */}
      <div className="p-3 border-t border-border/50">
        <button
          onClick={toggleTheme}
          className="w-full flex items-center gap-2.5 px-3 py-1.5 text-[13px] font-medium text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-md transition-colors"
        >
          {theme === 'light' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
          <span>{theme === 'light' ? 'Dark mode' : 'Light mode'}</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24 md:pb-0">
      {/* Mobile sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="w-[260px] p-0">
          <SidebarContent onNavigate={() => setSidebarOpen(false)} />
        </SheetContent>
      </Sheet>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-[220px] lg:flex-col">
        <div className="flex grow flex-col bg-card border-r border-border/60">
          <SidebarContent />
        </div>
      </div>

      {/* Main content area */}
      <div className="lg:pl-[220px]">
        {/* Top header bar */}
        <header className="sticky top-0 z-40 flex h-14 items-center gap-4 border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-4 sm:px-6 lg:px-8">
          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden h-9 w-9"
            onClick={async () => {
              await hapticFeedback('light');
              setSidebarOpen(true);
            }}
          >
            <Menu className="w-5 h-5" />
          </Button>

          <Separator orientation="vertical" className="h-6 lg:hidden" />

          {/* Search - Stripe style */}
          <div className="flex-1 flex items-center">
            <div className="relative max-w-md w-full hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                type="text"
                placeholder="Search..."
                className="w-full h-9 pl-9 pr-4 text-sm bg-muted/50 border-0 rounded-md focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background transition-colors"
              />
            </div>
          </div>

          {/* Right side actions */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              onClick={() => navigate("/notifications")}
            >
              <Bell className="w-4 h-4" />
              {notificationCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] bg-primary">
                  {notificationCount > 99 ? '99+' : notificationCount}
                </Badge>
              )}
            </Button>

            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative h-9 w-9"
              onClick={() => navigate("/cart")}
            >
              <ShoppingCart className="w-4 h-4" />
              {cartItemCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-5 min-w-[20px] px-1 text-[10px] bg-primary">
                  {cartItemCount > 99 ? '99+' : cartItemCount}
                </Badge>
              )}
            </Button>

            <Separator orientation="vertical" className="h-6 mx-1" />

            {/* User menu */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-9 gap-2 px-2">
                  <Avatar className="w-7 h-7">
                    {user?.profile_image_url && (
                      <AvatarImage src={user.profile_image_url} alt={`${user.first_name} ${user.last_name}`} />
                    )}
                    <AvatarFallback className="text-xs bg-primary/10 text-primary">
                      {user ? getInitials(user.first_name, user.last_name) : "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden md:block text-[13px] font-medium">
                    {user?.first_name}
                  </span>
                  <ChevronDown className="w-3 h-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel className="font-normal">
                  <div className="flex flex-col space-y-1">
                    <p className="text-sm font-medium">{user?.first_name} {user?.last_name}</p>
                    <p className="text-xs text-muted-foreground">{user?.email}</p>
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/profile")}>
                  <User className="w-4 h-4 mr-2" />
                  Profile
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                  <LogOut className="w-4 h-4 mr-2" />
                  Log out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 sm:p-6 lg:p-8 overflow-y-auto">
          <div className="mx-auto max-w-screen-2xl">
            {children}
          </div>
        </main>
      </div>

      <MobileBottomNav />
    </div>
  );
}