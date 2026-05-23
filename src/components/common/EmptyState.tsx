import type { ReactNode } from "react";
import { InboxIcon } from "lucide-react";

interface EmptyStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
}

export function EmptyState({
  title = "No results",
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <InboxIcon className="size-10 text-muted-foreground/50" />
      <p className="font-medium text-sm">{title}</p>
      {description && (
        <p className="text-xs text-muted-foreground">{description}</p>
      )}
      {action}
    </div>
  );
}
