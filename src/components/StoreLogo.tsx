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
  logo_url?: string;
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

  const storeName = storeConfig?.name || "ZTAD POS";
  
  // Convert file path to asset URL for Tauri
  const getAssetUrl = (path: string) => {
    if (!path) return null;
    // For Tauri v2, we need to use the asset protocol
    // Replace backslashes with forward slashes for URL compatibility
    const normalizedPath = path.replace(/\\/g, '/');
    return `asset://localhost/${normalizedPath}`;
  };
  
  const logoUrl = storeConfig?.logo_url ? getAssetUrl(storeConfig.logo_url) : null;

  // Desktop variant (sidebar)
  if (variant === "desktop") {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        <div className="w-10 h-10 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={storeName} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg class="w-5 h-5 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
              }}
            />
          ) : (
            <StoreIcon className="text-primary-foreground w-5 h-5" />
          )}
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
        <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow-lg overflow-hidden">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={storeName} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg class="w-4 h-4 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
              }}
            />
          ) : (
            <StoreIcon className="text-primary-foreground w-4 h-4" />
          )}
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
        <div className="w-6 h-6 bg-gradient-to-br from-primary to-blue-600 rounded-lg flex items-center justify-center shadow overflow-hidden">
          {logoUrl ? (
            <img 
              src={logoUrl} 
              alt={storeName} 
              className="w-full h-full object-cover"
              onError={(e) => {
                // Fallback to icon if image fails to load
                e.currentTarget.style.display = 'none';
                e.currentTarget.parentElement!.innerHTML = '<svg class="w-3 h-3 text-white" xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
              }}
            />
          ) : (
            <StoreIcon className="text-primary-foreground w-3 h-3" />
          )}
        </div>
        <span className="font-semibold text-sm">{storeName}</span>
      </div>
    );
  }

  return null;
}
