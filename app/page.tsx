import Link from "next/link";
import { sections } from "@/lib/catalog";

export default function HomePage() {
  return (
    <main className="shell">
      <header className="mast">
        <p className="eyebrow">北京</p>
        <h1>简一系统库</h1>
        <p className="lede">三个入口。点进去就是正在用的程序。</p>
      </header>
      <nav className="doors" aria-label="系统入口">
        {sections.map((section, index) => (
          <Link key={section.id} className="door" href={`/section/${section.id}`}>
            <span className="index">{String(index + 1).padStart(2, "0")}</span>
            <span className="kicker">{section.kicker}</span>
            <span className="door-name">{section.name}</span>
            <span className="door-blurb">{section.blurb}</span>
          </Link>
        ))}
      </nav>
    </main>
  );
}
