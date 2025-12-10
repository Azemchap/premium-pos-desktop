// src/components/ProductVariantManager.tsx - Optimized Mobile-First Design
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { invoke } from "@tauri-apps/api/core";
import { ChevronRight, Layers, Trash2, Wand2, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

interface VariantType {
  id: number;
  name: string;
  description?: string;
  display_order: number;
  is_active: boolean;
}

interface VariantValue {
  id: number;
  variant_type_id: number;
  value: string;
  code?: string;
  display_order: number;
  hex_color?: string;
  is_active: boolean;
}

export interface VariantCombination {
  sku: string;
  barcode: string;
  variant_name: string;
  cost_price: number;
  selling_price: number;
  wholesale_price: number;
  variant_value_ids: number[];
  values: { type: string; value: string }[];
}

interface ProductVariantManagerProps {
  productName: string;
  baseSku: string;
  baseCostPrice: number;
  baseSellingPrice: number;
  baseWholesalePrice: number;
  onVariantsChange: (variants: VariantCombination[]) => void;
  initialVariants?: VariantCombination[];
}

export default function ProductVariantManager({
  productName,
  baseSku,
  baseCostPrice,
  baseSellingPrice,
  baseWholesalePrice,
  onVariantsChange,
  initialVariants = [],
}: ProductVariantManagerProps) {
  const [variantTypes, setVariantTypes] = useState<VariantType[]>([]);
  const [variantValues, setVariantValues] = useState<VariantValue[]>([]);
  const [selectedTypeIds, setSelectedTypeIds] = useState<number[]>([]);
  const [selectedValueIds, setSelectedValueIds] = useState<Record<number, number[]>>({});
  const [variantCombinations, setVariantCombinations] = useState<VariantCombination[]>(initialVariants);
  const [activeTab, setActiveTab] = useState<string>("setup");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);

  useEffect(() => {
    loadVariantData();
  }, []);

  useEffect(() => {
    onVariantsChange(variantCombinations);
  }, [variantCombinations, onVariantsChange]);

  const loadVariantData = async () => {
    try {
      const [types, values] = await Promise.all([
        invoke<VariantType[]>("get_all_variant_types"),
        invoke<VariantValue[]>("get_all_variant_values"),
      ]);
      setVariantTypes(types.filter((t) => t.is_active));
      setVariantValues(values.filter((v) => v.is_active));
    } catch (error) {
      console.error("Failed to load variant data:", error);
      toast.error("Failed to load variant options");
    }
  };

  const getValuesForType = (typeId: number) => {
    return variantValues.filter((v) => v.variant_type_id === typeId);
  };

  const toggleVariantType = (typeId: number, checked: boolean) => {
    if (checked) {
      setSelectedTypeIds([...selectedTypeIds, typeId]);
      setSelectedValueIds({ ...selectedValueIds, [typeId]: [] });
    } else {
      setSelectedTypeIds(selectedTypeIds.filter((id) => id !== typeId));
      const newSelectedValues = { ...selectedValueIds };
      delete newSelectedValues[typeId];
      setSelectedValueIds(newSelectedValues);
    }
  };

  const toggleVariantValue = (typeId: number, valueId: number, checked: boolean) => {
    const currentValues = selectedValueIds[typeId] || [];
    if (checked) {
      setSelectedValueIds({
        ...selectedValueIds,
        [typeId]: [...currentValues, valueId],
      });
    } else {
      setSelectedValueIds({
        ...selectedValueIds,
        [typeId]: currentValues.filter((id) => id !== valueId),
      });
    }
  };

  const generateVariantCombinations = () => {
    const typeValuePairs: Array<{ typeId: number; values: VariantValue[] }> = [];
    
    selectedTypeIds.forEach((typeId) => {
      const selectedValues = (selectedValueIds[typeId] || [])
        .map((valueId) => variantValues.find((v) => v.id === valueId))
        .filter((v): v is VariantValue => v !== undefined);
      
      if (selectedValues.length > 0) {
        typeValuePairs.push({ typeId, values: selectedValues });
      }
    });

    if (typeValuePairs.length === 0) {
      toast.error("Select at least one variant value");
      return;
    }

    const combinations = cartesianProduct(typeValuePairs.map((pair) => pair.values));

    const newVariants: VariantCombination[] = combinations.map((combo) => {
      const codes = combo.map((v) => v.code || v.value.substring(0, 3).toUpperCase());
      const sku = `${baseSku}-${codes.join("-")}`;

      const typeName = combo.map((v) => {
        const type = variantTypes.find((t) => t.id === v.variant_type_id);
        return `${type?.name}: ${v.value}`;
      }).join(" / ");

      return {
        sku,
        barcode: "",
        variant_name: typeName,
        cost_price: baseCostPrice,
        selling_price: baseSellingPrice,
        wholesale_price: baseWholesalePrice,
        variant_value_ids: combo.map((v) => v.id),
        values: combo.map((v) => {
          const type = variantTypes.find((t) => t.id === v.variant_type_id);
          return { type: type?.name || "", value: v.value };
        }),
      };
    });

    setVariantCombinations(newVariants);
    setActiveTab("variants");
    toast.success(`Generated ${newVariants.length} variants`);
  };

  const cartesianProduct = <T,>(arrays: T[][]): T[][] => {
    if (arrays.length === 0) return [[]];
    if (arrays.length === 1) return arrays[0].map((item) => [item]);
    const [first, ...rest] = arrays;
    const restProduct = cartesianProduct(rest);
    return first.flatMap((item) => restProduct.map((combo) => [item, ...combo]));
  };

  const updateVariant = (index: number, field: keyof VariantCombination, value: string | number) => {
    const updated = [...variantCombinations];
    updated[index] = { ...updated[index], [field]: value };
    setVariantCombinations(updated);
  };

  const removeVariant = (index: number) => {
    setVariantCombinations(variantCombinations.filter((_, i) => i !== index));
    if (editingIndex === index) setEditingIndex(null);
    toast.success("Variant removed");
  };

  const canGenerate = selectedTypeIds.length > 0 && 
    Object.values(selectedValueIds).some((arr) => arr.length > 0);

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-8rem)] min-h-0">
      {/* Header - Fixed */}
      <div className="flex-none px-3 py-2 border-b bg-muted/30">
        <div className="flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary flex-shrink-0" />
          <div className="min-w-0 flex-1">
            <h3 className="text-sm font-semibold truncate">Variant Manager</h3>
            <p className="text-xs text-muted-foreground truncate">{productName}</p>
          </div>
        </div>
      </div>

      {/* Tabs Navigation - Fixed */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="flex flex-col flex-1 min-h-0">
        <TabsList className="w-full flex-none rounded-none border-b h-auto p-0">
          <TabsTrigger 
            value="setup" 
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-11"
          >
            <span className="text-xs sm:text-sm">Setup</span>
            {canGenerate && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                {Object.values(selectedValueIds).reduce((sum, arr) => sum + arr.length, 0)}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger 
            value="variants" 
            className="flex-1 rounded-none data-[state=active]:border-b-2 data-[state=active]:border-primary h-11"
            disabled={variantCombinations.length === 0}
          >
            <span className="text-xs sm:text-sm">Variants</span>
            {variantCombinations.length > 0 && (
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5 text-[10px]">
                {variantCombinations.length}
              </Badge>
            )}
          </TabsTrigger>
        </TabsList>

        {/* Setup Tab */}
        <TabsContent value="setup" className="flex-1 min-h-0 m-0 focus-visible:outline-none">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-4 pb-20">
              {/* Step 1: Variant Types */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
                    1
                  </div>
                  <Label className="text-xs font-semibold">Select Variant Types</Label>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {variantTypes.map((type) => (
                    <label
                      key={type.id}
                      className={`
                        flex items-center gap-2 p-2.5 rounded-lg border-2 cursor-pointer
                        transition-all duration-200 touch-manipulation
                        ${selectedTypeIds.includes(type.id)
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-primary/50'
                        }
                      `}
                    >
                      <Checkbox
                        id={`type-${type.id}`}
                        checked={selectedTypeIds.includes(type.id)}
                        onCheckedChange={(checked) => toggleVariantType(type.id, checked as boolean)}
                        className="flex-shrink-0"
                      />
                      <span className="text-xs font-medium truncate">{type.name}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Step 2: Variant Values */}
              {selectedTypeIds.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-xs font-semibold flex-shrink-0">
                      2
                    </div>
                    <Label className="text-xs font-semibold">Select Values</Label>
                  </div>
                  
                  {selectedTypeIds.map((typeId) => {
                    const type = variantTypes.find((t) => t.id === typeId);
                    const values = getValuesForType(typeId);
                    const selectedCount = (selectedValueIds[typeId] || []).length;
                    
                    return (
                      <div key={typeId} className="space-y-2">
                        <div className="flex items-center justify-between px-1">
                          <span className="text-xs font-medium text-muted-foreground">
                            {type?.name}
                          </span>
                          {selectedCount > 0 && (
                            <Badge variant="secondary" className="h-5 px-1.5 text-[10px]">
                              {selectedCount} selected
                            </Badge>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {values.map((value) => {
                            const isSelected = (selectedValueIds[typeId] || []).includes(value.id);
                            return (
                              <label
                                key={value.id}
                                className={`
                                  flex items-center gap-2 p-2 rounded-lg border-2 cursor-pointer
                                  transition-all duration-200 touch-manipulation min-w-0
                                  ${isSelected
                                    ? 'border-primary bg-primary/5'
                                    : 'border-border hover:border-primary/50'
                                  }
                                `}
                              >
                                <Checkbox
                                  id={`value-${value.id}`}
                                  checked={isSelected}
                                  onCheckedChange={(checked) =>
                                    toggleVariantValue(typeId, value.id, checked as boolean)
                                  }
                                  className="flex-shrink-0"
                                />
                                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                                  {value.hex_color && (
                                    <div
                                      className="w-3 h-3 rounded-sm border flex-shrink-0"
                                      style={{ backgroundColor: value.hex_color }}
                                    />
                                  )}
                                  <span className="text-xs truncate flex-1">{value.value}</span>
                                </div>
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Generate Preview */}
              {canGenerate && (
                <div className="space-y-2 pt-2">
                  <Separator />
                  <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
                    <span>Will generate</span>
                    <Badge variant="outline" className="h-6 px-2">
                      {Object.values(selectedValueIds)
                        .filter(arr => arr.length > 0)
                        .reduce((product, arr) => product * arr.length, 1)} variants
                    </Badge>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          {/* Fixed Generate Button */}
          {canGenerate && (
            <div className="flex-none border-t bg-background p-3">
              <Button 
                onClick={generateVariantCombinations} 
                className="w-full h-11 gap-2 touch-manipulation"
              >
                <Wand2 className="w-4 h-4" />
                <span className="text-sm font-semibold">Generate Variants</span>
                <ChevronRight className="w-4 h-4 ml-auto" />
              </Button>
            </div>
          )}
        </TabsContent>

        {/* Variants Tab */}
        <TabsContent value="variants" className="flex-1 min-h-0 m-0 focus-visible:outline-none">
          <ScrollArea className="h-full">
            <div className="p-3 space-y-2 pb-4">
              {variantCombinations.map((variant, index) => (
                <Card 
                  key={index} 
                  className={`
                    border-2 transition-all duration-200
                    ${editingIndex === index ? 'border-primary' : 'border-border'}
                  `}
                >
                  <CardContent className="p-3 space-y-3">
                    {/* Header */}
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0 space-y-1">
                        <button
                          onClick={() => setEditingIndex(editingIndex === index ? null : index)}
                          className="w-full text-left"
                        >
                          <p className="text-xs font-semibold truncate">{variant.variant_name}</p>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {variant.values.map((v, i) => (
                              <Badge 
                                key={i} 
                                variant="secondary" 
                                className="h-5 px-1.5 text-[10px] font-normal"
                              >
                                {v.value}
                              </Badge>
                            ))}
                          </div>
                        </button>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVariant(index)}
                        className="flex-shrink-0 h-8 w-8 text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>

                    {/* Expandable Details */}
                    {editingIndex === index && (
                      <>
                        <Separator />
                        <div className="space-y-3">
                          {/* SKU & Barcode */}
                          <div className="grid grid-cols-2 gap-2">
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase font-semibold">
                                SKU
                              </Label>
                              <Input
                                value={variant.sku}
                                onChange={(e) => updateVariant(index, "sku", e.target.value)}
                                className="h-9 text-xs font-mono"
                              />
                            </div>
                            <div className="space-y-1">
                              <Label className="text-[10px] text-muted-foreground uppercase font-semibold">
                                Barcode
                              </Label>
                              <Input
                                value={variant.barcode}
                                onChange={(e) => updateVariant(index, "barcode", e.target.value)}
                                placeholder="Optional"
                                className="h-9 text-xs font-mono"
                              />
                            </div>
                          </div>

                          {/* Pricing */}
                          <div className="space-y-2">
                            <Label className="text-[10px] text-muted-foreground uppercase font-semibold">
                              Pricing
                            </Label>
                            <div className="grid grid-cols-3 gap-2">
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Cost</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={variant.cost_price}
                                  onChange={(e) =>
                                    updateVariant(index, "cost_price", parseFloat(e.target.value) || 0)
                                  }
                                  className="h-9 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Sell</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={variant.selling_price}
                                  onChange={(e) =>
                                    updateVariant(index, "selling_price", parseFloat(e.target.value) || 0)
                                  }
                                  className="h-9 text-xs"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[10px] text-muted-foreground">Whole</Label>
                                <Input
                                  type="number"
                                  step="0.01"
                                  value={variant.wholesale_price}
                                  onChange={(e) =>
                                    updateVariant(index, "wholesale_price", parseFloat(e.target.value) || 0)
                                  }
                                  className="h-9 text-xs"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      </>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}