"use client";

import { useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { ArrowRight, BookOpen, Check, ChevronRight, Crown, Download, Eye, FileText, Gift, ListChecks } from "lucide-react";
import { Reveal, avatar } from "../ui";
import { PostCover } from "./Cover";
import { fileSize, type FreeResource, type PostCard } from "./types";
import { api, compact } from "@/lib/api";
import { useApi } from "@/lib/hooks";

function BoxHead({ icon, title, href = "/blog" }: { icon: React.ReactNode; title: string; href?: string }) {
  return (
    <div className="mb-4 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2.5 text-lg font-extrabold">
        {icon}
        {title}
      </h2>
      <Link href={href} className="group flex shrink-0 items-center gap-1 text-[11px] font-semibold text-brand-500">
        Xem tất cả <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-1" />
      </Link>
    </div>
  );
}

const FILE_ICON = {
  pdf: (
    <span className="grid h-8 w-7 place-items-center rounded-[4px] bg-brand-500 text-[8px] font-bold text-white">PDF</span>
  ),
  doc: (
    <span className="grid h-8 w-7 place-items-center rounded-[4px] bg-sky-500 text-white">
      <FileText className="size-4" />
    </span>
  ),
  test: (
    <span className="grid h-8 w-7 place-items-center rounded-[4px] bg-violet-500 text-white">
      <ListChecks className="size-4" />
    </span>
  ),
};

const fileKind = (r: FreeResource): keyof typeof FILE_ICON => {
  const t = r.title.toLowerCase();
  if (/đề|test|thi thử/.test(t)) return "test";
  if (/ngữ pháp|bảng|doc/.test(t) || /DOC/i.test(r.fileType)) return "doc";
  return "pdf";
};

function RowSkeleton({ h = "h-[54px]" }: { h?: string }) {
  return <div className={`${h} animate-pulse rounded-lg bg-ink/[.05]`} />;
}

export default function Sidebar() {
  const [done, setDone] = useState<Record<string, number>>({});
  const [busy, setBusy] = useState<string | null>(null);
  const featured = useApi<{ items: PostCard[] }>("/public/posts/featured?limit=3");
  const resources = useApi<{ items: FreeResource[] }>("/public/resources?free=1&limit=3");
  const guides = useApi<{ items: PostCard[] }>("/public/posts/guides");

  const download = async (r: FreeResource) => {
    setBusy(r.id);
    try {
      const res = await api<{ fileUrl: string; downloads: number }>(`/public/resources/${r.id}/download`, { method: "POST" });
      setDone((d) => ({ ...d, [r.id]: res.downloads }));
      const a = document.createElement("a");
      a.href = res.fileUrl;
      a.download = "";
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch {
      /* lỗi mạng: giữ nguyên nút để thử lại */
    } finally {
      setBusy(null);
    }
  };

  return (
    <aside className="space-y-4">
      {/* Bài viết nổi bật */}
      <Reveal className="rounded-xl border border-ink/5 bg-white p-4 shadow-sm">
        <BoxHead icon={<Crown className="size-5 fill-amber-400 text-amber-500" />} title="Bài viết nổi bật" />
        <ol className="space-y-3">
          {featured.loading && [0, 1, 2].map((i) => <RowSkeleton key={i} />)}
          {featured.data?.items.map((f, i) => (
            <motion.li key={f.id} whileHover={{ x: 4 }}>
              <Link href={`/blog/${f.slug}`} className="group flex items-center gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-100 text-sm font-bold text-brand-500 transition-colors group-hover:bg-brand-500 group-hover:text-white">
                  {i + 1}
                </span>
                <span className="relative h-[54px] w-[108px] shrink-0 overflow-hidden rounded-md">
                  <PostCover post={f} small sizes="110px" />
                </span>
                <span className="min-w-0">
                  <span className="line-clamp-2 text-[12.5px] font-semibold leading-snug transition-colors group-hover:text-brand-500">
                    {f.title}
                  </span>
                  <span className="mt-1.5 flex items-center gap-2 text-[10px] text-muted">
                    <Eye className="size-3.5" /> {compact(f.views)} lượt xem <span>•</span> {f.readMin} phút đọc
                  </span>
                </span>
              </Link>
            </motion.li>
          ))}
          {featured.data && !featured.data.items.length && <li className="text-xs text-muted">Chưa có bài viết nổi bật.</li>}
        </ol>
      </Reveal>

      {/* Tài liệu miễn phí */}
      <Reveal delay={0.05} className="rounded-xl border border-ink/5 bg-white p-4 shadow-sm">
        <BoxHead icon={<Gift className="size-6 text-brand-500" />} title="Tài liệu miễn phí" />
        <ul className="space-y-2">
          {resources.loading && [0, 1, 2].map((i) => <RowSkeleton key={i} h="h-11" />)}
          {resources.data?.items.map((r) => {
            const ok = done[r.id] !== undefined;
            return (
              <li key={r.id} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover:bg-brand-50/60">
                <span className="ml-2 shrink-0">{FILE_ICON[fileKind(r)]}</span>
                <span className="ml-2 min-w-0 flex-1">
                  <span className="block truncate text-[12px] font-semibold">{r.title}</span>
                  <span className="mt-0.5 block text-[10px] text-muted">
                    {r.fileType} • {fileSize(r.sizeBytes)} • {(done[r.id] ?? r.downloads).toLocaleString("en-US")}+ lượt tải
                  </span>
                </span>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.94 }}
                  disabled={busy === r.id}
                  onClick={() => download(r)}
                  className={`flex w-[90px] shrink-0 items-center justify-center gap-1.5 rounded-md py-1.5 text-[10px] font-semibold text-white shadow-sm transition-colors disabled:opacity-70 ${
                    ok ? "bg-emerald-500" : "bg-brand-500 hover:bg-brand-600"
                  }`}
                >
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.span
                      key={ok ? "ok" : "dl"}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -6 }}
                      className="flex items-center gap-1.5"
                    >
                      {ok ? <Check className="size-3.5" /> : <Download className="size-3.5" />}
                      {ok ? "Đã tải" : "Tải về"}
                    </motion.span>
                  </AnimatePresence>
                </motion.button>
              </li>
            );
          })}
          {resources.data && !resources.data.items.length && <li className="text-xs text-muted">Chưa có tài liệu.</li>}
        </ul>
      </Reveal>

      {/* Cẩm nang */}
      <Reveal delay={0.1} className="rounded-xl border border-ink/5 bg-gradient-to-br from-brand-50 to-white p-4 shadow-sm">
        <BoxHead
          icon={<BookOpen className="size-6 text-brand-500" />}
          title="Cẩm nang cho người mới bắt đầu"
          href={guides.data?.items[0] ? `/blog/${guides.data.items[0].slug}` : "/blog"}
        />
        <div className="flex items-center gap-3">
          <div className="relative hidden h-[100px] w-[118px] shrink-0 overflow-hidden rounded-xl bg-white sm:block">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={avatar("Hana-guide", "fff4f4")} alt="" className="absolute inset-0 size-full object-cover" />
            <span className="absolute bottom-2 right-2 grid h-9 w-7 rotate-6 place-items-center rounded bg-white shadow">
              <ListChecks className="size-4 text-brand-500" />
            </span>
          </div>
          <ul className="min-w-0 flex-1 divide-y divide-ink/5">
            {guides.loading && [0, 1, 2, 3].map((i) => <li key={i} className="py-1.5"><div className="h-4 animate-pulse rounded bg-ink/[.05]" /></li>)}
            {guides.data?.items.map((g) => (
              <li key={g.id}>
                <Link href={`/blog/${g.slug}`} className="group flex items-center gap-2 py-1.5 text-[11.5px] transition-colors hover:text-brand-500">
                  <ChevronRight className="size-3 shrink-0 text-brand-500" />
                  <span className="min-w-0 flex-1 truncate">{g.title}</span>
                  <ChevronRight className="size-3.5 shrink-0 text-ink/40 transition-transform group-hover:translate-x-1" />
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Reveal>
    </aside>
  );
}
