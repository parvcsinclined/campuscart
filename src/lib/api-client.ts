// Browser-side fetch wrapper: every call resolves to a typed result, never throws,
// and turns network failures/timeouts into friendly messages.

import type { ErrorCode, FieldErrors } from "./errors";

export type ApiFailure = { ok: false; status: number; code: ErrorCode | "NETWORK"; message: string; fieldErrors?: FieldErrors };
export type ApiResult<T> = { ok: true; status: number; data: T } | ApiFailure;

export async function api<T = unknown>(
  url: string,
  init: { method?: string; body?: unknown; timeoutMs?: number; signal?: AbortSignal } = {},
): Promise<ApiResult<T>> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), init.timeoutMs ?? 15000);
  init.signal?.addEventListener("abort", () => controller.abort());
  try {
    const res = await fetch(url, {
      method: init.method ?? (init.body === undefined ? "GET" : "POST"),
      headers: init.body === undefined ? undefined : { "Content-Type": "application/json" },
      body: init.body === undefined ? undefined : JSON.stringify(init.body),
      signal: controller.signal,
      cache: "no-store",
    });
    const json = await res.json().catch(() => null);
    if (res.ok) return { ok: true, status: res.status, data: json as T };
    const err = json?.error;
    return {
      ok: false,
      status: res.status,
      code: err?.code ?? "INTERNAL",
      message: err?.message ?? "Something went wrong. Please try again.",
      fieldErrors: err?.fieldErrors,
    };
  } catch {
    return {
      ok: false,
      status: 0,
      code: "NETWORK",
      message: controller.signal.aborted
        ? "The request timed out. Check your connection and try again."
        : "Couldn't reach CampusCart. Check your connection and try again.",
    };
  } finally {
    clearTimeout(timer);
  }
}
