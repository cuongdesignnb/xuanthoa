"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Copy, ExternalLink, Save, Send, Trash2 } from "lucide-react";
import {
  Badge,
  Button,
  Card,
  ErrorState,
  Field,
  ImageInput,
  Input,
  Select,
  Spinner,
  StatusBadge,
  Switch,
  Tabs,
  TagInput,
  Textarea,
  toast,
  useConfirm,
} from "@/components/admin/ui";
import { PageHeader, useForm } from "@/components/admin/page";
import RichTextEditor from "@/components/admin/editor/RichTextEditor";
import { api, num, vnd } from "@/lib/api";
import { invalidate, useApi } from "@/lib/hooks";
import { useAuth } from "@/lib/auth";
import type { CoverStyle } from "@/components/courses/types";
import { DEFAULT_COVER } from "@/components/courses/cover-presets";
import CoverEditor from "./CoverEditor";
import Curriculum, { type AdminModule } from "./Curriculum";
import { CourseReviews, CourseStudents } from "./CourseExtras";
import { CATEGORIES, LEVEL_OPTIONS, STATUS_OPTIONS } from "./CourseList";
import { ResourcesEditor, type Resource } from "./LessonEditor";

export type AdminCourse = {
  id: string;
  slug: string;
  title: string;
  subtitle: string | null;
  description: string | null;
  level: string | null;
  category: string;
  goals: string[];
  outcomes: string[];
  tags: string[];
  formats: string[];
  format: string;
  coverUrl: string | null;
  coverStyle: CoverStyle | null;
  badge: string | null;
  teacherId: string | null;
  price: number;
  salePrice: number | null;
  saleEndsAt: string | null;
  durationHours: number;
  weeks: number | null;
  rating: number;
  ratingCount: number;
  studentCount: number;
  featured: boolean;
  status: "draft" | "review" | "published" | "archived";
  paidOrders: number;
  modules: AdminModule[];
};

type TabId = "info" | "curriculum" | "students" | "reviews";

const FORMATS = ["Video bài giảng", "Lộ trình tự học", "Lớp học trực tuyến", "Kết hợp (Blended)"];
const GOALS = ["Học từ đầu", "Luyện thi JLPT", "Giao tiếp hằng ngày", "Tiếng Nhật cho công việc", "Đọc hiểu - Viết", "Kanji - Hán tự"];
const TAGS = ["JLPT", "Giao tiếp", "Kanji"];

/** ISO → giá trị cho <input type="datetime-local"> (giờ địa phương). */
const toLocal = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
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

function emptyForm() {
  return {
    title: "",
    slug: "",
    subtitle: "",
    description: "",
    level: "N5",
    category: "level",
    goals: [] as string[],
    outcomes: [] as string[],
    tags: [] as string[],
    formats: ["Video bài giảng"] as string[],
    coverMode: "style" as "image" | "style",
    coverUrl: null as string | null,
    coverStyle: DEFAULT_COVER as CoverStyle | null,
    badge: "",
    teacherId: "",
    price: 0 as number | null,
    salePrice: null as number | null,
    saleEndsAt: "",
    durationHours: 0 as number | null,
    weeks: null as number | null,
    featured: false,
    status: "draft",
  };
}
type FormValues = ReturnType<typeof emptyForm>;

function fromCourse(c: AdminCourse): FormValues {
  return {
    title: c.title,
    slug: c.slug,
    subtitle: c.subtitle ?? "",
    description: c.description ?? "",
    level: c.level ?? "",
    category: c.category,
    goals: c.goals,
    outcomes: c.outcomes,
    tags: c.tags,
    formats: c.formats,
    coverMode: c.coverUrl ? "image" : "style",
    coverUrl: c.coverUrl,
    coverStyle: c.coverStyle ?? (DEFAULT_COVER as CoverStyle),
    badge: c.badge ?? "",
    teacherId: c.teacherId ?? "",
    price: c.price,
    salePrice: c.salePrice,
    saleEndsAt: toLocal(c.saleEndsAt),
    durationHours: c.durationHours,
    weeks: c.weeks,
    featured: c.featured,
    status: c.status,
  };
}

