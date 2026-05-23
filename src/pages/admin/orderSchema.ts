import { z } from "zod";

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
