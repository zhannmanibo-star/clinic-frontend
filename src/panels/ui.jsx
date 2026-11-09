import React from 'react';
import { calendarLink as buildCalendarLink } from './calendar';

/* ---------- small helpers shared by every panel ---------- */
export const title = (text) => String(text ?? '').replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase());

export const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export const initials = (name = '') => {
  const w = String(name).split(' ').filter((x) => x && !/^dr\.?$/i.test(x));
  if (!w.length) return '?';
  return (w[0][0] + (w.length > 1 ? w[w.length - 1][0] : '')).toUpperCase();
};

export const fmtDate = (iso, opts) => {
  if (!iso) return '—';
  const d = new Date(String(iso).slice(0, 10) + 'T00:00:00');
  if (isNaN(d)) return String(iso);
  return d.toLocaleDateString('en-US', opts || { month: 'short', day: '2-digit', year: 'numeric' });
};

export const fmtTime = (t) => {
  if (!t) return '—';
  const [h, m] = String(t).split(':').map(Number);
  if (Number.isNaN(h)) return String(t);
  return `${((h + 11) % 12) + 1}:${String(m || 0).padStart(2, '0')} ${h >= 12 ? 'PM' : 'AM'}`;
};

export const calendarLink = buildCalendarLink;

const STATUS_CLASS = {
  confirmed: 'cf', pending: 'wt', completed: 'cp', served: 'cp', cancelled: 'cx', skipped: 'cx',
  called: 'sv', waiting: 'wt', issued: 'ci', open: 'cf', closed: 'cp', full: 'cp',
};
export const statusClass = (s) => STATUS_CLASS[String(s ?? '').toLowerCase()] || 'cp';

export function Pill({ status, children }) {
  return <span className={`pill2 ${statusClass(status)}`}>{children || title(status)}</span>;
}

export function Seg({ options, value, onChange }) {
  return (
    <div className="seg" role="tablist">
      {options.map((o) => (
        <button key={o} role="tab" aria-selected={o === value} className={o === value ? 'on' : ''} onClick={() => onChange(o)}>
          {o}
        </button>
      ))}
    </div>
  );
}

export function Stat({ label, value, hint }) {
  return (
    <div className="pc">
      <span className="lbl">{label}</span>
      <div className="big" style={{ fontSize: 38 }}>{value}</div>
      {hint && <small className="hint">{hint}</small>}
    </div>
  );
}

export const Empty = ({ children }) => <p className="live-empty">{children}</p>;

/* numeric values the backend returns for /dashboard become stat cards */
export function dashboardStats(data = {}) {
  return Object.entries(data)
    .filter(([k, v]) => k !== 'role' && v !== null && typeof v !== 'object')
    .map(([k, v]) => ({ label: title(k), value: v }));
}

/* ---------- data table ---------- */
export function Table({ rows = [], columns, actions }) {
  if (!Array.isArray(rows)) {
    return <p className="live-error" role="alert">Unable to display records: unexpected server response. Please refresh.</p>;
  }
  if (!rows.length) return <p className="live-empty">No records found.</p>;
  return (
    <div className="live-table">
      <table>
        <thead>
          <tr>
            {columns.map((k) => <th key={k}>{title(k)}</th>)}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r.ticket_id || i}>
              {columns.map((k) => <td key={k}>{String(r[k] ?? '—')}</td>)}
              {actions && <td><div className="live-actions">{actions(r)}</div></td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- generic form (unchanged behaviour) ---------- */
export function Form({ fields, onSubmit, label = 'Save', busy, initial = {} }) {
  return (
    <form
      className="live-form"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const values = Object.fromEntries(new FormData(form));
        if (await onSubmit(values)) form.reset();
      }}
    >
      <fieldset disabled={busy}>
        {fields.map((f) => (
          <label key={f.name}>
            {f.label || title(f.name)}
            {f.options ? (
              <select name={f.name} defaultValue={initial[f.name] ?? ''} required={f.required !== false}>
                <option value="">Select…</option>
                {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea name={f.name} defaultValue={initial[f.name] || ''} required={f.required !== false} maxLength={f.maxLength || 5000} />
            ) : (
              <input
                name={f.name}
                type={f.type || 'text'}
                defaultValue={initial[f.name] ?? ''}
                required={f.required !== false}
                min={f.min}
                max={f.max}
                minLength={f.type === 'password' ? 8 : undefined}
                maxLength={f.maxLength}
              />
            )}
          </label>
        ))}
        <button className="button" type="submit">{busy ? 'Please wait…' : label}</button>
      </fieldset>
    </form>
  );
}

export const field = (name, type = 'text', required = true) => ({ name, type, required });

export const profileFields = [
  field('name'),
  field('birthdate', 'date', false),
  { name: 'sex', required: false, options: ['Male', 'Female', 'Other'].map((x) => ({ value: x, label: x })) },
  field('address', 'text', false),
  field('contact_no', 'tel', false),
];

export const accountFields = [field('name'), field('email', 'email'), field('password', 'password')];
