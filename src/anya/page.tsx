

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { CloudUpload, Download, Plus, UserRound, FileText, Settings2, X, Loader2, Check, Plane, Hotel, Car, CalendarDays, Bell, ChevronDown, Menu, MessagesSquare } from "lucide-react";
import { createRecordId } from "@/lib/record-id";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuPortal } from "@/components/ui/dropdown-menu";
import { calendarFormatFor, calendarFormatChange, calendarTemplatePreview, defaultTemplates, executiveIdFor, executiveForTrip, fillTemplate, mergeTemplateKind, reservationTemplateTitle, templateFields, validateCustomTemplate, type Executive, type ExecutiveTemplates, type TemplateKind, type ExecutiveProfile, type SavedCustomTemplate } from "@/lib/executive-profiles";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { UnassignedExpenses } from "@/components/unassigned-expenses";
import { ExpenseApproval } from "@/components/expense-approval";
import { BillingCodeLibrary } from "@/components/billing-code-library";
import { AttachmentUploadReview } from "@/components/attachment-upload-review";
import { DetectedBillingUpload } from "@/components/detected-billing-upload";
import { recognizeUpload, automaticUploadAccept, type RecognizedUpload } from "@/lib/automatic-upload";
import { ProductHome } from "@/components/product-home";
import { HomeWorkflowPreview } from "@/components/home-workflow-preview";
import { HomeDocumentUpload } from "@/components/home-document-upload";
import { WorkspaceUploadPanel } from "@/components/workspace-upload-panel";
import { TravelImportReview, type TravelImportDecision, type TravelImportReviewRequest } from "@/components/travel-import-review";
import { matchingTravelTrips } from "@/lib/travel-trip-matching";
import { VisualTemplateImport } from "@/components/visual-template-import";
import type { referencePreview } from "@/lib/visual-template";
import { ExecutiveProfileFields } from "@/components/executive-profile-fields";
import { emptyExecutiveProfile, normalizeExecutiveProfile, validateExecutiveProfile, mergeExecutiveRecords } from "@/lib/executive-profile-records";
import { LIVE_CONNECTIONS_ENABLED } from "@/lib/workspace-mode";
import { ExecutiveUpload } from "@/components/executive-upload";
import { ItineraryAttachments } from "@/components/itinerary-attachments";
import { mergeUploadedTrips, unassignedExpenseList, isOpenUploadTrip, type UnassignedUpload, type UploadTrip, type UploadExclusion, type VendorRule, type DeferredUpload } from "@/lib/workspace-uploads";
import { CalendarOutput, ExpenseReportOutput, ItineraryOutput } from "@/components/travel-output";
import { parseLabeledConfirmation, readTravelDocument } from "@/lib/travel-confirmations";
import { destinationFromSearch, type WorkspaceDestination } from "@/lib/workspace-navigation";
import { reminderCalendarUrl, reminderTimes, type ReminderCalendar } from "@/lib/attention-reminders";
import { DecisionQueue } from "@/components/decision-queue";
import { missingById, navigationKey, persistFirmTrip, readLegacyWorkspace, type LegacyWorkspace } from "@/lib/workspace-durability";

type AttentionItem = { id: number; tripId: number; title: string; detail: string };

type ItemKind = "Flight" | "Hotel" | "Car" | "Appointment" | "Expense";
type TripItem = {
  billingCode?: import("@/lib/billing-codes").BillingCodeSelection | null;
  id: number; kind: ItemKind; title: string; detail: string; date: string;
  time: string; cost?: number; source?: string; start?: string; end?: string;
  location?: string; expenseEligible?: boolean; itineraryEligible?: boolean; itineraryDate?: string; expenseCategory?: string; sourceFileId?: string; importKey?: string; calendarUid?: string; allDay?: boolean;
  flightCode?: string; origin?: string; destination?: string; seat?: string; confirmation?: string;
  departureTime?: string; arrivalTime?: string;
  expenseDescription?: string; expenseDate?: string; expenseEvidence?: Array<{fileId:string;kind:"receipt"|"statement"}>;
  materialsAttached?: boolean; materialsFormat?: "digital" | "hardcopy" | "both";
};
type Trip = {
  billingCode?: import("@/lib/billing-codes").BillingCodeSelection;
  id: number; name: string; traveler: string; dates: string; route: string;
  items: TripItem[];
  closed?: boolean; closedAt?: string; status?: string;
  executiveId?: string;
  expenseReport?: UploadTrip["expenseReport"];
  expenseDocuments?: UploadTrip["expenseDocuments"];
};

type ParsedConfirmation = {
  name: string;
  traveler: string;
  dates: string;
  route: string;
  items: TripItem[];
};

type WebMCPTool = {
  name: string;
  title: string;
  description: string;
  inputSchema: Record<string, unknown>;
  annotations: { readOnlyHint: boolean; untrustedContentHint: boolean };
  execute: (input: unknown) => unknown | Promise<unknown>;
};

type WebMCPContext = {
  registerTool: (
    tool: WebMCPTool,
    options?: { signal?: AbortSignal },
  ) => void | Promise<void>;
};

const sampleTrips: Trip[] = [
  {
    id: 7300001, executiveId: "sample-alex-morgan", name: "Chicago client summit", traveler: "Alex Morgan",
    dates: "Oct 12–15, 2026", route: "MIA → ORD",
    items: [
      { id: 7300101, kind: "Flight", title: "AA 1862 · MIA → ORD", detail: "Main Cabin · Confirmation H7K4Q2", date: "Mon, Oct 12", time: "8:20 AM – 10:41 AM", cost: 428.2, source: "American Airlines confirmation.pdf", start: "2026-10-12T08:20:00-04:00", end: "2026-10-12T10:41:00-05:00", location: "Miami International Airport to Chicago O'Hare International Airport" },
      { id: 7300102, kind: "Car", title: "Hertz · Chicago O'Hare", detail: "Midsize · Confirmation 6840921", date: "Mon, Oct 12", time: "11:15 AM", cost: 267.4, source: "Hertz reservation email", start: "2026-10-12T11:15:00-05:00", end: "2026-10-12T11:45:00-05:00", location: "Hertz at Chicago O'Hare" },
      { id: 7300103, kind: "Hotel", title: "The Hoxton, Chicago", detail: "3 nights · Confirmation HX21984", date: "Mon, Oct 12", time: "Check-in 3:00 PM", cost: 924, source: "Hotel confirmation.png", start: "2026-10-12T15:00:00-05:00", end: "2026-10-15T11:00:00-05:00", location: "The Hoxton, Chicago" },
      { id: 7300104, kind: "Appointment", title: "Client dinner · Aba", detail: "302 N Green Street · Reservation under Alex", date: "Tue, Oct 13", time: "6:30 PM – 8:00 PM", source: "Calendar appointment", start: "2026-10-13T18:30:00-05:00", end: "2026-10-13T20:00:00-05:00", location: "Aba, 302 N Green Street, Chicago" },
    ],
  },
  {
    id: 7300002, executiveId: "sample-alex-morgan", name: "Denver strategy session", traveler: "Alex Morgan",
    dates: "Nov 4–6, 2026", route: "MIA → DEN",
    items: [
      { id: 7300201, kind: "Flight", title: "UA 1189 · MIA → DEN", detail: "Economy Plus · Confirmation C9RP4M", date: "Wed, Nov 4", time: "9:05 AM – 11:28 AM", cost: 386.7, source: "United confirmation email", start: "2026-11-04T09:05:00-05:00", end: "2026-11-04T11:28:00-07:00", location: "Miami International Airport to Denver International Airport" },
      { id: 7300202, kind: "Hotel", title: "The Rally Hotel", detail: "2 nights · Confirmation RH73310", date: "Wed, Nov 4", time: "Check-in 4:00 PM", cost: 612, source: "Hotel confirmation.pdf", start: "2026-11-04T16:00:00-07:00", end: "2026-11-06T11:00:00-07:00", location: "The Rally Hotel, Denver" },
    ],
  },
];


function iconFor(kind: ItemKind) {
  if (kind === "Flight") return <Plane className="size-4" />;
  if (kind === "Hotel") return <Hotel className="size-4" />;
  if (kind === "Car") return <Car className="size-4" />;
  return <CalendarDays className="size-4" />;
}

function BrandLockup() {
  return <span><span className="anya-name">Anya</span><span className="brand-tagline">The EA’s Assistant</span><span className="brand-signature">by Lissa</span></span>;
}

function detectKind(name: string): ItemKind {
  if (/hotel|marriott|hilton|hyatt|inn|hoxton/i.test(name)) return "Hotel";
  if (/car|hertz|avis|enterprise|rental/i.test(name)) return "Car";
  if (/flight|air|delta|united|american|jetblue|southwest/i.test(name)) return "Flight";
  return "Appointment";
}

const airportTimeZones: Record<string, string> = {
  ATL: "America/New_York", BOS: "America/New_York", CLT: "America/New_York",
  DCA: "America/New_York", EWR: "America/New_York", FLL: "America/New_York",
  IAD: "America/New_York", JFK: "America/New_York", LGA: "America/New_York",
  MCO: "America/New_York", MIA: "America/New_York", PHL: "America/New_York",
  TLH: "America/New_York", ORD: "America/Chicago", DFW: "America/Chicago",
  IAH: "America/Chicago", DEN: "America/Denver", PHX: "America/Phoenix",
  LAS: "America/Los_Angeles", LAX: "America/Los_Angeles", SEA: "America/Los_Angeles",
  SFO: "America/Los_Angeles",
};

const airportCities: Record<string, string> = {
  ATL: "Atlanta", BOS: "Boston", CLT: "Charlotte", DCA: "Washington",
  DEN: "Denver", DFW: "Dallas", EWR: "Newark", FLL: "Fort Lauderdale",
  IAD: "Washington", IAH: "Houston", JFK: "New York", LAS: "Las Vegas",
  LAX: "Los Angeles", LGA: "New York", MCO: "Orlando", MIA: "Miami",
  ORD: "Chicago", PHL: "Philadelphia", PHX: "Phoenix", SEA: "Seattle",
  SFO: "San Francisco", TLH: "Tallahassee",
};

const monthNumbers: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
};

function decodeEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&ndash;|&mdash;/gi, "-")
    .replace(/&rarr;/gi, "to");
}

function readableEmailText(raw: string) {
  const unfolded = raw.replace(/=\r?\n/g, "").replace(/=([0-9A-F]{2})/gi, (_, hex) =>
    String.fromCharCode(Number.parseInt(hex, 16)));
  return decodeEntities(unfolded)
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function dateParts(label: string) {
  const match = label.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{1,2}),\s+(\d{4})/i);
  if (!match) return null;
  return { year: Number(match[3]), month: monthNumbers[match[1].toLowerCase()], day: Number(match[2]) };
}

function clockParts(label: string) {
  const match = label.match(/(\d{1,2}):(\d{2})\s*([AP])M/i);
  if (!match) return null;
  let hour = Number(match[1]) % 12;
  if (match[3].toUpperCase() === "P") hour += 12;
  return { hour, minute: Number(match[2]) };
}

function offsetFor(year: number, month: number, day: number, timeZone: string) {
  const sample = new Date(Date.UTC(year, month - 1, day, 12));
  const zoneName = new Intl.DateTimeFormat("en-US", {
    timeZone,
    timeZoneName: "shortOffset",
  }).formatToParts(sample).find((part) => part.type === "timeZoneName")?.value ?? "GMT-4";
  const match = zoneName.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);
  if (!match) return "-04:00";
  return `${match[1]}${match[2].padStart(2, "0")}:${match[3] ?? "00"}`;
}

function isoFor(dateLabel: string, timeLabel: string, airport: string, addDay = false) {
  const date = dateParts(dateLabel);
  const clock = clockParts(timeLabel);
  if (!date || !clock) return null;
  const adjusted = new Date(Date.UTC(date.year, date.month - 1, date.day + (addDay ? 1 : 0), 12));
  const year = adjusted.getUTCFullYear();
  const month = adjusted.getUTCMonth() + 1;
  const day = adjusted.getUTCDate();
  const timeZone = airportTimeZones[airport];
  if (!timeZone) return null;
  const offset = offsetFor(year, month, day, timeZone);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}T${String(clock.hour).padStart(2, "0")}:${String(clock.minute).padStart(2, "0")}:00${offset}`;
}

function shortDate(label: string) {
  const date = dateParts(label);
  if (!date) return label;
  return new Intl.DateTimeFormat("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" })
    .format(new Date(Date.UTC(date.year, date.month - 1, date.day)));
}

async function parseFlightConfirmation(file: File): Promise<ParsedConfirmation | null> {
  if (!/\.eml$|\.html?$|\.txt$/i.test(file.name) && !/message|text/i.test(file.type)) return null;
  const raw = await file.text();
  const text = readableEmailText(raw);

  const legPattern = /((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday),\s+(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},\s+\d{4})\s*-\s*((?:DL|AA|UA|WN|B6|AS|F9|NK|Delta)\s*\d{1,4})\s+(\d{1,2}:\d{2}\s*[AP]M)\s+([A-Z]{3})\s*-\s*.*?\s+to\s+(\d{1,2}:\d{2}\s*[AP]M)\s+([A-Z]{3})\s*-/gi;
  const matches = Array.from(text.matchAll(legPattern));
  if (!matches.length) return null;

  const confirmation = text.match(/Confirmation number\s+([A-Z0-9]{5,8})/i)?.[1] ?? "";
  const traveler = text.match(/Passenger\s+([A-Z][A-Za-z'-]+(?:\s+[A-Z][A-Za-z'-]+){1,3})\s+Confirmation/i)?.[1] ?? "Executive";
  const totalText = text.match(/Total\s+\$?([0-9,]+\.\d{2})/i)?.[1];
  const total = totalText ? Number(totalText.replace(/,/g, "")) : undefined;
  const seat = text.match(/Seat\s+([0-9]{1,2}[A-Z])/i)?.[1];
  const baseId = Date.now();

  const items = matches.flatMap((match, index) => {
    const [, dateLabel, flightText, departTime, origin, arriveTime, destination] = match;
    const legSeat = text.slice(match.index ?? 0, matches[index + 1]?.index ?? text.length).match(/\bSeat\s*[:=]?\s*([0-9]{1,3}[A-Z])\b/i)?.[1]?.toUpperCase() ?? (matches.length === 1 ? seat : undefined);
    const start = isoFor(dateLabel, departTime, origin);
    let end = isoFor(dateLabel, arriveTime, destination);
    if (!start || !end) return [];
    if (Date.parse(end) <= Date.parse(start)) end = isoFor(dateLabel, arriveTime, destination, true) ?? end;
    const flight = flightText.replace(/Delta/i, "DL").replace(/\s+/g, " ").toUpperCase();
    return [{
      id: baseId + index,
      kind: "Flight" as const,
      title: `${flight} · ${origin} → ${destination}`,
      detail: `Main Cabin${confirmation ? ` · Confirmation ${confirmation}` : ""}${legSeat ? ` · Seat ${legSeat}` : ""}`,
      date: shortDate(dateLabel),
      time: `${departTime.toUpperCase()} – ${arriveTime.toUpperCase()}`,
      cost: index === 0 ? total : undefined,
      source: file.name,
      start,
      end,
      location: `${airportCities[origin] ?? origin} (${origin}) to ${airportCities[destination] ?? destination} (${destination})`,
      flightCode: flight, origin, destination, seat: legSeat, confirmation: confirmation || undefined,
      departureTime: departTime, arrivalTime: arriveTime,
    }];
  });
  if (!items.length) return null;

  const codes = [matches[0][4], ...matches.map((match) => match[6])];
  const firstDestination = matches[0][6];
  const firstDate = dateParts(matches[0][1]);
  const lastDate = dateParts(matches[matches.length - 1][1]);
  const dateLabel = firstDate && lastDate
    ? `${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(firstDate.year, firstDate.month - 1, firstDate.day)))}–${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" }).format(new Date(Date.UTC(lastDate.year, lastDate.month - 1, lastDate.day)))}`
    : "Dates detected";

  return {
    name: `${airportCities[firstDestination] ?? firstDestination} trip`,
    traveler,
    dates: dateLabel,
    route: codes.join(" → "),
    items,
  };
}

export default function Home() {
  const [testWorkspace, setTestWorkspace] = useState(false);
  useEffect(() => {
    const syncEntry = () => setTestWorkspace(!!destinationFromSearch(window.location.search));
    syncEntry();
    window.addEventListener("popstate", syncEntry);
    return () => window.removeEventListener("popstate", syncEntry);
  }, []);
  return testWorkspace ? <TestWorkspace /> : <ProductHome />;
}

