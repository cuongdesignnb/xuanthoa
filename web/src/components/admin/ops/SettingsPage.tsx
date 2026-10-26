"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Activity, Bot, CheckCircle2, CreditCard, Film, Globe, ImageIcon, KeyRound, Save, Share2, UserRound, XCircle } from "lucide-react";
import { api, ApiError, fmtDate } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { Badge, Button, Card, ErrorState, Field, ImageInput, Input, Select, Skeleton, Switch, Tabs, cx, toast, type Tone } from "@/components/admin/ui";
import { PageHeader, useForm } from "@/components/admin/page";
import { PasswordForm, ProfileForm } from "@/components/account/forms";

type Key = "site" | "social" | "payment" | "ai" | "video" | "media";
type TabKey = "general" | "social" | "payment" | "ai" | "video" | "media" | "services" | "profile";
type AllSettings = Record<Key, Record<string, unknown>>;

const TABS: { value: TabKey; label: string; icon: typeof Globe }[] = [
  { value: "general", label: "Chung", icon: Globe },
  { value: "social", label: "Mạng xã hội", icon: Share2 },
  { value: "payment", label: "Thanh toán", icon: CreditCard },
  { value: "ai", label: "AI", icon: Bot },
  { value: "video", label: "Video", icon: Film },
  { value: "media", label: "Media", icon: ImageIcon },
  { value: "services", label: "Dịch vụ", icon: Activity },
  { value: "profile", label: "Hồ sơ", icon: UserRound },
];

export default function SettingsPage() {
  const params = useSearchParams();
  const router = useRouter();
  const path = usePathname();
  const { can } = useAuth();
  const canRead = can("settings.read");
  const tab = (TABS.find((t) => t.value === params.get("tab"))?.value ?? (canRead ? "general" : "profile")) as TabKey;
  const visible = canRead ? TABS : TABS.filter((t) => t.value === "profile");
  const all = useApi<AllSettings>(canRead ? "/admin/settings" : null);

  return (
    <>
      <PageHeader title="Cài đặt hệ thống" subtitle="Cấu hình website, thanh toán, AI, video, media và hồ sơ của bạn" crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Cài đặt hệ thống" }]} />
      <Tabs
        value={tab}
        onChange={(v) => router.replace(`${path}?tab=${v}`, { scroll: false })}
        className="mb-4 w-fit max-w-full"
        tabs={visible.map((t) => ({
          value: t.value,
          label: (
            <span className="inline-flex items-center gap-1.5">
              <t.icon className="size-4" /> {t.label}
            </span>
          ),
        }))}
      />
      {tab === "profile" ? (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <Card className="p-5">
            <h2 className="mb-4 font-bold">Hồ sơ của tôi</h2>
            <ProfileForm learner={false} />
          </Card>
          <Card className="p-5">
            <h2 className="mb-4 flex items-center gap-2 font-bold">
              <KeyRound className="size-4" /> Đổi mật khẩu
            </h2>
            <PasswordForm />
          </Card>
        </div>
      ) : tab === "services" ? (
        <ServicesTab />
      ) : all.error && !all.data ? (
        <ErrorState error={all.error} onRetry={all.reload} />
      ) : !all.data ? (
        <Skeleton className="h-80" />
      ) : (
        <SettingForm key={tab} tab={tab} value={all.data[tab === "general" ? "site" : (tab as Key)] ?? {}} />
      )}
    </>
  );
}

/* ------------------------------------------------------------------ */

/** Bỏ các trường chỉ đọc do API gắn thêm (trạng thái khóa…). */
const withoutMeta = (v: Record<string, unknown>) => Object.fromEntries(Object.entries(v).filter(([k]) => k !== "keyConfigured" && k !== "ffmpeg"));

