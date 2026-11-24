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
