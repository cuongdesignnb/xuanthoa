"use client";

/**
 * Bộ UI cơ bản cho khu admin. Dùng chung ở mọi màn hình:
 * Button, IconButton, Input, Textarea, Select, Switch, Checkbox, Field, Badge, StatusBadge,
 * Card, Tabs, Modal, Drawer, ConfirmDialog (useConfirm), Toaster (toast), Spinner, Skeleton,
 * EmptyState, Avatar, Dropdown, ImageInput, TagInput.
 */

import {
  createContext,
  createElement,
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useId,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, Check, CheckCircle2, ChevronDown, ImagePlus, Info, Loader2, X, XCircle } from "lucide-react";
import { avatar as avatarUrl } from "@/components/ui";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");
export { cx };

/* ------------------------------------------------------------------ */
/* Button                                                              */
/* ------------------------------------------------------------------ */

type BtnVariant = "primary" | "outline" | "ghost" | "soft" | "danger" | "dark";
const BTN: Record<BtnVariant, string> = {
  primary: "bg-brand-500 text-white shadow-md shadow-brand-500/25 hover:bg-brand-600",
  outline: "border border-brand-300 bg-white text-brand-500 hover:bg-brand-50",
  ghost: "text-ink/70 hover:bg-ink/5",
  soft: "bg-brand-50 text-brand-600 hover:bg-brand-100",
  danger: "bg-red-600 text-white hover:bg-red-700",
  dark: "bg-ink text-white hover:bg-ink/90",
};

export const Button = forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: BtnVariant;
    size?: "sm" | "md" | "lg";
    loading?: boolean;
    icon?: React.ReactNode;
  }
>(function Button({ variant = "primary", size = "md", loading, icon, className, children, disabled, ...props }, ref) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cx(
        "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg font-semibold transition active:scale-[.98] disabled:pointer-events-none disabled:opacity-50",
        size === "sm" && "h-8 px-3 text-xs",
        size === "md" && "h-10 px-4 text-sm",
        size === "lg" && "h-12 px-6 text-base",
        BTN[variant],
        className,
      )}
      {...props}
    >
      {loading ? <Loader2 className="size-4 animate-spin" /> : icon}
      {children}
    </button>
  );
});

export function IconButton({
  label,
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      aria-label={label}
      title={label}
      className={cx(
        "grid size-8 shrink-0 place-items-center rounded-lg text-ink/60 transition hover:bg-brand-50 hover:text-brand-500 disabled:opacity-40",
        className,
      )}
      {...props}
    >
      {children}
    </button>
  );
}

/* ------------------------------------------------------------------ */
/* Form controls                                                       */
/* ------------------------------------------------------------------ */

const control =
  "w-full rounded-lg border border-ink/10 bg-white px-3 text-sm outline-none transition placeholder:text-ink/35 focus:border-brand-300 focus:ring-4 focus:ring-brand-100 disabled:bg-ink/[.03]";

export const Input = forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean; leftIcon?: React.ReactNode }>(
  function Input({ className, invalid, leftIcon, ...props }, ref) {
    if (leftIcon)
      return (
        <div className="relative">
          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink/40">{leftIcon}</span>
          <input ref={ref} className={cx(control, "h-10 pl-9", invalid && "border-red-400", className)} {...props} />
        </div>
      );
    return <input ref={ref} className={cx(control, "h-10", invalid && "border-red-400", className)} {...props} />;
  },
);

export const Textarea = forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }>(
  function Textarea({ className, invalid, rows = 4, ...props }, ref) {
    return <textarea ref={ref} rows={rows} className={cx(control, "py-2.5", invalid && "border-red-400", className)} {...props} />;
  },
);

export type Option = { value: string; label: string };

