"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowRight,
  BarChart3,
  BookCopy,
  BookOpen,
  Bookmark,
  CheckCircle2,
  ChevronDown,
  Circle,
  ClipboardList,
  Clock,
  FileText,
  Flower2,
  Headphones,
  Layers,
  LayoutGrid,
  Medal,
  MessageCircle,
  RefreshCw,
  SearchX,
  Star,
} from "lucide-react";
import { Breadcrumb, Card, LEVEL_TONE, PageBanner } from "../site";
import { Reveal } from "../ui";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { useApi } from "@/lib/hooks";
import {
  DIFFICULTY,
  LEVELS,
  SKILL_FILTERS,
  SORTS,
  quizHref,
  type Difficulty,
  type Level,
  type QuizCard,
  type Skill,
  type SortId,
  type Status,
} from "./types";

const ease = [0.22, 1, 0.36, 1] as const;

const FEATURES = [
  { t: "Bài tập phong phú", d: "Cập nhật liên tục", icon: BookCopy },
  { t: "Bám sát kỳ thi JLPT", d: "Từ N5 đến N1", icon: ClipboardList },
  { t: "Thiết kế theo chủ đề", d: "Gần gũi, dễ áp dụng", icon: Flower2 },
  { t: "Theo dõi tiến độ", d: "Học tập hiệu quả hơn", icon: BarChart3 },
];

const SKILL_ICON: Record<string, React.ReactNode> = {
  vocab: <MessageCircle className="size-4" />,
  grammar: <FileText className="size-4" />,
  kanji: <span className="font-jp text-base font-bold leading-none text-emerald-600">漢</span>,
  listening: <Headphones className="size-4" />,
  jlpt: <ClipboardList className="size-4" />,
};

type Filters = {
  topics: { id: string; label: string; count: number }[];
  difficulties: { id: Difficulty; label: string; count: number }[];
};

const join = (s: Set<string>) => [...s].join(",");

