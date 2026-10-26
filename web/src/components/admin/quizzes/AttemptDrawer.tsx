"use client";

import { useState } from "react";
import Link from "next/link";
import { Bot, Clock, RefreshCw, Save, Sparkles, UserRound } from "lucide-react";
import { Avatar, Badge, Button, Drawer, ErrorState, Input, Level, Skeleton, StatusBadge, Textarea, cx, toast } from "@/components/admin/ui";
import { Ring } from "@/components/admin/charts";
import { api, fmtDate } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { CorrectIcon, fmtDuration, kindPath, qtypeLabel, type AttemptDetail, type ReviewRow } from "./shared";

const RUBY = "[&_ruby]:[ruby-position:over] [&_rt]:text-[0.5em] [&_rt]:text-ink/60";

/** Chi tiết 1 lượt làm: câu trả lời, nhận xét AI, sửa điểm thủ công, chấm lại. */
export default function AttemptDrawer({ id, onClose }: { id: string | null; onClose: () => void }) {
  return (
    <Drawer open={!!id} onClose={onClose} title="Chi tiết lượt làm bài" width="max-w-3xl">
      {id && <Body key={id} id={id} />}
    </Drawer>
  );
}

function Body({ id }: { id: string }) {
  const { can } = useAuth();
  const canWrite = can("quizzes.write");
  const { data, error, loading, reload, mutate } = useApi<AttemptDetail>(`/admin/attempts/${id}`, { dedupeMs: 0 });
  const [edits, setEdits] = useState<Record<string, { score: string; feedback: string }>>({});
  const [overall, setOverall] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [regrading, setRegrading] = useState(false);

  if (loading) return <div className="space-y-3">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>;
  if (error || !data) return <ErrorState error={error ?? new Error("Không tải được dữ liệu")} onRetry={reload} />;

  const after = (d: AttemptDetail) => {
    mutate({ ...data, ...d });
    setEdits({});
    setOverall(null);
    invalidate("/admin/attempts");
    invalidate("/admin/quizzes");
  };

  const save = async () => {
    const overrides = Object.entries(edits)
      .filter(([, v]) => v.score !== "")
      .map(([questionId, v]) => ({ questionId, score: Number(v.score), feedback: v.feedback || null }));
    if (!overrides.length && overall === null) return toast.info("Chưa có thay đổi nào");
    setSaving(true);
    try {
      const d = await api<AttemptDetail>(`/admin/attempts/${id}/grade`, { method: "PATCH", body: { overrides, feedback: overall ?? data.feedback } });
      after(d);
      toast.success("Đã lưu điểm");
    } catch (e) {
      toast.error(e);
    } finally {
      setSaving(false);
    }
  };

  const regrade = async () => {
    setRegrading(true);
    try {
      const d = await api<AttemptDetail>(`/admin/attempts/${id}/regrade`, { body: { keepManual: true } });
      after(d);
      toast.success(d.aiGraded ? "Đã chấm lại bằng AI" : "Đã chấm lại (so khớp đáp án — chưa cấu hình AI)");
    } catch (e) {
      toast.error(e);
    } finally {
      setRegrading(false);
    }
  };

  const hasOpen = data.review.some((r) => r.type !== "mcq");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4 rounded-2xl bg-ink/[.02] p-4">
        <Ring value={data.score} size={72} color={data.passed ? "#10b981" : "#f59e0b"}>
          <span className="text-base font-extrabold">{data.score}%</span>
        </Ring>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Avatar src={data.user.avatarUrl} name={data.user.name} size={28} />
            <Link href={`/admin/hoc-vien/${data.user.id}`} className="font-bold hover:text-brand-600">
              {data.user.name}
            </Link>
            <Level level={data.user.level} />
          </div>
          <p className="truncate text-xs text-muted">{data.user.email}</p>
          <Link href={`${kindPath(data.quiz.kind)}/${data.quiz.id}`} className="block truncate text-sm font-semibold text-brand-600 hover:underline">
            {data.quiz.title}
          </Link>
          <div className="flex flex-wrap gap-1.5">
            <StatusBadge status={data.status} />
            <Badge tone={data.passed ? "green" : "amber"}>{data.passed ? `Đạt (≥${data.passScore}%)` : `Chưa đạt (<${data.passScore}%)`}</Badge>
            {data.aiGraded && (
              <Badge tone="violet">
                <Bot className="size-3" /> AI chấm
              </Badge>
            )}
          </div>
        </div>
        <div className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs">
          <span className="text-muted">Điểm</span>
          <b className="tabular-nums">
            {data.rawScore}/{data.maxScore}
          </b>
          <span className="text-muted">Đúng / sai</span>
          <b>
            {data.right} / {data.wrong}
          </b>
          <span className="text-muted">Bỏ trống</span>
          <b>{data.skipped}</b>
          <span className="flex items-center gap-1 text-muted">
            <Clock className="size-3" /> Thời gian
          </span>
          <b>{fmtDuration(data.durationSec)}</b>
          <span className="text-muted">Nộp lúc</span>
          <b>{data.submittedAt ? fmtDate(data.submittedAt, true) : "—"}</b>
        </div>
      </div>

      <div>
        <p className="mb-1.5 flex items-center gap-1.5 text-[13px] font-semibold">
          <Sparkles className="size-4 text-violet-500" /> Nhận xét tổng thể
        </p>
        {canWrite ? (
          <Textarea rows={2} value={overall ?? data.feedback ?? ""} onChange={(e) => setOverall(e.target.value)} placeholder="Nhận xét cho học viên…" />
        ) : (
          <p className="rounded-xl bg-violet-50 p-3 text-sm text-violet-900">{data.feedback ?? "—"}</p>
        )}
      </div>

      <div className="space-y-2.5">
        {data.review.map((r, i) => (
          <ReviewCard
            key={r.questionId}
            r={r}
            index={i}
            canWrite={canWrite}
            edit={edits[r.questionId]}
            onEdit={(v) => setEdits((s) => ({ ...s, [r.questionId]: v }))}
          />
        ))}
      </div>

      {canWrite && (
        <div className="sticky bottom-0 -mx-5 flex flex-wrap justify-end gap-2 border-t border-ink/5 bg-white px-5 py-3">
          <Button variant="outline" loading={regrading} icon={<RefreshCw className="size-4" />} onClick={regrade} title="Giữ điểm giáo viên đã sửa">
            {hasOpen ? "Chấm lại bằng AI" : "Chấm lại"}
          </Button>
          <Button loading={saving} icon={<Save className="size-4" />} onClick={save}>
            Lưu điểm & nhận xét
          </Button>
        </div>
      )}
    </div>
  );
}

