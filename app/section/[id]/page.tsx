import Link from "next/link";
import { notFound } from "next/navigation";
import { sectionById } from "@/lib/catalog";
import { liveGapReason, resolveLiveOrigin } from "@/lib/live-origin";

export default async function SectionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const section = sectionById(id);
  if (!section) notFound();
  const availability = await Promise.all(
    section.programs.map(async (program) => ({
      program,
      origin: await resolveLiveOrigin(program.id),
    })),
  );

  return (
    <main className="shell">
      <header className="mast">
        <Link className="back" href="/">
          返回首页
        </Link>
        <p className="eyebrow">{section.kicker}</p>
        <h1>{section.name}</h1>
        <p className="lede">{section.blurb}</p>
      </header>
      <ul className="cards">
        {availability.map(({ program, origin }) => (
          <li key={program.id}>
            {origin ? (
              <Link className="card" href={`/open/${program.id}`}>
                <span className="card-name">{program.name}</span>
                <span className="card-blurb">{program.blurb}</span>
                <span className="card-go">打开</span>
              </Link>
            ) : (
              <div className="card card-off" aria-disabled="true">
                <span className="card-name">{program.name}</span>
                <span className="card-blurb">{program.blurb}</span>
                <span className="card-go">
                  暂未接入
                  {liveGapReason(program.id) ? ` · ${liveGapReason(program.id)}` : ""}
                </span>
              </div>
            )}
          </li>
        ))}
      </ul>
    </main>
  );
}
