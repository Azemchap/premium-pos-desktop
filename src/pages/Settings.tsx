// src/pages/Settings.tsx
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { useCurrency } from "@/hooks/useCurrency";
import { useSettings } from "@/hooks/useSettings";
import { useAuthStore } from "@/store/authStore";
import { useStoreConfigStore } from "@/store/storeConfigStore";
import { playSound, LANGUAGE_LABELS } from "@/store/settingsStore";
import { invoke } from "@tauri-apps/api/core";
import { convertFileSrc } from "@tauri-apps/api/core";
import {
  Bell,
  Palette,
  Receipt,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Store,
  Upload,
  X
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

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

interface UpdateStoreConfigRequest {
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
}

export default function Settings() {
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [storeForm, setStoreForm] = useState<UpdateStoreConfigRequest>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    phone: "",
    email: "",
    tax_rate: 0,
    currency: "USD",
    logo_url: undefined,
  });
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { theme, toggleTheme } = useAuthStore();
  const { changeCurrency, availableCurrencies } = useCurrency();
  const { preferences, updatePreference, resetToDefaults } = useSettings();
  const { storeConfig, loading, refreshStoreConfig, setStoreConfig } = useStoreConfigStore();

  useEffect(() => {
    // Initialize form data from store config when it loads
    if (storeConfig) {
      setStoreForm({
        name: storeConfig.name,
        address: storeConfig.address || "",
        city: storeConfig.city || "",
        state: storeConfig.state || "",
        zip_code: storeConfig.zip_code || "",
        phone: storeConfig.phone || "",
        email: storeConfig.email || "",
        tax_rate: storeConfig.tax_rate,
        currency: storeConfig.currency,
        logo_url: storeConfig.logo_url,
      });
    }
  }, [storeConfig]);

  useEffect(() => {
    // Load store config on mount if not already loaded
    if (!storeConfig && !loading) {
      refreshStoreConfig();
    }
  }, [storeConfig, loading, refreshStoreConfig]);

  const saveStoreConfig = async () => {
  if (!storeForm.name.trim()) {
    toast.error("Store name is required");
    playSound('error', preferences);
    return;
  }

  try {
    setSaving(true);
    await invoke("update_store_config", { request: storeForm });
    toast.success("✅ Store configuration saved successfully");
      playSound('success', preferences);
      await refreshStoreConfig(); // Add this line
      // loadStoreConfig();
    } catch (error) {
      console.error("Failed to save store config:", error);
      toast.error("❌ Failed to save store configuration");
      playSound('error', preferences);
    } finally {
      setSaving(false);
    }
  };

  const saveAllSettings = async () => {
    // Save store config if we have any changes
    if (storeForm.name.trim()) {
      try {
        setSaving(true);
        await invoke("update_store_config", { request: storeForm });
        await refreshStoreConfig(); // Add this line  
        // await loadStoreConfig();
      } catch (error) {
        console.error("Failed to save store config:", error);
        toast.error("❌ Failed to save store configuration");
        playSound('error', preferences);
        return;
      } finally {
        setSaving(false);
      }
    }
    toast.success("✅ All settings saved successfully");
    playSound('success', preferences);
  };

  const resetStoreConfig = () => {
    if (storeConfig) {
      setStoreForm({
        name: storeConfig.name,
        address: storeConfig.address || "",
        city: storeConfig.city || "",
        state: storeConfig.state || "",
        zip_code: storeConfig.zip_code || "",
        phone: storeConfig.phone || "",
        email: storeConfig.email || "",
        tax_rate: storeConfig.tax_rate,
        currency: storeConfig.currency,
        logo_url: storeConfig.logo_url,
      });
      toast.info("Changes reset to saved values");
    }
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      setUploadingLogo(true);

      // Read file as array buffer
      const arrayBuffer = await file.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      const fileData = Array.from(uint8Array);

      // Upload to backend
      const logoUrl = await invoke<string>("upload_store_logo", {
        fileData,
        fileName: file.name,
      });

      setStoreForm({ ...storeForm, logo_url: logoUrl });
      toast.success("✅ Logo uploaded successfully");
      playSound('success', preferences);

      // Reload config to get updated data
      await refreshStoreConfig(); // Add this line  
      // loadStoreConfig();
    } catch (error) {
      console.error("Failed to upload logo:", error);
      toast.error("❌ Failed to upload logo");
      playSound('error', preferences);
    } finally {
      setUploadingLogo(false);
      // Reset file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemoveLogo = async () => {
    try {
      setUploadingLogo(true);
      await invoke("remove_store_logo");
      setStoreForm({ ...storeForm, logo_url: undefined });
      toast.success("✅ Logo removed successfully");
      playSound('success', preferences);
      await refreshStoreConfig(); // Add this line
      // loadStoreConfig();
    } catch (error) {
      console.error("Failed to remove logo:", error);
      toast.error("❌ Failed to remove logo");
      playSound('error', preferences);
    } finally {
      setUploadingLogo(false);
    }
  };

  useEffect(() => {
    refreshStoreConfig(); // Add this line
    // loadStoreConfig();
  }, []);

  return (
    <div className="space-y-6 md:space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Settings</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Configure your store and system preferences
          </p>
        </div>
        <div className="flex gap-2 sm:gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm"
            onClick={() => {
              resetToDefaults();
              toast.success("🔄 All preferences reset to defaults");
              playSound('success', preferences);
            }}
          >
            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
            <span className="hidden sm:inline">Reset All</span>
            <span className="sm:hidden">Reset</span>
          </Button>
          <Button
            size="sm"
            className="flex-1 sm:flex-none text-xs sm:text-sm"
            onClick={saveAllSettings}
            disabled={saving || loading}
          >
            {saving ? (
              <>
                <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2 animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
                <span className="sm:hidden">...</span>
              </>
            ) : (
              <>
                <Save className="w-3 h-3 sm:w-4 sm:h-4 sm:mr-2" />
                <span className="hidden sm:inline">Save Settings</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </Button>
        </div>
      </div>

      <Tabs defaultValue="store" className="space-y-6 md:space-y-6">
        <TabsList className="grid w-full grid-cols-5 h-full">
          <TabsTrigger value="store" className="text-xs sm:text-sm flex-col sm:flex-row gap-1 sm:gap-2 py-2">
            <Store className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Store</span>
          </TabsTrigger>
          <TabsTrigger value="system" className="text-xs sm:text-sm flex-col sm:flex-row gap-1 sm:gap-2 py-2">
            <SettingsIcon className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">System</span>
          </TabsTrigger>
          <TabsTrigger value="appearance" className="text-xs sm:text-sm flex-col sm:flex-row gap-1 sm:gap-2 py-2">
            <Palette className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Theme</span>
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs sm:text-sm flex-col sm:flex-row gap-1 sm:gap-2 py-2">
            <Bell className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Alerts</span>
          </TabsTrigger>
          <TabsTrigger value="receipts" className="text-xs sm:text-sm flex-col sm:flex-row gap-1 sm:gap-2 py-2">
            <Receipt className="w-3 h-3 sm:w-4 sm:h-4" />
            <span className="text-[10px] sm:text-sm">Print</span>
          </TabsTrigger>
        </TabsList>

        {/* Store Configuration */}
        <TabsContent value="store">
          <div className="grid gap-4 md:gap-6">
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
                <CardTitle className="flex items-center text-base sm:text-lg">
                  <Store className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
                  Store Information
                </CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Basic information about your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-4 p-4 sm:p-6">
                {loading ? (
                  <div className="space-y-2 md:space-y-4">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="store-name">Store Name *</Label>
                      <Input
                        id="store-name"
                        value={storeForm.name}
                        onChange={(e) => setStoreForm({ ...storeForm, name: e.target.value })}
                        placeholder="My Premium Store"
                      />
                    </div>

                    {/* Logo Upload Section */}
                    <div className="space-y-3">
                      <Label className="text-sm sm:text-base">Store Logo</Label>
                      <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
                        {/* Logo Preview */}
                        <div className="flex-shrink-0">
                          <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 bg-gradient-to-br from-primary to-blue-600 rounded-xl flex items-center justify-center shadow-lg overflow-hidden border-2 border-border">
                            {storeForm.logo_url ? (
                              <img
                                src={convertFileSrc(storeForm.logo_url)}
                                alt="Store logo"
                                className="w-full h-full object-cover"
                                onError={(e) => {
                                  console.error("Logo failed to load:", storeForm.logo_url);
                                  e.currentTarget.style.display = 'none';
                                }}
                              />
                            ) : (
                              <Store className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16 text-white" />
                            )}
                          </div>
                        </div>

                        {/* Upload Controls */}
                        <div className="flex-1 w-full space-y-3 text-center sm:text-left">
                          <p className="text-xs sm:text-sm text-muted-foreground">
                            Upload your store logo. Recommended: 512x512px. Max: 5MB.
                          </p>
                          <div className="flex flex-col sm:flex-row gap-2">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-auto text-xs sm:text-sm"
                              onClick={() => fileInputRef.current?.click()}
                              disabled={uploadingLogo}
                            >
                              {uploadingLogo ? (
                                <>
                                  <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4 mr-2 animate-spin" />
                                  Uploading...
                                </>
                              ) : (
                                <>
                                  <Upload className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                  Upload Logo
                                </>
                              )}
                            </Button>
                            {storeForm.logo_url && (
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                className="w-full sm:w-auto text-xs sm:text-sm"
                                onClick={handleRemoveLogo}
                                disabled={uploadingLogo}
                              >
                                <X className="w-3 h-3 sm:w-4 sm:h-4 mr-2" />
                                Remove
                              </Button>
                            )}
                          </div>
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept="image/*"
                            onChange={handleLogoUpload}
                            className="hidden"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="store-address">Street Address</Label>
                      <Input
                        id="store-address"
                        value={storeForm.address}
                        onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                        placeholder="123 Main Street, Suite 100"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="store-city">City</Label>
                        <Input
                          id="store-city"
                          value={storeForm.city}
                          onChange={(e) => setStoreForm({ ...storeForm, city: e.target.value })}
                          placeholder="New York"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="store-state">State/Province</Label>
                        <Input
                          id="store-state"
                          value={storeForm.state}
                          onChange={(e) => setStoreForm({ ...storeForm, state: e.target.value })}
                          placeholder="NY"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="store-zip">ZIP/Postal Code</Label>
                        <Input
                          id="store-zip"
                          value={storeForm.zip_code}
                          onChange={(e) => setStoreForm({ ...storeForm, zip_code: e.target.value })}
                          placeholder="10001"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6">
                      <div className="space-y-2">
                        <Label htmlFor="store-phone">Phone</Label>
                        <Input
                          id="store-phone"
                          type="tel"
                          value={storeForm.phone}
                          onChange={(e) => setStoreForm({ ...storeForm, phone: e.target.value })}
                          placeholder="+1 (555) 123-4567"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="store-email">Email</Label>
                        <Input
                          id="store-email"
                          type="email"
                          value={storeForm.email}
                          onChange={(e) => setStoreForm({ ...storeForm, email: e.target.value })}
                          placeholder="store@example.com"
                        />
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
                <CardTitle className="text-base sm:text-lg">Regional Settings</CardTitle>
                <CardDescription className="text-xs sm:text-sm">
                  Configure currency and tax rate for your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 md:space-y-4 p-4 sm:p-6">
                {loading ? (
                  <div className="space-y-2 md:space-y-4">
                    {Array.from({ length: 2 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={storeForm.currency}
                        onValueChange={(value) => {
                          setStoreForm({ ...storeForm, currency: value });
                          changeCurrency(value as any);
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCurrencies.map((curr) => (
                            <SelectItem key={curr.code} value={curr.code}>
                              {curr.name} ({curr.symbol}) - Rate: {curr.rate.toFixed(2)}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        All prices stored in USD will be converted to this currency for display
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="tax-rate">Default Tax Rate (%)</Label>
                      <Input
                        id="tax-rate"
                        type="number"
                        step="0.01"
                        min="0"
                        max="100"
                        value={storeForm.tax_rate}
                        onChange={(e) => setStoreForm({ ...storeForm, tax_rate: parseFloat(e.target.value) || 0 })}
                        placeholder="8.5"
                      />
                      <p className="text-xs text-muted-foreground">
                        Default tax rate for taxable products
                      </p>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <SettingsIcon className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
                System Preferences
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configure system behavior and data management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Auto-save Enabled</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Automatically save changes in forms
                  </p>
                </div>
                <Switch checked={preferences.autoSave} onCheckedChange={(checked) => { updatePreference('autoSave', checked); toast.success(checked ? '✅ Auto-save enabled' : 'Auto-save disabled'); playSound('click', preferences); }} className="shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Low Stock Alerts</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Notify when products are running low
                  </p>
                </div>
                <Switch checked={preferences.lowStockAlerts} onCheckedChange={(checked) => { updatePreference('lowStockAlerts', checked); toast.success(checked ? '✅ Low stock alerts enabled' : 'Low stock alerts disabled'); playSound('click', preferences); }} className="shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Sound Effects</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Play sounds for actions and notifications
                  </p>
                </div>
                <Switch checked={preferences.soundEffects} onCheckedChange={(checked) => { updatePreference('soundEffects', checked); toast.success(checked ? '✅ Sound effects enabled' : '🔇 Sound effects disabled'); if (checked) playSound('success', { ...preferences, soundEffects: true }); }} className="shrink-0" />
              </div>

              <div className="space-y-2">
                <Label>Data Retention Period</Label>
                <Select value={preferences.dataRetention} onValueChange={(value: string) => { updatePreference('dataRetention', value as typeof preferences.dataRetention); toast.success(`✅ Data retention set to ${value}`); playSound('click', preferences); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="3months">3 Months</SelectItem>
                    <SelectItem value="6months">6 Months</SelectItem>
                    <SelectItem value="1year">1 Year</SelectItem>
                    <SelectItem value="2years">2 Years</SelectItem>
                    <SelectItem value="forever">Forever</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  How long to keep transaction history
                </p>
              </div>

              <div className="space-y-2">
                <Label>Backup Frequency</Label>
                <Select value={preferences.backupFrequency} onValueChange={(value: string) => { updatePreference('backupFrequency', value as typeof preferences.backupFrequency); toast.success(`Backup frequency set to ${value}`); playSound('click', preferences); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="realtime">Real-time</SelectItem>
                    <SelectItem value="hourly">Every Hour</SelectItem>
                    <SelectItem value="daily">Daily</SelectItem>
                    <SelectItem value="weekly">Weekly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Language</Label>
                <Select value={preferences.language} onValueChange={(value: string) => { const lang = value as keyof typeof LANGUAGE_LABELS; updatePreference('language', lang); toast.success(`Language changed to ${LANGUAGE_LABELS[lang]}`); playSound('click', preferences); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(LANGUAGE_LABELS).map(([code, name]) => (
                      <SelectItem key={code} value={code}>
                        {name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Select your preferred language
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Palette className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
                Appearance Settings
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Customize the look and feel of your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Dark Mode</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Switch between light and dark theme
                  </p>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} className="shrink-0" />
              </div>

              <div className="space-y-2">
                <Label>Compact View</Label>
                <Select value={preferences.compactView} onValueChange={(value: string) => { updatePreference('compactView', value as typeof preferences.compactView); toast.success(`✅ View changed to ${value}`); playSound('click', preferences); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="comfortable">Comfortable</SelectItem>
                    <SelectItem value="compact">Compact</SelectItem>
                    <SelectItem value="spacious">Spacious</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Font Size</Label>
                <Select value={preferences.fontSize} onValueChange={(value: string) => { updatePreference('fontSize', value as typeof preferences.fontSize); toast.success(`✅ Font size changed to ${value}`); playSound('click', preferences); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="small">Small</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="large">Large</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Sidebar Position</Label>
                <Select value={preferences.sidebarPosition} onValueChange={(value: string) => { updatePreference('sidebarPosition', value as typeof preferences.sidebarPosition); toast.success(`Sidebar position set to ${value}`); playSound('click', preferences); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm">Enable Animations</Label>
                  <p className="text-xs text-muted-foreground">
                    Smooth transitions and effects
                  </p>
                </div>
                <Switch checked={preferences.animationsEnabled} onCheckedChange={(checked) => { updatePreference('animationsEnabled', checked); toast.success(checked ? 'Animations enabled' : 'Animations disabled'); playSound('click', preferences); }} className="shrink-0" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Bell className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
                Notification Preferences
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Email Notifications</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch checked={preferences.emailNotifications} onCheckedChange={(checked) => { updatePreference('emailNotifications', checked); toast.success(checked ? '✅ Email notifications enabled' : 'Email notifications disabled'); playSound('click', preferences); }} className="shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Desktop Notifications</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Show notifications on desktop
                  </p>
                </div>
                <Switch checked={preferences.pushNotifications} onCheckedChange={(checked) => { updatePreference('pushNotifications', checked); toast.success(checked ? '🔔 Desktop notifications enabled' : 'Desktop notifications disabled'); playSound('click', preferences); }} className="shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Low Stock Notifications</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Alert when inventory is low
                  </p>
                </div>
                <Switch checked={preferences.lowStockNotifications} onCheckedChange={(checked) => { updatePreference('lowStockNotifications', checked); toast.success(checked ? '📦 Low stock notifications enabled' : 'Low stock notifications disabled'); playSound('click', preferences); }} className="shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Sales Notifications</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Notify on completed sales
                  </p>
                </div>
                <Switch checked={preferences.salesNotifications} onCheckedChange={(checked) => { updatePreference('salesNotifications', checked); toast.success(checked ? '💰 Sales notifications enabled' : 'Sales notifications disabled'); playSound('click', preferences); }} className="shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Inventory Updates</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Notify on inventory changes
                  </p>
                </div>
                <Switch checked={preferences.inventoryNotifications} onCheckedChange={(checked) => { updatePreference('inventoryNotifications', checked); toast.success(checked ? '📊 Inventory notifications enabled' : 'Inventory notifications disabled'); playSound('click', preferences); }} className="shrink-0" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipts */}
        <TabsContent value="receipts">
          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-6">
              <CardTitle className="flex items-center text-base sm:text-lg">
                <Receipt className="w-4 h-4 sm:w-5 sm:h-5 mr-2 text-primary" />
                Receipt Settings
              </CardTitle>
              <CardDescription className="text-xs sm:text-sm">
                Configure receipt printing and formatting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 md:space-y-6 p-4 sm:p-6">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Auto-print Receipts</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Automatically print receipt after sale
                  </p>
                </div>
                <Switch checked={preferences.autoPrint} onCheckedChange={(checked) => { updatePreference('autoPrint', checked); toast.success(checked ? '🖨️ Auto-print enabled' : 'Auto-print disabled'); playSound('click', preferences); }} className="shrink-0" />
              </div>

              <div className="space-y-2">
                <Label>Default Printer</Label>
                <Select value={preferences.receiptPrinter} onValueChange={(value: string) => { updatePreference('receiptPrinter', value); toast.success(`🖨️ Default printer set to ${value}`); playSound('click', preferences); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="default">System Default</SelectItem>
                    <SelectItem value="thermal-58">Thermal 58mm</SelectItem>
                    <SelectItem value="thermal-80">Thermal 80mm</SelectItem>
                    <SelectItem value="a4">A4 Printer</SelectItem>
                    <SelectItem value="letter">Letter Printer</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Paper Size</Label>
                <Select value={preferences.paperSize} onValueChange={(value: string) => { updatePreference('paperSize', value as typeof preferences.paperSize); toast.success(`📄 Paper size set to ${value}`); playSound('click', preferences); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="58mm">58mm</SelectItem>
                    <SelectItem value="80mm">80mm</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Print Copies</Label>
                <Input
                  type="number"
                  min="1"
                  max="5"
                  value={preferences.printCopies}
                  onChange={(e) => {
                    const value = parseInt(e.target.value) || 1;
                    updatePreference('printCopies', value);
                    toast.success(`📄 Print copies set to ${value}`);
                  }}
                />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Show Store Logo</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Display logo on receipts
                  </p>
                </div>
                <Switch checked={preferences.showLogo} onCheckedChange={(checked) => { updatePreference('showLogo', checked); toast.success(checked ? '🏪 Logo will be shown on receipts' : 'Logo hidden from receipts'); playSound('click', preferences); }} className="shrink-0" />
              </div>

              <div className="flex items-center justify-between gap-4">
                <div className="flex-1 space-y-0.5">
                  <Label className="text-sm sm:text-base">Show Tax Breakdown</Label>
                  <p className="text-xs sm:text-sm text-muted-foreground">
                    Display detailed tax information
                  </p>
                </div>
                <Switch checked={preferences.showTaxBreakdown} onCheckedChange={(checked) => { updatePreference('showTaxBreakdown', checked); toast.success(checked ? '💵 Tax breakdown will be shown' : 'Tax breakdown hidden'); playSound('click', preferences); }} className="shrink-0" />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
