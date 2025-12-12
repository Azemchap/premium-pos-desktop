// src/pages/Integrations.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Textarea } from "@/components/ui/textarea";
import { invoke } from "@tauri-apps/api/core";
import {
  CheckCircle,
  Edit,
  Link2,
  Loader2,
  MoreHorizontal,
  Plus,
  Settings,
  Trash2,
  XCircle,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { ConfirmDialog } from "@/components/ConfirmDialog";

// Zod validation schema
const integrationSchema = z.object({
  name: z.string().min(1, "Integration name is required").max(100),
  provider: z.string().min(1, "Provider is required"),
  api_key: z.string().min(1, "API key is required"),
  api_secret: z.string().optional(),
  webhook_url: z.string().url("Invalid webhook URL").optional().or(z.literal("")),
  config: z.string().optional(),
  is_enabled: z.boolean(),
});

type IntegrationFormData = z.infer<typeof integrationSchema>;

interface Integration {
  id: number;
  name: string;
  provider: string;
  api_key: string;
  api_secret?: string;
  webhook_url?: string;
  config?: string;
  is_enabled: boolean;
  last_sync?: string;
  created_at: string;
  updated_at: string;
}

const popularIntegrations = [
  {
    name: "Stripe",
    provider: "stripe",
    description: "Accept payments online",
    icon: "💳",
    category: "Payment",
  },
  {
    name: "QuickBooks",
    provider: "quickbooks",
    description: "Accounting and financial management",
    icon: "📊",
    category: "Accounting",
  },
  {
    name: "Shopify",
    provider: "shopify",
    description: "E-commerce platform integration",
    icon: "🛍️",
    category: "E-commerce",
  },
  {
    name: "Mailchimp",
    provider: "mailchimp",
    description: "Email marketing automation",
    icon: "📧",
    category: "Marketing",
  },
  {
    name: "Slack",
    provider: "slack",
    description: "Team communication and notifications",
    icon: "💬",
    category: "Communication",
  },
  {
    name: "Google Analytics",
    provider: "google_analytics",
    description: "Track and analyze customer behavior",
    icon: "📈",
    category: "Analytics",
  },
];

export default function Integrations() {
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);
  const [formData, setFormData] = useState<IntegrationFormData>({
    name: "",
    provider: "",
    api_key: "",
    api_secret: "",
    webhook_url: "",
    config: "",
    is_enabled: true,
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [integrationToDelete, setIntegrationToDelete] = useState<{ id: number, name: string } | null>(null);

  const loadIntegrations = async () => {
    try {
      setLoading(true);
      const result = await invoke<Integration[]>("get_integrations");
      setIntegrations(result);
    } catch (error) {
      console.error("Failed to load integrations:", error);
      // For now, use empty array if backend command doesn't exist yet
      setIntegrations([]);
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    try {
      integrationSchema.parse(formData);
      setValidationErrors({});
      return true;
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) {
            errors[err.path[0].toString()] = err.message;
          }
        });
        setValidationErrors(errors);
        toast.error("Please fix validation errors");
      }
      return false;
    }
  };

  const handleCreateIntegration = async () => {
    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingIntegration) {
        await invoke("update_integration", {
          integrationId: editingIntegration.id,
          request: formData,
        });
        toast.success(`✅ Integration "${formData.name}" updated successfully!`);
      } else {
        await invoke("create_integration", {
          request: formData,
        });
        toast.success(`✅ Integration "${formData.name}" created successfully!`);
      }

      setIsDialogOpen(false);
      resetForm();
      loadIntegrations();
    } catch (error) {
      console.error("Failed to save integration:", error);
      toast.error(`❌ Failed to save integration: ${error}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEditIntegration = (integration: Integration) => {
    setEditingIntegration(integration);
    setFormData({
      name: integration.name,
      provider: integration.provider,
      api_key: integration.api_key,
      api_secret: integration.api_secret || "",
      webhook_url: integration.webhook_url || "",
      config: integration.config || "",
      is_enabled: integration.is_enabled,
    });
    setValidationErrors({});
    setIsDialogOpen(true);
  };

  const handleDeleteIntegration = (integrationId: number, name: string) => {
    setIntegrationToDelete({ id: integrationId, name });
  };

  const executeDeleteIntegration = async () => {
    if (!integrationToDelete) return;

    try {
      await invoke("delete_integration", { integrationId: integrationToDelete.id });
      toast.success(`Integration "${integrationToDelete.name}" deleted successfully!`);
      loadIntegrations();
    } catch (error) {
      console.error("Failed to delete integration:", error);
      toast.error(`Failed to delete integration: ${error}`);
    } finally {
      setIntegrationToDelete(null);
    }
  };

  const handleToggleIntegration = async (integration: Integration) => {
    try {
      await invoke("update_integration", {
        integrationId: integration.id,
        request: {
          ...integration,
          is_enabled: !integration.is_enabled,
        },
      });
      toast.success(
        `Integration "${integration.name}" ${!integration.is_enabled ? "enabled" : "disabled"}`
      );
      loadIntegrations();
    } catch (error) {
      console.error("Failed to toggle integration:", error);
      toast.error(`Failed to toggle integration: ${error}`);
    }
  };

  const handleTestConnection = async (integration: Integration) => {
    try {
      toast.loading("Testing connection...", { id: "test-connection" });
      await invoke("test_integration", { integrationId: integration.id });
      toast.success(`✅ Connection to "${integration.name}" successful!`, {
        id: "test-connection",
      });
    } catch (error) {
      console.error("Failed to test connection:", error);
      toast.error(`❌ Connection test failed: ${error}`, { id: "test-connection" });
    }
  };

  const handleQuickSetup = (provider: typeof popularIntegrations[0]) => {
    resetForm();
    setFormData((prev) => ({
      ...prev,
      name: provider.name,
      provider: provider.provider,
    }));
    setIsDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: "",
      provider: "",
      api_key: "",
      api_secret: "",
      webhook_url: "",
      config: "",
      is_enabled: true,
    });
    setEditingIntegration(null);
    setValidationErrors({});
  };

  const openCreateDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  useEffect(() => {
    loadIntegrations();
  }, []);

  // Statistics
  const totalIntegrations = integrations.length;
  const activeIntegrations = integrations.filter((i) => i.is_enabled).length;
  const inactiveIntegrations = integrations.filter((i) => !i.is_enabled).length;

  // Filter popular integrations by category
  const filteredPopular =
    selectedCategory === "all"
      ? popularIntegrations
      : popularIntegrations.filter((p) => p.category === selectedCategory);

  const categories = ["all", ...Array.from(new Set(popularIntegrations.map((p) => p.category)))];

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Link2}
        title="Integrations"
        subtitle="Connect with third-party tools and services"
        actions={
          <Button onClick={openCreateDialog} size="sm" className="shadow-md">
            <Plus className="w-4 h-4" /> Add Integration
          </Button>
        }
      />

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">
                  Total
                </p>
                <p className="text-xl md:text-2xl font-bold text-blue-900 dark:text-blue-100">
                  {totalIntegrations}
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg">
                <Link2 className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">
                  Active
                </p>
                <p className="text-xl md:text-2xl font-bold text-green-900 dark:text-green-100">
                  {activeIntegrations}
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500 to-green-600 flex items-center justify-center shadow-lg">
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-950 dark:to-gray-900 border-2 border-gray-200 dark:border-gray-800 shadow-md hover:shadow-lg transition-all duration-200">
          <CardContent className="p-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">
                  Inactive
                </p>
                <p className="text-xl md:text-2xl font-bold text-gray-900 dark:text-gray-100">
                  {inactiveIntegrations}
                </p>
              </div>
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-gray-500 to-gray-600 flex items-center justify-center shadow-lg">
                <XCircle className="w-5 h-5 text-white" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Popular Integrations */}
      {integrations.length === 0 && !loading && (
        <Card className="shadow-md border-2">
          <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b-2">
            <CardTitle className="text-lg font-bold">Popular Integrations</CardTitle>
            <CardDescription>Quick setup for commonly used services</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            <div className="flex gap-2 mb-4 overflow-x-auto pb-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  size="sm"
                  variant={selectedCategory === category ? "default" : "outline"}
                  onClick={() => setSelectedCategory(category)}
                  className="whitespace-nowrap"
                >
                  {category === "all" ? "All" : category}
                </Button>
              ))}
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {filteredPopular.map((provider) => (
                <Card
                  key={provider.provider}
                  className="hover:shadow-lg transition-shadow duration-200 cursor-pointer border-2"
                  onClick={() => handleQuickSetup(provider)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="text-3xl">{provider.icon}</div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-sm mb-1">{provider.name}</h3>
                        <p className="text-xs text-muted-foreground mb-2">
                          {provider.description}
                        </p>
                        <Badge variant="outline" className="text-xs">
                          {provider.category}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Active Integrations */}
      <Card className="shadow-md border-2 hover:shadow-lg transition-shadow duration-200">
        <CardHeader className="bg-gradient-to-r from-muted/30 to-muted/10 border-b-2">
          <CardTitle className="text-lg font-bold">Your Integrations</CardTitle>
        </CardHeader>
        <CardContent className="p-4">
          {loading ? (
            <div className="space-y-2 md:space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          ) : integrations.length === 0 ? (
            <div className="text-center py-12">
              <Zap className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <h3 className="text-lg font-medium mb-2">No integrations configured</h3>
              <p className="text-muted-foreground mb-4 text-sm">
                Connect your favorite tools to enhance your POS experience
              </p>
              <Button onClick={openCreateDialog}>
                <Plus className="w-4 h-4 mr-2" />
                Add Integration
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {integrations.map((integration) => (
                <Card
                  key={integration.id}
                  className={`border-2 transition-all duration-200 ${integration.is_enabled
                      ? "border-green-200 dark:border-green-800"
                      : "border-gray-200 dark:border-gray-800 opacity-60"
                    }`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div
                          className={`w-12 h-12 rounded-xl flex items-center justify-center ${integration.is_enabled
                              ? "bg-gradient-to-br from-green-500 to-green-600"
                              : "bg-gradient-to-br from-gray-400 to-gray-500"
                            }`}
                        >
                          <Link2 className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-base">{integration.name}</h3>
                            <Badge
                              variant={integration.is_enabled ? "default" : "secondary"}
                              className="text-xs"
                            >
                              {integration.is_enabled ? "Active" : "Inactive"}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground capitalize">
                            {integration.provider.replace(/_/g, " ")}
                          </p>
                          {integration.last_sync && (
                            <p className="text-xs text-muted-foreground mt-1">
                              Last synced: {new Date(integration.last_sync).toLocaleString()}
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={integration.is_enabled}
                          onCheckedChange={() => handleToggleIntegration(integration)}
                        />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleTestConnection(integration)}>
                              <Settings className="w-4 h-4 mr-2" />
                              Test Connection
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleEditIntegration(integration)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleDeleteIntegration(integration.id, integration.name)}
                              className="text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Integration Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base sm:text-lg">
              {editingIntegration ? "Edit Integration" : "Add New Integration"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              {editingIntegration
                ? "Update the integration details below."
                : "Configure a new third-party integration."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs font-medium">
                Integration Name *
              </Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Stripe Payment Gateway"
                className={`h-9 text-sm ${validationErrors.name ? "border-red-500" : ""}`}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="provider" className="text-xs font-medium">
                Provider *
              </Label>
              <Select
                value={formData.provider}
                onValueChange={(value) => setFormData({ ...formData, provider: value })}
              >
                <SelectTrigger className={`h-9 text-sm ${validationErrors.provider ? "border-red-500" : ""}`}>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {popularIntegrations.map((p) => (
                    <SelectItem key={p.provider} value={p.provider}>
                      {p.icon} {p.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="custom">🔧 Custom Integration</SelectItem>
                </SelectContent>
              </Select>
              {validationErrors.provider && (
                <p className="text-xs text-red-500">{validationErrors.provider}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="api_key" className="text-xs font-medium">
                API Key *
              </Label>
              <Input
                id="api_key"
                type="password"
                value={formData.api_key}
                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                placeholder="Enter API key"
                className={`h-9 text-sm ${validationErrors.api_key ? "border-red-500" : ""}`}
              />
              {validationErrors.api_key && (
                <p className="text-xs text-red-500">{validationErrors.api_key}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="api_secret" className="text-xs font-medium">
                API Secret (optional)
              </Label>
              <Input
                id="api_secret"
                type="password"
                value={formData.api_secret}
                onChange={(e) => setFormData({ ...formData, api_secret: e.target.value })}
                placeholder="Enter API secret"
                className="h-9 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="webhook_url" className="text-xs font-medium">
                Webhook URL (optional)
              </Label>
              <Input
                id="webhook_url"
                type="url"
                value={formData.webhook_url}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                placeholder="https://your-app.com/webhook"
                className={`h-9 text-sm ${validationErrors.webhook_url ? "border-red-500" : ""}`}
              />
              {validationErrors.webhook_url && (
                <p className="text-xs text-red-500">{validationErrors.webhook_url}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="config" className="text-xs font-medium">
                Additional Configuration (JSON)
              </Label>
              <Textarea
                id="config"
                value={formData.config}
                onChange={(e) => setFormData({ ...formData, config: e.target.value })}
                placeholder='{"setting": "value"}'
                rows={3}
                className="text-sm resize-none font-mono"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="is_enabled"
                checked={formData.is_enabled}
                onCheckedChange={(checked) => setFormData({ ...formData, is_enabled: checked })}
              />
              <Label htmlFor="is_enabled" className="text-xs font-medium cursor-pointer">
                Enable this integration
              </Label>
            </div>
          </div>

          <DialogFooter className="flex-col sm:flex-row gap-2 mt-6">
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={handleCreateIntegration}
              disabled={isSubmitting}
              className="w-full sm:w-auto"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : editingIntegration ? (
                "Update Integration"
              ) : (
                "Add Integration"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!integrationToDelete}
        onOpenChange={(open) => !open && setIntegrationToDelete(null)}
        title="Delete Integration"
        description={`Are you sure you want to delete the "${integrationToDelete?.name}" integration?`}
        onConfirm={executeDeleteIntegration}
        confirmText="Delete"
        variant="destructive"
      />
    </div >
  );
}
