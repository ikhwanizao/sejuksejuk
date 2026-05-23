import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { User } from "@/types/api";

interface LoginPayload {
  username: string;
  password: string;
}

interface TokenPair {
  access: string;
  refresh: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: (data: LoginPayload) =>
      api.post<TokenPair>("/auth/login/", data).then((r) => r.data),
  });
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: () => api.get<User>("/auth/me/").then((r) => r.data),
    enabled: !!localStorage.getItem("access"),
    staleTime: 5 * 60_000,
  });
}
