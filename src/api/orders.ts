import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type {
  Order,
  OrderCreatePayload,
  OrderUpdatePayload,
  Paginated,
  ServiceReportCreatePayload,
} from "@/types/api";

export interface OrderFilters {
  status?: string;
  assigned_technician?: number;
  service_type?: number;
  search?: string;
  ordering?: string;
  created_after?: string;
  created_before?: string;
  page?: number;
}

export function useOrders(filters?: OrderFilters) {
  return useQuery({
    queryKey: ["orders", filters],
    queryFn: () =>
      api
        .get<Paginated<Order>>("/orders/", { params: filters })
        .then((r) => r.data),
    placeholderData: keepPreviousData,
  });
}

export function useOrder(id: number | string | undefined) {
  return useQuery({
    queryKey: ["order", id],
    queryFn: () => api.get<Order>(`/orders/${id}/`).then((r) => r.data),
    enabled: !!id,
  });
}

export function useCreateOrder() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OrderCreatePayload) =>
      api.post<Order>("/orders/", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["orders"] }),
  });
}

export function useUpdateOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: OrderUpdatePayload) =>
      api.patch<Order>(`/orders/${id}/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });
}

export function useAssignOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (technicianId: number) =>
      api
        .post<Order>(`/orders/${id}/assign/`, { technician_id: technicianId })
        .then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });
}

export function useStartOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<Order>(`/orders/${id}/start/`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });
}

export function useCompleteOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ServiceReportCreatePayload) =>
      api.post<Order>(`/orders/${id}/complete/`, data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", id] });
      qc.invalidateQueries({ queryKey: ["report", id] });
      qc.invalidateQueries({ queryKey: ["notifications", id] });
    },
  });
}

export function useReviewOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<Order>(`/orders/${id}/review/`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });
}

export function useCloseOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<Order>(`/orders/${id}/close/`).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", id] });
    },
  });
}
