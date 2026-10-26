"use client";

import { useState } from "react";
import { Activity, Bot, ClipboardCheck, Hourglass, Target, Users } from "lucide-react";
import { Card, Panel } from "@/components/admin/ui";
import { DataTable, Pagination, TableToolbar } from "@/components/admin/table";
import { BarChart } from "@/components/admin/charts";
import { PageHeader, StatCard } from "@/components/admin/page";
import { num } from "@/lib/api";
import { useApi, useTable } from "@/lib/hooks";
import AttemptDrawer from "./AttemptDrawer";
import { attemptColumns } from "./QuizEditor";
import { LEVEL_OPTIONS, type AttemptRow } from "./shared";

type Stats = {
  total: number;
  today: number;
  last7: number;
  inProgress: number;
  avgScore: number | null;
  aiGraded: number;
  manual: number;
  students: number;
  byMonth: { label: string; value: number }[];
};

/** Lượt làm bài của học viên trên toàn bộ bài tập & đề thi. */
export default function AttemptsPage() {
  const t = useTable<AttemptRow>("/admin/attempts", { sort: "startedAt" });
  const stats = useApi<Stats>("/admin/attempts/stats");
  const [open, setOpen] = useState<string | null>(null);
  const s = stats.data;

  return (
    <div>
      <PageHeader
        title="Lượt làm bài"
        subtitle="Theo dõi kết quả làm bài tập và đề thi JLPT của học viên, xem bài làm và chấm lại."
        crumbs={[{ label: "Học viên", href: "/admin/hoc-vien" }, { label: "Lượt làm bài" }]}
      />
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard index={0} icon={<Activity className="size-5" />} label="Tổng lượt làm" value={num(s?.total)} sub={`${num(s?.today)} hôm nay · ${num(s?.last7)} trong 7 ngày`} spark={s?.byMonth.map((m) => m.value)} />
        <StatCard index={1} tone="blue" icon={<Users className="size-5" />} label="Học viên tham gia" value={num(s?.students)} sub={`${num(s?.inProgress)} lượt đang làm dở`} />
        <StatCard index={2} tone="green" icon={<Target className="size-5" />} label="Điểm trung bình" value={s?.avgScore != null ? `${s.avgScore}%` : "—"} sub="Các lượt đã nộp" />
        <StatCard index={3} tone="violet" icon={<Bot className="size-5" />} label="AI chấm tự luận" value={num(s?.aiGraded)} sub={`${num(s?.manual)} lượt giáo viên sửa điểm`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="min-w-0 p-4">
          <TableToolbar
            table={t}
            placeholder="Tìm học viên, email, bài tập…"
            filters={[
              { key: "kind", label: "Loại", options: [{ value: "exercise", label: "Bài tập" }, { value: "jlpt", label: "Đề JLPT" }] },
              { key: "status", label: "Trạng thái", options: [{ value: "graded", label: "Đã chấm" }, { value: "in_progress", label: "Đang làm" }, { value: "submitted", label: "Đã nộp" }] },
              { key: "level", label: "Cấp độ", options: LEVEL_OPTIONS },
              { key: "result", label: "Kết quả", options: [{ value: "pass", label: "Đạt" }, { value: "fail", label: "Chưa đạt" }] },
              { key: "ai", label: "AI chấm", options: [{ value: "1", label: "Có AI chấm" }, { value: "0", label: "Không có" }] },
            ]}
          />
          <DataTable table={t} columns={attemptColumns(true)} rowKey={(r) => r.id} onRowClick={(r) => setOpen(r.id)} />
          <Pagination table={t as never} />
        </Card>
        <div className="space-y-5">
          <Panel title="Lượt làm 6 tháng" icon={<ClipboardCheck className="size-4" />}>
            <BarChart data={s?.byMonth ?? []} height={200} format={(v) => num(Math.round(v))} />
          </Panel>
          <Panel title="Gợi ý" icon={<Hourglass className="size-4" />}>
            <ul className="space-y-2 text-xs leading-relaxed text-ink/70">
              <li>• Lọc “AI chấm” để kiểm tra lại các bài tự luận do AI chấm điểm.</li>
              <li>• Mở một lượt làm để xem từng câu trả lời, sửa điểm và viết nhận xét cho học viên.</li>
              <li>• “Chấm lại bằng AI” giữ nguyên điểm giáo viên đã sửa.</li>
            </ul>
          </Panel>
        </div>
      </div>
      <AttemptDrawer id={open} onClose={() => setOpen(null)} />
    </div>
  );
}
