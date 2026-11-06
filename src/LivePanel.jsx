import React, { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from './api';
import ClinicMap, { CLINIC_ADDRESS } from './ClinicMap';
import QrScanner from './QrScanner';
import './live.css';

/* -------------------------------------------------------------------------- */
/*  Helpers                                                                   */
/* -------------------------------------------------------------------------- */

const title = (text) => text.replaceAll('_', ' ').replace(/\b\w/g, (x) => x.toUpperCase());

const today = () =>
  new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Manila',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

// Optional: id of the shared "Calapan Clinic" Google Calendar, so staff can view it inside the portal.
const CALENDAR_ID = import.meta.env?.VITE_GOOGLE_CALENDAR_ID || '';

// A "Add to Google Calendar" link for a patient's ticket (works without any key or login on our side).
function calendarLink(t) {
  const mins = (s) => {
    const [h, m] = String(s).split(':').map(Number);
    return h * 60 + m;
  };
  const start = mins(t.estimated_time || t.start_time || '08:00');
  const slot = Math.max(
    10,
    Math.floor((mins(t.end_time) - mins(t.start_time)) / Math.max(1, Number(t.max_slots) || 1))
  );
  const stamp = (m) =>
    t.appointment_date.replaceAll('-', '') +
    'T' +
    String(Math.floor(m / 60) % 24).padStart(2, '0') +
    String(m % 60).padStart(2, '0') +
    '00';
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Clinic visit: ${t.doctor_name} (Queue #${t.queue_number})`,
    dates: `${stamp(start)}/${stamp(start + slot)}`,
    ctz: 'Asia/Manila',
    details: `Calapan City Health Clinic. Queue number ${t.queue_number}. Bring your QR ticket.`,
    location: CLINIC_ADDRESS,
  });
  return 'https://calendar.google.com/calendar/render?' + params.toString();
}

// One readable sentence for the result of a staff action (email reminders, calendar sync, ...)
function describeResult(message, r) {
  if ('sent' in r)
    return `${message} Sent: ${r.sent}; queued: ${r.queued}; failed: ${r.failed}; skipped: ${r.skipped ?? 0}.`;
  if ('schedules' in r)
    return `${message} Added ${r.schedules} schedule event(s) and ${r.appointments} appointment event(s); ${r.still_missing} still missing.`;
  return message || 'Saved.';
}

/* -------------------------------------------------------------------------- */
/*  Table                                                                     */
/* -------------------------------------------------------------------------- */

