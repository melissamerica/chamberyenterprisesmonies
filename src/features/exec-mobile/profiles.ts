import type { DemoScheduleItem } from "./schedule";

// Demo-only profiles. The same screen and theme tokens serve both brands.
export type ExecProfile = {
  id: "tony" | "generic";
  label: string;
  wordmark: "tony" | "generic";
  ticker: DemoScheduleItem[];
};

export const execProfiles: Record<ExecProfile["id"], ExecProfile> = {
  tony: {
    id: "tony",
    label: "Tony",
    wordmark: "tony",
    ticker: [
      { id: "t1", kind: "meeting", title: "Leadership Briefing", minutesAhead: 90 },
      { id: "t2", kind: "flight", title: "Tallahassee → Orlando", minutesAhead: 1200 },
      { id: "t3", kind: "meeting", title: "Insurance Meeting", minutesAhead: 1620 },
    ],
  },
  generic: {
    id: "generic",
    label: "Generic",
    wordmark: "generic",
    ticker: [
      { id: "g1", kind: "meeting", title: "Board Prep", minutesAhead: 60 },
      { id: "g2", kind: "meeting", title: "Client Review", minutesAhead: 240 },
      { id: "g3", kind: "flight", title: "New York → Chicago", minutesAhead: 1100 },
      { id: "g4", kind: "meeting", title: "Regional Sync", minutesAhead: 1690 },
    ],
  },
};
