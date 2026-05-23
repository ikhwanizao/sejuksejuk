import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { ServiceAttachment, ServiceReport } from "@/types/api";

export function useReport(orderId: number | string | undefined) {
  return useQuery({
    queryKey: ["report", orderId],
    queryFn: () =>
      api.get<ServiceReport>(`/orders/${orderId}/report/`).then((r) => r.data),
    enabled: !!orderId,
    retry: false,
  });
}

export function useAttachments(reportId: number | undefined) {
  return useQuery({
    queryKey: ["attachments", reportId],
    queryFn: () =>
      api
        .get<ServiceAttachment[]>(`/reports/${reportId}/attachments/`)
        .then((r) => r.data),
    enabled: !!reportId,
  });
}

export function useUploadAttachment(reportId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append("file", file);
      return api
        .post<ServiceAttachment>(`/reports/${reportId}/attachments/`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        })
        .then((r) => r.data);
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["attachments", reportId] }),
  });
}

export function useDeleteAttachment(reportId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (attachmentId: number) =>
      api.delete(`/reports/${reportId}/attachments/${attachmentId}/`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["attachments", reportId] }),
  });
}
