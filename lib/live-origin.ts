/**
 * Live published endpoints only. The proxy always fetches upstream on each
 * request so republished apps show up on the next visit without rebuilding
 * this shell.
 */

export type LiveProgramId = "ledger" | "exam" | "reading" | "mbti" | "wheel";

type ProgramSource = {
  /** Preferred published URL when we have confirmed it elsewhere (README, code). */
  candidates: string[];
  /** Cursor Apps slug to probe when no candidate works. */
  slug?: string;
};

const SOURCES: Record<LiveProgramId, ProgramSource> = {
  ledger: {
    slug: "customer-ledger",
    candidates: [],
  },
  exam: {
    slug: "online-exam",
    candidates: ["https://online-exam.apps.grok.bot"],
  },
  reading: {
    slug: "reading-corner",
    candidates: ["https://reading-corner.apps.grok.bot"],
  },
  mbti: {
    slug: "mbti-workplace-quiz",
    candidates: ["https://mbti-workplace-quiz.apps.grok.bot"],
  },
  wheel: {
    slug: "team-wheel",
    candidates: [
      "https://team-wheel.team-wheel.workers.dev",
      "https://team-wheel.apps.grok.bot",
    ],
  },
};

const GATE_MARKERS = ["An app made with Cursor", "apps-gate/authorize", "Open this app"];

type Probe = { ok: boolean; title: string; reason?: string };

async function probeLiveOrigin(url: string): Promise<Probe> {
  try {
    const response = await fetch(url, {
      redirect: "follow",
      headers: {
        "user-agent": "jianyi-system-library/1.0",
        accept: "text/html,application/xhtml+xml",
      },
      cache: "no-store",
      next: { revalidate: 0 },
    });
    if (!response.ok) return { ok: false, title: "", reason: `HTTP ${response.status}` };
    const sample = (await response.text()).slice(0, 8000);
    if (GATE_MARKERS.some((m) => sample.includes(m))) {
      return { ok: false, title: "", reason: "未发布或需登录" };
    }
    const match = sample.match(/<title[^>]*>([^<]*)<\/title>/i);
    const title = match?.[1]?.trim() ?? "";
    if (!title || title === "An app made with Cursor") {
      return { ok: false, title, reason: "没有可用的线上程序" };
    }
    return { ok: true, title };
  } catch {
    return { ok: false, title: "", reason: "暂时无法连接" };
  }
}

function slugUrl(slug: string): string {
  return `https://${slug}.apps.grok.bot/`;
}

/** Resolve the current live URL for a program (never a vendored copy). */
export async function resolveLiveOrigin(id: LiveProgramId): Promise<string | null> {
  const source = SOURCES[id];
  const tried = new Set<string>();
  for (const url of source.candidates) {
    const normalized = url.endsWith("/") ? url : `${url}/`;
    if (tried.has(normalized)) continue;
    tried.add(normalized);
    const probe = await probeLiveOrigin(normalized);
    if (probe.ok) return normalized.replace(/\/$/, "");
  }
  if (source.slug) {
    const url = slugUrl(source.slug);
    if (!tried.has(url)) {
      const probe = await probeLiveOrigin(url);
      if (probe.ok) return url.replace(/\/$/, "");
    }
  }
  return null;
}

export function liveGapReason(id: LiveProgramId): string | undefined {
  if (id === "ledger") return "customer-ledger 仓库未找到可嵌入的稳定线上地址";
  return undefined;
}