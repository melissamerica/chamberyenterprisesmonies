import { createFileRoute } from "@tanstack/react-router";
import { CalendarDays, FileText, FolderCheck, ReceiptText, Plane, ArrowDown } from "lucide-react";
import { SiteHeader } from "@/components/site/site-layout";
import portfolioCss from "./portfolio-home.css?url";

const description = "Melissa Chambery’s portfolio: executive assistant experience applied to practical AI and workflow design. Featuring EA Tool for Executive Assistants, a developing travel preparation tool.";
export const Route = createFileRoute("/")({
  validateSearch: (search: Record<string, unknown>) => search,
  head: () => ({ links: [{ rel: "stylesheet", href: portfolioCss }], meta: [
    { title: "Melissa Chambery | Executive Assistant & AI Workflow Portfolio" },
    { name: "description", content: description },
    { property: "og:title", content: "Melissa Chambery — Chambery Reveries" },
    { property: "og:description", content: description },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
  ] }),
  component: PortfolioHome,
});

const destinations = [
  { icon: CalendarDays, title: "Calendar", detail: "Flight times, time zones, preferred entry format" },
  { icon: FileText, title: "Itinerary", detail: "Details in the executive’s preferred layout" },
  { icon: ReceiptText, title: "Expense records", detail: "Fare, currency and supporting evidence" },
  { icon: FolderCheck, title: "Supporting files", detail: "Confirmation associated with the right traveler" },
];