function SettingForm({ tab, value }: { tab: TabKey; value: Record<string, unknown> }) {
  const { can } = useAuth();
  const writable = can("settings.write");
  const key: Key = tab === "general" ? "site" : (tab as Key);
  const keyConfigured = !!value.keyConfigured;
  const initial = withoutMeta(value);
  const f = useForm<Record<string, unknown>>(initial);
  const v = f.values;
  const str = (k: string) => (v[k] as string | undefined) ?? "";
  const bool = (k: string) => !!v[k];
  const text = (k: string, label: string, props: { placeholder?: string; hint?: string; type?: string } = {}) => (
    <Field label={label} hint={props.hint} error={f.errors[k]}>
      <Input type={props.type} value={str(k)} onChange={(e) => f.set(k, e.target.value)} placeholder={props.placeholder} disabled={!writable} invalid={!!f.errors[k]} />
    </Field>
  );
  const numIn = (k: string, label: string, hint?: string, suffix?: string) => (
    <Field label={label} hint={hint} error={f.errors[k]}>
      <div className="flex items-center gap-2">
        <Input type="number" value={v[k] === undefined || v[k] === null ? "" : String(v[k])} onChange={(e) => f.set(k, e.target.value === "" ? null : Number(e.target.value))} disabled={!writable} invalid={!!f.errors[k]} />
        {suffix && <span className="shrink-0 text-xs text-muted">{suffix}</span>}
      </div>
    </Field>
  );
  const sw = (k: string, label: string, hint?: string) => (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-ink/5 p-3">
      <div>
        <p className="text-sm font-semibold">{label}</p>
        {hint && <p className="text-xs text-muted">{hint}</p>}
      </div>
      <Switch checked={bool(k)} onChange={(x) => f.set(k, x)} disabled={!writable} />
    </div>
  );

  const save = async () => {
    try {
      const r = await f.submit((body) => api<Record<string, unknown>>(`/admin/settings/${key}`, { method: "PUT", body }));
      toast.success("Đã lưu cài đặt");
      invalidate("/admin/settings");
      invalidate(`/public/settings/${key}`);
      if (r) f.reset(withoutMeta(r));
    } catch (e) {
      if (!(e instanceof ApiError && Object.keys(e.fieldErrors).length)) toast.error(e);
    }
  };

  return (
    <Card className="p-5">
      {tab === "general" && (
        <div className="grid gap-4 md:grid-cols-2">
          {text("name", "Tên website")}
          {text("tagline", "Khẩu hiệu")}
          {text("hotline", "Hotline")}
          {text("email", "Email hỗ trợ", { type: "email" })}
          {text("adminEmail", "Email quản trị", { type: "email", hint: "Nhận cảnh báo hệ thống" })}
          {text("version", "Phiên bản")}
          <div className="md:col-span-2">{text("address", "Địa chỉ")}</div>
          <Field label="Logo">
            <div className="max-w-xs">
              <ImageInput value={str("logoUrl")} onChange={(u) => f.set("logoUrl", u)} aspect="aspect-[3/1]" folder="branding" />
            </div>
          </Field>
          <Field label="Favicon">
            <div className="max-w-[120px]">
              <ImageInput value={str("faviconUrl")} onChange={(u) => f.set("faviconUrl", u)} aspect="aspect-square" folder="branding" />
            </div>
          </Field>
          <div className="md:col-span-2">{sw("maintenance", "Chế độ bảo trì", "Tạm ẩn trang học viên, chỉ nhân sự truy cập được")}</div>
        </div>
      )}
      {tab === "social" && (
        <div className="grid gap-4 md:grid-cols-2">
          {text("facebook", "Facebook", { placeholder: "https://facebook.com/…" })}
          {text("youtube", "YouTube", { placeholder: "https://youtube.com/@…" })}
          {text("tiktok", "TikTok", { placeholder: "https://tiktok.com/@…" })}
          {text("instagram", "Instagram", { placeholder: "https://instagram.com/…" })}
          {text("zalo", "Zalo OA", { placeholder: "https://zalo.me/…" })}
        </div>
      )}
      {tab === "payment" && (
        <div className="space-y-4">
          <div className="grid gap-3 md:grid-cols-3">
            {sw("vnpay", "VNPAY", "Thẻ ATM, QR ngân hàng")}
            {sw("momo", "Ví MoMo", "Thanh toán qua ví điện tử")}
            {sw("bank", "Chuyển khoản", "Xác nhận thủ công")}
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            <Field label="Tiền tệ">
              <Select value={str("currency") || "VND"} onChange={(e) => f.set("currency", e.target.value)} options={[{ value: "VND", label: "VND – Việt Nam đồng" }]} disabled={!writable} />
            </Field>
            {text("bankName", "Ngân hàng nhận chuyển khoản")}
            {text("bankAccount", "Số tài khoản")}
            {text("bankHolder", "Chủ tài khoản")}
          </div>
        </div>
      )}
      {tab === "ai" && (
        <div className="space-y-4">
          <KeyStatus ok={!!keyConfigured} label="Khóa API Anthropic" env="ANTHROPIC_API_KEY" />
          <div className="grid gap-4 md:grid-cols-2">
            {text("model", "Model", { hint: "VD: claude-sonnet-5-5" })}
            {numIn("maxTokens", "Giới hạn token mỗi yêu cầu", undefined, "token")}
          </div>
          <div className="grid gap-3 md:grid-cols-2">
            {sw("gradingEnabled", "Chấm bài tự luận bằng AI", "Tự động chấm và nhận xét câu trả lời viết")}
            {sw("generateEnabled", "Tạo đề bằng AI", "Cho phép biên tập viên sinh đề thi/bài tập")}
          </div>
        </div>
      )}
      {tab === "video" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">{numIn("tokenTtlSec", "Thời hạn token phát video", "Khoá giải mã HLS hết hạn sau khoảng này", "giây")}</div>
          <div className="grid gap-3 md:grid-cols-2">
            {sw("watermark", "Watermark email học viên", "Hiển thị email người xem chạy trên video")}
            {sw("allowDownload", "Cho phép tải video", "Không khuyến nghị — video có thể bị phát tán")}
          </div>
        </div>
      )}
      {tab === "media" && (
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            {numIn("webpQuality", "Chất lượng WebP", "30–100, khuyến nghị 80–85", "%")}
            {numIn("maxWidth", "Chiều rộng tối đa", "Ảnh lớn hơn sẽ được thu nhỏ", "px")}
          </div>
          {sw("deleteOriginal", "Xoá ảnh gốc sau khi chuyển WebP", "Tiết kiệm dung lượng lưu trữ")}
        </div>
      )}
      {writable ? (
        <div className="mt-5 flex justify-end">
          <Button loading={f.submitting} disabled={!f.dirty} onClick={save} icon={<Save className="size-4" />}>
            Lưu cài đặt
          </Button>
        </div>
      ) : (
        <p className="mt-5 text-right text-xs text-muted">Bạn chỉ có quyền xem cài đặt.</p>
      )}
    </Card>
  );
}

