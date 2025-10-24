import { useEffect, useState } from "react";
import { Store as StoreIcon } from "lucide-react";
import { invoke } from "@tauri-apps/api/core";
import { Skeleton } from "./ui/skeleton";

interface StoreConfig {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  currency: string;
  timezone: string;
  created_at: string;
  updated_at: string;
}

interface StoreLogoProps {
  variant?: "desktop" | "mobile" | "compact";
  showSubtitle?: boolean;
  className?: string;
}

export default function StoreLogo({ 
  variant = "desktop", 
  showSubtitle = true,
  className = "" 
}: StoreLogoProps) {
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadStoreConfig = async () => {
      try {
        const config = await invoke<StoreConfig>("get_store_config");
        setStoreConfig(config);
      } catch (error) {
        console.error("Failed to load store config:", error);
      } finally {
        setLoading(false);
      }
    };

    loadStoreConfig();

    // Refresh store config every 30 seconds to keep data fresh
    const interval = setInterval(loadStoreConfig, 30000);
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className={`flex items-center ${variant === "desktop" ? "space-x-3" : "space-x-2"} ${className}`}>
        <Skeleton className={variant === "desktop" ? "w-10 h-10 rounded-xl" : "w-8 h-8 rounded-lg"} />
        <div className="space-y-1">
          <Skeleton className={`h-4 ${variant === "desktop" ? "w-32" : "w-24"}`} />
          {showSubtitle && <Skeleton className="h-3 w-20" />}
        </div>
      </div>
    );
  }

  const storeName = storeConfig?.name || "Premium POS";

  // Desktop variant (sidebar)
  if (variant === "desktop") {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
          <StoreIcon className="text-primary-foreground w-5 h-5" />
        </div>
        <div>
          <span className="font-bold text-xl bg-gradient-to-r from-primary to-blue-600 bg-clip-text text-transparent">
            {storeName}
          </span>
          {showSubtitle && (
            <p className="text-xs text-muted-foreground">Point of Sale</p>
          )}
        </div>
      </div>
    );
  }

  // Mobile variant (sheet sidebar)
  if (variant === "mobile") {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-lg">
          <StoreIcon className="text-primary-foreground w-4 h-4" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm leading-none">{storeName}</span>
          {showSubtitle && (
            <span className="text-xs text-muted-foreground">POS System</span>
          )}
        </div>
      </div>
    );
  }

  // Compact variant (minimal)
  if (variant === "compact") {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        <div className="w-6 h-6 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow">
          <StoreIcon className="text-primary-foreground w-3 h-3" />
        </div>
        <span className="font-semibold text-sm">{storeName}</span>
      </div>
    );
  }

  return null;
}
