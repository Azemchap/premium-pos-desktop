// src/pages/Users.tsx
import { Users } from "lucide-react";

export default function UsersPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Users</h1>
      <div className="text-center py-12">
        <Users className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold mb-2">User Management Interface</h3>
        <p className="text-muted-foreground">
          User administration features are being implemented
        </p>
      </div>
    </div>
  );
}