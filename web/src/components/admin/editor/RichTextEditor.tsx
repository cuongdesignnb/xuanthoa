"use client";

/**
 * Trình soạn thảo HTML (TipTap 3) dùng cho mọi ô nội dung ở admin.
 * - Controlled: `value` (HTML) ↔ `onChange(html)`; đổi `value` từ ngoài (tải bản ghi, AI sinh nội dung) sẽ cập nhật editor.
 * - Tiếng Nhật: gõ IME an toàn, Furigana (<ruby>), chuyển romaji → kana, phông Noto Serif JP.
 */

import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import { Table, TableRow, TableCell, TableHeader } from "@tiptap/extension-table";
import { TextStyle, Color } from "@tiptap/extension-text-style";
import Youtube from "@tiptap/extension-youtube";
import CharacterCount from "@tiptap/extension-character-count";
import { toHiragana, toKatakana, isRomaji } from "wanakana";
import {
  AlignCenter,
  AlignJustify,
  AlignLeft,
  AlignRight,
  Baseline,
  Bold,
  Code,
  Eraser,
  Highlighter,
  ImagePlus,
  Italic,
  Languages,
  Link2,
  List,
  ListOrdered,
  Minus,
  Quote,
  Redo2,
  Strikethrough,
  Table as TableIcon,
  Underline as UnderlineIcon,
  Undo2,
  SquarePlay as YoutubeIcon,
} from "lucide-react";
import { Button, Input, cx } from "../ui";
import MediaPicker from "../media/MediaPicker";
import { FontJp, Ruby } from "./extensions";
import { richTextClass, richTextEditorClass } from "@/components/RichText";

export type RichTextEditorProps = {
  /** HTML hiện tại. */
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: number;
  /** "full" cho nội dung bài học/blog; "basic" cho mô tả ngắn, câu hỏi. */
  toolbar?: "full" | "basic";
};

const COLORS = ["#1d1d2b", "#e5383b", "#d0262a", "#f97316", "#eab308", "#16a34a", "#0ea5e9", "#2563eb", "#7c3aed", "#db2777", "#6b6b7b"];
const HIGHLIGHTS = ["#fff1a8", "#ffd6d7", "#d1fae5", "#dbeafe", "#ede9fe", "#fde68a"];

const htmlOf = (e: Editor) => (e.isEmpty ? "" : e.getHTML());

