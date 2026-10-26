/**
 * Hiển thị HTML từ trình soạn thảo (bài học, blog, ngữ pháp…) với cùng kiểu chữ như trong admin.
 * Có bộ lọc allowlist nhỏ (không phụ thuộc thư viện, chạy được cả server lẫn client).
 */
import "./RichText.css";

const ALLOWED: Record<string, string[]> = {
  p: [], br: [], hr: [], div: ["data-youtube-video"], span: [],
  h1: [], h2: [], h3: [], h4: [], h5: [], h6: [],
  strong: [], b: [], em: [], i: [], u: [], s: [], strike: [], del: [], mark: ["data-color"], sub: [], sup: [], small: [],
  a: ["href", "target", "rel", "title"],
  ul: [], ol: ["start"], li: [],
  blockquote: [], pre: [], code: [],
  img: ["src", "alt", "title", "width", "height"],
  table: [], thead: [], tbody: [], tfoot: [], tr: [], th: ["colspan", "rowspan", "colwidth"], td: ["colspan", "rowspan", "colwidth"], colgroup: [], col: ["span"],
  ruby: [], rt: [], rp: [], rb: [],
  figure: [], figcaption: [],
  iframe: ["src", "width", "height", "allowfullscreen", "allow", "frameborder", "title"],
};
/** Thẻ bị bỏ cả nội dung bên trong. */
const DROP_WITH_CONTENT = new Set(["script", "style", "noscript", "template", "object", "embed", "svg", "math", "textarea", "select", "button", "form"]);
const VOID = new Set(["br", "hr", "img", "col"]);
const GLOBAL_ATTRS = ["class", "style", "dir", "lang"];
const STYLE_PROPS = new Set(["color", "background-color", "text-align", "font-weight", "font-style", "text-decoration", "width", "min-width"]);

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

function safeUrl(v: string, kind: "link" | "img" | "frame") {
  const u = v.trim().replace(/[\u0000-\u001f\s]+/g, "");
  if (kind === "frame") return /^https:\/\/(www\.)?(youtube\.com|youtube-nocookie\.com)\/embed\//i.test(u) ? v.trim() : null;
  if (/^(https?:|mailto:|tel:|\/|#)/i.test(u) || !/^[a-z][a-z0-9+.-]*:/i.test(u)) return v.trim();
  if (kind === "img" && /^data:image\/(png|jpe?g|gif|webp|avif);base64,/i.test(u)) return v.trim();
  return null;
}

function safeStyle(v: string) {
  return v
    .split(";")
    .map((d) => d.trim())
    .filter((d) => {
      const [prop, ...rest] = d.split(":");
      const val = rest.join(":").toLowerCase();
      return prop && STYLE_PROPS.has(prop.trim().toLowerCase()) && !/url\(|expression|javascript:|@import/.test(val);
    })
    .join("; ");
}

function cleanAttrs(tag: string, raw: string) {
  const allowed = new Set([...GLOBAL_ATTRS, ...(ALLOWED[tag] ?? [])]);
  const out: string[] = [];
  const re = /([^\s"'<>\/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const name = m[1].toLowerCase();
    if (!allowed.has(name) || name.startsWith("on")) continue;
    let val = m[2] ?? m[3] ?? m[4] ?? "";
    val = val.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
    if (name === "href") {
      const s = safeUrl(val, "link");
      if (s === null) continue;
      val = s;
    } else if (name === "src") {
      const s = safeUrl(val, tag === "iframe" ? "frame" : "img");
      if (s === null) return null; // ảnh/iframe nguồn lạ → bỏ cả thẻ
      val = s;
    } else if (name === "style") {
      val = safeStyle(val);
      if (!val) continue;
    }
    out.push(m[2] === undefined && m[3] === undefined && m[4] === undefined ? name : `${name}="${esc(val)}"`);
  }
  if (tag === "a" && out.some((a) => a.startsWith('target="_blank"'))) out.push('rel="noopener noreferrer"');
  if (tag === "iframe" && !out.some((a) => a.startsWith("src="))) return null;
  return out.length ? " " + out.join(" ") : "";
}

/** Lọc HTML theo allowlist: bỏ script/style, thuộc tính on*, URL javascript:, iframe ngoài YouTube. */
export function sanitizeHtml(html: string | null | undefined): string {
  if (!html) return "";
  const src = html.replace(/<!--[\s\S]*?-->/g, "");
  let out = "";
  let i = 0;
  let dropDepth = 0;
  let dropTag = "";
  const tagRe = /<\/?([a-zA-Z][a-zA-Z0-9-]*)((?:\s+[^\s"'<>\/=]+(?:\s*=\s*(?:"[^"]*"|'[^']*'|[^\s"'=<>`]+))?)*)\s*\/?>/g;
  let m: RegExpExecArray | null;
  while ((m = tagRe.exec(src))) {
    const text = src.slice(i, m.index);
    if (!dropDepth) out += text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    i = tagRe.lastIndex;
    const tag = m[1].toLowerCase();
    const closing = m[0][1] === "/";
    if (dropDepth) {
      if (tag === dropTag) dropDepth += closing ? -1 : 1;
      continue;
    }
    if (DROP_WITH_CONTENT.has(tag)) {
      if (!closing && !m[0].endsWith("/>")) {
        dropDepth = 1;
        dropTag = tag;
      }
      continue;
    }
    if (!(tag in ALLOWED)) continue;
    if (closing) {
      if (!VOID.has(tag)) out += `</${tag}>`;
      continue;
    }
    const attrs = cleanAttrs(tag, m[2] ?? "");
    if (attrs === null) {
      if (tag === "iframe") {
        dropDepth = 1;
        dropTag = tag;
      }
      continue;
    }
    out += `<${tag}${attrs}>`;
  }
  if (!dropDepth) out += src.slice(i).replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return out;
}

/** Class typography dùng chung (cho trình soạn thảo). */
export const richTextClass = "rt-content";
export const richTextEditorClass = "rt-editor";

export function RichTextView({ html, className }: { html: string | null | undefined; className?: string }) {
  return <div className={`rt-content ${className ?? ""}`} dangerouslySetInnerHTML={{ __html: sanitizeHtml(html) }} />;
}

export default RichTextView;
