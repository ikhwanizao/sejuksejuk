import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationBarProps {
  page: number;
  pageSize?: number;
  count: number;
  onPageChange: (page: number) => void;
}

export function PaginationBar({
  page,
  pageSize = 20,
  count,
  onPageChange,
}: PaginationBarProps) {
  const totalPages = Math.ceil(count / pageSize);
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between gap-2 pt-4">
      <p className="text-sm text-muted-foreground">
        Page {page} of {totalPages} ({count} total)
      </p>
      <div className="flex gap-1">
        <Button
          variant="outline"
          size="icon"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          variant="outline"
          size="icon"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
