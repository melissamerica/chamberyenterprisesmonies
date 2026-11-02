import * as React from 'react';
import type { AuthorizedContact, CommunicationBatch, SavedItemResponse } from './types';
import { describeResponse, latestResponses } from './queue-utils';

interface EAResponseSummaryProps {
  batch: CommunicationBatch;
  responses: SavedItemResponse[];
  contacts?: AuthorizedContact[];
}

/** Read-only confirmation view. No implication that a call, delegation, or meeting happened. */
export function EAResponseSummary({ batch, responses, contacts = [] }: EAResponseSummaryProps) {
  const byItem = latestResponses(responses.filter((response) => response.batchId === batch.id));
  return (
    <section className="cq-panel cq-response-summary" aria-labelledby="cq-response-summary-title" data-testid="cq-ea-response-summary">
      <div className="cq-panel-heading">
        <div>
          <p className="cq-eyebrow">Recorded executive responses</p>
          <h2 id="cq-response-summary-title">Response status</h2>
        </div>
        <div className="cq-pill">{byItem.size} of {batch.items.length} recorded</div>
      </div>
      <p className="cq-muted">A recorded request is not necessarily a resolved item. These statuses come from supplied host response records.</p>
      {batch.items.length === 0 ? <p className="cq-muted">No items to track.</p> : (
        <ul className="cq-status-list">
          {batch.items.map((item, index) => {
            const response = byItem.get(item.id);
            return (
              <li key={item.id} className="cq-status-row" data-testid={`cq-response-status-${index + 1}`}>
                <div>
                  <strong>{index + 1}. {item.title.trim() || 'Untitled draft item'}</strong>
                  <span>{response ? describeResponse(response, item, contacts) : 'No executive response recorded'}</span>
                </div>
                <span className={`cq-status-tag ${response ? 'cq-status-tag-recorded' : ''}`}>{response ? 'Recorded' : 'Pending'}</span>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