export default function ExerciseHub() {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();

  const [levels, setLevels] = useState<Set<Level>>(() => new Set((params.get("level")?.split(",") ?? []).filter((l): l is Level => LEVELS.includes(l as Level))));
  const [skills, setSkills] = useState<Set<Skill>>(() => new Set((params.get("skill")?.split(",") ?? []).filter(Boolean) as Skill[]));
  const [topic, setTopic] = useState(params.get("topic") ?? "");
  const [difficulty, setDifficulty] = useState<Difficulty | "">((params.get("difficulty") as Difficulty) ?? "");
  const [sort, setSort] = useState<SortId>("new");
  const [spin, setSpin] = useState(0);
  const [exclude, setExclude] = useState<string[]>([]);
  const [saved, setSaved] = useState<Record<string, boolean>>({});
  const [jlpt, setJlpt] = useState<Level>(() => (levels.size === 1 ? [...levels][0] : "N5"));

  const filterQuery = new URLSearchParams();
  if (levels.size) filterQuery.set("level", join(levels));
  if (skills.size) filterQuery.set("skill", join(skills));
  if (topic) filterQuery.set("topic", topic);
  if (difficulty) filterQuery.set("difficulty", difficulty);
  const fq = filterQuery.toString();
  const uid = user?.id ?? "anon";

  const meta = useApi<Filters>("/public/quizzes/filters");
  const listRes = useApi<{ items: QuizCard[] }>(`/public/quizzes?kind=exercise&sort=${sort}${fq ? `&${fq}` : ""}&u=${uid}`);
  const sugRes = useApi<{ items: QuizCard[] }>(
    `/public/quizzes/suggested?limit=4${fq ? `&${fq}` : ""}${exclude.length ? `&exclude=${exclude.join(",")}` : ""}&s=${spin}&u=${uid}`,
    { dedupeMs: 0 },
  );
  const jlptRes = useApi<{ items: QuizCard[] }>(`/public/quizzes?kind=jlpt&level=${jlpt}&sort=new&u=${uid}`);

  const list = listRes.data?.items ?? [];
  const suggestions = sugRes.data?.items ?? [];
  const isSaved = (q: QuizCard) => saved[q.id] ?? q.bookmarked;

  const toggleLevel = (l: Level) => {
    const next = new Set(levels);
    if (next.has(l)) next.delete(l);
    else next.add(l);
    setLevels(next);
    setExclude([]);
    if (next.size === 1) setJlpt([...next][0]);
  };
  const toggleSkill = (s: Skill) => {
    const next = new Set(skills);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    setSkills(next);
    setExclude([]);
  };
  const toggleSaved = async (q: QuizCard) => {
    if (!user) {
      router.push(`/dang-nhap?next=${encodeURIComponent("/bai-tap")}`);
      return;
    }
    const prev = isSaved(q);
    setSaved((s) => ({ ...s, [q.id]: !prev }));
    try {
      const r = await api<{ bookmarked: boolean }>(`/me/quizzes/${q.id}/bookmark`, { method: "POST" });
      setSaved((s) => ({ ...s, [q.id]: r.bookmarked }));
    } catch {
      setSaved((s) => ({ ...s, [q.id]: prev }));
    }
  };

  const shuffle = () => {
    setExclude(suggestions.map((s) => s.id));
    setSpin((s) => s + 1);
  };

  const anyFilter = levels.size > 0 || skills.size > 0 || !!topic || !!difficulty;
  const resetFilters = () => {
    setLevels(new Set());
    setSkills(new Set());
    setTopic("");
    setDifficulty("");
    setExclude([]);
  };

  const topicOptions = useMemo(
    () => [{ v: "", l: "Tất cả chủ đề" }, ...(meta.data?.topics ?? []).map((t) => ({ v: t.id, l: `${t.label} (${t.count})` }))],
    [meta.data],
  );
  const diffOptions = useMemo(
    () => [
      { v: "", l: "Tất cả độ khó" },
      ...(meta.data?.difficulties ?? (Object.keys(DIFFICULTY) as Difficulty[]).map((d) => ({ id: d, label: DIFFICULTY[d].label, count: 0 }))).map((d) => ({
        v: d.id,
        l: d.label,
      })),
    ],
    [meta.data],
  );

  return (
    <>
      <PageBanner compact>
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.7, ease }}>
          <Breadcrumb items={[{ label: "Bài tập" }]} />
          <h1 className="text-[2rem] font-extrabold leading-tight tracking-tight sm:text-5xl">Bài tập theo chủ đề</h1>
          <p className="mt-2 text-base text-muted sm:text-lg">Luyện tập đa dạng chủ đề, bám sát thực tế và kỳ thi JLPT.</p>
        </motion.div>
        <ul className="mt-6 grid grid-cols-2 gap-x-4 gap-y-4 lg:w-[115%] lg:grid-cols-4">
          {FEATURES.map((f, i) => (
            <motion.li
              key={f.t}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 + i * 0.08, duration: 0.6, ease }}
              className="flex items-center gap-3"
            >
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-white text-brand-500 shadow-md shadow-brand-500/10 ring-1 ring-brand-100">
                <f.icon className="size-5" />
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-semibold leading-tight">{f.t}</span>
                <span className="block text-[11px] text-muted">{f.d}</span>
              </span>
            </motion.li>
          ))}
        </ul>
      </PageBanner>

      <div className="relative z-10 mx-auto max-w-7xl px-4 sm:px-6">
        {/* ---------------- Bộ lọc ---------------- */}
        <Reveal y={16}>
          <Card className="grid grid-cols-1 gap-5 p-4 shadow-lg shadow-ink/5 sm:p-5 lg:grid-cols-[auto_auto_1fr_1fr] lg:gap-0 [&>*]:min-w-0">
            <FilterGroup label="Chọn cấp độ" className="lg:pr-6">
              <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                {LEVELS.map((l) => {
                  const on = levels.has(l);
                  return (
                    <motion.button
                      key={l}
                      whileTap={{ scale: 0.92 }}
                      onClick={() => toggleLevel(l)}
                      aria-pressed={on}
                      className={`h-10 w-14 shrink-0 snap-start rounded-lg border text-sm font-semibold transition-colors ${
                        on
                          ? "border-brand-300 bg-brand-50 text-brand-500 shadow-sm shadow-brand-500/10"
                          : "border-ink/10 bg-white text-ink/80 hover:border-brand-200 hover:text-brand-500"
                      }`}
                    >
                      {l}
                    </motion.button>
                  );
                })}
              </div>
            </FilterGroup>
            <FilterGroup label="Chọn kỹ năng" className="lg:border-l lg:border-ink/5 lg:px-6">
              <div className="no-scrollbar -mx-4 flex snap-x gap-2 overflow-x-auto px-4 sm:mx-0 sm:px-0">
                {SKILL_FILTERS.map((s) => {
                  const on = skills.has(s.id);
                  return (
                    <motion.button
                      key={s.id}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => toggleSkill(s.id)}
                      aria-pressed={on}
                      className={`flex h-10 shrink-0 snap-start items-center gap-2 rounded-lg border px-3 text-xs font-medium transition-colors ${
                        on
                          ? "border-brand-500 bg-brand-500 text-white shadow-md shadow-brand-500/25 [&_span]:text-white"
                          : "border-ink/10 bg-white text-ink/80 hover:border-brand-200"
                      }`}
                    >
                      <span className={on ? "" : "text-brand-500"}>{SKILL_ICON[s.id]}</span>
                      {s.label}
                    </motion.button>
                  );
                })}
              </div>
            </FilterGroup>
            <FilterGroup label="Chọn chủ đề" className="lg:border-l lg:border-ink/5 lg:px-6">
              <SelectBox
                icon={<Layers className="size-4 text-brand-500" />}
                value={topic}
                onChange={(v) => (setTopic(v), setExclude([]))}
                label="Chọn chủ đề"
                options={topicOptions}
              />
            </FilterGroup>
            <FilterGroup label="Độ khó" className="lg:border-l lg:border-ink/5 lg:pl-6">
              <SelectBox
                icon={<BarChart3 className="size-4 text-brand-500" />}
                value={difficulty}
                onChange={(v) => (setDifficulty(v as Difficulty | ""), setExclude([]))}
                label="Độ khó"
                options={diffOptions}
              />
            </FilterGroup>
          </Card>
        </Reveal>
        <AnimatePresence>
          {anyFilter && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <p className="flex flex-wrap items-center gap-2 pt-3 text-xs text-muted">
                Tìm thấy <b className="text-ink">{list.length}</b> bài tập phù hợp.
                <button onClick={resetFilters} className="font-semibold text-brand-500 hover:underline">
                  Xóa bộ lọc
                </button>
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ---------------- Đề xuất hôm nay ---------------- */}
        <Reveal className="mt-5 rounded-3xl bg-gradient-to-br from-brand-50 via-[#fff1f1] to-brand-50/40 p-4 ring-1 ring-brand-100 sm:p-5">
          <div className="mb-4 flex items-start justify-between gap-3">
            <div className="flex items-start gap-3">
              <motion.span
                animate={{ rotate: [0, 12, -8, 0], scale: [1, 1.1, 1] }}
                transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 2 }}
                className="mt-0.5"
              >
                <Star className="size-7 fill-brand-500 text-brand-500" />
              </motion.span>
              <div>
                <h2 className="text-lg font-extrabold sm:text-xl">Bài tập đề xuất hôm nay</h2>
                <p className="text-xs text-muted sm:text-sm">
                  {user ? "Dựa trên lộ trình học và tiến độ của bạn" : "Đăng nhập để nhận đề xuất theo trình độ của bạn"}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ y: -1 }}
              whileTap={{ scale: 0.95 }}
              onClick={shuffle}
              disabled={sugRes.loading}
              className="flex shrink-0 items-center gap-1.5 rounded-lg border border-brand-100 bg-white px-3 py-2 text-xs font-semibold text-brand-500 shadow-sm disabled:opacity-60"
            >
              <motion.span animate={{ rotate: spin * 360 }} transition={{ duration: 0.6, ease }}>
                <RefreshCw className="size-4" />
              </motion.span>
              <span className="hidden sm:inline">Đổi đề xuất khác</span>
              <span className="sm:hidden">Đổi</span>
            </motion.button>
          </div>
          {sugRes.loading && !suggestions.length ? (
            <SkeletonRow count={4} className="h-[150px]" />
          ) : suggestions.length ? (
            <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-1 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 xl:grid-cols-4">
              <AnimatePresence mode="popLayout">
                {suggestions.map((s, i) => (
                  <motion.div
                    key={`${s.id}-${spin}`}
                    layout
                    initial={{ opacity: 0, y: 20, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.94 }}
                    transition={{ duration: 0.45, delay: i * 0.06, ease }}
                    className="w-[86%] shrink-0 snap-start sm:w-auto"
                  >
                    <SuggestionCard ex={s} saved={isSaved(s)} onSave={() => toggleSaved(s)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          ) : (
            <Empty onReset={resetFilters} />
          )}
        </Reveal>

        {/* ---------------- Danh sách ---------------- */}
        <section id="chu-de" className="mt-8 scroll-mt-24">
          <Reveal className="mb-4 flex items-end justify-between gap-3">
            <div className="flex items-start gap-3">
              <BookOpen className="mt-0.5 size-7 shrink-0 fill-ink text-ink [&_path]:stroke-white" />
              <div>
                <h2 className="text-lg font-extrabold sm:text-xl">Danh sách bài tập</h2>
                <p className="text-xs text-muted sm:text-sm">Chọn bài tập phù hợp với mục tiêu học tập của bạn.</p>
              </div>
            </div>
            <label className="flex shrink-0 items-center gap-2 text-xs text-muted">
              <span className="hidden sm:inline">Sắp xếp:</span>
              <span className="relative">
                <select
                  value={sort}
                  onChange={(e) => setSort(e.target.value as SortId)}
                  aria-label="Sắp xếp"
                  className="h-9 w-36 cursor-pointer appearance-none rounded-lg border border-ink/10 bg-white pl-3 pr-8 text-xs font-medium text-ink outline-none transition focus:border-brand-300 sm:w-40"
                >
                  {SORTS.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.label}
                    </option>
                  ))}
                </select>
                <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-ink/60" />
              </span>
            </label>
          </Reveal>
          {listRes.error && !list.length ? (
            <Card>
              <ErrorBox message={listRes.error.message} onRetry={listRes.reload} />
            </Card>
          ) : listRes.loading && !list.length ? (
            <SkeletonRow count={10} className="h-[170px]" grid="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" />
          ) : list.length ? (
            <motion.div layout className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
              <AnimatePresence mode="popLayout">
                {list.map((e, i) => (
                  <motion.div
                    key={e.id}
                    layout
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9 }}
                    transition={{ duration: 0.45, delay: Math.min(i, 9) * 0.04, ease }}
                  >
                    <ExerciseCard ex={e} saved={isSaved(e)} onSave={() => toggleSaved(e)} />
                  </motion.div>
                ))}
              </AnimatePresence>
            </motion.div>
          ) : (
            <Card>
              <Empty onReset={resetFilters} jlpt={skills.has("jlpt")} />
            </Card>
          )}
        </section>

        {/* ---------------- Bộ đề JLPT ---------------- */}
        <JlptSection level={jlpt} setLevel={setJlpt} items={jlptRes.data?.items} loading={jlptRes.loading} isSaved={isSaved} onSave={toggleSaved} />
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */

function SkeletonRow({ count, className, grid = "grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4" }: { count: number; className: string; grid?: string }) {
  return (
    <div className={grid}>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className={`animate-pulse rounded-2xl bg-white/80 ring-1 ring-ink/5 ${className}`} />
      ))}
    </div>
  );
}

function ErrorBox({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <SearchX className="size-9 text-brand-300" />
      <p className="text-sm font-semibold">Không tải được bài tập</p>
      <p className="text-xs text-muted">{message}</p>
      <button onClick={onRetry} className="mt-1 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white">
        Thử lại
      </button>
    </div>
  );
}

function FilterGroup({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="mb-2.5 text-[13px] font-semibold">{label}</p>
      {children}
    </div>
  );
}

function SelectBox({
  icon,
  value,
  onChange,
  options,
  label,
}: {
  icon: React.ReactNode;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
  label: string;
}) {
  return (
    <span className="relative block">
      <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">{icon}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-label={label}
        className={`h-10 w-full cursor-pointer appearance-none rounded-lg border bg-white pl-10 pr-9 text-xs font-medium outline-none transition focus:border-brand-300 ${
          value ? "border-brand-300 text-brand-600" : "border-ink/10 text-ink/80"
        }`}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 size-4 -translate-y-1/2 text-ink/60" />
    </span>
  );
}

