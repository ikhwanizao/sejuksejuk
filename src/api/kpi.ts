import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  KpiRange,
  KpiMetric,
  KpiSummary,
  KpiTechniciansResponse,
  KpiLeaderboardResponse,
} from "@/types/api";

function buildParams(range: KpiRange): Record<string, string> {
  const params: Record<string, string> = {};
  if (range.period) params.period = range.period;
  if (range.start) params.start = range.start;
  if (range.end) params.end = range.end;
  return params;
}

export function useKpiSummary(range: KpiRange) {
  return useQuery({
    queryKey: ["kpi", "summary", range],
    queryFn: () =>
      api
        .get<KpiSummary>("/kpi/summary/", { params: buildParams(range) })
        .then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useKpiTechnicians(range: KpiRange) {
  return useQuery({
    queryKey: ["kpi", "technicians", range],
    queryFn: () =>
      api
        .get<KpiTechniciansResponse>("/kpi/technicians/", {
          params: buildParams(range),
        })
        .then((r) => r.data),
    staleTime: 60_000,
  });
}

export function useKpiLeaderboard(range: KpiRange, metric: KpiMetric) {
  return useQuery({
    queryKey: ["kpi", "leaderboard", range, metric],
    queryFn: () =>
      api
        .get<KpiLeaderboardResponse>("/kpi/leaderboard/", {
          params: { ...buildParams(range), metric },
        })
        .then((r) => r.data),
    staleTime: 60_000,
  });
}
