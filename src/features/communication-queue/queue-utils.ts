import type {
  AnswerChoice,
  AuthorizedContact,
  CommunicationBatch,
  FlightOption,
  QueueItem,
  SavedItemResponse,
} from './types';

/** Pure helpers; no service calls, storage, or access checks. */
export function cloneBatch(batch: CommunicationBatch): CommunicationBatch {
  return {
    ...batch,
    items: batch.items.map((item) => ({
      ...item,
      choices: item.choices.map((choice) => ({ ...choice })),
    })),
    deliveryIntent: batch.deliveryIntent ? { ...batch.deliveryIntent } : undefined,
  };
}

export function moveAt<T>(items: readonly T[], from: number, to: number): T[] {
  const result = [...items];
  if (from < 0 || to < 0 || from >= result.length || to >= result.length) return result;
  const [selected] = result.splice(from, 1);
  result.splice(to, 0, selected);
  return result;
}

export function makeLocalId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `local-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function newItem(kind: QueueItem['kind'] = 'question'): QueueItem {
  return { id: makeLocalId(), kind, title: '', context: '', choices: [] };
}

export function newChoice(): AnswerChoice {
  return { id: makeLocalId(), label: '' };
}

export function scheduleValidationError(batch: CommunicationBatch): string | null {
  if (!batch.items.length) return 'Add at least one question or information item before scheduling.';
  const seenItems = new Set<string>();
  for (const [index, item] of batch.items.entries()) {
    if (!item.id || seenItems.has(item.id)) return `Item ${index + 1} has a missing or duplicate identifier.`;
    seenItems.add(item.id);
    if (!item.title.trim()) return `Enter a title for item ${index + 1}.`;
    if (item.kind === 'question') {
      const seenChoices = new Set<string>();
      for (const choice of item.choices) {
        if (!choice.id || seenChoices.has(choice.id)) return `Item ${index + 1} contains duplicate or missing choice IDs.`;
        seenChoices.add(choice.id);
        if (!choice.label.trim()) return `Complete or remove the blank answer choice on item ${index + 1}.`;
      }
      if (item.recommendedChoiceId && !seenChoices.has(item.recommendedChoiceId)) {
        return `Item ${index + 1}'s recommendation no longer matches an answer choice.`;
      }
    }
  }
  return null;
}

export function isValidZone(zone: string): boolean {
  if (!zone || !zone.trim()) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: zone }).format(new Date());
    return true;
  } catch { return false; }
}

const pad = (value: number) => String(value).padStart(2, '0');

function localMinuteAt(instant: number, zone: string): string {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date(instant));
  const fields = Object.fromEntries(parts.filter((part) => part.type !== 'literal').map((part) => [part.type, part.value]));
  return `${fields.year}-${fields.month}-${fields.day}T${fields.hour}:${fields.minute}`;
}

/** Validate wall-clock input, DST ambiguity and future timing without choosing a browser zone. */
export function validateCustomDateTime(value: string, zone: string, now = Date.now()): string | null {
  if (!isValidZone(zone)) return 'A valid executive time zone is required. Ask the host to provide one.';
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) return 'Select a calendar date and time.';
  const [, y, m, d, h, min] = match.map(Number);
  const asUtc = Date.UTC(y, m - 1, d, h, min);
  const canonical = `${pad(y).padStart(4, '0')}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;
  if (new Date(asUtc).toISOString().slice(0, 16) !== canonical) return 'Enter a valid calendar date and time.';

  const offsets = new Set<number>();
  for (const hours of [-36, -24, -12, -6, 0, 6, 12, 24, 36]) {
    const trial = asUtc + hours * 3_600_000;
    const local = localMinuteAt(trial, zone);
    const localUtc = Date.UTC(
      Number(local.slice(0, 4)), Number(local.slice(5, 7)) - 1,
      Number(local.slice(8, 10)), Number(local.slice(11, 13)), Number(local.slice(14, 16)),
    );
    offsets.add(localUtc - trial);
  }
  const matches = [...offsets]
    .map((offset) => asUtc - offset)
    .filter((instant) => localMinuteAt(instant, zone) === canonical);
  if (!matches.length) return 'That local time does not exist because of a daylight-saving clock change.';
  if (matches.length > 1) return 'That time happens twice during a clock change. Choose an unambiguous time.';
  if (matches[0] <= now) return 'Choose a delivery time in the future.';
  return null;
}

export function formatDateInZone(instant: string, zone: string): string {
  const date = new Date(instant);
  if (!Number.isFinite(date.getTime()) || !isValidZone(zone)) return 'Invalid date/time supplied';
  return new Intl.DateTimeFormat('en-US', {
    timeZone: zone, weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date);
}

export function eligibleFlights(flights: readonly FlightOption[], now = Date.now()): FlightOption[] {
  return flights.filter((flight) =>
    Boolean(flight.id && flight.origin && flight.destination && flight.scheduledDepartureAt && /(?:Z|[+-]\d{2}:\d{2})$/i.test(flight.scheduledDepartureAt) && isValidZone(flight.departureTimeZone)) &&
    Number.isFinite(new Date(flight.scheduledDepartureAt).getTime()) &&
    new Date(flight.scheduledDepartureAt).getTime() > now,
  );
}

export function flightDisplay(flight: FlightOption): string {
  return `${flight.flightNumber || 'Flight'} · ${flight.origin} → ${flight.destination} · ${formatDateInZone(flight.scheduledDepartureAt, flight.departureTimeZone)} (${flight.departureTimeZone})`;
}

export function latestResponses(responses: readonly SavedItemResponse[]): Map<string, SavedItemResponse> {
  const result = new Map<string, SavedItemResponse>();
  for (const response of responses) {
    const existing = result.get(response.itemId);
    const existingTime = existing ? Date.parse(existing.recordedAt) : -Infinity;
    const nextTime = Date.parse(response.recordedAt);
    if (!existing || (Number.isFinite(nextTime) && nextTime >= existingTime)) {
      result.set(response.itemId, response);
    }
  }
  return result;
}

export function describeResponse(
  response: SavedItemResponse,
  item?: QueueItem,
  contacts: readonly AuthorizedContact[] = [],
): string {
  const action = response.action;
  switch (action.kind) {
    case 'answer':
      return `Answered: ${item?.choices.find((choice) => choice.id === action.choiceId)?.label ?? 'Recorded answer'}`;
    case 'call_asap': return 'Requested a call ASAP — follow-up needed';
    case 'discuss_later': return 'Requested a later discussion — not scheduled';
    case 'delegate': {
      const contact = contacts.find((entry) => entry.id === action.contactId);
      return `Delegation requested to ${contact?.displayName || `contact ID ${action.contactId}`} — not confirmed complete`;
    }
    case 'acknowledge': return 'Acknowledged — provisional information-item behavior';
  }
}

export function validSavedResponse(value: SavedItemResponse | null | undefined, batchId: string, itemId: string): boolean {
  return Boolean(value && value.id && Number.isFinite(Date.parse(value.recordedAt)) && value.batchId === batchId && value.itemId === itemId && value.action);
}
