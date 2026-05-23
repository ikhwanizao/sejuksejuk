import { useState } from "react";
import { toast } from "sonner";
import { useAssignOrder } from "@/api/orders";
import { useTechnicians } from "@/api/users";
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
  const { data: technicians, isLoading } = useTechnicians();
  const assign = useAssignOrder(orderId);

  async function handleAssign() {
    if (!selectedId) return;
    try {
      await assign.mutateAsync(Number(selectedId));
      toast.success("Technician assigned");
      onOpenChange(false);
    } catch {
      toast.error("Failed to assign technician");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Assign Technician</DialogTitle>
        </DialogHeader>
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
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleAssign}
            disabled={!selectedId || assign.isPending}
          >
            {assign.isPending ? "Assigning…" : "Assign"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
