// src/pages/Organization.tsx - Refactored with Inventory-style design
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
import StatCard from "@/components/StatCard";
import FilterBar from "@/components/FilterBar";
import TableActions from "@/components/TableActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { invoke } from "@tauri-apps/api/core";
import {
  Building2,
  CheckCircle,
  Edit,
  Loader2,
  MapPin,
  Plus,
  Store,
  RefreshCw,
  Trash2,
  Mail,
  Phone,
  Globe,
} from "lucide-react";
import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { z } from "zod";

const organizationSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  legal_name: z.string().optional(),
  tax_id: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  website: z.string().optional(),
  description: z.string().optional(),
});

const locationSchema = z.object({
  name: z.string().min(1, "Location name is required"),
  address: z.string().min(1, "Address is required"),
  city: z.string().min(1, "City is required"),
  state: z.string().optional(),
  zip_code: z.string().optional(),
  country: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  tax_rate: z.number().min(0).max(100).optional(),
  currency: z.string().optional(),
});

type OrganizationFormData = z.infer<typeof organizationSchema>;
type LocationFormData = z.infer<typeof locationSchema>;

interface Organization {
  id: number;
  name: string;
  legal_name?: string;
  tax_id?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  is_active: boolean;
  created_at: string;
}

interface Location {
  id: number;
  name: string;
  address: string;
  city: string;
  state?: string;
  zip_code?: string;
  country: string;
  phone?: string;
  email?: string;
  tax_rate: number;
  currency: string;
  logo_url?: string;
  is_active: boolean;
  created_at: string;
}