export function Select({
  options,
  placeholder,
  className,
  invalid,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { options: Option[]; placeholder?: string; invalid?: boolean }) {
  return (
    <div className={cx("relative", className)}>
      <select className={cx(control, "h-10 appearance-none pr-9", invalid && "border-red-400")} {...props}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink/40" />
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  disabled,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className={cx("inline-flex cursor-pointer select-none items-center gap-2 text-sm", disabled && "opacity-50")}>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        disabled={disabled}
        onClick={() => onChange(!checked)}
        className={cx("relative h-5 w-9 rounded-full transition", checked ? "bg-brand-500" : "bg-ink/15")}
      >
        <motion.span
          layout
          transition={{ type: "spring", stiffness: 500, damping: 32 }}
          className={cx("absolute top-0.5 size-4 rounded-full bg-white shadow", checked ? "right-0.5" : "left-0.5")}
        />
      </button>
      {label}
    </label>
  );
}

export function Checkbox({
  checked,
  onChange,
  label,
  indeterminate,
  className,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: React.ReactNode;
  indeterminate?: boolean;
  className?: string;
}) {
  return (
    <label className={cx("inline-flex cursor-pointer select-none items-center gap-2 text-sm", className)}>
      <button
        type="button"
        role="checkbox"
        aria-checked={indeterminate ? "mixed" : checked}
        onClick={() => onChange(!checked)}
        className={cx(
          "grid size-[18px] shrink-0 place-items-center rounded-[5px] border transition",
          checked || indeterminate ? "border-brand-500 bg-brand-500 text-white" : "border-ink/20 bg-white",
        )}
      >
        {indeterminate ? <span className="h-0.5 w-2 rounded bg-white" /> : checked && <Check className="size-3" strokeWidth={3.5} />}
      </button>
      {label}
    </label>
  );
}

/** Nhãn + control + lỗi + gợi ý. */
export function Field({
  label,
  error,
  hint,
  required,
  children,
  className,
}: {
  label?: React.ReactNode;
  error?: string;
  hint?: React.ReactNode;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cx("space-y-1.5", className)}>
      {label && (
        <label className="block text-[13px] font-semibold text-ink/80">
          {label}
          {required && <span className="ml-0.5 text-brand-500">*</span>}
        </label>
      )}
      {children}
      {error ? <p className="text-xs text-red-500">{error}</p> : hint ? <p className="text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

/** Nhập danh sách chuỗi (tags, quyền lợi…). Enter để thêm. */
export function TagInput({ value, onChange, placeholder }: { value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    const v = draft.trim();
    if (v && !value.includes(v)) onChange([...value, v]);
    setDraft("");
  };
  return (
    <div className={cx(control, "flex min-h-10 flex-wrap items-center gap-1.5 py-1.5")}>
      {value.map((t) => (
        <span key={t} className="inline-flex items-center gap-1 rounded-md bg-brand-50 px-2 py-0.5 text-xs font-medium text-brand-600">
          {t}
          <button type="button" aria-label={`Bỏ ${t}`} onClick={() => onChange(value.filter((x) => x !== t))}>
            <X className="size-3" />
          </button>
        </span>
      ))}
      <input
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === ",") {
            e.preventDefault();
            add();
          } else if (e.key === "Backspace" && !draft && value.length) onChange(value.slice(0, -1));
        }}
        onBlur={add}
        placeholder={value.length ? "" : placeholder}
        className="min-w-24 flex-1 bg-transparent text-sm outline-none"
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Badge                                                               */
/* ------------------------------------------------------------------ */

export type Tone = "green" | "red" | "amber" | "blue" | "violet" | "gray" | "pink" | "orange";
const TONE: Record<Tone, string> = {
  green: "bg-emerald-50 text-emerald-600",
  red: "bg-red-50 text-red-600",
  amber: "bg-amber-50 text-amber-600",
  blue: "bg-sky-50 text-sky-600",
  violet: "bg-violet-50 text-violet-600",
  gray: "bg-ink/5 text-ink/60",
  pink: "bg-brand-50 text-brand-600",
  orange: "bg-orange-50 text-orange-600",
};

export function Badge({ tone = "gray", dot, children, className }: { tone?: Tone; dot?: boolean; children: React.ReactNode; className?: string }) {
  return (
    <span className={cx("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold", TONE[tone], className)}>
      {dot && <span className="size-1.5 rounded-full bg-current" />}
      {children}
    </span>
  );
}

/** Nhãn trạng thái chuẩn hoá cho các enum của backend. */
export const STATUS: Record<string, { label: string; tone: Tone }> = {
  // publish
  draft: { label: "Bản nháp", tone: "gray" },
  review: { label: "Chờ duyệt", tone: "amber" },
  published: { label: "Đã xuất bản", tone: "green" },
  archived: { label: "Lưu trữ", tone: "gray" },
  // user
  active: { label: "Hoạt động", tone: "green" },
  blocked: { label: "Đã khoá", tone: "red" },
  // orders
  pending: { label: "Chờ thanh toán", tone: "amber" },
  paid: { label: "Đã kích hoạt", tone: "green" },
  refund_requested: { label: "Yêu cầu hoàn tiền", tone: "orange" },
  refunded: { label: "Đã hoàn tiền", tone: "violet" },
  cancelled: { label: "Đã huỷ", tone: "gray" },
  // moderation
  approved: { label: "Đã duyệt", tone: "green" },
  hidden: { label: "Đã ẩn", tone: "gray" },
  // tickets
  open: { label: "Mới", tone: "red" },
  resolved: { label: "Đã xử lý", tone: "green" },
  closed: { label: "Đã đóng", tone: "gray" },
  // video
  processing: { label: "Đang xử lý", tone: "blue" },
  ready: { label: "Sẵn sàng", tone: "green" },
  failed: { label: "Lỗi", tone: "red" },
  // attempts
  in_progress: { label: "Đang làm", tone: "blue" },
  submitted: { label: "Đã nộp", tone: "amber" },
  graded: { label: "Đã chấm", tone: "green" },
};

export function StatusBadge({ status, label }: { status: string; label?: string }) {
  const s = STATUS[status] ?? { label: status, tone: "gray" as Tone };
  return (
    <Badge tone={s.tone} dot>
      {label ?? s.label}
    </Badge>
  );
}

export const LEVEL_BADGE: Record<string, string> = {
  N5: "bg-rose-50 text-rose-500",
  N4: "bg-amber-50 text-amber-600",
  N3: "bg-emerald-50 text-emerald-600",
  N2: "bg-sky-50 text-sky-600",
  N1: "bg-violet-50 text-violet-600",
};

export function Level({ level }: { level?: string | null }) {
  if (!level) return <span className="text-muted">—</span>;
  return <span className={cx("rounded-md px-1.5 py-0.5 text-[11px] font-bold", LEVEL_BADGE[level])}>{level}</span>;
}

/* ------------------------------------------------------------------ */
/* Card, Tabs                                                          */
/* ------------------------------------------------------------------ */

export function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cx("rounded-2xl border border-ink/[.06] bg-white shadow-[0_2px_12px_-6px_rgba(29,29,43,.08)]", className)} {...props} />;
}

