"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Planning" },
  { href: "/carte", label: "Carte" },
  { href: "/tendance", label: "Tendance" },
  { href: "/balises", label: "Balises" },
  { href: "/campings", label: "Campings" },
  { href: "/modeles", label: "Modèles" },
];

export default function Nav() {
  const path = usePathname();
  return (
    <nav className="nav" aria-label="Navigation principale">
      {LINKS.map((l) => {
        const active = l.href === "/" ? path === "/" || path.startsWith("/spot") : path.startsWith(l.href);
        return (
          <Link key={l.href} href={l.href} className={active ? "active" : undefined}>
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