export default function Organization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");

  const [isOrgDialogOpen, setIsOrgDialogOpen] = useState(false);
  const [isLocationDialogOpen, setIsLocationDialogOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);

  const [orgFormData, setOrgFormData] = useState<OrganizationFormData>({
    name: "",
    legal_name: "",
    tax_id: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "US",
    phone: "",
    email: "",
    website: "",
    description: "",
  });

  const [locationFormData, setLocationFormData] = useState<LocationFormData>({
    name: "",
    address: "",
    city: "",
    state: "",
    zip_code: "",
    country: "US",
    phone: "",
    email: "",
    tax_rate: 0,
    currency: "USD",
  });

  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Debounce search query
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearchQuery(searchQuery);
    }, 300);
    return () => clearTimeout(handler);
  }, [searchQuery]);

  const loadOrganization = async () => {
    try {
      setLoading(true);
      const result = await invoke<Organization>("get_organization");
      setOrganization(result);
      if (result) {
        setOrgFormData({
          name: result.name,
          legal_name: result.legal_name || "",
          tax_id: result.tax_id || "",
          address: result.address || "",
          city: result.city || "",
          state: result.state || "",
          zip_code: result.zip_code || "",
          country: result.country || "US",
          phone: result.phone || "",
          email: result.email || "",
          website: result.website || "",
          description: result.description || "",
        });
      }
      toast.success("✅ Organization loaded");
    } catch (error) {
      console.error("Failed to load organization:", error);
      toast.error("❌ Failed to load organization");
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const result = await invoke<Location[]>("get_locations");
      setLocations(result);
      toast.success(`✅ Loaded ${result.length} locations`);
    } catch (error) {
      console.error("Failed to load locations:", error);
      toast.error("❌ Failed to load locations");
    }
  };

  const handleSaveOrganization = async () => {
    setIsSubmitting(true);
    try {
      organizationSchema.parse(orgFormData);
      if (organization) {
        await invoke("update_organization", {
          request: orgFormData,
        });
        toast.success("✅ Organization updated successfully!");
      } else {
        const slug = orgFormData.name
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '');

        await invoke("create_organization", {
          request: {
            ...orgFormData,
            slug: slug || 'my-business',
          },
        });
        toast.success("✅ Organization created successfully!");
      }
      setIsOrgDialogOpen(false);
      loadOrganization();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
        toast.error("❌ Please fix validation errors");
      } else {
        console.error("Failed to save organization:", error);
        toast.error(`❌ Failed to save organization: ${error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveLocation = async () => {
    setIsSubmitting(true);
    try {
      locationSchema.parse(locationFormData);
      if (editingLocation) {
        await invoke("update_location", {
          locationId: editingLocation.id,
          request: locationFormData,
        });
        toast.success("✅ Location updated successfully!");
      } else {
        await invoke("create_location", {
          request: locationFormData,
        });
        toast.success("✅ Location created successfully!");
      }
      setIsLocationDialogOpen(false);
      resetLocationForm();
      loadLocations();
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach((err) => {
          if (err.path[0]) errors[err.path[0].toString()] = err.message;
        });
        setValidationErrors(errors);
        toast.error("❌ Please fix validation errors");
      } else {
        console.error("Failed to save location:", error);
        toast.error(`❌ Failed to save location: ${error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteLocation = async (locationId: number) => {
    if (!confirm("Are you sure you want to delete this location?")) return;

    try {
      await invoke("delete_location", { locationId });
      toast.success("✅ Location deleted successfully!");
      loadLocations();
    } catch (error) {
      console.error("Failed to delete location:", error);
      toast.error(`❌ Failed to delete location: ${error}`);
    }
  };

  const resetLocationForm = () => {
    setLocationFormData({
      name: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      country: "US",
      phone: "",
      email: "",
      tax_rate: 0,
      currency: "USD",
    });
    setEditingLocation(null);
    setValidationErrors({});
  };

  const openEditLocation = (location: Location) => {
    setEditingLocation(location);
    setLocationFormData({
      name: location.name,
      address: location.address,
      city: location.city,
      state: location.state || "",
      zip_code: location.zip_code || "",
      country: location.country || "US",
      phone: location.phone || "",
      email: location.email || "",
      tax_rate: location.tax_rate || 0,
      currency: location.currency || "USD",
    });
    setIsLocationDialogOpen(true);
  };

  // Filtered locations
  const filteredLocations = useMemo(() => {
    return locations.filter((location) => {
      const matchesSearch =
        !debouncedSearchQuery ||
        location.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        location.city.toLowerCase().includes(debouncedSearchQuery.toLowerCase()) ||
        location.address.toLowerCase().includes(debouncedSearchQuery.toLowerCase());

      const matchesStatus =
        filterStatus === "all" ||
        (filterStatus === "active" && location.is_active) ||
        (filterStatus === "inactive" && !location.is_active);

      return matchesSearch && matchesStatus;
    });
  }, [locations, debouncedSearchQuery, filterStatus]);

  useEffect(() => {
    loadOrganization();
    loadLocations();
  }, []);

  const activeLocations = locations.filter((l) => l.is_active).length;
  const totalLocations = locations.length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Building2}
        title="Organization"
        subtitle="Manage your organization and business locations"
        actions={
          <Button onClick={loadOrganization} variant="outline" size="sm" className="w-full sm:w-auto">
            <RefreshCw className="w-5 h-5 mr-2" />
            Refresh
          </Button>
        }
      />

      <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <StatCard
          title="Total Locations"
          value={totalLocations}
          icon={Store}
          gradient="bg-gradient-to-br from-blue-500 to-blue-600"
        />
        <StatCard
          title="Active"
          value={activeLocations}
          icon={CheckCircle}
          gradient="bg-gradient-to-br from-green-500 to-emerald-600"
        />
        <StatCard
          title="Organization"
          value={organization ? "Active" : "Not Setup"}
          icon={Building2}
          gradient="bg-gradient-to-br from-purple-500 to-indigo-600"
          colSpan="col-span-2"
        />
      </div>

      <Tabs defaultValue="overview" className="space-y-4 sm:space-y-5">
        <TabsList className="h-auto p-2">
          <TabsTrigger value="overview" className="text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-3">
            <Building2 className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Organization</span>
            <span className="sm:hidden">Org</span>
          </TabsTrigger>
          <TabsTrigger value="locations" className="text-xs sm:text-sm px-4 sm:px-5 py-2 sm:py-3">
            <MapPin className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
            <span className="hidden sm:inline">Locations</span>
            <span className="sm:hidden">Sites</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {loading ? (
            <Card className="shadow-md">
              <CardContent className="p-6">
                <Skeleton className="h-48 w-full" />
              </CardContent>
            </Card>
          ) : organization ? (
            <Card className="shadow-md">
              <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-5 flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-base sm:text-xl">{organization.name}</CardTitle>
                  {organization.legal_name && (
                    <p className="text-xs sm:text-sm text-muted-foreground mt-2">
                      {organization.legal_name}
                    </p>
                  )}
                </div>
                <Button size="sm" onClick={() => setIsOrgDialogOpen(true)} className="h-9">
                  <Edit className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                  <span className="hidden sm:inline">Edit</span>
                </Button>
              </CardHeader>
              <CardContent className="p-4 sm:p-6 grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
                {organization.address && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Address
                    </p>
                    <p className="text-xs sm:text-sm font-medium">{organization.address}</p>
                    <p className="text-xs sm:text-sm text-muted-foreground">
                      {organization.city}, {organization.state} {organization.zip_code}
                    </p>
                  </div>
                )}
                {organization.phone && (
                  <div className="p-4 bg-muted/30 rounded-lg flex items-start gap-3">
                    <Phone className="w-5 h-5 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Phone
                      </p>
                      <p className="text-xs sm:text-sm font-medium">{organization.phone}</p>
                    </div>
                  </div>
                )}
                {organization.email && (
                  <div className="p-4 bg-muted/30 rounded-lg flex items-start gap-3">
                    <Mail className="w-5 h-5 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Email
                      </p>
                      <p className="text-xs sm:text-sm font-medium">{organization.email}</p>
                    </div>
                  </div>
                )}
                {organization.website && (
                  <div className="p-4 bg-muted/30 rounded-lg flex items-start gap-3">
                    <Globe className="w-5 h-5 text-muted-foreground mt-1" />
                    <div>
                      <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                        Website
                      </p>
                      <p className="text-xs sm:text-sm font-medium">{organization.website}</p>
                    </div>
                  </div>
                )}
                {organization.tax_id && (
                  <div className="p-4 bg-muted/30 rounded-lg">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Tax ID
                    </p>
                    <p className="text-xs sm:text-sm font-medium">{organization.tax_id}</p>
                  </div>
                )}
                {organization.description && (
                  <div className="p-4 bg-muted/30 rounded-lg md:col-span-2">
                    <p className="text-[10px] sm:text-xs font-medium text-muted-foreground mb-2 uppercase tracking-wide">
                      Description
                    </p>
                    <p className="text-xs sm:text-sm">{organization.description}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md">
              <CardContent className="py-10 sm:py-14 text-center">
                <Building2 className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-4 sm:mb-5 text-muted-foreground opacity-50" />
                <h3 className="text-base sm:text-lg font-medium mb-2 sm:mb-3">No Organization Created</h3>
                <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-5">
                  Create your organization to get started
                </p>
                <Button onClick={() => setIsOrgDialogOpen(true)} size="sm">
                  <Plus className="w-5 h-5 mr-2" />
                  Create Organization
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="locations">
          <FilterBar
            searchValue={searchQuery}
            onSearchChange={setSearchQuery}
            searchPlaceholder="Search locations..."
            filters={[
              {
                placeholder: "All Status",
                value: filterStatus,
                onChange: setFilterStatus,
                options: [
                  { label: "All Status", value: "all" },
                  { label: "✓ Active", value: "active" },
                  { label: "✗ Inactive", value: "inactive" },
                ],
              },
            ]}
          />

          <Card className="shadow-md">
            <CardHeader className="bg-gradient-to-r from-primary/5 to-primary/10 p-4 sm:p-5 flex flex-row items-center justify-between">
              <div className="flex items-center">
                <MapPin className="w-5 h-5 mr-2 text-primary" />
                <CardTitle className="text-sm sm:text-base">Business Locations</CardTitle>
                <Badge className="ml-3 text-xs" variant="secondary">
                  {filteredLocations.length}
                </Badge>
              </div>
              <Button
                size="sm"
                onClick={() => {
                  resetLocationForm();
                  setIsLocationDialogOpen(true);
                }}
                className="h-8 sm:h-9 text-xs"
              >
                <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" />
                <span className="hidden sm:inline">Add Location</span>
                <span className="sm:hidden">Add</span>
              </Button>
            </CardHeader>
            <CardContent className="p-0 sm:p-4">
              {filteredLocations.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-b">
                        <TableHead className="h-9 px-3 sm:px-5 text-xs">Location</TableHead>
                        <TableHead className="h-9 px-3 sm:px-5 text-xs">Address</TableHead>
                        <TableHead className="h-9 px-3 sm:px-5 text-xs hidden md:table-cell">Contact</TableHead>
                        <TableHead className="h-9 px-3 sm:px-5 text-xs">Status</TableHead>
                        <TableHead className="h-9 px-3 sm:px-5 text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredLocations.map((location) => (
                        <TableRow key={location.id} className="hover:bg-muted/50 transition-colors border-b h-12">
                          <TableCell className="py-3 px-3 sm:px-5">
                            <div>
                              <div className="text-xs sm:text-sm font-medium truncate max-w-[120px] sm:max-w-[200px]">
                                {location.name}
                              </div>
                              <Badge variant="outline" className="text-[10px] px-2 py-1 h-5 mt-1">
                                {location.currency}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3 sm:px-5">
                            <div className="text-[10px] sm:text-xs">
                              <div className="font-medium">{location.address}</div>
                              <div className="text-muted-foreground">
                                {location.city}, {location.state}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3 sm:px-5 hidden md:table-cell text-[10px] sm:text-xs">
                            <div className="space-y-1">
                              {location.phone && (
                                <div className="flex items-center gap-2">
                                  <Phone className="w-4 h-4 text-muted-foreground" />
                                  {location.phone}
                                </div>
                              )}
                              {location.email && (
                                <div className="flex items-center gap-2">
                                  <Mail className="w-4 h-4 text-muted-foreground" />
                                  {location.email}
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3 px-3 sm:px-5">
                            <Badge
                              variant={location.is_active ? "default" : "secondary"}
                              className="text-[10px] px-2 h-6"
                            >
                              {location.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 px-3 sm:px-5 text-right">
                            <TableActions
                              actions={[
                                {
                                  label: "Edit Location",
                                  icon: Edit,
                                  onClick: () => openEditLocation(location),
                                },
                                {
                                  label: "Delete Location",
                                  icon: Trash2,
                                  onClick: () => handleDeleteLocation(location.id),
                                  variant: "destructive",
                                },
                              ]}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-7 md:py-14">
                  <MapPin className="w-12 h-12 sm:w-14 sm:h-14 mx-auto mb-3 sm:mb-5 text-muted-foreground opacity-50" />
                  <h3 className="text-sm sm:text-lg font-medium mb-2 sm:mb-3">No Locations Found</h3>
                  <p className="text-xs sm:text-sm text-muted-foreground mb-4 sm:mb-5">
                    {debouncedSearchQuery || filterStatus !== "all"
                      ? "Try adjusting your filters"
                      : "Add your first business location"}
                  </p>
                  {!debouncedSearchQuery && filterStatus === "all" && (
                    <Button
                      onClick={() => {
                        resetLocationForm();
                        setIsLocationDialogOpen(true);
                      }}
                      size="sm"
                    >
                      <Plus className="w-5 h-5 mr-2" />
                      Add Location
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {organization ? "Edit Organization" : "Create Organization"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Enter your organization details
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="name" className="text-xs sm:text-sm">
                Organization Name *
              </Label>
              <Input
                id="name"
                value={orgFormData.name}
                onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                className={`h-9 ${validationErrors.name ? "border-red-500" : ""}`}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="legal_name" className="text-xs sm:text-sm">
                Legal Name
              </Label>
              <Input
                id="legal_name"
                value={orgFormData.legal_name}
                onChange={(e) => setOrgFormData({ ...orgFormData, legal_name: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="tax_id" className="text-xs sm:text-sm">
                Tax ID
              </Label>
              <Input
                id="tax_id"
                value={orgFormData.tax_id}
                onChange={(e) => setOrgFormData({ ...orgFormData, tax_id: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="address" className="text-xs sm:text-sm">
                Address
              </Label>
              <Input
                id="address"
                value={orgFormData.address}
                onChange={(e) => setOrgFormData({ ...orgFormData, address: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city" className="text-xs sm:text-sm">
                City
              </Label>
              <Input
                id="city"
                value={orgFormData.city}
                onChange={(e) => setOrgFormData({ ...orgFormData, city: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state" className="text-xs sm:text-sm">
                State
              </Label>
              <Input
                id="state"
                value={orgFormData.state}
                onChange={(e) => setOrgFormData({ ...orgFormData, state: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone" className="text-xs sm:text-sm">
                Phone
              </Label>
              <Input
                id="phone"
                value={orgFormData.phone}
                onChange={(e) => setOrgFormData({ ...orgFormData, phone: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email" className="text-xs sm:text-sm">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={orgFormData.email}
                onChange={(e) => setOrgFormData({ ...orgFormData, email: e.target.value })}
                className={`h-9 ${validationErrors.email ? "border-red-500" : ""}`}
              />
              {validationErrors.email && (
                <p className="text-xs text-red-500">{validationErrors.email}</p>
              )}
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="website" className="text-xs sm:text-sm">
                Website
              </Label>
              <Input
                id="website"
                value={orgFormData.website}
                onChange={(e) => setOrgFormData({ ...orgFormData, website: e.target.value })}
                className="h-9"
                placeholder="https://example.com"
              />
            </div>
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="description" className="text-xs sm:text-sm">
                Description
              </Label>
              <Textarea
                id="description"
                value={orgFormData.description}
                onChange={(e) => setOrgFormData({ ...orgFormData, description: e.target.value })}
                rows={3}
                className="text-sm resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 mt-7">
            <Button
              variant="outline"
              onClick={() => setIsOrgDialogOpen(false)}
              disabled={isSubmitting}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveOrganization}
              disabled={isSubmitting}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg">
              {editingLocation ? "Edit Location" : "Add Location"}
            </DialogTitle>
            <DialogDescription className="text-xs sm:text-sm">
              Enter location details
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="location-name" className="text-xs sm:text-sm">
                Location Name *
              </Label>
              <Input
                id="location-name"
                value={locationFormData.name}
                onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                className={`h-9 ${validationErrors.name ? "border-red-500" : ""}`}
              />
              {validationErrors.name && (
                <p className="text-xs text-red-500">{validationErrors.name}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-address" className="text-xs sm:text-sm">
                Address *
              </Label>
              <Input
                id="location-address"
                value={locationFormData.address}
                onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                className={`h-9 ${validationErrors.address ? "border-red-500" : ""}`}
              />
              {validationErrors.address && (
                <p className="text-xs text-red-500">{validationErrors.address}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-city" className="text-xs sm:text-sm">
                City *
              </Label>
              <Input
                id="location-city"
                value={locationFormData.city}
                onChange={(e) => setLocationFormData({ ...locationFormData, city: e.target.value })}
                className={`h-9 ${validationErrors.city ? "border-red-500" : ""}`}
              />
              {validationErrors.city && (
                <p className="text-xs text-red-500">{validationErrors.city}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-state" className="text-xs sm:text-sm">
                State
              </Label>
              <Input
                id="location-state"
                value={locationFormData.state}
                onChange={(e) => setLocationFormData({ ...locationFormData, state: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-phone" className="text-xs sm:text-sm">
                Phone
              </Label>
              <Input
                id="location-phone"
                value={locationFormData.phone}
                onChange={(e) => setLocationFormData({ ...locationFormData, phone: e.target.value })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-email" className="text-xs sm:text-sm">
                Email
              </Label>
              <Input
                id="location-email"
                type="email"
                value={locationFormData.email}
                onChange={(e) => setLocationFormData({ ...locationFormData, email: e.target.value })}
                className={`h-9 ${validationErrors.email ? "border-red-500" : ""}`}
              />
              {validationErrors.email && (
                <p className="text-xs text-red-500">{validationErrors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-tax_rate" className="text-xs sm:text-sm">
                Tax Rate (%)
              </Label>
              <Input
                id="location-tax_rate"
                type="number"
                value={locationFormData.tax_rate}
                onChange={(e) => setLocationFormData({ ...locationFormData, tax_rate: parseFloat(e.target.value) || 0 })}
                className="h-9"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="location-currency" className="text-xs sm:text-sm">
                Currency
              </Label>
              <Input
                id="location-currency"
                value={locationFormData.currency}
                onChange={(e) => setLocationFormData({ ...locationFormData, currency: e.target.value })}
                className="h-9"
              />
            </div>
          </div>
          <DialogFooter className="gap-3 mt-7">
            <Button
              variant="outline"
              onClick={() => setIsLocationDialogOpen(false)}
              disabled={isSubmitting}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveLocation}
              disabled={isSubmitting}
              size="sm"
              className="flex-1 sm:flex-none"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
