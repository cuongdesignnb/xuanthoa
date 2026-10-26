"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { api, ApiError, type Paged } from "./api";

/* ------------------------------------------------------------------ */
/* Cache nhỏ dùng chung giữa các component (stale-while-revalidate)   */
/* ------------------------------------------------------------------ */

type Entry = { data?: unknown; error?: ApiError; promise?: Promise<unknown>; at: number };
const cache = new Map<string, Entry>();
const listeners = new Map<string, Set<() => void>>();

function emit(key: string) {
  listeners.get(key)?.forEach((l) => l());
}

function subscribe(key: string, cb: () => void) {
  let set = listeners.get(key);
  if (!set) listeners.set(key, (set = new Set()));
  set.add(cb);
  return () => set!.delete(cb);
}

async function load(key: string, path: string) {
  const prev = cache.get(key);
  if (prev?.promise) return prev.promise;
  const promise = api(path)
    .then((data) => {
      cache.set(key, { data, at: Date.now() });
      emit(key);
      return data;
    })
    .catch((error: ApiError) => {
      cache.set(key, { data: prev?.data, error, at: Date.now() });
      emit(key);
    });
  cache.set(key, { ...prev, promise, at: prev?.at ?? 0 });
  emit(key);
  return promise;
}

/** Xoá cache theo tiền tố đường dẫn (vd sau khi tạo/sửa) và tải lại các hook đang dùng. */
export function invalidate(prefix: string) {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) {
      cache.delete(key);
      if (listeners.get(key)?.size) load(key, key);
    }
  }
}

const EMPTY: Entry = { at: 0 };

/**
 * Tải dữ liệu GET từ API. `path` = null để tạm dừng.
 *   const { data, loading, error, reload, mutate } = useApi<Course[]>("/public/courses?level=N5")
 */
export function useApi<T>(path: string | null, { dedupeMs = 10_000 }: { dedupeMs?: number } = {}) {
  const key = path ?? "";
  const entry = useSyncExternalStore(
    (cb) => (path ? subscribe(key, cb) : () => {}),
    () => (path ? (cache.get(key) ?? EMPTY) : EMPTY),
    () => EMPTY,
  );

  useEffect(() => {
    if (!path) return;
    const e = cache.get(key);
    if (!e || (!e.promise && Date.now() - e.at > dedupeMs)) load(key, path);
  }, [key, path, dedupeMs]);

  const reload = useCallback(() => (path ? (cache.delete(key), load(key, path)) : Promise.resolve()), [key, path]);
  const mutate = useCallback(
    (updater: T | ((prev: T | undefined) => T)) => {
      const prev = cache.get(key)?.data as T | undefined;
      const data = typeof updater === "function" ? (updater as (p: T | undefined) => T)(prev) : updater;
      cache.set(key, { data, at: Date.now() });
      emit(key);
    },
    [key],
  );

  return {
    data: entry.data as T | undefined,
    error: entry.error,
    loading: !!path && entry.data === undefined && !entry.error,
    validating: !!entry.promise,
    reload,
    mutate,
  };
}

/* ------------------------------------------------------------------ */
/* Bảng có phân trang / tìm kiếm / lọc (admin)                         */
/* ------------------------------------------------------------------ */

export type TableState = {
  page: number;
  pageSize: number;
  q: string;
  sort?: string;
  order: "asc" | "desc";
  filters: Record<string, string>;
};

export function useTable<T>(basePath: string, init: Partial<TableState> = {}) {
  const [state, setState] = useState<TableState>({
    page: 1,
    pageSize: 10,
    q: "",
    order: "desc",
    filters: {},
    ...init,
  });
  const debouncedQ = useDebounced(state.q, 300);
  const params = new URLSearchParams();
  params.set("page", String(state.page));
  params.set("pageSize", String(state.pageSize));
  if (debouncedQ) params.set("q", debouncedQ);
  if (state.sort) params.set("sort", state.sort);
  params.set("order", state.order);
  for (const [k, v] of Object.entries(state.filters)) if (v) params.set(k, v);
  const sep = basePath.includes("?") ? "&" : "?";
  const res = useApi<Paged<T>>(`${basePath}${sep}${params.toString()}`, { dedupeMs: 0 });

  return {
    ...res,
    items: res.data?.items ?? [],
    total: res.data?.total ?? 0,
    state,
    setPage: (page: number) => setState((s) => ({ ...s, page })),
    setPageSize: (pageSize: number) => setState((s) => ({ ...s, pageSize, page: 1 })),
    setQ: (q: string) => setState((s) => ({ ...s, q, page: 1 })),
    setSort: (sort: string) =>
      setState((s) => ({ ...s, sort, order: s.sort === sort && s.order === "desc" ? "asc" : "desc" })),
    setFilter: (k: string, v: string) => setState((s) => ({ ...s, filters: { ...s.filters, [k]: v }, page: 1 })),
    resetFilters: () => setState((s) => ({ ...s, filters: {}, q: "", page: 1 })),
  };
}

export function useDebounced<T>(value: T, ms = 300) {
  const [v, setV] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return v;
}

/* ------------------------------------------------------------------ */
/* Gọi API ghi (POST/PATCH/DELETE) với trạng thái loading/lỗi          */
/* ------------------------------------------------------------------ */

export function useMutation<TArgs extends unknown[], TRes>(fn: (...args: TArgs) => Promise<TRes>) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);
  const fnRef = useRef(fn);
  useEffect(() => {
    fnRef.current = fn;
  });
  const run = useCallback(async (...args: TArgs) => {
    setLoading(true);
    setError(null);
    try {
      return await fnRef.current(...args);
    } catch (e) {
      const err = e instanceof ApiError ? e : new ApiError(0, (e as Error).message);
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);
  return { run, loading, error, reset: () => setError(null) };
}
