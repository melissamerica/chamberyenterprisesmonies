import { useEffect, useState, type CSSProperties } from "react";
import { CheckSquare, MessageCircle, ArrowUpFromLine, CalendarDays, Plane } from "lucide-react";
import "./exec-mobile.css";
import { graniteMidnightCrimson, themeVars } from "./themes";
import { execProfiles, type ExecProfile } from "./profiles";
import { buildDemoSchedule, formatScheduleTime, next48Hours } from "./schedule";

function useClock(): Date | null {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(interval);
  }, []);
  return now;
}

function FloridaMark() {
  return (
    <span className="xo-fl" aria-hidden="true">
      <svg viewBox="0 0 32 32" fill="currentColor" focusable="false">
        <path d="M2 8h13l2 2h6l1 2c2 2 3 4 4 7l1 4-1 4-2 1-2-2-2-4-2-3-1-4-2-2-2-1-3 1-3-1-3-1H3z" />
      </svg>
    </span>
  );
}

function Wordmark({ profile }: { profile: ExecProfile }) {
  if (profile.wordmark === "tony") {
    return (
      <div className="xo-brand" aria-label="Tony ExecOS">
        <div className="xo-brand-row">
          <span className="xo-brand-name xo-tony-wordmark" aria-hidden="true">
            T<span className="xo-wordmark-o"><FloridaMark /></span>ny
          </span>
        </div>
        <div className="xo-brand-sub">— E x e c O S —</div>
      </div>
    );
  }
  return (
    <div className="xo-brand" aria-label="ExecOS Executive Mobile">
      <div className="xo-brand-name xo-generic-wordmark">EXECOS</div>
      <div className="xo-brand-sub">Executive Mobile</div>
    </div>
  );
}

export function ExecHome() {
  const [pid, setPid] = useState<ExecProfile["id"]>("tony");
  const profile = execProfiles[pid];
  const now = useClock();
  const clock = now
    ? new Intl.DateTimeFormat("en-US", {
        weekday: "short", month: "short", day: "numeric",
        hour: "numeric", minute: "2-digit",
      }).format(now)
    : "\u00a0";
  const upcoming = now
    ? next48Hours(buildDemoSchedule(profile.ticker, now), now)
    : [];
  const tiles = [
    { key: "answer", label: "Answer", Icon: CheckSquare, active: true },
    { key: "ask", label: "Ask", Icon: MessageCircle, active: false },
    { key: "upload", label: "Upload", Icon: ArrowUpFromLine, active: false },
  ] as const;

  return (
    <main className="xo-root" style={themeVars(graniteMidnightCrimson) as CSSProperties}>
      <div className="xo-phone">
        <div className="xo-top">
          <span>{clock}</span>
          <div className="xo-toggle" role="group" aria-label="Demo profile only">
            {(["tony", "generic"] as const).map((id) => (
              <button type="button" key={id} aria-pressed={pid === id} onClick={() => setPid(id)}>
                {execProfiles[id].label}
              </button>
            ))}
          </div>
        </div>
        <Wordmark profile={profile} />
        <div className="xo-tiles">
          {tiles.map(({ key, label, Icon, active }) => (
            <button
              type="button"
              key={key}
              className="xo-tile"
              data-pending="checkpoint-3"
              aria-label={label + " (workflow available in Checkpoint 3)"}
              title={label + " workflow available in Checkpoint 3"}
            >
              {active && <span className="xo-tile-bar" aria-hidden="true" />}
              <Icon className="xo-tile-icon" strokeWidth={1.5} aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </div>
        <section className="xo-dock" aria-label="Next 48 hours (synthetic demo)">
          <div className="xo-dock-label">Next 48 hours · Demo</div>
          <div className="xo-ticker" tabIndex={0} aria-label="Scroll horizontally for meetings and travel">
            {upcoming.map((event) => {
              const Icon = event.kind === "flight" ? Plane : CalendarDays;
              return (
                <div key={event.id} className="xo-chip" data-kind={event.kind}>
                  <Icon className="xo-chip-icon" aria-hidden="true" strokeWidth={1.6} />
                  <div className="xo-chip-content">
                    <div className="xo-chip-title">{event.title}</div>
                    <div className="xo-chip-time">{formatScheduleTime(event.startsAt, now!)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </main>
  );
}
