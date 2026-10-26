"use client";

import { useRef, useState } from "react";
import { Camera, KeyRound, Save } from "lucide-react";
import { api, ApiError, upload } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { Avatar, Button, Field, Input, Select, Skeleton, Spinner, Textarea, toast } from "@/components/admin/ui";
import { useForm } from "@/components/admin/page";

const LEVEL_OPTS = ["N5", "N4", "N3", "N2", "N1"].map((l) => ({ value: l, label: l }));

type Profile = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  avatarUrl: string | null;
  role: string;
  level: string | null;
  targetLevel: string | null;
  targetDate: string | null;
  bio: string | null;
};

/** Ảnh đại diện + nút đổi ảnh (upload → WebP 512px). */
export function AvatarUpload({ url, name, onChange, size = 96 }: { url: string | null; name: string; onChange: (url: string) => void; size?: number }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [pct, setPct] = useState(0);
  const pick = async (f: File | undefined) => {
    if (!f) return;
    if (f.size > 8 * 1024 * 1024) return toast.error("Ảnh tối đa 8MB");
    const fd = new FormData();
    fd.append("file", f);
    setBusy(true);
    try {
      const r = await upload<{ url: string }>("/me/avatar", fd, setPct);
      onChange(r.url);
      toast.success("Đã cập nhật ảnh đại diện");
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
      setPct(0);
      if (ref.current) ref.current.value = "";
    }
  };
  return (
    <div className="relative inline-block shrink-0">
      <div className="rounded-full bg-gradient-to-br from-brand-200 via-brand-100 to-white p-1">
        <Avatar src={url} name={name} size={size} className="bg-brand-50 object-cover" />
      </div>
      <button
        type="button"
        onClick={() => ref.current?.click()}
        disabled={busy}
        aria-label="Đổi ảnh đại diện"
        className="absolute bottom-0 right-0 grid size-8 place-items-center rounded-full bg-white text-ink shadow ring-1 ring-ink/10 transition hover:text-brand-500"
      >
        {busy ? <Spinner className="size-4" /> : <Camera className="size-4" />}
      </button>
      {busy && pct > 0 && <span className="absolute inset-x-0 -bottom-5 text-center text-[10px] text-muted">{pct}%</span>}
      <input ref={ref} type="file" accept="image/*" hidden onChange={(e) => pick(e.target.files?.[0])} />
    </div>
  );
}

function ProfileFormInner({ p, learner }: { p: Profile; learner: boolean }) {
  const { refresh } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState(p.avatarUrl);
  const f = useForm({
    name: p.name,
    phone: p.phone ?? "",
    level: p.level ?? "",
    targetLevel: p.targetLevel ?? "",
    targetDate: p.targetDate ?? "",
    bio: p.bio ?? "",
  });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await f.submit((v) =>
        api("/me/profile", {
          method: "PATCH",
          body: learner
            ? { ...v, level: v.level || null, targetLevel: v.targetLevel || null }
            : { name: v.name, phone: v.phone, bio: v.bio },
        }),
      );
      toast.success("Đã lưu hồ sơ");
      invalidate("/me");
      await refresh();
    } catch (err) {
      if (!(err instanceof ApiError && Object.keys(err.fieldErrors).length)) toast.error(err);
    }
  };
  return (
    <form onSubmit={save} className="space-y-5">
      <div className="flex flex-wrap items-center gap-5">
        <AvatarUpload
          url={avatarUrl}
          name={p.name}
          onChange={async (u) => {
            setAvatarUrl(u);
            invalidate("/me");
            await refresh();
          }}
        />
        <div className="min-w-0">
          <p className="text-lg font-bold">{p.name}</p>
          <p className="text-sm text-muted">{p.email}</p>
          <p className="mt-1 text-xs text-muted">Ảnh JPG/PNG/WebP tối đa 8MB — tự động chuyển sang WebP.</p>
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Họ và tên" required error={f.errors.name}>
          <Input value={f.values.name} onChange={f.input("name")} invalid={!!f.errors.name} />
        </Field>
        <Field label="Số điện thoại" error={f.errors.phone}>
          <Input value={f.values.phone} onChange={f.input("phone")} placeholder="0901 234 567" invalid={!!f.errors.phone} />
        </Field>
        {learner && (
          <>
            <Field label="Trình độ hiện tại" error={f.errors.level}>
              <Select value={f.values.level} onChange={f.input("level")} options={LEVEL_OPTS} placeholder="Chưa chọn" />
            </Field>
            <Field label="Mục tiêu JLPT" error={f.errors.targetLevel}>
              <Select value={f.values.targetLevel} onChange={f.input("targetLevel")} options={LEVEL_OPTS} placeholder="Chưa chọn" />
            </Field>
            <Field label="Thời hạn mục tiêu" hint="Định dạng MM/YYYY, vd 12/2026" error={f.errors.targetDate}>
              <Input value={f.values.targetDate} onChange={f.input("targetDate")} placeholder="12/2026" invalid={!!f.errors.targetDate} />
            </Field>
          </>
        )}
        <Field label="Giới thiệu ngắn" className="sm:col-span-2" error={f.errors.bio}>
          <Textarea value={f.values.bio} onChange={f.input("bio")} rows={3} placeholder="Đôi dòng về bạn…" />
        </Field>
      </div>
      <div className="flex justify-end">
        <Button type="submit" loading={f.submitting} icon={<Save className="size-4" />} disabled={!f.dirty}>
          Lưu thay đổi
        </Button>
      </div>
    </form>
  );
}

