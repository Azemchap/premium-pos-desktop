// Mobile Bottom Navigation Component
import { useLocation, useNavigate } from "react-router-dom";
import { Home, ShoppingCart, Package, BarChart3, User } from "lucide-react";
import { hapticFeedback } from "@/lib/mobile-utils";
import { useAuthStore } from "@/store/authStore";

interface NavItem {
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: string[];
}

const navItems: NavItem[] = [
  { name: "Home", href: "/", icon: Home },
  { name: "Sales", href: "/sales", icon: ShoppingCart },
  { name: "Inventory", href: "/inventory", icon: Package },
  { name: "Reports", href: "/reports", icon: BarChart3 },
  { name: "Profile", href: "/profile", icon: User },
];

export default function MobileBottomNav() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  const handleNavClick = async (href: string) => {
    await hapticFeedback('selection');
    navigate(href);
  };

  const hasPermission = (allowedRoles?: string[]) => {
    if (!allowedRoles || allowedRoles.length === 0) return true;
    if (!user) return false;
    return allowedRoles.includes(user.role);
  };

  const filteredNavItems = navItems.filter(item => hasPermission(item.roles));

  const isActive = (href: string) => {
    if (href === "/") {
      return location.pathname === "/" || location.pathname === "/dashboard";
    }
    return location.pathname === href;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border safe-bottom md:hidden">
      <div className="grid grid-cols-5 h-16">
        {filteredNavItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.href);
          
          return (
            <button
              key={item.name}
              onClick={() => handleNavClick(item.href)}
              className={`
                flex flex-col items-center justify-center gap-1 
                active:bg-accent transition-colors
                ${active ? 'text-primary' : 'text-muted-foreground'}
              `}
              aria-label={item.name}
            >
              <Icon className={`w-5 h-5 ${active ? 'scale-110' : ''} transition-transform`} />
              <span className={`text-xs font-medium ${active ? 'font-semibold' : ''}`}>
                {item.name}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
