
// src/pages/Inventory.tsx
import { Warehouse } from "lucide-react";

export default function Inventory() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Inventory</h1>
      <div className="text-center py-12">
        <Warehouse className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Inventory Management Coming Soon</h3>
        <p className="text-muted-foreground">
          Stock tracking and management will be available in Phase 2
        </p>
      </div>
    </div>
  );
}