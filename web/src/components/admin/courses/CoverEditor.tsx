"use client";

import { Plus, Trash2 } from "lucide-react";
import { Button, Field, IconButton, Input, Select, Switch, cx } from "@/components/admin/ui";
import { CourseCover } from "@/components/courses/art";
import { COVER_BGS, COVER_DECOS, COVER_TEXT, COVER_TONES, DEFAULT_COVER } from "@/components/courses/cover-presets";
import type { CoverStyle } from "@/components/courses/types";
import { avatar } from "@/components/ui";

/** Trình chỉnh bìa vẽ bằng CSS: dòng chữ, kiểu chữ, hình minh họa, màu nền, nhân vật. */
export default function CoverEditor({ value, onChange, title, level }: { value: CoverStyle | null; onChange: (v: CoverStyle) => void; title: string; level?: string | null }) {
  const v: CoverStyle = value ?? (DEFAULT_COVER as CoverStyle);
  const set = (patch: Partial<CoverStyle>) => onChange({ ...v, ...patch });
  const setLine = (i: number, patch: Partial<CoverStyle["lines"][number]>) => set({ lines: v.lines.map((l, j) => (j === i ? { ...l, ...patch } : l)) });

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
      <div className="space-y-3">
        <Field label="Dòng chữ trên bìa" hint="Tối đa 4 dòng; dòng thứ hai có thể kèm nhãn phụ (VD: JLPT + N3).">
          <div className="space-y-2">
            {v.lines.map((l, i) => (
              <div key={i} className="grid grid-cols-[1fr_1fr_70px_auto] gap-2">
                <Input value={l.t} onChange={(e) => setLine(i, { t: e.target.value })} placeholder="Nội dung" />
                <Select value={l.c} onChange={(e) => setLine(i, { c: e.target.value })} options={COVER_TEXT.some((x) => x.value === l.c) ? COVER_TEXT : [{ value: l.c, label: "Tùy chỉnh" }, ...COVER_TEXT]} />
                <Input value={l.a ?? ""} onChange={(e) => setLine(i, { a: e.target.value || undefined })} placeholder="Nhãn" />
                <IconButton label="Xoá dòng" onClick={() => set({ lines: v.lines.filter((_, j) => j !== i) })} disabled={v.lines.length <= 1}>
                  <Trash2 className="size-4" />
                </IconButton>
              </div>
            ))}
            {v.lines.length < 4 && (
              <Button size="sm" variant="ghost" icon={<Plus className="size-3.5" />} onClick={() => set({ lines: [...v.lines, { t: "", c: COVER_TEXT[16].value }] })}>
                Thêm dòng
              </Button>
            )}
          </div>
        </Field>
        <Field label="Dòng phụ nhỏ (tuỳ chọn)">
          <Input value={v.sub ?? ""} onChange={(e) => set({ sub: e.target.value || undefined })} placeholder="VD: Chiến lược - Bài tập - Đề thi thử" />
        </Field>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Hình minh họa">
            <Select value={v.deco} onChange={(e) => set({ deco: e.target.value })} options={COVER_DECOS} />
          </Field>
          <Field label="Tông màu nền">
            <Select value={v.tone} onChange={(e) => set({ tone: e.target.value })} options={COVER_TONES.some((x) => x.value === v.tone) ? COVER_TONES : [{ value: v.tone, label: "Tùy chỉnh" }, ...COVER_TONES]} />
          </Field>
          <Field label="Nhân vật (seed)" hint="Tên bất kỳ để tạo avatar minh họa.">
            <Input value={v.seed} onChange={(e) => set({ seed: e.target.value })} />
          </Field>
          <Field label="Màu nền nhân vật">
            <div className="flex flex-wrap gap-1.5">
              {COVER_BGS.map((bg) => (
                <button
                  key={bg}
                  type="button"
                  onClick={() => set({ bg })}
                  className={cx("size-7 overflow-hidden rounded-full ring-2 ring-offset-1 transition", v.bg === bg ? "ring-brand-500" : "ring-transparent")}
                  style={{ background: `#${bg}` }}
                  aria-label={`Màu #${bg}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {v.bg === bg && <img src={avatar(v.seed || "Nihongo", bg)} alt="" className="size-full" />}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <Switch checked={!!v.live} onChange={(live) => set({ live })} label="Hiển thị chấm “đang trực tuyến” trên thẻ khóa học" />
      </div>
      <div>
        <p className="mb-1.5 text-[13px] font-semibold text-ink/80">Xem trước</p>
        <div className="group rounded-2xl border border-ink/5 bg-white p-2 shadow-sm">
          <CourseCover course={{ coverStyle: v, title, level }} className="h-36 rounded-xl" />
          <p className="line-clamp-1 px-1 pt-2 text-sm font-bold">{title || "Tên khóa học"}</p>
        </div>
      </div>
    </div>
  );
}