/** Form hồ sơ cá nhân (dùng ở /tai-khoan và /admin/cai-dat?tab=profile). */
export function ProfileForm({ learner = true }: { learner?: boolean }) {
  const { data, error, reload } = useApi<Profile>("/me/profile");
  if (error && !data)
    return (
      <p className="text-sm text-red-600">
        {error.message}{" "}
        <button className="underline" onClick={() => reload()}>
          Thử lại
        </button>
      </p>
    );
  if (!data)
    return (
      <div className="space-y-4">
        <Skeleton className="size-24 rounded-full" />
        <Skeleton className="h-10" />
        <Skeleton className="h-10" />
      </div>
    );
  return <ProfileFormInner key={data.id} p={data} learner={learner} />;
}

/** Đổi mật khẩu (POST /api/auth/change-password). */
export function PasswordForm() {
  const f = useForm({ current: "", next: "", confirm: "" });
  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (f.values.next.length < 6) return f.setErrors({ next: "Mật khẩu mới tối thiểu 6 ký tự" });
    if (f.values.next !== f.values.confirm) return f.setErrors({ confirm: "Mật khẩu nhập lại không khớp" });
    try {
      await f.submit((v) => api("/auth/change-password", { body: { current: v.current, next: v.next } }));
      toast.success("Đã đổi mật khẩu");
      f.reset({ current: "", next: "", confirm: "" });
    } catch (err) {
      if (err instanceof ApiError && err.status === 400 && !Object.keys(err.fieldErrors).length) f.setErrors({ current: err.message });
      else if (!(err instanceof ApiError && Object.keys(err.fieldErrors).length)) toast.error(err);
    }
  };
  return (
    <form onSubmit={save} className="max-w-md space-y-4">
      <Field label="Mật khẩu hiện tại" required error={f.errors.current}>
        <Input type="password" autoComplete="current-password" value={f.values.current} onChange={f.input("current")} invalid={!!f.errors.current} />
      </Field>
      <Field label="Mật khẩu mới" required hint="Tối thiểu 6 ký tự" error={f.errors.next}>
        <Input type="password" autoComplete="new-password" value={f.values.next} onChange={f.input("next")} invalid={!!f.errors.next} />
      </Field>
      <Field label="Nhập lại mật khẩu mới" required error={f.errors.confirm}>
        <Input type="password" autoComplete="new-password" value={f.values.confirm} onChange={f.input("confirm")} invalid={!!f.errors.confirm} />
      </Field>
      <Button type="submit" loading={f.submitting} icon={<KeyRound className="size-4" />}>
        Đổi mật khẩu
      </Button>
    </form>
  );
}
