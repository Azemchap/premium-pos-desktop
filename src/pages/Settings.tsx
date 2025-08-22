
// src/pages/Settings.tsx
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { invoke } from "@tauri-apps/api/core";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Settings as SettingsIcon, Save, Loader2 } from "lucide-react";

const storeConfigSchema = z.object({
    name: z.string().min(1, "Store name is required"),
    address: z.string().optional(),
    phone: z.string().optional(),
    email: z.string().email("Invalid email").optional().or(z.literal("")),
    tax_rate: z.number().min(0).max(1),
    currency: z.string().min(1, "Currency is required"),
    timezone: z.string().min(1, "Timezone is required"),
});

type StoreConfigForm = z.infer<typeof storeConfigSchema>;

export default function Settings() {
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState("");

    const {
        register,
        handleSubmit,
        setValue,
        formState: { errors },
    } = useForm<StoreConfigForm>({
        resolver: zodResolver(storeConfigSchema),
        defaultValues: {
            name: "My Store",
            address: "123 Main St",
            phone: "+1-555-0123",
            email: "info@mystore.com",
            tax_rate: 0.08,
            currency: "USD",
            timezone: "America/New_York",
        }
    });

    const loadStoreConfig = async () => {
        try {
            setIsLoading(true);
            const config = await invoke("get_store_config") as any;

            setValue("name", config.name);
            setValue("address", config.address || "");
            setValue("phone", config.phone || "");
            setValue("email", config.email || "");
            setValue("tax_rate", config.tax_rate);
            setValue("currency", config.currency);
            setValue("timezone", config.timezone);
        } catch (err) {
            setMessage("Failed to load store configuration");
        } finally {
            setIsLoading(false);
        }
    };

    const onSubmit = async (data: StoreConfigForm) => {
        try {
            setIsSaving(true);
            setMessage("");

            await invoke("update_store_config", { request: data });
            setMessage("Store configuration updated successfully!");

            setTimeout(() => setMessage(""), 3000);
        } catch (err) {
            setMessage("Failed to update store configuration");
        } finally {
            setIsSaving(false);
        }
    };

    useEffect(() => {
        loadStoreConfig();
    }, []);

    if (isLoading) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-2xl">
            <div className="flex items-center space-x-3">
                <SettingsIcon className="w-8 h-8" />
                <h1 className="text-3xl font-bold">Store Settings</h1>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Store Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                        {message && (
                            <div className={`p-3 text-sm rounded-lg ${message.includes("success")
                                    ? "text-green-600 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800"
                                    : "text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                                }`}>
                                {message}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="name" className="text-sm font-medium">
                                    Store Name *
                                </label>
                                <Input
                                    id="name"
                                    {...register("name")}
                                    disabled={isSaving}
                                />
                                {errors.name && (
                                    <p className="text-sm text-red-600">{errors.name.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="currency" className="text-sm font-medium">
                                    Currency *
                                </label>
                                <Input
                                    id="currency"
                                    {...register("currency")}
                                    disabled={isSaving}
                                />
                                {errors.currency && (
                                    <p className="text-sm text-red-600">{errors.currency.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label htmlFor="address" className="text-sm font-medium">
                                Address
                            </label>
                            <Input
                                id="address"
                                {...register("address")}
                                disabled={isSaving}
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="phone" className="text-sm font-medium">
                                    Phone
                                </label>
                                <Input
                                    id="phone"
                                    {...register("phone")}
                                    disabled={isSaving}
                                />
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="email" className="text-sm font-medium">
                                    Email
                                </label>
                                <Input
                                    id="email"
                                    type="email"
                                    {...register("email")}
                                    disabled={isSaving}
                                />
                                {errors.email && (
                                    <p className="text-sm text-red-600">{errors.email.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label htmlFor="tax_rate" className="text-sm font-medium">
                                    Tax Rate (decimal)
                                </label>
                                <Input
                                    id="tax_rate"
                                    type="number"
                                    step="0.01"
                                    min="0"
                                    max="1"
                                    {...register("tax_rate", { valueAsNumber: true })}
                                    disabled={isSaving}
                                />
                                {errors.tax_rate && (
                                    <p className="text-sm text-red-600">{errors.tax_rate.message}</p>
                                )}
                            </div>

                            <div className="space-y-2">
                                <label htmlFor="timezone" className="text-sm font-medium">
                                    Timezone
                                </label>
                                <Input
                                    id="timezone"
                                    {...register("timezone")}
                                    disabled={isSaving}
                                />
                                {errors.timezone && (
                                    <p className="text-sm text-red-600">{errors.timezone.message}</p>
                                )}
                            </div>
                        </div>

                        <div className="flex justify-end">
                            <Button
                                type="submit"
                                disabled={isSaving}
                                className="min-w-32"
                            >
                                {isSaving ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                        Saving...
                                    </>
                                ) : (
                                    <>
                                        <Save className="w-4 h-4 mr-2" />
                                        Save Changes
                                    </>
                                )}
                            </Button>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>
    );
}