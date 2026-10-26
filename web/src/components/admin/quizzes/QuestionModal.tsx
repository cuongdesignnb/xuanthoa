"use client";

import { useState } from "react";
import { Plus, Sparkles, Trash2 } from "lucide-react";
import { Button, Field, IconButton, Input, Modal, Select, Textarea, cx, toast } from "@/components/admin/ui";
import RichTextEditor from "@/components/admin/editor/RichTextEditor";
import { api, ApiError } from "@/lib/api";
import { QTYPE_OPTIONS, QuestionPreview, SpeakButton, emptyQuestion, type QType, type QuestionInput } from "./shared";

const KEYS = ["A", "B", "C", "D", "E", "F"];

/**
 * Soạn 1 câu hỏi: loại câu, nội dung (furigana), lựa chọn + đáp án đúng, gợi ý, giải thích, audio — kèm xem trước trực tiếp.
 * `onSubmit` nhận dữ liệu đã chuẩn hoá (API hoặc lưu tạm ở bản nháp AI).
 */
export default function QuestionModal({
  open,
  onClose,
  initial,
  title,
  level,
  questionId,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  initial: QuestionInput | null;
  title?: string;
  level: string;
  questionId?: string;
  onSubmit: (q: QuestionInput) => Promise<unknown> | void;
}) {
  return (
    <Modal open={open} onClose={onClose} size="full" title={title ?? "Câu hỏi"} description="Nội dung hỗ trợ furigana (<ruby>) và chỗ trống ＿＿＿.">
      {open && <Form key={questionId ?? JSON.stringify(initial?.prompt ?? "")} initial={initial ?? emptyQuestion()} level={level} questionId={questionId} onSubmit={onSubmit} onClose={onClose} />}
    </Modal>
  );
}