function KeyStatus({ ok, label, env }: { ok: boolean; label: string; env: string }) {
  return (
    <div className={cx("flex items-center gap-3 rounded-xl p-3", ok ? "bg-emerald-50" : "bg-amber-50")}>
      {ok ? <CheckCircle2 className="size-5 text-emerald-500" /> : <XCircle className="size-5 text-amber-500" />}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {label}: {ok ? "Đã cấu hình" : "Chưa cấu hình"}
        </p>
        <p className="text-xs text-muted">
          Khóa được đặt bằng biến môi trường <code className="rounded bg-white px-1">{env}</code> trên máy chủ và không bao giờ hiển thị tại đây.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

type Service = { key: string; name: string; uptime: number; status: string; checkedAt: string };
const SVC_STATUS: Record<string, { label: string; tone: Tone }> = {
  ok: { label: "Hoạt động tốt", tone: "green" },
  degraded: { label: "Chậm / suy giảm", tone: "amber" },
  maintenance: { label: "Bảo trì", tone: "blue" },
  down: { label: "Gián đoạn", tone: "red" },
};

function ServicesTab() {
  const { can } = useAuth();
  const writable = can("settings.write");
  const { data, error, reload, mutate } = useApi<{ items: Service[] }>("/admin/services", { dedupeMs: 0 });
  if (error && !data) return <ErrorState error={error} onRetry={reload} />;
  if (!data) return <Skeleton className="h-64" />;
  const update = async (key: string, body: Partial<Service>) => {
    try {
      const s = await api<Service>(`/admin/services/${key}`, { method: "PATCH", body });
      mutate({ items: data.items.map((x) => (x.key === key ? s : x)) });
      invalidate("/admin/dashboard");
      toast.success("Đã cập nhật trạng thái dịch vụ");
    } catch (e) {
      toast.error(e);
    }
  };
  const allOk = data.items.every((s) => s.status === "ok");
  return (
    <Card className="p-5">
      <div className="mb-4 flex items-center justify-between gap-2">
        <div>
          <h2 className="font-bold">Trang trạng thái dịch vụ</h2>
          <p className="text-xs text-muted">Hiển thị ở widget “Tình trạng hệ thống” trên trang tổng quan</p>
        </div>
        <Badge tone={allOk ? "green" : "amber"} dot>
          {allOk ? "Tất cả hoạt động tốt" : "Có dịch vụ cần chú ý"}
        </Badge>
      </div>
      <div className="divide-y divide-ink/5">
        {data.items.map((s) => (
          <div key={s.key} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{s.name}</p>
              <p className="text-xs text-muted">Cập nhật {fmtDate(s.checkedAt, true)}</p>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                step="0.01"
                className="w-24"
                defaultValue={s.uptime}
                disabled={!writable}
                aria-label="Uptime %"
                onBlur={(e) => Number(e.target.value) !== s.uptime && update(s.key, { uptime: Number(e.target.value) })}
              />
              <span className="text-xs text-muted">% uptime</span>
              <Select
                className="w-44"
                value={s.status}
                disabled={!writable}
                onChange={(e) => update(s.key, { status: e.target.value })}
                options={Object.entries(SVC_STATUS).map(([value, x]) => ({ value, label: x.label }))}
              />
              <Badge tone={SVC_STATUS[s.status]?.tone ?? "gray"} dot>
                {SVC_STATUS[s.status]?.label ?? s.status}
              </Badge>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
