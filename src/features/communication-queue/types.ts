/**
 * Proposed frontend boundary for an OUTSIDE contribution.
 * These are not existing backend endpoints or a finalized database schema.
 */
export type Id = string;

export interface ExecutiveContext {
  id: Id;
  displayName: string;
  timeZone: string;
}

export interface AuthorizedContact {
  id: Id;
  displayName: string;
  relationshipLabel?: string;
}

export interface FlightOption {
  id: Id;
  flightNumber: string;
  origin: string;
  destination: string;
  scheduledDepartureAt: string; // ISO timestamp with Z or explicit offset.
  departureTimeZone: string; // IANA time zone for display.
}

export interface AnswerChoice {
  id: Id;
  label: string;
}

export interface QueueItem {
  id: Id;
  kind: "question" | "information";
  title: string;
  context?: string;
  choices: AnswerChoice[];
  recommendedChoiceId?: Id;
  recommendationNote?: string;
}

export type DeliveryIntent =
  | { kind: "now" }
  | { kind: "custom"; localDateTime: string; timeZone: string }
  | {
      kind: "flight";
      flightId: Id;
      scheduledDepartureAt: string;
      departureTimeZone: string;
      trigger: "not_yet_defined";
    };

export interface CommunicationBatch {
  id: Id;
  executiveId: Id;
  title: string;
  items: QueueItem[];
  status: "draft" | "scheduled" | "delivered" | "completed";
  deliveryIntent?: DeliveryIntent;
}

export type ResponseAction =
  | { kind: "answer"; choiceId: Id }
  | { kind: "call_asap" }
  | { kind: "discuss_later" }
  | { kind: "delegate"; contactId: Id }
  // Provisional information-only interaction, not a finalized business rule.
  | { kind: "acknowledge" };

export interface ItemResponse {
  batchId: Id;
  itemId: Id;
  action: ResponseAction;
}

export interface SavedItemResponse extends ItemResponse {
  id: Id;
  recordedAt: string;
}

export interface EAQueueComposerProps {
  executive: ExecutiveContext;
  draft: CommunicationBatch;
  upcomingFlights: FlightOption[];
  existingResponses: SavedItemResponse[];
  onSaveDraft: (draft: CommunicationBatch) => Promise<CommunicationBatch>;
  onSchedule: (
    batchId: Id,
    intent: DeliveryIntent,
  ) => Promise<CommunicationBatch>;
}

export interface ExecutiveQueuePlayerProps {
  executive: ExecutiveContext;
  batch: CommunicationBatch;
  authorizedContacts: AuthorizedContact[];
  existingResponses: SavedItemResponse[];
  onRespond: (response: ItemResponse) => Promise<SavedItemResponse>;
  onClose?: () => void;
}
