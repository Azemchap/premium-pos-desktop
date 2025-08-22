// src/pages/Sales.tsx
import { ShoppingCart } from "lucide-react";

export default function Sales() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Point of Sale</h1>
      <div className="text-center py-12">
        <ShoppingCart className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">POS Terminal Coming Soon</h3>
        <p className="text-muted-foreground">
          Advanced point-of-sale functionality will be available in Phase 2
        </p>
      </div>
    </div>
  );
}