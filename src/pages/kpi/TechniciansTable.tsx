import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { formatMyr } from "@/lib/format";
import { useKpiTechnicians } from "@/api/kpi";
import { useAuthStore } from "@/stores/auth";
import { cn } from "@/lib/utils";
import type { KpiRange, KpiTechnicianRow } from "@/types/api";

type SortKey = keyof Pick<
  KpiTechnicianRow,
  "technician_name" | "jobs_completed" | "total_amount" | "reschedule_count"
>;
type SortDir = "asc" | "desc";

function ChevronIcon({ dir }: { dir: SortDir }) {
  return (
    <span
      className={cn(
        "ml-1 inline-block transition-transform text-xs",
        dir === "desc" && "rotate-180",
      )}
    >
      ▲
    </span>
  );
}

interface TechniciansTableProps {
  range: KpiRange;
}

export function TechniciansTable({ range }: TechniciansTableProps) {
  const me = useAuthStore((s) => s.user);
  const { data, isLoading, isError, refetch } = useKpiTechnicians(range);
  const [sortKey, setSortKey] = useState<SortKey>("jobs_completed");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const rows = data?.technicians ?? [];

  const sorted = useMemo(() => {
    return [...rows].sort((a, b) => {
      let av: string | number = a[sortKey];
      let bv: string | number = b[sortKey];
      if (sortKey === "total_amount") {
        av = parseFloat(av as string) || 0;
        bv = parseFloat(bv as string) || 0;
      }
      if (av < bv) return sortDir === "asc" ? -1 : 1;
      if (av > bv) return sortDir === "asc" ? 1 : -1;
      return 0;
    });
  }, [rows, sortKey, sortDir]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortHead({
    colKey,
    children,
    className,
  }: {
    colKey: SortKey;
    children: React.ReactNode;
    className?: string;
  }) {
    return (
      <TableHead
        className={cn(
          "cursor-pointer select-none whitespace-nowrap",
          className,
        )}
        onClick={() => handleSort(colKey)}
      >
        {children}
        {sortKey === colKey && <ChevronIcon dir={sortDir} />}
      </TableHead>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Technician Breakdown</CardTitle>
      </CardHeader>
      <CardContent className="p-0 pb-2">
        {isLoading && (
          <div className="space-y-2 px-6 py-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </div>
        )}

        {isError && (
          <div className="px-6 py-8">
            <EmptyState
              title="Could not load data"
              action={
                <button
                  className="text-xs text-primary underline"
                  onClick={() => refetch()}
                >
                  Retry
                </button>
              }
            />
          </div>
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <div className="px-6 py-8">
            <EmptyState
              title="No technician data"
              description="No completed jobs in this period."
            />
          </div>
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <SortHead colKey="technician_name">Technician</SortHead>
                <SortHead colKey="jobs_completed" className="text-right">
                  Jobs
                </SortHead>
                <SortHead colKey="total_amount" className="text-right">
                  Revenue
                </SortHead>
                <SortHead colKey="reschedule_count" className="text-right">
                  Reschedules
                </SortHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.map((row) => {
                const isMe =
                  me?.role === "technician" && row.technician_id === me.id;
                return (
                  <TableRow
                    key={row.technician_id}
                    className={cn(isMe && "bg-primary/5 font-medium")}
                  >
                    <TableCell className="font-medium">
                      {row.technician_name}
                      {isMe && (
                        <span className="ml-1.5 text-xs text-muted-foreground">
                          (you)
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {row.jobs_completed}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {formatMyr(row.total_amount)}
                    </TableCell>
                    <TableCell
                      className="text-right tabular-nums"
                      title="Number of rescheduled events in the period"
                    >
                      {row.reschedule_count}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
