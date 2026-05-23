import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/common/EmptyState";
import { formatMyr } from "@/lib/format";
import { useKpiLeaderboard } from "@/api/kpi";
import type { KpiMetric, KpiRange } from "@/types/api";

const MEDAL: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

interface LeaderboardCardProps {
  range: KpiRange;
}

export function LeaderboardCard({ range }: LeaderboardCardProps) {
  const [metric, setMetric] = useState<KpiMetric>("jobs");
  const { data, isLoading, isError, refetch } = useKpiLeaderboard(
    range,
    metric,
  );

  const rows = data?.leaderboard ?? [];
  const maxValue =
    metric === "jobs"
      ? Math.max(...rows.map((r) => r.jobs_completed), 1)
      : Math.max(...rows.map((r) => parseFloat(r.total_amount) || 0), 1);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-4">
          <CardTitle className="text-base">Leaderboard</CardTitle>
          <Tabs value={metric} onValueChange={(v) => setMetric(v as KpiMetric)}>
            <TabsList className="h-7 text-xs">
              <TabsTrigger value="jobs" className="h-6 px-2.5 text-xs">
                Jobs
              </TabsTrigger>
              <TabsTrigger value="amount" className="h-6 px-2.5 text-xs">
                Revenue
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      </CardHeader>

      <CardContent>
        {isLoading && (
          <div className="space-y-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="size-8 rounded-full" />
                <div className="flex-1 space-y-1.5">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <Skeleton className="h-3.5 w-12" />
              </div>
            ))}
          </div>
        )}

        {isError && (
          <EmptyState
            title="Could not load leaderboard"
            description="Check your connection and try again."
            action={
              <button
                className="text-xs text-primary underline"
                onClick={() => refetch()}
              >
                Retry
              </button>
            }
          />
        )}

        {!isLoading && !isError && rows.length === 0 && (
          <EmptyState
            title="No data for this period"
            description="Complete some jobs to see the leaderboard."
          />
        )}

        {!isLoading && !isError && rows.length > 0 && (
          <ol className="space-y-4">
            {rows.map((row) => {
              const primaryValue =
                metric === "jobs"
                  ? row.jobs_completed
                  : parseFloat(row.total_amount) || 0;
              const barPct = Math.round((primaryValue / maxValue) * 100);

              return (
                <li key={row.technician_id} className="flex items-start gap-3">
                  {/* Rank badge */}
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
                    {MEDAL[row.rank] ?? `#${row.rank}`}
                  </span>

                  {/* Name + bar */}
                  <div className="min-w-0 flex-1 space-y-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-sm font-medium">
                        {row.technician_name}
                      </span>
                      <span className="shrink-0 text-sm font-semibold tabular-nums">
                        {metric === "jobs"
                          ? `${row.jobs_completed} jobs`
                          : formatMyr(row.total_amount)}
                      </span>
                    </div>
                    <Progress value={barPct} className="h-1.5" />
                    {row.reschedule_count > 0 && (
                      <p
                        className="text-xs text-muted-foreground"
                        title="Number of rescheduled events for this technician in the period"
                      >
                        {row.reschedule_count} reschedule
                        {row.reschedule_count !== 1 ? "s" : ""}
                      </p>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </CardContent>
    </Card>
  );
}