function Empty({ onReset, jlpt = false }: { onReset: () => void; jlpt?: boolean }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
      <SearchX className="size-9 text-brand-300" />
      <p className="text-sm font-semibold">Không có bài tập phù hợp với bộ lọc</p>
      <p className="text-xs text-muted">
        {jlpt ? "Đề thi JLPT nằm trong mục “Bộ đề JLPT” bên dưới." : "Hãy thử bỏ bớt điều kiện lọc nhé."}
      </p>
      <div className="mt-1 flex gap-2">
        <button onClick={onReset} className="rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white">
          Xóa bộ lọc
        </button>
        {jlpt && (
          <a href="#jlpt" className="rounded-lg border border-brand-200 px-4 py-2 text-xs font-semibold text-brand-500">
            Xem bộ đề JLPT
          </a>
        )}
      </div>
    </div>
  );
}

function Tile({ ex, className = "" }: { ex: QuizCard; className?: string }) {
  const photo = ex.icon?.startsWith("http") ? ex.icon : null;
  return (
    <div className={`relative grid shrink-0 place-items-center overflow-hidden rounded-xl bg-gradient-to-br ${ex.tone ?? "from-brand-50 to-rose-50"} ${className}`}>
      {photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photo} alt="" className="absolute inset-0 size-full object-cover transition-transform duration-500 group-hover:scale-110" />
      ) : (
        <span className="drop-shadow-sm transition-transform duration-500 group-hover:scale-110 group-hover:rotate-[-6deg]">{ex.emoji ?? "📘"}</span>
      )}
      {photo && <span className="absolute bottom-1 text-2xl drop-shadow">{ex.emoji}</span>}
    </div>
  );
}

