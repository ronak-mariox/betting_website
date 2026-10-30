import { useState } from 'react';
import type { FormEvent } from 'react';
import { CheckCircleIcon, CloseIcon, PlusIcon } from '../../components/icons';
import { Button } from '../../components/ui/Button/Button';
import { Modal } from '../../components/ui/Modal/Modal';
import { SelectField } from '../../components/ui/TextField/SelectField';
import { TextField } from '../../components/ui/TextField/TextField';
import { ApiRequestError } from '../../lib/api';
import type { ApiEvent } from '../../lib/api/events';
import type { ApiMarket, CreateMarketPayload, UpdateMarketPayload } from '../../lib/api/markets';
import { MARKET_STATUSES, MARKET_TYPES } from './marketsData';
import styles from './MarketFormModal.module.css';

export type MarketFormModalProps = {
  /** The market being edited, or null for a new market. */
  market: ApiMarket | null;
  /** Events available to attach a new market to. */
  events: ApiEvent[];
  onClose: () => void;
  onCreate: (payload: CreateMarketPayload) => Promise<void>;
  onUpdate: (id: string, payload: UpdateMarketPayload) => Promise<void>;
};

function eventIdOf(market: ApiMarket): string {
  return typeof market.event === 'string' ? market.event : market.event._id;
}

/** "Arsenal vs Chelsea" -> its two sides, the usual selections of a new market. */
function sidesOf(eventName = ''): [string, string] {
  const [home, away] = eventName.split(/\s+vs\.?\s+/i);
  return [home || 'Home', away || 'Away'];
}

type RunnerDraft = { name: string; odds: string };

function eventLabel(event: ApiEvent): string {
  return `${event.name} · ${event.sport}`;
}

/**
 * One dialog for both market form states — Add Market (node 119:49597) and
 * Edit Market (node 119:48795). Only the title, the event field and the
 * submit label differ, so the mode is a prop rather than a second component.
 */
