import { MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RecipientType } from "@/types/api";

interface WhatsAppButtonProps {
  deepLinkUrl: string;
  recipientType: RecipientType;
  label?: string;
}

export function WhatsAppButton({
  deepLinkUrl,
  recipientType,
  label,
}: WhatsAppButtonProps) {
  const defaultLabel = label ?? `Message ${recipientType}`;
  return (
    <a href={deepLinkUrl} target="_blank" rel="noopener noreferrer">
      <Button
        variant="outline"
        size="sm"
        className="text-green-700 border-green-300 hover:bg-green-50 hover:text-green-800"
      >
        <MessageCircle className="mr-2 size-4" />
        {defaultLabel}
      </Button>
    </a>
  );
}
