import { notFound, redirect } from "next/navigation";
import { programById } from "@/lib/catalog";
import type { LiveProgramId } from "@/lib/live-origin";
import { resolveLiveOrigin } from "@/lib/live-origin";

/** Top-level proxy navigation so Firefox is not blocked from nested embeds. */
export default async function OpenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = programById(id);
  if (!found) notFound();
  const origin = await resolveLiveOrigin(found.program.id as LiveProgramId);
  if (!origin) notFound();
  redirect(`/api/proxy/${found.program.id}/`);
}
