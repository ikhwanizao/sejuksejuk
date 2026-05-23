import { useNavigate } from "react-router";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { useCreateOrder } from "@/api/orders";
import { OrderForm } from "./OrderForm";
import type { OrderFormValues } from "./orderSchema";
import { PageHeader } from "@/components/common/PageHeader";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function NewOrderPage() {
  const navigate = useNavigate();
  const createOrder = useCreateOrder();

  async function handleSubmit(values: OrderFormValues) {
    await createOrder.mutateAsync({
      customer_name: values.customer_name,
      customer_phone: values.customer_phone,
      customer_address: values.customer_address,
      problem_description: values.problem_description,
      service_type_id:
        values.service_type_id && values.service_type_id !== "none"
          ? Number(values.service_type_id)
          : null,
      quoted_price: values.quoted_price,
      admin_notes: values.admin_notes ?? "",
    });
    toast.success("Order created successfully");
    // Navigate to the order list; the created order will appear at top
    navigate("/orders");
  }

  return (
    <div className="max-w-2xl">
      <div className="mb-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 size-4" />
          Back
        </Button>
      </div>
      <PageHeader
        title="New Order"
        description="Create a new service order and optionally assign a technician later."
      />
      <Card>
        <CardContent className="pt-6">
          <OrderForm
            onSubmit={handleSubmit}
            submitLabel="Create Order"
            isSubmitting={createOrder.isPending}
          />
        </CardContent>
      </Card>
    </div>
  );
}
