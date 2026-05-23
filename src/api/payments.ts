import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Payment, PaymentCreatePayload } from "@/types/api";

export function useCreatePayment(reportId: number, orderId: number) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: PaymentCreatePayload) => {
      if (data.receipt_photo) {
        const form = new FormData();
        form.append("amount", data.amount);
        form.append("method", data.method);
        form.append("receipt_photo", data.receipt_photo);
        return api
          .post<Payment>(`/reports/${reportId}/payment/`, form, {
            headers: { "Content-Type": "multipart/form-data" },
          })
          .then((r) => r.data);
      }
      return api
        .post<Payment>(`/reports/${reportId}/payment/`, {
          amount: data.amount,
          method: data.method,
        })
        .then((r) => r.data);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["report", orderId] });
    },
  });
}
