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
import { Textarea } from "@/components/ui/textarea";
import { useCurrency } from "@/hooks/useCurrency";
import { useSettings } from "@/hooks/useSettings";
import { useAuthStore } from "@/store/authStore";
import { playSound } from "@/store/settingsStore";
import { invoke } from "@tauri-apps/api/core";
import {
  Bell,
  Palette,
  Receipt,
  RefreshCw,
  Save,
  Settings as SettingsIcon,
  Store
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

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

interface UpdateStoreConfigRequest {
  name: string;
  address?: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  currency: string;
  timezone: string;
}

export default function Settings() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [storeConfig, setStoreConfig] = useState<StoreConfig | null>(null);
  const [storeForm, setStoreForm] = useState<UpdateStoreConfigRequest>({
    name: "",
    address: "",
    phone: "",
    email: "",
    tax_rate: 0,
    currency: "USD",
    timezone: "America/New_York",
  });

  const { theme, toggleTheme } = useAuthStore();
  const { currency, changeCurrency, availableCurrencies } = useCurrency();
  const { preferences, updatePreference, updatePreferences, resetToDefaults } = useSettings();

  // Using availableCurrencies from useCurrency hook instead
  // const currencies = availableCurrencies;

  const timezones = [
    "America/New_York",
    "America/Chicago",
    "America/Denver",
    "America/Los_Angeles",
    "America/Toronto",
    "Europe/London",
    "Europe/Paris",
    "Asia/Tokyo",
    "Asia/Shanghai",
    "Australia/Sydney",
  ];

  const loadStoreConfig = async () => {
    try {
      setLoading(true);
      const result = await invoke<StoreConfig>("get_store_config");
      setStoreConfig(result);
      setStoreForm({
        name: result.name,
        address: result.address || "",
        phone: result.phone || "",
        email: result.email || "",
        tax_rate: result.tax_rate,
        currency: result.currency,
        timezone: result.timezone,
      });
    } catch (error) {
      console.error("Failed to load store config:", error);
      toast.error("Failed to load store configuration");
    } finally {
      setLoading(false);
    }
  };

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
      loadStoreConfig();
    } catch (error) {
      console.error("Failed to save store config:", error);
      toast.error("❌ Failed to save store configuration");
      playSound('error', preferences);
    } finally {
      setSaving(false);
    }
  };
  
  const saveAllSettings = () => {
    toast.success("✅ All settings saved successfully");
    playSound('success', preferences);
  };

  const resetStoreConfig = () => {
    if (storeConfig) {
      setStoreForm({
        name: storeConfig.name,
        address: storeConfig.address || "",
        phone: storeConfig.phone || "",
        email: storeConfig.email || "",
        tax_rate: storeConfig.tax_rate,
        currency: storeConfig.currency,
        timezone: storeConfig.timezone,
      });
      toast.info("Changes reset to saved values");
    }
  };

  useEffect(() => {
    loadStoreConfig();
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground mt-1">
            Configure your store and system preferences
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => {
            resetToDefaults();
            toast.success("🔄 All preferences reset to defaults");
            playSound('success', preferences);
          }}>
            <RefreshCw className="w-4 h-4 mr-2" />
            Reset All
          </Button>
          <Button onClick={saveAllSettings}>
            <Save className="w-4 h-4 mr-2" />
            Save All Settings
          </Button>
        </div>
      </div>

      <Tabs defaultValue="store" className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="store">
            <Store className="w-4 h-4 mr-2" />
            Store
          </TabsTrigger>
          <TabsTrigger value="system">
            <SettingsIcon className="w-4 h-4 mr-2" />
            System
          </TabsTrigger>
          <TabsTrigger value="appearance">
            <Palette className="w-4 h-4 mr-2" />
            Appearance
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="w-4 h-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="receipts">
            <Receipt className="w-4 h-4 mr-2" />
            Receipts
          </TabsTrigger>
        </TabsList>

        {/* Store Configuration */}
        <TabsContent value="store">
          <div className="grid gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Store Information</CardTitle>
                <CardDescription>
                  Basic information about your store
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
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

                    <div className="space-y-2">
                      <Label htmlFor="store-address">Address</Label>
                      <Textarea
                        id="store-address"
                        value={storeForm.address}
                        onChange={(e) => setStoreForm({ ...storeForm, address: e.target.value })}
                        placeholder="123 Main Street, City, State 12345"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* <Card>
              <CardHeader>
                <CardTitle>Regional Settings</CardTitle>
                <CardDescription>
                  Configure currency, tax rate, and timezone
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loading ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <Skeleton key={i} className="h-10 w-full" />
                    ))}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={storeForm.currency}
                        onValueChange={(value) => setStoreForm({ ...storeForm, currency: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {availableCurrencies.map((curr) => (
                            <SelectItem key={curr.code} value={curr.code}>
                              {curr.name} ({curr.symbol})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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

                    <div className="space-y-2">
                      <Label htmlFor="timezone">Timezone</Label>
                      <Select
                        value={storeForm.timezone}
                        onValueChange={(value) => setStoreForm({ ...storeForm, timezone: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {timezones.map((tz) => (
                            <SelectItem key={tz} value={tz}>
                              {tz.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </CardContent>
            </Card> */}

            {/* <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={resetStoreConfig} disabled={loading}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button onClick={saveStoreConfig} disabled={saving || loading}>
                <Save className="w-4 h-4 mr-2" />
                Save Changes
              </Button>
            </div> */}
          </div>
        </TabsContent>

        {/* System Settings */}
        <TabsContent value="system">
          <Card>
            <CardHeader>
              <CardTitle>System Preferences</CardTitle>
              <CardDescription>
                Configure system behavior and data management
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-save Enabled</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically save changes in forms
                  </p>
                </div>
                <Switch checked={preferences.autoSave} onCheckedChange={(checked) => { updatePreference('autoSave', checked); toast.success(checked ? '✅ Auto-save enabled' : 'Auto-save disabled'); playSound('click', preferences); }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Alerts</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify when products are running low
                  </p>
                </div>
                <Switch checked={preferences.lowStockAlerts} onCheckedChange={(checked) => { updatePreference('lowStockAlerts', checked); toast.success(checked ? '✅ Low stock alerts enabled' : 'Low stock alerts disabled'); playSound('click', preferences); }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sound Effects</Label>
                  <p className="text-sm text-muted-foreground">
                    Play sounds for actions and notifications
                  </p>
                </div>
                <Switch checked={preferences.soundEffects} onCheckedChange={(checked) => { updatePreference('soundEffects', checked); toast.success(checked ? '✅ Sound effects enabled' : '🔇 Sound effects disabled'); if (checked) playSound('success', { ...preferences, soundEffects: true }); }} />
              </div>

              <div className="space-y-2">
                <Label>Data Retention Period</Label>
                <Select value={preferences.dataRetention} onValueChange={(value: any) => { updatePreference('dataRetention', value); toast.success(`✅ Data retention set to ${value}`); playSound('click', preferences); }}>
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
                <Select value={preferences.backupFrequency} onValueChange={(value: any) => { updatePreference('backupFrequency', value); toast.success(`✅ Backup frequency set to ${value}`); playSound('click', preferences); }}>
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
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appearance */}
        <TabsContent value="appearance">
          {/* Currency Preferences Card */}
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Currency Preferences</CardTitle>
              <CardDescription>
                Select your preferred currency for the entire app
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="app-currency">App Currency</Label>
                <Select value={currency.code} onValueChange={(value: any) => {
                  changeCurrency(value);
                  toast.success(`✅ Currency changed to ${availableCurrencies.find(c => c.code === value)?.name}`);
                }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {availableCurrencies.map((curr) => (
                      <SelectItem key={curr.code} value={curr.code}>
                        {curr.name} ({curr.symbol})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground">
                  Current: <strong>{currency.name}</strong> - Format example: <strong>{currency.code === 'USD' ? '$1,234.56' : '1,234 FCFA'}</strong>
                </p>
                <p className="text-sm text-muted-foreground">
                  This affects how all prices are displayed throughout the app, including sales, products, and reports.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Appearance Settings</CardTitle>
              <CardDescription>
                Customize the look and feel of your application
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Dark Mode</Label>
                  <p className="text-sm text-muted-foreground">
                    Switch between light and dark theme
                  </p>
                </div>
                <Switch checked={theme === "dark"} onCheckedChange={toggleTheme} />
              </div>

              <div className="space-y-2">
                <Label>Compact View</Label>
                <Select value={preferences.compactView} onValueChange={(value: any) => { updatePreference('compactView', value); toast.success(`✅ View changed to ${value}`); playSound('click', preferences); }}>
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
                <Select value={preferences.fontSize} onValueChange={(value: any) => { updatePreference('fontSize', value); toast.success(`✅ Font size changed to ${value}`); playSound('click', preferences); }}>
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
                <Select value={preferences.sidebarPosition} onValueChange={(value: any) => { updatePreference('sidebarPosition', value); toast.success(`✅ Sidebar position set to ${value}`); playSound('click', preferences); }}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="left">Left</SelectItem>
                    <SelectItem value="right">Right</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Preferences</CardTitle>
              <CardDescription>
                Control how and when you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Email Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Receive notifications via email
                  </p>
                </div>
                <Switch checked={preferences.emailNotifications} onCheckedChange={(checked) => { updatePreference('emailNotifications', checked); toast.success(checked ? '✅ Email notifications enabled' : 'Email notifications disabled'); playSound('click', preferences); }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Desktop Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Show notifications on desktop
                  </p>
                </div>
                <Switch checked={preferences.pushNotifications} onCheckedChange={(checked) => { updatePreference('pushNotifications', checked); toast.success(checked ? '🔔 Desktop notifications enabled' : 'Desktop notifications disabled'); playSound('click', preferences); }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Low Stock Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Alert when inventory is low
                  </p>
                </div>
                <Switch checked={preferences.lowStockNotifications} onCheckedChange={(checked) => { updatePreference('lowStockNotifications', checked); toast.success(checked ? '📦 Low stock notifications enabled' : 'Low stock notifications disabled'); playSound('click', preferences); }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Sales Notifications</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify on completed sales
                  </p>
                </div>
                <Switch checked={preferences.salesNotifications} onCheckedChange={(checked) => { updatePreference('salesNotifications', checked); toast.success(checked ? '💰 Sales notifications enabled' : 'Sales notifications disabled'); playSound('click', preferences); }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Inventory Updates</Label>
                  <p className="text-sm text-muted-foreground">
                    Notify on inventory changes
                  </p>
                </div>
                <Switch checked={preferences.inventoryNotifications} onCheckedChange={(checked) => { updatePreference('inventoryNotifications', checked); toast.success(checked ? '📊 Inventory notifications enabled' : 'Inventory notifications disabled'); playSound('click', preferences); }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Receipts */}
        <TabsContent value="receipts">
          <Card>
            <CardHeader>
              <CardTitle>Receipt Settings</CardTitle>
              <CardDescription>
                Configure receipt printing and formatting
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Auto-print Receipts</Label>
                  <p className="text-sm text-muted-foreground">
                    Automatically print receipt after sale
                  </p>
                </div>
                <Switch checked={preferences.autoPrint} onCheckedChange={(checked) => { updatePreference('autoPrint', checked); toast.success(checked ? '🖨️ Auto-print enabled' : 'Auto-print disabled'); playSound('click', preferences); }} />
              </div>

              <div className="space-y-2">
                <Label>Default Printer</Label>
                <Select value={preferences.receiptPrinter} onValueChange={(value: any) => { updatePreference('receiptPrinter', value); toast.success(`🖨️ Default printer set to ${value}`); playSound('click', preferences); }}>
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
                <Select value={preferences.paperSize} onValueChange={(value: any) => { updatePreference('paperSize', value); toast.success(`📄 Paper size set to ${value}`); playSound('click', preferences); }}>
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

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Store Logo</Label>
                  <p className="text-sm text-muted-foreground">
                    Display logo on receipts
                  </p>
                </div>
                <Switch checked={preferences.showLogo} onCheckedChange={(checked) => { updatePreference('showLogo', checked); toast.success(checked ? '🏪 Logo will be shown on receipts' : 'Logo hidden from receipts'); playSound('click', preferences); }} />
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show Tax Breakdown</Label>
                  <p className="text-sm text-muted-foreground">
                    Display detailed tax information
                  </p>
                </div>
                <Switch checked={preferences.showTaxBreakdown} onCheckedChange={(checked) => { updatePreference('showTaxBreakdown', checked); toast.success(checked ? '💵 Tax breakdown will be shown' : 'Tax breakdown hidden'); playSound('click', preferences); }} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