export default function RichTextEditor({ value, onChange, placeholder, minHeight = 220, toolbar = "full" }: RichTextEditorProps) {
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  /** HTML gần nhất editor đã phát ra (để phân biệt thay đổi từ ngoài). */
  const lastHtml = useRef<string>(value ?? "");
  const composing = useRef(false);
  const [picker, setPicker] = useState(false);
  const editorRef = useRef<Editor | null>(null);

  const emit = (e: Editor) => {
    const html = htmlOf(e);
    if (html === lastHtml.current) return;
    lastHtml.current = html;
    onChangeRef.current(html);
  };

  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: { openOnClick: false, autolink: true, HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" } },
      }),
      TextStyle,
      Color,
      Highlight.configure({ multicolor: true }),
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Image.configure({ HTMLAttributes: { loading: "lazy" } }),
      Table.configure({ resizable: false }),
      TableRow,
      TableHeader,
      TableCell,
      Youtube.configure({ nocookie: true, modestBranding: true, rel: 0, width: 640, height: 360 }),
      Placeholder.configure({ placeholder: placeholder ?? "Nhập nội dung…" }),
      CharacterCount,
      Ruby,
      FontJp,
    ],
    content: value || "",
    editorProps: {
      attributes: { class: cx(richTextClass, "px-4 py-3"), style: `min-height:${minHeight}px`, spellcheck: "false" },
      handleDOMEvents: {
        compositionstart: () => {
          composing.current = true;
          return false;
        },
        compositionend: (view) => {
          composing.current = false;
          // Phát HTML sau khi IME chốt chữ (tránh "bão" onChange giữa chừng).
          setTimeout(() => {
            if (!view.isDestroyed && editorRef.current) emit(editorRef.current);
          }, 0);
          return false;
        },
      },
    },
    onUpdate: ({ editor: e }) => {
      if (composing.current || e.view.composing) return;
      emit(e);
    },
  });

  useEffect(() => {
    editorRef.current = editor;
  }, [editor]);

  // Đồng bộ `value` từ ngoài vào editor (không đụng khi đó chính là HTML editor vừa phát ra).
  useEffect(() => {
    if (!editor || editor.isDestroyed) return;
    const v = value ?? "";
    if (v === lastHtml.current) return;
    if (composing.current || editor.view.composing) return;
    if (v === htmlOf(editor)) {
      lastHtml.current = v;
      return;
    }
    lastHtml.current = v;
    const { from, to } = editor.state.selection;
    editor.commands.setContent(v, { emitUpdate: false });
    if (editor.isFocused) {
      const max = editor.state.doc.content.size;
      editor.commands.setTextSelection({ from: Math.min(from, max), to: Math.min(to, max) });
    }
  }, [value, editor]);

  const full = toolbar === "full";

  return (
    <div className={cx("overflow-hidden rounded-xl border border-ink/10 bg-white transition focus-within:border-brand-300 focus-within:ring-4 focus-within:ring-brand-100", richTextEditorClass)}>
      {editor ? (
        <Toolbar editor={editor} full={full} onImage={() => setPicker(true)} />
      ) : (
        <div className="h-[42px] border-b border-ink/5 bg-ink/[.02]" />
      )}
      {editor ? (
        <EditorContent editor={editor} />
      ) : (
        <div className={cx(richTextClass, "px-4 py-3 text-ink/35")} style={{ minHeight }}>
          {placeholder ?? "Đang tải trình soạn thảo…"}
        </div>
      )}
      {editor && full && (
        <div className="flex items-center justify-end gap-3 border-t border-ink/5 bg-ink/[.015] px-3 py-1.5 text-[11px] text-muted">
          <span>{editor.storage.characterCount.words()} từ</span>
          <span>{editor.storage.characterCount.characters().toLocaleString("vi-VN")} ký tự</span>
        </div>
      )}
      {full && (
        <MediaPicker
          open={picker}
          onClose={() => setPicker(false)}
          accept="image"
          folder="editor"
          onSelect={(m) => {
            setPicker(false);
            editor?.chain().focus().setImage({ src: m.url, alt: m.alt ?? "" }).run();
          }}
        />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toolbar                                                             */
/* ------------------------------------------------------------------ */

function TB({
  label,
  active,
  disabled,
  onClick,
  children,
}: {
  label: string;
  active?: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={active}
      disabled={disabled}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={cx(
        "grid h-8 min-w-8 shrink-0 place-items-center rounded-md px-1.5 text-ink/65 transition hover:bg-brand-50 hover:text-brand-600 disabled:opacity-30",
        active && "bg-brand-50 text-brand-600",
      )}
    >
      {children}
    </button>
  );
}

const Sep = () => <span className="mx-0.5 h-5 w-px shrink-0 bg-ink/10" />;

/** Popover nhỏ neo dưới nút. */
function Pop({
  open,
  onClose,
  trigger,
  children,
  width = 280,
}: {
  open: boolean;
  onClose: () => void;
  trigger: React.ReactNode;
  children: React.ReactNode;
  width?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const h = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && onClose();
    const k = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("mousedown", h);
    document.addEventListener("keydown", k);
    return () => {
      document.removeEventListener("mousedown", h);
      document.removeEventListener("keydown", k);
    };
  }, [open, onClose]);
  return (
    <div ref={ref} className="relative shrink-0">
      {trigger}
      {open && (
        <div
          className="absolute left-0 top-full z-50 mt-1.5 rounded-xl border border-ink/5 bg-white p-3 shadow-xl max-sm:fixed max-sm:inset-x-3 max-sm:top-auto max-sm:mt-0 max-sm:w-auto"
          style={{ width }}
        >
          {children}
        </div>
      )}
    </div>
  );
}

type PopKey = "link" | "color" | "hl" | "yt" | "ruby" | "kana" | "table" | null;

function Toolbar({ editor, full, onImage }: { editor: Editor; full: boolean; onImage: () => void }) {
  const [pop, setPop] = useState<PopKey>(null);
  const close = () => setPop(null);
  const toggle = (k: Exclude<PopKey, null>) => setPop((p) => (p === k ? null : k));
  const c = () => editor.chain().focus();

  const block = editor.isActive("heading", { level: 2 }) ? "h2" : editor.isActive("heading", { level: 3 }) ? "h3" : "p";

  return (
    <div className="no-scrollbar flex items-center gap-0.5 overflow-x-auto border-b border-ink/5 bg-ink/[.02] px-1.5 py-1 sm:flex-wrap sm:overflow-visible">
      {full && (
        <>
          <select
            aria-label="Kiểu đoạn"
            value={block}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "p") c().setParagraph().run();
              else c().toggleHeading({ level: v === "h2" ? 2 : 3 }).run();
            }}
            className="h-8 shrink-0 rounded-md border border-ink/10 bg-white px-1.5 text-xs font-semibold outline-none focus:border-brand-300"
          >
            <option value="p">Đoạn văn</option>
            <option value="h2">Tiêu đề 2</option>
            <option value="h3">Tiêu đề 3</option>
          </select>
          <Sep />
        </>
      )}
      <TB label="In đậm (Ctrl+B)" active={editor.isActive("bold")} onClick={() => c().toggleBold().run()}>
        <Bold className="size-4" />
      </TB>
      <TB label="In nghiêng (Ctrl+I)" active={editor.isActive("italic")} onClick={() => c().toggleItalic().run()}>
        <Italic className="size-4" />
      </TB>
      <TB label="Gạch chân (Ctrl+U)" active={editor.isActive("underline")} onClick={() => c().toggleUnderline().run()}>
        <UnderlineIcon className="size-4" />
      </TB>
      {full && (
        <>
          <TB label="Gạch ngang" active={editor.isActive("strike")} onClick={() => c().toggleStrike().run()}>
            <Strikethrough className="size-4" />
          </TB>
          <Pop
            open={pop === "hl"}
            onClose={close}
            width={200}
            trigger={
              <TB label="Tô nền" active={editor.isActive("highlight")} onClick={() => toggle("hl")}>
                <Highlighter className="size-4" />
              </TB>
            }
          >
            <Swatches
              colors={HIGHLIGHTS}
              onPick={(color) => (c().setHighlight({ color }).run(), close())}
              onClear={() => (c().unsetHighlight().run(), close())}
            />
          </Pop>
          <Pop
            open={pop === "color"}
            onClose={close}
            width={220}
            trigger={
              <TB label="Màu chữ" onClick={() => toggle("color")}>
                <span className="relative grid place-items-center">
                  <Baseline className="size-4" />
                  <span className="absolute -bottom-1 h-0.5 w-4 rounded" style={{ background: (editor.getAttributes("textStyle").color as string) || "#1d1d2b" }} />
                </span>
              </TB>
            }
          >
            <Swatches colors={COLORS} onPick={(color) => (c().setColor(color).run(), close())} onClear={() => (c().unsetColor().run(), close())} />
          </Pop>
        </>
      )}
      <Sep />
      <TB label="Danh sách" active={editor.isActive("bulletList")} onClick={() => c().toggleBulletList().run()}>
        <List className="size-4" />
      </TB>
      <TB label="Danh sách số" active={editor.isActive("orderedList")} onClick={() => c().toggleOrderedList().run()}>
        <ListOrdered className="size-4" />
      </TB>
      {full && (
        <>
          <TB label="Trích dẫn" active={editor.isActive("blockquote")} onClick={() => c().toggleBlockquote().run()}>
            <Quote className="size-4" />
          </TB>
          <TB label="Mã" active={editor.isActive("code") || editor.isActive("codeBlock")} onClick={() => (editor.state.selection.empty ? c().toggleCodeBlock().run() : c().toggleCode().run())}>
            <Code className="size-4" />
          </TB>
          <Sep />
          {(
            [
              ["left", AlignLeft, "Căn trái"],
              ["center", AlignCenter, "Căn giữa"],
              ["right", AlignRight, "Căn phải"],
              ["justify", AlignJustify, "Căn đều"],
            ] as const
          ).map(([a, Icon, label]) => (
            <TB key={a} label={label} active={editor.isActive({ textAlign: a })} onClick={() => c().setTextAlign(a).run()}>
              <Icon className="size-4" />
            </TB>
          ))}
        </>
      )}
      <Sep />
      <Pop
        open={pop === "link"}
        onClose={close}
        width={300}
        trigger={
          <TB label="Liên kết" active={editor.isActive("link")} onClick={() => toggle("link")}>
            <Link2 className="size-4" />
          </TB>
        }
      >
        <LinkForm editor={editor} onDone={close} />
      </Pop>
      {full && (
        <>
          <TB label="Chèn ảnh (Media Library)" onClick={onImage}>
            <ImagePlus className="size-4" />
          </TB>
          <Pop
            open={pop === "yt"}
            onClose={close}
            width={300}
            trigger={
              <TB label="Nhúng YouTube" onClick={() => toggle("yt")}>
                <YoutubeIcon className="size-4" />
              </TB>
            }
          >
            <UrlForm
              label="Link video YouTube"
              placeholder="https://youtu.be/…"
              submit="Nhúng"
              onSubmit={(url) => {
                const ok = c().setYoutubeVideo({ src: url }).run();
                if (ok) close();
                return ok ? null : "Link YouTube không hợp lệ";
              }}
            />
          </Pop>
          <Pop
            open={pop === "table"}
            onClose={close}
            width={230}
            trigger={
              <TB label="Bảng" active={editor.isActive("table")} onClick={() => toggle("table")}>
                <TableIcon className="size-4" />
              </TB>
            }
          >
            <TableMenu editor={editor} onDone={close} />
          </Pop>
          <TB label="Đường kẻ ngang" onClick={() => c().setHorizontalRule().run()}>
            <Minus className="size-4" />
          </TB>
        </>
      )}
      <Sep />
      <Pop
        open={pop === "ruby"}
        onClose={close}
        width={290}
        trigger={
          <TB label="Furigana (phiên âm trên chữ Hán)" active={editor.isActive("ruby")} onClick={() => toggle("ruby")}>
            <span className="flex flex-col items-center font-jp leading-none">
              <span className="text-[7px] font-bold">かん</span>
              <span className="text-[13px] font-bold">漢</span>
            </span>
          </TB>
        }
      >
        <RubyForm editor={editor} onDone={close} />
      </Pop>
      <Pop
        open={pop === "kana"}
        onClose={close}
        width={300}
        trigger={
          <TB label="Romaji → Kana" onClick={() => toggle("kana")}>
            <span className="font-jp text-[13px] font-bold">あ</span>
          </TB>
        }
      >
        <KanaForm editor={editor} onDone={close} />
      </Pop>
      <TB label="Phông tiếng Nhật (Noto Serif JP)" active={editor.isActive("fontJp")} onClick={() => c().toggleFontJp().run()}>
        <Languages className="size-4" />
      </TB>
      {full && (
        <>
          <Sep />
          <TB label="Xoá định dạng" onClick={() => c().unsetAllMarks().clearNodes().run()}>
            <Eraser className="size-4" />
          </TB>
          <TB label="Hoàn tác (Ctrl+Z)" disabled={!editor.can().undo()} onClick={() => c().undo().run()}>
            <Undo2 className="size-4" />
          </TB>
          <TB label="Làm lại (Ctrl+Y)" disabled={!editor.can().redo()} onClick={() => c().redo().run()}>
            <Redo2 className="size-4" />
          </TB>
        </>
      )}
    </div>
  );
}

