// src/components/ProductVariantManager.tsx - Variant Management Component
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { invoke } from "@tauri-apps/api/core";
import { Layers, Trash2, Wand2 } from "lucide-react";
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

  useEffect(() => {
    loadVariantData();
  }, []);

  useEffect(() => {
    onVariantsChange(variantCombinations);
  }, [variantCombinations]);

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
      // Clear generated variants when removing a type
      setVariantCombinations([]);
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
    // Get all selected value combinations
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
      toast.error("Please select at least one variant value");
      return;
    }

    // Generate all combinations using cartesian product
    const combinations = cartesianProduct(typeValuePairs.map((pair) => pair.values));

    const newVariants: VariantCombination[] = combinations.map((combo) => {
      // Generate SKU by appending codes
      const codes = combo.map((v) => v.code || v.value.substring(0, 3).toUpperCase());
      const sku = `${baseSku}-${codes.join("-")}`;

      // Generate variant name
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
    toast.success(`Generated ${newVariants.length} variant combinations!`);
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
  };

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="w-5 h-5" />
            Product Variants Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Variant Type Selection */}
          <div>
            <Label className="text-xs sm:text-sm font-semibold mb-2 block">
              Step 1: Select Variant Types
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {variantTypes.map((type) => (
                <div key={type.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={`type-${type.id}`}
                    checked={selectedTypeIds.includes(type.id)}
                    onCheckedChange={(checked) => toggleVariantType(type.id, checked as boolean)}
                  />
                  <Label htmlFor={`type-${type.id}`} className="cursor-pointer text-xs sm:text-sm">
                    {type.name}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          {/* Variant Value Selection per Type */}
          {selectedTypeIds.length > 0 && (
            <div className="space-y-3">
              <Label className="text-xs sm:text-sm font-semibold mb-2 block">
                Step 2: Select Values for Each Type
              </Label>
              {selectedTypeIds.map((typeId) => {
                const type = variantTypes.find((t) => t.id === typeId);
                const values = getValuesForType(typeId);
                return (
                  <div key={typeId} className="border rounded-lg p-3">
                    <Label className="text-xs sm:text-sm font-semibold mb-2 block">
                      {type?.name}
                    </Label>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2">
                      {values.map((value) => (
                        <div key={value.id} className="flex items-center space-x-2 min-w-0">
                          <Checkbox
                            id={`value-${value.id}`}
                            checked={(selectedValueIds[typeId] || []).includes(value.id)}
                            onCheckedChange={(checked) =>
                              toggleVariantValue(typeId, value.id, checked as boolean)
                            }
                          />
                          <Label
                            htmlFor={`value-${value.id}`}
                            className="cursor-pointer flex items-center gap-1.5 text-xs sm:text-sm truncate"
                          >
                            {value.hex_color && (
                              <div
                                className="w-3 h-3 sm:w-4 sm:h-4 rounded border flex-shrink-0"
                                style={{ backgroundColor: value.hex_color }}
                              />
                            )}
                            <span className="truncate">{value.value}</span>
                            {value.code && (
                              <span className="text-[10px] sm:text-xs text-muted-foreground flex-shrink-0">({value.code})</span>
                            )}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Generate Button */}
          {selectedTypeIds.length > 0 && Object.values(selectedValueIds).some((arr) => arr.length > 0) && (
            <div className="flex justify-center pt-2">
              <Button onClick={generateVariantCombinations} size="default" className="gap-2 w-full sm:w-auto">
                <Wand2 className="w-4 h-4" />
                <span className="text-xs sm:text-sm">Generate Variant Combinations</span>
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Variant Grid */}
      {variantCombinations.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <span className="text-sm sm:text-base">Generated Variants ({variantCombinations.length})</span>
              <Badge variant="outline" className="text-xs">{productName}</Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 sm:p-6">
            <div className="overflow-x-auto -mx-0 sm:mx-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[200px]">Variant</TableHead>
                    <TableHead className="min-w-[150px]">SKU</TableHead>
                    <TableHead className="min-w-[150px]">Barcode</TableHead>
                    <TableHead className="min-w-[120px]">Cost Price</TableHead>
                    <TableHead className="min-w-[120px]">Selling Price</TableHead>
                    <TableHead className="min-w-[120px]">Wholesale Price</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {variantCombinations.map((variant, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium text-sm">{variant.variant_name}</p>
                          <div className="flex flex-wrap gap-1">
                            {variant.values.map((v, i) => (
                              <Badge key={i} variant="secondary" className="text-xs">
                                {v.value}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Input
                          value={variant.sku}
                          onChange={(e) => updateVariant(index, "sku", e.target.value)}
                          className="font-mono text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={variant.barcode}
                          onChange={(e) => updateVariant(index, "barcode", e.target.value)}
                          placeholder="Optional"
                          className="font-mono text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={variant.cost_price}
                          onChange={(e) =>
                            updateVariant(index, "cost_price", parseFloat(e.target.value) || 0)
                          }
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={variant.selling_price}
                          onChange={(e) =>
                            updateVariant(index, "selling_price", parseFloat(e.target.value) || 0)
                          }
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          value={variant.wholesale_price}
                          onChange={(e) =>
                            updateVariant(index, "wholesale_price", parseFloat(e.target.value) || 0)
                          }
                          className="text-sm"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeVariant(index)}
                          className="text-destructive"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
