// src/pages/Products.tsx
import { Package } from "lucide-react";

export default function Products() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Products</h1>
      <div className="text-center py-12">
        <Package className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Product Management Coming Soon</h3>
        <p className="text-muted-foreground">
          Product catalog management will be available in Phase 2
        </p>
      </div>
    </div>
  );
}