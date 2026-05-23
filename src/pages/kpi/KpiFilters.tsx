import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { KpiPeriod, KpiRange } from "@/types/api";

interface KpiFiltersProps {
  value: KpiRange;
  onChange: (range: KpiRange) => void;
}

const PRESET_CHIPS: { label: string; period: KpiPeriod | "custom" }[] = [
  { label: "Last 7 days", period: "today" },
  { label: "This week", period: "week" },
  { label: "This month", period: "month" },
  { label: "Custom", period: "custom" },
];

export function KpiFilters({ value, onChange }: KpiFiltersProps) {
  const [activeChip, setActiveChip] = useState<KpiPeriod | "custom">(
    !value.period ? "custom" : value.period,
  );
  const [customStart, setCustomStart] = useState(value.start ?? "");
  const [customEnd, setCustomEnd] = useState(value.end ?? "");

  function handleChip(period: KpiPeriod | "custom") {
    setActiveChip(period);
    if (period !== "custom") {
      onChange({ period });
    }
  }

  function handleApply() {
    if (!customStart || !customEnd) return;
    onChange({ start: customStart, end: customEnd });
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {PRESET_CHIPS.map(({ label, period }) => (
        <button
          key={period}
          type="button"
          onClick={() => handleChip(period)}
          className={cn(
            "px-3 py-1.5 rounded-full text-sm font-medium border transition-colors",
            activeChip === period
              ? "bg-primary text-primary-foreground border-primary"
              : "bg-background text-muted-foreground border-border hover:border-primary/50 hover:text-foreground",
          )}
        >
          {label}
        </button>
      ))}

      {/* Custom date inputs — always rendered so state doesn't reset */}
      <div
        className={cn(
          "flex items-center gap-2 transition-opacity",
          activeChip !== "custom" &&
            "pointer-events-none opacity-0 select-none",
        )}
      >
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={customStart}
          onChange={(e) => setCustomStart(e.target.value)}
        />
        <span className="text-muted-foreground text-sm">–</span>
        <Input
          type="date"
          className="h-8 w-36 text-sm"
          value={customEnd}
          onChange={(e) => setCustomEnd(e.target.value)}
        />
        <Button
          size="sm"
          disabled={!customStart || !customEnd}
          onClick={handleApply}
        >
          Apply
        </Button>
      </div>
    </div>
  );
}
