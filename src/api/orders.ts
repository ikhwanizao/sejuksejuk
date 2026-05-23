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
  has_payment?: boolean;
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
  const sid = id != null ? String(id) : undefined;
  return useQuery({
    queryKey: ["order", sid],
    queryFn: () => api.get<Order>(`/orders/${sid}/`).then((r) => r.data),
    enabled: !!sid,
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
    mutationFn: (data: Partial<OrderCreatePayload>) =>
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
    onSuccess: (updatedOrder) => {
      qc.setQueryData(["order", String(id)], updatedOrder);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["order", String(id)] });
    },
  });
}

export function useStartOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<Order>(`/orders/${id}/start/`).then((r) => r.data),
    onSuccess: (updatedOrder) => {
      qc.setQueryData(["order", String(id)], updatedOrder);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useCompleteOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: ServiceReportCreatePayload) =>
      api.post<Order>(`/orders/${id}/complete/`, data).then((r) => r.data),
    onSuccess: (updatedOrder) => {
      qc.setQueryData(["order", String(id)], updatedOrder);
      qc.invalidateQueries({ queryKey: ["orders"] });
      qc.invalidateQueries({ queryKey: ["report", String(id)] });
      qc.invalidateQueries({ queryKey: ["notifications", String(id)] });
    },
  });
}

export function useReviewOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<Order>(`/orders/${id}/review/`).then((r) => r.data),
    onSuccess: (updatedOrder) => {
      qc.setQueryData(["order", String(id)], updatedOrder);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}

export function useCloseOrder(id: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () =>
      api.post<Order>(`/orders/${id}/close/`).then((r) => r.data),
    onSuccess: (updatedOrder) => {
      qc.setQueryData(["order", String(id)], updatedOrder);
      qc.invalidateQueries({ queryKey: ["orders"] });
    },
  });
}
