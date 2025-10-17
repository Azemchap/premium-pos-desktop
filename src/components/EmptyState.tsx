
import { Button } from "./ui/button";
import { Card, CardContent } from "./ui/card";

// src/components/EmptyState.tsx - Consistent empty states
interface EmptyStateProps {
    icon: React.ComponentType<{ className?: string }>;
    title: string;
    description?: string;
    action?: {
        label: string;
        onClick: () => void;
    };
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
    return (
        <Card>
            <CardContent className="flex flex-col items-center justify-center py-12">
                <div className="rounded-full bg-muted p-4 mb-4">
                    <Icon className="h-8 w-8 text-muted-foreground" />
                </div>
                <h3 className="text-lg font-semibold mb-1">{title}</h3>
                {description && (
                    <p className="text-sm text-muted-foreground text-center mb-4">
                        {description}
                    </p>
                )}
                {action && (
                    <Button onClick={action.onClick}>
                        {action.label}
                    </Button>
                )}
            </CardContent>
        </Card>
    );
}


