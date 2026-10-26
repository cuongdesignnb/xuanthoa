import { Mark, Node, mergeAttributes } from "@tiptap/react";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    ruby: {
      /** Chèn/thay vùng chọn bằng furigana. */
      setRuby: (attrs: { base: string; rt: string }) => ReturnType;
      /** Gỡ furigana (giữ lại chữ gốc). */
      unsetRuby: () => ReturnType;
    };
    fontJp: {
      toggleFontJp: () => ReturnType;
    };
  }
}

/** Lấy chữ gốc của <ruby> (bỏ <rt>/<rp>). */
function rubyBase(el: HTMLElement) {
  let s = "";
  el.childNodes.forEach((n) => {
    if (n.nodeType === 3) s += n.textContent ?? "";
    else if (n.nodeType === 1) {
      const tag = (n as HTMLElement).tagName.toLowerCase();
      if (tag !== "rt" && tag !== "rp") s += (n as HTMLElement).textContent ?? "";
    }
  });
  return s.trim();
}

/**
 * Furigana: node inline nguyên khối, lưu thành `<ruby>漢字<rt>かんじ</rt></ruby>`.
 * Nhấp chọn node rồi bấm nút Furigana để sửa.
 */
export const Ruby = Node.create({
  name: "ruby",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      base: { default: "", parseHTML: (el) => rubyBase(el as HTMLElement), rendered: false },
      rt: {
        default: "",
        parseHTML: (el) =>
          Array.from((el as HTMLElement).querySelectorAll("rt"))
            .map((r) => r.textContent ?? "")
            .join("")
            .trim(),
        rendered: false,
      },
    };
  },

  parseHTML() {
    return [{ tag: "ruby" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    return ["ruby", mergeAttributes(HTMLAttributes), node.attrs.base, ["rt", {}, node.attrs.rt]];
  },

  renderText({ node }) {
    return node.attrs.base;
  },

  addCommands() {
    return {
      setRuby:
        ({ base, rt }) =>
        ({ chain, state }) => {
          const { from, to } = state.selection;
          return chain()
            .insertContentAt({ from, to }, { type: this.name, attrs: { base, rt } })
            .run();
        },
      unsetRuby:
        () =>
        ({ state, chain }) => {
          const { from, to } = state.selection;
          const node = state.doc.nodeAt(from);
          if (!node || node.type.name !== this.name) return false;
          return chain().insertContentAt({ from, to }, node.attrs.base).run();
        },
    };
  },
});

/** Chữ Nhật dùng phông Noto Serif JP: `<span class="font-jp">`. */
export const FontJp = Mark.create({
  name: "fontJp",
  priority: 1100,

  parseHTML() {
    return [{ tag: "span.font-jp" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", mergeAttributes(HTMLAttributes, { class: "font-jp" }), 0];
  },

  addCommands() {
    return {
      toggleFontJp:
        () =>
        ({ commands }) =>
          commands.toggleMark(this.name),
    };
  },
});
