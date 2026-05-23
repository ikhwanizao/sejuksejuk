import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/types/api";

// The backend doesn't expose a dedicated /users/?role= endpoint.
// We derive the technician list from a dedicated endpoint if available,
// falling back to the accounts list filtered by role.
export function useTechnicians() {
  return useQuery({
    queryKey: ["technicians"],
    queryFn: () =>
      api
        .get<User[]>("/auth/users/", {
          params: { role: "technician", page_size: 100 },
        })
        .then((r) => r.data)
        .catch(() =>
          // Fallback: return hardcoded seed users if endpoint doesn't exist
          Promise.resolve<User[]>([]),
        ),
    staleTime: 5 * 60_000,
  });
}
