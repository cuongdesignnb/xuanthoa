import Image from "next/image";
import type { CoverKind } from "./types";

const U = (id: string, w = 800) => `https://images.unsplash.com/${id}?w=${w}&q=80`;
const SAKURA = "photo-1522383225653-ed111181a951";
const FUJI = "photo-1490806843957-31f4c9a91c65";
const TOKYO = "photo-1528360983277-13d401cdc186";
const KYOTO = "photo-1545569341-9eb8b30979d9";

function Photo({ id, className = "", sizes }: { id: string; className?: string; sizes: string }) {
  return <Image src={U(id)} alt="" fill sizes={sizes} className={`object-cover ${className}`} />;
}

function Pen({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 160" className={className} aria-hidden>
      <rect x="5" y="0" width="10" height="120" rx="3" fill="#1f1f26" />
      <rect x="5" y="96" width="10" height="6" fill="#c9a24a" />
      <path d="M5 120 L15 120 L10 150 Z" fill="#d9d4cc" />
      <path d="M9 146 L11 146 L10 156 Z" fill="#1f1f26" />
    </svg>
  );
}

/** Ảnh bìa minh họa cho bài viết — kết hợp ảnh thật và hình vẽ tiếng Nhật. */
export default function Cover({
  kind,
  sizes = "(min-width:1024px) 22vw, (min-width:640px) 45vw, 90vw",
  small = false,
}: {
  kind: CoverKind;
  sizes?: string;
  small?: boolean;
}) {
  switch (kind) {
    case "grammar":
      return (
        <div className="absolute inset-0 overflow-hidden bg-[#fdf3f1]">
          <Photo id={SAKURA} sizes={sizes} className="object-left opacity-90 [mask-image:linear-gradient(to_right,black_35%,transparent_70%)]" />
          <div
            className={`absolute right-[6%] top-[10%] h-[95%] w-[52%] rotate-[8deg] rounded-sm bg-white shadow-lg [background-image:repeating-linear-gradient(transparent_0_18px,#e9e4dc_18px_19px)] ${small ? "hidden" : ""}`}
          >
            <div className="space-y-1 pl-[22%] pt-5 font-jp text-[15px] leading-[19px] text-ink/85">
              <p>～ように</p>
              <p>～ために</p>
              <p>～ても</p>
              <p>～ながら</p>
            </div>
          </div>
          {!small && <Pen className="absolute bottom-[-10%] right-[3%] h-[80%] rotate-[28deg]" />}
        </div>
      );
    case "kanji":
      return (
        <div className="absolute inset-0 overflow-hidden bg-[#fbeeee]">
          <Photo id={SAKURA} sizes={sizes} className="opacity-80" />
          <div className="absolute inset-[14%_10%_8%_16%] -rotate-3 rounded-sm bg-[#fdfaf4] shadow-xl">
            <span
              className={`absolute inset-0 grid place-items-center font-jp font-bold text-ink ${small ? "text-3xl" : "text-6xl"}`}
            >
              桜
            </span>
          </div>
          {!small && <Pen className="absolute -right-1 bottom-[-6%] h-[78%] rotate-[24deg]" />}
        </div>
      );
    case "jlpt":
      return (
        <div className="absolute inset-0 overflow-hidden bg-[#eeeef0]">
          <div className="absolute inset-[-10%] -rotate-[12deg] bg-white [background-image:linear-gradient(#dedde3_1px,transparent_1px),linear-gradient(90deg,#dedde3_1px,transparent_1px)] [background-size:22px_22px] shadow">
            <p className={`absolute left-[22%] top-[22%] font-jp font-bold text-ink/80 ${small ? "text-[9px]" : "text-lg"}`}>
              JE日本語能力試験
            </p>
            <p className={`absolute left-[34%] top-[46%] font-extrabold tracking-wider text-ink/85 ${small ? "text-base" : "text-4xl"}`}>
              JLPT
            </p>
            <p className={`absolute left-[16%] top-[72%] font-jp text-ink/40 ${small ? "hidden" : "text-xs"}`}>
              問題 1 　①　②　③　④
            </p>
          </div>
          {!small && <Pen className="absolute right-[12%] top-[18%] h-[70%] -rotate-[40deg]" />}
        </div>
      );
    case "culture":
      return (
        <div className="absolute inset-0 overflow-hidden">
          <Photo id={TOKYO} sizes={sizes} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />
        </div>
      );
    case "tips":
      return (
        <div className="absolute inset-0 overflow-hidden bg-[#efe6da]">
          <div className="absolute -right-6 -top-6 size-24 rounded-full bg-[#3a2a22] ring-8 ring-white/80" />
          <div className="absolute inset-[12%_18%_-6%_10%] rotate-[-6deg] rounded-md bg-white shadow-xl [background-image:repeating-linear-gradient(transparent_0_22px,#ece6dd_22px_23px)]">
            <div className="absolute inset-y-0 left-0 w-3 [background-image:radial-gradient(circle,#c7c0b6_3px,transparent_3.5px)] [background-size:12px_16px]" />
            <div className="space-y-1.5 pl-10 pt-4 font-jp text-[15px] leading-[22px] text-ink/85">
              <p>毎日少しずつ</p>
              <p className="pl-3">続けることが</p>
              <p className="pl-6">大きな力になる。</p>
            </div>
          </div>
          <Pen className="absolute bottom-[-12%] right-[6%] h-[80%] rotate-[32deg]" />
        </div>
      );
    case "study":
      return (
        <div className="absolute inset-0 overflow-hidden">
          <Photo id={KYOTO} sizes={sizes} />
          <div className="absolute inset-0 bg-gradient-to-t from-sky-900/20 to-transparent" />
        </div>
      );
    case "fuji":
      return (
        <div className="absolute inset-0 overflow-hidden">
          <Photo id={FUJI} sizes={sizes} />
        </div>
      );
    case "kana":
      return (
        <div className="absolute inset-0 grid place-items-center overflow-hidden bg-gradient-to-br from-brand-100 via-rose-50 to-amber-50">
          <div className="flex gap-3 font-jp font-bold">
            {["あ", "ア"].map((c, i) => (
              <span
                key={c}
                className={`grid size-20 place-items-center rounded-2xl bg-white text-5xl shadow-lg ${i ? "rotate-6 text-brand-500" : "-rotate-6 text-ink"}`}
              >
                {c}
              </span>
            ))}
          </div>
        </div>
      );
  }
}

/** Bìa bài viết: ảnh tải lên (coverUrl) nếu có, ngược lại dùng bìa vẽ sẵn theo `coverStyle.kind`. */
export function PostCover({
  post,
  sizes,
  small,
}: {
  post: { coverUrl: string | null; coverStyle: { kind?: CoverKind } | null; title?: string };
  sizes?: string;
  small?: boolean;
}) {
  if (post.coverUrl)
    return (
      <div className="absolute inset-0 overflow-hidden bg-brand-50">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={post.coverUrl} alt="" className="absolute inset-0 size-full object-cover" />
      </div>
    );
  return <Cover kind={post.coverStyle?.kind ?? "fuji"} sizes={sizes} small={small} />;
}
