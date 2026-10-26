"use client";

import { useApi } from "@/lib/hooks";
import type { Review } from "./teachers/types";

/** Dữ liệu tổng hợp trang chủ (GET /public/home) — dùng chung Hero, Experience, Social, trang giáo viên. */
export type HomeData = {
  stats: { students: number; teachers: number; avgRating: number; ratingCount: number; posts: number; subscribers: number };
  teachers: {
    id: string;
    slug: string;
    name: string;
    avatarUrl: string | null;
    avatarSeed: string | null;
    avatarBg: string | null;
    levelRange: string | null;
    badge: string | null;
    native: boolean;
    yearsExp: number;
    bio: string | null;
    rating: number;
  }[];
  testimonials: Review[];
  studentAvatars: { name: string; avatarUrl: string | null }[];
};

export const useHomeData = () => useApi<HomeData>("/public/home", { dedupeMs: 60_000 });
