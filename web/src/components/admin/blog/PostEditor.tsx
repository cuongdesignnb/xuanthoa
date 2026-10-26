"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { CalendarClock, Copy, Crown, ExternalLink, Eye, Globe, Send, Save, Sparkles, Trash2, Wand2 } from "lucide-react";
import { Badge, Button, ErrorState, Field, ImageInput, Input, Panel, Select, Skeleton, Switch, Textarea, cx, toast, useConfirm } from "@/components/admin/ui";
import { PageHeader, useForm } from "@/components/admin/page";
import RichTextEditor from "@/components/admin/editor/RichTextEditor";
import Cover from "@/components/blog/Cover";
import { COVER_KINDS, type CoverKind } from "@/components/blog/types";
import { api, fmtDate, num } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import { PostStatus, type PostMeta } from "./BlogAdmin";

type Post = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string | null;
  category: string;
  coverUrl: string | null;
  coverStyle: { kind?: CoverKind } | null;
  authorId: string | null;
  readMin: number;
  views: number;
  featured: boolean;
  guide: boolean;
  status: "draft" | "review" | "published" | "archived";
  publishedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

const KIND_LABEL: Record<CoverKind, string> = {
  grammar: "Ngữ pháp",
  kanji: "Kanji",
  jlpt: "JLPT",
  culture: "Văn hóa",
  tips: "Mẹo học",
  study: "Du học",
  fuji: "Phú Sĩ",
  kana: "Kana",
};

