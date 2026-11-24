const RELATIVE_ATTR =
  /(\s(?:src|href|action)=["'])(?!https?:|\/\/|\/|#|data:|mailto:|javascript:|tel:)([^"']+)/gi;

/** Point root-relative and absolute upstream URLs at this shell's proxy. */
export function rewriteText(text: string, prefix: string, origin: string): string {
  const host = origin.replace(/\/$/, "");
  const base = prefix.endsWith("/") ? prefix : `${prefix}/`;
  let out = text.split(host).join(prefix);
  // Only a slash that begins a path. Leave tag closers and percent-encoded data URLs alone.
  out = out.replace(/(^|["'`(=\s])\/(?!\/)(?!api\/proxy\/)(?=["'`]|[A-Za-z0-9_.~\-])/g, `$1${prefix}/`);
  if (/<html[\s>]/i.test(out) || /<head[\s>]/i.test(out)) {
    out = injectHtmlBase(out, base);
    out = out.replace(RELATIVE_ATTR, `$1${base}$2`);
  }
  return out;
}

export type ShellChrome = {
  sectionHref: string;
  sectionLabel: string;
  programName: string;
};

const SHELL_BAR_ID = "jianyi-shell-bar";

/** Fixed top bar so programs open at top level, not in an iframe. */
export function injectLibraryChrome(html: string, chrome: ShellChrome): string {
  if (!/<body[\s>]/i.test(html) || html.includes(SHELL_BAR_ID)) return html;
  const bar = `
<nav id="${SHELL_BAR_ID}" aria-label="简一系统库" style="
  position:fixed;z-index:2147483646;left:0;right:0;top:0;display:flex;align-items:center;gap:8px;
  min-height:52px;padding:8px 12px;padding-top:calc(8px + env(safe-area-inset-top,0px));
  background:#1c1915;color:#f6f1e8;font:600 14px/1.2 'PingFang SC','Microsoft YaHei',sans-serif;
  box-shadow:0 1px 0 rgba(255,255,255,.06)
">
  <a href="${chrome.sectionHref}" style="display:inline-flex;align-items:center;min-height:40px;padding:0 12px;border-radius:999px;background:#3a332c;color:inherit;text-decoration:none;white-space:nowrap">返回${chrome.sectionLabel}</a>
  <a href="/" style="display:inline-flex;align-items:center;min-height:40px;padding:0 12px;border-radius:999px;background:#3a332c;color:inherit;text-decoration:none">首页</a>
  <strong style="margin-left:auto;font-weight:600;font-size:15px;text-align:right">${chrome.programName}</strong>
</nav>
<style id="jianyi-shell-bar-style">body{padding-top:calc(52px + env(safe-area-inset-top,0px))!important}</style>`;
  return html.replace(/<body([^>]*)>/i, `<body$1>${bar}`);
}

export function injectHtmlBase(html: string, base: string): string {
  if (/<base\s/i.test(html)) return html;
  const tag = `<base href="${base}">`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${tag}`);
  return `${tag}${html}`;
}

const TEXT_TYPES = [
  "text/html",
  "text/css",
  "text/javascript",
  "application/javascript",
  "application/x-javascript",
  "text/ecmascript",
  "application/json",
  "text/plain",
  "application/xml",
  "text/xml",
  "image/svg+xml",
];

export function isRewritable(contentType: string | null): boolean {
  if (!contentType) return false;
  const mime = contentType.split(";")[0].trim().toLowerCase();
  return TEXT_TYPES.includes(mime);
}

export function rewriteLocation(location: string, prefix: string, origin: string): string {
  const host = origin.replace(/\/$/, "");
  if (location.startsWith(host)) {
    const rest = location.slice(host.length) || "/";
    return prefix + (rest.startsWith("/") ? rest : `/${rest}`);
  }
  if (location.startsWith("/") && !location.startsWith("//") && !location.startsWith(prefix + "/")) {
    return prefix + location;
  }
  return location;
}

export function rewriteSetCookie(cookie: string, secure: boolean): string {
  const parts = cookie.split(";").map((part) => part.trim()).filter(Boolean);
  if (!parts.length) return cookie;
  const kept = [parts[0]];
  for (const part of parts.slice(1)) {
    const lower = part.toLowerCase();
    if (lower.startsWith("domain=")) continue;
    if (!secure && lower === "secure") continue;
    kept.push(part);
  }
  return kept.join("; ");
}
