import Link from "next/link";
import { notFound } from "next/navigation";
import { programById } from "@/lib/catalog";
import type { LiveProgramId } from "@/lib/live-origin";
import { resolveLiveOrigin } from "@/lib/live-origin";

export default async function OpenPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const found = programById(id);
  if (!found) notFound();
  const origin = await resolveLiveOrigin(found.program.id as LiveProgramId);
  if (!origin) notFound();
  const { section, program } = found;

  return (
    <div className="stage">
      <header className="stage-bar">
        <Link href={`/section/${section.id}`}>返回{section.name}</Link>
        <Link href="/">首页</Link>
        <strong>{program.name}</strong>
      </header>
      <iframe className="stage-frame" src={`/api/proxy/${program.id}/`} title={program.name} />
    </div>
  );
}
