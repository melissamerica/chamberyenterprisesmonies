import { Link } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { HomeLink, ChamberyWordmark } from "./brand";
import { useSession } from "@/hooks/use-session";

const nav = [
  { to: "/anya", label: "Anya" },
  { to: "/alec", label: "Alec" },
  { to: "/security", label: "Security" },
  { to: "/pricing", label: "Pricing" },
] as const;

export function SiteHeader() {
  const { session } = useSession();
  return (
    <header className="sticky top-0 z-40 border-b border-hairline bg-cream/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-6 py-4">
        <HomeLink />
        <nav className="hidden items-center gap-8 text-sm text-sage md:flex">
          {nav.map((n) => (
            <Link key={n.to} to={n.to} className="transition-colors hover:text-ink" activeProps={{ className: "text-ink" }}>
              {n.label}
            </Link>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          {session ? (
            <Button asChild size="sm"><Link to="/app">Open workspace</Link></Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm"><Link to="/contact">Book a demo</Link></Button>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="border-t border-hairline">
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-14 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <div>
          <ChamberyWordmark size="sm" />
          <p className="mt-4 max-w-xs text-sm text-sage">Eliminate the human error, <span className="font-semibold text-plum">not the human.</span></p>
        </div>
        <FooterCol title="Products" links={[["/anya", "Anya"], ["/alec", "Alec"]]} />
        <FooterCol title="Company" links={[["/security", "Security"], ["/pricing", "Pricing"], ["/contact", "Contact sales"]]} />
        <FooterCol title="Account" links={[["/auth", "Sign in"], ["/app", "Workspace"]]} />
      </div>
      <p className="mx-auto max-w-6xl px-6 pb-10 text-xs text-sage">© {new Date().getFullYear()} Chambery Enterprises</p>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: [string, string][] }) {
  return (
    <div>
      <p className="eyebrow">{title}</p>
      <ul className="mt-4 space-y-2 text-sm">
        {links.map(([to, label]) => (
          <li key={to}><a href={to} className="text-ink/80 hover:text-plum">{label}</a></li>
        ))}
      </ul>
    </div>
  );
}

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-cream font-brand text-ink">
      <SiteHeader />
      <main>{children}</main>
      <SiteFooter />
    </div>
  );
}
