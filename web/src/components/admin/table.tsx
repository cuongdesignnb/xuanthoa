"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { ArrowDown, ArrowUp, ArrowUpDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import { Card, Checkbox, EmptyState, ErrorState, Input, Select, Skeleton, cx, type Option } from "./ui";
import type { useTable } from "@/lib/hooks";

export type Column<T> = {
  key: string;
  header: React.ReactNode;
  /** Nội dung ô; mặc định row[key]. */
  cell?: (row: T, index: number) => React.ReactNode;
  /** Cho phép sắp xếp theo khóa `sortKey ?? key`. */
  sortable?: boolean;
  sortKey?: string;
  className?: string;
  headerClassName?: string;
  /** Ẩn trên màn hình nhỏ. */
  hideOnMobile?: boolean;
};

type TableCtl<T> = ReturnType<typeof useTable<T>>;

/**
 * Bảng dữ liệu admin. Dùng với `useTable(path)`:
 *   const t = useTable<Course>("/admin/courses");
 *   <DataTable table={t} columns={cols} rowKey={(r) => r.id} onRowClick={…} />
 * Hoặc truyền `rows` tĩnh (không phân trang server).
 */
export function DataTable<T>({
  table,
  rows,
  loading,
  columns,
  rowKey,
  onRowClick,
  selectable,
  selected,
  onSelectedChange,
  empty,
  compact,
  className,
}: {
  table?: TableCtl<T>;
  rows?: T[];
  loading?: boolean;
  columns: Column<T>[];
  rowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  selectable?: boolean;
  selected?: string[];
  onSelectedChange?: (ids: string[]) => void;
  empty?: React.ReactNode;
  compact?: boolean;
  className?: string;
}) {
  const data = table ? table.items : (rows ?? []);
  const isLoading = table ? table.loading : loading;
  const sel = new Set(selected ?? []);
  const allSel = data.length > 0 && data.every((r) => sel.has(rowKey(r)));
  const someSel = data.some((r) => sel.has(rowKey(r)));

  const toggleAll = () => {
    const ids = data.map(rowKey);
    onSelectedChange?.(allSel ? (selected ?? []).filter((x) => !ids.includes(x)) : [...new Set([...(selected ?? []), ...ids])]);
  };

  if (table?.error && !table.data) return <ErrorState error={table.error} onRetry={table.reload} />;

  return (
    <div className={cx("overflow-x-auto", className)}>
      <table className="w-full min-w-[640px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr className="text-left text-xs font-semibold text-muted">
            {selectable && (
              <th className="w-10 border-b border-ink/5 bg-ink/[.02] px-3 py-2.5">
                <Checkbox checked={allSel} indeterminate={!allSel && someSel} onChange={toggleAll} />
              </th>
            )}
            {columns.map((c) => {
              const sk = c.sortKey ?? c.key;
              const active = table?.state.sort === sk;
              return (
                <th
                  key={c.key}
                  className={cx(
                    "whitespace-nowrap border-b border-ink/5 bg-ink/[.02] px-3 py-2.5 font-semibold first:rounded-tl-lg last:rounded-tr-lg",
                    c.hideOnMobile && "hidden md:table-cell",
                    c.headerClassName,
                  )}
                >
                  {c.sortable && table ? (
                    <button onClick={() => table.setSort(sk)} className="inline-flex items-center gap-1 hover:text-ink">
                      {c.header}
                      {active ? (
                        table.state.order === "asc" ? (
                          <ArrowUp className="size-3" />
                        ) : (
                          <ArrowDown className="size-3" />
                        )
                      ) : (
                        <ArrowUpDown className="size-3 opacity-40" />
                      )}
                    </button>
                  ) : (
                    c.header
                  )}
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {isLoading && !data.length
            ? Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {selectable && <td className="border-b border-ink/5 px-3 py-3" />}
                  {columns.map((c) => (
                    <td key={c.key} className={cx("border-b border-ink/5 px-3 py-3", c.hideOnMobile && "hidden md:table-cell")}>
                      <Skeleton className="h-4 w-full max-w-[160px]" />
                    </td>
                  ))}
                </tr>
              ))
            : data.map((row, i) => {
                const k = rowKey(row);
                return (
                  <motion.tr
                    key={k}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: Math.min(i * 0.02, 0.2) }}
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    className={cx("group transition-colors hover:bg-brand-50/40", onRowClick && "cursor-pointer", sel.has(k) && "bg-brand-50/60")}
                  >
                    {selectable && (
                      <td className="border-b border-ink/5 px-3" onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={sel.has(k)}
                          onChange={(v) => onSelectedChange?.(v ? [...(selected ?? []), k] : (selected ?? []).filter((x) => x !== k))}
                        />
                      </td>
                    )}
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={cx(
                          "border-b border-ink/5 px-3 align-middle",
                          compact ? "py-2" : "py-3",
                          c.hideOnMobile && "hidden md:table-cell",
                          c.className,
                        )}
                      >
                        {c.cell ? c.cell(row, i) : String((row as Record<string, unknown>)[c.key] ?? "—")}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
        </tbody>
      </table>
      {!isLoading && !data.length && (empty ?? <EmptyState title="Chưa có dữ liệu" description="Thử đổi bộ lọc hoặc tạo mới." />)}
    </div>
  );
}

export function Pagination({ table }: { table: TableCtl<unknown> | TableCtl<never> | { state: { page: number; pageSize: number }; total: number; setPage: (p: number) => void; setPageSize: (n: number) => void } }) {
  const { page, pageSize } = table.state;
  const pages = Math.max(1, Math.ceil(table.total / pageSize));
  const from = table.total ? (page - 1) * pageSize + 1 : 0;
  const to = Math.min(page * pageSize, table.total);
  const nums = Array.from({ length: pages }, (_, i) => i + 1).filter((n) => n === 1 || n === pages || Math.abs(n - page) <= 1);
  return (
    <div className="flex flex-col items-center justify-between gap-3 px-1 pt-3 text-xs text-muted sm:flex-row">
      <div className="flex items-center gap-2">
        Hiển thị {from}–{to} / {table.total.toLocaleString("vi-VN")}
        <Select
          className="w-[86px]"
          value={String(pageSize)}
          onChange={(e) => table.setPageSize(Number(e.target.value))}
          options={[10, 20, 50, 100].map((n) => ({ value: String(n), label: `${n}/trang` }))}
        />
      </div>
      <div className="flex items-center gap-1">
        <button disabled={page <= 1} onClick={() => table.setPage(page - 1)} className="grid size-8 place-items-center rounded-lg hover:bg-ink/5 disabled:opacity-30" aria-label="Trang trước">
          <ChevronLeft className="size-4" />
        </button>
        {nums.map((n, i) => (
          <span key={n} className="flex items-center gap-1">
            {i > 0 && n - nums[i - 1] > 1 && <span className="px-1">…</span>}
            <button
              onClick={() => table.setPage(n)}
              className={cx("grid size-8 place-items-center rounded-lg font-semibold", n === page ? "bg-brand-500 text-white" : "hover:bg-ink/5")}
            >
              {n}
            </button>
          </span>
        ))}
        <button disabled={page >= pages} onClick={() => table.setPage(page + 1)} className="grid size-8 place-items-center rounded-lg hover:bg-ink/5 disabled:opacity-30" aria-label="Trang sau">
          <ChevronRight className="size-4" />
        </button>
      </div>
    </div>
  );
}

/** Thanh tìm kiếm + bộ lọc dạng select phía trên bảng. */
export function TableToolbar({
  table,
  placeholder = "Tìm kiếm…",
  filters = [],
  children,
}: {
  table: { state: { q: string; filters: Record<string, string> }; setQ: (q: string) => void; setFilter: (k: string, v: string) => void; resetFilters: () => void };
  placeholder?: string;
  filters?: { key: string; label: string; options: Option[] }[];
  children?: React.ReactNode;
}) {
  const hasFilter = !!table.state.q || Object.values(table.state.filters).some(Boolean);
  return (
    <div className="flex flex-col gap-2 pb-3 lg:flex-row lg:items-center">
      <div className="relative flex-1 lg:max-w-xs">
        <Input value={table.state.q} onChange={(e) => table.setQ(e.target.value)} placeholder={placeholder} leftIcon={<Search className="size-4" />} />
      </div>
      <div className="no-scrollbar flex gap-2 overflow-x-auto">
        {filters.map((f) => (
          <Select
            key={f.key}
            className="min-w-[150px]"
            value={table.state.filters[f.key] ?? ""}
            onChange={(e) => table.setFilter(f.key, e.target.value)}
            placeholder={f.label}
            options={f.options}
          />
        ))}
        {hasFilter && (
          <button onClick={table.resetFilters} className="inline-flex shrink-0 items-center gap-1 px-2 text-xs font-semibold text-brand-500">
            <X className="size-3.5" /> Xoá lọc
          </button>
        )}
      </div>
      <div className="flex gap-2 lg:ml-auto">{children}</div>
    </div>
  );
}

/** Thanh hành động hàng loạt khi đã chọn dòng. */
export function BulkBar({ count, onClear, children }: { count: number; onClear: () => void; children: React.ReactNode }) {
  if (!count) return null;
  return (
    <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} className="mb-3 flex flex-wrap items-center gap-2 rounded-xl bg-brand-50 px-3 py-2 text-sm">
      <span className="font-semibold text-brand-600">Đã chọn {count}</span>
      <button onClick={onClear} className="text-xs text-muted underline">
        Bỏ chọn
      </button>
      <div className="ml-auto flex gap-2">{children}</div>
    </motion.div>
  );
}

/** Card chứa toolbar + bảng + phân trang (khung chuẩn của mọi trang danh sách). */
export function TableCard<T>(props: {
  table: TableCtl<T>;
  columns: Column<T>[];
  rowKey: (r: T) => string;
  onRowClick?: (r: T) => void;
  placeholder?: string;
  filters?: { key: string; label: string; options: Option[] }[];
  actions?: React.ReactNode;
  selectable?: boolean;
  bulk?: (ids: string[], clear: () => void) => React.ReactNode;
  empty?: React.ReactNode;
}) {
  const [selected, setSelected] = useState<string[]>([]);
  return (
    <Card className="p-4">
      <TableToolbar table={props.table} placeholder={props.placeholder} filters={props.filters}>
        {props.actions}
      </TableToolbar>
      {props.bulk && (
        <BulkBar count={selected.length} onClear={() => setSelected([])}>
          {props.bulk(selected, () => setSelected([]))}
        </BulkBar>
      )}
      <DataTable
        table={props.table}
        columns={props.columns}
        rowKey={props.rowKey}
        onRowClick={props.onRowClick}
        selectable={props.selectable ?? !!props.bulk}
        selected={selected}
        onSelectedChange={setSelected}
        empty={props.empty}
      />
      <Pagination table={props.table as never} />
    </Card>
  );
}