function Badges({ ex, big = false }: { ex: QuizCard; big?: boolean }) {
  const d = DIFFICULTY[ex.difficulty];
  return (
    <span className="flex items-center gap-1.5">
      <span className={`rounded-md font-extrabold ${LEVEL_TONE[ex.level]} ${big ? "px-2.5 py-0.5 text-sm" : "px-2 py-0.5 text-[11px]"}`}>{ex.level}</span>
      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium ${d.tone}`}>
        <span className="size-1.5 rounded-full bg-current" />
        {d.label}
      </span>
    </span>
  );
}

function SaveBtn({ saved, onSave }: { saved: boolean; onSave: () => void }) {
  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={onSave}
      aria-pressed={saved}
      aria-label={saved ? "Bỏ lưu bài tập" : "Lưu bài tập"}
      className="text-ink/50 transition-colors hover:text-brand-500"
    >
      <motion.span key={String(saved)} initial={{ scale: 0.4 }} animate={{ scale: 1 }} className="block">
        <Bookmark className={`size-[18px] ${saved ? "fill-brand-500 text-brand-500" : ""}`} />
      </motion.span>
    </motion.button>
  );
}

function Meta({ ex }: { ex: QuizCard }) {
  return (
    <span className="flex items-center gap-4 text-[11px] text-muted">
      <span className="flex items-center gap-1">
        <Clock className="size-3.5" /> {ex.durationMin} phút
      </span>
      <span className="flex items-center gap-1">
        <LayoutGrid className="size-3.5" /> {ex.questionCount} câu
      </span>
    </span>
  );
}

function StatusView({ status }: { status: Status }) {
  if (status.kind === "done")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-md bg-emerald-50 px-1.5 py-1 text-[11px] font-medium text-emerald-600">
        <CheckCircle2 className="size-4 fill-emerald-500 text-white" /> Đã hoàn thành
      </span>
    );
  if (status.kind === "todo")
    return (
      <span className="inline-flex items-center gap-1.5 px-1.5 py-1 text-[11px] text-muted">
        <Circle className="size-3.5 text-ink/30" /> Chưa làm
      </span>
    );
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2 pr-3">
      <span className="h-2 min-w-0 flex-1 overflow-hidden rounded-full bg-ink/5">
        <motion.span
          initial={{ width: 0 }}
          whileInView={{ width: `${status.value}%` }}
          viewport={{ once: true }}
          transition={{ duration: 1, ease }}
          className="block h-full rounded-full bg-gradient-to-r from-emerald-400 to-emerald-500"
        />
      </span>
      <span className="text-[11px] font-semibold text-emerald-600">{status.value}%</span>
    </span>
  );
}

function SuggestionCard({ ex, saved, onSave }: { ex: QuizCard; saved: boolean; onSave: () => void }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="group flex h-full flex-col rounded-2xl border border-ink/5 bg-white p-3 shadow-sm transition-shadow hover:shadow-xl hover:shadow-brand-500/10"
    >
      <div className="flex gap-3">
        <Tile ex={ex} className="h-[88px] w-[76px] text-4xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <Badges ex={ex} big />
            <SaveBtn saved={saved} onSave={onSave} />
          </div>
          <h3 className="mt-2 text-sm font-bold leading-snug">{ex.title}</h3>
          <p className="mt-1.5 line-clamp-2 text-[11px] leading-relaxed text-muted">{ex.description}</p>
        </div>
      </div>
      <div className="mt-auto flex items-center justify-between gap-2 pt-3">
        <Meta ex={ex} />
        <Link
          href={quizHref(ex.slug)}
          className="group/btn inline-flex shrink-0 items-center gap-1.5 rounded-lg bg-brand-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-brand-500/25 transition hover:bg-brand-600"
        >
          {ex.status.kind === "progress" ? "Tiếp tục" : "Làm bài"} <ArrowRight className="size-3.5 transition-transform group-hover/btn:translate-x-0.5" />
        </Link>
      </div>
    </motion.article>
  );
}

function ExerciseCard({ ex, saved, onSave }: { ex: QuizCard; saved: boolean; onSave: () => void }) {
  return (
    <motion.article
      whileHover={{ y: -4 }}
      className="group flex h-full flex-col rounded-2xl border border-ink/5 bg-white p-3 shadow-sm transition-shadow hover:shadow-xl hover:shadow-ink/5"
    >
      <div className="flex gap-2.5">
        <Tile ex={ex} className="size-14 text-3xl" />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-1">
            <Badges ex={ex} />
            <SaveBtn saved={saved} onSave={onSave} />
          </div>
          <h3 className="mt-1.5 text-[13px] font-bold leading-snug">{ex.title}</h3>
          <p className="mt-1 line-clamp-2 text-[11px] leading-relaxed text-muted">{ex.description}</p>
        </div>
      </div>
      <div className="mt-auto pt-3">
        <Meta ex={ex} />
        <div className="mt-2.5 flex items-center justify-between gap-2">
          <StatusView status={ex.status} />
          <Link
            href={quizHref(ex.slug)}
            className="shrink-0 rounded-lg border border-brand-400 px-4 py-1.5 text-xs font-semibold text-brand-500 transition hover:bg-brand-500 hover:text-white"
          >
            {ex.status.kind === "progress" ? "Tiếp tục" : ex.status.kind === "done" ? "Làm lại" : "Làm bài"}
          </Link>
        </div>
      </div>
    </motion.article>
  );
}

/* ------------------------------------------------------------------ */

function JlptSection({
  level,
  setLevel,
  items,
  loading,
  isSaved,
  onSave,
}: {
  level: Level;
  setLevel: (l: Level) => void;
  items?: QuizCard[];
  loading: boolean;
  isSaved: (q: QuizCard) => boolean;
  onSave: (q: QuizCard) => void;
}) {
  return (
    <section id="jlpt" className="relative mt-8 scroll-mt-24">
      <Daruma className="pointer-events-none absolute -top-9 left-1/2 hidden w-16 -translate-x-1/2 lg:block" />
      <Reveal className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex items-start gap-3">
          <Medal className="mt-0.5 size-7 shrink-0 text-brand-500" />
          <div>
            <h2 className="text-lg font-extrabold sm:text-xl">Bộ đề JLPT</h2>
            <p className="text-xs text-muted sm:text-sm">Luyện tập với các bộ đề theo đúng cấu trúc kỳ thi JLPT.</p>
          </div>
        </div>
        <div className="flex min-w-0 items-center gap-3">
          <div className="no-scrollbar flex min-w-0 gap-1.5 overflow-x-auto">
            {LEVELS.map((l) => (
              <button
                key={l}
                onClick={() => setLevel(l)}
                className={`relative h-9 w-14 shrink-0 rounded-lg border text-xs font-semibold transition-colors ${
                  level === l ? "border-brand-500 text-white" : "border-ink/10 bg-white text-ink/80 hover:border-brand-200"
                }`}
              >
                {level === l && <motion.span layoutId="jlpt-tab" className="absolute inset-0 rounded-[7px] bg-brand-500 shadow-md shadow-brand-500/30" />}
                <span className="relative">{l}</span>
              </button>
            ))}
          </div>
          <a href="#jlpt" className="group hidden shrink-0 items-center gap-1 text-xs font-semibold text-brand-500 sm:flex">
            Xem tất cả <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
          </a>
        </div>
      </Reveal>
      {loading && !items ? (
        <SkeletonRow count={5} className="h-[110px]" grid="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5" />
      ) : !items?.length ? (
        <Card className="px-4 py-8 text-center text-sm text-muted">Chưa có bộ đề JLPT {level}.</Card>
      ) : (
        <div className="no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:px-0 lg:grid-cols-3 xl:grid-cols-5">
          <AnimatePresence mode="popLayout">
            {items.map((q, i) => (
              <motion.article
                key={q.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.4, delay: i * 0.05, ease }}
                whileHover={{ y: -4 }}
                className="group w-[78%] shrink-0 snap-start rounded-2xl border border-ink/5 bg-white p-3 shadow-sm transition-shadow hover:shadow-xl hover:shadow-ink/5 sm:w-auto"
              >
                <div className="flex gap-3">
                  <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-500 transition-transform group-hover:rotate-[-6deg]">
                    <FileText className="size-6" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-1">
                      <h3 className="text-[13px] font-bold leading-snug">{q.title}</h3>
                      <SaveBtn saved={isSaved(q)} onSave={() => onSave(q)} />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-muted">
                      <Clock className="size-3.5" /> {q.durationMin} phút
                      <span className="text-ink/20">|</span> {q.questionCount} câu
                    </p>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <StatusView status={q.status} />
                  <Link
                    href={quizHref(q.slug)}
                    className="shrink-0 rounded-lg bg-brand-500 px-5 py-1.5 text-xs font-semibold text-white shadow-md shadow-brand-500/25 transition hover:bg-brand-600"
                  >
                    {q.status.kind === "progress" ? "Tiếp tục" : q.status.kind === "done" ? "Làm lại" : "Làm bài"}
                  </Link>
                </div>
              </motion.article>
            ))}
          </AnimatePresence>
        </div>
      )}
    </section>
  );
}

/** Búp bê Daruma trang trí phía trên mục Bộ đề JLPT. */
function Daruma({ className = "" }: { className?: string }) {
  return (
    <motion.svg
      viewBox="0 0 80 70"
      className={className}
      aria-hidden
      animate={{ rotate: [-6, 6, -6] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "50% 100%" }}
    >
      <ellipse cx="40" cy="44" rx="34" ry="30" fill="#d62f33" />
      <ellipse cx="40" cy="38" rx="20" ry="17" fill="#fff4ea" />
      <circle cx="33" cy="36" r="5" fill="#fff" stroke="#1d1d2b" strokeWidth="1.5" />
      <circle cx="47" cy="36" r="5" fill="#fff" stroke="#1d1d2b" strokeWidth="1.5" />
      <circle cx="33" cy="36" r="2.2" fill="#1d1d2b" />
      <path d="M27 29 Q33 25 38 29 M42 29 Q47 25 53 29" stroke="#1d1d2b" strokeWidth="2" fill="none" strokeLinecap="round" />
      <path d="M33 47 Q40 51 47 47" stroke="#1d1d2b" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <path d="M22 60 Q40 68 58 60" stroke="#f5c542" strokeWidth="3" fill="none" strokeLinecap="round" />
    </motion.svg>
  );
}