function toBody(v: FormValues) {
  return {
    title: v.title,
    slug: v.slug || null,
    subtitle: v.subtitle || null,
    description: v.description || null,
    level: v.level || null,
    category: v.category,
    goals: v.goals,
    outcomes: v.outcomes,
    tags: v.tags,
    formats: v.formats,
    format: v.formats.includes("Lớp học trực tuyến") ? "live" : "video",
    coverUrl: v.coverMode === "image" ? v.coverUrl : null,
    coverStyle: v.coverStyle,
    badge: v.badge || null,
    teacherId: v.teacherId || null,
    price: v.price ?? 0,
    salePrice: v.salePrice ?? null,
    saleEndsAt: v.saleEndsAt ? new Date(v.saleEndsAt).toISOString() : null,
    durationHours: v.durationHours ?? 0,
    weeks: v.weeks ?? null,
    featured: v.featured,
    status: v.status,
  };
}

export default function CourseEditor({ id }: { id?: string }) {
  const isNew = !id;
  const { data, error, loading, reload, mutate } = useApi<AdminCourse>(id ? `/admin/courses/${id}` : null, { dedupeMs: 0 });
  if (!isNew && loading)
    return (
      <div className="grid min-h-[50vh] place-items-center">
        <Spinner />
      </div>
    );
  if (!isNew && (error || !data)) return <ErrorState error={error ?? new Error("Không tìm thấy khóa học")} onRetry={reload} />;
  return <EditorBody key={data?.id ?? "new"} course={data ?? null} reload={reload} setModules={(m) => mutate((p) => (p ? { ...p, modules: m } : p!))} />;
}

