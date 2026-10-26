import type { FastifyInstance } from "fastify";
import { sql } from "drizzle-orm";
import { db, schema } from "../db/index.js";
import { notFound, parse } from "../lib/http.js";
import { logActivity, requirePerm } from "../lib/auth.js";
import { buckets, rangeQuery, resolveRange, type Range } from "./revenue.js";
import { csvReply } from "./orders-admin.js";

const { users, orders, enrollments, courses, studySessions, lessonProgress, attempts, quizzes, teachers } = schema;

/** Ngày theo giờ địa phương (YYYY-MM-DD) cho cột kiểu date. */
const ymd = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const pct = (a: number, b: number) => (b ? Math.round((a / b) * 1000) / 10 : 0);
const growth = (cur: number, prev: number) => (prev ? Math.round(((cur - prev) / prev) * 1000) / 10 : cur ? 100 : 0);

const reportQuery = rangeQuery.extend({ range: rangeQuery.shape.range.default("30d") });

async function kpis(a: Date, b: Date) {
  const A = a.toISOString();
  const B = b.toISOString();
  const dA = ymd(a);
  const dB = ymd(b);
  const [r] = await db.execute<{
    new_students: number;
    active: number;
    lp_total: number;
    lp_done: number;
    revenue: number;
    orders: number;
    enrollments: number;
    attempts: number;
    passed: number;
    avg_score: number | null;
    minutes: number;
  }>(sql`select
    (select count(*)::int from ${users} where role = 'student' and created_at >= ${A} and created_at < ${B}) as new_students,
    (select count(distinct uid)::int from (
        select user_id as uid from ${studySessions} where day >= ${dA} and day < ${dB}
        union select user_id from ${lessonProgress} where updated_at >= ${A} and updated_at < ${B}
        union select user_id from ${attempts} where created_at >= ${A} and created_at < ${B}
        union select id from ${users} where role = 'student' and last_active_at >= ${A} and last_active_at < ${B}
    ) x) as active,
    (select count(*)::int from ${lessonProgress} where updated_at >= ${A} and updated_at < ${B}) as lp_total,
    (select count(*)::int from ${lessonProgress} where updated_at >= ${A} and updated_at < ${B} and completed_at is not null) as lp_done,
    (select coalesce(sum(amount - discount), 0)::bigint from ${orders} where status = 'paid' and paid_at >= ${A} and paid_at < ${B}) as revenue,
    (select count(*)::int from ${orders} where status = 'paid' and paid_at >= ${A} and paid_at < ${B}) as orders,
    (select count(*)::int from ${enrollments} where created_at >= ${A} and created_at < ${B}) as enrollments,
    (select count(*)::int from ${attempts} t where t.status <> 'in_progress' and t.created_at >= ${A} and t.created_at < ${B} and t.max_score > 0) as attempts,
    (select count(*)::int from ${attempts} t join ${quizzes} q on q.id = t.quiz_id
       where t.status <> 'in_progress' and t.created_at >= ${A} and t.created_at < ${B} and t.max_score > 0
       and (t.score / t.max_score) * 100 >= q.pass_score) as passed,
    (select round(avg((t.score / t.max_score) * 100)::numeric, 1)::float from ${attempts} t
       where t.status <> 'in_progress' and t.created_at >= ${A} and t.created_at < ${B} and t.max_score > 0) as avg_score,
    (select coalesce(sum(minutes), 0)::int from ${studySessions} where day >= ${dA} and day < ${dB}) as minutes
  `);
  return {
    newStudents: r.new_students,
    activeLearners: r.active,
    completionRate: pct(r.lp_done, r.lp_total),
    lessonsCompleted: r.lp_done,
    revenue: Number(r.revenue),
    orders: r.orders,
    enrollments: r.enrollments,
    attempts: r.attempts,
    quizPassRate: pct(r.passed, r.attempts),
    avgScore: r.avg_score ?? 0,
    studyHours: Math.round(r.minutes / 60),
  };
}

async function topCourses(a: Date, b: Date) {
  const A = a.toISOString();
  const B = b.toISOString();
  return db.execute<{ id: string; title: string; level: string | null; teacher: string | null; enrolled: number; total: number; revenue: number; completion: number }>(sql`
    select c.id, c.title, c.level, t.name as teacher,
      (select count(*)::int from ${enrollments} e where e.course_id = c.id and e.created_at >= ${A} and e.created_at < ${B}) as enrolled,
      (select count(*)::int from ${enrollments} e where e.course_id = c.id) as total,
      (select coalesce(sum(o.amount - o.discount), 0)::bigint from ${orders} o where o.course_id = c.id and o.status = 'paid' and o.paid_at >= ${A} and o.paid_at < ${B}) as revenue,
      coalesce((select round(100.0 * count(*) filter (where lp.completed_at is not null) / nullif(count(*), 0))::int
        from ${lessonProgress} lp join lessons l on l.id = lp.lesson_id join modules m on m.id = l.module_id where m.course_id = c.id), 0) as completion
    from ${courses} c left join ${teachers} t on t.id = c.teacher_id
    order by enrolled desc, total desc limit 10`);
}

