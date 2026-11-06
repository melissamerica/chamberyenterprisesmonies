// Central theme registry for ExecOS Executive Mobile. Add themes here; screens read only CSS variables.
export type ExecTheme = {
  id: string;
  name: string;
  finish: "matte" | "satin";
  colors: {
    canvas: string; surface: string; elevated: string; inset: string;
    border: string; borderStrong: string; primary: string; accent: string;
    text: string; textMuted: string;
  };
  fonts: { display: string; body: string };
  radius: { tile: string; chip: string; accentBar: string };
};

export const graniteMidnightCrimson: ExecTheme = {
  id: "granite-midnight-crimson-matte",
  name: "Granite & Midnight Crimson — Matte",
  finish: "matte",
  colors: {
    canvas: "#090D16", surface: "#111726", elevated: "#182032", inset: "#0C111C",
    border: "#1E293B", borderStrong: "#2A364F", primary: "#9F1239", accent: "#BE123C",
    text: "#F8FAFC", textMuted: "#94A3B8",
  },
  fonts: { display: "'Marcellus', Georgia, serif", body: "'Figtree', system-ui, sans-serif" },
  radius: { tile: "18px", chip: "12px", accentBar: "4px" },
};

export const execThemes: Record<string, ExecTheme> = { [graniteMidnightCrimson.id]: graniteMidnightCrimson };

export function themeVars(t: ExecTheme): Record<string, string> {
  const c = t.colors;
  return {
    "--xo-canvas": c.canvas, "--xo-surface": c.surface, "--xo-elevated": c.elevated,
    "--xo-inset": c.inset, "--xo-border": c.border, "--xo-border-strong": c.borderStrong,
    "--xo-primary": c.primary, "--xo-accent": c.accent, "--xo-text": c.text,
    "--xo-text-muted": c.textMuted, "--xo-font-display": t.fonts.display,
    "--xo-font-body": t.fonts.body, "--xo-radius-tile": t.radius.tile,
    "--xo-radius-chip": t.radius.chip, "--xo-radius-bar": t.radius.accentBar,
  };
}