/** Khung card có tiêu đề + icon + hành động góc phải ("Xem tất cả"). */
export function Panel({
  title,
  icon,
  action,
  subtitle,
  children,
  className,
  bodyClassName,
}: {
  title: React.ReactNode;
  icon?: React.ReactNode;
  action?: React.ReactNode;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  bodyClassName?: string;
}) {
  return (
    <Card className={cx("flex flex-col", className)}>
      <div className="flex items-start justify-between gap-3 px-5 pt-4">
        <div className="flex min-w-0 items-center gap-2.5">
          {icon && <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-brand-50 text-brand-500">{icon}</span>}
          <div className="min-w-0">
            <h3 className="truncate text-[15px] font-bold">{title}</h3>
            {subtitle && <p className="text-xs text-muted">{subtitle}</p>}
          </div>
        </div>
        {action}
      </div>
      <div className={cx("flex-1 px-5 pb-4 pt-3", bodyClassName)}>{children}</div>
    </Card>
  );
}

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  className,
  size = "md",
}: {
  tabs: { value: T; label: React.ReactNode; count?: number }[];
  value: T;
  onChange: (v: T) => void;
  className?: string;
  size?: "sm" | "md";
}) {
  const id = useId();
  return (
    <div className={cx("no-scrollbar flex gap-1 overflow-x-auto rounded-xl bg-ink/[.04] p-1", className)} role="tablist">
      {tabs.map((t) => (
        <button
          key={t.value}
          role="tab"
          aria-selected={value === t.value}
          onClick={() => onChange(t.value)}
          className={cx(
            "relative flex shrink-0 items-center gap-1.5 rounded-lg font-semibold transition-colors",
            size === "sm" ? "px-3 py-1 text-xs" : "px-4 py-1.5 text-sm",
            value === t.value ? "text-brand-600" : "text-ink/55 hover:text-ink",
          )}
        >
          {value === t.value && (
            <motion.span layoutId={`tab-${id}`} className="absolute inset-0 rounded-lg bg-white shadow-sm" transition={{ type: "spring", stiffness: 500, damping: 35 }} />
          )}
          <span className="relative">{t.label}</span>
          {t.count !== undefined && <span className="relative rounded-full bg-brand-100 px-1.5 text-[10px] text-brand-600">{t.count}</span>}
        </button>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Modal & Drawer                                                      */
/* ------------------------------------------------------------------ */

function useLockScroll(open: boolean, onClose: () => void) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);
}

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
}) {
  useLockScroll(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center p-0 sm:items-center sm:p-4">
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 40, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.97 }}
            transition={{ type: "spring", damping: 28, stiffness: 340 }}
            className={cx(
              "relative flex max-h-[92vh] w-full flex-col overflow-hidden rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl",
              size === "sm" && "sm:max-w-md",
              size === "md" && "sm:max-w-xl",
              size === "lg" && "sm:max-w-3xl",
              size === "xl" && "sm:max-w-5xl",
              size === "full" && "sm:max-w-[min(1400px,96vw)]",
            )}
          >
            {(title || description) && (
              <div className="flex items-start justify-between gap-4 border-b border-ink/5 px-5 py-4">
                <div>
                  {title && <h2 className="text-lg font-bold">{title}</h2>}
                  {description && <p className="mt-0.5 text-sm text-muted">{description}</p>}
                </div>
                <IconButton label="Đóng" onClick={onClose}>
                  <X className="size-4" />
                </IconButton>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-ink/5 bg-ink/[.015] px-5 py-3">{footer}</div>}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: string;
}) {
  useLockScroll(open, onClose);
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-[70]">
          <motion.div className="absolute inset-0 bg-ink/40 backdrop-blur-sm" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose} />
          <motion.aside
            role="dialog"
            aria-modal="true"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 320 }}
            className={cx("absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-2xl", width)}
          >
            <div className="flex items-center justify-between gap-4 border-b border-ink/5 px-5 py-4">
              <h2 className="text-lg font-bold">{title}</h2>
              <IconButton label="Đóng" onClick={onClose}>
                <X className="size-4" />
              </IconButton>
            </div>
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && <div className="flex justify-end gap-2 border-t border-ink/5 px-5 py-3">{footer}</div>}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>
  );
}

