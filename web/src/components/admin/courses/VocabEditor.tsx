"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, ClipboardPaste, Pencil, Plus, Trash2, Volume2 } from "lucide-react";
import { Button, Card, Checkbox, EmptyState, Field, IconButton, Input, Modal, Textarea, toast, useConfirm } from "@/components/admin/ui";
import { useForm } from "@/components/admin/page";
import { api } from "@/lib/api";

export type AdminVocab = {
  id: string;
  order: number;
  word: string;
  reading: string | null;
  romaji: string | null;
  pos: string | null;
  meaning: string;
  exampleJa: string | null;
  exampleRomaji: string | null;
  exampleVi: string | null;
};

/** Đọc tiếng Nhật bằng Web Speech API (ja-JP). */
export function speak(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window) || !text) return;
  const s = window.speechSynthesis;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text.replace(/\*/g, ""));
  u.lang = "ja-JP";
  u.rate = 0.9;
  const v = s.getVoices().find((x) => x.lang.toLowerCase().startsWith("ja"));
  if (v) u.voice = v;
  s.speak(u);
}

const EMPTY = { word: "", reading: "", romaji: "", pos: "", meaning: "", exampleJa: "", exampleRomaji: "", exampleVi: "" };

export default function VocabEditor({ lessonId, items, onChange }: { lessonId: string; items: AdminVocab[]; onChange: (v: AdminVocab[]) => void }) {
  const confirm = useConfirm();
  const [edit, setEdit] = useState<AdminVocab | "new" | null>(null);
  const [importing, setImporting] = useState(false);

  const move = async (i: number, dir: -1 | 1) => {
    const list = [...items];
    const j = i + dir;
    if (j < 0 || j >= list.length) return;
    [list[i], list[j]] = [list[j], list[i]];
    onChange(list);
    try {
      await api(`/admin/lessons/${lessonId}/vocab/reorder`, { body: { ids: list.map((v) => v.id) } });
    } catch (e) {
      toast.error(e);
      onChange(items);
    }
  };

  const remove = async (v: AdminVocab) => {
    if (!(await confirm({ title: `Xoá từ “${v.word}”?`, danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/vocab/${v.id}`, { method: "DELETE" });
      onChange(items.filter((x) => x.id !== v.id));
      toast.success("Đã xoá từ vựng");
    } catch (e) {
      toast.error(e);
    }
  };

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="font-bold">Từ vựng ({items.length})</h3>
          <p className="text-xs text-muted">Bọc phần cần nhấn mạnh trong ví dụ bằng dấu sao, VD: ご飯を*食べて*から行きます。</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="ghost" icon={<ClipboardPaste className="size-3.5" />} onClick={() => setImporting(true)}>
            Dán từ bảng tính
          </Button>
          <Button size="sm" variant="soft" icon={<Plus className="size-3.5" />} onClick={() => setEdit("new")}>
            Thêm từ
          </Button>
        </div>
      </div>
      {!items.length ? (
        <EmptyState title="Chưa có từ vựng" description="Thêm từng từ hoặc dán nhanh từ Excel / Google Sheets." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="text-left text-xs text-muted">
                <th className="w-8 py-2">#</th>
                <th className="py-2">Từ</th>
                <th className="py-2">Cách đọc</th>
                <th className="py-2">Loại</th>
                <th className="py-2">Nghĩa</th>
                <th className="py-2">Ví dụ</th>
                <th className="w-40" />
              </tr>
            </thead>
            <tbody className="divide-y divide-ink/5">
              {items.map((v, i) => (
                <tr key={v.id} className="group hover:bg-brand-50/30">
                  <td className="py-2 text-xs text-muted">{i + 1}</td>
                  <td className="py-2 font-jp text-base font-bold">{v.word}</td>
                  <td className="py-2">
                    <span className="block font-jp text-xs">{v.reading}</span>
                    <span className="block text-[11px] text-muted">{v.romaji}</span>
                  </td>
                  <td className="py-2 text-xs text-muted">{v.pos}</td>
                  <td className="py-2">{v.meaning}</td>
                  <td className="max-w-[240px] py-2">
                    <span className="line-clamp-1 font-jp text-xs">{v.exampleJa?.replace(/\*/g, "")}</span>
                    <span className="line-clamp-1 text-[11px] text-muted">{v.exampleVi}</span>
                  </td>
                  <td className="py-2">
                    <div className="flex justify-end">
                      <IconButton label="Nghe" onClick={() => speak(v.reading || v.word)}>
                        <Volume2 className="size-4" />
                      </IconButton>
                      <IconButton label="Lên" onClick={() => move(i, -1)} disabled={i === 0}>
                        <ArrowUp className="size-3.5" />
                      </IconButton>
                      <IconButton label="Xuống" onClick={() => move(i, 1)} disabled={i === items.length - 1}>
                        <ArrowDown className="size-3.5" />
                      </IconButton>
                      <IconButton label="Sửa" onClick={() => setEdit(v)}>
                        <Pencil className="size-4" />
                      </IconButton>
                      <IconButton label="Xoá" onClick={() => remove(v)} className="hover:!text-red-600">
                        <Trash2 className="size-4" />
                      </IconButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <VocabModal
        key={edit === "new" ? "new" : (edit?.id ?? "none")}
        open={!!edit}
        lessonId={lessonId}
        item={edit === "new" ? null : edit}
        onClose={() => setEdit(null)}
        onSaved={(v, isNew) => onChange(isNew ? [...items, v] : items.map((x) => (x.id === v.id ? v : x)))}
      />
      <ImportModal open={importing} lessonId={lessonId} onClose={() => setImporting(false)} onDone={onChange} current={items} />
    </Card>
  );
}

function VocabModal({
  open,
  lessonId,
  item,
  onClose,
  onSaved,
}: {
  open: boolean;
  lessonId: string;
  item: AdminVocab | null;
  onClose: () => void;
  onSaved: (v: AdminVocab, isNew: boolean) => void;
}) {
  const f = useForm(item ? { ...EMPTY, ...Object.fromEntries(Object.entries(item).map(([k, x]) => [k, x ?? ""])) } as typeof EMPTY : EMPTY);
  const save = async (again = false) => {
    try {
      const body = Object.fromEntries(Object.entries(f.values).map(([k, x]) => [k, x || null]));
      const r = await f.submit(() =>
        item ? api<AdminVocab>(`/admin/vocab/${item.id}`, { method: "PATCH", body }) : api<AdminVocab>(`/admin/lessons/${lessonId}/vocab`, { body }),
      );
      if (!r) return;
      onSaved(r, !item);
      toast.success(item ? "Đã cập nhật từ vựng" : "Đã thêm từ vựng");
      if (again) f.reset(EMPTY);
      else onClose();
    } catch (e) {
      toast.error(e);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={item ? "Sửa từ vựng" : "Thêm từ vựng"}
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          {!item && (
            <Button variant="outline" onClick={() => save(true)} loading={f.submitting}>
              Lưu & thêm tiếp
            </Button>
          )}
          <Button onClick={() => save()} loading={f.submitting}>
            Lưu
          </Button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Từ vựng (Kanji/Kana)" required error={f.errors.word}>
          <div className="flex gap-2">
            <Input className="font-jp" value={f.values.word} onChange={f.input("word")} placeholder="食べる" autoFocus />
            <IconButton label="Nghe" onClick={() => speak(f.values.reading || f.values.word)}>
              <Volume2 className="size-4" />
            </IconButton>
          </div>
        </Field>
        <Field label="Cách đọc (Hiragana)">
          <Input className="font-jp" value={f.values.reading} onChange={f.input("reading")} placeholder="たべる" />
        </Field>
        <Field label="Romaji">
          <Input value={f.values.romaji} onChange={f.input("romaji")} placeholder="taberu" />
        </Field>
        <Field label="Loại từ">
          <Input value={f.values.pos} onChange={f.input("pos")} placeholder="động từ (V2)" />
        </Field>
        <Field label="Nghĩa" required error={f.errors.meaning} className="sm:col-span-2">
          <Input value={f.values.meaning} onChange={f.input("meaning")} placeholder="ăn" />
        </Field>
        <Field label="Ví dụ (tiếng Nhật)" className="sm:col-span-2" hint="Bọc phần nhấn mạnh bằng *…*">
          <div className="flex gap-2">
            <Input className="font-jp" value={f.values.exampleJa} onChange={f.input("exampleJa")} placeholder="ご飯を*食べて*から、行きます。" />
            <IconButton label="Nghe ví dụ" onClick={() => speak(f.values.exampleJa)}>
              <Volume2 className="size-4" />
            </IconButton>
          </div>
        </Field>
        <Field label="Ví dụ (romaji)">
          <Input value={f.values.exampleRomaji} onChange={f.input("exampleRomaji")} />
        </Field>
        <Field label="Ví dụ (dịch)">
          <Input value={f.values.exampleVi} onChange={f.input("exampleVi")} />
        </Field>
      </div>
    </Modal>
  );
}

type Preview = { word: string; reading?: string; romaji?: string; pos?: string; meaning: string; exampleJa?: string; exampleVi?: string }[];

function ImportModal({ open, lessonId, onClose, onDone, current }: { open: boolean; lessonId: string; onClose: () => void; onDone: (v: AdminVocab[]) => void; current: AdminVocab[] }) {
  const [text, setText] = useState("");
  const [replace, setReplace] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const check = async () => {
    setBusy(true);
    setErr(null);
    try {
      const r = await api<{ preview: Preview }>(`/admin/lessons/${lessonId}/vocab/import`, { body: { text, dryRun: true } });
      setPreview(r.preview);
    } catch (e) {
      setErr((e as Error).message);
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };
  const run = async () => {
    setBusy(true);
    try {
      const r = await api<{ count: number; items: AdminVocab[] }>(`/admin/lessons/${lessonId}/vocab/import`, { body: { text, replace } });
      onDone(replace ? r.items : [...current, ...r.items]);
      toast.success(`Đã nhập ${r.count} từ vựng`);
      setText("");
      setPreview(null);
      onClose();
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      open={open}
      onClose={onClose}
      size="xl"
      title="Nhập từ vựng hàng loạt"
      description="Dán dữ liệu từ Excel/Google Sheets (TSV) hoặc CSV. Dòng đầu có thể là tiêu đề: word, reading, romaji, pos, meaning, exampleJa, exampleRomaji, exampleVi (hoặc tiếng Việt: Từ, Cách đọc, Loại từ, Nghĩa, Ví dụ…). Không có tiêu đề: 3 cột = từ / cách đọc / nghĩa."
      footer={
        <>
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button variant="outline" onClick={check} loading={busy && !preview} disabled={!text.trim()}>
            Xem trước
          </Button>
          <Button onClick={run} loading={busy && !!preview} disabled={!preview?.length}>
            Nhập {preview?.length ?? 0} từ
          </Button>
        </>
      }
    >
      <div className="space-y-3">
        <Textarea
          rows={8}
          className="font-mono text-xs"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setPreview(null);
          }}
          placeholder={"word\treading\tromaji\tpos\tmeaning\n食べる\tたべる\ttaberu\tđộng từ (V2)\tăn"}
        />
        <Checkbox checked={replace} onChange={setReplace} label={`Thay thế toàn bộ ${current.length} từ hiện có`} />
        {err && <p className="text-sm text-red-500">{err}</p>}
        {preview && (
          <div className="max-h-64 overflow-auto rounded-lg border border-ink/10">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-ink/[.03] text-left text-muted">
                <tr>
                  <th className="px-2 py-1.5">Từ</th>
                  <th className="px-2 py-1.5">Cách đọc</th>
                  <th className="px-2 py-1.5">Loại</th>
                  <th className="px-2 py-1.5">Nghĩa</th>
                  <th className="px-2 py-1.5">Ví dụ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-ink/5">
                {preview.map((r, i) => (
                  <tr key={i}>
                    <td className="px-2 py-1.5 font-jp font-bold">{r.word}</td>
                    <td className="px-2 py-1.5 font-jp">{r.reading}</td>
                    <td className="px-2 py-1.5">{r.pos}</td>
                    <td className="px-2 py-1.5">{r.meaning}</td>
                    <td className="px-2 py-1.5 font-jp">{r.exampleJa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Modal>
  );
}
