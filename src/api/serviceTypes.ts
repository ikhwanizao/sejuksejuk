import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { Paginated, ServiceType } from "@/types/api";

export function useServiceTypes(search?: string) {
  return useQuery({
    queryKey: ["service-types", search],
    queryFn: () =>
      api
        .get<Paginated<ServiceType>>("/service-types/", {
          params: { search, page_size: 100 },
        })
        .then((r) => r.data.results),
    staleTime: 10 * 60_000,
  });
}