function Swatches({ colors, onPick, onClear }: { colors: string[]; onPick: (c: string) => void; onClear: () => void }) {
  return (
    <div>
      <div className="grid grid-cols-6 gap-1.5">
        {colors.map((col) => (
          <button
            key={col}
            type="button"
            title={col}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPick(col)}
            className="size-7 rounded-md ring-1 ring-ink/10 transition hover:scale-110"
            style={{ background: col }}
          />
        ))}
      </div>
      <button type="button" onClick={onClear} className="mt-2 text-xs font-semibold text-brand-500">
        Bỏ màu
      </button>
    </div>
  );
}

function UrlForm({
  label,
  placeholder,
  submit,
  initial = "",
  onSubmit,
  extra,
}: {
  label: string;
  placeholder?: string;
  submit: string;
  initial?: string;
  onSubmit: (url: string) => string | null;
  extra?: React.ReactNode;
}) {
  const [url, setUrl] = useState(initial);
  const [err, setErr] = useState<string | null>(null);
  const go = () => setErr(onSubmit(url.trim()));
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink/70">{label}</p>
      <Input
        autoFocus
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        placeholder={placeholder}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            go();
          }
        }}
        invalid={!!err}
      />
      {err && <p className="text-xs text-red-500">{err}</p>}
      <div className="flex justify-end gap-2">
        {extra}
        <Button type="button" size="sm" onClick={go}>
          {submit}
        </Button>
      </div>
    </div>
  );
}

function LinkForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const current = (editor.getAttributes("link").href as string) ?? "";
  return (
    <UrlForm
      label="Địa chỉ liên kết"
      placeholder="https://… hoặc /khoa-hoc/…"
      submit="Áp dụng"
      initial={current}
      onSubmit={(url) => {
        if (!url) {
          editor.chain().focus().extendMarkRange("link").unsetLink().run();
          onDone();
          return null;
        }
        if (/^\s*javascript:/i.test(url)) return "Liên kết không hợp lệ";
        const href = /^(https?:|mailto:|tel:|\/|#)/i.test(url) ? url : `https://${url}`;
        if (editor.state.selection.empty && !editor.isActive("link")) {
          editor.chain().focus().insertContent({ type: "text", text: url, marks: [{ type: "link", attrs: { href } }] }).run();
        } else editor.chain().focus().extendMarkRange("link").setLink({ href }).run();
        onDone();
        return null;
      }}
      extra={
        current ? (
          <Button type="button" size="sm" variant="ghost" onClick={() => (editor.chain().focus().extendMarkRange("link").unsetLink().run(), onDone())}>
            Gỡ link
          </Button>
        ) : null
      }
    />
  );
}

function TableMenu({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const inTable = editor.isActive("table");
  const c = () => editor.chain().focus();
  const items: [string, () => boolean, boolean?][] = inTable
    ? [
        ["Thêm hàng phía dưới", () => c().addRowAfter().run()],
        ["Thêm cột bên phải", () => c().addColumnAfter().run()],
        ["Xoá hàng", () => c().deleteRow().run()],
        ["Xoá cột", () => c().deleteColumn().run()],
        ["Bật/tắt hàng tiêu đề", () => c().toggleHeaderRow().run()],
        ["Gộp / tách ô", () => c().mergeOrSplit().run()],
        ["Xoá bảng", () => c().deleteTable().run(), true],
      ]
    : [
        ["Bảng 2 × 2", () => c().insertTable({ rows: 2, cols: 2, withHeaderRow: true }).run()],
        ["Bảng 3 × 3", () => c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()],
        ["Bảng 4 × 3 (từ vựng)", () => c().insertTable({ rows: 4, cols: 3, withHeaderRow: true }).run()],
      ];
  return (
    <div className="-m-1.5 flex flex-col">
      {items.map(([label, fn, danger]) => (
        <button
          key={label}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => (fn(), onDone())}
          className={cx("rounded-lg px-2.5 py-1.5 text-left text-sm transition hover:bg-brand-50", danger && "text-red-600")}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

function RubyForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const sel = editor.state.selection;
  const node = editor.state.doc.nodeAt(sel.from);
  const editing = editor.isActive("ruby") && node?.type.name === "ruby";
  const [base, setBase] = useState<string>(editing ? node!.attrs.base : editor.state.doc.textBetween(sel.from, sel.to, ""));
  const [rt, setRt] = useState<string>(editing ? node!.attrs.rt : "");
  const reading = rt && isRomaji(rt) ? toHiragana(rt) : rt;
  const ok = base.trim() && reading.trim();
  const apply = () => {
    if (!ok) return;
    editor.chain().focus().setRuby({ base: base.trim(), rt: reading.trim() }).run();
    onDone();
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink/70">Furigana</p>
      <div className="grid grid-cols-2 gap-2">
        <label className="space-y-1 text-[11px] text-muted">
          Chữ Hán
          <Input value={base} onChange={(e) => setBase(e.target.value)} placeholder="漢字" className="font-jp text-base" />
        </label>
        <label className="space-y-1 text-[11px] text-muted">
          Cách đọc
          <Input
            autoFocus
            value={rt}
            onChange={(e) => setRt(e.target.value)}
            placeholder="かんじ / kanji"
            className="font-jp"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.nativeEvent.isComposing) {
                e.preventDefault();
                apply();
              }
            }}
          />
        </label>
      </div>
      <div className="grid min-h-14 place-items-center rounded-lg bg-brand-50/60 py-2">
        {base ? (
          <ruby className="font-jp text-2xl font-bold">
            {base}
            <rt className="text-[11px] font-medium text-brand-600">{reading}</rt>
          </ruby>
        ) : (
          <span className="text-xs text-muted">Bôi đen chữ Hán rồi nhập cách đọc</span>
        )}
      </div>
      <p className="text-[11px] text-muted">Gõ romaji sẽ tự chuyển sang hiragana.</p>
      <div className="flex justify-end gap-2">
        {editing && (
          <Button type="button" size="sm" variant="ghost" onClick={() => (editor.chain().focus().unsetRuby().run(), onDone())}>
            Gỡ furigana
          </Button>
        )}
        <Button type="button" size="sm" disabled={!ok} onClick={apply}>
          {editing ? "Cập nhật" : "Chèn"}
        </Button>
      </div>
    </div>
  );
}

function KanaForm({ editor, onDone }: { editor: Editor; onDone: () => void }) {
  const [text, setText] = useState("");
  const hira = text ? toHiragana(text) : "";
  const kata = text ? toKatakana(text) : "";
  const insert = (s: string) => {
    if (!s) return;
    editor.chain().focus().insertContent(s).run();
    setText("");
    onDone();
  };
  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold text-ink/70">Romaji → Kana</p>
      <Input
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="vd: arigatou gozaimasu"
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.nativeEvent.isComposing) {
            e.preventDefault();
            insert(e.shiftKey ? kata : hira);
          }
        }}
      />
      {(
        [
          ["Hiragana", hira],
          ["Katakana", kata],
        ] as const
      ).map(([label, s]) => (
        <button
          key={label}
          type="button"
          disabled={!s}
          onClick={() => insert(s)}
          className="flex w-full items-center justify-between gap-2 rounded-lg border border-ink/10 px-3 py-2 text-left transition hover:border-brand-300 hover:bg-brand-50 disabled:opacity-40"
        >
          <span className="min-w-0 truncate font-jp text-base">{s || "—"}</span>
          <span className="shrink-0 text-[11px] font-semibold text-muted">{label}</span>
        </button>
      ))}
      <p className="text-[11px] text-muted">Enter: chèn hiragana · Shift+Enter: katakana</p>
    </div>
  );
}
