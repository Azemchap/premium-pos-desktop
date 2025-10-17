import { Skeleton } from "./ui/skeleton";

// src/components/LoadingState.tsx - Loading skeletons
export function LoadingState({ rows = 5 }: { rows?: number }) {
    return (
        <div className="space-y-4">
            {[...Array(rows)].map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
            ))}
        </div>
    );
}