function ReviewCard({
  r,
  index,
  canWrite,
  edit,
  onEdit,
}: {
  r: ReviewRow;
  index: number;
  canWrite: boolean;
  edit?: { score: string; feedback: string };
  onEdit: (v: { score: string; feedback: string }) => void;
}) {
  const optText = (k: string | null) => (k ? (r.options.find((o) => o.key === k)?.text ?? k) : "");
  const open = r.type !== "mcq";
  const [expanded, setExpanded] = useState(open);
  return (
    <div className={cx("rounded-xl border p-3", r.answer ? (r.correct ? "border-emerald-100" : "border-red-100") : "border-ink/[.06]")}>
      <button className="flex w-full items-start gap-2 text-left" onClick={() => setExpanded((v) => !v)}>
        {r.answer ? <CorrectIcon ok={r.correct} /> : <span className="grid size-5 place-items-center rounded-full bg-ink/10 text-[10px] font-bold">–</span>}
        <span className="min-w-0 flex-1">
          <span className="text-[11px] font-bold text-muted">
            Câu {index + 1} · {qtypeLabel(r.type)} · {r.score}/{r.points} điểm
            {r.gradedBy === "ai" && <span className="ml-1 text-violet-600">· AI chấm</span>}
            {r.gradedBy === "manual" && <span className="ml-1 text-sky-600">· GV chấm</span>}
          </span>
          <span className={cx("block font-jp text-sm leading-relaxed", RUBY, !expanded && "line-clamp-1")} dangerouslySetInnerHTML={{ __html: r.prompt }} />
        </span>
      </button>
      {expanded && (
        <div className="mt-2 space-y-2 pl-7 text-sm">
          <p>
            <span className="text-xs text-muted">Học viên trả lời: </span>
            {r.answer ? (
              <span className={cx("font-jp", RUBY, r.correct ? "text-emerald-700" : "text-red-600")}>
                {r.type === "mcq" ? (
                  <>
                    {r.answer}. <span dangerouslySetInnerHTML={{ __html: optText(r.answer) }} />
                  </>
                ) : (
                  <span className="whitespace-pre-wrap">{r.answer}</span>
                )}
              </span>
            ) : (
              <i className="text-muted">Bỏ trống</i>
            )}
          </p>
          <p>
            <span className="text-xs text-muted">{r.type === "essay" ? "Bài mẫu: " : "Đáp án: "}</span>
            <span className={cx("font-jp text-emerald-700", RUBY)}>
              {r.type === "mcq" ? (
                <>
                  {r.correctAnswer}. <span dangerouslySetInnerHTML={{ __html: optText(r.correctAnswer) }} />
                </>
              ) : (
                r.correctAnswer.split(/\s*\|\s*/).join(" / ")
              )}
            </span>
          </p>
          {r.feedback && (
            <p className={cx("rounded-lg p-2 text-xs leading-relaxed", r.gradedBy === "ai" ? "bg-violet-50 text-violet-900" : "bg-ink/[.03] text-ink/75")}>
              {r.gradedBy === "ai" ? <Bot className="mr-1 inline size-3.5" /> : <UserRound className="mr-1 inline size-3.5" />}
              {r.feedback}
            </p>
          )}
          {canWrite && (open || r.answer) && (
            <div className="grid gap-2 rounded-lg bg-amber-50/60 p-2 sm:grid-cols-[110px_1fr]">
              <label className="text-[11px] font-semibold text-amber-800">
                Sửa điểm (0–{r.points})
                <Input
                  type="number"
                  min={0}
                  max={r.points}
                  step={0.5}
                  value={edit?.score ?? ""}
                  placeholder={String(r.score)}
                  onChange={(e) => onEdit({ score: e.target.value, feedback: edit?.feedback ?? r.feedback ?? "" })}
                  className="mt-1 h-8"
                />
              </label>
              <label className="text-[11px] font-semibold text-amber-800">
                Nhận xét của giáo viên
                <Textarea
                  rows={2}
                  value={edit?.feedback ?? ""}
                  placeholder={r.feedback ?? "Nhận xét cho câu này…"}
                  onChange={(e) => onEdit({ score: edit?.score || String(r.score), feedback: e.target.value })}
                  className="mt-1"
                />
              </label>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