export function TestWorkspace({ firmId = "", userId = "", readOnly = false }: { firmId?: string; userId?: string; readOnly?: boolean } = {}) {
  const [trips, setTrips] = useState<Trip[]>([]);
  const tripsRef = useRef(trips);
  const [executives, setExecutives] = useState<Executive[]>([]);
  const [selectedExecutiveId, setSelectedExecutiveId] = useState("");
  const [executiveOpen, setExecutiveOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<"expenses" | "calendar">("expenses");
  const [uploadIntake, setUploadIntake] = useState<File>();
  const [uploadIntakeText, setUploadIntakeText] = useState<string>();
  const uploadIntakeResolve = useRef<(() => void) | null>(null);
  const [auxiliaryUpload, setAuxiliaryUpload] = useState<{file: File; kind: "attachment" | "billing" | "review"; warning?: string} | null>(null);
  const auxiliaryUploadResolve = useRef<(() => void) | null>(null);
  const [attachmentRevision, setAttachmentRevision] = useState(0);
  const [travelImportReview, setTravelImportReview] = useState<TravelImportReviewRequest | null>(null);
  const travelImportResolve = useRef<((choice: TravelImportDecision) => void) | null>(null);
  const [reviewLater, setReviewLater] = useState(false);
  const [calendarReview, setCalendarReview] = useState(false);
  const [uploadExclusions, setUploadExclusions] = useState<UploadExclusion[]>([]);
  const [vendorRules, setVendorRules] = useState<VendorRule[]>([]);
  const [deferredUploads, setDeferredUploads] = useState<DeferredUpload[]>([]);
  const [unassignedUploads, setUnassignedUploads] = useState<UnassignedUpload[]>([]);
  const [uploadFocusRow, setUploadFocusRow] = useState<string>();
  const [uploadLoading, setUploadLoading] = useState(true);
  const [uploadLoadError, setUploadLoadError] = useState("");
  const [savedTemplates, setSavedTemplates] = useState<SavedCustomTemplate[]>([]);
  const [editingTemplateId, setEditingTemplateId] = useState<string>();
  const [assignmentTemplate, setAssignmentTemplate] = useState<SavedCustomTemplate | null>(null);
  const [assignmentIds, setAssignmentIds] = useState<string[]>([]);
  const [assignmentSaving, setAssignmentSaving] = useState(false);
  const [assignmentError, setAssignmentError] = useState("");
  const [newProfileDraft, setNewProfileDraft] = useState<ExecutiveProfile>(emptyExecutiveProfile);
  const [profileSaving, setProfileSaving] = useState(false);
  const profileSaveLock = useRef(false);
  const [profileError, setProfileError] = useState("");
  const [profilesLoading, setProfilesLoading] = useState(true);
  const [profilesLoadError, setProfilesLoadError] = useState("");
  const [mobileNavigation, setMobileNavigation] = useState(false);
  const [executiveName, setExecutiveName] = useState("");
  const [executiveError, setExecutiveError] = useState("");
  const [profileOpen, setProfileOpen] = useState(false);
  const [profileExecutiveId, setProfileExecutiveId] = useState("");
  const [profileSetup, setProfileSetup] = useState(false);
  const [profileDraft, setProfileDraft] = useState<ExecutiveProfile>(emptyExecutiveProfile);
  const [reportOpen, setReportOpen] = useState(false);
  const [reportTripId, setReportTripId] = useState("");
  const [reportType, setReportType] = useState<"expenses" | "itinerary">("expenses");
  const [activeTab, setActiveTab] = useState("itinerary");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [templateTab, setTemplateTab] = useState<TemplateKind>("outlook");
  const [templateReturnToProfile, setTemplateReturnToProfile] = useState(false);
  const [templateSaving, setTemplateSaving] = useState(false);
  const templateSaveLock = useRef(false);
  const [templateLoading, setTemplateLoading] = useState(true);
  const [templateLoadError, setTemplateLoadError] = useState("");
  const [calendarTemplateView, setCalendarTemplateView] = useState<"edit" | "preview">("edit");
  const [templatePreviewItemIndex, setTemplatePreviewItemIndex] = useState(0);
  const templateInputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const [templateExecutiveId, setTemplateExecutiveId] = useState(selectedExecutiveId);
  const [templateExecutiveIds, setTemplateExecutiveIds] = useState<string[]>([selectedExecutiveId]);
  const [templateDraft, setTemplateDraft] = useState<ExecutiveTemplates>({ ...defaultTemplates });
  const [templateError, setTemplateError] = useState("");
  const [templateReferencePreview,setTemplateReferencePreview]=useState<ReturnType<typeof referencePreview>|null>(null);
  const [templateReferenceOpen,setTemplateReferenceOpen]=useState(false);
  const [templateEditorSession,setTemplateEditorSession]=useState(0);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const importQueue = useRef<Promise<void>>(Promise.resolve());
  const [homeImport,setHomeImport]=useState<{executiveId:string;files:File[];id:string}|null>(null);
  const startedHomeImport=useRef<string | undefined>(undefined);
  const [hydrated, setHydrated] = useState(false);
  const [navigationRestored, setNavigationRestored] = useState(false);
  const pendingDestination = useRef<WorkspaceDestination | null>(null);
  const [screen, setScreen] = useState<"home" | "executive" | "detail" | "templates" | "unassigned-expenses" | "billing-codes" | "decision-queue">("home");
  const [billingReturnToReport, setBillingReturnToReport] = useState(false);
  const [activeTripId, setActiveTripId] = useState(1);
  const [notice, setNotice] = useState("");
  const [tripSaving, setTripSaving] = useState(false);
  const [tripSaveError, setTripSaveError] = useState("");
  const [legacyReview, setLegacyReview] = useState<LegacyWorkspace | null>(null);
  const [legacyImporting, setLegacyImporting] = useState(false);
  const [legacyError, setLegacyError] = useState("");
  const [legacyResult, setLegacyResult] = useState("");
  const [newTripOpen, setNewTripOpen] = useState(false);
  const [appointmentOpen, setAppointmentOpen] = useState(false);
  const [newTripName, setNewTripName] = useState("");
  const [newExecutive, setNewExecutive] = useState("Alex Morgan");
  const [appointmentTitle, setAppointmentTitle] = useState("");
  const [appointmentDate, setAppointmentDate] = useState("");
  const [outputBusy, setOutputBusy] = useState<"itinerary" | "expenses" | null>(null);
  const [materialsBusy, setMaterialsBusy] = useState(false);
  const materialsSaving = useRef(false);
  const [materialsError, setMaterialsError] = useState("");
  const [itineraryTab, setItineraryTab] = useState("schedule");
  const [attachmentEntryId, setAttachmentEntryId] = useState<number>();
  const [attachmentsBusy, setAttachmentsBusy] = useState(false);
  const [calendarProvider, setCalendarProvider] = useState<"outlook" | "google">("outlook");
  const [calendarConnections, setCalendarConnections] = useState({ outlook: false, google: false });
  const calendarName = calendarProvider === "outlook" ? "Outlook" : "Google Calendar";
  const [calendarPublish, setCalendarPublish] = useState<Record<number, {
    status: "publishing" | "published" | "error";
    provider?: "outlook" | "google";
    title?: string;
    error?: string;
    url?: string;
  }>>({});
  const [tripFilter, setTripFilter] = useState<"All" | "Upcoming" | "Past" | "Drafts">("All");
  const [tripSearch, setTripSearch] = useState("");
  const [dismissedAttentionIds, setDismissedAttentionIds] = useState<number[]>([]);
  const [openAttention, setOpenAttention] = useState<AttentionItem | null>(null);
  const [reminderItem, setReminderItem] = useState<AttentionItem | null>(null);
  const [reminderProvider, setReminderProvider] = useState<ReminderCalendar>("outlook");
  const [reminderDate, setReminderDate] = useState("");
  const [reminderTime, setReminderTime] = useState("09:00");
  const [reminderBusy, setReminderBusy] = useState(false);
  const [reminderError, setReminderError] = useState("");
  const [attentionItems, setAttentionItems] = useState<AttentionItem[]>([]);
  const smartInput = useRef<HTMLInputElement>(null);

  const selectedExecutive = executives.find(profile => profile.id === selectedExecutiveId) ?? executives[0];
  const executiveTrips = trips.filter(trip => executiveForTrip(trip, executives)?.id === selectedExecutive?.id);
  const activeTrip = executiveTrips.find((trip) => trip.id === activeTripId) ?? executiveTrips[0];
  const expenses = useMemo(
    () => activeTrip?.items.filter((item) => item.kind !== "Appointment" && item.expenseEligible !== false && (typeof item.cost === "number" || !!item.source)) ?? [],
    [activeTrip],
  );
  const visibleTrips = executiveTrips.filter((trip) => {
    const matchesSearch = `${trip.name} ${trip.traveler} ${trip.route}`
      .toLowerCase()
      .includes(tripSearch.toLowerCase());
    const bookingDates = trip.items.flatMap(item => [item.start, item.end]).filter((value): value is string => !!value).map(Date.parse).filter(Number.isFinite);
    const isDraft = bookingDates.length === 0;
    const isPast = !isDraft && Math.max(...bookingDates) < Date.now();
    const matchesFilter = tripFilter === "All" || (tripFilter === "Drafts" ? isDraft : tripFilter === "Past" ? isPast : !isDraft && !isPast);
    return matchesSearch && matchesFilter;
  });

  useEffect(() => {
    tripsRef.current = trips;
  }, [trips]);

  useEffect(() => {
    void fetch("/api/calendar/status").then((response) => response.json() as Promise<{ outlook?: boolean; google?: boolean }>)
      .then((value) => setCalendarConnections({ outlook: value.outlook === true, google: value.google === true }))
      .catch(() => {});
  }, []);

  // Legacy browser data has no account identity. Never hydrate it into a firm automatically.
  // Current records are loaded from the authenticated firm's APIs below.
  useEffect(() => {
    pendingDestination.current = destinationFromSearch(window.location.search) ?? { page: "home" };
    if (new URLSearchParams(window.location.search).get("itineraryTab") === "attachments") setItineraryTab("attachments");
    setHydrated(true);
  }, []);

  useEffect(() => { if (hydrated) void loadCustomTemplates(); }, [hydrated]);
  async function loadExecutiveProfiles() {
    setProfilesLoading(true); setProfilesLoadError("");
    try {
      const response = await fetch("/api/executive-profiles", {cache:"no-store"});
      const result = await response.json() as {executives?: Array<{id:string;name:string;profile:ExecutiveProfile}>;error?:string};
      if(!response.ok || !Array.isArray(result.executives)) throw Error(result.error || "Executive profiles could not load.");
      setExecutives(current => mergeExecutiveRecords(current,result.executives!));
    } catch(error) { setProfilesLoadError(error instanceof Error ? error.message : "Executive profiles could not load."); }
    finally { setProfilesLoading(false); }
  }
  useEffect(() => { if(hydrated)void loadExecutiveProfiles(); },[hydrated]);

  async function loadUploads() {
    setUploadLoading(true);
    try {
      const response = await fetch("/api/uploads");
      const result = await response.json() as { trips?: UploadTrip[]; exclusions?: UploadExclusion[]; rules?: VendorRule[]; deferred?: DeferredUpload[]; unassigned?: UnassignedUpload[]; error?: string };
      if (!response.ok || !result.trips) throw new Error(result.error || "Saved uploads could not load.");
      setTrips(current => { const merged = mergeUploadedTrips(current, result.trips!); tripsRef.current = merged; return merged; });
      setExecutives(current => [...current, ...result.trips!.filter(trip => !current.some(profile => profile.id === trip.executiveId || profile.name.toLowerCase() === trip.traveler.toLowerCase())).filter((trip, index, all) => all.findIndex(value => value.executiveId === trip.executiveId) === index).map(trip => ({id: trip.executiveId!, name: trip.traveler, templates: {...defaultTemplates}}))]);
      setUploadLoadError("");
      setUploadExclusions(result.exclusions ?? []);
      setVendorRules(result.rules ?? []);
      setDeferredUploads(result.deferred ?? []);
      setUnassignedUploads(result.unassigned ?? []);
      setExecutives(current => [...current, ...(result.unassigned ?? []).filter(value=>!current.some(executive=>executive.id===value.executiveId)).filter((value,index,all)=>all.findIndex(item=>item.executiveId===value.executiveId)===index).map(value=>({id:value.executiveId,name:value.executiveName,templates:{...defaultTemplates}}))]);
    } catch (error) { setUploadLoadError(error instanceof Error ? error.message : "Saved uploads could not load."); }
    finally { setUploadLoading(false); }
  }
  useEffect(() => { if (hydrated) void loadUploads(); }, [hydrated]);
  useEffect(() => { if (!selectedExecutiveId && executives.length) setSelectedExecutiveId(executives[0].id); }, [selectedExecutiveId, executives]);

  /** Commit a complete trip only after the firm API confirms it. No browser-only success. */
  async function commitTrip(trip: Trip): Promise<Trip> {
    const owner = trip.executiveId || executives.find(e => e.name.trim().toLowerCase() === trip.traveler.trim().toLowerCase())?.id || executiveIdFor(trip.traveler);
    const owned: Trip = { ...trip, executiveId: owner };
    setTripSaving(true); setTripSaveError("");
    try {
      await persistFirmTrip(owned);
      const merged = [...tripsRef.current.filter(t => t.id !== owned.id), owned];
      tripsRef.current = merged;
      setTrips(merged);
      return owned;
    } catch (error) {
      const message = error instanceof Error ? error.message : "The trip could not save to your firm.";
      setTripSaveError(message);
      throw error;
    } finally { setTripSaving(false); }
  }

  /** Explicit opt-in only. The historical cache is unscoped and is never auto-imported. */
  function reviewLegacyRecords() {
    setLegacyReview(readLegacyWorkspace(window.localStorage));
    setLegacyError("");
    setLegacyResult("");
  }

  async function recoverLegacyRecords() {
    if (!legacyReview || legacyImporting || readOnly || uploadLoading || profilesLoading || uploadLoadError || profilesLoadError) return;
    setLegacyImporting(true); setLegacyError(""); setLegacyResult("");
    let profilesAdded = 0;
    let tripsAdded = 0;
    const known = [...executives];
    try {
      // No overwrites: even a legacy record with a matching name but a different ID is skipped.
      for (const profile of missingById(known, legacyReview.executives)) {
        if (known.some(existing => existing.name.trim().toLowerCase() === profile.name.trim().toLowerCase())) continue;
        const saved = await persistExecutive({ ...profile, templates: profile.templates ?? { ...defaultTemplates } });
        known.push(saved);
        setExecutives(current => current.some(e => e.id === saved.id) ? current : [...current, saved]);
        profilesAdded++;
      }
      // Old trips can have an executive name but no saved executive ID.
      for (const trip of missingById(tripsRef.current, legacyReview.trips)) {
        let executive = known.find(e => e.id === trip.executiveId) ??
          known.find(e => e.name.trim().toLowerCase() === trip.traveler.trim().toLowerCase());
        if (!executive) {
          const candidate: Executive = { id: trip.executiveId || executiveIdFor(trip.traveler), name: trip.traveler, templates: { ...defaultTemplates } };
          executive = await persistExecutive(candidate);
          known.push(executive);
          setExecutives(current => current.some(e => e.id === executive!.id) ? current : [...current, executive!]);
          profilesAdded++;
        }
        await commitTrip({ ...trip, executiveId: executive.id });
        tripsAdded++;
      }
      setLegacyResult(`Imported ${tripsAdded} trip(s) and ${profilesAdded} executive profile(s). Existing firm records were not overwritten. Your original browser backup remains untouched.`);
      await loadExecutiveProfiles();
      await loadUploads();
    } catch (error) {
      setLegacyError(`Import stopped after ${tripsAdded} trip(s) and ${profilesAdded} profile(s). ${error instanceof Error ? error.message : "Please retry."} Your original browser records are unchanged; retry skips already imported records.`);
    } finally { setLegacyImporting(false); }
  }

  function uploadedTripsSaved(saved: UploadTrip[], kind: "expenses" | "itinerary", notice?: string) {
    setTrips(current => { const merged = [...current.map(trip => saved.find(updated => updated.id === trip.id) ?? trip), ...saved.filter(trip => !current.some(existing => existing.id === trip.id))]; tripsRef.current = merged; return merged; });
    const first = saved[0]; if (first) setActiveTripId(first.id);
    if(screen!=="unassigned-expenses") { setActiveTab(kind); setScreen("executive"); }
    rememberEditedPage(screen==="unassigned-expenses"?{page:"unassigned-expenses"}:{page: "executive", travelerId: selectedExecutive?.id, tripId: first?.id});
    setNotice(notice ?? (kind === "itinerary" ? "Selected meetings added to the itinerary alongside the travel details." : "Uploaded expenses applied to their selected trips."));
  }

  async function saveItineraryMaterials(tripId:number,itemId:number,change:{materialsAttached:boolean;materialsFormat?:"digital"|"hardcopy"|"both"}) {
    if(materialsSaving.current)return;
    const trip=tripsRef.current.find(value=>value.id===tripId);
    if(!trip||!trip.items.some(item=>item.id===itemId))return;
    materialsSaving.current=true;setMaterialsBusy(true);setMaterialsError("");
    const updated={...trip,executiveId:trip.executiveId??executiveForTrip(trip,executives)?.id??executiveIdFor(trip.traveler),items:trip.items.map(item=>item.id===itemId?{...item,...change}:item)};
    try{
      const response=await fetch("/api/uploads",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({trips:[updated]})});
      const result=await response.json() as {saved?:boolean;error?:string};
      if(!response.ok||!result.saved)throw new Error(result.error||"The materials indication could not save. Try again.");
      setTrips(current=>{const merged=current.map(value=>value.id===tripId?{...value,executiveId:updated.executiveId,items:value.items.map(item=>item.id===itemId?{...item,...change}:item)}:value);tripsRef.current=merged;return merged;});
      rememberEditedPage({page:"itinerary",travelerId:updated.executiveId,tripId});setNotice("Materials indication saved.");
    }catch(error){setMaterialsError(error instanceof Error?error.message:"The materials indication could not save.");}
    finally{materialsSaving.current=false;setMaterialsBusy(false);}
  }

  function attachmentTripSaved(saved:UploadTrip) {
    setTrips(current=>{const merged=current.map(trip=>trip.id===saved.id?saved:trip);tripsRef.current=merged;return merged;});
    rememberEditedPage({page:"itinerary",travelerId:saved.executiveId,tripId:saved.id});
  }


  useEffect(() => {
    if (!hydrated || templateLoading || uploadLoading || profilesLoading || navigationRestored) return;
    const destination = pendingDestination.current;
    if (destination) {
      const requestedTrip = trips.find(trip => trip.id === destination.tripId);
      const executive = executives.find(profile => profile.id === destination.travelerId) ?? (requestedTrip ? executiveForTrip(requestedTrip, executives) : undefined) ?? executives.find(profile => profile.id === selectedExecutiveId) ?? executives[0];
      if (executive) {
        setSelectedExecutiveId(executive.id); setNewExecutive(executive.name);
        const trip = requestedTrip && executiveForTrip(requestedTrip, executives)?.id === executive.id ? requestedTrip : trips.find(trip => executiveForTrip(trip, executives)?.id === executive.id);
        if (trip) setActiveTripId(trip.id);
        if (destination.page === "home") setScreen("home");
        else if(destination.page === "unassigned-expenses")setScreen("unassigned-expenses");
        else if(destination.page === "billing-codes") { setBillingReturnToReport(!!destination.tripId); setScreen("billing-codes"); }
        else if (destination.page === "templates") {
          setScreen("templates");
          const saved = savedTemplates.find(value => value.id === destination.templateId);
          if (saved) openLibraryTemplate(saved, destination.templateTab ?? "outlook");
        }
        else if (["itinerary", "calendar", "expenses"].includes(destination.page)) { setActiveTab(destination.page); setScreen(trip ? "detail" : "executive"); }
        else {
          setScreen("executive");
          if (destination.page === "profile") openProfile(executive);
          if (destination.page === "executive" && new URLSearchParams(window.location.search).get("upload") === "1") { setCalendarReview(new URLSearchParams(window.location.search).get("calendarReview") === "1"); setUploadOpen(true); }
        }
      }
    }
    setNavigationRestored(true);
  }, [hydrated, templateLoading, uploadLoading, profilesLoading, navigationRestored, executives, trips, selectedExecutiveId, savedTemplates]);

  useEffect(() => {
    if (!hydrated || !navigationRestored || screen === "home") return;
    const destination: WorkspaceDestination = templatesOpen ? { page: "templates", travelerId: templateExecutiveId, templateId: editingTemplateId, templateTab } : screen === "templates" ? { page: "templates" } : screen === "billing-codes" ? {page:"billing-codes"} : screen === "unassigned-expenses" ? {page:"unassigned-expenses"} : profileOpen ? { page: "profile", travelerId: profileExecutiveId } : { page: screen === "detail" ? activeTab as "itinerary" | "calendar" | "expenses" : "executive", travelerId: selectedExecutiveId, tripId: activeTrip?.id };
    if (firmId && userId) try { window.localStorage.setItem(navigationKey(firmId, userId, "last-workspace"), JSON.stringify(destination)); } catch { /* Navigation still works without browser preferences. */ }
  }, [hydrated, navigationRestored, screen, selectedExecutiveId, activeTrip?.id, activeTab, templatesOpen, templateExecutiveId, editingTemplateId, templateTab, profileOpen, profileExecutiveId, firmId, userId]);

  // Do not cache sensitive trip, executive or expense records in unscoped localStorage.
  // Server confirmation is required before a firm record is treated as saved.
  useEffect(() => {
    const context = (document as Document & { modelContext?: WebMCPContext }).modelContext;
    if (!context?.registerTool) return;
    const lifecycle = new AbortController();

    const registrations = [
      context.registerTool({
        name: "create_trip_draft",
        title: "Create trip draft",
        description: "Create a new trip in the visible trip list for a named executive.",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            executive: { type: "string" },
          },
          required: ["name", "executive"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          const value = input as { name?: unknown; executive?: unknown };
          if (typeof value.name !== "string" || !value.name.trim() ||
              typeof value.executive !== "string" || !value.executive.trim()) {
            throw new Error("A trip name and executive are required.");
          }
          const id = Date.now();
          const trip: Trip = {
            id,
            name: value.name.trim(),
            traveler: value.executive.trim(),
            executiveId: executives.find(profile => profile.name.toLowerCase() === value.executive!.toString().trim().toLowerCase())?.id,
            dates: "Dates not set",
            route: "Route pending",
            items: [],
          };
          await commitTrip(trip);
          setActiveTripId(id);
          setNotice(`Saved “${trip.name}” to your firm. Drop in the first confirmation.`);
          return { id, name: trip.name, executive: trip.traveler, status: "draft" };
        },
      }, { signal: lifecycle.signal }),
      context.registerTool({
        name: "add_appointment_to_active_trip",
        title: "Add trip appointment",
        description: "Add a meeting, meal, or event to the itinerary for the active trip.",
        inputSchema: {
          type: "object",
          properties: {
            title: { type: "string" },
            date: { type: "string" },
            time: { type: "string" },
          },
          required: ["title", "date", "time"],
          additionalProperties: false,
        },
        annotations: { readOnlyHint: false, untrustedContentHint: false },
        async execute(input) {
          const value = input as { title?: unknown; date?: unknown; time?: unknown };
          if (typeof value.title !== "string" || !value.title.trim() ||
              typeof value.date !== "string" || !value.date.trim() ||
              typeof value.time !== "string" || !value.time.trim()) {
            throw new Error("Title, date, and time are required.");
          }
          const item: TripItem = {
            id: Date.now(),
            kind: "Appointment",
            title: value.title.trim(),
            detail: "Added to the custom itinerary",
            date: value.date.trim(),
            time: value.time.trim(),
            source: "Assistant-created appointment",
          };
          const current = tripsRef.current.find(trip => trip.id === activeTripId);
          if (!current) throw new Error("Choose a trip before adding an appointment.");
          await commitTrip({ ...current, items: [...current.items, item] });
          rememberEditedPage({ page: "itinerary", travelerId: selectedExecutive?.id, tripId: current.id });
          setNotice("Appointment saved to your firm.");
          return { tripId: activeTripId, appointmentId: item.id, status: "added" };
        },
      }, { signal: lifecycle.signal }),
    ];

    void Promise.all(registrations.map((result) => Promise.resolve(result))).catch(() => {});
    return () => lifecycle.abort();
  }, [activeTripId, executives]);

  function rememberEditedPage(destination: WorkspaceDestination) {
    if (firmId && userId) try { window.localStorage.setItem(navigationKey(firmId, userId, "last-edited-page"), JSON.stringify(destination)); } catch { /* Navigation still works without browser preferences. */ }
  }

  async function addTrip() {
    if (tripSaving) return;
    const name = newTripName.trim() || "New trip";
    const id = Date.now();
    const draft: Trip = {
      id, name, executiveId: selectedExecutive?.id, traveler: newExecutive.trim() || selectedExecutive?.name || "Executive",
      dates: "Dates not set", route: "Route pending", items: [],
    };
    try {
      await commitTrip(draft);
      setActiveTripId(id);
      setActiveTab("itinerary");
      setScreen("detail");
      setNewTripName("");
      setNewTripOpen(false);
      rememberEditedPage({ page: "itinerary", travelerId: selectedExecutive?.id, tripId: id });
      setNotice(`Saved “${name}” to your firm. Drop in the first confirmation.`);
    } catch { /* Keep the dialog and draft open; the error is shown inline. */ }
  }

  function processFiles(files: FileList | File[], targetId?: number) {
    const list = Array.from(files);
    if (!list.length) return;
    if (uploadLoading || uploadLoadError) { setNotice("Load the saved trips before uploading a travel document. Use Retry if the trip list could not load."); return; }
    importQueue.current = importQueue.current.then(() => routeFileBatch(list, targetId))
      .catch(() => setNotice("The file could not be processed. Please drop it in again."));
    if (smartInput.current) smartInput.current.value = "";
  }

  // Wait for the executive state to render before capturing the existing import queue.
  useEffect(()=>{
    if(!homeImport||selectedExecutiveId!==homeImport.executiveId||!executives.some(value=>value.id===homeImport.executiveId)||startedHomeImport.current===homeImport.id)return;
    startedHomeImport.current=homeImport.id;
    processFiles(homeImport.files);
    setHomeImport(null);
  },[homeImport,selectedExecutiveId,executives]);

  function finishAuxiliaryUpload() {
    const resolve = auxiliaryUploadResolve.current;
    auxiliaryUploadResolve.current = null; setAuxiliaryUpload(null); resolve?.();
  }

  async function routeFileBatch(list: File[], targetId?: number) {
    for (const file of list) {
      try {
        setNotice(`Recognizing “${file.name}”…`);
        const recognized: RecognizedUpload = await recognizeUpload(file);
        // A queued Home upload retains its chosen executive even if an earlier
        // import or navigation changed the visible profile while it waited.
        if(selectedExecutive)setSelectedExecutiveId(selectedExecutive.id);
        if (recognized.kind === "travel") { await processFileBatch([file], targetId, recognized.text); continue; }
        if (recognized.kind === "expenses" || recognized.kind === "calendar") {
          setReviewLater(false); setCalendarReview(false); setUploadMode(recognized.kind === "calendar" ? "calendar" : "expenses");
          // The calendar importer expects .ics, including when an export was given a generic filename.
          const intake = recognized.kind === "calendar" && !/\.ics$/i.test(file.name) ? new File([file], `${file.name}.ics`, {type:"text/calendar",lastModified:file.lastModified}) : file;
          await new Promise<void>(resolve => { uploadIntakeResolve.current = resolve; setUploadIntakeText(recognized.text); setUploadIntake(intake); setUploadOpen(true); });
        } else {
          await new Promise<void>(resolve => { auxiliaryUploadResolve.current = resolve; setAuxiliaryUpload({file,kind:recognized.kind as "attachment" | "billing" | "review",warning:recognized.warning}); });
        }
      } catch (error) { setNotice(`${file.name}: ${error instanceof Error ? error.message : "The document could not be processed."}`); }
    }
  }

  async function processFileBatch(list: File[], targetId?: number, extractedText?: string) {
    let workingTrips = [...tripsRef.current];
    for (const [fileIndex, file] of list.entries()) {
      const kind = detectKind(file.name);
      setNotice(`Reading “${file.name}”…`);
      let parsed: ParsedConfirmation | null = null;
      let failure = "Required booking details could not be read. Review the document before confirming its trip.";
      try {
        const text = extractedText ?? await readTravelDocument(file);
        if (/\b(?:booking|reservation|flight)\s+(?:has been\s+)?cancelled\b|cancellation confirmation/i.test(text)) {
          failure = "This is a cancellation. The original reservation needs to be matched before any entries can be removed.";
        } else {
          parsed = await parseFlightConfirmation(new File([text], `${file.name}.txt`, { type: "text/plain" }))
            ?? parseLabeledConfirmation(text, file.name, Date.now() + fileIndex);
          if (parsed) {
            if (parsed.traveler === "Executive") parsed.traveler = workingTrips.find(trip => trip.id === targetId)?.traveler || selectedExecutive?.name || parsed.traveler;
            parsed.items = parsed.items.map((item, index) => ({ ...item, source: file.name, expenseEligible: item.kind !== "Flight" || index === 0 }));
          }
        }
      } catch (error) {
        failure = error instanceof Error ? error.message : "The confirmation could not be read.";
      }
      workingTrips = [...tripsRef.current];
      const importExecutive = executives.find(executive => executive.name.trim().toLowerCase() === parsed?.traveler.trim().toLowerCase()) ?? selectedExecutive;
      const availableTrips = workingTrips.filter(trip => executiveForTrip(trip, executives)?.id === importExecutive?.id && isOpenUploadTrip(trip));
      const review: TravelImportReviewRequest = {
        filename: file.name, executiveName: importExecutive?.name ?? parsed?.traveler ?? "Executive",
        suggestedName: parsed?.name ?? file.name.replace(/\.[^.]+$/, ""), dates: parsed?.dates ?? "Dates need review", route: parsed?.route ?? "Destination needs review",
        detailsError: parsed ? undefined : failure,
        trips: availableTrips, matches: parsed ? matchingTravelTrips(parsed, availableTrips) : [],
      };
      const decision = await new Promise<TravelImportDecision>(resolve => { travelImportResolve.current = resolve; setTravelImportReview(review); });
      if (!decision) { setNotice(`Skipped “${file.name}”.`); continue; }
      workingTrips = [...tripsRef.current];
      const matchingTrip = "tripId" in decision ? workingTrips.find(trip => trip.id === decision.tripId) : undefined;
      if ("tripId" in decision && (!matchingTrip || !isOpenUploadTrip(matchingTrip))) { setNotice("That trip is no longer available. Upload the document again to choose another trip."); continue; }
      if (importExecutive) setSelectedExecutiveId(importExecutive.id);
      if (parsed) {
        const uniqueItems = matchingTrip
          ? parsed.items.filter((item) => !matchingTrip.items.some((existing) => existing.title === item.title && existing.start === item.start))
          : parsed.items;
        if (!uniqueItems.length) {
          setNotice(`“${file.name}” was already imported.`);
          continue;
        }
        const destination = matchingTrip?.id ?? Date.now() + fileIndex;
        const report = matchingTrip?.expenseReport ?? { id: `expenses-${destination}`, createdAt: new Date().toISOString() };
        const destinationTrip: Trip = matchingTrip
          ? { ...matchingTrip, items: [...matchingTrip.items, ...uniqueItems], expenseReport: report }
          : { id: destination, ...parsed, name: "name" in decision ? decision.name : parsed.name, executiveId: importExecutive?.id, items: uniqueItems, expenseReport: report };
        workingTrips = matchingTrip
          ? workingTrips.map((trip) => trip.id === destination ? destinationTrip : trip)
          : [...workingTrips, destinationTrip];
        try { await commitTrip(destinationTrip); }
        catch (error) { setNotice(`“${file.name}” was not saved: ${error instanceof Error ? error.message : "Please retry the upload."}`); continue; }
        workingTrips = [...tripsRef.current];
        setActiveTripId(destination);
        setActiveTab("itinerary");
        setScreen("detail");
        rememberEditedPage({ page: "itinerary", travelerId: executiveForTrip(destinationTrip, executives)?.id ?? selectedExecutive?.id, tripId: destination });
        if (!LIVE_CONNECTIONS_ENABLED) { setNotice("Imported. Itinerary, expense report, and calendar entry previews are ready. Live calendar publishing is disabled in this workspace."); continue; }
        setNotice(`Itinerary and expenses ready. Publishing to ${calendarName}…`);
        const results = await Promise.all(uniqueItems.map((item) => publishToCalendar(item, destinationTrip, true)));
        const published = results.filter(Boolean).length;
        if (published === uniqueItems.length) {
          setNotice(`Imported. Itinerary, expenses, and ${published} ${calendarName} events ready.`);
        } else {
          setAttentionItems((current) => [...current, {
            id: Date.now(), tripId: destination, title: `${calendarName} publishing needs attention`,
            detail: `${uniqueItems.length - published} calendar entries are not yet published. The itinerary and expense report are already available.`,
          }]);
          setNotice(`Itinerary and expenses ready. ${calendarConnections[calendarProvider] ? `${published} of ${uniqueItems.length} calendar entries published.` : `${calendarName} needs connection.`}`);
        }
        continue;
      }
      const destination = matchingTrip?.id ?? Date.now() + fileIndex;
      const newItem: TripItem = {
        id: Date.now() + fileIndex, kind, title: `${kind === "Car" ? "Rental-car" : kind} confirmation received`,
        detail: failure, date: "Details pending", time: "Details pending", source: file.name,
      };
      const matching = workingTrips.find((trip) => trip.id === destination);
      if (matching) workingTrips = workingTrips.map((trip) => trip.id === destination ? {
        ...trip, items: [...trip.items, newItem], expenseReport: trip.expenseReport ?? { id: `expenses-${destination}`, createdAt: new Date().toISOString() },
      } : trip);
      else workingTrips = [...workingTrips, {
        id: destination, executiveId: importExecutive?.id, name: "name" in decision ? decision.name : file.name.replace(/\.[^.]+$/, ""), traveler: importExecutive?.name || "Executive", dates: "Dates pending", route: "Details pending",
        items: [newItem], expenseReport: { id: `expenses-${destination}`, createdAt: new Date().toISOString() },
      }];
      const pendingTrip = workingTrips.find(t => t.id === destination);
      if (!pendingTrip) { setNotice("The reviewed trip could not be found. Re-upload the document."); continue; }
      try { await commitTrip(pendingTrip); }
      catch (error) { setNotice(`“${file.name}” was not saved: ${error instanceof Error ? error.message : "Please retry the upload."}`); continue; }
      workingTrips = [...tripsRef.current];
      setAttentionItems((current) => [...current, { id: Date.now() + fileIndex, tripId: destination, title: "Confirmation needs details", detail: `“${file.name}”: ${failure}` }]);
      rememberEditedPage({ page: "itinerary", travelerId: selectedExecutive?.id, tripId: destination });
      setNotice(`Saved “${file.name}”. Booking details need attention.`);
      setActiveTripId(destination);
      setActiveTab("itinerary");
      setScreen("detail");
    }
  }

  async function addAppointment() {
    if (!activeTrip || !appointmentTitle.trim() || tripSaving) return;
    const item: TripItem = {
      id: Date.now(), kind: "Appointment", title: appointmentTitle.trim(),
      detail: "Added manually to this itinerary", date: appointmentDate || "Date pending",
      time: "Time pending", source: "Manual appointment",
    };
    try {
      await commitTrip({ ...activeTrip, items: [...activeTrip.items, item] });
      setAppointmentTitle("");
      setAppointmentDate("");
      setAppointmentOpen(false);
      setNotice("Appointment saved to your firm.");
    } catch { /* Keep the appointment editor open on failed save. */ }
  }

  async function exportOutput(kind: "itinerary" | "expenses", trip = activeTrip, templates?: ExecutiveTemplates) {
    if (!trip || outputBusy) return;
    setOutputBusy(kind);
    try {
      const format = templates ?? executiveForTrip(trip, executives)?.templates ?? defaultTemplates;
      const { buildExpenseWorkbook, buildItineraryDocument, downloadOutput } = await import("@/lib/travel-exports");
      const blob = kind === "itinerary" ? await buildItineraryDocument(format, trip) : new Blob([new Uint8Array(await buildExpenseWorkbook(format, trip))], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
      downloadOutput(blob, `${trip.name.replace(/[^a-z0-9_-]+/gi, "_")}_${kind === "itinerary" ? "itinerary.docx" : "expenses.xlsx"}`);
      setNotice(kind === "itinerary" ? "Editable Word itinerary downloaded." : "Excel expense report downloaded.");
    } catch (error) {
      setNotice(`Download failed: ${error instanceof Error ? error.message : "Please try again."}`);
    } finally { setOutputBusy(null); }
  }

  async function publishToCalendar(item: TripItem, tripContext: Trip = activeTrip, quiet = false) {
    if (!LIVE_CONNECTIONS_ENABLED) { if (!quiet) setNotice("Live calendar publishing is disabled in this workspace."); return false; }
    if (!item.start || !item.end) {
      if (!quiet) setNotice(`${item.title} could not publish because the exact start and end time are missing.`);
      return false;
    }

    setCalendarPublish((current) => ({
      ...current,
      [item.id]: { status: "publishing", provider: calendarProvider },
    }));

    try {
      const templates = executiveForTrip(tripContext, executives)?.templates ?? defaultTemplates;
      const event = calendarTemplatePreview(templates,item,tripContext);
      const eventTitle = event.title || item.title;
      const response = await fetch("/api/calendar/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventTitle,
          start: item.start,
          end: item.end,
          location: event.location,
          showAs: event.showAs,
          reminderMinutes: event.reminderMinutes,
          notes: event.notes,
          timezone: "America/New_York",
          sourceId: `trip-${tripContext.id}-item-${item.id}`,
          provider: calendarProvider,
          allDay: item.allDay,
        }),
      });
      const result = await response.json() as { error?: string; htmlLink?: string };
      if (!response.ok) throw new Error(result.error || `${calendarName} did not accept the event.`);
      setCalendarPublish((current) => ({
        ...current,
        [item.id]: { status: "published", url: result.htmlLink, provider: calendarProvider, title: eventTitle },
      }));
      if (!quiet) { rememberEditedPage({ page: "calendar", travelerId: executiveForTrip(tripContext, executives)?.id, tripId: tripContext.id }); setNotice(`Published “${item.title}” to ${calendarName}.`); }
      return true;
    } catch (error) {
      setCalendarPublish((current) => ({
        ...current,
        [item.id]: { status: "error", provider: calendarProvider, error: error instanceof Error ? error.message : "Calendar publishing failed." },
      }));
      if (!quiet) setNotice(error instanceof Error ? error.message : "Calendar publishing failed. Please try again.");
      return false;
    }
  }

  const isHome = screen === "home";
  const isWorkspace = screen === "executive" || !activeTrip;
  const relevantAttention = attentionItems.filter(item => !dismissedAttentionIds.includes(item.id) && (isWorkspace ? executiveTrips.some(trip => trip.id === item.tripId) : item.tripId === activeTrip?.id));
  const reminderCalendarName = reminderProvider === "outlook" ? "Outlook" : "Google Calendar";

  function openReminder(item: AttentionItem, provider: ReminderCalendar) {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    setReminderDate(`${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, "0")}-${String(tomorrow.getDate()).padStart(2, "0")}`);
    setReminderTime("09:00");
    setReminderProvider(provider);
    setReminderError("");
    setReminderItem(item);
  }

  async function createAttentionReminder() {
    if (!reminderItem || reminderBusy) return;
    setReminderError("");
    try {
      const times = reminderTimes(reminderDate, reminderTime);
      const trip = trips.find(saved => saved.id === reminderItem.tripId);
      const title = `Reminder: ${reminderItem.title}`;
      const notes = [reminderItem.detail, trip ? `${trip.traveler} · ${trip.name}` : "", `Open travel workspace: ${window.location.origin}`].filter(Boolean).join("\n\n");
      if (!calendarConnections[reminderProvider]) {
        const calendarWindow = window.open("", "_blank");
        if (!calendarWindow) throw new Error("Allow pop-ups for this site, then try opening your calendar again.");
        calendarWindow.opener = null;
        calendarWindow.location.href = reminderCalendarUrl(reminderProvider, title, notes, times.start, times.end);
        setNotice(`Reminder draft opened in ${reminderCalendarName}. Save it there to set your reminder.`);
        setReminderItem(null);
        return;
      }
      setReminderBusy(true);
      const response = await fetch("/api/calendar/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title, ...times, notes, provider: reminderProvider, timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "America/New_York", sourceId: `attention-${reminderItem.tripId}-${reminderItem.id}-${times.start}` }),
      });
      const result = await response.json() as { ok?: boolean; eventId?: string; error?: string };
      if (!response.ok || !result.ok || !result.eventId) throw new Error(result.error || `${reminderCalendarName} did not confirm your reminder. Please try again.`);
      setNotice(`Reminder added to ${reminderCalendarName} for ${new Date(times.start).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}.`);
      setReminderItem(null);
    } catch (error) {
      setReminderError(error instanceof Error ? error.message : "Could not create the reminder. Please try again.");
    } finally {
      setReminderBusy(false);
    }
  }
  const menuExecutive = !isWorkspace && activeTrip ? executiveForTrip(activeTrip, executives) ?? selectedExecutive : selectedExecutive;
  const activeTemplates = activeTrip ? executiveForTrip(activeTrip, executives)?.templates ?? defaultTemplates : defaultTemplates;
  const templateExecutive = executives.find(profile => profile.id === templateExecutiveId) ?? selectedExecutive;
  const previewTrip = trips.find(trip => executiveForTrip(trip, executives)?.id === templateExecutive?.id && trip.items.length) ?? trips.find(trip => trip.items.length) ?? { id: -1, name: "Trip", traveler: templateExecutive?.name || selectedExecutive?.name || "Executive", dates: "Dates pending", route: "Route pending", items: [] };
  const templatePreviewItem = templateReferencePreview?.item ?? previewTrip.items[templatePreviewItemIndex] ?? previewTrip.items[0] ?? { id: -1, kind: "Appointment", title: "", detail: "", date: "", time: "" };
  const effectiveCalendarDraft = calendarFormatFor(templateDraft,templatePreviewItem.kind);
  const flightFormatKey = templateTab === "outlook" ? "calendarFlightFormat" : "itineraryFlightFormat";
  const itineraryPreviewTrip = previewTrip;
  const reportTrips = trips.filter(trip => executiveForTrip(trip, executives)?.id === menuExecutive?.id);

  async function persistExecutive(executive: Executive) {
    const response=await fetch("/api/executive-profiles",{method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:executive.id,name:executive.name,profile:executive.profile})});
    const result=await response.json() as {executive?:{id:string;name:string;profile:ExecutiveProfile};error?:string};
    if(!response.ok||!result.executive)throw Error(result.error||"The executive profile could not save.");
    return {...executive,...result.executive};
  }
  async function addExecutive() {
    if(profileSaveLock.current)return;
    const name=executiveName.trim();
    if(!name){setExecutiveError("Enter an executive name.");return;}
    if(executives.some(profile=>profile.name.toLowerCase()===name.toLowerCase())){setExecutiveError("That executive already exists.");return;}
    const profile=normalizeExecutiveProfile(newProfileDraft),issue=validateExecutiveProfile(profile);
    if(issue){setExecutiveError(issue);return;}
    profileSaveLock.current=true;setProfileSaving(true);setExecutiveError("");
    try {
      const executive=await persistExecutive({id:createRecordId(),name,templates:{...defaultTemplates},profile});
      setExecutives(current=>[...current,executive]);setSelectedExecutiveId(executive.id);
      setNewExecutive(name);setTripSearch("");setTripFilter("All");setActiveTab("itinerary");setScreen("executive");
      setExecutiveName("");setNewProfileDraft(emptyExecutiveProfile());setExecutiveOpen(false);setNotice("Executive profile saved. Add a trip or upload a confirmation.");
      rememberEditedPage({page:"executive",travelerId:executive.id});
    }catch(error){setExecutiveError(error instanceof Error?error.message:"The executive could not save.");}
    finally{profileSaveLock.current=false;setProfileSaving(false);}
  }
  function openProfile(executive: Executive, setup = false) {
    setProfileExecutiveId(executive.id);setProfileDraft(normalizeExecutiveProfile(executive.profile));setProfileError("");setProfileSetup(setup);setProfileOpen(true);
  }
  function closeProfile() {
    if(profileSaveLock.current)return;
    setProfileOpen(false);if(profileSetup)setScreen("executive");setProfileSetup(false);
  }
  async function saveProfile() {
    if(profileSaveLock.current)return;
    const executive=executives.find(value=>value.id===profileExecutiveId);if(!executive)return;
    const profile=normalizeExecutiveProfile({...profileDraft,email:profileDraft.email.trim(),phone:profileDraft.phone.trim(),homeAirport:profileDraft.homeAirport.trim().toUpperCase(),notes:profileDraft.notes.trim()});
    const issue=validateExecutiveProfile(profile);if(issue){setProfileError(issue);return;}
    profileSaveLock.current=true;setProfileSaving(true);setProfileError("");
    try {
      const saved=await persistExecutive({...executive,profile});
      setExecutives(current=>current.map(value=>value.id===saved.id?{...value,profile:saved.profile}:value));
      rememberEditedPage({page:"profile",travelerId:executive.id});setProfileOpen(false);if(profileSetup)setScreen("executive");setProfileSetup(false);setNotice("Executive profile and travel preferences saved.");
    }catch(error){setProfileError(error instanceof Error?error.message:"The profile could not save.");}
    finally{profileSaveLock.current=false;setProfileSaving(false);}
  }
  function loadSampleWorkspace() {
    const sampleId="sample-alex-morgan";
    setExecutives(current=>current.some(value=>value.id===sampleId)?current:[...current,{id:sampleId,name:"Alex Morgan",templates:{...defaultTemplates}}]);
    setTrips(current=>{const merged=[...current,...sampleTrips.filter(sample=>!current.some(trip=>trip.id===sample.id))];tripsRef.current=merged;return merged;});
    setNotice("Fictional sample workspace loaded. Your existing records were kept.");
  }

  function openTemplates() {
    if (!menuExecutive) return;
    openExecutiveTemplates(menuExecutive, "outlook");
  }

  function openExecutiveTemplates(executive: Executive, tab: TemplateKind, fromProfile = false) {
    setTemplateReferencePreview(null); setTemplateReferenceOpen(false); setTemplateEditorSession(v=>v+1);
    setTemplateExecutiveId(executive.id);
    setEditingTemplateId(executive.templates.templateId);
    setTemplateExecutiveIds(executive.templates.templateId ? executives.filter(value => value.templates.templateId === executive.templates.templateId).map(value => value.id) : [executive.id]);
    setTemplateDraft({ ...defaultTemplates, ...executive.templates });
    setTemplateError(""); setCalendarTemplateView("edit"); setTemplatePreviewItemIndex(0); templateInputRef.current = null;
    setTemplateTab(tab);
    setTemplateReturnToProfile(fromProfile);
    if (fromProfile) setProfileOpen(false);
    setTemplatesOpen(true);
  }

  function closeTemplates() {
    setTemplatesOpen(false);
    if (templateReturnToProfile) setProfileOpen(true);
    setTemplateReturnToProfile(false);
  }

  async function loadCustomTemplates() {
    setTemplateLoading(true);
    try {
      const response = await fetch("/api/custom-templates", { cache: "no-store" });
      const result = await response.json() as { templates?: Executive[]; library?: SavedCustomTemplate[]; error?: string };
      if (!response.ok || !Array.isArray(result.templates) || !Array.isArray(result.library)) throw new Error(result.error || "Saved custom templates could not load.");
      const saved = result.templates;
      setSavedTemplates(result.library!);
      setExecutives(current => [...current.map(profile => { const match = saved.find(value => value.id === profile.id); return match ? { ...profile, templates: { ...defaultTemplates, ...match.templates } } : profile; }), ...saved.filter(value => !current.some(profile => profile.id === value.id))]);
      setTemplateLoadError("");
    } catch (error) { setTemplateLoadError(error instanceof Error ? error.message : "Saved custom templates could not load."); }
    finally { setTemplateLoading(false); }
  }

  function insertAutomaticField(field: string) {
    const input = templateInputRef.current;
    const key = input?.dataset.templateField as keyof ExecutiveTemplates | undefined;
    if (!input || !key || input.readOnly || !templateFields.includes(field)) { setTemplateError("Select a template text field, then choose an automatic field to insert."); return; }
    const token = `{${field}}`;
    const start = input.selectionStart ?? input.value.length;
    const end = input.selectionEnd ?? start;
    setTemplateDraft(current => {
      const effective=templateTab==='outlook'?calendarFormatFor(current,templatePreviewItem.kind):current;
      const change = {[key]:`${String(effective[key]??'').slice(0,start)}${token}${String(effective[key]??'').slice(end)}`};
      return {...current,...(templateTab==='outlook'?calendarFormatChange(current,templatePreviewItem.kind,change):change)};
    });
    setTemplateError("");
    window.requestAnimationFrame(() => { input.focus(); input.setSelectionRange(start + token.length, start + token.length); });
  }

  function applyTemplateWorkspace(saved: Executive[], library: SavedCustomTemplate[]) {
    setSavedTemplates(library);
    setExecutives(current => [...current.map(executive => { const match = saved.find(value => value.id === executive.id); return match ? { ...executive, templates: { ...defaultTemplates, ...match.templates } } : executive; }), ...saved.filter(value => !current.some(executive => executive.id === value.id))]);
  }

  function openLibraryTemplate(saved?: SavedCustomTemplate, tab: TemplateKind = "outlook") {
    setTemplateReferencePreview(null); setTemplateReferenceOpen(false); setTemplateEditorSession(v=>v+1);
    const assigned = saved ? executives.filter(value => value.templates.templateId === saved.id) : [];
    setEditingTemplateId(saved?.id);
    setTemplateExecutiveId(assigned[0]?.id ?? selectedExecutive?.id ?? "");
    setTemplateExecutiveIds(assigned.map(value => value.id));
    setTemplateDraft({ ...defaultTemplates, ...(saved?.template ?? {}), customName: saved?.template.customName ?? "" });
    setTemplateError(""); setCalendarTemplateView("edit"); setTemplatePreviewItemIndex(0); templateInputRef.current = null;
    setTemplateTab(tab); setTemplateReturnToProfile(false); setTemplatesOpen(true);
  }

  async function saveTemplateAssignments() {
    if (!assignmentTemplate || assignmentSaving || templateLoadError) return;
    setAssignmentSaving(true); setAssignmentError("");
    try {
      const travelers = executives.filter(value => assignmentIds.includes(value.id)).map(({ id, name }) => ({ id, name }));
      const response = await fetch("/api/custom-templates", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ templateId: assignmentTemplate.id, travelers }) });
      const result = await response.json() as { templates?: Executive[]; library?: SavedCustomTemplate[]; error?: string };
      if (!response.ok || !result.templates || !result.library) throw new Error(result.error || "The assignments could not save.");
      applyTemplateWorkspace(result.templates, result.library);
      rememberEditedPage({ page: "templates" });
      setNotice(`Assignments saved for “${assignmentTemplate.template.customName}”.`); setAssignmentTemplate(null);
    } catch (error) { setAssignmentError(error instanceof Error ? error.message : "The assignments could not save."); }
    finally { setAssignmentSaving(false); }
  }

  async function saveTemplates() {
    if (templateSaveLock.current || templateSaving || templateLoading || templateLoadError) return;
    const travelers = executives.filter(profile => templateExecutiveIds.includes(profile.id)).map(({id,name}) => ({id,name}));
    const error = validateCustomTemplate(templateDraft);
    if (error) { setTemplateError(error); return; }
    templateSaveLock.current = true; setTemplateSaving(true); setTemplateError("");
    try {
      const response = await fetch("/api/custom-templates", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ travelers, template: templateDraft, templateId: editingTemplateId }) });
      const result = await response.json() as { template?: ExecutiveTemplates; templates?: Executive[]; library?: SavedCustomTemplate[]; error?: string };
      if (!response.ok || !result.template || !result.templates || !result.library) throw new Error(result.error || "Your custom template could not save. Your edits are still here.");
      applyTemplateWorkspace(result.templates, result.library);
      setEditingTemplateId(result.template.templateId);
      rememberEditedPage({ page: "templates", travelerId: templateExecutiveId, templateId: result.template.templateId, templateTab });
      closeTemplates();
      setTemplateLoadError("");
      setNotice(`“${result.template.customName}” saved.${travelers.length ? ` Assigned to ${travelers.length === 1 ? travelers[0].name : `${travelers.length} executives`}.` : " Assign it to executives whenever you’re ready."}`);
    } catch (error) { setTemplateError(error instanceof Error ? error.message : "Your template could not save. Your edits are still here."); }
    finally { templateSaveLock.current = false; setTemplateSaving(false); }
  }

  function openReport() {
    setReportTripId(String((!isWorkspace ? activeTrip : reportTrips[0])?.id ?? "")); setReportType("expenses"); setReportOpen(true);
  }

  async function createReport() {
    const trip = reportTrips.find(trip => String(trip.id) === reportTripId);
    if (!trip || tripSaving) return;
    if (reportType === "expenses") {
      if (trip.expenseReport && !window.confirm("A report already exists for this trip. Replace its draft? The existing report will remain until you confirm.")) return;
      try {
        await commitTrip({ ...trip, expenseReport: { id: `expenses-${trip.id}-${Date.now()}`, createdAt: new Date().toISOString() } });
      } catch { return; }
    }
    rememberEditedPage({ page: reportType, travelerId: executiveForTrip(trip, executives)?.id, tripId: trip.id });
    setActiveTripId(trip.id); setActiveTab(reportType); setScreen("detail"); setReportOpen(false);
    setNotice(reportType === "expenses" ? "Expense report saved to your firm. Export when ready." : "Travel itinerary ready. Print or save as PDF.");
  }

  function dropFiles(files: FileList | File[]) {
    processFiles(files, isWorkspace ? undefined : activeTrip?.id);
  }

  function eventStatus(item: TripItem) {
    if (item.calendarUid) return <span className="text-sm text-slate-600">Included from uploaded calendar</span>;
    const saved = calendarPublish[item.id];
    const status = (saved?.provider ?? "google") === calendarProvider ? saved : undefined;
    if (status?.status === "publishing") return <span className="inline-flex items-center gap-2 text-sm text-slate-600"><Loader2 className="size-4 animate-spin" />Publishing…</span>;
    if (status?.status === "published") return <span className="inline-flex flex-wrap items-center gap-2 text-sm text-emerald-700"><Check className="size-4" />Published{status.url && <a href={status.url} target="_blank" rel="noreferrer" className="underline underline-offset-4">Open event</a>}</span>;
    if (status?.status === "error") return <div className="flex flex-wrap items-center gap-3"><span className="text-sm text-amber-800">{calendarConnections[calendarProvider] ? "Could not publish" : `${calendarName} needs connection`}</span><Button size="sm" variant="outline" onClick={() => void publishToCalendar(item)}>Retry</Button><details className="w-full text-sm text-slate-600"><summary className="w-fit cursor-pointer">Details</summary><p className="mt-2">{status.error || "Calendar publishing needs attention."}</p></details></div>;
    return <span className="text-sm text-slate-500">{item.start && item.end ? "Not published" : "Booking times missing"}</span>;
  }

  function selectExecutive(id: string) {
    const profile = executives.find(profile => profile.id === id);
    if (!profile) return;
    setSelectedExecutiveId(profile.id); setNewExecutive(profile.name); setTripSearch(""); setTripFilter("All"); setNotice(""); setActiveTab("itinerary"); setScreen("executive");
  }

  const executiveEditor = (
    <Dialog open={executiveOpen} onOpenChange={open=>{if(!profileSaving)setExecutiveOpen(open);}}><DialogContent showCloseButton={!profileSaving} className="executive-profile-dialog sm:max-w-3xl"><DialogHeader><DialogTitle>Create executive</DialogTitle><DialogDescription>Add contact details and travel preferences. Only the name is required unless you add a provider.</DialogDescription></DialogHeader>
      <form className="grid gap-5" onSubmit={event=>{event.preventDefault();void addExecutive();}}><fieldset disabled={profileSaving} className="contents"><div className="grid gap-2"><Label htmlFor="executive-name">Name</Label><Input id="executive-name" maxLength={160} value={executiveName} onChange={event=>{setExecutiveName(event.target.value);setExecutiveError("");}} placeholder="Executive name"/></div>
      <ExecutiveProfileFields prefix="new-executive" value={newProfileDraft} onChange={setNewProfileDraft}/>
      {executiveError&&<p role="alert" className="profile-validation">{executiveError}</p>}<DialogFooter className="profile-footer"><Button type="button" variant="outline" onClick={()=>setExecutiveOpen(false)}>Cancel</Button><Button type="submit">{profileSaving?"Saving…":"Create executive"}</Button></DialogFooter></fieldset></form>
    </DialogContent></Dialog>
  );

  const templatesEditor = (
      <Dialog open={templatesOpen} onOpenChange={open => { if (templateSaving) return; if (open) setTemplatesOpen(true); else closeTemplates(); }}>
        <DialogContent onFocusCapture={event => { const target = event.target; if ((target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) && target.dataset.templateField) templateInputRef.current = target; }} className={`max-h-[85vh] overflow-y-auto ${templateTab === "outlook" ? "sm:max-w-3xl" : "sm:max-w-4xl"}`}><DialogHeader><DialogTitle>{editingTemplateId ? "Edit custom template" : "Create custom template"}</DialogTitle><DialogDescription>Design your calendar, itinerary, and expense formats. Automatic fields fill separately for every booking.</DialogDescription></DialogHeader>
          <fieldset disabled={templateSaving} className="contents">
          <div className="grid gap-2"><Label htmlFor="custom-template-name">Template name</Label><Input id="custom-template-name" value={templateDraft.customName ?? ""} maxLength={120} placeholder="e.g. Best practices" onChange={event => { setTemplateDraft(current => ({ ...current, customName: event.target.value })); setTemplateError(""); }} disabled={templateSaving} />{templateDraft.updatedAt && <p className="text-xs text-slate-500">Saved {new Date(templateDraft.updatedAt!).toLocaleString()}</p>}</div>
          {templateLoadError && <div role="alert" className="text-sm text-amber-800">{templateLoadError} <button type="button" className="underline" disabled={templateLoading} onClick={() => void loadCustomTemplates()}>Try again</button></div>}
          {templateError && <p role="alert" className="text-sm text-red-700">{templateError}</p>}
          {templatesOpen&&<VisualTemplateImport key={templateEditorSession} initialOpen={templateReferenceOpen} templates={templateDraft} disabled={templateSaving} onApply={(change,kind,example)=>{setTemplateDraft(current=>({...current,...change,customName:current.customName?.trim()?current.customName:kind==="outlook"?"Calendar reference format":kind==="print"?"Itinerary reference format":"Expense reference format"}));setTemplateTab(kind);setCalendarTemplateView("preview");setTemplateReferencePreview(example);setTemplateError("");}}/>}
          {!templateReturnToProfile && <details className="rounded-lg border border-slate-200 px-4 py-3"><summary className="cursor-pointer text-sm font-medium">Assign to: {templateExecutiveIds.length === executives.length && executives.length > 1 ? "All executives" : templateExecutiveIds.length === 1 ? executives.find(profile => profile.id === templateExecutiveIds[0])?.name : templateExecutiveIds.length ? `${templateExecutiveIds.length} executives` : "Unassigned"}</summary><div className="mt-3 grid max-h-44 gap-3 overflow-y-auto text-sm"><label className="flex cursor-pointer items-center gap-2 font-medium"><input type="checkbox" checked={templateExecutiveIds.length === executives.length} onChange={event => { setTemplateExecutiveIds(event.target.checked ? executives.map(profile => profile.id) : []); setTemplateError(""); }} /> All executives</label><div className="border-t border-slate-100" />{executives.map(profile => <label key={profile.id} className="flex cursor-pointer items-center gap-2"><input type="checkbox" checked={templateExecutiveIds.includes(profile.id)} onChange={event => { setTemplateExecutiveIds(current => event.target.checked ? [...current, profile.id] : current.filter(id => id !== profile.id)); setTemplateError(""); }} />{profile.name}</label>)}</div></details>}
          <Tabs value={templateTab} onValueChange={value => { setTemplateTab(value as TemplateKind); templateInputRef.current = null; }} className="gap-4"><TabsList variant="line" className="h-auto w-full flex-wrap justify-start gap-2"><TabsTrigger value="outlook">Calendar entry</TabsTrigger><TabsTrigger value="print" className="whitespace-normal text-left">Travel itinerary · Word / PDF</TabsTrigger><TabsTrigger value="expenses">Expense report</TabsTrigger></TabsList>
            {templateTab !== "expenses" && <div className="grid gap-2"><Label htmlFor="flight-output-format">Flight output</Label><select id="flight-output-format" className="simple-select" value={(templateTab === "outlook" ? effectiveCalendarDraft.calendarFlightFormat : templateDraft.itineraryFlightFormat) ?? "standard"} onChange={event => setTemplateDraft(current => ({ ...current, ...(templateTab === "outlook" ? calendarFormatChange(current,templatePreviewItem.kind,{calendarFlightFormat:event.target.value as "standard"|"abbreviated"}) : {[flightFormatKey]:event.target.value}) }))}><option value="standard">Standard</option><option value="abbreviated">Abbreviated</option></select><p className="text-sm text-slate-600">Departure and arrival times fill automatically from the confirmation, in each airport’s local time.</p></div>}
            <TabsContent value="outlook" className="space-y-4">
              <div className="flex flex-wrap items-center gap-3"><div className="flex rounded-md border border-slate-200 p-1"><Button type="button" size="sm" variant={calendarTemplateView === "edit" ? "secondary" : "ghost"} onClick={() => setCalendarTemplateView("edit")}>Edit template</Button><Button type="button" size="sm" variant={calendarTemplateView === "preview" ? "secondary" : "ghost"} onClick={() => setCalendarTemplateView("preview")}>Preview output</Button></div>{previewTrip.items.length > 0 && <select aria-label="Preview booking" className="simple-select min-w-0 max-w-full" value={templatePreviewItemIndex} onChange={event => {setTemplateReferencePreview(null);setTemplatePreviewItemIndex(Number(event.target.value));}}>{previewTrip.items.map((item, index) => <option key={item.id} value={index}>{item.kind} · {item.title}</option>)}</select>}</div>
              {templateDraft.calendarFormats&&<div className="flex flex-wrap gap-2 text-sm">{Object.keys(templateDraft.calendarFormats).map(kind=><button type="button" key={kind} className="rounded-md border px-3 py-1 font-medium" onClick={()=>{const index=previewTrip.items.findIndex(item=>item.kind===kind);if(index>=0){setTemplateReferencePreview(null);setTemplatePreviewItemIndex(index);}else setTemplateReferencePreview({item:{id:-1,kind,title:`${kind} example`,detail:"Confirmation details",date:"Nov 4, 2026",time:"",flightCode:"DL1358",origin:"TLH",destination:"ATL",departureTime:"8:09pm",arrivalTime:"10pm",seat:"2C",confirmation:"CJT8JH"},trip:{name:"Example trip",traveler:"Example executive",dates:"Nov 4–6, 2026",route:"TLH-ATL"}});}}>{kind} format</button>)}</div>}
              {templateDraft.calendarFormats?.[templatePreviewItem.kind as keyof NonNullable<ExecutiveTemplates['calendarFormats']>]&&<p className="text-sm text-[#684576]">Editing the {templatePreviewItem.kind.toLowerCase()} format. Other entry types keep their existing format. <button type="button" className="underline" onClick={()=>setTemplateDraft(current=>{const formats={...current.calendarFormats};delete formats[templatePreviewItem.kind as keyof typeof formats];return {...current,calendarFormats:formats};})}>Use general format instead</button></p>}
              <p className="text-sm text-slate-600">{calendarTemplateView === "edit" ? "Fields in {braces} fill automatically from each booking. Edit the format here, then preview the output." : templateReferencePreview ? "Output using your reference example" : `Output for ${previewTrip.traveler} · ${previewTrip.name}`}</p>
              {templatePreviewItem ? <CalendarOutput templates={templateDraft} item={templatePreviewItem} trip={templateReferencePreview?{...templateReferencePreview.trip,items:[templatePreviewItem]}:previewTrip} onSave={() => void saveTemplates()} saveDisabled={templateSaving} onTemplateChange={calendarTemplateView === "edit" ? change => { if (!templateSaving) setTemplateDraft(current => ({ ...current, ...calendarFormatChange(current,templatePreviewItem.kind,change) })); } : undefined} /> : <p className="py-8 text-sm text-slate-600">Add a trip confirmation to see the calendar output.</p>}
                  <details open={!templatePreviewItem} className="border-t border-[#e1e5ea] pt-4 text-sm"><summary className="w-fit cursor-pointer font-medium text-[#0078d4]">Customize automatic fields</summary><div className="mt-4 grid gap-4">
                    <div className="grid gap-2"><Label htmlFor="outlook-title">Title format</Label><Input id="outlook-title" data-template-field="outlookTitle" value={effectiveCalendarDraft.outlookTitle} onChange={event => setTemplateDraft(current => ({ ...current, ...calendarFormatChange(current,templatePreviewItem.kind,{outlookTitle:event.target.value}) }))} /></div>
                    <div className="grid gap-2"><Label htmlFor="outlook-notes">Appointment body format</Label><Textarea id="outlook-notes" data-template-field="outlookNotes" rows={5} value={effectiveCalendarDraft.outlookNotes} onChange={event => setTemplateDraft(current => ({ ...current, ...calendarFormatChange(current,templatePreviewItem.kind,{outlookNotes:event.target.value}) }))} /></div>
                  </div></details>
            </TabsContent>
            <TabsContent value="print" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-slate-600">Travel itinerary · Editable Word preview</p><Button variant="outline" size="sm" disabled={!!outputBusy || !itineraryPreviewTrip.items.length} onClick={() => void exportOutput("itinerary", itineraryPreviewTrip, templateDraft)}><Download /> Download Word</Button><Button variant="outline" size="sm" disabled={templateSaving} onClick={() => void saveTemplates()}><Check className="size-4" /> Save template</Button></div>
              <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 sm:p-6"><div className="mx-auto max-w-[48rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><ItineraryOutput templates={templateDraft} trip={itineraryPreviewTrip} /></div></div>
              <details open className="rounded-lg border border-slate-200 p-4"><summary className="w-fit cursor-pointer font-medium">Customize itinerary</summary><div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2 sm:col-span-2"><Label htmlFor="itinerary-heading">Page heading</Label><Input id="itinerary-heading" data-template-field="itineraryHeading" value={templateDraft.itineraryHeading} onChange={event => setTemplateDraft(current => ({ ...current, itineraryHeading: event.target.value }))} /></div>
                <div className="grid gap-2"><Label htmlFor="itinerary-title">Standard reservation title</Label><Input id="itinerary-title" data-template-field="itineraryTitle" value={templateDraft.itineraryTitle} onChange={event => setTemplateDraft(current => ({ ...current, itineraryTitle: event.target.value }))} /></div>
                <div className="grid gap-2"><Label htmlFor="itinerary-layout">Layout</Label><select id="itinerary-layout" className="simple-select" value={templateDraft.itineraryLayout} onChange={event => setTemplateDraft(current => ({ ...current, itineraryLayout: event.target.value as "list" | "table" }))}><option value="list">Day-by-day schedule</option><option value="table">Table</option></select></div>
                <div className="grid gap-2 sm:col-span-2"><Label htmlFor="itinerary-body">Standard reservation details</Label><Textarea id="itinerary-body" data-template-field="itineraryBody" rows={3} value={templateDraft.itineraryBody} onChange={event => setTemplateDraft(current => ({ ...current, itineraryBody: event.target.value }))} /></div>
                <label className="flex cursor-pointer items-center gap-2 text-sm sm:col-span-2"><input type="checkbox" checked={templateDraft.showSources} onChange={event => setTemplateDraft(current => ({ ...current, showSources: event.target.checked }))} /> Include source filenames</label>
              </div></details>
            </TabsContent>
            <TabsContent value="expenses" className="space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-medium text-slate-600">Expense report · Excel preview</p><Button variant="outline" size="sm" disabled={!!outputBusy || !previewTrip.items.length} onClick={() => void exportOutput("expenses", previewTrip, templateDraft)}><Download /> Download Excel</Button><Button variant="outline" size="sm" disabled={templateSaving} onClick={() => void saveTemplates()}><Check className="size-4" /> Save template</Button></div>
              <div className="rounded-lg border border-slate-200 bg-slate-100 p-3 sm:p-6"><div className="mx-auto max-w-[48rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-8"><ExpenseReportOutput templates={templateDraft} trip={previewTrip} /></div></div>
              <details open className="rounded-lg border border-slate-200 p-4"><summary className="w-fit cursor-pointer font-medium">Customize expense report</summary><div className="mt-4 grid gap-4">
                <div className="grid gap-2"><Label htmlFor="expense-heading">Report heading</Label><Input id="expense-heading" data-template-field="expenseHeading" value={templateDraft.expenseHeading ?? defaultTemplates.expenseHeading} onChange={event => setTemplateDraft(current => ({ ...current, expenseHeading: event.target.value }))} /></div>
                <div className="grid gap-3 sm:grid-cols-2">{([{ key: "expenseShowDate", label: "Date column" }, { key: "expenseShowCategory", label: "Separate category columns" }, { key: "expenseShowSources", label: "Source column" }, { key: "expenseShowTotal", label: "Total" }] as const).map(({key,label}) => <label key={key} className="flex cursor-pointer items-center gap-2 text-sm"><input type="checkbox" checked={templateDraft[key] !== false} onChange={event => setTemplateDraft(current => ({ ...current, [key]: event.target.checked }))} />{label}</label>)}</div>
              </div></details>
            </TabsContent>
          </Tabs>
          <div className="grid gap-2"><Label htmlFor="insert-template-field">Insert automatic field</Label><select id="insert-template-field" className="simple-select" value="" disabled={templateSaving} onChange={event => insertAutomaticField(event.target.value)}><option value="" disabled>Choose a field to insert at the cursor</option>{templateFields.map(field => <option key={field} value={field}>{`{${field}}`}</option>)}</select></div>
          <DialogFooter><Button variant="ghost" disabled={templateSaving} onClick={() => { setTemplateDraft(current => mergeTemplateKind(current, defaultTemplates, templateTab)); setTemplateError(""); }}>Reset this format</Button><DialogClose asChild><Button variant="outline" disabled={templateSaving}>Cancel</Button></DialogClose><Button disabled={templateSaving} onClick={() => void saveTemplates()}>{templateSaving ? <><Loader2 className="size-4 animate-spin" /> Saving…</> : "Save custom template"}</Button></DialogFooter>
          </fieldset>
        </DialogContent>
      </Dialog>
  );

  const profileExecutive = executives.find(executive => executive.id === profileExecutiveId);
  const profileEditor = (
    <Dialog open={profileOpen} onOpenChange={open => { if (!open) closeProfile(); }}>
      <DialogContent showCloseButton={!profileSaving} className="executive-profile-dialog sm:max-w-3xl">
        <DialogHeader><DialogTitle>{profileExecutive?.profile ? "Edit executive profile" : "Create executive profile"}</DialogTitle><DialogDescription>{profileExecutive?.name} · Add contact details and travel preferences. All fields are optional.</DialogDescription></DialogHeader>
        <form onSubmit={event => { event.preventDefault(); void saveProfile(); }} className="grid gap-5"><fieldset disabled={profileSaving} className="contents">
          <ExecutiveProfileFields prefix="edit-executive" value={profileDraft} onChange={setProfileDraft}/>
          <fieldset className="grid gap-4 border-t border-slate-200 pt-4">
            <legend className="px-1 text-sm font-medium">Templates</legend>
            {([{ tab: "outlook", label: "Calendar entry" }, { tab: "print", label: "Travel itinerary · Word / PDF" }, { tab: "expenses", label: "Expense report" }] as const).map(({ tab, label }) => <div key={tab} className="grid gap-2">
              <p className="flex items-center gap-2 text-sm font-medium">{tab === "outlook" ? <CalendarDays className="size-4" /> : <FileText className="size-4" />}{label}</p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" size="sm" disabled={!profileExecutive || templateLoading} onClick={() => { if (profileExecutive) openExecutiveTemplates(profileExecutive, tab, true); }}>{profileExecutive?.templates.customName ? "Edit custom template" : "Create custom template"}</Button>
              </div>
            </div>)}
          </fieldset>
          {profileError&&<p role="alert" className="profile-validation">{profileError}</p>}<DialogFooter className="profile-footer"><Button type="button" variant="outline" onClick={closeProfile}>{profileSetup ? "Skip for now" : "Cancel"}</Button><Button type="submit">{profileSaving?"Saving…":"Save profile"}</Button></DialogFooter></fieldset>
        </form>
      </DialogContent>
    </Dialog>
  );

  const homeAttention = attentionItems.filter(item => !dismissedAttentionIds.includes(item.id) && trips.some(trip => trip.id === item.tripId));
  function attentionRows(items: AttentionItem[], showContext = false) {
    return (<div className="mt-3 divide-y divide-slate-100">{items.map(item => <div key={item.id} className="flex items-start gap-3 py-3">
            <div className="min-w-0 flex-1">{showContext && <p className="mb-1 text-sm text-[#6b3f78]">{trips.find(trip => trip.id === item.tripId)?.traveler} · {trips.find(trip => trip.id === item.tripId)?.name}</p>}<p className="text-sm font-medium">{item.title}</p><p className="mt-1 text-sm text-slate-600">{item.detail}</p></div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="shrink-0" aria-label={`Actions for ${item.title}`}>Actions <ChevronDown className="size-4" /></Button></DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuItem onSelect={() => setOpenAttention(item)}><FileText /> Open</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => setDismissedAttentionIds(current => [...new Set([...current, item.id])])}><X /> Dismiss</DropdownMenuItem>
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger><Bell /> Remind me</DropdownMenuSubTrigger>
                  <DropdownMenuPortal><DropdownMenuSubContent className="w-44">
                    <DropdownMenuLabel>Select calendar</DropdownMenuLabel>
                    <DropdownMenuItem onSelect={() => openReminder(item, "outlook")}><CalendarDays /> Outlook</DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => openReminder(item, "google")}><CalendarDays /> Google Calendar</DropdownMenuItem>
                  </DropdownMenuSubContent></DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>)}</div>);
  }
  const attentionDialogs = (<>
<Dialog open={!!openAttention} onOpenChange={open => { if (!open) setOpenAttention(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>{openAttention?.title}</DialogTitle><DialogDescription>{openAttention?.detail}</DialogDescription></DialogHeader>
          <p className="text-sm text-slate-600">{trips.find(trip => trip.id === openAttention?.tripId)?.name}</p>
          <DialogFooter className="sm:flex-wrap sm:gap-2">
            <DialogClose asChild><Button variant="outline">Close</Button></DialogClose>
            <Button variant="outline" onClick={() => {
              if (!openAttention) return;
              setDismissedAttentionIds(current => [...new Set([...current, openAttention.id])]);
              setOpenAttention(null);
            }}><X /> Dismiss</Button>
            <Button variant="outline" onClick={() => {
              if (!openAttention) return;
              openReminder(openAttention, calendarProvider);
              setOpenAttention(null);
            }}><Bell /> Add reminder</Button>
            <Button onClick={() => {
            if (!openAttention) return;
            const attentionTrip = trips.find(trip => trip.id === openAttention.tripId);
            const executive = attentionTrip ? executiveForTrip(attentionTrip, executives) : undefined;
            if (executive) { setSelectedExecutiveId(executive.id); setNewExecutive(executive.name); }
            setActiveTripId(openAttention.tripId);
            setActiveTab(/calendar|publishing/i.test(openAttention.title) ? "calendar" : "itinerary");
            setScreen("detail");
            setOpenAttention(null);
          }}>View trip</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!reminderItem} onOpenChange={open => { if (!open && !reminderBusy) setReminderItem(null); }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Remind me</DialogTitle><DialogDescription>{reminderItem?.title}</DialogDescription></DialogHeader>
          <form onSubmit={event => { event.preventDefault(); void createAttentionReminder(); }} className="grid gap-4">
            <div className="grid gap-2"><Label htmlFor="reminder-calendar">Calendar</Label><select id="reminder-calendar" className="simple-select" value={reminderProvider} disabled={reminderBusy} onChange={event => { setReminderProvider(event.target.value as ReminderCalendar); setReminderError(""); }}><option value="outlook">Outlook</option><option value="google">Google Calendar</option></select></div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2"><Label htmlFor="reminder-date">Date</Label><Input id="reminder-date" type="date" required value={reminderDate} disabled={reminderBusy} onChange={event => { setReminderDate(event.target.value); setReminderError(""); }} /></div>
              <div className="grid gap-2"><Label htmlFor="reminder-time">Time</Label><Input id="reminder-time" type="time" required value={reminderTime} disabled={reminderBusy} onChange={event => { setReminderTime(event.target.value); setReminderError(""); }} /></div>
            </div>
            <p className="text-sm text-slate-600">Times use your device’s time zone.{!calendarConnections[reminderProvider] && ` Save the reminder in ${reminderCalendarName} after it opens.`}</p>
            {reminderError && <p role="alert" className="text-sm text-red-700">{reminderError}</p>}
            <DialogFooter><Button type="button" variant="outline" disabled={reminderBusy} onClick={() => setReminderItem(null)}>Cancel</Button><Button type="submit" disabled={reminderBusy}>{reminderBusy ? <><Loader2 className="size-4 animate-spin" /> Adding reminder…</> : calendarConnections[reminderProvider] ? "Add reminder" : `Open in ${reminderCalendarName}`}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
  </>);
  const templateAssignmentDialog = (
    <Dialog open={!!assignmentTemplate} onOpenChange={open => { if (!open && !assignmentSaving) setAssignmentTemplate(null); }}><DialogContent><DialogHeader><DialogTitle>Assign template</DialogTitle><DialogDescription>{assignmentTemplate?.template.customName} · Choose the executives who should use this template.</DialogDescription></DialogHeader>
      <fieldset disabled={assignmentSaving} className="grid max-h-72 gap-3 overflow-y-auto py-3">{executives.map(executive => <label key={executive.id} className="flex items-start gap-3 text-sm"><input type="checkbox" className="mt-1" checked={assignmentIds.includes(executive.id)} onChange={event => setAssignmentIds(current => event.target.checked ? [...current, executive.id] : current.filter(id => id !== executive.id))} /><span><span className="block font-medium">{executive.name}</span><span className="text-slate-500">{executive.templates.customName ? `Currently: ${executive.templates.customName}` : "No custom template assigned"}</span></span></label>)}</fieldset>
      <p className="text-sm text-slate-600">Each executive uses one template for calendar, itinerary, and expense outputs. Selecting a new one replaces their current assignment.</p>
      {assignmentError && <p role="alert" className="text-sm text-red-700">{assignmentError}</p>}
      <DialogFooter><Button variant="outline" disabled={assignmentSaving} onClick={() => setAssignmentTemplate(null)}>Cancel</Button><Button disabled={assignmentSaving || !!templateLoadError} onClick={() => void saveTemplateAssignments()}>{assignmentSaving ? "Saving…" : "Save assignments"}</Button></DialogFooter>
    </DialogContent></Dialog>
  );

  const allUnassignedExpenses=unassignedExpenseList(unassignedUploads,deferredUploads,trips,uploadExclusions);
  const executiveUpload=(selectedExecutive && <ExecutiveUpload key={selectedExecutive.id} open={uploadOpen} initialFile={uploadIntake} initialText={uploadIntakeText} initialMode={uploadMode} reviewLater={reviewLater} calendarReview={calendarReview} focusRow={uploadFocusRow} onOpenChange={open=>{setUploadOpen(open);if(!open){setUploadFocusRow(undefined);setUploadIntake(undefined);setUploadIntakeText(undefined);const resolve=uploadIntakeResolve.current;uploadIntakeResolve.current=null;resolve?.();}}} unassigned={unassignedUploads.filter(value=>value.executiveId===selectedExecutive.id)} onUnassigned={(saved,removed)=>setUnassignedUploads(current=>[...current.filter(value=>!removed.includes(value.row.key)&&!saved.some(next=>next.row.key===value.row.key)),...saved])} executive={selectedExecutive} trips={executiveTrips} exclusions={uploadExclusions.filter(value => value.executiveId === selectedExecutive.id)} deferred={deferredUploads.filter(value => value.executiveId === selectedExecutive.id)} onDeferred={(saved, removed) => setDeferredUploads(current => [...current.filter(value => !removed.includes(value.row.key) && !saved.some(next => next.row.key === value.row.key)), ...saved])} rules={vendorRules.filter(rule => rule.executiveId === selectedExecutive.id)} onRuleSaved={rule => setVendorRules(current => [...current.filter(value => value.id !== rule.id), rule])} onRuleRemoved={id => setVendorRules(current => current.filter(rule => rule.id !== id))} onExcluded={saved => setUploadExclusions(current => [...current, ...saved])} onSaved={uploadedTripsSaved} />);
  const unassignedLink=<a href="?view=unassigned-expenses" className="text-sm font-medium text-[#6b3f78] underline underline-offset-4" onClick={event=>{event.preventDefault();setNotice("");window.history.replaceState(null,"","?view=unassigned-expenses");setScreen("unassigned-expenses");}}>Unassigned expenses</a>;
  function openBillingCodes(fromReport = false) {
    setBillingReturnToReport(fromReport); setScreen("billing-codes");
    window.history.replaceState(null, "", `?view=billing-codes${fromReport ? `&executive=${encodeURIComponent(selectedExecutiveId)}${activeTrip ? `&trip=${activeTrip.id}` : ""}` : ""}`);
  }
  const consoleNavigation = <aside className={`console-rail app-chrome ${mobileNavigation?"navigation-open":""}`} aria-label="Main navigation">
    <div className="brand-row"><button type="button" className="console-brand" onClick={() => setScreen("home")} aria-label="Home"><BrandLockup /></button><Button type="button" variant="ghost" className="mobile-menu" aria-label="Toggle navigation" aria-expanded={mobileNavigation} onClick={()=>setMobileNavigation(value=>!value)}><Menu/></Button></div>
    <section aria-labelledby="home-executives-heading">
      <h2 id="home-executives-heading" className="console-rail-heading">Executives</h2>
      <ul className="console-executives">{executives.map(executive => <li key={executive.id}><button type="button" disabled={!hydrated} onClick={() => selectExecutive(executive.id)} className="console-rail-link" aria-current={!isHome && screen !== "templates" && selectedExecutiveId === executive.id ? "page" : undefined}><span className="console-initials" aria-hidden="true">{executive.name.trim().split(/\s+/).slice(0, 2).map(part => part[0]).join("")}</span><span>{executive.name}</span></button></li>)}</ul>
      {hydrated && !executives.length && <p className="console-rail-empty">No executives yet.</p>}
      <button type="button" disabled={!hydrated} className="console-rail-link" onClick={() => { setExecutiveError(""); setNewProfileDraft(emptyExecutiveProfile()); setExecutiveName(""); setExecutiveOpen(true); }}><Plus className="size-4" />Create executive</button>
    </section>
    <nav aria-label="Workspace" className="console-workspace-nav">
      <h2 className="console-rail-heading">Workspace</h2>
      <button type="button" disabled={!hydrated} className="console-rail-link" aria-current={screen === "templates" ? "page" : undefined} onClick={() => { setNotice(""); window.history.replaceState(null, "", "?view=templates"); setScreen("templates"); }}><Settings2 className="size-4" />Templates</button>
      <button type="button" className="console-rail-link" onClick={() => { setScreen("home"); window.requestAnimationFrame(() => { const panel = document.getElementById("home-attention"); if (panel) { panel.setAttribute("open", ""); panel.scrollIntoView({ block: "nearest" }); } }); }}><Bell className="size-4" />Needs attention</button>
      <button type="button" disabled={!hydrated} className="console-rail-link" aria-current={screen === "billing-codes" ? "page" : undefined} onClick={() => openBillingCodes()}><FileText className="size-4" />Billing codes</button>
      <button type="button" disabled={!hydrated || !selectedExecutive} className="console-rail-link" aria-current={screen === "decision-queue" ? "page" : undefined} onClick={() => { setNotice(""); setScreen("decision-queue"); }}><MessagesSquare className="size-4" />Decision Queue</button>
    </nav>
    <div className="rail-footer"><span className="preview-label">WORKSPACE</span><p>Calendar &amp; email not connected</p><span className="rail-version">Live sends disabled</span></div>
  </aside>;
  const consoleShell = (children: ReactNode) => <div className="console-shell"><a className="skip-link" href="#workspace-main">Skip to content</a>{consoleNavigation}<div id="workspace-main" className="console-body"><div className="preview-status"><span><a href="/" className="underline underline-offset-4">Product home</a> <span className="status-divider">/</span> Workspace · Live sends off</span><span>Calendar &amp; email disconnected</span></div>{children}{executiveEditor}{profileEditor}{executiveUpload}
    {auxiliaryUpload?.kind === "attachment" && <AttachmentUploadReview key={auxiliaryUpload.file.name} file={auxiliaryUpload.file} warning={auxiliaryUpload.warning} executives={executives} trips={trips} onSkip={finishAuxiliaryUpload} onSaved={trip => { attachmentTripSaved(trip); setSelectedExecutiveId(trip.executiveId!); setActiveTripId(trip.id); setActiveTab("itinerary"); setItineraryTab("attachments"); setAttachmentEntryId(undefined); setAttachmentRevision(value => value + 1); setScreen("detail"); setNotice(`Saved “${auxiliaryUpload.file.name}” in ${trip.name} → Travel itinerary → Attachments.`); finishAuxiliaryUpload(); }} />}
    {auxiliaryUpload?.kind === "billing" && <DetectedBillingUpload file={auxiliaryUpload.file} executives={executives} onClose={finishAuxiliaryUpload} />}
    {auxiliaryUpload?.kind === "review" && <Dialog open onOpenChange={open => { if(!open)finishAuxiliaryUpload(); }}><DialogContent><DialogHeader><DialogTitle>This file needs a closer look</DialogTitle><DialogDescription>The app could not confidently identify this document. It has not been filed or added to a trip.</DialogDescription></DialogHeader><p className="break-all text-sm font-medium">{auxiliaryUpload.file.name}</p><p className="text-sm text-slate-600">{auxiliaryUpload.warning || "For a travel confirmation or financial document, upload a readable copy with the booking or transaction details. If this is supporting itinerary material, you can choose to save it as an attachment."}</p><DialogFooter><Button variant="outline" onClick={finishAuxiliaryUpload}>Skip file</Button><Button onClick={() => setAuxiliaryUpload({...auxiliaryUpload,kind:"attachment"})}>This is itinerary material</Button></DialogFooter></DialogContent></Dialog>}
    {travelImportReview && <TravelImportReview key={travelImportReview.filename} request={travelImportReview} onDecide={decision => { const resolve = travelImportResolve.current; travelImportResolve.current = null; setTravelImportReview(null); resolve?.(decision); }} />}
    <Dialog open={legacyReview !== null} onOpenChange={open => { if (!open && !legacyImporting) setLegacyReview(null); }}>
      <DialogContent>
        <DialogHeader><DialogTitle>Review older browser records</DialogTitle>
          <DialogDescription>These records were saved before accounts were separated. They are not automatically assigned to this firm. Import only if you recognize them as belonging here.</DialogDescription></DialogHeader>
        <p className="text-sm text-slate-700">{legacyReview?.trips.length ?? 0} trip(s) and {legacyReview?.executives.length ?? 0} executive profile(s) found in this browser.</p>
        <p className="text-sm text-slate-600">Import adds only missing IDs; existing firm records are not overwritten. The original browser backup is retained. Custom template layouts are not migrated by this action.</p>
        {legacyError && <p role="alert" className="text-sm text-red-700">{legacyError}</p>}
        {legacyResult && <p role="status" className="text-sm text-slate-700">{legacyResult}</p>}
        <DialogFooter><Button variant="outline" disabled={legacyImporting} onClick={() => setLegacyReview(null)}>Close</Button>
          <Button disabled={legacyImporting || readOnly || uploadLoading || profilesLoading || !!uploadLoadError || !!profilesLoadError || !legacyReview || (!legacyReview.trips.length && !legacyReview.executives.length)} onClick={() => void recoverLegacyRecords()}>{legacyImporting ? "Importing…" : "Import missing records into this firm"}</Button></DialogFooter>
      </DialogContent>
    </Dialog></div></div>;
  if (screen === "decision-queue" && selectedExecutive) return consoleShell(<DecisionQueue executive={{ id: selectedExecutive.id, name: selectedExecutive.name }} onBack={() => setScreen("home")} />);
  if (screen === "billing-codes") return consoleShell(<><BillingCodeLibrary executives={executives} returnToReport={billingReturnToReport} onBack={() => { if (billingReturnToReport && activeTrip) { setActiveTab("expenses"); setScreen("detail"); window.history.replaceState(null, "", `?view=expenses&executive=${encodeURIComponent(selectedExecutiveId)}&trip=${activeTrip.id}`); } else { setScreen("home"); window.history.replaceState(null, "", "?view=home"); } }} /></>);
  if(screen==="unassigned-expenses")return consoleShell(<><UnassignedExpenses receipts={allUnassignedExpenses} executives={executives} loading={uploadLoading} error={uploadLoadError} onRetry={()=>void loadUploads()} onBack={()=>{setActiveTab("expenses");setScreen(activeTrip?"detail":"executive");window.history.replaceState(null,"",`?view=expenses&executive=${encodeURIComponent(selectedExecutiveId)}${activeTrip?`&trip=${activeTrip.id}`:""}`);}} onReview={receipt=>{setSelectedExecutiveId(receipt.executiveId);setReviewLater(false);setCalendarReview(false);setUploadFocusRow(receipt.row.key);setUploadOpen(true);}}/></>);

  if (screen === "templates") {
    return consoleShell(<main className="console-page min-h-screen bg-white px-5 py-10 text-slate-900 sm:px-8 sm:py-16"><div className="mx-auto max-w-4xl">
      <button type="button" className="mb-6 text-sm font-medium text-[#6b3f78] underline underline-offset-4" onClick={() => { window.history.replaceState(null, "", "?view=home"); setScreen("home"); }}>Home</button>
      <div className="flex flex-wrap items-center justify-between gap-4"><h1 className="text-3xl font-semibold tracking-tight text-[#56315f]">Templates</h1><Button disabled={templateLoading || !!templateLoadError} onClick={() => openLibraryTemplate()}><Plus />Create new template</Button></div>
      <div className="mt-6 rounded-xl border border-[#ded6e3] bg-[#f8f6fa] p-5"><h2 className="font-semibold">Already have a format you love?</h2><p className="mt-1 text-sm text-slate-600">Upload an Outlook screenshot, itinerary, or expense report to create a reusable template from it.</p><Button className="mt-3" variant="outline" disabled={templateLoading||!!templateLoadError} onClick={()=>{openLibraryTemplate();setTemplateReferenceOpen(true);}}><CloudUpload/>Create from a reference</Button></div>
      {templateLoadError && <div role="alert" className="mt-6 rounded-lg bg-amber-50 p-4 text-sm text-amber-900">{templateLoadError}<Button variant="ghost" size="sm" disabled={templateLoading} onClick={() => void loadCustomTemplates()}>Retry</Button></div>}
      {notice && <p role="status" className="mt-6 rounded-lg bg-slate-50 p-4 text-sm text-slate-700">{notice}</p>}
      {templateLoading ? <p role="status" className="mt-8 text-slate-600">Loading templates…</p> : savedTemplates.length ? <div className="mt-8 grid gap-4">{savedTemplates.map(saved => { const assigned = executives.filter(executive => executive.templates.templateId === saved.id); return <article key={saved.id} className="flex flex-wrap items-start justify-between gap-5 rounded-xl border border-slate-200 p-5"><div className="min-w-0 flex-1"><h2 className="break-words text-lg font-semibold">{saved.template.customName}</h2><p className="mt-1 text-sm text-slate-600">Calendar entry · Travel itinerary · Expense report</p><p className="mt-3 text-sm text-slate-600">{assigned.length ? `Assigned to: ${assigned.map(value => value.name).join(", ")}` : "Not assigned to any executives"}</p></div><div className="flex flex-wrap gap-2"><Button variant="outline" disabled={!!templateLoadError} onClick={() => openLibraryTemplate(saved)}>View / Edit</Button><Button variant="outline" disabled={!!templateLoadError} onClick={() => { setAssignmentTemplate(saved); setAssignmentIds(assigned.map(value => value.id)); setAssignmentError(""); }}>Assign to executives</Button></div></article>; })}</div> : !templateLoadError && <p className="mt-8 text-slate-600">No saved templates yet. Create your first template to get started.</p>}
    </div>{templatesEditor}{templateAssignmentDialog}</main>);
  }

  if (isHome) {
    return consoleShell(<main className="console-page console-home anya-home min-h-screen bg-white px-5 py-10 text-slate-900 sm:px-8 sm:py-16">
      <div className="anya-home-inner mx-auto w-full">
        <div className="anya-home-topline"><p className="anya-home-kicker">YOUR EXECUTIVE ASSISTANT WORKSPACE</p><span>Built around the way you work.</span></div>
        <section className="anya-home-hero" aria-label="Your travel workspace"><div className="min-w-0"><div className="home-heading"><h1>Every trip,<br/><em>thoughtfully organized.</em></h1><p className="home-subtitle">Itineraries, calendars and expenses. One place to keep the details together.</p><p className="anya-home-intro-copy">Drop in a confirmation. Confirm the trip. Anya turns the booking details into calendar entries, an itinerary and expenses—in your executive’s saved format.</p></div>
        {profilesLoadError&&<p role="alert" className="mb-5 text-sm text-amber-800">{profilesLoadError} <Button variant="outline" size="sm" onClick={()=>void loadExecutiveProfiles()}>Retry profiles</Button></p>}
        <HomeDocumentUpload executives={executives} disabled={!hydrated||profilesLoading||uploadLoading||!!uploadLoadError||!!profilesLoadError} onStart={(executiveId,files)=>{setSelectedExecutiveId(executiveId);setHomeImport({executiveId,files,id:createRecordId()});}} onCreateExecutive={()=>{setExecutiveError("");setNewProfileDraft(emptyExecutiveProfile());setExecutiveName("");setExecutiveOpen(true);}}/>
        {uploadLoadError&&<p role="alert" className="mb-5 text-sm text-amber-800">{uploadLoadError} <Button variant="outline" size="sm" onClick={()=>void loadUploads()}>Retry uploads</Button></p>}
        {notice && <p role="status" className="home-notice rounded-lg bg-white px-4 py-3 text-sm text-slate-700">{notice}</p>}
        </div><HomeWorkflowPreview/></section>
        <section className="anya-home-features" aria-labelledby="anya-features-heading">
          <div className="anya-features-intro"><p className="anya-home-kicker">AUTOMATION + PREFERENCE MEMORY</p><h2 id="anya-features-heading">The details get created.<br/><em>Your way of working carries forward.</em></h2></div>
          <div className="anya-feature-grid">
            <article><span className="anya-feature-number">01 / CREATE</span><h3>One confirmation.<br/>Three outputs.</h3><p>Flight, hotel and car details become calendar entries, an editable itinerary and expense lines. Review the trip match before anything is added.</p><span className="anya-feature-foot">Calendar · Word itinerary · Excel expenses</span></article>
            <article><span className="anya-feature-number">02 / PERSONALIZE</span><h3>Your format.<br/>For every executive.</h3><p>Upload an Outlook screenshot or a document to draft a template. Refine it, assign it to an executive and reuse the format for future trips.</p><span className="anya-feature-foot">Custom templates · Saved travel preferences</span></article>
            <article><span className="anya-feature-number">03 / REMEMBER</span><h3>Decisions made once.<br/>Remembered next time.</h3><p>Choose whether to remember a vendor in a particular city. Future matching transactions reuse that decision. Review or forget saved choices at any time.</p><span className="anya-feature-foot">Vendor + city memory · You stay in control</span></article>
          </div>
        </section>
        <div className="home-grid"><div className="min-w-0">
<section aria-label="Your executives"><div className="section-heading"><h2>Your executives</h2><span>{executives.length} {executives.length===1?"profile":"profiles"}</span></div>
        {executives.length?<div className="executive-directory">{executives.map(executive=><button key={executive.id} className="executive-row" disabled={!hydrated} onClick={()=>selectExecutive(executive.id)}><span className="directory-initials">{executive.name.split(/\s+/).slice(0,2).map(value=>value[0]).join("")}</span><div><strong>{executive.name}</strong><small>{trips.filter(trip=>executiveForTrip(trip,executives)?.id===executive.id).length} trips{executive.id==="sample-alex-morgan"?" · Fictional sample":""}</small></div><span aria-hidden="true">→</span></button>)}</div>:<div className="first-executive"><UserRound className="size-7"/><h3>A clear place to begin.</h3><p>Create an executive profile, then add a trip or upload a travel confirmation.</p><Button disabled={!hydrated||profilesLoading} onClick={()=>{setExecutiveName("");setNewProfileDraft(emptyExecutiveProfile());setExecutiveError("");setExecutiveOpen(true);}}><Plus/>Create your first executive</Button></div>}
</section></div>
          <section aria-label="Homepage options" className="space-y-4"><div className="section-heading"><h2>Workspace tools</h2></div>
            <Button type="button" variant="outline" disabled={!hydrated} onClick={() => { setNotice(""); window.history.replaceState(null, "", "?view=templates"); setScreen("templates"); }} className="h-auto w-full justify-start gap-3 rounded-xl border-slate-200 px-5 py-5 text-base"><Settings2 className="size-5 text-[#6b3f78]" /><span className="tool-copy">Templates<small>Your calendar, itinerary and report formats</small></span></Button>
            <details id="home-attention" className="rounded-xl border border-slate-200 px-5 py-5">
              <summary className="flex cursor-pointer list-none items-center gap-3 font-medium focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6b3f78]"><Bell className="size-5 shrink-0 text-[#6b3f78]" /><span className="flex-1">Needs attention</span><span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-sm text-slate-600">{hydrated ? homeAttention.length : "…"}</span><ChevronDown className="size-4 shrink-0" /></summary>
              {hydrated ? homeAttention.length ? attentionRows(homeAttention, true) : <p className="mt-4 text-sm text-slate-600">Nothing needs attention right now.</p> : <p className="mt-4 text-sm text-slate-600">Loading…</p>}
            </details>
            <Button type="button" variant="outline" disabled={!hydrated} onClick={() => openBillingCodes()} className="h-auto w-full justify-start gap-3 rounded-xl border-slate-200 px-5 py-5 text-base"><FileText className="size-5 text-[#6b3f78]" />Billing codes</Button>
          </section>
        </div>
        <div className="sample-invitation"><div><strong>Take Anya for a test trip.</strong><p>Explore fictional bookings and expenses for Alex Morgan.</p></div><Button type="button" variant="outline" disabled={!hydrated||uploadLoading||profilesLoading||sampleTrips.every(sample=>trips.some(trip=>trip.id===sample.id))} onClick={loadSampleWorkspace}>Load sample workspace</Button></div>
        <div className="home-note"><span>Anya · The EA’s Assistant · by Lissa</span><small>Live calendar and email sends are disabled.</small><button type="button" className="text-sm underline underline-offset-4" onClick={reviewLegacyRecords}>Review older browser records</button></div>

      </div>


      {templatesEditor}
      {attentionDialogs}
    </main>);
  }

  return consoleShell(
    <main className="console-page console-workspace min-h-screen bg-white text-slate-900">
      <header className="console-topbar app-chrome border-b border-slate-200">
        <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-5 py-4 sm:px-8">
          <button onClick={() => setScreen("home")} aria-label="Select executive" className="console-breadcrumb">Executives <span aria-hidden="true">/</span> {selectedExecutive?.name || "Executive workspace"}</button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild><Button variant="ghost" size="icon" className="rounded-full border border-slate-200" aria-label="Executive profile menu"><UserRound /></Button></DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{menuExecutive?.name || "Executive"}</DropdownMenuLabel><DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => { if (menuExecutive) openProfile(menuExecutive); }}><UserRound /> {menuExecutive?.profile ? "Edit executive profile" : "Create executive profile"}</DropdownMenuItem>
              <DropdownMenuItem onSelect={() => { setExecutiveError(""); setNewProfileDraft(emptyExecutiveProfile()); setExecutiveName(""); setExecutiveOpen(true); }}><Plus /> Add executive</DropdownMenuItem>
              <DropdownMenuItem onSelect={openReport}><FileText /> Create report</DropdownMenuItem>
              <DropdownMenuItem onSelect={openTemplates} disabled={templateLoading}><Settings2 /> Custom template</DropdownMenuItem>
              <DropdownMenuSeparator /><DropdownMenuItem onSelect={() => setSettingsOpen(true)}><CalendarDays /> Calendar connection</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <div className="console-content mx-auto max-w-4xl px-5 py-7 sm:px-8 sm:py-10">
        <div className="console-trip-layout">
        <section className="console-trip-main" aria-label="Trip workspace">
        <div className="console-workspace-heading app-chrome mb-6 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <button className="mb-3 text-sm text-[#6b3f78] hover:underline" onClick={() => setScreen("home")}>Select executive</button>
            <h1 className="break-words text-3xl font-semibold tracking-tight">{isWorkspace ? selectedExecutive?.name : activeTrip.name}</h1>
            {!isWorkspace && <p className="mt-2 text-sm text-slate-600">{activeTrip.traveler} · {activeTrip.dates}</p>}{isWorkspace && selectedExecutive?.templates.customName && <p className="mt-2 text-sm text-slate-600">Custom template: {selectedExecutive.templates.customName}</p>}
          </div>
          {isWorkspace && <div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" disabled={templateLoading} onClick={openTemplates}><Settings2 />{templateLoading ? "Loading templates…" : selectedExecutive?.templates.customName ? "Edit custom template" : "Create custom template"}</Button></div>}


        </div>



        {uploadLoadError && <div role="alert" className="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-900">{uploadLoadError}<Button variant="ghost" size="sm" onClick={() => void loadUploads()}>Retry</Button></div>}

        {notice && <div role="status" className="app-chrome mt-4 flex items-start gap-3 rounded-lg bg-slate-50 px-4 py-3 text-sm text-slate-700"><p className="min-w-0 flex-1">{notice}</p><button className="shrink-0 p-1 text-slate-500 hover:text-slate-900" aria-label="Dismiss status" onClick={() => setNotice("")}><X className="size-4" /></button></div>}

        {relevantAttention.length > 0 && <details className="app-chrome mt-4 rounded-lg border border-amber-200 px-4 py-3">
          <summary className="cursor-pointer text-sm font-medium text-amber-800">Needs attention ({relevantAttention.length})</summary>
          {attentionRows(relevantAttention)}
        </details>}

        {activeTrip ? <>
          <div className="app-chrome mt-6 grid gap-2 sm:max-w-sm"><Label htmlFor="itinerary-trip">Travel itinerary for</Label><select id="itinerary-trip" className="simple-select" disabled={attachmentsBusy||materialsBusy} value={activeTrip.id} onChange={event => setActiveTripId(Number(event.target.value))}>{executiveTrips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></div>


          <Tabs key={activeTrip.id} value={activeTab} onValueChange={value=>{if(!attachmentsBusy&&!materialsBusy)setActiveTab(value);}} className="console-output-tabs mt-7 gap-5">
            <TabsList variant="line" className="w-full justify-start gap-2 border-b border-slate-200 px-0 sm:gap-6">
              <TabsTrigger value="itinerary" className="px-0">Travel itinerary</TabsTrigger>
              <TabsTrigger value="calendar" className="px-0">Calendar</TabsTrigger>
              <TabsTrigger value="expenses" className="px-0">Expenses</TabsTrigger>
            </TabsList>

            <TabsContent value="itinerary">
              <Tabs value={itineraryTab} onValueChange={value=>{if(!attachmentsBusy&&!materialsBusy)setItineraryTab(value);}}>
              <TabsList variant="line" className="app-chrome mb-4"><TabsTrigger value="schedule">Itinerary</TabsTrigger><TabsTrigger value="attachments">Attachments</TabsTrigger></TabsList>
              <TabsContent value="schedule" forceMount className={itineraryTab==="schedule"?"":"hidden print:block"}>
              <div className="app-chrome mb-4 flex flex-wrap justify-end gap-2"><Button variant="ghost" size="sm" onClick={() => setAppointmentOpen(true)}><Plus /> Appointment</Button><Button variant="outline" size="sm" disabled={!!outputBusy || materialsBusy || !activeTrip.items.length} onClick={() => void exportOutput("itinerary")}><Download /> Download Word</Button><Button variant="outline" size="sm" disabled={materialsBusy} onClick={() => window.print()}><Download /> Print / PDF</Button></div>
              {materialsError&&<p role="alert" className="app-chrome mb-3 text-sm text-red-700">{materialsError}</p>}
              <ItineraryOutput templates={activeTemplates} trip={activeTrip} materialsDisabled={materialsBusy||attachmentsBusy||uploadLoading} onMaterialsChange={(id,change)=>void saveItineraryMaterials(activeTrip.id,id,change)} onViewAttachments={id=>{setAttachmentEntryId(id);setItineraryTab("attachments");}} />
              </TabsContent>
              <TabsContent value="attachments"><ItineraryAttachments key={`${activeTrip.id}:${attachmentRevision}`} trip={activeTrip} executiveId={activeTrip.executiveId??selectedExecutiveId} selectedEntryId={activeTrip.items.some(item=>item.id===attachmentEntryId)?attachmentEntryId:undefined} onSaved={attachmentTripSaved} onBusyChange={setAttachmentsBusy}/></TabsContent>
              </Tabs>
            </TabsContent>

            <TabsContent value="calendar">
              <p className="mb-4 text-sm text-slate-600">{calendarName} · {calendarConnections[calendarProvider] ? "Automatic publishing on" : "Live publishing disabled in test mode"}</p>
              <div className="space-y-5">{activeTrip.items.filter(item => item.kind !== "Expense").map(item => <CalendarOutput key={item.id} templates={activeTemplates} item={item} trip={activeTrip} provider={calendarName} actions={eventStatus(item)} />)}</div>
              {!activeTrip.items.length && <p className="py-10 text-center text-slate-500">Calendar entries appear after a confirmation is imported.</p>}
            </TabsContent>

            <TabsContent value="expenses">
              <div className="app-chrome mb-5 flex flex-wrap items-center justify-between gap-3"><div className="flex flex-wrap items-center gap-4"><p className="text-sm text-slate-600">{expenses.length} {expenses.length === 1 ? "expense" : "expenses"}</p>{unassignedLink}</div><div className="flex flex-wrap gap-2"><Button variant="outline" size="sm" onClick={() => window.print()} disabled={!expenses.length}><Download /> Print / PDF</Button><Button variant="outline" size="sm" onClick={() => void exportOutput("expenses")} disabled={!!outputBusy || !expenses.length}><Download /> Download Excel</Button></div></div>
              <ExpenseApproval key={activeTrip.id} trip={{...activeTrip,executiveId:selectedExecutiveId}} templates={activeTemplates} onSaved={trip=>setTrips(current=>current.map(saved=>saved.id===trip.id?trip:saved))} onManageBillingCodes={()=>openBillingCodes(true)} />
              <ExpenseReportOutput templates={activeTemplates} trip={activeTrip} />
            </TabsContent>
          </Tabs>
        </> : <Tabs value={activeTab} onValueChange={setActiveTab} className="console-output-tabs mt-7 gap-5"><TabsList variant="line" className="w-full justify-start gap-2 border-b border-slate-200 px-0 sm:gap-5"><TabsTrigger value="itinerary" className="px-0">Travel itinerary</TabsTrigger><TabsTrigger value="calendar" className="px-0">Calendar</TabsTrigger><TabsTrigger value="expenses" className="px-0">Expenses</TabsTrigger></TabsList><TabsContent value="itinerary"><p className="py-8 text-sm text-slate-600">Drop a confirmation to create this executive’s itinerary.</p></TabsContent><TabsContent value="calendar"><p className="py-8 text-sm text-slate-600">Calendar entries appear after a confirmation is imported.</p></TabsContent><TabsContent value="expenses">{unassignedLink}<p className="py-8 text-sm text-slate-600">Expenses appear after a travel confirmation is imported.</p></TabsContent></Tabs>}
        <details className="app-chrome mt-6 text-sm text-slate-600"><summary className="w-fit cursor-pointer">All trips</summary>
<section className="mt-8">
          <details className="mb-4 text-sm text-slate-600"><summary className="w-fit cursor-pointer">Find or add a trip</summary><div className="mt-3 flex flex-col gap-3 sm:flex-row">
            <Input aria-label="Search trips" placeholder="Find a trip" value={tripSearch} onChange={event => setTripSearch(event.target.value)} className="flex-1" />
            <select aria-label="Filter trips" className="simple-select sm:w-36" value={tripFilter} onChange={event => setTripFilter(event.target.value as typeof tripFilter)}><option value="All">All trips</option><option value="Upcoming">Upcoming</option><option value="Past">Past</option><option value="Drafts">Drafts</option></select>
            <Button variant="outline" onClick={() => { setNewExecutive(selectedExecutive?.name || ""); setNewTripOpen(true); }}><Plus /> New trip</Button>
          </div></details>
          <div className="divide-y divide-slate-200 border-y border-slate-200">{visibleTrips.map(trip => <button key={trip.id} className="block w-full px-1 py-5 text-left transition hover:bg-slate-50"
            onClick={() => { setActiveTripId(trip.id); setActiveTab("itinerary"); setScreen("detail"); }}
            onDragOver={event => event.preventDefault()}
            onDrop={event => { event.preventDefault(); processFiles(event.dataTransfer.files, trip.id); setActiveTripId(trip.id); setActiveTab("itinerary"); setScreen("detail"); }}>
            <p className="font-semibold">{trip.name}</p><p className="mt-1 text-sm text-slate-600">{trip.traveler} · {trip.dates}</p>
          </button>)}</div>
          {!visibleTrips.length && <p className="py-10 text-center text-slate-500">{executiveTrips.length ? "No matching trips." : `No trips for ${selectedExecutive?.name}. Drop a confirmation to start.`}</p>}
        </section>
        </details>
        </section>
        <WorkspaceUploadPanel
          onUpload={() => smartInput.current?.click()}
          uploadArea={<>
            <button type="button" disabled={uploadLoading || !!uploadLoadError} onClick={() => smartInput.current?.click()}
              onDragOver={event => event.preventDefault()}
              onDrop={event => { event.preventDefault(); dropFiles(event.dataTransfer.files); }}
              className="console-drop app-chrome flex w-full items-center gap-4 rounded-xl border border-dashed border-[#b6a3bd] bg-[#faf8fb] p-6 text-left transition hover:border-[#6b3f78] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#6b3f78]">
              <CloudUpload className="size-6 shrink-0 text-[#6b3f78]" />
              <span><span className="block font-semibold">Drop files here or choose files</span><span className="mt-1 block text-sm text-slate-600">Document type recognized automatically · Up to 20 MB per file</span></span>
            </button>
            <input ref={smartInput} disabled={uploadLoading || !!uploadLoadError} className="hidden" type="file" multiple accept={automaticUploadAccept}
              onChange={event => event.target.files && dropFiles(event.target.files)} />
          </>}
          uploadUnavailable={uploadLoading || !!uploadLoadError}
          reviewLaterCount={deferredUploads.filter(value => value.executiveId === selectedExecutiveId).length}
          onReviewCalendar={() => { setReviewLater(false); setCalendarReview(true); setUploadOpen(true); }}
          onReviewLater={() => { setReviewLater(true); setCalendarReview(false); setUploadOpen(true); }}
        />
        </div>
      </div>




      {attentionDialogs}

      <Dialog open={reportOpen} onOpenChange={setReportOpen}>
        <DialogContent><DialogHeader><DialogTitle>Create report</DialogTitle><DialogDescription>{menuExecutive?.name}</DialogDescription></DialogHeader>
          {reportTrips.length ? <div className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="report-type">Report</Label><select id="report-type" className="simple-select" value={reportType} onChange={event => setReportType(event.target.value as typeof reportType)}><option value="expenses">Expense report</option><option value="itinerary">Travel itinerary</option></select></div><div className="grid gap-2"><Label htmlFor="report-trip">Trip</Label><select id="report-trip" className="simple-select" value={reportTripId} onChange={event => setReportTripId(event.target.value)}>{reportTrips.map(trip => <option key={trip.id} value={trip.id}>{trip.name}</option>)}</select></div></div> : <p className="py-3 text-sm text-slate-600">Drop a confirmation or add a trip first.</p>}
          {tripSaveError && <p role="alert" className="text-sm text-destructive">{tripSaveError}</p>}<DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={() => void createReport()} disabled={tripSaving || !reportTrips.some(trip => String(trip.id) === reportTripId)}>{tripSaving ? "Saving…" : "Create report"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      {templatesEditor}

      <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
        <DialogContent><DialogHeader><DialogTitle>Calendar connection</DialogTitle><DialogDescription>Live calendar publishing is disabled in this workspace. Calendar previews and exports remain available.</DialogDescription></DialogHeader><div className="grid gap-2 py-3"><Label htmlFor="calendar-provider">Calendar</Label><select id="calendar-provider" className="simple-select" value={calendarProvider} onChange={event => setCalendarProvider(event.target.value as "outlook" | "google")}><option value="outlook">Outlook</option><option value="google">Google Calendar</option></select><p className="text-sm text-slate-600">{calendarConnections[calendarProvider] ? "Connected" : "Live publishing disabled in test mode"}</p></div><DialogFooter><DialogClose asChild><Button>Done</Button></DialogClose></DialogFooter></DialogContent>
      </Dialog>

      <Dialog open={newTripOpen} onOpenChange={setNewTripOpen}>
        <DialogContent><DialogHeader><DialogTitle>New trip</DialogTitle><DialogDescription>Name the trip and executive.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="trip-name">Trip name</Label><Input id="trip-name" value={newTripName} onChange={event => setNewTripName(event.target.value)} placeholder="Boston meeting" /></div><div className="grid gap-2"><Label htmlFor="trip-executive-name">Executive</Label><Input id="trip-executive-name" value={newExecutive} onChange={event => setNewExecutive(event.target.value)} /></div></div>
          {tripSaveError && <p role="alert" className="text-sm text-destructive">{tripSaveError}</p>}<DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={() => void addTrip()} disabled={tripSaving}>{tripSaving ? "Saving…" : "Create trip"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={appointmentOpen} onOpenChange={setAppointmentOpen}>
        <DialogContent><DialogHeader><DialogTitle>Add appointment</DialogTitle><DialogDescription>Add a meeting, dinner, or event.</DialogDescription></DialogHeader>
          <div className="grid gap-4 py-2"><div className="grid gap-2"><Label htmlFor="appointment-title">Appointment</Label><Input id="appointment-title" value={appointmentTitle} onChange={event => setAppointmentTitle(event.target.value)} placeholder="Team dinner" /></div><div className="grid gap-2"><Label htmlFor="appointment-date">Date</Label><Input id="appointment-date" type="date" value={appointmentDate} onChange={event => setAppointmentDate(event.target.value)} /></div></div>
          {tripSaveError && <p role="alert" className="text-sm text-destructive">{tripSaveError}</p>}<DialogFooter><DialogClose asChild><Button variant="outline">Cancel</Button></DialogClose><Button onClick={() => void addAppointment()} disabled={tripSaving || !appointmentTitle.trim()}>{tripSaving ? "Saving…" : "Add"}</Button></DialogFooter>
        </DialogContent>
      </Dialog>
    </main>
  );
}
