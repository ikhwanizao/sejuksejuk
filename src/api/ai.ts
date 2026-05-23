import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { AiQueryResponse } from "@/types/api";

export function useAiQuery() {
  return useMutation({
    mutationFn: (payload: { question: string; conversation_id?: number }) =>
      api.post<AiQueryResponse>("/ai/query/", payload).then((r) => r.data),
  });
}
