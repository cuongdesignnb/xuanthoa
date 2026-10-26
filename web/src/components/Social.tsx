"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Quote, Star } from "lucide-react";
import { SectionHeading, avatar } from "./ui";
import { useHomeData } from "./home-data";
import Pricing from "./Pricing";

export default function Social() {
  const [page, setPage] = useState(0);
  const [dir, setDir] = useState(1);
  const { data: home } = useHomeData();
  const REVIEWS = home?.testimonials ?? [];
  const per = 3;
  const pages = Math.max(1, Math.ceil(REVIEWS.length / per));
  const go = (d: number) => {
    setDir(d);
    setPage((p) => (p + d + pages) % pages);
  };
  const shown = REVIEWS.length ? Array.from({ length: Math.min(per, REVIEWS.length) }, (_, i) => REVIEWS[(page * per + i) % REVIEWS.length]) : [];

  return (
    <section className="mx-auto grid max-w-7xl grid-cols-1 gap-12 [&>*]:min-w-0 px-4 py-14 sm:px-6 lg:grid-cols-2 lg:gap-10">
      {/* Testimonials */}
      <div>
        <div className="flex items-end justify-between gap-4">
          <SectionHeading
            title="Học viên nói gì về Nihongo+?"
            subtitle="Hàng chục nghìn học viên đã tin tưởng và đạt được mục tiêu cùng chúng tôi."
          />
          <div className="mb-5 flex gap-2">
            {[
              [-1, ChevronLeft, "Trước"],
              [1, ChevronRight, "Sau"],
            ].map(([d, Icon, label]) => {
              const I = Icon as typeof ChevronLeft;
              return (
                <motion.button
                  key={label as string}
                  whileTap={{ scale: 0.9 }}
                  aria-label={label as string}
                  onClick={() => go(d as number)}
                  className="grid size-9 place-items-center rounded-full border border-ink/10 bg-white transition hover:border-brand-300 hover:text-brand-500"
                >
                  <I className="size-4" />
                </motion.button>
              );
            })}
          </div>
        </div>
        <div className="relative overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false} custom={dir}>
            <motion.div
              key={page}
              custom={dir}
              initial={{ x: dir * 60, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: dir * -60, opacity: 0 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              onDragEnd={(_, info) => {
                if (info.offset.x < -60) go(1);
                else if (info.offset.x > 60) go(-1);
              }}
              className="grid cursor-grab gap-3 active:cursor-grabbing sm:grid-cols-3"
            >
              {!home &&
                [0, 1, 2].map((i) => <div key={i} className={`h-48 animate-pulse rounded-2xl bg-ink/[.05] ${i > 0 ? "hidden sm:block" : ""}`} />)}
              {shown.map((r, i) => (
                <article
                  key={`${r.id}-${i}`}
                  className={`relative flex flex-col rounded-2xl border border-ink/5 bg-white p-4 shadow-sm ${i > 0 ? "hidden sm:flex" : ""}`}
                >
                  <Quote className="absolute right-3 top-3 size-6 text-brand-100" />
                  <p className="mb-4 pr-5 text-[13px] italic leading-relaxed text-ink/80">“{r.content}”</p>
                  <div className="mt-auto flex items-center gap-3 border-t border-ink/5 pt-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={r.avatarUrl || avatar(r.authorName)} alt="" className="size-10 shrink-0 rounded-full" />
                    <div>
                      <div className="flex gap-0.5">
                        {Array.from({ length: 5 }).map((_, k) => (
                          <Star key={k} className={`size-3 ${k < r.rating ? "fill-amber-400 text-amber-400" : "text-ink/15"}`} />
                        ))}
                      </div>
                      <p className="mt-0.5 text-sm font-bold">{r.authorName}</p>
                      <p className="text-[11px] text-muted">{r.authorRole}</p>
                    </div>
                  </div>
                </article>
              ))}
            </motion.div>
          </AnimatePresence>
        </div>
        <div className="mt-4 flex justify-center gap-1.5">
          {Array.from({ length: pages }).map((_, i) => (
            <button
              key={i}
              aria-label={`Trang ${i + 1}`}
              onClick={() => {
                setDir(i > page ? 1 : -1);
                setPage(i);
              }}
              className={`h-1.5 rounded-full transition-all ${i === page ? "w-6 bg-brand-500" : "w-1.5 bg-ink/15"}`}
            />
          ))}
        </div>
      </div>

      {/* Pricing */}
      <Pricing />
    </section>
  );
}