function Form({
  initial,
  level,
  questionId,
  onSubmit,
  onClose,
}: {
  initial: QuestionInput;
  level: string;
  questionId?: string;
  onSubmit: (q: QuestionInput) => Promise<unknown> | void;
  onClose: () => void;
}) {
  const [q, setQ] = useState<QuestionInput>(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [explaining, setExplaining] = useState(false);
  const set = <K extends keyof QuestionInput>(k: K, v: QuestionInput[K]) => setQ((s) => ({ ...s, [k]: v }));
  const setHint = (k: keyof QuestionInput["hint"], v: string) => setQ((s) => ({ ...s, hint: { ...s.hint, [k]: v } }));

  const changeType = (t: QType) =>
    setQ((s) => ({
      ...s,
      type: t,
      options: t === "mcq" ? (s.options.length ? s.options : emptyQuestion().options) : s.options,
      answer: t === "mcq" ? (s.options.some((o) => o.key === s.answer) ? s.answer : "A") : s.type === "mcq" ? "" : s.answer,
      points: t === "essay" ? Math.max(3, s.points) : t === "short" ? Math.max(1, s.points) : s.points,
    }));

  const setOpt = (i: number, text: string) => setQ((s) => ({ ...s, options: s.options.map((o, j) => (j === i ? { ...o, text } : o)) }));
  const addOpt = () => setQ((s) => ({ ...s, options: [...s.options, { key: KEYS[s.options.length], text: "" }] }));
  const removeOpt = (i: number) =>
    setQ((s) => {
      const options = s.options.filter((_, j) => j !== i).map((o, j) => ({ ...o, key: KEYS[j] }));
      const oldIdx = s.options.findIndex((o) => o.key === s.answer);
      const answer = oldIdx === i ? "A" : options[oldIdx > i ? oldIdx - 1 : oldIdx]?.key ?? "A";
      return { ...s, options, answer };
    });

  const validate = () => {
    const e: Record<string, string> = {};
    const plain = q.prompt.replace(/<[^>]+>/g, "").trim();
    if (!plain) e.prompt = "Nhập nội dung câu hỏi";
    if (q.type === "mcq") {
      if (q.options.length < 2) e.options = "Cần ít nhất 2 lựa chọn";
      else if (q.options.some((o) => !o.text.trim())) e.options = "Điền đủ nội dung các lựa chọn";
      if (!q.options.some((o) => o.key === q.answer)) e.answer = "Chọn đáp án đúng";
    } else if (!q.answer.trim()) e.answer = q.type === "essay" ? "Nhập bài mẫu / tiêu chí" : "Nhập đáp án mẫu";
    setErrors(e);
    return !Object.keys(e).length;
  };

  const save = async () => {
    if (!validate()) return;
    setSaving(true);
    try {
      await onSubmit({ ...q, options: q.type === "mcq" ? q.options : [] });
      onClose();
    } catch (e) {
      if (e instanceof ApiError) setErrors(e.fieldErrors);
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  const explain = async () => {
    if (!q.prompt.trim()) return toast.error("Nhập câu hỏi trước khi nhờ AI giải thích");
    setExplaining(true);
    try {
      const r = await api<{ explanation: string; explanationLong: string; hint: QuestionInput["hint"]; translation: string }>("/admin/ai/explain", {
        body: { questionId, level, type: q.type, prompt: q.prompt, options: q.type === "mcq" ? q.options : [], answer: q.answer },
      });
      setQ((s) => ({
        ...s,
        explanation: r.explanation,
        explanationLong: r.explanationLong,
        hint: s.hint.title || s.hint.body ? s.hint : r.hint,
        translation: s.translation || r.translation,
      }));
      toast.success("AI đã viết giải thích — kiểm tra lại trước khi lưu");
    } catch (e) {
      toast.error(e);
    } finally {
      setExplaining(false);
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
      <div className="space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1fr_120px_1fr]">
          <Field label="Loại câu hỏi">
            <Select value={q.type} onChange={(e) => changeType(e.target.value as QType)} options={QTYPE_OPTIONS} />
          </Field>
          <Field label="Điểm">
            <Input type="number" min={1} max={100} value={q.points} onChange={(e) => set("points", Math.max(1, Number(e.target.value) || 1))} />
          </Field>
          <Field label="Hình minh hoạ (emoji)" hint="VD: 🐱 🍣 🚃">
            <Input value={q.scene.startsWith("{") ? "" : q.scene} placeholder={q.scene.startsWith("{") ? "Đang dùng cảnh minh hoạ có sẵn" : "🌸"} onChange={(e) => set("scene", e.target.value)} />
          </Field>
        </div>

        <Field label="Nội dung câu hỏi" required error={errors.prompt} hint="Dùng nút Furigana để thêm phiên âm; gõ ＿＿＿ cho chỗ trống.">
          <RichTextEditor value={q.prompt} onChange={(v) => set("prompt", v)} toolbar="basic" minHeight={110} placeholder="VD: 雨が降っている＿＿＿、傘を持って行きます。" />
        </Field>
        <Field label="Bản dịch tiếng Việt">
          <Input value={q.translation} onChange={(e) => set("translation", e.target.value)} placeholder="Vì trời đang mưa nên tôi mang ô theo." />
        </Field>

        {q.type === "mcq" ? (
          <Field label="Các lựa chọn (chọn đáp án đúng)" error={errors.options || errors.answer}>
            <div className="space-y-2">
              {q.options.map((o, i) => (
                <div key={o.key} className={cx("flex items-center gap-2 rounded-xl border p-1.5 pl-2.5", q.answer === o.key ? "border-emerald-300 bg-emerald-50/60" : "border-ink/10")}>
                  <label className="flex shrink-0 cursor-pointer items-center gap-1.5 text-sm font-bold">
                    <input type="radio" name="correct" checked={q.answer === o.key} onChange={() => set("answer", o.key)} className="size-4 accent-emerald-500" />
                    {o.key}
                  </label>
                  <Input value={o.text} onChange={(e) => setOpt(i, e.target.value)} placeholder={`Lựa chọn ${o.key}`} className="font-jp" />
                  <IconButton label="Xoá lựa chọn" onClick={() => removeOpt(i)} disabled={q.options.length <= 2}>
                    <Trash2 className="size-4" />
                  </IconButton>
                </div>
              ))}
              {q.options.length < 6 && (
                <Button type="button" variant="ghost" size="sm" icon={<Plus className="size-4" />} onClick={addOpt}>
                  Thêm lựa chọn
                </Button>
              )}
            </div>
          </Field>
        ) : (
          <Field
            label={q.type === "essay" ? "Bài mẫu (dùng để AI chấm)" : "Đáp án mẫu"}
            required
            error={errors.answer}
            hint={q.type === "short" ? "Nhiều đáp án chấp nhận được ngăn cách bằng “ | ” — VD: たべます | 食べます" : "AI so sánh bài làm với bài mẫu và tiêu chí ở phần giải thích."}
          >
            <Textarea rows={q.type === "essay" ? 4 : 2} value={q.answer} onChange={(e) => set("answer", e.target.value)} className="font-jp" />
          </Field>
        )}

        <div className="rounded-2xl border border-ink/[.06] p-3">
          <p className="mb-2 text-[13px] font-semibold text-ink/80">Gợi ý (hiển thị khi làm bài)</p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input value={q.hint.title} onChange={(e) => setHint("title", e.target.value)} placeholder="Tiêu đề — VD: Vì… nên…" />
            <Input value={q.hint.exampleVi} onChange={(e) => setHint("exampleVi", e.target.value)} placeholder="Nghĩa câu ví dụ" />
            <Textarea rows={2} value={q.hint.body} onChange={(e) => setHint("body", e.target.value)} placeholder="Giải thích ngắn mẫu ngữ pháp / từ vựng" className="sm:col-span-2" />
            <Input value={q.hint.exampleJa} onChange={(e) => setHint("exampleJa", e.target.value)} placeholder="Câu ví dụ tiếng Nhật (có thể dùng <ruby>)" className="font-jp sm:col-span-2" />
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <p className="text-[13px] font-semibold text-ink/80">Giải thích</p>
          <Button type="button" size="sm" variant="soft" loading={explaining} icon={<Sparkles className="size-4" />} onClick={explain}>
            AI viết giải thích
          </Button>
        </div>
        <Field label="Giải thích ngắn (hiện ngay sau khi trả lời)">
          <RichTextEditor value={q.explanation} onChange={(v) => set("explanation", v)} toolbar="basic" minHeight={80} />
        </Field>
        <Field label="Giải thích chi tiết">
          <RichTextEditor value={q.explanationLong} onChange={(v) => set("explanationLong", v)} toolbar="basic" minHeight={100} />
        </Field>
        <Field label="Lời thoại / audio (câu nghe hiểu)" hint="Văn bản tiếng Nhật được đọc bằng giọng ja-JP. VD: 女：明日はどこへ行きますか。 男：…">
          <Textarea rows={3} value={q.audioText} onChange={(e) => set("audioText", e.target.value)} className="font-jp" />
          <div className="mt-1.5">
            <SpeakButton text={q.audioText} />
          </div>
        </Field>
      </div>

      <div className="space-y-3 lg:sticky lg:top-0 lg:self-start">
        <p className="text-xs font-bold uppercase tracking-wide text-muted">Xem trước</p>
        <QuestionPreview q={q} level={level} />
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="ghost" onClick={onClose}>
            Huỷ
          </Button>
          <Button loading={saving} onClick={save}>
            Lưu câu hỏi
          </Button>
        </div>
      </div>
    </div>
  );
}
