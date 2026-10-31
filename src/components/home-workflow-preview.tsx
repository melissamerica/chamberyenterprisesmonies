
import { useState } from "react";
import { ArrowUpRight, CalendarDays, Check, FileSpreadsheet, FileText, Paperclip, Sparkles, MapPin, RotateCcw } from 'lucide-react';

/** An original, decorative illustration of the existing workflow, never saved data. */
export function HomeWorkflowPreview() {
  const [view, setView] = useState<'create' | 'remember'>('create');
  return <section className="anya-workflow-demo" aria-label="Explore how Anya works">
    <div className="anya-demo-switch" role="group" aria-label="Workflow examples">
      <button type="button" aria-pressed={view==='create'} onClick={()=>setView('create')}>Automated creation</button>
      <button type="button" aria-pressed={view==='remember'} onClick={()=>setView('remember')}>Learning your choices</button>
    </div>
    {view==='remember' ? <div className="anya-memory-example" aria-label="Illustrative example of remembered vendor and city decisions">
      <span className="anya-example-label">ILLUSTRATIVE EXAMPLE</span>
      <div className="anya-memory-heading"><Sparkles aria-hidden="true"/><h3>Your decisions.<br/><em>Less repeat work.</em></h3></div>
      <div className="anya-memory-decision"><small>YOU DECIDE</small><strong>Streamline subscription</strong><span><MapPin aria-hidden="true"/> Tallahassee</span><p>Non-travel receipt</p><div><Check aria-hidden="true"/> Remember for this vendor in this city</div></div>
      <div className="anya-memory-next"><RotateCcw aria-hidden="true"/><div><small>NEXT MATCHING TRANSACTION</small><strong>Recognized as non-travel.</strong><p>The saved decision keeps it off the expense report.</p></div></div>
      <p className="anya-memory-note">Choices are saved per executive. Review or forget them whenever you need.</p>
    </div> : <div className="anya-workflow-art" role="img" aria-label="Illustrative example: after trip confirmation, booking details create a calendar entry, an editable itinerary and an expense report using a saved template.">
    <div aria-hidden="true" className="anya-art-inner">
      <div className="anya-art-orbit"/><div className="anya-art-dotgrid"/>
      <div className="anya-art-caption"><span className="anya-art-spark">✳</span><span>One confirmation.<br/><strong>Three outputs.</strong></span></div>
      <div className="anya-art-source"><div className="anya-art-source-icon"><FileText/></div><div><small>THE STARTING POINT</small><strong>Flight confirmation.pdf</strong><span>Recognize → Confirm trip → Create <ArrowUpRight/></span></div></div>
      <svg className="anya-art-path" viewBox="0 0 440 420" fill="none"><path d="M110 85 C32 195 350 100 320 226 S144 310 250 374" stroke="currentColor" strokeWidth="1.5" strokeDasharray="5 7"/></svg>
      <div className="anya-art-calendar"><div className="anya-art-card-heading"><span><CalendarDays/>CALENDAR</span><span className="anya-art-check"><Check/></span></div><strong>DL1358; TLH-ATL;<br/>8:09pm/10pm; 2C; CJT8JH</strong><div className="anya-art-calendar-bottom"><span>WED 04</span><span>8:09 PM <i>→</i> 10:00 PM</span></div></div>
      <div className="anya-art-itinerary"><div className="anya-art-card-heading"><span><FileText/>ITINERARY</span><Paperclip/></div><strong>Your saved layout.</strong><div className="anya-art-timeline"><span/><p><b>Flight to Atlanta</b><small>TLH → ATL · Seat 2C</small></p></div><div className="anya-art-timeline"><span/><p><b>Hotel check-in</b><small>Travel + selected meetings</small></p></div><div className="anya-art-format">Editable Word · Print / PDF</div></div>
      <div className="anya-art-expense"><div className="anya-art-card-heading"><span><FileSpreadsheet/>EXPENSES</span><span className="anya-art-mini-dot"/></div><strong>Expenses, started.</strong><div className="anya-art-expense-row"><span>Airfare</span><b>$358.40</b></div><div className="anya-art-expense-status">Ready to review</div></div>
      <div className="anya-art-example">EXAMPLE WORKFLOW</div>
    </div>
  </div>}
  </section>;
}