function EditorBody({ course, reload, setModules }: { course: AdminCourse | null; reload: () => void; setModules: (m: AdminModule[]) => void }) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const confirm = useConfirm();
  const { can } = useAuth();
  const canWrite = can("courses.write");
  const isNew = !course;
  const tab = ((course && (sp.get("tab") as TabId)) || "info") as TabId;
  const setTab = (t: TabId) => router.replace(`${pathname}${t === "info" ? "" : `?tab=${t}`}`, { scroll: false });

  const f = useForm<FormValues>(course ? fromCourse(course) : emptyForm());
  const v = f.values;
  const [slugTouched, setSlugTouched] = useState(!!course);
  const teachers = useApi<{ value: string; label: string }[]>("/admin/options/teachers");

  // Cảnh báo khi rời trang chưa lưu
  useEffect(() => {
    if (!f.dirty) return;
    const h = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", h);
    return () => window.removeEventListener("beforeunload", h);
  }, [f.dirty]);

  const save = async (patch?: Partial<FormValues>) => {
    if (patch) f.setValues((s) => ({ ...s, ...patch }));
    try {
      const body = toBody({ ...v, ...patch });
      const r = await f.submit(() =>
        isNew ? api<{ id: string }>("/admin/courses", { body }) : api<{ id: string; slug: string }>(`/admin/courses/${course!.id}`, { method: "PATCH", body }),
      );
      invalidate("/admin/courses");
      invalidate("/public/courses");
      if (isNew && r) {
        toast.success("Đã tạo khóa học — tiếp tục xây dựng chương trình học");
        router.replace(`/admin/khoa-hoc/${r.id}?tab=curriculum`);
      } else {
        toast.success(patch?.status === "published" ? "Đã xuất bản khóa học" : "Đã lưu thay đổi");
        reload();
      }
    } catch (e) {
      toast.error(e);
    }
  };

  const duplicate = async () => {
    try {
      const r = await api<{ id: string }>(`/admin/courses/${course!.id}/duplicate`, { method: "POST" });
      invalidate("/admin/courses");
      toast.success("Đã nhân bản khóa học");
      router.push(`/admin/khoa-hoc/${r.id}`);
    } catch (e) {
      toast.error(e);
    }
  };

  const remove = async () => {
    const ok = await confirm({ title: `Xoá khóa học “${course!.title}”?`, message: "Thao tác không thể hoàn tác.", confirmText: "Xoá", danger: true });
    if (!ok) return;
    try {
      await api(`/admin/courses/${course!.id}`, { method: "DELETE" });
      invalidate("/admin/courses");
      toast.success("Đã xoá khóa học");
      router.push("/admin/khoa-hoc");
    } catch (e) {
      toast.error(e);
    }
  };

  const goTab = async (t: TabId) => {
    if (t !== "info" && f.dirty && !(await confirm({ title: "Thông tin chưa được lưu", message: "Các thay đổi ở tab Thông tin vẫn được giữ khi bạn quay lại, nhưng nhớ bấm Lưu nhé." })))
      return;
    setTab(t);
  };

  const lessons = course?.modules.reduce((s, m) => s + m.lessons.length, 0) ?? 0;

  return (
    <div>
      <PageHeader
        title={isNew ? "Tạo khóa học" : course.title}
        subtitle={
          isNew ? (
            "Điền thông tin cơ bản, sau đó xây dựng chương trình học."
          ) : (
            <span className="flex flex-wrap items-center gap-2">
              <StatusBadge status={course.status} />
              <span>/khoa-hoc/{course.slug}</span>
              <span>· {course.modules.length} chương · {lessons} bài học</span>
              {course.paidOrders > 0 && <Badge tone="blue">{num(course.paidOrders)} đơn đã thanh toán</Badge>}
            </span>
          )
        }
        crumbs={[{ label: "Tổng quan", href: "/admin" }, { label: "Khóa học", href: "/admin/khoa-hoc" }, { label: isNew ? "Tạo mới" : "Chỉnh sửa" }]}
        actions={
          <>
            {f.dirty && <span className="self-center text-xs font-semibold text-amber-600">● Chưa lưu</span>}
            {!isNew && (
              <>
                <Link href={`/khoa-hoc/${course.slug}`} target="_blank">
                  <Button variant="ghost" icon={<ExternalLink className="size-4" />}>
                    Xem trang
                  </Button>
                </Link>
                {canWrite && (
                  <Button variant="ghost" icon={<Copy className="size-4" />} onClick={duplicate}>
                    Nhân bản
                  </Button>
                )}
              </>
            )}
            {canWrite && (
              <>
                {v.status !== "published" && (
                  <Button variant="outline" icon={<Send className="size-4" />} onClick={() => save({ status: "published" })} loading={f.submitting}>
                    Lưu & xuất bản
                  </Button>
                )}
                <Button icon={<Save className="size-4" />} onClick={() => save()} loading={f.submitting} disabled={!isNew && !f.dirty}>
                  {isNew ? "Tạo khóa học" : "Lưu thay đổi"}
                </Button>
              </>
            )}
          </>
        }
      />

      {!isNew && (
        <Tabs
          className="mb-4 w-fit"
          value={tab}
          onChange={goTab}
          tabs={[
            { value: "info", label: "Thông tin" },
            { value: "curriculum", label: "Chương trình", count: lessons },
            { value: "students", label: "Học viên" },
            { value: "reviews", label: "Đánh giá" },
          ]}
        />
      )}

      {tab === "curriculum" && course && (
        <div className="space-y-5">
          <Curriculum course={course} onChange={setModules} reload={reload} />
          <CourseResources courseId={course.id} slug={course.slug} />
        </div>
      )}
      {tab === "students" && course && <CourseStudents courseId={course.id} />}
      {tab === "reviews" && course && <CourseReviews courseId={course.id} />}

      {tab === "info" && (
        <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
          <div className="space-y-5">
            <Card className="space-y-4 p-5">
              <Field label="Tên khóa học" required error={f.errors.title}>
                <Input
                  value={v.title}
                  onChange={(e) => {
                    f.set("title", e.target.value);
                    if (!slugTouched) f.set("slug", slugify(e.target.value));
                  }}
                  placeholder="VD: Ngữ pháp N4 - Xây nền tảng vững chắc"
                />
              </Field>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Đường dẫn (slug)" error={f.errors.slug} hint={`/khoa-hoc/${v.slug || "…"}`}>
                  <Input
                    value={v.slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      f.set("slug", slugify(e.target.value));
                    }}
                  />
                </Field>
                <Field label="Nhãn trên thẻ" hint="VD: Phổ biến, Mới (để trống nếu không có)">
                  <Input value={v.badge} onChange={f.input("badge")} />
                </Field>
              </div>
              <Field label="Mô tả ngắn" error={f.errors.subtitle} hint="Hiển thị trên thẻ khóa học và dưới tiêu đề trang chi tiết.">
                <Textarea rows={2} value={v.subtitle} onChange={f.input("subtitle")} />
              </Field>
              <Field label="Giới thiệu chi tiết" error={f.errors.description}>
                <RichTextEditor value={v.description} onChange={(h) => f.set("description", h)} toolbar="full" minHeight={220} placeholder="Giới thiệu nội dung, đối tượng, phương pháp học…" />
              </Field>
            </Card>

            <Card className="space-y-4 p-5">
              <h3 className="font-bold">Phân loại & mục tiêu</h3>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Cấp độ">
                  <Select value={v.level} onChange={f.input("level")} options={LEVEL_OPTIONS} placeholder="Không xác định" />
                </Field>
                <Field label="Danh mục" hint="“Lộ trình theo cấp độ” hiển thị ở khối Khóa học theo cấp độ (trang chủ).">
                  <Select value={v.category} onChange={f.input("category")} options={CATEGORIES} />
                </Field>
              </div>
              <Field label="Thẻ danh mục (tab trang Khóa học)" hint={`Gợi ý: ${TAGS.join(", ")}`}>
                <TagInput value={v.tags} onChange={(x) => f.set("tags", x)} placeholder="Nhập rồi Enter" />
              </Field>
              <Field label="Mục tiêu học (bộ lọc)" hint={`Gợi ý: ${GOALS.join(" · ")}`}>
                <TagInput value={v.goals} onChange={(x) => f.set("goals", x)} placeholder="Nhập rồi Enter" />
              </Field>
              <Field label="Hình thức học">
                <div className="flex flex-wrap gap-2">
                  {FORMATS.map((fm) => {
                    const on = v.formats.includes(fm);
                    return (
                      <button
                        key={fm}
                        type="button"
                        onClick={() => f.set("formats", on ? v.formats.filter((x) => x !== fm) : [...v.formats, fm])}
                        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${on ? "border-brand-500 bg-brand-50 text-brand-600" : "border-ink/10 text-ink/60 hover:border-brand-200"}`}
                      >
                        {fm}
                      </button>
                    );
                  })}
                </div>
              </Field>
              <Field label="Bạn sẽ học được gì? (kết quả đầu ra)" hint="3 ý đầu tiên hiển thị trên thẻ cấp độ ở trang chủ.">
                <TagInput value={v.outcomes} onChange={(x) => f.set("outcomes", x)} placeholder="Nhập một ý rồi Enter" />
              </Field>
            </Card>

            <Card className="space-y-4 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-bold">Ảnh bìa</h3>
                <Tabs
                  size="sm"
                  value={v.coverMode}
                  onChange={(m) => f.set("coverMode", m)}
                  tabs={[
                    { value: "style", label: "Bìa thiết kế" },
                    { value: "image", label: "Ảnh tải lên" },
                  ]}
                />
              </div>
              {v.coverMode === "image" ? (
                <div className="max-w-md">
                  <ImageInput value={v.coverUrl} onChange={(u) => f.set("coverUrl", u)} folder="courses" />
                </div>
              ) : (
                <CoverEditor value={v.coverStyle} onChange={(c) => f.set("coverStyle", c)} title={v.title} level={v.level} />
              )}
            </Card>
          </div>

          <div className="space-y-5">
            <Card className="space-y-4 p-5">
              <h3 className="font-bold">Xuất bản</h3>
              <Field label="Trạng thái">
                <Select value={v.status} onChange={f.input("status")} options={STATUS_OPTIONS} />
              </Field>
              <Switch checked={v.featured} onChange={(x) => f.set("featured", x)} label="Khóa học nổi bật" />
              <Field label="Giáo viên phụ trách">
                <Select value={v.teacherId} onChange={f.input("teacherId")} options={teachers.data ?? []} placeholder="— Chọn giáo viên —" />
              </Field>
            </Card>

            <Card className="space-y-4 p-5">
              <h3 className="font-bold">Giá bán</h3>
              <Field label="Giá gốc (đ)" error={f.errors.price} hint={v.price ? vnd(v.price) : "0 = miễn phí (học viên tự ghi danh)"}>
                <Input type="number" min={0} step={1000} value={v.price ?? ""} onChange={f.input("price")} />
              </Field>
              <Field label="Giá khuyến mãi (đ)" error={f.errors.salePrice} hint={v.salePrice ? vnd(v.salePrice) : "Để trống nếu không giảm giá"}>
                <Input type="number" min={0} step={1000} value={v.salePrice ?? ""} onChange={f.input("salePrice")} />
              </Field>
              <Field label="Khuyến mãi kết thúc lúc" hint="Hiển thị đồng hồ đếm ngược trên trang khóa học.">
                <Input type="datetime-local" value={v.saleEndsAt} onChange={f.input("saleEndsAt")} />
              </Field>
              {v.salePrice != null && v.price != null && v.salePrice >= v.price && <p className="text-xs text-amber-600">Giá khuyến mãi đang lớn hơn hoặc bằng giá gốc.</p>}
            </Card>

            <Card className="space-y-4 p-5">
              <h3 className="font-bold">Thời lượng</h3>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Tổng giờ học">
                  <Input type="number" min={0} value={v.durationHours ?? ""} onChange={f.input("durationHours")} />
                </Field>
                <Field label="Số tuần">
                  <Input type="number" min={0} value={v.weeks ?? ""} onChange={f.input("weeks")} />
                </Field>
              </div>
            </Card>

            {!isNew && canWrite && (
              <Card className="p-5">
                <h3 className="font-bold text-red-600">Vùng nguy hiểm</h3>
                <p className="mt-1 text-xs text-muted">
                  {course.paidOrders > 0 ? "Khóa học đã có đơn hàng thanh toán nên không thể xoá — hãy chuyển sang Lưu trữ." : "Xoá vĩnh viễn khóa học cùng toàn bộ chương và bài học."}
                </p>
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="ghost" onClick={() => save({ status: "archived" })}>
                    Lưu trữ
                  </Button>
                  <Button size="sm" variant="danger" icon={<Trash2 className="size-3.5" />} onClick={remove} disabled={course.paidOrders > 0}>
                    Xoá khóa học
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function CourseResources({ courseId, slug }: { courseId: string; slug: string }) {
  const { data, mutate } = useApi<{ items: Resource[] }>(`/admin/courses/${courseId}/resources`);
  return (
    <ResourcesEditor
      addPath={`/admin/courses/${courseId}/resources`}
      items={data?.items ?? []}
      title="Tài liệu khóa học"
      hint="Hiển thị ở mục “Tài liệu khóa học” trên trang chi tiết; bật “Miễn phí” để tải không cần đăng ký."
      onChange={(items) => {
        mutate({ items });
        invalidate(`/public/courses/${slug}`);
      }}
    />
  );
}
