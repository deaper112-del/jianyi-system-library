import { programById } from "@/lib/catalog";
import type { LiveProgramId } from "@/lib/live-origin";
import { resolveLiveOrigin } from "@/lib/live-origin";
import {
  injectLibraryChrome,
  isRewritable,
  rewriteLocation,
  rewriteSetCookie,
  rewriteText,
} from "@/lib/rewrite";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const HOP = new Set([
  "connection",
  "keep-alive",
  "proxy-authenticate",
  "proxy-authorization",
  "te",
  "trailer",
  "trailers",
  "transfer-encoding",
  "upgrade",
  "host",
  "content-length",
  "content-encoding",
]);

type RouteContext = { params: Promise<{ id: string; path?: string[] }> };

async function proxy(request: Request, context: RouteContext): Promise<Response> {
  const { id, path } = await context.params;
  const origin = await resolveLiveOrigin(id as LiveProgramId);
  if (!origin) return new Response("未找到程序", { status: 404 });
  if (path?.some((segment) => segment === ".." || segment.includes("\\") || segment.includes(":"))) {
    return new Response("路径不正确", { status: 400 });
  }

  const incoming = new URL(request.url);
  const upstream = new URL(origin);
  const suffix = path?.map((segment) => encodeURIComponent(segment)).join("/") ?? "";
  upstream.pathname = `/${suffix}`;
  upstream.search = incoming.search;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP.has(lower) || lower === "cookie" || lower === "origin" || lower === "referer") return;
    headers.append(key, value);
  });
  const cookie = request.headers.get("cookie");
  if (cookie) headers.set("cookie", cookie);
  headers.set("host", upstream.host);
  headers.set("origin", origin);
  const referer = request.headers.get("referer");
  if (referer) {
    try {
      const ref = new URL(referer);
      const marker = `/api/proxy/${id}`;
      const index = ref.pathname.indexOf(marker);
      const rest = index >= 0 ? ref.pathname.slice(index + marker.length) || "/" : "/";
      headers.set("referer", origin.replace(/\/$/, "") + rest + ref.search);
    } catch {
      headers.set("referer", origin);
    }
  }

  const init: RequestInit & { duplex?: "half" } = {
    method: request.method,
    headers,
    redirect: "manual",
  };
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = request.body;
    init.duplex = "half";
  }

  let upstreamResponse: Response;
  try {
    upstreamResponse = await fetch(upstream, init);
  } catch {
    return new Response("程序暂时打不开", { status: 502 });
  }

  const prefix = `/api/proxy/${id}`;
  const outHeaders = new Headers();
  upstreamResponse.headers.forEach((value, key) => {
    const lower = key.toLowerCase();
    if (HOP.has(lower) || lower === "set-cookie" || lower === "x-frame-options" || lower === "content-security-policy") {
      return;
    }
    outHeaders.append(key, value);
  });
  const secure = incoming.protocol === "https:";
  for (const cookieValue of upstreamResponse.headers.getSetCookie()) {
    outHeaders.append("set-cookie", rewriteSetCookie(cookieValue, secure));
  }
  const location = upstreamResponse.headers.get("location");
  if (location) outHeaders.set("location", rewriteLocation(location, prefix, origin));
  outHeaders.set("cache-control", "no-store");

  const type = upstreamResponse.headers.get("content-type");
  if (request.method !== "HEAD" && upstreamResponse.body && isRewritable(type)) {
    const text = await upstreamResponse.text();
    let rewritten = rewriteText(text, prefix, origin);
    const mime = type?.split(";")[0].trim().toLowerCase();
    if (mime === "text/html" && request.method === "GET") {
      const found = programById(id);
      if (found) {
        rewritten = injectLibraryChrome(rewritten, {
          sectionHref: `/section/${found.section.id}`,
          sectionLabel: found.section.name,
          programName: found.program.name,
        });
      }
    }
    outHeaders.delete("content-length");
    return new Response(rewritten, { status: upstreamResponse.status, headers: outHeaders });
  }

  return new Response(upstreamResponse.body, { status: upstreamResponse.status, headers: outHeaders });
}

export const GET = proxy;
export const POST = proxy;
export const PUT = proxy;
export const PATCH = proxy;
export const DELETE = proxy;
export const HEAD = proxy;
export const OPTIONS = proxy;
