import DOMPurify from "dompurify";

/**
 * Whitelist for hotel HTML from LiteAPI (e.g. &lt;p&gt;, &lt;strong&gt;, &lt;br&gt;).
 * Strips scripts, event handlers, and unsafe tags.
 */
const HOTEL_CONFIG: DOMPurify.Config = {
  ALLOWED_TAGS: [
    "p",
    "br",
    "strong",
    "b",
    "em",
    "i",
    "u",
    "ul",
    "ol",
    "li",
    "span",
    "a",
    "h1",
    "h2",
    "h3",
    "h4",
    "div",
    "blockquote",
  ],
  ALLOWED_ATTR: ["href", "target", "rel", "class", "title"],
  ALLOW_DATA_ATTR: false,
};

let hooksInstalled = false;

function installHooksOnce(): void {
  if (hooksInstalled || typeof window === "undefined") return;
  hooksInstalled = true;
  DOMPurify.addHook("afterSanitizeAttributes", (node) => {
    if (node.tagName !== "A" || !(node instanceof HTMLAnchorElement)) return;
    const href = node.getAttribute("href");
    if (href && /^https?:\/\//i.test(href)) {
      node.setAttribute("rel", "noopener noreferrer");
      node.setAttribute("target", "_blank");
    }
  });
}

export function sanitizeHotelHtml(html: string): string {
  if (!html || typeof html !== "string") return "";
  installHooksOnce();
  return DOMPurify.sanitize(html.trim(), HOTEL_CONFIG);
}