/** ISO → giá trị input datetime-local theo giờ máy. */
const toLocal = (d: string | null) => {
  if (!d) return "";
  const x = new Date(d);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${x.getFullYear()}-${p(x.getMonth() + 1)}-${p(x.getDate())}T${p(x.getHours())}:${p(x.getMinutes())}`;
};
const slugify = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
const textLen = (html: string) => html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();

export default function PostEditor({ id }: { id: string }) {
  const isNew = id === "new";
  const { data, error, reload } = useApi<Post>(isNew ? null : `/admin/posts/${id}`, { dedupeMs: 0 });
  const meta = useApi<PostMeta>("/admin/posts/meta");
  if (!isNew && error) return <ErrorState error={error} onRetry={reload} />;
  if ((!isNew && !data) || !meta.data)
    return (
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-3">
          <Skeleton className="h-10 w-2/3" />
          <Skeleton className="h-12" />
          <Skeleton className="h-96" />
        </div>
        <Skeleton className="h-[520px]" />
      </div>
    );
  return <Editor key={data?.id ?? "new"} post={data ?? null} meta={meta.data} />;
}

function Editor({ post, meta }: { post: Post | null; meta: PostMeta }) {
  const router = useRouter();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("posts.write");
  const f = useForm({
    title: post?.title ?? "",
    slug: post?.slug ?? "",
    excerpt: post?.excerpt ?? "",
    content: post?.content ?? "",
    category: post?.category ?? meta.categories[0]?.value ?? "",
    authorId: post?.authorId ?? "",
    coverUrl: post?.coverUrl ?? null,
    coverKind: (post?.coverStyle?.kind ?? "fuji") as CoverKind,
    featured: post?.featured ?? false,
    guide: post?.guide ?? false,
    readMin: post?.readMin ?? null,
  });
  const [slugTouched, setSlugTouched] = useState(!!post);
  const [schedule, setSchedule] = useState(post?.publishedAt && new Date(post.publishedAt) > new Date() ? toLocal(post.publishedAt) : "");
  const [busy, setBusy] = useState<string | null>(null);
  const scheduled = post?.status === "published" && !!post.publishedAt && new Date(post.publishedAt) > new Date();
  const live = post?.status === "published" && !scheduled;
  const v = f.values;
  const words = textLen(v.content).split(" ").filter(Boolean).length;

  const save = async (mode: "draft" | "review" | "publish" | "schedule" | "update") => {
    const body: Record<string, unknown> = {
      title: v.title,
      slug: v.slug || null,
      excerpt: v.excerpt || null,
      content: v.content || null,
      category: v.category,
      authorId: v.authorId || null,
      coverUrl: v.coverUrl,
      coverStyle: { kind: v.coverKind },
      featured: v.featured,
      guide: v.guide,
      readMin: v.readMin || null,
    };
    if (mode === "draft") body.status = "draft";
    if (mode === "review") body.status = "review";
    if (mode === "publish") {
      body.status = "published";
      body.publishedAt = live && post?.publishedAt ? post.publishedAt : new Date().toISOString();
    }
    if (mode === "schedule") {
      if (!schedule || new Date(schedule) <= new Date()) {
        toast.error("Chọn thời điểm hẹn giờ trong tương lai");
        return;
      }
      body.status = "published";
      body.publishedAt = new Date(schedule).toISOString();
    }
    setBusy(mode);
    try {
      const saved = await f.submit((b) =>
        post ? api<Post>(`/admin/posts/${post.id}`, { method: "PATCH", body: { ...body, title: b.title } }) : api<Post>("/admin/posts", { body }),
      );
      invalidate("/admin/posts");
      invalidate("/public/posts");
      toast.success(
        mode === "publish" ? "Đã xuất bản bài viết" : mode === "schedule" ? `Đã hẹn giờ đăng ${fmtDate(body.publishedAt as string, true)}` : mode === "review" ? "Đã gửi duyệt" : "Đã lưu",
      );
      if (!post && saved) router.replace(`/admin/blog/${saved.id}`);
    } catch (e) {
      toast.error(e);
    } finally {
      setBusy(null);
    }
  };

  const duplicate = async () => {
    if (!post) return;
    try {
      const r = await api<{ id: string }>(`/admin/posts/${post.id}/duplicate`, { method: "POST" });
      invalidate("/admin/posts");
      toast.success("Đã nhân bản thành bản nháp");
      router.push(`/admin/blog/${r.id}`);
    } catch (e) {
      toast.error(e);
    }
  };
  const remove = async () => {
    if (!post || !(await confirm({ title: "Xoá bài viết này?", message: post.title, danger: true, confirmText: "Xoá" }))) return;
    try {
      await api(`/admin/posts/${post.id}`, { method: "DELETE" });
      invalidate("/admin/posts");
      invalidate("/public/posts");
      toast.success("Đã xoá bài viết");
      router.push("/admin/blog");
    } catch (e) {
      toast.error(e);
    }
  };

  const seoTitle = `${v.title || "Tiêu đề bài viết"} | Blog Nihongo+`;
  const seoDesc = v.excerpt || textLen(v.content).slice(0, 160) || "Mô tả ngắn sẽ hiển thị trên Google và khi chia sẻ mạng xã hội.";

  return (
    <div>
      <PageHeader
        title={post ? "Chỉnh sửa bài viết" : "Viết bài mới"}
        crumbs={[{ label: "Blog & Tài nguyên", href: "/admin/blog" }, { label: post ? post.title : "Bài mới" }]}
        subtitle={
          post ? (
            <span className="flex flex-wrap items-center gap-2">
              <PostStatus p={{ status: post.status, scheduled }} />
              <span>Cập nhật {fmtDate(post.updatedAt, true)}</span>
              <span className="flex items-center gap-1">
                <Eye className="size-3.5" /> {num(post.views)} lượt xem
              </span>
            </span>
          ) : (
            "Soạn nội dung, chọn ảnh bìa và xuất bản hoặc hẹn giờ đăng."
          )
        }
        actions={
          post && (
            <>
              <Link href={`/blog/${post.slug}`} target="_blank">
                <Button variant="outline" icon={<ExternalLink className="size-4" />}>
                  {live ? "Xem trên website" : "Xem trước"}
                </Button>
              </Link>
              {canWrite && (
                <Button variant="ghost" icon={<Copy className="size-4" />} onClick={duplicate}>
                  Nhân bản
                </Button>
              )}
            </>
          )
        }
      />

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px] [&>*]:min-w-0">
        <div className="space-y-4">
          <Panel title="Nội dung" bodyClassName="space-y-4">
            <Field label="Tiêu đề" required error={f.errors.title}>
              <Input
                value={v.title}
                onChange={(e) => {
                  f.set("title", e.target.value);
                  if (!slugTouched) f.set("slug", slugify(e.target.value));
                }}
                placeholder="VD: 10 cấu trúc ngữ pháp N3 quan trọng"
                className="h-12 text-base font-semibold"
              />
            </Field>
            <Field label="Đường dẫn (slug)" error={f.errors.slug} hint={`nihongo.vn/blog/${v.slug || "…"}`}>
              <div className="flex gap-2">
                <Input
                  value={v.slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    f.set("slug", slugify(e.target.value));
                  }}
                  placeholder="tu-dong-tao-tu-tieu-de"
                />
                <Button variant="ghost" icon={<Wand2 className="size-4" />} onClick={() => (setSlugTouched(false), f.set("slug", slugify(v.title)))}>
                  Tạo lại
                </Button>
              </div>
            </Field>
            <Field label="Mô tả ngắn" hint={`${v.excerpt.length}/200 ký tự · hiển thị trên thẻ bài viết và Google`} error={f.errors.excerpt}>
              <Textarea rows={3} maxLength={300} value={v.excerpt} onChange={f.input("excerpt")} placeholder="Tóm tắt 1–2 câu về nội dung bài viết" />
            </Field>
            <Field label="Nội dung bài viết" error={f.errors.content} hint={`${num(words)} từ · khoảng ${Math.max(1, Math.round(words / 220))} phút đọc`}>
              <RichTextEditor value={v.content} onChange={(html) => f.set("content", html)} toolbar="full" minHeight={460} placeholder="Bắt đầu viết… (hỗ trợ furigana, tiếng Nhật, ảnh, bảng, video)" />
            </Field>
          </Panel>

          <Panel title="Xem trước SEO" icon={<Globe className="size-4 text-brand-500" />}>
            <div className="rounded-xl border border-ink/5 bg-white p-4">
              <p className="flex items-center gap-2 text-xs text-ink/60">
                <span className="grid size-6 place-items-center rounded-full bg-brand-50 text-[10px] font-bold text-brand-500">N+</span>
                nihongo.vn › blog › {v.slug || "…"}
              </p>
              <p className="mt-1 line-clamp-1 text-lg text-[#1a0dab]">{seoTitle}</p>
              <p className="mt-0.5 line-clamp-2 text-[13px] text-ink/70">{seoDesc}</p>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <Badge tone={v.title.length >= 20 && v.title.length <= 65 ? "green" : "amber"}>Tiêu đề {v.title.length} ký tự</Badge>
              <Badge tone={seoDesc.length >= 70 && seoDesc.length <= 160 ? "green" : "amber"}>Mô tả {seoDesc.length} ký tự</Badge>
              <Badge tone={words >= 300 ? "green" : "amber"}>{num(words)} từ</Badge>
            </div>
          </Panel>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <Panel title="Xuất bản" icon={<Send className="size-4 text-brand-500" />} bodyClassName="space-y-3">
            {post?.publishedAt && (
              <p className="text-xs text-muted">
                {scheduled ? "Hẹn giờ đăng lúc " : "Đã đăng lúc "}
                <b className={scheduled ? "text-sky-600" : "text-ink"}>{fmtDate(post.publishedAt, true)}</b>
              </p>
            )}
            {canWrite ? (
              <>
                <Button className="w-full" icon={<Send className="size-4" />} loading={busy === "publish"} onClick={() => save("publish")}>
                  {live ? "Cập nhật bài viết" : "Xuất bản ngay"}
                </Button>
                <div className="grid grid-cols-2 gap-2">
                  <Button variant="outline" icon={<Save className="size-4" />} loading={busy === "draft"} onClick={() => save("draft")}>
                    {live ? "Gỡ về nháp" : "Lưu nháp"}
                  </Button>
                  <Button variant="soft" loading={busy === "review"} onClick={() => save("review")}>
                    Gửi duyệt
                  </Button>
                </div>
                <div className="rounded-xl bg-sky-50/70 p-3">
                  <p className="flex items-center gap-1.5 text-xs font-semibold text-sky-700">
                    <CalendarClock className="size-4" /> Hẹn giờ đăng
                  </p>
                  <div className="mt-2 flex gap-2">
                    <Input type="datetime-local" value={schedule} onChange={(e) => setSchedule(e.target.value)} className="h-9 text-xs" />
                    <Button size="sm" variant="dark" loading={busy === "schedule"} onClick={() => save("schedule")} disabled={!schedule}>
                      Hẹn
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-xs text-muted">Bạn chỉ có quyền xem bài viết.</p>
            )}
          </Panel>

          <Panel title="Phân loại" bodyClassName="space-y-3">
            <Field label="Danh mục" required error={f.errors.category}>
              <Select value={v.category} onChange={f.input("category")} options={meta.categories} />
            </Field>
            <Field label="Tác giả (giáo viên)" error={f.errors.authorId}>
              <Select value={v.authorId} onChange={f.input("authorId")} placeholder="— Không ghi tác giả —" options={meta.authors} />
            </Field>
            <Field label="Thời gian đọc (phút)" hint="Để trống để tự tính từ nội dung">
              <Input type="number" min={1} max={120} value={v.readMin ?? ""} onChange={f.input("readMin")} placeholder={String(Math.max(1, Math.round(words / 220)))} />
            </Field>
            <div className="space-y-2 pt-1">
              <Switch
                checked={v.featured}
                onChange={(x) => f.set("featured", x)}
                label={
                  <span className="flex items-center gap-1.5">
                    <Crown className="size-4 text-amber-500" /> Bài viết nổi bật
                  </span>
                }
              />
              <Switch
                checked={v.guide}
                onChange={(x) => f.set("guide", x)}
                label={
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="size-4 text-violet-500" /> Cẩm nang cho người mới
                  </span>
                }
              />
            </div>
          </Panel>

          <Panel title="Ảnh bìa">
            <ImageInput value={v.coverUrl} onChange={(url) => f.set("coverUrl", url)} folder="blog" aspect="aspect-[290/143]" />
            {!v.coverUrl && (
              <>
                <p className="mb-2 mt-3 text-xs font-semibold text-ink/70">Hoặc chọn bìa minh hoạ có sẵn</p>
                <div className="grid grid-cols-4 gap-2">
                  {COVER_KINDS.map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => f.set("coverKind", k)}
                      className={cx("group text-center", v.coverKind === k ? "text-brand-600" : "text-muted")}
                      title={KIND_LABEL[k]}
                    >
                      <span className={cx("relative block aspect-[4/3] overflow-hidden rounded-lg ring-2 transition", v.coverKind === k ? "ring-brand-500" : "ring-transparent group-hover:ring-brand-200")}>
                        <Cover kind={k} small sizes="80px" />
                      </span>
                      <span className="mt-0.5 block text-[10px] font-medium">{KIND_LABEL[k]}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </Panel>

          {post && canWrite && (
            <Button variant="ghost" className="w-full text-red-600 hover:bg-red-50" icon={<Trash2 className="size-4" />} onClick={remove}>
              Xoá bài viết
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
