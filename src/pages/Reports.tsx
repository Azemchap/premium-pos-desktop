// src/pages/Reports.tsx
import { FileText } from "lucide-react";

export default function Reports() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Reports</h1>
      <div className="text-center py-12">
        <FileText className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">Advanced Reporting Coming Soon</h3>
        <p className="text-muted-foreground">
          Comprehensive analytics and reports will be available in Phase 3
        </p>
      </div>
    </div>
  );
}