import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { InAppNotification, Notification } from "@/types/api";

export function useOrderNotifications(orderId: number | string | undefined) {
  return useQuery({
    queryKey: ["notifications", orderId],
    queryFn: () =>
      api
        .get<Notification[]>(`/orders/${orderId}/notifications/`)
        .then((r) => r.data),
    enabled: !!orderId,
  });
}

export function useRegenerateNotifications(orderId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api
        .post<Notification[]>(`/orders/${orderId}/notifications/regenerate/`)
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["notifications", orderId] }),
  });
}

export function useMyNotifications() {
  return useQuery({
    queryKey: ["notifications", "inbox"],
    queryFn: () =>
      api.get<InAppNotification[]>("/notifications/inbox/").then((r) => r.data),
    refetchInterval: 30_000,
  });
}

export function useMarkAllRead() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api
        .post<{ marked_read: number }>("/notifications/inbox/mark-read/")
        .then((r) => r.data),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["notifications", "inbox"] }),
  });
}

export function useClearAllNotifications() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => api.delete("/notifications/inbox/clear/"),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["notifications", "inbox"] }),
  });
}

export function useClearNotification() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => api.delete(`/notifications/inbox/${id}/`),
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["notifications", "inbox"] }),
  });
}