function PortfolioHome() {
  return <div className="cr-portfolio">
    <SiteHeader portfolio />
    <main id="main-content">
      <section className="cr-hero cr-wrap" aria-labelledby="portfolio-title">
        <div>
          <p className="cr-eyebrow">Melissa Chambery · Executive Assistant</p>
          <h1 id="portfolio-title">Practical AI.<br /><em>An EA’s perspective.</em></h1>
          <p className="cr-lead">More than ten years in executive support. A firsthand understanding of the details. An interest in making the work simpler.</p>
          <p className="cr-body">I develop tools that apply AI and automation to familiar administrative challenges. This portfolio shares the problems I’ve explored, the workflows I’ve designed, and the judgment behind them.</p>
          <a className="cr-primary-link" href="#case-study">Explore the case study <ArrowDown size={17} aria-hidden="true" /></a>
        </div>
        <aside className="cr-hero-note" aria-label="Featured project">
          <p className="cr-eyebrow">Featured project / 01</p>
          <p className="cr-project-name">EA Tool for<br />Executive Assistants<small>anya.</small></p>
          <p className="cr-note-title">An executive assistant’s<br />workflow project.</p>
          <p>Starting with one flight confirmation—and the repeated preparation it creates.</p>
          <div className="cr-note-footer"><span>Developing prototype</span><span>AI & automation</span></div>
        </aside>
      </section>

      <section id="case-study" className="cr-case" aria-labelledby="case-title">
        <div className="cr-wrap">
          <p className="cr-eyebrow">Case study · A single flight confirmation</p>
          <h2 id="case-title">How much time does a single flight confirmation cost an EA—<em>after booking?</em></h2>
          <p className="cr-case-intro">The flight is booked. The same information still needs to go into several places, customized for each one. That repeated handling is the problem I set out to reduce.</p>
          <div className="cr-confirmation-source"><Plane size={22} aria-hidden="true" /><div><strong>One flight confirmation arrives</strong><span>Known traveler · Booking already complete</span></div></div>
          <div className="cr-destinations" aria-label="Four destinations for the same confirmation information">
            {destinations.map(({ icon: Icon, title, detail }, index) => <article key={title}>
              <div className="cr-destination-top"><Icon size={23} strokeWidth={1.4} aria-hidden="true" /><span>0{index + 1}</span></div>
              <h3>{title}</h3><p>{detail}</p>
            </article>)}
          </div>
          <p className="cr-caption">One source. Several formats. Repeated entry and customization by the EA.</p>
          <div className="cr-comparison">
            <article><p className="cr-eyebrow">Traditional preparation</p><h3>Transfer. Customize. Repeat.</h3><p>Extract the details, find the right records, format calendar entries, update the itinerary, and organize expense evidence. A revised confirmation can mean revisiting each affected destination.</p><p className="cr-comparison-end">The EA prepares the pieces, then audits and submits.</p></article>
            <article className="cr-anya-comparison"><p className="cr-eyebrow">The workflow I designed</p><h3>Audit. Submit.</h3><p>The tool’s intended workflow handles routine preparation for a known traveler. The EA audits the completed itinerary and expenses, submits the work, and addresses occasional exceptions.</p><p className="cr-comparison-end">The EA’s judgment stays. Repetitive handling goes.</p></article>
          </div>
          <p className="cr-status-note">Development note: the prototype supports confirmation-to-output preparation. Automatic email intake and connected delivery remain in development; the comparison describes the intended workflow.</p>
        </div>
      </section>

      <section id="contribution" className="cr-wrap cr-contribution" aria-labelledby="contribution-title">
        <div><p className="cr-eyebrow">My contribution</p><h2 id="contribution-title">Experience defines<br /><em>what to automate.</em></h2><p className="cr-body">I brought the executive assistant’s perspective: individual preferences, repeated formatting, the consequences of small errors, and the need to keep final judgment with a person.</p></div>
        <div className="cr-contribution-list">
          <article><span>01</span><div><h3>Understand the work</h3><p>Identify repeated transfers and customizations behind an apparently simple confirmation.</p></div></article>
          <article><span>02</span><div><h3>Define a useful outcome</h3><p>Design around completed, usable records—not another set of tasks for the EA to manage.</p></div></article>
          <article><span>03</span><div><h3>Develop and refine</h3><p>Use AI-assisted development to turn operational requirements into a working prototype and refine its behavior.</p></div></article>
          <article><span>04</span><div><h3>Keep judgment where it belongs</h3><p>Separate routine preparation from audits and exceptions such as missing information or conflicting bookings.</p></div></article>
        </div>
      </section>

      <section className="cr-wrap cr-evidence" aria-labelledby="evidence-title">
        <p className="cr-eyebrow">Measuring the difference</p><h2 id="evidence-title">Count the work behind the confirmation.</h2>
        <p>My focus is the EA’s active time transferring, customizing, filing and updating information from one confirmation. Booking time, final audits and exception handling are recorded separately.</p>
        <details><summary>Research context and measurement approach <span aria-hidden="true">+</span></summary>
          <div className="cr-research-content"><p>Travel providers document work after booking. <a href="https://www.bcdtravel.com/at/wp-content/uploads/sites/14/BCD-Travel-Cytric-Training-Material-Travel-Arranger-_JAN20-English.pdf" target="_blank" rel="noreferrer">BCD Travel’s arranger training (page 59)</a> calls for checking confirmations, ensuring traveler receipt and verifying booking visibility. <a href="https://help.tripit.com/en/support/solutions/articles/103000063432-travel-arrangers" target="_blank" rel="noreferrer">TripIt’s arranger guidance</a> also describes forwarding, organizing and sharing plans.</p>
          <p>These sources establish the work involved; they do not establish a universal number of minutes per confirmation. A fair comparison times the same required outputs using the EA’s existing tools, then records the human work remaining with the tool. Time savings are not presented here as measured production results.</p></div>
        </details>
      </section>

      <section id="selected-work" className="cr-wrap cr-selected" aria-labelledby="selected-title">
        <p className="cr-eyebrow">Other explorations</p><h2 id="selected-title">The same practical curiosity,<br /><em>applied elsewhere.</em></h2>
        <div className="cr-work-grid"><article><p className="cr-work-type">Traveler support · Concept</p><h3>EA Tool for Travelers/<wbr />Consultants <small className="project-alias">alec.</small></h3><p>Exploring a companion experience for travelers and consultants, alongside the EA’s workflow.</p></article><article><p className="cr-work-type">Business development · Prototype</p><h3>Travel & opportunity</h3><p>Bringing executive travel and geographic relationship priorities together to help identify meeting opportunities.</p></article></div>
      </section>
      <footer className="cr-wrap cr-footer"><div><strong>Melissa Chambery</strong><p>Executive support experience.<br />Thoughtful applications of AI.</p></div><a href="#portfolio-title">Back to top ↑</a></footer>
    </main>
  </div>;
}
