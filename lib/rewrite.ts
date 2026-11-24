const RELATIVE_ATTR =
  /(\s(?:src|href|action)=["'])(?!https?:|\/\/|\/|#|data:|mailto:|javascript:|tel:)([^"']+)/gi;
const ROOT_ATTR = /(\s(?:src|href|action|poster)=["'])\/(?!\/)/gi;
const CSS_URL = /url\(\s*(['"]?)\/(?!\/)/gi;

export type RewriteKind = "html" | "css" | "asset";

/**
 * Point upstream URLs at this shell's proxy.
 * JavaScript is not scanned for "/" — that string is a path separator inside
 * the apps, and rewriting it stops their routers and login buttons.
 */
export function rewriteText(text: string, prefix: string, origin: string, kind: RewriteKind = "asset"): string {
  const host = origin.replace(/\/$/, "");
  const base = prefix.endsWith("/") ? prefix : `${prefix}/`;
  let out = text.split(host).join(prefix);
  if (kind === "css") {
    return out.replace(CSS_URL, `url($1${base}`);
  }
  if (kind === "html") {
    out = out.replace(CSS_URL, `url($1${base}`);
    out = out.replace(ROOT_ATTR, `$1${base}`);
    if (/<html[\s>]/i.test(out) || /<head[\s>]/i.test(out)) {
      out = injectHtmlBase(out, base);
      out = out.replace(RELATIVE_ATTR, `$1${base}$2`);
    }
  }
  return out;
}

export type ShellChrome = {
  sectionHref: string;
  sectionLabel: string;
  programName: string;
};

const SHELL_BAR_ID = "jianyi-shell-bar";

const SHIM_ID = "jianyi-proxy-shim";

/**
 * Patch navigation before the app boots, and mount the return bar only after
 * load so Next.js can hydrate the original document.
 */
export function injectProxyRuntime(html: string, prefix: string, chrome: ShellChrome | null): string {
  if (html.includes(SHIM_ID)) return html;
  const base = prefix.endsWith("/") ? prefix.slice(0, -1) : prefix;
  const script = `<script id="${SHIM_ID}">${proxyRuntimeSource(base, chrome)}</script>`;
  if (/<head[^>]*>/i.test(html)) return html.replace(/<head([^>]*)>/i, `<head$1>${script}`);
  return script + html;
}

function proxyRuntimeSource(prefix: string, chrome: ShellChrome | null): string {
  return `(function(){
    var prefix = ${JSON.stringify(prefix)};
    function fix(url) {
      if (typeof url !== "string") return url;
      if (!url || url.startsWith(prefix + "/") || url === prefix || url.startsWith(prefix + "?") || url.startsWith(prefix + "#")) return url;
      if (url.startsWith("/") && !url.startsWith("//")) return prefix + url;
      try {
        var parsed = new URL(url, location.origin);
        if (parsed.origin === location.origin && parsed.pathname.indexOf(prefix + "/") !== 0 && parsed.pathname !== prefix) {
          parsed.pathname = prefix + parsed.pathname;
          return parsed.pathname + parsed.search + parsed.hash;
        }
      } catch (e) {}
      return url;
    }
    var originalFetch = window.fetch;
    if (originalFetch) {
      window.fetch = function (input, init) {
        try {
          if (typeof input === "string") input = fix(input);
          else if (input instanceof Request) {
            var next = fix(input.url);
            if (next !== input.url) input = new Request(next, input);
          }
        } catch (e) {}
        return originalFetch.call(this, input, init);
      };
    }
    var originalOpen = XMLHttpRequest.prototype.open;
    XMLHttpRequest.prototype.open = function (method, url) {
      try { arguments[1] = fix(String(url)); } catch (e) {}
      return originalOpen.apply(this, arguments);
    };
    var originalPush = history.pushState;
    history.pushState = function (state, title, url) {
      if (url != null) url = fix(String(url));
      return originalPush.call(this, state, title, url);
    };
    var originalReplace = history.replaceState;
    history.replaceState = function (state, title, url) {
      if (url != null) url = fix(String(url));
      return originalReplace.call(this, state, title, url);
    };
    try {
      var assign = location.assign.bind(location);
      location.assign = function (url) { return assign(fix(String(url))); };
      var replace = location.replace.bind(location);
      location.replace = function (url) { return replace(fix(String(url))); };
    } catch (e) {}
    document.addEventListener("click", function (event) {
      var node = event.target;
      while (node && node.tagName !== "A") node = node.parentElement;
      if (!node || (node.closest && node.closest("#${SHELL_BAR_ID}"))) return;
      var href = node.getAttribute("href");
      if (!href) return;
      var fixed = fix(href);
      if (fixed !== href) node.setAttribute("href", fixed);
    }, true);
    var chrome = ${JSON.stringify(chrome)};
    function mount() {
      if (!chrome || document.getElementById("${SHELL_BAR_ID}")) return;
      var nav = document.createElement("nav");
      nav.id = "${SHELL_BAR_ID}";
      nav.setAttribute("aria-label", "简一系统库");
      nav.style.cssText = "position:fixed;z-index:2147483646;left:0;right:0;top:0;display:flex;align-items:center;gap:8px;min-height:52px;padding:8px 12px;padding-top:calc(8px + env(safe-area-inset-top,0px));background:#1c1915;color:#f6f1e8;font:600 14px/1.2 PingFang SC,Microsoft YaHei,sans-serif";
      function link(href, text) {
        var anchor = document.createElement("a");
        anchor.href = href;
        anchor.textContent = text;
        anchor.style.cssText = "display:inline-flex;align-items:center;min-height:40px;padding:0 12px;border-radius:999px;background:#3a332c;color:inherit;text-decoration:none;white-space:nowrap";
        return anchor;
      }
      nav.appendChild(link(chrome.sectionHref, "返回" + chrome.sectionLabel));
      nav.appendChild(link("/", "首页"));
      var name = document.createElement("strong");
      name.textContent = chrome.programName;
      name.style.cssText = "margin-left:auto;font-weight:600;font-size:15px";
      nav.appendChild(name);
      document.documentElement.appendChild(nav);
      var style = document.createElement("style");
      style.textContent = "body{padding-top:calc(52px + env(safe-area-inset-top,0px))!important}";
      document.documentElement.appendChild(style);
    }
    window.addEventListener("load", function () { setTimeout(mount, 0); });
  })();`;
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
