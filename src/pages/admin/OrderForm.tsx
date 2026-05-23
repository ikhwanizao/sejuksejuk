import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useServiceTypes } from "@/api/serviceTypes";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Order } from "@/types/api";

export const orderSchema = z.object({
  customer_name: z.string().min(1, "Required"),
  customer_phone: z.string().min(1, "Required"),
  customer_address: z.string().min(1, "Required"),
  problem_description: z.string().min(1, "Required"),
  service_type_id: z.string().optional(),
  quoted_price: z.string().min(1, "Required"),
  admin_notes: z.string().optional(),
});

export type OrderFormValues = z.infer<typeof orderSchema>;

interface OrderFormProps {
  defaultValues?: Partial<OrderFormValues>;
  order?: Order;
  onSubmit: (values: OrderFormValues) => Promise<void>;
  submitLabel?: string;
  isSubmitting?: boolean;
}

export function OrderForm({
  defaultValues,
  order,
  onSubmit,
  submitLabel = "Save",
  isSubmitting,
}: OrderFormProps) {
  const { data: serviceTypes } = useServiceTypes();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<OrderFormValues>({
    resolver: zodResolver(orderSchema),
    defaultValues: {
      customer_name: order?.customer_name ?? defaultValues?.customer_name ?? "",
      customer_phone:
        order?.customer_phone ?? defaultValues?.customer_phone ?? "",
      customer_address:
        order?.customer_address ?? defaultValues?.customer_address ?? "",
      problem_description:
        order?.problem_description ?? defaultValues?.problem_description ?? "",
      service_type_id: order?.service_type?.id
        ? String(order.service_type.id)
        : (defaultValues?.service_type_id ?? "none"),
      quoted_price: order?.quoted_price ?? defaultValues?.quoted_price ?? "",
      admin_notes: order?.admin_notes ?? defaultValues?.admin_notes ?? "",
    },
  });

  const watchedServiceTypeId = watch("service_type_id");

  // Auto-fill quoted price from service type default
  useEffect(() => {
    if (!watchedServiceTypeId || !serviceTypes) return;
    const st = serviceTypes.find((s) => String(s.id) === watchedServiceTypeId);
    if (st && !order) {
      setValue("quoted_price", st.default_price);
    }
  }, [watchedServiceTypeId, serviceTypes, setValue, order]);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label htmlFor="customer_name">Customer Name *</Label>
          <Input id="customer_name" {...register("customer_name")} />
          {errors.customer_name && (
            <p className="text-xs text-destructive">
              {errors.customer_name.message}
            </p>
          )}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="customer_phone">Phone *</Label>
          <Input
            id="customer_phone"
            type="tel"
            {...register("customer_phone")}
          />
          {errors.customer_phone && (
            <p className="text-xs text-destructive">
              {errors.customer_phone.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="customer_address">Address *</Label>
        <Textarea
          id="customer_address"
          rows={2}
          {...register("customer_address")}
        />
        {errors.customer_address && (
          <p className="text-xs text-destructive">
            {errors.customer_address.message}
          </p>
        )}
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="problem_description">Problem Description *</Label>
        <Textarea
          id="problem_description"
          rows={3}
          {...register("problem_description")}
        />
        {errors.problem_description && (
          <p className="text-xs text-destructive">
            {errors.problem_description.message}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Service Type</Label>
          <Select
            value={watchedServiceTypeId}
            onValueChange={(v) => setValue("service_type_id", v)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select service…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">None</SelectItem>
              {serviceTypes?.map((st) => (
                <SelectItem key={st.id} value={String(st.id)}>
                  {st.name} — RM {parseFloat(st.default_price).toFixed(2)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="quoted_price">Quoted Price (RM) *</Label>
          <Input
            id="quoted_price"
            type="number"
            step="0.01"
            min="0"
            {...register("quoted_price")}
          />
          {errors.quoted_price && (
            <p className="text-xs text-destructive">
              {errors.quoted_price.message}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="admin_notes">Admin Notes</Label>
        <Textarea id="admin_notes" rows={2} {...register("admin_notes")} />
      </div>

      <Button
        type="submit"
        className="w-full sm:w-auto"
        disabled={isSubmitting}
      >
        {isSubmitting ? "Saving…" : submitLabel}
      </Button>
    </form>
  );
}
