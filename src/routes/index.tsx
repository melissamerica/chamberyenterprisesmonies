import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowRight, Check, Plane } from "lucide-react";
import { SiteHeader } from "@/components/site/site-layout";
import { CalendarOutput, ItineraryOutput, ExpenseReportOutput } from "@/components/travel-output";
import { defaultTemplates, type OutputTrip } from "@/lib/executive-profiles";

const description = "Melissa Chambery’s executive assistant and AI workflow portfolio: one flight confirmation, reusable traveler formats, and prepared calendar, itinerary and expense outputs.";
export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => search,
  head: () => ({ meta: [
    { title: "Melissa Chambery | Executive Assistant & AI Workflow Portfolio" },
    { name: "description", content: description },
    { property: "og:title", content: "Melissa Chambery | Executive Assistant & AI Workflow Portfolio" },
    { property: "og:description", content: description },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PortfolioHome,
});

// Fictional public example. No account, stored records or external delivery.
const example: OutputTrip = {
  name: "Leadership meeting · Fictional example", traveler: "Alex Morgan",
  dates: "November 18, 2026", route: "TLH → ATL",
  items: [{ id: 1, kind: "Flight", title: "DL 1234 · TLH → ATL", detail: "Flight DL 1234 · Seat 12A · Confirmation DEMO26", date: "2026-11-18", time: "8:00 AM – 9:15 AM", location: "Tallahassee (TLH) → Atlanta (ATL)", source: "Fictional flight confirmation", cost: 278.40, start: "2026-11-18T08:00:00-05:00", end: "2026-11-18T09:15:00-05:00", flightCode: "DL 1234", origin: "TLH", destination: "ATL", seat: "12A", confirmation: "DEMO26", departureTime: "8:00 AM", arrivalTime: "9:15 AM" }],
};
const templates = { ...defaultTemplates, outlookTitle: "{flight} · {origin} → {destination} · Seat {seat}", outlookNotes: "Confirmation: {confirmation}\nExecutive: {executive}\n{details}", expenseShowCategory: false };
const outputs = [
  { key: "calendar", label: "Custom calendar", title: "The traveler’s format, reused.", copy: "Flight details fill a saved calendar format, including seat, confirmation, reminder and availability. A prepared entry for review; live calendar delivery is not connected." },
  { key: "itinerary", label: "Itinerary", title: "A usable itinerary, already assembled.", copy: "The same confirmation becomes a chronological itinerary in the executive’s saved format. The app also supports Word export." },
  { key: "expenses", label: "Expense report", title: "The fare becomes an expense record.", copy: "The flight amount and source appear in the report without a second transcription. Missing amounts remain visible. Excel export is supported." },
] as const;

function PortfolioHome() {
  const [selected, setSelected] = useState<(typeof outputs)[number]["key"]>("itinerary");
  const active = outputs.find(output => output.key === selected)!;
  return <div className="cr-portfolio pf-tight">
    <SiteHeader portfolio />
    <main id="main-content">
      <section className="cr-wrap pf-intro" aria-labelledby="portfolio-title">
        <p className="cr-eyebrow">EA Tool for Executive Assistants <span>· anya.</span></p>
        <h1 id="portfolio-title">How much time does one flight confirmation cost an EA <em>after booking?</em></h1>
        <p className="pf-outcome">I designed a workflow that eliminates repeated preparation, leaving the EA to <strong>audit, submit, and resolve exceptions.</strong></p>
        <p className="pf-context">One confirmation. A known traveler. Booking already complete.</p>
      </section>

      <section id="case-study" className="cr-wrap pf-workflow" aria-label="Traditional workflow compared with the workflow I designed">
        <article><p className="cr-eyebrow">Traditional workflow</p><h2>The EA moves the same details.</h2><div className="pf-route"><span>Confirmation</span><ArrowRight size={17} aria-hidden="true"/><span>Calendar</span><span>Itinerary</span><span>Expenses</span><span>Files</span></div><p>Find the traveler. Re-enter the details. Customize each destination. Repeat when the confirmation changes. Then audit and submit.</p></article>
        <article className="pf-designed"><p className="cr-eyebrow">The workflow I designed</p><h2>The EA reviews the finished work.</h2><div className="pf-route"><span><Plane size={15} aria-hidden="true"/> Confirmation</span><ArrowRight size={17} aria-hidden="true"/><span>Prepared outputs + evidence</span><ArrowRight size={17} aria-hidden="true"/><span><Check size={15} aria-hidden="true"/> Human audit</span></div><p>Saved traveler preferences shape the outputs. Routine preparation disappears; missing information and conflicts come back for judgment.</p><small>Target workflow · connected automation remains in development.</small></article>
      </section>

      <section id="features" className="cr-wrap pf-features" aria-labelledby="features-title">
        <div className="pf-section-heading"><div><p className="cr-eyebrow">Inside the prototype</p><h2 id="features-title">One source. Three prepared outputs.</h2></div><p>Switch views to see the same fictional flight in the app’s actual output components.</p></div>
        <div className="pf-preview-shell">
          <div className="pf-output-switch" role="group" aria-label="Choose an output preview">{outputs.map(output => <button type="button" key={output.key} aria-pressed={selected === output.key} aria-controls="output-preview" onClick={() => setSelected(output.key)}>{output.label}</button>)}</div>
          <div className="pf-preview-grid">
            <div className="pf-feature-copy"><p className="pf-demo-label">Fictional example · Read-only</p><h3>{active.title}</h3><p>{active.copy}</p><dl><div><dt>Traveler</dt><dd>Alex Morgan</dd></div><div><dt>Flight</dt><dd>DL 1234 · TLH → ATL</dd></div><div><dt>Source amount</dt><dd>$278.40</dd></div></dl></div>
            <div id="output-preview" className="pf-output" aria-label={active.label + " preview"}>
              {selected === "calendar" ? <CalendarOutput templates={templates} item={example.items[0]} trip={example}/> : selected === "itinerary" ? <ItineraryOutput templates={templates} trip={example}/> : <ExpenseReportOutput templates={templates} trip={example}/>}
            </div>
          </div>
        </div>
        <div className="pf-capabilities"><p><strong>Recognize the document.</strong> Extract booking details from uploaded confirmations.</p><p><strong>Reuse the preferences.</strong> Apply saved traveler-specific output formats.</p><p><strong>Keep the evidence.</strong> Carry the source into review and expense preparation.</p></div>
      </section>

      <section id="contribution" className="cr-wrap pf-role" aria-labelledby="role-title"><h2 id="role-title">My contribution</h2><p>More than ten years of executive support shaped the requirements: individual preferences, repeated customization, and the cost of small errors. I mapped the workflow, defined review and exception rules, and used AI-assisted development to build and refine the prototype.</p></section>
      <div className="cr-wrap pf-notes"><details><summary>Development status & research context</summary><div><p>The previews above use the app’s real rendering components with fictional data. The prototype supports document intake, reusable formats, and itinerary and expense exports. Automatic mailbox intake, connected delivery, and the routine audit-only workflow remain development goals. The working prototype still has review steps.</p><p>This case study measures human handling per confirmation, excluding booking. No measured production time saving is claimed. <a href="https://www.bcdtravel.com/at/wp-content/uploads/sites/14/BCD-Travel-Cytric-Training-Material-Travel-Arranger-_JAN20-English.pdf" target="_blank" rel="noreferrer">BCD Travel’s arranger training</a> and <a href="https://help.tripit.com/en/support/solutions/articles/103000063432-travel-arrangers" target="_blank" rel="noreferrer">TripIt’s arranger guidance</a> document work after booking; neither establishes universal minutes per confirmation.</p></div></details></div>
      <footer className="cr-wrap pf-footer"><span>Melissa Chambery · Executive Assistant & AI Workflow Design</span><a href="mailto:melissa.chambery@gmail.com">Let’s talk <ArrowRight size={15} aria-hidden="true"/></a></footer>
    </main>
  </div>;
}
