import * as React from 'react';
import type { QueueItem } from './types';
import { newChoice } from './queue-utils';

interface QueueItemEditorProps {
  item: QueueItem;
  position: number;
  count: number;
  disabled: boolean;
  onChange: (item: QueueItem) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}

export function QueueItemEditor({ item, position, count, disabled, onChange, onMove, onRemove }: QueueItemEditorProps) {
  const prefix = `cq-item-${item.id}`;
  const update = (patch: Partial<QueueItem>) => onChange({ ...item, ...patch });

  return (
    <article className="cq-editor-card" data-testid={`cq-draft-item-${position + 1}`}>
      <div className="cq-editor-heading">
        <div className="cq-item-ordinal">Item {position + 1} <span>of {count}</span></div>
        <div className="cq-editor-actions">
          <button className="cq-btn cq-btn-quiet cq-btn-small" type="button" onClick={() => onMove(-1)} disabled={disabled || position === 0} aria-label={`Move item ${position + 1} up`} data-testid={`cq-move-up-${position + 1}`}>Move up</button>
          <button className="cq-btn cq-btn-quiet cq-btn-small" type="button" onClick={() => onMove(1)} disabled={disabled || position >= count - 1} aria-label={`Move item ${position + 1} down`} data-testid={`cq-move-down-${position + 1}`}>Move down</button>
          <button className="cq-btn cq-btn-danger cq-btn-small" type="button" onClick={onRemove} disabled={disabled} data-testid={`cq-remove-${position + 1}`}>Remove</button>
        </div>
      </div>

      <div className="cq-fields-two">
        <label className="cq-field">
          <span>Type</span>
          <select value={item.kind} onChange={(event) => update({ kind: event.target.value as QueueItem['kind'] })} disabled={disabled} data-testid={`cq-type-${position + 1}`}>
            <option value="question">Question</option>
            <option value="information">Information only</option>
          </select>
        </label>
        <label className="cq-field cq-flex-grow">
          <span>Question or information heading</span>
          <input value={item.title} placeholder="What does the executive need to know?" onChange={(event) => update({ title: event.target.value })} disabled={disabled} data-testid={`cq-title-${position + 1}`} />
        </label>
      </div>
      <label className="cq-field">
        <span>Context or supporting detail <span className="cq-optional">Optional</span></span>
        <textarea value={item.context || ''} placeholder="Provide only what is needed to make the decision." onChange={(event) => update({ context: event.target.value })} rows={3} disabled={disabled} data-testid={`cq-context-${position + 1}`} />
      </label>

      {item.kind === 'question' ? (
        <section className="cq-choices-editor" aria-labelledby={`${prefix}-choices-title`}>
          <div className="cq-inline-between">
            <div>
              <h3 id={`${prefix}-choices-title`}>Optional answer choices</h3>
              <p className="cq-muted">A recommendation can point to one choice. Leave choices empty when the question has no predefined options.</p>
            </div>
            <button type="button" className="cq-btn cq-btn-secondary cq-btn-small" onClick={() => update({ choices: [...item.choices, newChoice()] })} disabled={disabled} data-testid={`cq-add-choice-${position + 1}`}>Add choice</button>
          </div>
          {item.choices.length > 0 && (
            <div className="cq-choice-editor-list">
              {item.choices.map((choice, choiceIndex) => (
                <div className="cq-choice-editor-row" key={choice.id}>
                  <input type="radio" name={`${prefix}-recommended`} aria-label={`Recommend choice ${choiceIndex + 1}`} checked={item.recommendedChoiceId === choice.id} disabled={disabled} onChange={() => update({ recommendedChoiceId: choice.id })} data-testid={`cq-recommend-${position + 1}-${choiceIndex + 1}`} />
                  <label className="cq-field cq-flex-grow">
                    <span className="cq-sr-only">Choice {choiceIndex + 1}</span>
                    <input value={choice.label} placeholder={`Choice ${choiceIndex + 1}`} onChange={(event) => update({ choices: item.choices.map((candidate) => candidate.id === choice.id ? { ...candidate, label: event.target.value } : candidate) })} disabled={disabled} data-testid={`cq-choice-${position + 1}-${choiceIndex + 1}`} />
                  </label>
                  <button type="button" className="cq-btn cq-btn-quiet cq-btn-small" onClick={() => update({ choices: item.choices.filter((candidate) => candidate.id !== choice.id), recommendedChoiceId: item.recommendedChoiceId === choice.id ? undefined : item.recommendedChoiceId })} disabled={disabled} aria-label={`Remove choice ${choiceIndex + 1}`}>Remove</button>
                </div>
              ))}
            </div>
          )}
          {item.recommendedChoiceId && (
            <button type="button" className="cq-text-link" onClick={() => update({ recommendedChoiceId: undefined })} disabled={disabled}>Clear recommendation</button>
          )}
          <label className="cq-field">
            <span>Recommendation note <span className="cq-optional">Optional</span></span>
            <textarea rows={2} value={item.recommendationNote || ''} onChange={(event) => update({ recommendationNote: event.target.value })} placeholder="Why would you recommend this choice?" disabled={disabled} />
          </label>
          {item.choices.length === 0 && <p className="cq-note">Questions without choices can currently receive call, discussion, or delegation requests. Free-text answers are an open product decision.</p>}
        </section>
      ) : (
        <p className="cq-note">Information-only item. Answer choices are not displayed to the executive. The acknowledgement control is provisional.</p>
      )}
    </article>
  );
}
