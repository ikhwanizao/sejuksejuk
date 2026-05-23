import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { PageHeader } from "@/components/common/PageHeader";
import { KpiFilters } from "./KpiFilters";
import { LeaderboardCard } from "./LeaderboardCard";
import { TechniciansTable } from "./TechniciansTable";
import { useKpiSummary, useKpiTechnicians } from "@/api/kpi";
import { formatMyr, formatDate } from "@/lib/format";
import type { KpiRange } from "@/types/api";

const DEFAULT_RANGE: KpiRange = { period: "week" };

function SummaryCard({
  label,
  value,
  isLoading,
}: {
  label: string;
  value: string;
  isLoading: boolean;
}) {
  return (
    <Card>
      <CardHeader className="pb-1 pt-4">
        <CardTitle className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </CardTitle>
      </CardHeader>
      <CardContent className="pb-4">
        {isLoading ? (
          <Skeleton className="h-7 w-24" />
        ) : (
          <p className="text-2xl font-bold tabular-nums">{value}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default function KpiDashboardPage() {
  const [range, setRange] = useState<KpiRange>(DEFAULT_RANGE);

  const summaryQ = useKpiSummary(range);
  const techQ = useKpiTechnicians(range);

  const activeTechs =
    techQ.data?.technicians.filter((t) => t.jobs_completed > 0).length ?? 0;

  const periodLabel = summaryQ.data
    ? `${formatDate(summaryQ.data.start)} – ${formatDate(summaryQ.data.end)}`
    : "";

  return (
    <div className="space-y-6">
      <PageHeader
        title="Performance"
        description={periodLabel || "Loading period…"}
      />

      <KpiFilters value={range} onChange={setRange} />

      {/* Summary cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <SummaryCard
          label="Jobs Completed"
          value={summaryQ.data ? String(summaryQ.data.total_jobs) : "—"}
          isLoading={summaryQ.isLoading}
        />
        <SummaryCard
          label="Total Revenue"
          value={summaryQ.data ? formatMyr(summaryQ.data.total_amount) : "—"}
          isLoading={summaryQ.isLoading}
        />
        <SummaryCard
          label="Active Technicians"
          value={techQ.isLoading ? "—" : String(activeTechs)}
          isLoading={techQ.isLoading}
        />
      </div>

      {/* Leaderboard + breakdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <LeaderboardCard range={range} />
        <TechniciansTable range={range} />
      </div>
    </div>
  );
}