function Table({ rows = [], columns, actions }) {
  if (!Array.isArray(rows)) {
    return (
      <p className="live-error" role="alert">
        Unable to display records: unexpected server response. Please refresh.
      </p>
    );
  }

  if (!rows.length) {
    return <p className="live-empty">No records found.</p>;
  }

  return (
    <div className="live-table">
      <table>
        <thead>
          <tr>
            {columns.map((k) => (
              <th key={k}>{title(k)}</th>
            ))}
            {actions && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={r.id || r.ticket_id || i}>
              {columns.map((k) => (
                <td key={k}>{String(r[k] ?? '—')}</td>
              ))}
              {actions && (
                <td>
                  <div className="live-actions">{actions(r)}</div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Form                                                                      */
/* -------------------------------------------------------------------------- */

function Form({ fields, onSubmit, label = 'Save', busy, initial = {} }) {
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
              <select
                name={f.name}
                defaultValue={initial[f.name] ?? ''}
                required={f.required !== false}
              >
                <option value="">Select…</option>
                {f.options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            ) : f.type === 'textarea' ? (
              <textarea
                name={f.name}
                defaultValue={initial[f.name] || ''}
                required={f.required !== false}
                maxLength={f.maxLength || 5000}
              />
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
        <button className="button" type="submit">
          {busy ? 'Please wait…' : label}
        </button>
      </fieldset>
    </form>
  );
}

/* -------------------------------------------------------------------------- */
/*  Field definitions                                                         */
/* -------------------------------------------------------------------------- */

const field = (name, type = 'text', required = true) => ({ name, type, required });

const profileFields = [
  field('name'),
  field('birthdate', 'date', false),
  {
    name: 'sex',
    required: false,
    options: ['Male', 'Female', 'Other'].map((x) => ({ value: x, label: x })),
  },
  field('address', 'text', false),
  field('contact_no', 'tel', false),
];

const accountFields = [field('name'), field('email', 'email'), field('password', 'password')];

/* -------------------------------------------------------------------------- */
/*  LivePanel                                                                 */
/* -------------------------------------------------------------------------- */

export default function LivePanel({ user, onLogout }) {
  /* ---- Role flags ---- */
  const patient = user.role === 'patient';
  const admin = user.role === 'admin';
  const staff = ['staff', 'admin'].includes(user.role);

  /* ---- Sidebar tabs (depend on role) ---- */
  const tabs = [
    'Dashboard',
    ...(patient ? ['Book visit'] : []),
    'Appointments',
    ...(!patient ? ['Queue'] : []),
    'Schedules',
    'Records',
    ...(staff ? ['Patients', 'Doctors', 'Email log'] : []),
    ...(admin ? ['Users'] : []),
    ...(!patient && CALENDAR_ID ? ['Calendar'] : []),
    'Clinic map',
    ...(patient ? ['Profile'] : []),
  ];

  /* ---- State ---- */
  const [page, setPage] = useState('Dashboard');
  const [data, setData] = useState(null);
  const [loadedPage, setLoadedPage] = useState(null);
  const [aux, setAux] = useState([]);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [revision, setRevision] = useState(0);
  const [date, setDate] = useState(today());
  const [patientId, setPatientId] = useState('');
  const [ticket, setTicket] = useState(null);
  const [editor, setEditor] = useState(null);
  const [scanning, setScanning] = useState(false);

  /* ---- Data loading (per page) ---- */
  useEffect(() => {
    let active = true;

    setLoading(true);
    setData(null);
    setError('');
    setEditor(null);
    setTicket(null);

    async function load() {
      let result;
      let extra = [];

      if (page === 'Dashboard') {
        result = await api('/dashboard');
      } else if (page === 'Book visit' || page === 'Schedules') {
        result = await api('/schedules');
        if (staff) extra = (await api('/doctors')).doctors;
      } else if (page === 'Appointments') {
        result = await api('/appointments');
      } else if (page === 'Queue') {
        result = await api('/queue?date=' + date);
        extra = (await api('/schedules?date=' + date)).schedules;
      } else if (page === 'Email log') {
        result = await api('/emails');
        extra = (await api('/doctors')).doctors;
      } else if (page === 'Clinic map' || page === 'Calendar') {
        result = {};
      } else if (page === 'Profile') {
        result = await api('/auth/me');
      } else if (page === 'Records') {
        if (!patient) extra = (await api('/patients')).patients;
        result =
          patient || patientId
            ? await api('/records' + (patient ? '' : '?patient_id=' + patientId))
            : { records: [] };
      } else {
        result = await api('/' + ({ 'Email log': 'emails' }[page] || page.toLowerCase()));
      }

      if (active) {
        setData(result);
        setAux(Array.isArray(extra) ? extra : []);
        setLoadedPage(page);
      }
    }

    load()
      .catch((e) => active && setError(e.message))
      .finally(() => active && setLoading(false));

    return () => {
      active = false;
    };
  }, [page, revision, date, patientId, patient, staff]);

  /* ---- Mutations ---- */
  async function mutate(path, method, body) {
    if (busy) return false;

    setBusy(true);
    setError('');
    setNotice('');

    try {
      const out = await api(path, { method, body });
      setNotice(out.result ? describeResult(out.message, out.result) : out.message || 'Saved.');
      setRevision((x) => x + 1);
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  const action = (label, path, method, body, confirm = false) => (
    <button
      disabled={busy}
      onClick={() => {
        if (!confirm || window.confirm(`${label}?`)) mutate(path, method, body);
      }}
    >
      {label}
    </button>
  );

  const scheduleOptions = aux
    .filter((s) => user.role !== 'doctor' || String(s.doctor_id) === String(user.doctor_id))
    .map((s) => ({
      value: s.id,
      label: `${s.doctor_name} · ${s.date} · ${s.start_time}`,
    }));

  /* ---- Render ---- */
  return (
    <div className="live-shell">
      {/* ============================ SIDEBAR ============================ */}
      <aside className="live-sidebar">
        <a href="#home" className="live-brand">
          Calapan City
          <br />
          Health Clinic
        </a>
        <p>{title(user.role)} portal</p>

        <nav aria-label="Clinic workspace">
          {tabs.map((t) => (
            <button
              key={t}
              className={page === t ? 'active' : ''}
              onClick={() => {
                setPage(t);
                setNotice('');
              }}
            >
              {t}
            </button>
          ))}
        </nav>

        <button onClick={onLogout}>Sign out</button>
      </aside>

      {/* ============================== MAIN ============================== */}
      <main className="live-main">
        <header className="live-header">
          <div>
            <small>Welcome, {user.name}</small>
            <h1>{page}</h1>
          </div>
          <button disabled={loading || busy} onClick={() => setRevision((x) => x + 1)}>
            Refresh
          </button>
        </header>

        {notice && (
          <p className="live-notice" role="status">
            {notice}
          </p>
        )}
        {error && (
          <p className="live-error" role="alert">
            {error}
          </p>
        )}

        {page === 'Queue' && (
          <label className="live-filter">
            Clinic date{' '}
            <input
              type="date"
              value={date}
              onChange={(e) => e.target.value && setDate(e.target.value)}
            />
          </label>
        )}

        {loading || (data && loadedPage !== page) ? (
          <p role="status">Loading clinic data…</p>
        ) : (
          data &&
          loadedPage === page && (
            <>
              {/* ------------------------ DASHBOARD ------------------------ */}
              {page === 'Dashboard' && (
                <>
                  <div className="live-metrics">
                    {Object.entries(data)
                      .filter(([k, v]) => k !== 'role' && typeof v !== 'object')
                      .map(([k, v]) => (
                        <section key={k}>
                          <small>{title(k)}</small>
                          <strong>{v}</strong>
                        </section>
                      ))}
                  </div>

                  {data.next_appointment && (
                    <section className="live-card">
                      <h2>Next appointment</h2>
                      <p>
                        {data.next_appointment.doctor_name} ·{' '}
                        {data.next_appointment.appointment_date} ·{' '}
                        {data.next_appointment.estimated_time}
                      </p>
                      <button onClick={() => setPage('Appointments')}>
                        View appointment and QR ticket
                      </button>
                    </section>
                  )}

                  <p>
                    Use the menu to manage your clinic visits. Refresh to see the latest
                    updates.
                  </p>
                </>
              )}

              {/* ---------------- BOOK VISIT / SCHEDULES ---------------- */}
              {(page === 'Book visit' || page === 'Schedules') && (
                <>
                  <Table
                    rows={data.schedules}
                    columns={['doctor_name', 'date', 'start_time', 'end_time', 'slots_left', 'status']}
                    actions={(r) =>
                      patient ? (
                        <button
                          disabled={busy || r.status !== 'open' || Number(r.slots_left) < 1}
                          onClick={() => setEditor({ kind: 'booking', row: r })}
                        >
                          Book visit
                        </button>
                      ) : staff ? (
                        action(
                          r.status === 'closed' ? 'Open' : 'Close',
                          `/schedules/${r.id}`,
                          'PUT',
                          { status: r.status === 'closed' ? 'open' : 'closed' }
                        )
                      ) : null
                    }
                  />

                  {staff && (
                    <section className="live-card">
                      <h2>Add schedule</h2>
                      <Form
                        busy={busy}
                        fields={[
                          {
                            name: 'doctor_id',
                            options: aux.map((d) => ({ value: d.id, label: d.name })),
                          },
                          field('date', 'date'),
                          field('start_time', 'time'),
                          field('end_time', 'time'),
                          { name: 'max_slots', type: 'number', min: 1, max: 200 },
                        ]}
                        onSubmit={(v) => mutate('/schedules', 'POST', v)}
                      />
                    </section>
                  )}

                  {staff && page === 'Schedules' && (
                    <section className="live-card">
                      <h2>Google Calendar</h2>
                      <p>
                        New and changed schedules and bookings are added to the shared clinic
                        calendar automatically. Press the button once to add anything that is
                        still missing (for example, bookings made before Google Calendar was set
                        up).
                      </p>
                      <button disabled={busy} onClick={() => mutate('/calendar/sync', 'POST', {})}>
                        Sync with Google Calendar
                      </button>
                    </section>
                  )}
                </>
              )}

              {/* ------------------------ APPOINTMENTS ------------------------ */}
              {page === 'Appointments' && (
                <Table
                  rows={data.appointments}
                  columns={[
                    'appointment_date',
                    ...(!patient ? ['patient_name'] : []),
                    'doctor_name',
                    'estimated_time',
                    'queue_number',
                    'status',
                    'ticket_status',
                  ]}
                  actions={(r) => (
                    <>
                      {patient && r.qr_code && r.status !== 'cancelled' && (
                        <button onClick={() => setTicket(r)}>QR ticket</button>
                      )}

                      {['pending', 'confirmed'].includes(r.status) &&
                        (patient ? (
                          action('Cancel', `/appointments/${r.id}/cancel`, 'POST', {}, true)
                        ) : staff ? (
                          <>
                            {r.status === 'pending' &&
                              action('Confirm', `/appointments/${r.id}/status`, 'PATCH', {
                                status: 'confirmed',
                              })}
                            {action(
                              'Cancel',
                              `/appointments/${r.id}/status`,
                              'PATCH',
                              { status: 'cancelled' },
                              true
                            )}
                          </>
                        ) : null)}

                      {!patient && r.status !== 'cancelled' && (
                        <button onClick={() => setEditor({ kind: 'record', row: r })}>
                          Add record
                        </button>
                      )}
                    </>
                  )}
                />
              )}

              {/* ---------------------------- QUEUE ---------------------------- */}
              {page === 'Queue' && (
                <>
                  <div className="live-grid">
                    {staff && (
                      <section className="live-card">
                        <h2>Check in QR ticket</h2>
                        <Form
                          busy={busy}
                          label="Check in"
                          fields={[
                            { name: 'qr_code', label: 'QR code text (from scanner or ticket)' },
                          ]}
                          onSubmit={(v) => mutate('/queue/check-in', 'POST', v)}
                        />
                        <p>
                          <button disabled={busy} onClick={() => setScanning(true)}>
                            Scan with camera
                          </button>
                        </p>
                      </section>
                    )}

                    <section className="live-card">
                      <h2>Call next patient</h2>
                      <Form
                        busy={busy}
                        label="Call next"
                        fields={[{ name: 'schedule_id', options: scheduleOptions }]}
                        onSubmit={(v) => mutate('/queue/call-next', 'POST', v)}
                      />
                    </section>
                  </div>

                  <Table
                    rows={data.queue}
                    columns={[
                      'queue_number',
                      'patient_name',
                      'doctor_name',
                      'start_time',
                      'ticket_status',
                    ]}
                    actions={(r) => (
                      <>
                        {r.ticket_status === 'waiting' &&
                          action('Call', `/queue/${r.ticket_id}/status`, 'PATCH', {
                            status: 'called',
                          })}
                        {r.ticket_status === 'called' &&
                          action('Complete', `/queue/${r.ticket_id}/status`, 'PATCH', {
                            status: 'served',
                          })}
                        {['issued', 'waiting', 'called'].includes(r.ticket_status) &&
                          action(
                            'Skip',
                            `/queue/${r.ticket_id}/status`,
                            'PATCH',
                            { status: 'skipped' },
                            true
                          )}
                      </>
                    )}
                  />
                </>
              )}

              {/* ---------------------------- RECORDS ---------------------------- */}
              {page === 'Records' && (
                <>
                  {!patient && (
                    <label className="live-filter">
                      Patient{' '}
                      <select value={patientId} onChange={(e) => setPatientId(e.target.value)}>
                        <option value="">Choose a patient</option>
                        {aux.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} · {p.email}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <Table
                    rows={data.records}
                    columns={['visit_date', 'doctor_name', 'diagnosis', 'notes']}
                    actions={
                      patient
                        ? undefined
                        : (r) => (
                            <button onClick={() => setEditor({ kind: 'edit-record', row: r })}>
                              Edit
                            </button>
                          )
                    }
                  />
                </>
              )}

              {/* --------------------------- CLINIC MAP --------------------------- */}
              {page === 'Clinic map' && (
                <section className="live-card">
                  <h2>Find the clinic</h2>
                  <p>City Health Office, Calapan City Hall Compound, Calapan City, Oriental Mindoro</p>
                  <ClinicMap />
                </section>
              )}

              {/* ----------------------------- CALENDAR ----------------------------- */}
              {page === 'Calendar' && CALENDAR_ID && (
                <section className="live-card">
                  <h2>Clinic calendar</h2>
                  <p>
                    Doctor schedules and queue numbers. If the calendar stays blank, sign in to
                    Google with an account the clinic calendar is shared with.
                  </p>
                  <iframe
                    className="live-calendar"
                    title="Clinic Google Calendar"
                    src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(
                      CALENDAR_ID
                    )}&ctz=Asia%2FManila&mode=WEEK`}
                  />
                  <p>
                    <a
                      href={`https://calendar.google.com/calendar/u/0?cid=${btoa(CALENDAR_ID).replace(/=+$/, '')}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Open in Google Calendar ↗
                    </a>
                  </p>
                </section>
              )}

              {/* ---------------------------- PROFILE ---------------------------- */}
              {page === 'Profile' && (
                <section className="live-card">
                  <p>{data.user.email}</p>
                  <Form
                    key={revision}
                    busy={busy}
                    initial={{ ...data.patient_profile, name: data.user.name }}
                    fields={profileFields}
                    onSubmit={(v) => mutate('/auth/profile', 'PUT', v)}
                  />
                </section>
              )}

              {/* ------------------- PATIENTS / DOCTORS / USERS ------------------- */}
              {['Patients', 'Doctors', 'Users'].includes(page) && (
                <>
                  <Table
                    rows={data[page.toLowerCase()]}
                    columns={
                      page === 'Users'
                        ? ['name', 'email', 'role']
                        : page === 'Doctors'
                        ? ['name', 'email', 'specialization', 'contact_no']
                        : ['name', 'email', 'contact_no']
                    }
                    actions={(r) =>
                      page !== 'Users' || ['staff', 'admin'].includes(r.role) ? (
                        <button
                          onClick={() =>
                            setEditor({ kind: 'edit-' + page.toLowerCase(), row: r })
                          }
                        >
                          Edit
                        </button>
                      ) : null
                    }
                  />

                  <section className="live-card">
                    <h2>
                      Add{' '}
                      {page === 'Users'
                        ? 'staff / admin account'
                        : page === 'Doctors'
                        ? 'doctor'
                        : 'patient'}
                    </h2>
                    <Form
                      busy={busy}
                      fields={[
                        ...accountFields,
                        ...(page === 'Doctors'
                          ? [field('specialization'), field('contact_no', 'tel', false)]
                          : page === 'Users'
                          ? [
                              {
                                name: 'role',
                                options: ['staff', 'admin'].map((x) => ({
                                  value: x,
                                  label: title(x),
                                })),
                              },
                            ]
                          : profileFields.slice(1)),
                      ]}
                      onSubmit={(v) => mutate('/' + page.toLowerCase(), 'POST', v)}
                    />
                  </section>
                </>
              )}

              {/* --------------------------- EMAIL LOG --------------------------- */}
              {page === 'Email log' && (
                <>
                  <p>
                    Email delivery depends on the backend mail configuration. This view shows
                    the recorded status.
                  </p>

                  <section className="live-card">
                    <h2>Appointment reminders</h2>
                    <p>
                      Emails every patient who still has an appointment on the chosen day. Patients
                      who were already reminded are skipped, so it is safe to press twice.
                    </p>
                    <Form
                      busy={busy}
                      label="Send reminders"
                      fields={[
                        {
                          name: 'date',
                          type: 'date',
                          required: false,
                          label: 'Appointment date (leave empty for tomorrow)',
                        },
                      ]}
                      onSubmit={(v) =>
                        mutate('/emails/reminders', 'POST', v.date ? { date: v.date } : {})
                      }
                    />
                  </section>

                  <section className="live-card">
                    <h2>Email a doctor</h2>
                    <Form
                      busy={busy}
                      label="Send email"
                      fields={[
                        {
                          name: 'doctor_id',
                          options: aux.map((d) => ({
                            value: d.id,
                            label: `${d.name} · ${d.email}`,
                          })),
                        },
                        { name: 'subject', maxLength: 150 },
                        { name: 'message', type: 'textarea', maxLength: 2000 },
                      ]}
                      onSubmit={(v) =>
                        window.confirm('Send this message to the selected doctor?')
                          ? mutate('/emails/doctors', 'POST', v)
                          : false
                      }
                    />
                  </section>

                  <Table
                    rows={data.emails}
                    columns={['sent_at', 'recipient_email', 'subject', 'status']}
                  />
                </>
              )}
            </>
          )
        )}

        {/* ======================== EDITOR DIALOG ======================== */}
        {editor && (
          <div className="live-overlay">
            <section
              className="live-card live-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Edit clinic information"
            >
              <button onClick={() => setEditor(null)} disabled={busy}>
                Close
              </button>
              <h2>
                {editor.kind === 'booking'
                  ? 'Book appointment'
                  : title(editor.kind.replaceAll('-', ' '))}
              </h2>

              {editor.kind === 'booking' ? (
                <>
                  <p>
                    {editor.row.doctor_name} · {editor.row.date} · {editor.row.start_time}
                  </p>
                  <Form
                    busy={busy}
                    label="Confirm booking"
                    fields={[field('reason', 'textarea', false)]}
                    onSubmit={(v) =>
                      mutate('/appointments', 'POST', { ...v, schedule_id: editor.row.id })
                    }
                  />
                </>
              ) : ['record', 'edit-record'].includes(editor.kind) ? (
                <Form
                  busy={busy}
                  initial={editor.row}
                  fields={[
                    field('diagnosis', 'textarea', false),
                    field('notes', 'textarea', false),
                  ]}
                  onSubmit={(v) =>
                    mutate(
                      editor.kind === 'record' ? '/records' : `/records/${editor.row.id}`,
                      editor.kind === 'record' ? 'POST' : 'PUT',
                      {
                        ...v,
                        ...(editor.kind === 'record' ? { appointment_id: editor.row.id } : {}),
                      }
                    )
                  }
                />
              ) : (
                <Form
                  busy={busy}
                  initial={editor.row}
                  fields={
                    editor.kind === 'edit-patients'
                      ? [profileFields[0], field('email', 'email'), ...profileFields.slice(1)]
                      : editor.kind === 'edit-doctors'
                      ? [
                          field('name'),
                          field('email', 'email'),
                          field('specialization'),
                          field('contact_no', 'tel', false),
                        ]
                      : [field('name'), field('email', 'email')]
                  }
                  onSubmit={(v) => mutate(`/${editor.kind.slice(5)}/${editor.row.id}`, 'PUT', v)}
                />
              )}
            </section>
          </div>
        )}

        {/* ========================= QR TICKET DIALOG ========================= */}
        {ticket && (
          <div className="live-overlay">
            <section
              className="live-card live-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Appointment QR ticket"
            >
              <button onClick={() => setTicket(null)}>Close</button>
              <h2>Queue #{ticket.queue_number}</h2>
              <p>
                {ticket.doctor_name} · {ticket.appointment_date}
              </p>
              <p>Estimated time: {ticket.estimated_time}</p>
              <QRCodeSVG value={ticket.qr_code} size={200} marginSize={4} />
              <p className="live-qr-text">{ticket.qr_code}</p>
              <p>Show this ticket at the clinic. Status: {ticket.ticket_status}</p>
              <p>
                <a href={calendarLink(ticket)} target="_blank" rel="noreferrer">
                  Add to Google Calendar ↗
                </a>
              </p>
            </section>
          </div>
        )}

        {/* ======================== QR SCANNER DIALOG ======================== */}
        {scanning && (
          <div className="live-overlay">
            <section
              className="live-card live-dialog"
              role="dialog"
              aria-modal="true"
              aria-label="Scan QR ticket"
            >
              <button onClick={() => setScanning(false)}>Close</button>
              <h2>Scan QR ticket</h2>
              <p>Point the camera at the patient's QR ticket.</p>
              <QrScanner
                onScan={(text) => {
                  setScanning(false);
                  mutate('/queue/check-in', 'POST', { qr_code: text });
                }}
              />
            </section>
          </div>
        )}
      </main>
    </div>
  );
}