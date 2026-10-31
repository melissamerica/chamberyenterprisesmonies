import type { TravelConfirmation } from "./travel-confirmations";
import { isOpenUploadTrip, tripWindow, type UploadTrip } from "./workspace-uploads";

const cities: Record<string, string> = {ATL:"Atlanta",BOS:"Boston",CLT:"Charlotte",DCA:"Washington",IAD:"Washington",DEN:"Denver",DFW:"Dallas",EWR:"Newark",FLL:"Fort Lauderdale",IAH:"Houston",JFK:"New York",LGA:"New York",LAS:"Las Vegas",LAX:"Los Angeles",MCO:"Orlando",MIA:"Miami",ORD:"Chicago",PHL:"Philadelphia",PHX:"Phoenix",SEA:"Seattle",SFO:"San Francisco",TLH:"Tallahassee"};
function places(text: string) {
  const found = new Set<string>();
  for (const [code, city] of Object.entries(cities)) if (new RegExp(`\\b${code}\\b`, "i").test(text) || text.toLowerCase().includes(city.toLowerCase())) found.add(city);
  return found;
}
export type TravelTripMatch = {tripId: number; reason: string; confidence: number};
export function matchingTravelTrips(document: TravelConfirmation, trips: UploadTrip[]): TravelTripMatch[] {
  const window = tripWindow({...document, id: -1});
  const documentPlaces = places([document.route, ...document.items.map(item => `${item.origin ?? ""} ${item.destination ?? ""} ${item.location ?? ""}`)].join(" "));
  const references = document.items.map(item => item.confirmation ?? item.detail.match(/\bconfirmation\s+([a-z0-9-]{5,})\b/i)?.[1]).filter((value): value is string => !!value).map(value => value.toLowerCase());
  return trips.filter(isOpenUploadTrip).flatMap(trip => {
    if (references.some(reference => trip.items.some(item => item.confirmation?.toLowerCase() === reference || new RegExp(`\\b${reference.replace(/[.*+?^${}()|[\]\\]/g,"\\$&")}\\b`,"i").test(item.detail)))) return [{tripId: trip.id, reason: "Same booking reference", confidence: 3}];
    const tripDates = tripWindow(trip);
    if (!window || !tripDates) return [];
    const overlaps = window.first <= tripDates.last && window.last >= tripDates.first;
    const gap = Math.max(Date.parse(window.first) - Date.parse(tripDates.last), Date.parse(tripDates.first) - Date.parse(window.last), 0) / 86_400_000;
    if (!overlaps && gap > 1) return [];
    const routeCodes = trip.route.match(/\b[A-Z]{3}\b/g) ?? [];
    const homeCity = routeCodes.length > 1 ? cities[routeCodes[0] ?? ""] : undefined;
    const destinationPlaces = places([trip.route, trip.name, ...trip.items.filter(item => item.kind !== "Expense" && item.kind !== "Appointment").map(item => item.location ?? "")].join(" "));
    if (homeCity) destinationPlaces.delete(homeCity);
    const samePlace = [...destinationPlaces].some(place => documentPlaces.has(place));
    if (destinationPlaces.size && documentPlaces.size && !samePlace) return [];
    if (!overlaps && !samePlace) return [];
    return [{tripId: trip.id, reason: !overlaps ? "Destination matches; travel date is next to this trip — please check" : samePlace ? "Travel dates and destination match" : "Travel dates overlap — please check the destination", confidence: overlaps && samePlace ? 2 : 1}];
  }).sort((a,b) => b.confidence - a.confidence);
}