export function MarketFormModal({ market, events, onClose, onCreate, onUpdate }: MarketFormModalProps) {
  const isEdit = market !== null;
  const labelByEventId = new Map(events.map((event) => [event._id, eventLabel(event)]));
  const eventIdByLabel = new Map(events.map((event) => [eventLabel(event), event._id]));

  const [form, setForm] = useState({
    event: market ? eventIdOf(market) : (events[0]?._id ?? ''),
    code: market?.code ?? '',
    name: market?.name ?? '',
    type: market?.type ?? MARKET_TYPES[0],
    status: market?.status ?? 'Active',
    maxBet: market ? String(market.maxBet) : '100000',
    maxExposure: market ? String(market.maxExposure) : '500000',
  });
  const eventName = (id: string) => events.find((event) => event._id === id)?.name;
  /** What players can back. An older market without selections starts from its event's two sides. */
  const [runners, setRunners] = useState<RunnerDraft[]>(() => {
    if (market?.runners?.length) return market.runners.map((r) => ({ name: r.name, odds: String(r.odds) }));
    const name = market && typeof market.event !== 'string' ? market.event.name : eventName(events[0]?._id ?? '');
    const [home, away] = sidesOf(name);
    return [
      { name: home, odds: market ? String(market.backOdds || 1.9) : '1.90' },
      { name: away, odds: market ? String(market.layOdds || 1.9) : '1.90' },
    ];
  });
  const setRunner = (index: number, patch: Partial<RunnerDraft>) =>
    setRunners((current) => current.map((runner, i) => (i === index ? { ...runner, ...patch } : runner)));
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (key: keyof typeof form) => (value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isEdit && !form.event) {
      setError('Choose an event for this market.');
      return;
    }
    if (!form.code.trim() || !form.name.trim()) {
      setError('Market code and name are required.');
      return;
    }
    const maxBet = Number(form.maxBet);
    const maxExposure = Number(form.maxExposure);
    if ([maxBet, maxExposure].some((value) => Number.isNaN(value))) {
      setError('Limits must be numbers.');
      return;
    }
    const selections = runners.map((runner) => ({ name: runner.name.trim(), odds: Number(runner.odds) }));
    if (selections.some((runner) => !runner.name)) {
      setError('Every selection needs a name.');
      return;
    }
    if (selections.some((runner) => !Number.isFinite(runner.odds) || runner.odds < 1.01)) {
      setError('Odds must be 1.01 or higher.');
      return;
    }

    setPending(true);
    setError(null);
    try {
      if (isEdit && market) {
        await onUpdate(market._id, {
          code: form.code.trim(),
          name: form.name.trim(),
          type: form.type,
          status: form.status as ApiMarket['status'],
          runners: selections,
          maxBet,
          maxExposure,
        });
      } else {
        await onCreate({
          event: form.event,
          code: form.code.trim(),
          name: form.name.trim(),
          type: form.type,
          status: form.status as ApiMarket['status'],
          runners: selections,
          maxBet,
          maxExposure,
        });
      }
    } catch (err) {
      setError(err instanceof ApiRequestError ? err.message : 'Unable to reach the server. Please try again.');
    } finally {
      setPending(false);
    }
  };

  return (
    <Modal title={isEdit ? 'Edit Market' : 'Add Market'} width={480} onClose={onClose}>
      <form onSubmit={handleSubmit}>
        <div className={styles.grid}>
          {!isEdit ? (
            <SelectField
              label="Event"
              options={events.map(eventLabel)}
              placeholder={events.length === 0 ? 'No events available' : null}
              value={labelByEventId.get(form.event) ?? ''}
              onChange={(evt) => {
                const id = eventIdByLabel.get(evt.target.value);
                if (!id) return;
                set('event')(id);
                // A different event means different sides; typed odds are kept.
                const sides = sidesOf(eventName(id));
                setRunners((current) => current.map((runner, i) => (i < 2 ? { ...runner, name: sides[i] } : runner)));
              }}
            />
          ) : null}
          <TextField
            label="Market Code"
            labelCase="caps"
            placeholder="e.g. MKT001"
            value={form.code}
            onChange={(evt) => set('code')(evt.target.value)}
          />
          <TextField
            fieldClassName={styles.wide}
            label="Market Name"
            labelCase="caps"
            placeholder="e.g. Match Winner"
            value={form.name}
            onChange={(evt) => set('name')(evt.target.value)}
          />
          <SelectField
            label="Market Type"
            options={MARKET_TYPES}
            placeholder={null}
            value={form.type}
            onChange={(evt) => set('type')(evt.target.value)}
          />
          <SelectField
            label="Status"
            options={MARKET_STATUSES}
            placeholder={null}
            value={form.status}
            onChange={(evt) => set('status')(evt.target.value)}
          />
          <TextField
            label="Max Bet"
            labelCase="caps"
            inputMode="numeric"
            value={form.maxBet}
            onChange={(evt) => set('maxBet')(evt.target.value)}
          />
          <TextField
            label="Max Exposure"
            labelCase="caps"
            inputMode="numeric"
            value={form.maxExposure}
            onChange={(evt) => set('maxExposure')(evt.target.value)}
          />
        </div>

        <fieldset className={styles.selections}>
          <legend className={styles.selectionsTitle}>Selections &amp; odds — what users can bet on</legend>
          {runners.map((runner, index) => (
            <div key={index} className={styles.selection}>
              <input
                className={styles.selectionName}
                aria-label={`Selection ${index + 1} name`}
                placeholder="e.g. Mumbai Indians"
                value={runner.name}
                onChange={(evt) => setRunner(index, { name: evt.target.value })}
              />
              <input
                className={styles.selectionOdds}
                aria-label={`Selection ${index + 1} odds`}
                inputMode="decimal"
                placeholder="1.90"
                value={runner.odds}
                onChange={(evt) => setRunner(index, { odds: evt.target.value })}
              />
              <button
                type="button"
                className={styles.selectionRemove}
                aria-label={`Remove selection ${index + 1}`}
                disabled={runners.length <= 2}
                onClick={() => setRunners((current) => current.filter((_, i) => i !== index))}
              >
                <CloseIcon size={12} />
              </button>
            </div>
          ))}
          <button
            type="button"
            className={styles.selectionAdd}
            onClick={() => setRunners((current) => [...current, { name: current.length === 2 ? 'Draw' : '', odds: '3.00' }])}
          >
            <PlusIcon size={12} /> Add selection
          </button>
        </fieldset>

        {error ? (
          <p role="alert" style={{ color: 'var(--color-danger)', margin: '0 0 8px', fontSize: 12 }}>
            {error}
          </p>
        ) : null}

        <div className={styles.footer}>
          <Button
            className={styles.submit}
            type="submit"
            variant="primary"
            size="sm"
            icon={<CheckCircleIcon size={13.993} />}
            disabled={pending}
          >
            {pending ? 'Saving…' : isEdit ? 'Save Changes' : 'Add Market'}
          </Button>
          <Button className={styles.cancel} variant="outline" size="sm" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}
