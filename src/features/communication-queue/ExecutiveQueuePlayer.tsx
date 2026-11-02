import * as React from 'react';
import type { ExecutiveQueuePlayerProps, ItemResponse, QueueItem, SavedItemResponse } from './types';
import { describeResponse, latestResponses, validSavedResponse } from './queue-utils';
import './communication-queue.css';

const unansweredIndex = (items: readonly QueueItem[], responses: ReadonlyMap<string, SavedItemResponse>, start = 0): number => {
  for (let index = start; index < items.length; index += 1) {
    if (!responses.has(items[index].id)) return index;
  }
  for (let index = 0; index < start; index += 1) {
    if (!responses.has(items[index].id)) return index;
  }
  return -1;
};

/** One-question-at-a-time presentation. Never shows an executive inbox/list. */
export function ExecutiveQueuePlayer({
  executive, batch, authorizedContacts, existingResponses, onRespond, onClose,
}: ExecutiveQueuePlayerProps) {
  const [recorded, setRecorded] = React.useState<SavedItemResponse[]>(() => [...existingResponses]);
  const [currentIndex, setCurrentIndex] = React.useState(() =>
    unansweredIndex(batch.items, latestResponses(existingResponses.filter((response) => response.batchId === batch.id))),
  );
  const [choiceId, setChoiceId] = React.useState('');
  const [contactId, setContactId] = React.useState('');
  const [showDelegation, setShowDelegation] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState('');
  const [notice, setNotice] = React.useState('');
  const pendingRef = React.useRef(false);

  React.useEffect(() => {
    setRecorded([...existingResponses]);
    setCurrentIndex(unansweredIndex(batch.items, latestResponses(existingResponses.filter((response) => response.batchId === batch.id))));
    setChoiceId(''); setContactId(''); setShowDelegation(false); setError(''); setNotice('');
  }, [batch.id]);

  // Retain confirmed local responses when the host supplies a refreshed response collection.
  React.useEffect(() => {
    setRecorded((previous) => {
      const ids = new Set(existingResponses.map((response) => response.id));
      return [...existingResponses, ...previous.filter((response) => !ids.has(response.id))];
    });
  }, [existingResponses]);

  React.useEffect(() => {
    // If the host records the active item outside this component, do not trap the user
    // on an already-recorded item. Never overwrite a pending local submission.
    if (pendingRef.current) return;
    const confirmed = latestResponses(recorded.filter((response) => response.batchId === batch.id));
    setCurrentIndex((index) => index >= 0 && index < batch.items.length && confirmed.has(batch.items[index].id)
      ? unansweredIndex(batch.items, confirmed, index + 1)
      : index);
  }, [recorded, batch.id, batch.items]);

  const byItem = latestResponses(recorded.filter((response) => response.batchId === batch.id));
  const complete = currentIndex < 0 || currentIndex >= batch.items.length;
  const item = complete ? null : batch.items[currentIndex];
  const currentResponse = item ? byItem.get(item.id) : undefined;
  const answeredCount = batch.items.filter((entry) => byItem.has(entry.id)).length;
  const recommendation = item?.recommendedChoiceId ? item.choices.find((choice) => choice.id === item.recommendedChoiceId) : undefined;

  function clearSelection() {
    setChoiceId(''); setContactId(''); setShowDelegation(false); setError('');
  }

  async function send(action: ItemResponse['action']) {
    if (!item || pendingRef.current || currentResponse) return;
    if (action.kind === 'answer' && !item.choices.some((entry) => entry.id === action.choiceId)) {
      setError('Select one of the available answers.'); return;
    }
    if (action.kind === 'delegate' && !authorizedContacts.some((entry) => entry.id === action.contactId)) {
      setError('Select a contact supplied by your organization.'); return;
    }
    const request: ItemResponse = { batchId: batch.id, itemId: item.id, action };
    pendingRef.current = true;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await onRespond(request);
      if (!validSavedResponse(result, batch.id, item.id)) {
        throw new Error('The host did not return a valid saved response for this item.');
      }
      const next = [...recorded.filter((entry) => entry.id !== result.id), result];
      setRecorded(next);
      const nextByItem = latestResponses(next.filter((entry) => entry.batchId === batch.id));
      setNotice(`Host recorded: ${describeResponse(result, item, authorizedContacts)}.`);
      setCurrentIndex(unansweredIndex(batch.items, nextByItem, currentIndex + 1));
      clearSelection();
    } catch (exception) {
      setError(`Could not record your response. You are still on this item and can retry. ${exception instanceof Error ? exception.message : 'Please try again.'}`);
    } finally {
      pendingRef.current = false;
      setBusy(false);
    }
  }

  if (batch.executiveId !== executive.id) {
    return <main className="cq-root cq-player" data-testid="cq-executive-player"><div className="cq-player-shell"><div className="cq-alert cq-alert-error" role="alert">The host supplied a batch for a different executive. No queue content is shown. Ask the host to correct the selection.</div></div></main>;
  }

  if (complete) {
    return (
      <main className="cq-root cq-player cq-player-complete" data-testid="cq-executive-player">
        <div className="cq-player-shell">
          <header className="cq-player-topline"><span>Anya · Executive communication</span><span>Response session</span></header>
          <section className="cq-complete-content" data-testid="cq-session-done">
            <p className="cq-eyebrow">Session finished</p>
            <h1>{batch.items.length ? 'All items have a recorded response' : 'No items in this batch'}</h1>
            <p>{batch.items.length ? `${answeredCount} of ${batch.items.length} items have a response confirmed through the host. Requests for a call, later discussion, or delegation may still require follow-up.` : 'The host supplied an empty batch.'}</p>
            <div className="cq-completion-facts">
              <span>Host batch status</span><strong>{batch.status}</strong>
            </div>
            <p className="cq-muted">Closing this screen does not mark the batch completed, schedule an appointment, or place a call.</p>
            {notice && <div className="cq-alert cq-alert-success" role="status">{notice}</div>}
            {onClose && <button className="cq-btn cq-btn-primary" type="button" onClick={onClose} data-testid="cq-executive-close">Close session</button>}
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="cq-root cq-player" data-testid="cq-executive-player">
      <div className="cq-player-shell">
        <header className="cq-player-topline">
          <span className="cq-player-brand">Anya <span className="cq-player-brand-dot">·</span> Executive communication</span>
          <div className="cq-player-identity"><span>{executive.displayName}</span>{onClose && <button className="cq-btn cq-btn-quiet cq-btn-small" type="button" onClick={onClose} disabled={busy} aria-label="Close the response session without marking it complete">Close</button>}</div>
        </header>
        <div className="cq-progress-block" aria-label={`Item ${currentIndex + 1} of ${batch.items.length}`}>
          <div className="cq-progress-label"><span>{batch.title || 'Communication'} </span><span>Item {currentIndex + 1} of {batch.items.length}</span></div>
          <div className="cq-progress-track" role="progressbar" aria-label="Recorded response progress" aria-valuemin={0} aria-valuemax={batch.items.length} aria-valuenow={answeredCount}><div style={{ width: `${batch.items.length ? 100 * answeredCount / batch.items.length : 0}%` }} /></div>
        </div>

        <section className="cq-player-card" aria-labelledby="cq-active-item-title" data-testid="cq-active-item">
          <p className="cq-eyebrow">{item?.kind === 'information' ? 'For your information' : 'A decision for you'}</p>
          <h1 id="cq-active-item-title" data-testid="cq-active-item-title">{item?.title}</h1>
          {item?.context && <p className="cq-player-context">{item.context}</p>}
          {item?.kind === 'question' && item.choices.length > 0 && (
            <fieldset className="cq-answer-fieldset" disabled={busy || Boolean(currentResponse)}>
              <legend>Select one answer</legend>
              <div className="cq-answer-options">
                {item.choices.map((choice, index) => (
                  <label key={choice.id} className={`cq-answer-option ${choiceId === choice.id ? 'cq-answer-option-selected' : ''}`}>
                    <input type="radio" name={`cq-choice-${item.id}`} value={choice.id} checked={choiceId === choice.id} onChange={() => { setChoiceId(choice.id); setError(''); }} data-testid={`cq-answer-option-${index + 1}`} />
                    <span className="cq-answer-option-label">{choice.label}</span>
                    {choice.id === recommendation?.id && <span className="cq-recommended-tag">EA recommends</span>}
                  </label>
                ))}
              </div>
              {item.recommendationNote && <div className="cq-recommendation-note"><strong>EA's note</strong><p>{item.recommendationNote}</p></div>}
              <button className="cq-btn cq-btn-primary cq-answer-submit" type="button" onClick={() => void send({ kind: 'answer', choiceId })} disabled={!choiceId || busy} data-testid="cq-submit-answer">{busy ? 'Recording…' : 'Submit answer'}</button>
            </fieldset>
          )}
          {item?.kind === 'question' && item.choices.length === 0 && (
            <div data-testid="cq-no-predefined-answers">
              {item.recommendationNote && <div className="cq-recommendation-note"><strong>EA's note</strong><p>{item.recommendationNote}</p></div>}
              <p className="cq-note">No predefined answer choices. You can request a call, later discussion, or delegation. Free-text responses are an unresolved product decision.</p>
            </div>
          )}
          {item?.kind === 'information' && (
            <div className="cq-information-action">
              <p className="cq-muted">Information only — no decision requested.</p>
              <button className="cq-btn cq-btn-primary" type="button" onClick={() => void send({ kind: 'acknowledge' })} disabled={busy} data-testid="cq-acknowledge">{busy ? 'Recording…' : 'Acknowledge and continue'}</button>
              <p className="cq-provisional">Provisional behavior: acknowledgement is not yet an approved requirement.</p>
            </div>
          )}
        </section>

        <section className="cq-alternate-actions" aria-labelledby="cq-alternate-heading">
          <h2 id="cq-alternate-heading">Need a different way to respond?</h2>
          <p>These actions record a request for follow-up; they do not call anyone or book a meeting.</p>
          <div className="cq-alternate-grid">
            <button type="button" className="cq-btn cq-btn-secondary" onClick={() => void send({ kind: 'call_asap' })} disabled={busy} data-testid="cq-call-asap">Please call ASAP</button>
            <button type="button" className="cq-btn cq-btn-secondary" onClick={() => void send({ kind: 'discuss_later' })} disabled={busy} data-testid="cq-discuss-later">Let's discuss another time</button>
            <button type="button" className="cq-btn cq-btn-secondary" onClick={() => { setShowDelegation((current) => !current); setError(''); }} disabled={busy || authorizedContacts.length === 0} data-testid="cq-delegate-toggle">Delegate to a contact</button>
          </div>
          {authorizedContacts.length === 0 && <p className="cq-note" data-testid="cq-no-contacts">No authorized contacts were supplied. Delegation is unavailable.</p>}
          {showDelegation && authorizedContacts.length > 0 && (
            <div className="cq-delegation-panel" data-testid="cq-delegation-panel">
              <label className="cq-field">
                <span>Choose an authorized contact</span>
                <select value={contactId} onChange={(event) => setContactId(event.target.value)} disabled={busy} data-testid="cq-contact-select">
                  <option value="">Select a contact</option>
                  {authorizedContacts.map((contact) => <option key={contact.id} value={contact.id}>{contact.displayName}{contact.relationshipLabel ? ` · ${contact.relationshipLabel}` : ''}</option>)}
                </select>
              </label>
              <button type="button" className="cq-btn cq-btn-primary" onClick={() => void send({ kind: 'delegate', contactId })} disabled={!contactId || busy} data-testid="cq-submit-delegation">{busy ? 'Recording…' : 'Request delegation'}</button>
            </div>
          )}
        </section>
        {error && <div className="cq-alert cq-alert-error cq-player-alert" role="alert" data-testid="cq-player-error">{error}</div>}
        <footer className="cq-player-footer"><span>One item at a time</span><span>{answeredCount} recorded · {batch.items.length - answeredCount} remaining</span></footer>
      </div>
    </main>
  );
}
