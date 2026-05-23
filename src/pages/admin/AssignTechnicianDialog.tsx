import { useState } from "react";
import { toast } from "sonner";
import { useAssignOrder } from "@/api/orders";
import { useTechnicians } from "@/api/users";
import { api } from "@/lib/api";
import type { Notification } from "@/types/api";
import { WhatsAppButton } from "@/components/common/WhatsAppButton";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface AssignTechnicianDialogProps {
  orderId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentTechnicianId?: number;
}

export function AssignTechnicianDialog({
  orderId,
  open,
  onOpenChange,
  currentTechnicianId,
}: AssignTechnicianDialogProps) {
  const [selectedId, setSelectedId] = useState(
    currentTechnicianId ? String(currentTechnicianId) : "",
  );
  const [technicianNotif, setTechnicianNotif] = useState<Notification | null>(
    null,
  );
  const { data: technicians, isLoading } = useTechnicians();
  const assign = useAssignOrder(orderId);
  const isReassigning = !!currentTechnicianId;

  function handleClose() {
    setTechnicianNotif(null);
    onOpenChange(false);
  }

  async function handleAssign() {
    if (!selectedId) return;
    try {
      await assign.mutateAsync(Number(selectedId));

      // Fetch the freshly created technician notification for the WhatsApp deep-link
      let notif: Notification | null = null;
      try {
        const { data } = await api.get<Notification[]>(
          `/orders/${orderId}/notifications/`,
        );
        notif = data.find((n) => n.recipient_type === "technician") ?? null;
      } catch {
        // non-fatal — notifications are a bonus feature
      }

      if (notif) {
        setTechnicianNotif(notif);
        toast.success(
          isReassigning ? "Technician reassigned" : "Technician assigned",
        );
        // Keep dialog open to show the WhatsApp button
      } else {
        toast.success(
          isReassigning ? "Technician reassigned" : "Technician assigned",
        );
        onOpenChange(false);
      }
    } catch {
      toast.error(
        isReassigning
          ? "Failed to reassign technician"
          : "Failed to assign technician",
      );
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {isReassigning ? "Reassign Technician" : "Assign Technician"}
          </DialogTitle>
        </DialogHeader>

        {technicianNotif ? (
          // Success state — show WhatsApp notification button
          <div className="space-y-3 py-2">
            <p className="text-sm text-muted-foreground">
              Technician assigned. Send them a WhatsApp notification with the
              job details.
            </p>
            <WhatsAppButton
              deepLinkUrl={technicianNotif.deep_link_url}
              recipientType="technician"
              label="Notify Technician via WhatsApp"
            />
          </div>
        ) : (
          <div className="space-y-3 py-2">
            <Label>Select technician</Label>
            {isLoading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : (
              <Select value={selectedId} onValueChange={setSelectedId}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose technician…" />
                </SelectTrigger>
                <SelectContent>
                  {technicians?.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.first_name
                        ? `${t.first_name} ${t.last_name}`
                        : t.username}
                    </SelectItem>
                  ))}
                  {(!technicians || technicians.length === 0) && (
                    <SelectItem value="__empty__" disabled>
                      No technicians available
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            )}
          </div>
        )}

        <DialogFooter>
          {technicianNotif ? (
            <Button onClick={handleClose}>Done</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                onClick={handleAssign}
                disabled={
                  !selectedId ||
                  selectedId === String(currentTechnicianId) ||
                  assign.isPending
                }
              >
                {assign.isPending
                  ? isReassigning
                    ? "Reassigning…"
                    : "Assigning…"
                  : isReassigning
                    ? "Reassign"
                    : "Assign"}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