/* ------------------------------------------------------------------ */
/* Confirm dialog (Promise)                                            */
/* ------------------------------------------------------------------ */

type ConfirmOpts = { title: string; message?: React.ReactNode; confirmText?: string; danger?: boolean };
const ConfirmCtx = createContext<(o: ConfirmOpts) => Promise<boolean>>(async () => false);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<(ConfirmOpts & { resolve: (v: boolean) => void }) | null>(null);
  const confirm = useCallback((o: ConfirmOpts) => new Promise<boolean>((resolve) => setState({ ...o, resolve })), []);
  const close = (v: boolean) => {
    state?.resolve(v);
    setState(null);
  };
  return (
    <ConfirmCtx.Provider value={confirm}>
      {children}
      <Modal
        open={!!state}
        onClose={() => close(false)}
        size="sm"
        footer={
          <>
            <Button variant="ghost" onClick={() => close(false)}>
              Huỷ
            </Button>
            <Button variant={state?.danger ? "danger" : "primary"} onClick={() => close(true)}>
              {state?.confirmText ?? "Xác nhận"}
            </Button>
          </>
        }
      >
        <div className="flex gap-3 pt-1">
          <span className={cx("grid size-10 shrink-0 place-items-center rounded-full", state?.danger ? "bg-red-50 text-red-600" : "bg-brand-50 text-brand-500")}>
            <AlertTriangle className="size-5" />
          </span>
          <div>
            <p className="font-bold">{state?.title}</p>
            {state?.message && <div className="mt-1 text-sm text-muted">{state.message}</div>}
          </div>
        </div>
      </Modal>
    </ConfirmCtx.Provider>
  );
}

