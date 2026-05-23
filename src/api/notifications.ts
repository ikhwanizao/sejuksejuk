import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Notification } from "@/types/api";

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
