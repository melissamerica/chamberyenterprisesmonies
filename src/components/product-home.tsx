
import { useState } from "react";
import { ArrowRight, ArrowUpRight, CalendarDays, Check, CheckCheck, ChevronDown, FileCheck2, FileSpreadsheet, FileText, Layers3, MapPin, Paperclip, Plane, ScanLine, Sparkles, UploadCloud } from "lucide-react";

const testHref = "/test?view=home";
type Output = "Calendar" | "Itinerary" | "Expenses";

function OutputPreview({ output }: { output: Output }) {
  if (output === "Calendar") return <div className="product-calendar">
    <span className="product-document-label">CALENDAR ENTRY / SAVED FLIGHT FORMAT</span>
    <h3>DL1358; TLH-ATL;<br/>8:09pm/10pm; 2C; CJT8JH</h3>
    <dl><div><dt>Starts</dt><dd>November 4 · 8:09 PM</dd></div><div><dt>Ends</dt><dd>November 4 · 10:00 PM</dd></div><div><dt>Location</dt><dd>Tallahassee → Atlanta</dd></div></dl>
    <p><Plane aria-hidden="true"/> Seat 2C <span>·</span> Confirmation CJT8JH</p>
  </div>;
  if (output === "Itinerary") return <div className="product-mini-itinerary">
    <span className="product-document-label">ALEX MORGAN / TRAVEL ITINERARY</span><h3>Everything for the day ahead.</h3>
    <div><time>8:09 PM</time><span><b>Flight to Atlanta</b><small>DL1358 · Seat 2C · CJT8JH</small></span><Plane aria-hidden="true"/></div>
    <div><time>10:30 PM</time><span><b>Hotel arrival</b><small>Reservation details in one place</small></span><MapPin aria-hidden="true"/></div>
    <div><time>9:00 AM</time><span><b>Client meeting</b><small>Materials attached · Digital + hardcopy</small></span><Paperclip aria-hidden="true"/></div>
    <p>Editable Word document <span>·</span> Print or save as PDF</p>
  </div>;
  return <div className="product-expense-table"><span className="product-document-label">ALEX MORGAN / EXPENSE REPORT</span><h3>The report is already underway.</h3>
    <table><thead><tr><th>Expense</th><th>Evidence</th><th>Amount</th></tr></thead><tbody><tr><td>Airfare</td><td><span className="product-evidence">Confirmation</span></td><td>$358.40</td></tr><tr><td>Client dinner</td><td><span className="product-evidence">Receipt</span></td><td>$84.20</td></tr><tr className="product-statement-row"><td>Ground transport</td><td>Statement only</td><td>$32.50</td></tr></tbody></table>
    <p><span className="product-highlight-dot"/> Statement-only proof stays visible for review.</p><div className="product-table-total"><span>Illustrative total</span><strong>$475.10</strong></div>
  </div>;
}

