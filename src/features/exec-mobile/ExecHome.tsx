import { useEffect, useState, type CSSProperties } from "react";
import { CheckSquare, MessageCircle, ArrowUpFromLine } from "lucide-react";
import "./exec-mobile.css";
import { graniteMidnightCrimson, themeVars } from "./themes";
import { execProfiles, type ExecProfile } from "./profiles";

function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  if (!now) return "\u00a0";
  const d = now.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
  const t = now.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${d}\u2002\u2002${t}`;
}

function FloridaMark() {
  return (
    <span className="xo-fl" aria-hidden>
      <svg width="26" height="26" viewBox="0 0 32 32" fill="currentColor" style={{ color: "var(--xo-primary)" }}>
        <path d="M2 8h13l2 2h6l1 2c2 2 3 4 4 7l1 4-1 4-2 1-2-2-2-4-2-3-1-4-2-2-2-1-3 1-3-1-3-1H3z" />
      </svg>
    </span>
  );
}

function Wordmark({ profile }: { profile: ExecProfile }) {
  if (profile.wordmark === "tony") {
    return (
      <div className="xo-brand">
        <div className="xo-brand-row"><FloridaMark /><span className="xo-brand-name">Tony</span></div>
        <div className="xo-brand-sub">— E x e c O S —</div>
      </div>
    );
  }
  return (
    <div className="xo-brand">
      <div className="xo-brand-name" style={{ letterSpacing: ".18em", fontSize: 36 }}>EXECOS</div>
      <div className="xo-brand-sub" style={{ letterSpacing: ".3em" }}>Executive Mobile</div>
    </div>
  );
}

export function ExecHome() {
  const [pid, setPid] = useState<ExecProfile["id"]>("tony");
  const profile = execProfiles[pid];
  const clock = useClock();
  const tiles = [
    { key: "answer", label: "Answer", Icon: CheckSquare, bar: true },
    { key: "ask", label: "Ask", Icon: MessageCircle, bar: false },
    { key: "upload", label: "Upload", Icon: ArrowUpFromLine, bar: false },
  ];
  return (
    <div className="xo-root" style={themeVars(graniteMidnightCrimson) as CSSProperties}>
      <div className="xo-phone">
        <div className="xo-top">
          <span>{clock}</span>
          <div className="xo-toggle" role="group" aria-label="Demo configuration">
            {(["tony", "generic"] as const).map((id) => (
              <button key={id} aria-pressed={pid === id} onClick={() => setPid(id)}>{execProfiles[id].label}</button>
            ))}
          </div>
        </div>
        <Wordmark profile={profile} />
        <div className="xo-tiles">
          {tiles.map(({ key, label, Icon, bar }) => (
            <button key={key} className="xo-tile" data-pending="checkpoint-3" aria-label={`${label} (coming in Checkpoint 3)`}>
              {bar && <span className="xo-tile-bar" />}
              <Icon className="xo-tile-icon" strokeWidth={1.5} />
              <span>{label}</span>
              <span className="xo-tile-note">Soon</span>
            </button>
          ))}
        </div>
        <div className="xo-dock">
          <div className="xo-dock-label">Next 48 hours</div>
          <div className="xo-ticker">
            {profile.ticker.map((i) => (
              <div key={i.id} className="xo-chip" data-kind={i.kind}>
                <div className="xo-chip-time">{i.at}</div>
                <div className="xo-chip-title">{i.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
