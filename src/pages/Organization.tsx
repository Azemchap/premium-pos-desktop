// src/pages/Organization.tsx
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PageHeader from "@/components/PageHeader";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Users,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
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
  phone: z.string().optional(),
  manager_name: z.string().optional(),
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
  organization_id: number;
  name: string;
  address: string;
  city: string;
  state?: string;
  zip_code?: string;
  phone?: string;
  manager_name?: string;
  is_active: boolean;
  created_at: string;
}

export default function Organization() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
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
    country: "USA",
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
    phone: "",
    manager_name: "",
  });
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          country: result.country || "USA",
          phone: result.phone || "",
          email: result.email || "",
          website: result.website || "",
          description: result.description || "",
        });
      }
    } catch (error) {
      console.error("Failed to load organization:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadLocations = async () => {
    try {
      const result = await invoke<Location[]>("get_locations");
      setLocations(result);
    } catch (error) {
      console.error("Failed to load locations:", error);
      toast.error("Failed to load locations");
    }
  };

  const handleSaveOrganization = async () => {
    setIsSubmitting(true);
    try {
      organizationSchema.parse(orgFormData);
      if (organization) {
        await invoke("update_organization", {
          organizationId: organization.id,
          request: orgFormData,
        });
        toast.success("✅ Organization updated successfully!");
      } else {
        await invoke("create_organization", {
          request: orgFormData,
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
        toast.error("Please fix validation errors");
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
        toast.error("Please fix validation errors");
      } else {
        console.error("Failed to save location:", error);
        toast.error(`❌ Failed to save location: ${error}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetLocationForm = () => {
    setLocationFormData({
      name: "",
      address: "",
      city: "",
      state: "",
      zip_code: "",
      phone: "",
      manager_name: "",
    });
    setEditingLocation(null);
    setValidationErrors({});
  };

  useEffect(() => {
    loadOrganization();
    loadLocations();
  }, []);

  const activeLocations = locations.filter(l => l.is_active).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <PageHeader
        icon={Building2}
        title="Organization"
        subtitle="Manage your organization and locations"
      />

      <Tabs defaultValue="overview" className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="locations">Locations</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-3 md:gap-4">
            <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950 dark:to-blue-900 border-2 border-blue-200 dark:border-blue-800 shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-blue-700 dark:text-blue-300">Locations</p>
                    <p className="text-2xl md:text-3xl font-bold text-blue-900 dark:text-blue-100">{activeLocations}</p>
                  </div>
                  <Store className="w-6 h-6 text-blue-600" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950 dark:to-green-900 border-2 border-green-200 dark:border-green-800 shadow-md">
              <CardContent className="p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-green-700 dark:text-green-300">Status</p>
                    <p className="text-lg font-bold text-green-900 dark:text-green-100">Active</p>
                  </div>
                  <CheckCircle className="w-6 h-6 text-green-600" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Organization Details */}
          {loading ? (
            <Card><CardContent className="p-6"><Skeleton className="h-48 w-full" /></CardContent></Card>
          ) : organization ? (
            <Card className="shadow-md">
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-xl">{organization.name}</CardTitle>
                  {organization.legal_name && (
                    <p className="text-sm text-muted-foreground mt-1">{organization.legal_name}</p>
                  )}
                </div>
                <Button size="sm" onClick={() => setIsOrgDialogOpen(true)}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </Button>
              </CardHeader>
              <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {organization.address && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Address</p>
                    <p className="text-sm">{organization.address}</p>
                    <p className="text-sm">{organization.city}, {organization.state} {organization.zip_code}</p>
                  </div>
                )}
                {organization.phone && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Phone</p>
                    <p className="text-sm">{organization.phone}</p>
                  </div>
                )}
                {organization.email && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Email</p>
                    <p className="text-sm">{organization.email}</p>
                  </div>
                )}
                {organization.website && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Website</p>
                    <p className="text-sm">{organization.website}</p>
                  </div>
                )}
                {organization.tax_id && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Tax ID</p>
                    <p className="text-sm">{organization.tax_id}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="shadow-md">
              <CardContent className="py-12 text-center">
                <Building2 className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                <h3 className="text-lg font-medium mb-2">No Organization Created</h3>
                <p className="text-muted-foreground mb-4">Create your organization to get started</p>
                <Button onClick={() => setIsOrgDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Organization
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="locations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold">Business Locations</h2>
            <Button size="sm" onClick={() => { resetLocationForm(); setIsLocationDialogOpen(true); }}>
              <Plus className="w-4 h-4" /> Add Location
            </Button>
          </div>

          {/* Locations Table */}
          <Card className="shadow-md">
            <CardContent className="p-4">
              {locations.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Location Name</TableHead>
                        <TableHead>Address</TableHead>
                        <TableHead className="hidden md:table-cell">Manager</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {locations.map((location) => (
                        <TableRow key={location.id}>
                          <TableCell className="font-medium">{location.name}</TableCell>
                          <TableCell>
                            <div className="text-sm">
                              <div>{location.address}</div>
                              <div className="text-muted-foreground">{location.city}, {location.state}</div>
                            </div>
                          </TableCell>
                          <TableCell className="hidden md:table-cell">
                            {location.manager_name || "—"}
                          </TableCell>
                          <TableCell>
                            <Badge variant={location.is_active ? "default" : "secondary"}>
                              {location.is_active ? "Active" : "Inactive"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingLocation(location);
                                setLocationFormData({
                                  name: location.name,
                                  address: location.address,
                                  city: location.city,
                                  state: location.state || "",
                                  zip_code: location.zip_code || "",
                                  phone: location.phone || "",
                                  manager_name: location.manager_name || "",
                                });
                                setIsLocationDialogOpen(true);
                              }}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                  <h3 className="text-lg font-medium mb-2">No Locations</h3>
                  <p className="text-muted-foreground mb-4">Add your first business location</p>
                  <Button onClick={() => { resetLocationForm(); setIsLocationDialogOpen(true); }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Location
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Organization Dialog */}
      <Dialog open={isOrgDialogOpen} onOpenChange={setIsOrgDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{organization ? "Edit Organization" : "Create Organization"}</DialogTitle>
            <DialogDescription>Enter your organization details</DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="name">Organization Name *</Label>
              <Input
                id="name"
                value={orgFormData.name}
                onChange={(e) => setOrgFormData({ ...orgFormData, name: e.target.value })}
                className={validationErrors.name ? "border-red-500" : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="legal_name">Legal Name</Label>
              <Input
                id="legal_name"
                value={orgFormData.legal_name}
                onChange={(e) => setOrgFormData({ ...orgFormData, legal_name: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tax_id">Tax ID</Label>
              <Input
                id="tax_id"
                value={orgFormData.tax_id}
                onChange={(e) => setOrgFormData({ ...orgFormData, tax_id: e.target.value })}
              />
            </div>
            <div className="space-y-1.5 md:col-span-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={orgFormData.address}
                onChange={(e) => setOrgFormData({ ...orgFormData, address: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={orgFormData.city}
                onChange={(e) => setOrgFormData({ ...orgFormData, city: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={orgFormData.state}
                onChange={(e) => setOrgFormData({ ...orgFormData, state: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={orgFormData.phone}
                onChange={(e) => setOrgFormData({ ...orgFormData, phone: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={orgFormData.email}
                onChange={(e) => setOrgFormData({ ...orgFormData, email: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsOrgDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveOrganization} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Location Dialog */}
      <Dialog open={isLocationDialogOpen} onOpenChange={setIsLocationDialogOpen}>
        <DialogContent className="max-w-[95vw] sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingLocation ? "Edit Location" : "Add Location"}</DialogTitle>
            <DialogDescription>Enter location details</DialogDescription>
          </DialogHeader>
          <div className="space-y-3 mt-4">
            <div className="space-y-1.5">
              <Label htmlFor="location_name">Location Name *</Label>
              <Input
                id="location_name"
                value={locationFormData.name}
                onChange={(e) => setLocationFormData({ ...locationFormData, name: e.target.value })}
                className={validationErrors.name ? "border-red-500" : ""}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location_address">Address *</Label>
              <Input
                id="location_address"
                value={locationFormData.address}
                onChange={(e) => setLocationFormData({ ...locationFormData, address: e.target.value })}
                className={validationErrors.address ? "border-red-500" : ""}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="location_city">City *</Label>
                <Input
                  id="location_city"
                  value={locationFormData.city}
                  onChange={(e) => setLocationFormData({ ...locationFormData, city: e.target.value })}
                  className={validationErrors.city ? "border-red-500" : ""}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="location_state">State</Label>
                <Input
                  id="location_state"
                  value={locationFormData.state}
                  onChange={(e) => setLocationFormData({ ...locationFormData, state: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="location_manager">Manager Name</Label>
              <Input
                id="location_manager"
                value={locationFormData.manager_name}
                onChange={(e) => setLocationFormData({ ...locationFormData, manager_name: e.target.value })}
              />
            </div>
          </div>
          <DialogFooter className="gap-2 mt-6">
            <Button variant="outline" onClick={() => setIsLocationDialogOpen(false)} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button onClick={handleSaveLocation} disabled={isSubmitting}>
              {isSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
