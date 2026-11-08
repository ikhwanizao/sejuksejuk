import type { ServiceReport } from "@/types/api";

export function completionStep(
  report: Pick<ServiceReport, "attachments"> | null | undefined,
  selectedStep: 2 | 3 | null,
): 1 | 2 | 3 {
  if (!report) return 1;
  if (report.attachments.length === 0) return 2;
  return selectedStep ?? 3;
}