export function ProductHome() {
  const [output, setOutput] = useState<Output>("Calendar");
  return <div className="anya-product">
    <a className="product-skip" href="#product-main">Skip to content</a>
    <div className="product-announcement">For the person behind every executive. <span>Meet Anya.</span></div>
    <header className="product-header"><div className="product-header-inner">
      <a className="product-brand" href="/" aria-label="Anya product home"><strong>Anya<span>✳</span></strong><span>The EA’s Assistant <i>by Lissa</i></span></a>
      <nav aria-label="Product navigation"><a href="#automation">How it works</a><a href="#features">Features</a><a href="#memory">Learning & preferences</a></nav>
      <a className="product-test-link" href={testHref}>Continue to test workspace <ArrowUpRight aria-hidden="true"/></a>
    </div></header>

    <main id="product-main">
      <section className="product-hero"><div className="product-container product-hero-grid">
        <div className="product-hero-copy"><p className="product-eyebrow">YOUR EXECUTIVE ASSISTANT WORKSPACE</p><h1>Every trip,<br/><em>thoughtfully<br/>organized.</em></h1>
          <p className="product-hero-subtitle">Itineraries, calendars and expenses. One place to keep the details together.</p>
          <p className="product-hero-description">Turn travel confirmations into the details you used to type by hand. Keep your executive’s formats, preferences and travel paperwork working together.</p>
          <a className="product-primary" href={testHref}>Explore the prototype <ArrowRight aria-hidden="true"/></a><p className="product-entry-note">No account required to try the test workspace.</p>
        </div>
        <div className="product-hero-visual">
          <div className="product-recognized"><span className="product-upload-icon"><FileText aria-hidden="true"/></span><div><small>DROP A CONFIRMATION</small><strong>Flight confirmation.pdf</strong></div><span className="product-recognized-tag"><ScanLine aria-hidden="true"/> Recognized</span></div>
          <div className="product-preview-window"><div className="product-window-top"><span><i/><i/><i/></span><small>ANYA / OUTPUT PREVIEW</small><Sparkles aria-hidden="true"/></div>
            <div className="product-output-tabs" role="group" aria-label="Explore sample outputs">{(["Calendar","Itinerary","Expenses"] as Output[]).map(value=><button key={value} type="button" aria-pressed={output===value} onClick={()=>setOutput(value)}>{value=== 'Calendar'?<CalendarDays aria-hidden="true"/>:value==='Itinerary'?<FileText aria-hidden="true"/>:<FileSpreadsheet aria-hidden="true"/>}{value}</button>)}</div>
            <div className="product-output-content" aria-live="polite"><OutputPreview output={output}/></div>
            <div className="product-window-bottom"><Check aria-hidden="true"/><span>Your saved template. Your executive’s details.</span></div>
          </div>
          <div className="product-confirmed-note"><CheckCheck aria-hidden="true"/><div><strong>Confirm the trip. Let the details follow.</strong><small>Calendar + itinerary + expense lines</small></div></div><p className="product-example-note">Illustrative outputs · Live calendar and email sends are disabled in the prototype.</p>
        </div>
      </div></section>

      <section className="product-capability-strip" aria-label="Anya capabilities"><div className="product-container"><span><ScanLine/>Document recognition</span><span><CalendarDays/>Calendar drafts</span><span><FileText/>Editable itineraries</span><span><FileCheck2/>Expense evidence</span><span><Sparkles/>Preference memory</span></div></section>

      <section className="product-overview product-container" id="automation"><p className="product-eyebrow">LESS RE-ENTERING. MORE GETTING IT DONE.</p><h2>A confirmation is the beginning.<br/><em>Anya takes it from there.</em></h2><p className="product-section-lead">One booking has details that belong in three places. Anya recognizes them, asks you to confirm the trip and builds the outputs in your saved format.</p>
        <div className="product-workflow"><div><span className="product-step-icon"><UploadCloud/></span><small>01 / ADD</small><h3>Drop in the document.</h3><p>Flight, hotel and car confirmations are recognized from their contents.</p></div><ArrowRight className="product-flow-arrow" aria-hidden="true"/><div><span className="product-step-icon"><ScanLine/></span><small>02 / CONFIRM</small><h3>Confirm where it belongs.</h3><p>Review a suggested existing trip or create a new one when there is no match.</p></div><ArrowRight className="product-flow-arrow" aria-hidden="true"/><div><span className="product-step-icon"><Layers3/></span><small>03 / CREATE</small><h3>Review the finished details.</h3><p>Calendar entries, itinerary details and expense lines come from the same booking.</p></div></div>
      </section>

      <section id="features" className="product-feature-section"><div className="product-container product-feature-row">
        <div className="product-feature-copy"><p className="product-eyebrow">CALENDAR + TRAVEL ITINERARY</p><h2>A complete itinerary.<br/><em>Beyond the bookings.</em></h2><p>Before departure, import the executive’s Outlook calendar. Relevant travel and destination appointments join the itinerary; review the entries that need your judgment.</p><ul><li><Check/>Choose which additional meetings to include.</li><li><Check/>Link digital attachments to an itinerary entry.</li><li><Check/>Indicate digital, hardcopy or both for materials.</li><li><Check/>Download an editable Word itinerary.</li></ul></div>
        <div className="product-itinerary-scene" aria-label="Illustrative itinerary with selected Outlook meetings and attached materials"><span className="product-scene-caption">FROM OUTLOOK TO THE ITINERARY</span><div className="product-meeting-card"><div><CalendarDays/><span>OUTLOOK IMPORT</span><b>9:00 AM</b></div><h3>Client breakfast</h3><p>Denver · Location and meeting details</p><span className="product-selected"><Check/>Included in itinerary</span></div><div className="product-material-card"><Paperclip/><div><strong>Client briefing.pdf</strong><small>Linked to client breakfast</small></div><span>Digital + hardcopy</span></div><div className="product-day-card"><span>WEDNESDAY / NOV 04</span><h3>Alex Morgan</h3><p>Travel plans. Meetings. Materials.</p><div><i/> Airport transfer <b>Confirmed</b></div><div><i/> Client breakfast <b>Materials attached</b></div><div><i/> Conference arrival <b>Included</b></div></div><small className="product-visual-disclaimer">Fictional example</small></div>
      </div></section>

      <section className="product-container product-feature-row product-expenses-feature">
        <div className="product-spreadsheet-scene" aria-label="Illustrative expense report with highlighted statement-only evidence"><div className="product-sheet-heading"><FileSpreadsheet/><div><strong>Travel expenses</strong><small>Excel workbook · Example</small></div><span>.xlsx</span></div><OutputPreview output="Expenses"/><div className="product-receipt-chips"><span><Paperclip/> Receipts</span><span><FileText/> Credit card statement</span><span><Check/> Billing codes</span></div></div>
        <div className="product-feature-copy"><p className="product-eyebrow">RECEIPTS + EXPENSE REPORTS</p><h2>The report starts<br/><em>before the trip ends.</em></h2><p>Bring receipts and credit card statements into the same workflow. Review suggested trip matches and keep supporting documents with the report.</p><ul><li><Check/>Review possible duplicates and unrelated purchases.</li><li><Check/>Highlight charges supported only by a statement.</li><li><Check/>Apply billing codes across a report or individual lines.</li><li><Check/>Download the expense report as an Excel workbook.</li></ul></div>
      </section>

      <section id="memory" className="product-memory-section"><div className="product-container"><div className="product-memory-intro"><div><p className="product-eyebrow">LEARNING YOUR WAY OF WORKING</p><h2>Save the preference.<br/><em>Skip the repeat explanation.</em></h2></div><p>Anya carries forward the choices you tell it to remember. Reusable formats, executive preferences and vendor decisions make the next task more familiar.</p></div>
        <div className="product-memory-grid"><article><span className="product-memory-icon"><ScanLine/></span><h3>Your format, made reusable.</h3><p>Upload an Outlook screenshot, itinerary or expense document. Review the template draft, customize it and assign it to one or more executives.</p><span className="product-memory-detail">Reference → reviewed template → future trips</span></article><article><span className="product-memory-icon"><UserPreferenceIcon/></span><h3>Each executive, remembered.</h3><p>Keep ranked hotel, airline and car preferences, seating choices, room requests and rewards details in an executive’s profile.</p><span className="product-memory-detail">One profile. Preferences kept together.</span></article><article><span className="product-memory-icon"><Sparkles/></span><h3>A decision that carries forward.</h3><p>Repeated expense decisions inform explained category and non-travel suggestions. Category preferences you explicitly save fill in automatically. Review, pause or forget the learning when needed.</p><span className="product-memory-detail">Your decision → saved rule → less repeat work</span></article></div>
      </div></section>

      <section className="product-container product-supporting-features"><div><FileCheck2/><h3>Keep exceptions visible.</h3><p>Needs attention, reminders and Review later keep unresolved items within reach.</p></div><div><Paperclip/><h3>Keep the evidence together.</h3><p>Bookings, itinerary materials and expense documents remain connected to the trip.</p></div><div><FileText/><h3>Keep the outputs editable.</h3><p>Refine templates and take itineraries into Word and expense reports into Excel.</p></div></section>

      <section className="product-faq product-container"><p className="product-eyebrow">BEFORE YOU EXPLORE</p><h2>A few useful details.</h2><div>
        <details><summary>Can I try Anya without signing up?<ChevronDown/></summary><p>Yes. Continue to the test workspace to explore the prototype. Start with an executive profile or choose “Load sample workspace” for fictional sample records.</p></details>
        <details><summary>Will the prototype send emails or change my live calendar?<ChevronDown/></summary><p>No. Live calendar and email sends are disabled in this test release. You can review the generated outputs and download editable documents.</p></details>
        <details><summary>What does Anya remember?<ChevronDown/></summary><p>It keeps your saved executive preferences, templates and vendor decisions. Completed expense decisions also provide contextual evidence for recurring category suggestions. Explicitly saved category preferences fill in automatically. You can inspect, pause, forget or restore learning memories.</p></details>
      </div></section>

      <section className="product-final-cta"><div className="product-container"><div><p className="product-eyebrow">BUILT AROUND REAL EA WORK</p><h2>See the details<br/><em>come together.</em></h2></div><div><a className="product-primary" href={testHref}>Continue to test workspace <ArrowUpRight/></a><p>Explore the working prototype. No account required.</p></div></div></section>
    </main>
    <footer className="product-footer product-container"><a className="product-brand" href="/"><strong>Anya<span>✳</span></strong><span>The EA’s Assistant <i>by Lissa</i></span></a><span>Prototype · Built for executive assistants.</span><a href={testHref}>Test workspace <ArrowUpRight/></a></footer>
  </div>;
}

function UserPreferenceIcon() { return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true"><circle cx="9" cy="7" r="3"/><path d="M3 20v-3a6 6 0 0 1 12 0v3M17 7h5m-5 5h5m-4 5h4"/></svg>; }