/** const confirm = useConfirm(); if (await confirm({ title: "Xoá?", danger: true })) … */
export const useConfirm = () => useContext(ConfirmCtx);

/* ------------------------------------------------------------------ */
/* Toast                                                               */
/* ------------------------------------------------------------------ */

type ToastItem = { id: number; kind: "success" | "error" | "info"; text: string };
let toasts: ToastItem[] = [];
const toastSubs = new Set<() => void>();
const pushToast = (kind: ToastItem["kind"], text: string) => {
  const id = Date.now() + Math.random();
  toasts = [...toasts, { id, kind, text }];
  toastSubs.forEach((f) => f());
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    toastSubs.forEach((f) => f());
  }, 3800);
};

/** toast.success("Đã lưu") · toast.error(err) */
export const toast = {
  success: (t: string) => pushToast("success", t),
  info: (t: string) => pushToast("info", t),
  error: (e: unknown) => pushToast("error", e instanceof Error ? e.message : String(e)),
};

export function Toaster() {
  const items = useSyncExternalStore(
    (cb) => {
      toastSubs.add(cb);
      return () => toastSubs.delete(cb);
    },
    () => toasts,
    () => toasts,
  );
  return (
    <div className="pointer-events-none fixed bottom-4 right-4 z-[90] flex w-[min(360px,calc(100vw-2rem))] flex-col gap-2">
      <AnimatePresence>
        {items.map((t) => (
          <motion.div
            key={t.id}
            layout
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, x: 40 }}
            className="pointer-events-auto flex items-start gap-2.5 rounded-xl border border-ink/5 bg-white p-3 text-sm shadow-xl"
          >
            {t.kind === "success" ? (
              <CheckCircle2 className="size-5 shrink-0 text-emerald-500" />
            ) : t.kind === "error" ? (
              <XCircle className="size-5 shrink-0 text-red-500" />
            ) : (
              <Info className="size-5 shrink-0 text-sky-500" />
            )}
            <span className="pt-0.5">{t.text}</span>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Loading, empty, avatar                                              */
/* ------------------------------------------------------------------ */

export const Spinner = ({ className }: { className?: string }) => <Loader2 className={cx("size-5 animate-spin text-brand-500", className)} />;

export const Skeleton = ({ className }: { className?: string }) => <div className={cx("animate-pulse rounded-lg bg-ink/[.06]", className)} />;

export function EmptyState({ icon, title, description, action }: { icon?: React.ReactNode; title: string; description?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-12 text-center">
      <div className="mb-3 grid size-14 place-items-center rounded-2xl bg-brand-50 text-2xl text-brand-400">{icon ?? "🌸"}</div>
      <p className="font-bold">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: Error; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 py-10 text-center text-sm">
      <XCircle className="size-8 text-red-400" />
      <p className="font-semibold">{error.message}</p>
      {onRetry && (
        <Button size="sm" variant="outline" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

/** Avatar: ảnh thật nếu có, không thì avatar minh hoạ theo tên. */
export function Avatar({ src, name, size = 32, className }: { src?: string | null; name: string; size?: number; className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src || avatarUrl(name)}
      alt=""
      width={size}
      height={size}
      style={{ width: size, height: size }}
      className={cx("shrink-0 rounded-full bg-brand-50 object-cover ring-2 ring-white", className)}
    />
  );
}

/* ------------------------------------------------------------------ */
/* Dropdown menu                                                       */
/* ------------------------------------------------------------------ */

export function Dropdown({
  trigger,
  items,
  align = "right",
}: {
  trigger: React.ReactNode;
  items: ({ label: React.ReactNode; icon?: React.ReactNode; onClick: () => void; danger?: boolean } | "divider")[];
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <div onClick={() => setOpen((o) => !o)}>{trigger}</div>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className={cx(
              "absolute top-full z-50 mt-1.5 min-w-48 overflow-hidden rounded-xl border border-ink/5 bg-white py-1 shadow-xl",
              align === "right" ? "right-0" : "left-0",
            )}
          >
            {items.map((it, i) =>
              it === "divider" ? (
                <div key={i} className="my-1 h-px bg-ink/5" />
              ) : (
                <button
                  key={i}
                  onClick={() => {
                    setOpen(false);
                    it.onClick();
                  }}
                  className={cx(
                    "flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition hover:bg-brand-50",
                    it.danger && "text-red-600",
                  )}
                >
                  {it.icon}
                  {it.label}
                </button>
              ),
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* ImageInput: chọn ảnh từ Media Library                               */
/* ------------------------------------------------------------------ */

/**
 * Ô chọn ảnh — mở MediaPicker (Media Library, upload tự chuyển WebP).
 * Lưu giá trị là URL ảnh.
 */
export function ImageInput({
  value,
  onChange,
  aspect = "aspect-video",
  folder,
}: {
  value?: string | null;
  onChange: (url: string | null) => void;
  aspect?: string;
  folder?: string;
}) {
  const [open, setOpen] = useState(false);
  const picker = MediaPickerSlot.use();
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cx(
          "group relative grid w-full place-items-center overflow-hidden rounded-xl border-2 border-dashed border-ink/10 bg-ink/[.02] transition hover:border-brand-300",
          aspect,
        )}
      >
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-muted">
            <ImagePlus className="size-6 text-brand-400" />
            Chọn ảnh từ Media Library
          </span>
        )}
        {value && (
          <span className="absolute inset-0 grid place-items-center bg-ink/40 text-xs font-semibold text-white opacity-0 transition group-hover:opacity-100">
            Đổi ảnh
          </span>
        )}
      </button>
      {value && (
        <button type="button" className="mt-1 text-xs text-red-500" onClick={() => onChange(null)}>
          Bỏ ảnh
        </button>
      )}
      {picker &&
        createElement(picker, {
          open,
          onClose: () => setOpen(false),
          folder,
          onSelect: (m: MediaItem) => {
            onChange(m.url);
            setOpen(false);
          },
        })}
    </div>
  );
}

export type MediaItem = {
  id: string;
  url: string;
  filename: string;
  originalName?: string | null;
  mime: string;
  size: number;
  width?: number | null;
  height?: number | null;
  alt?: string | null;
  folder: string;
  createdAt: string;
};

export type MediaPickerProps = {
  open: boolean;
  onClose: () => void;
  onSelect: (m: MediaItem) => void;
  folder?: string;
  accept?: "image" | "file";
};

/** Khe cắm MediaPicker để ui.tsx không phụ thuộc vòng vào module media. */
let pickerImpl: React.ComponentType<MediaPickerProps> | null = null;
export const MediaPickerSlot = {
  register: (c: React.ComponentType<MediaPickerProps>) => {
    pickerImpl = c;
  },
  use: () => pickerImpl,
};