async function quizStats(a: Date, b: Date) {
  const A = a.toISOString();
  const B = b.toISOString();
  return db.execute<{ id: string; title: string; level: string; kind: string; attempts: number; pass_rate: number; avg_score: number }>(sql`
    select q.id, q.title, q.level, q.kind, count(t.id)::int as attempts,
      coalesce(round(100.0 * count(*) filter (where (t.score / t.max_score) * 100 >= q.pass_score) / nullif(count(t.id), 0), 1), 0)::float as pass_rate,
      coalesce(round(avg((t.score / t.max_score) * 100)::numeric, 1), 0)::float as avg_score
    from ${quizzes} q join ${attempts} t on t.quiz_id = q.id
    where t.status <> 'in_progress' and t.max_score > 0 and t.created_at >= ${A} and t.created_at < ${B}
    group by q.id order by attempts desc limit 10`);
}

/** Giữ chân theo cohort tháng đăng ký: % học viên còn hoạt động ở tháng +0..+5. */
async function cohorts(months = 6) {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - (months - 1), 1).toISOString();
  const rows = await db.execute<{ cohort: string; size: number; offset: number; active: number }>(sql`
    with c as (
      select id, date_trunc('month', created_at) as cm from ${users} where role = 'student' and created_at >= ${start}
    ), act as (
      select user_id, date_trunc('month', day::timestamp) as am from ${studySessions}
      union select user_id, date_trunc('month', updated_at) from ${lessonProgress}
      union select user_id, date_trunc('month', created_at) from ${attempts}
      union select user_id, date_trunc('month', paid_at) from ${orders} where paid_at is not null
    ), sizes as (select cm, count(*)::int as size from c group by cm)
    select to_char(s.cm, 'YYYY-MM') as cohort, s.size,
      ((extract(year from a.am) - extract(year from s.cm)) * 12 + extract(month from a.am) - extract(month from s.cm))::int as "offset",
      count(distinct c.id)::int as active
    from sizes s join c on c.cm = s.cm left join act a on a.user_id = c.id and a.am >= c.cm
    group by s.cm, s.size, a.am order by s.cm`);
  const map = new Map<string, { cohort: string; label: string; size: number; values: (number | null)[] }>();
  for (let i = 0; i < months; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - (months - 1) + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    map.set(key, { cohort: key, label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}`, size: 0, values: Array.from({ length: months - i }, () => 0) });
  }
  for (const r of rows) {
    const m = map.get(r.cohort);
    if (!m) continue;
    m.size = r.size;
    if (r.offset !== null && r.offset >= 0 && r.offset < m.values.length) m.values[r.offset] = r.active;
  }
  return [...map.values()].map((m) => ({ ...m, values: m.values.map((v) => (m.size ? pct(v ?? 0, m.size) : 0)), counts: m.values }));
}

async function activitySeries(r: Range) {
  const A = r.start.toISOString();
  const B = r.end.toISOString();
  const fmt = r.unit === "month" ? "YYYY-MM" : "YYYY-MM-DD";
  const unit = r.unit;
  const [act, reg] = await Promise.all([
    db.execute<{ k: string; n: number }>(sql`
      select to_char(date_trunc(${unit}, x.d), ${fmt}) as k, count(distinct x.uid)::int as n from (
        select user_id as uid, day::timestamp as d from ${studySessions} where day >= ${ymd(r.start)} and day < ${ymd(r.end)}
        union all select user_id, updated_at from ${lessonProgress} where updated_at >= ${A} and updated_at < ${B}
        union all select user_id, created_at from ${attempts} where created_at >= ${A} and created_at < ${B}
      ) x group by 1`),
    db.execute<{ k: string; n: number }>(sql`
      select to_char(date_trunc(${unit}, created_at), ${fmt}) as k, count(*)::int as n from ${users}
      where role = 'student' and created_at >= ${A} and created_at < ${B} group by 1`),
  ]);
  const am = Object.fromEntries(act.map((x) => [x.k, x.n]));
  const rm = Object.fromEntries(reg.map((x) => [x.k, x.n]));
  return buckets(r).map((b) => ({ key: b.key, label: b.label, full: b.full, active: am[b.key] ?? 0, registrations: rm[b.key] ?? 0 }));
}

export default async function reportsRoutes(app: FastifyInstance) {
  const read = { preHandler: requirePerm("reports.read") };

  app.get("/api/admin/reports/summary", read, async (req) => {
    const r = resolveRange(parse(reportQuery, req.query));
    const [cur, prev, courseRows, quizRows, cohortRows, series] = await Promise.all([
      kpis(r.start, r.end),
      kpis(r.prevStart, r.prevEnd),
      topCourses(r.start, r.end),
      quizStats(r.start, r.end),
      cohorts(6),
      activitySeries(r),
    ]);
    return {
      range: { start: r.start, end: r.end, prevStart: r.prevStart, prevEnd: r.prevEnd, unit: r.unit, label: r.label },
      kpis: cur,
      previous: prev,
      growth: Object.fromEntries(Object.entries(cur).map(([k, v]) => [k, growth(v, prev[k as keyof typeof prev])])),
      topCourses: courseRows.map((c) => ({ ...c, revenue: Number(c.revenue) })),
      quizzes: quizRows,
      cohorts: cohortRows,
      series,
    };
  });

  app.get<{ Params: { table: string } }>("/api/admin/reports/export/:table", read, async (req, reply) => {
    const r = resolveRange(parse(reportQuery, req.query));
    const tag = `${r.start.toISOString().slice(0, 10)}_${new Date(r.end.getTime() - 1).toISOString().slice(0, 10)}`;
    const table = req.params.table.replace(/\.csv$/, "");
    await logActivity(req, "export", "report", null, `Xuất báo cáo ${table} (${tag})`);
    switch (table) {
      case "kpis": {
        const [cur, prev] = await Promise.all([kpis(r.start, r.end), kpis(r.prevStart, r.prevEnd)]);
        const label: Record<string, string> = {
          newStudents: "Học viên mới",
          activeLearners: "Học viên hoạt động",
          completionRate: "Tỉ lệ hoàn thành bài học (%)",
          lessonsCompleted: "Bài học hoàn thành",
          revenue: "Doanh thu (VND)",
          orders: "Đơn hàng đã thanh toán",
          enrollments: "Lượt ghi danh",
          attempts: "Lượt làm bài",
          quizPassRate: "Tỉ lệ đạt bài tập (%)",
          avgScore: "Điểm trung bình (%)",
          studyHours: "Giờ học",
        };
        return csvReply(
          reply,
          `bao-cao-kpi-${tag}.csv`,
          ["Chỉ số", "Kỳ này", "Kỳ trước", "Tăng trưởng (%)"],
          Object.keys(cur).map((k) => {
            const key = k as keyof typeof cur;
            return [label[k] ?? k, cur[key], prev[key], growth(cur[key], prev[key])];
          }),
        );
      }
      case "courses": {
        const rows = await topCourses(r.start, r.end);
        return csvReply(
          reply,
          `bao-cao-khoa-hoc-${tag}.csv`,
          ["Khóa học", "Cấp độ", "Giáo viên", "Ghi danh trong kỳ", "Tổng ghi danh", "Doanh thu (VND)", "Hoàn thành (%)"],
          rows.map((c) => [c.title, c.level, c.teacher, c.enrolled, c.total, Number(c.revenue), c.completion]),
        );
      }
      case "quizzes": {
        const rows = await quizStats(r.start, r.end);
        return csvReply(
          reply,
          `bao-cao-bai-tap-${tag}.csv`,
          ["Bài tập / đề thi", "Cấp độ", "Loại", "Lượt làm", "Tỉ lệ đạt (%)", "Điểm TB (%)"],
          rows.map((q) => [q.title, q.level, q.kind === "jlpt" ? "Đề JLPT" : "Bài tập", q.attempts, q.pass_rate, q.avg_score]),
        );
      }
      case "cohorts": {
        const rows = await cohorts(6);
        return csvReply(
          reply,
          `bao-cao-giu-chan-${tag}.csv`,
          ["Cohort", "Số học viên", ...Array.from({ length: 6 }, (_, i) => `Tháng +${i} (%)`)],
          rows.map((c) => [c.label, c.size, ...Array.from({ length: 6 }, (_, i) => c.values[i] ?? "")]),
        );
      }
      case "activity": {
        const rows = await activitySeries(r);
        return csvReply(reply, `bao-cao-hoat-dong-${tag}.csv`, ["Thời gian", "Học viên hoạt động", "Đăng ký mới"], rows.map((x) => [x.full, x.active, x.registrations]));
      }
      default:
        throw notFound("Không có bảng báo cáo này");
    }
  });
}

