import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function ChamberyWordmark({ size = "md", withSub = true, className }: { size?: "sm" | "md" | "xl"; withSub?: boolean; className?: string }) {
  const text = size === "xl" ? "text-7xl md:text-8xl" : size === "md" ? "text-3xl" : "text-2xl";
  return (
    <span className={cn("inline-flex flex-col leading-none text-ink", className)}>
      <span className={cn("font-display tracking-tight", text)}>
        Chambery<span className="brand-dot" />
      </span>
      {withSub && (
        <span className={cn("font-display text-sage", size === "xl" ? "mt-2 text-3xl tracking-[0.35em]" : "mt-1 text-[0.6rem] tracking-[0.42em]")}>
          ENTERPRISES
        </span>
      )}
    </span>
  );
}

export function ProductWordmark({ name, tone = "plum", className }: { name: "anya" | "alec"; tone?: "plum" | "moss"; className?: string }) {
  return (
    <span className={cn("font-brand font-extrabold tracking-tight text-ink", className)}>
      {name}
      <span className={cn("brand-dot", tone === "moss" && "bg-moss")} />
    </span>
  );
}

export function HomeLink() {
  return (
    <Link to="/" aria-label="Chambery Enterprises home">
      <ChamberyWordmark size="sm" />
    </Link>
  );
}
