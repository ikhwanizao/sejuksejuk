import { mediaUrl } from "@/lib/api";
import { FileText, Film } from "lucide-react";
import type { AttachmentKind } from "@/types/api";

interface FilePreviewProps {
  url: string;
  kind: AttachmentKind;
  className?: string;
}

export function FilePreview({ url, kind, className }: FilePreviewProps) {
  const fullUrl = mediaUrl(url);

  if (kind === "photo") {
    return (
      <a href={fullUrl} target="_blank" rel="noopener noreferrer">
        <img
          src={fullUrl}
          alt="Attachment"
          className={`object-cover rounded-md border ${className ?? "h-24 w-24"}`}
        />
      </a>
    );
  }

  if (kind === "video") {
    return (
      <a
        href={fullUrl}
        target="_blank"
        rel="noopener noreferrer"
        className={`flex flex-col items-center justify-center gap-1 rounded-md border bg-muted text-muted-foreground text-xs ${className ?? "h-24 w-24"}`}
      >
        <Film className="size-6" />
        <span>Video</span>
      </a>
    );
  }

  return (
    <a
      href={fullUrl}
      target="_blank"
      rel="noopener noreferrer"
      className={`flex flex-col items-center justify-center gap-1 rounded-md border bg-muted text-muted-foreground text-xs ${className ?? "h-24 w-24"}`}
    >
      <FileText className="size-6" />
      <span>PDF</span>
    </a>
  );
}
