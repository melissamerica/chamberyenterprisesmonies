import * as React from 'react';
import { EAResponseSummary } from './EAResponseSummary';
import { QueueItemEditor } from './QueueItemEditor';
import type { CommunicationBatch, DeliveryIntent, EAQueueComposerProps, QueueItem } from './types';
import { cloneBatch, eligibleFlights, flightDisplay, moveAt, newItem, scheduleValidationError, validateCustomDateTime, isValidZone } from './queue-utils';
import './communication-queue.css';

type DeliveryMode = DeliveryIntent['kind'];

/** EA's working draft. Host is sole authority for saved/scheduled status. */
export function EAQueueComposer({
  executive, draft, upcomingFlights, existingResponses, onSaveDraft, onSchedule,
}: EAQueueComposerProps) {
  const [working, setWorking] = React.useState<CommunicationBatch>(() => cloneBatch(draft));
  const [dirty, setDirty] = React.useState(false);
  const [pending, setPending] = React.useState<'save' | 'schedule' | null>(null);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const [deliveryMode, setDeliveryMode] = React.useState<DeliveryMode>(draft.deliveryIntent?.kind || 'now');
  const [customDateTime, setCustomDateTime] = React.useState(draft.deliveryIntent?.kind === 'custom' ? draft.deliveryIntent.localDateTime : '');
  const [flightId, setFlightId] = React.useState(draft.deliveryIntent?.kind === 'flight' ? draft.deliveryIntent.flightId : '');
  const inFlight = React.useRef(false);

  // Only replace local state from new canonical props when there are no unsaved changes.
  React.useEffect(() => {
    // A new batch replaces the old one. Refreshes to the same batch never erase edits.
    if (draft.id !== working.id) {
      setWorking(cloneBatch(draft));
      setDirty(false);
      setError('');
      setNotice('');
      return;
    }
    if (!dirty && !inFlight.current) setWorking(cloneBatch(draft));
    // Only react to an actual host draft prop change, not a local dirty-flag change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft]);

  // Browser reload/close safeguard. Host SPA navigation must also protect unsaved edits.
  React.useEffect(() => {
    if (!dirty || typeof window === 'undefined') return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const canEdit = working.status === 'draft';
  const busy = pending !== null;
  const flights = eligibleFlights(upcomingFlights);
  const selectedFlight = flights.find((flight) => flight.id === flightId);

  const edit = (transform: (current: CommunicationBatch) => CommunicationBatch) => {
    setWorking((current) => transform(current));
    setDirty(true);
    setError('');
    setNotice('');
  };
  const updateItem = (item: QueueItem) => edit((batch) => ({ ...batch, items: batch.items.map((entry) => entry.id === item.id ? item : entry) }));
  const failureMessage = (action: string, exception: unknown) =>
    `${action} failed. Your changes are still on this screen. ${exception instanceof Error ? exception.message : 'Please try again.'}`;

  async function saveDraft() {
    if (inFlight.current || !canEdit) return;
    inFlight.current = true;
    setPending('save'); setError(''); setNotice('');
    try {
      const saved = await onSaveDraft(cloneBatch(working));
      if (!saved || saved.id !== working.id || saved.executiveId !== executive.id) {
        throw new Error('Host returned a draft for a different batch or executive.');
      }
      setWorking(cloneBatch(saved));
      setDirty(false);
      setNotice('Draft saved and confirmed by the host. Nothing has been scheduled or sent.');
    } catch (exception) {
      setError(failureMessage('Save', exception));
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  function getDeliveryIntent(): DeliveryIntent {
    if (deliveryMode === 'now') return { kind: 'now' };
    if (deliveryMode === 'custom') {
      const validation = validateCustomDateTime(customDateTime, executive.timeZone);
      if (validation) throw new Error(validation);
      return { kind: 'custom', localDateTime: customDateTime, timeZone: executive.timeZone };
    }
    if (!selectedFlight) throw new Error('Choose an available host-supplied upcoming flight, or select custom delivery.');
    // No invented boarding/takeoff trigger. The host must resolve this intent.
    return {
      kind: 'flight', flightId: selectedFlight.id,
      scheduledDepartureAt: selectedFlight.scheduledDepartureAt,
      departureTimeZone: selectedFlight.departureTimeZone,
      trigger: 'not_yet_defined',
    };
  }

  async function schedule() {
    if (inFlight.current || !canEdit) return;
    const validation = scheduleValidationError(working);
    if (validation) { setError(validation); setNotice(''); return; }
    let intent: DeliveryIntent;
    try { intent = getDeliveryIntent(); }
    catch (exception) {
      setError(exception instanceof Error ? exception.message : 'Delivery selection is invalid.');
      setNotice(''); return;
    }
    inFlight.current = true;
    setPending('schedule'); setError(''); setNotice('');
    try {
      let canonical = cloneBatch(working);
      if (dirty) {
        const saved = await onSaveDraft(canonical);
        if (!saved || saved.id !== canonical.id || saved.executiveId !== executive.id) {
          throw new Error('Host returned an unexpected saved batch.');
        }
        canonical = cloneBatch(saved);
        setWorking(canonical);
        setDirty(false);
      }
      const scheduled = await onSchedule(canonical.id, intent);
      if (!scheduled || scheduled.id !== canonical.id || scheduled.executiveId !== executive.id) {
        throw new Error('Host returned an unexpected scheduling result.');
      }
      setWorking(cloneBatch(scheduled));
      setDirty(false);
      setNotice(`Host confirmed batch status: ${scheduled.status}. ${scheduled.status === 'delivered' ? 'Delivery was reported by the host.' : 'This interface does not assert that a notification was delivered.'}`);
    } catch (exception) {
      setError(failureMessage('Schedule request', exception));
    } finally {
      inFlight.current = false;
      setPending(null);
    }
  }

  if (working.executiveId !== executive.id) {
    return <section className="cq-root cq-composer" data-testid="cq-ea-composer"><div className="cq-alert cq-alert-error" role="alert">The host supplied a draft for a different executive. No draft content is shown. Ask the host to supply a matching batch.</div></section>;
  }

  return (
    <div className="cq-root cq-composer" data-testid="cq-ea-composer">
      <header className="cq-page-header">
        <div>
          <p className="cq-eyebrow">Anya · Executive communication</p>
          <h1>Prepare a quieter moment</h1>
          <p className="cq-lede">Collect nonurgent questions and useful information. Choose when to send the batch after it is ready.</p>
        </div>
        <div className="cq-header-context">
          <span className="cq-header-label">For executive</span>
          <strong>{executive.displayName}</strong>
          <span>{executive.timeZone}</span>
        </div>
      </header>

      <div className="cq-toolbar">
        <div className="cq-pill" data-testid="cq-batch-status">Host status: {working.status}</div>
        {dirty && <span className="cq-unsaved" data-testid="cq-unsaved">Unsaved changes</span>}
        <span className="cq-muted">{working.items.length} item{working.items.length === 1 ? '' : 's'}</span>
      </div>
      {working.executiveId !== executive.id && <div className="cq-alert cq-alert-error" role="alert">The draft belongs to a different executive. Do not edit or submit until the host supplies the matching draft.</div>}
      {!canEdit && <div className="cq-alert cq-alert-info">This batch has status “{working.status}” from the host. Editing and rescheduling are disabled here.</div>}
      {error && <div className="cq-alert cq-alert-error" role="alert" data-testid="cq-composer-error">{error}</div>}
      {notice && <div className="cq-alert cq-alert-success" role="status" data-testid="cq-composer-notice">{notice}</div>}

      <fieldset className="cq-fieldset" disabled={busy || !canEdit || working.executiveId !== executive.id}>
        <section className="cq-panel cq-draft-panel" aria-labelledby="cq-draft-title">
          <div className="cq-panel-heading">
            <div><p className="cq-eyebrow">01 · Prepare</p><h2 id="cq-draft-title">Draft your communication</h2></div>
          </div>
          <label className="cq-field">
            <span>Batch name</span>
            <input value={working.title} onChange={(event) => edit((current) => ({ ...current, title: event.target.value }))} placeholder="Afternoon check-in" data-testid="cq-batch-title" />
          </label>
          <div className="cq-draft-stack">
            {working.items.length === 0 && <div className="cq-empty">No draft items yet. Add a question or information item below.</div>}
            {working.items.map((item, index) => (
              <QueueItemEditor
                key={item.id} item={item} position={index} count={working.items.length}
                disabled={busy || !canEdit} onChange={updateItem}
                onMove={(direction) => edit((batch) => ({ ...batch, items: moveAt(batch.items, index, index + direction) }))}
                onRemove={() => edit((batch) => ({ ...batch, items: batch.items.filter((entry) => entry.id !== item.id) }))}
              />
            ))}
          </div>
          <div className="cq-add-row">
            <button type="button" className="cq-btn cq-btn-secondary" onClick={() => edit((batch) => ({ ...batch, items: [...batch.items, newItem('question')] }))} data-testid="cq-add-question">Add question</button>
            <button type="button" className="cq-btn cq-btn-secondary" onClick={() => edit((batch) => ({ ...batch, items: [...batch.items, newItem('information')] }))} data-testid="cq-add-information">Add information</button>
          </div>
        </section>

        <section className="cq-panel" aria-labelledby="cq-delivery-title">
          <div className="cq-panel-heading">
            <div><p className="cq-eyebrow">02 · Deliver</p><h2 id="cq-delivery-title">Choose a delivery moment</h2></div>
          </div>
          <p className="cq-muted">No delivery is requested until you select <strong>Schedule delivery</strong>. All scheduling is performed by the host.</p>
          <div role="radiogroup" aria-label="Delivery method" className="cq-delivery-modes">
            {([['now', 'Send now'], ['custom', 'Custom date and time'], ['flight', 'An upcoming flight']] as const).map(([mode, label]) => (
              <label className={`cq-delivery-option ${deliveryMode === mode ? 'cq-delivery-option-active' : ''}`} key={mode}>
                <input type="radio" name="cq-delivery-mode" checked={deliveryMode === mode} onChange={() => { setDeliveryMode(mode); setError(''); setNotice(''); }} data-testid={`cq-delivery-${mode}`} />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {deliveryMode === 'custom' && (
            <div className="cq-delivery-details" data-testid="cq-custom-details">
              <label className="cq-field">
                <span>Delivery date and time</span>
                <input type="datetime-local" value={customDateTime} onChange={(event) => setCustomDateTime(event.target.value)} data-testid="cq-custom-datetime" />
              </label>
              <p className="cq-timezone-note">Time zone: <strong>{executive.timeZone}</strong>. This is the executive's supplied time zone, not your browser's.</p>
              {!isValidZone(executive.timeZone) && <p className="cq-alert cq-alert-error" role="alert">Invalid executive time zone. Ask the host to supply an IANA time zone.</p>}
            </div>
          )}
          {deliveryMode === 'flight' && (
            <div className="cq-delivery-details" data-testid="cq-flight-details">
              {flights.length ? (
                <>
                  <label className="cq-field"><span>Choose one supplied upcoming flight</span>
                    <select value={selectedFlight ? flightId : ''} onChange={(event) => setFlightId(event.target.value)} data-testid="cq-flight-select">
                      <option value="">Select a flight</option>
                      {flights.map((flight) => <option key={flight.id} value={flight.id}>{flightDisplay(flight)}</option>)}
                    </select>
                  </label>
                  <p className="cq-note">This records an association with a specific flight. Boarding/takeoff/departure timing has <strong>not</strong> been chosen. The host must resolve the trigger and revalidate the flight before actual delivery.</p>
                </>
              ) : (
                <div className="cq-alert cq-alert-info" data-testid="cq-no-flights">No valid upcoming flights were supplied. Select a custom date/time or Send now; no flight information is fetched here.</div>
              )}
            </div>
          )}
        </section>
      </fieldset>

      <div className="cq-footer-actions">
        <button type="button" className="cq-btn cq-btn-secondary" onClick={() => void saveDraft()} disabled={busy || !canEdit || working.executiveId !== executive.id} data-testid="cq-save-draft">{pending === 'save' ? 'Saving…' : 'Save draft'}</button>
        <button type="button" className="cq-btn cq-btn-primary" onClick={() => void schedule()} disabled={busy || !canEdit || working.executiveId !== executive.id} data-testid="cq-schedule">{pending === 'schedule' ? 'Requesting schedule…' : 'Schedule delivery'}</button>
      </div>
      <EAResponseSummary batch={working} responses={existingResponses} />
    </div>
  );
}
