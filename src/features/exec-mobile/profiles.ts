// Executive configurations sharing the same screens. Demo data only.
export type TickerItem = { id: string; kind: "meeting" | "flight"; title: string; at: string };
export type ExecProfile = {
  id: "tony" | "generic";
  label: string;
  wordmark: "tony" | "generic";
  ticker: TickerItem[];
};

export const execProfiles: Record<ExecProfile["id"], ExecProfile> = {
  tony: {
    id: "tony",
    label: "Tony",
    wordmark: "tony",
    ticker: [
      { id: "t1", kind: "meeting", title: "Leadership Briefing", at: "Today - 2:00 PM" },
      { id: "t2", kind: "flight", title: "Tallahassee - Orlando", at: "Tomorrow - 8:30 AM" },
      { id: "t3", kind: "meeting", title: "Insurance Meeting", at: "Tomorrow - 11:00 AM" },
    ],
  },
  generic: {
    id: "generic",
    label: "Generic",
    wordmark: "generic",
    ticker: [
      { id: "g1", kind: "meeting", title: "Board Prep", at: "Today 11:30 AM" },
      { id: "g2", kind: "meeting", title: "Client Review", at: "Today 3:00 PM" },
      { id: "g3", kind: "flight", title: "New York → Chicago", at: "Tomorrow 8:10 AM" },
      { id: "g4", kind: "meeting", title: "Regional Sync", at: "Tomorrow 2:00 PM" },
    ],
  },
};
