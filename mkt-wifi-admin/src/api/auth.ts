import { useMutation } from "@tanstack/react-query";
import { client } from "./client";
import type { LoginRequest, LoginResponse } from "../types/api";

export function loginRequest(body: LoginRequest) {
  return client.post<LoginResponse>("/api/auth/login", body);
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: (body: LoginRequest) => loginRequest(body),
  });
}

export function useLogoutMutation() {
  return useMutation({
    mutationFn: () => client.post<{ ok: true }>("/api/auth/logout"),
  });
}
