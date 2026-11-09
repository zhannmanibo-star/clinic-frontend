import React, { useEffect, useMemo, useState } from 'react';
import { api } from '../api';
import { Pill, Seg, Stat, Empty, Form, Table, accountFields, profileFields, field, dashboardStats, fmtDate, fmtTime, title, today } from './ui';

const QUEUE_LABEL = { issued: 'Booked', waiting: 'Waiting', called: 'Serving', served: 'Done', skipped: 'Skipped' };
const qn = (n) => String(n ?? '—').replace('-', '–');
const count = (rows, s) => rows.filter((r) => r.ticket_status === s).length;
const shortName = (n = '') => { const w = String(n).split(' ').filter(Boolean); return w.length > 1 ? `${w[0]} ${w[w.length - 1][0]}.` : n; };

function Snapshot({ rows }) {
  return (
    <div className="nv">
      <span className="lbl">Queue snapshot</span>
      <div className="snap4">
        {[['Waiting', 'waiting'], ['Booked', 'issued'], ['Serving', 'called'], ['Done', 'served']].map(([l, s]) => (
          <div key={s}><b>{count(rows, s)}</b><small>{l.toUpperCase()}</small></div>
        ))}
      </div>
    </div>
  );
}

/* ================================ DASHBOARD ================================ */
export function StaffDashboard({ data, queue = [], go, admin }) {
  const serving = queue.filter((r) => r.ticket_status === 'called');
  const actions = [['Open queue management', 'Queue'], ['Open the public queue display', 'Display'], ['Review today’s schedules', 'Schedules'], ['Send an email to doctors', 'Email'], [admin ? 'Manage accounts' : 'View the directory', 'Users']];
  return (
    <>
      <div className="mini">{dashboardStats(data).map((s) => <Stat key={s.label} {...s} />)}</div>
      <div className="g3">
        <div>
          <div className="nv">
            <span className="lbl">Now serving<span style={{ color: '#ff6a2b' }}>{serving.length} active</span></span>
            <div style={{ marginTop: 14 }}>
              {serving.length ? serving.map((r) => (
                <div className="rm" key={r.ticket_id || r.queue_number}><small>{r.doctor_name}</small><b>{qn(r.queue_number)} · {r.patient_name}</b></div>
              )) : <p className="soft-note">No patient is being served right now.</p>}
            </div>
            <div className="snap">
              {[['Waiting', 'waiting'], ['Booked', 'issued'], ['Serving', 'called']].map(([l, s]) => <div key={s}><b>{count(queue, s)}</b><small>{l.toUpperCase()}</small></div>)}
            </div>
          </div>
          <div className="pc" style={{ marginTop: 22 }}>
            <h2 style={{ marginBottom: 14 }}>Quick actions</h2>
            {actions.map(([l, t]) => <button key={t} className="qa" onClick={() => go(t)}>{l}<span>›</span></button>)}
          </div>
        </div>

        <div className="pc" style={{ padding: 0 }}>
          <div style={{ padding: 26, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid var(--line)' }}>
            <div><h2>Queue waiting list</h2><p className="hint">Today · Calapan City Health Office</p></div>
            <button className="linkbtn" onClick={() => go('Queue')}>Manage queue →</button>
          </div>
          {queue.length ? (
            <div className="live-table" style={{ margin: 0, border: 0, borderRadius: 0 }}>
              <table>
                <thead><tr><th>No.</th><th>Patient</th><th>Doctor</th><th>Status</th></tr></thead>
                <tbody>
                  {queue.slice(0, 8).map((r, i) => (
                    <tr key={r.ticket_id || i}><td><b>{qn(r.queue_number)}</b></td><td><b>{r.patient_name}</b></td><td>{r.doctor_name}</td><td><Pill status={r.ticket_status}>{QUEUE_LABEL[r.ticket_status] || title(r.ticket_status)}</Pill></td></tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div style={{ padding: 26 }}><Empty>No patients in today’s queue yet.</Empty></div>}
        </div>
      </div>
    </>
  );
}

/* ============================ QUEUE MANAGEMENT ============================ */
export function QueueManagement({ rows = [], date, setDate, staff, busy, mutate, action, onScan, scheduleOptions, go }) {
  const [flt, setFlt] = useState('All');
  const [qr, setQr] = useState('');
  const [sched, setSched] = useState('');
  const list = rows.filter((r) => flt === 'All' || (QUEUE_LABEL[r.ticket_status] || title(r.ticket_status)) === flt);

  return (
    <>
      <label className="live-filter">Clinic date{' '}
        <input type="date" value={date} onChange={(e) => e.target.value && setDate(e.target.value)} />
      </label>
      <div className="g3" style={{ gridTemplateColumns: '.8fr 1.6fr' }}>
        <div>
          {staff && (
            <div className="pc" style={{ marginBottom: 22 }}>
              <h2 style={{ fontSize: 17 }}>Scan QR ticket</h2>
              <p className="hint" style={{ fontSize: 13 }}>Point the camera at the patient’s QR ticket, or type the code by hand.</p>
              <div className="cam"><div><b>Camera scanner</b><small>Scans the QR code on the patient’s printed ticket.</small></div></div>
              <div className="sf">
                <button className="btn wide" disabled={busy} onClick={onScan}>Start camera scanner</button>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 8 }}>
                  <input placeholder="Or paste the QR code text" value={qr} onChange={(e) => setQr(e.target.value)} />
                  <button disabled={busy || !qr.trim()} onClick={async () => { if (await mutate('/queue/check-in', 'POST', { qr_code: qr.trim() })) setQr(''); }}>Check in</button>
                </div>
              </div>
            </div>
          )}

          <div className="pc sf" style={{ marginBottom: 22 }}>
            <h2 style={{ fontSize: 17 }}>Call next patient</h2>
            <select value={sched} onChange={(e) => setSched(e.target.value)} aria-label="Schedule">
              <option value="">Select a schedule…</option>
              {scheduleOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>
            <button disabled={busy || !sched} onClick={() => mutate('/queue/call-next', 'POST', { schedule_id: sched })}>Call next patient</button>
            {staff && <button className="nbtn" onClick={() => go('Display')}>Open public display</button>}
          </div>
          <Snapshot rows={rows} />
        </div>

        <div className="pc" style={{ padding: 0 }}>
          <div style={{ padding: '26px 26px 12px' }}><h2>Waiting list</h2><p className="hint">Patients in the order they were checked in.</p></div>
          <div style={{ padding: '0 26px 14px' }}><Seg options={['All', 'Booked', 'Waiting', 'Serving', 'Done']} value={flt} onChange={setFlt} /></div>
          {list.length ? (
            <div className="live-table" style={{ margin: 0, border: 0, borderRadius: 0 }}>
              <table>
                <thead><tr><th>No.</th><th>Patient</th><th>Doctor</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
                <tbody>
                  {list.map((r) => (
                    <tr key={r.ticket_id}>
                      <td><b>{qn(r.queue_number)}</b></td>
                      <td><b>{r.patient_name}</b><small>{fmtTime(r.start_time)}</small></td>
                      <td>{r.doctor_name}</td>
                      <td><Pill status={r.ticket_status}>{QUEUE_LABEL[r.ticket_status] || title(r.ticket_status)}</Pill></td>
                      <td style={{ textAlign: 'right' }}>
                        <div className="live-actions" style={{ justifyContent: 'flex-end' }}>
                          {r.ticket_status === 'waiting' && action('Call', `/queue/${r.ticket_id}/status`, 'PATCH', { status: 'called' })}
                          {r.ticket_status === 'called' && action('Complete', `/queue/${r.ticket_id}/status`, 'PATCH', { status: 'served' })}
                          {['issued', 'waiting', 'called'].includes(r.ticket_status) && action('Skip', `/queue/${r.ticket_id}/status`, 'PATCH', { status: 'skipped' }, true)}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : <div style={{ padding: '0 26px 26px' }}><Empty>No tickets for this date.</Empty></div>}
        </div>
      </div>
    </>
  );
}

/* ============================= PUBLIC DISPLAY ============================= */
export function QueueDisplay({ go }) {
  const [rows, setRows] = useState([]);
  const [now, setNow] = useState(new Date());
  const [err, setErr] = useState('');

  useEffect(() => {
    let alive = true;
    const load = () => api('/queue?date=' + today()).then((d) => { if (alive) { setRows(Array.isArray(d.queue) ? d.queue : []); setErr(''); } }).catch((e) => alive && setErr(e.message));
    load();
    const poll = setInterval(load, 10000);
    const tick = setInterval(() => setNow(new Date()), 1000);
    return () => { alive = false; clearInterval(poll); clearInterval(tick); };
  }, []);

  const serving = rows.filter((r) => r.ticket_status === 'called');
  const current = serving[serving.length - 1];
  const next = rows.filter((r) => ['waiting', 'issued'].includes(r.ticket_status));

  return (
    <div className="dsp">
      <div className="top">
        <div><b style={{ fontSize: 22 }}>Calapan City Health Office</b><br /><small style={{ letterSpacing: '.14em' }}>PUBLIC QUEUE DISPLAY · WAITING AREA</small></div>
        <div style={{ textAlign: 'right' }}>
          <b style={{ fontSize: 30 }}>{now.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</b><br />
          <small>{now.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }).toUpperCase()}</small>
        </div>
      </div>
      {err && <p className="live-error" role="alert">{err}</p>}
      <div className="g3" style={{ gridTemplateColumns: '1.3fr 1fr', marginBottom: 0 }}>
        <div className="pn">
          <small style={{ color: '#ff6a2b', letterSpacing: '.14em' }}>● NOW SERVING</small>
          <div className="huge">{current ? qn(current.queue_number) : '—'}</div>
          {current ? (
            <>
              <b style={{ fontSize: 30 }}>{shortName(current.patient_name)}</b>
              <p style={{ margin: '10px 0' }}><span className="pill2" style={{ background: '#ffffff14', borderColor: '#ffffff22' }}>{current.doctor_name}</span></p>
              <div className="proceed">Please proceed to the doctor’s room</div>
            </>
          ) : <p style={{ color: '#c3d2e0' }}>Waiting for the next patient to be called.</p>}
          <div className="snap" style={{ marginTop: 24 }}>
            {[['Waiting', 'waiting'], ['Booked', 'issued'], ['Served', 'served']].map(([l, s]) => <div key={s}><b>{count(rows, s)}</b><small>{l.toUpperCase()}</small></div>)}
          </div>
        </div>
        <div className="pn">
          <small>Next in line · {next.length} waiting</small>
          {next.slice(0, 6).map((r, i) => (
            <div className="row" key={r.ticket_id || i}>
              <span><small style={{ color: '#ff6a2b' }}>0{i + 1}</small> &nbsp;<b>{qn(r.queue_number)}</b></span>
              <span style={{ textAlign: 'right' }}><b style={{ fontSize: 13 }}>{r.doctor_name}</b><br /><small>{QUEUE_LABEL[r.ticket_status]}</small></span>
            </div>
          ))}
        </div>
      </div>
      <div className="pn" style={{ marginTop: 22 }}>
        <small>Waiting list · Names are shortened for privacy</small>
        <div className="wl">
          {next.map((r, i) => (
            <div className="row" style={{ margin: 0 }} key={r.ticket_id || i}>
              <span><b style={{ fontSize: 18, color: '#ff6a2b' }}>{qn(r.queue_number)}</b> &nbsp;{shortName(r.patient_name)}<br /><small>{r.doctor_name}</small></span>
              <small>{String(QUEUE_LABEL[r.ticket_status]).toUpperCase()}</small>
            </div>
          ))}
        </div>
      </div>
      <p style={{ marginTop: 16 }}><button className="obtn" style={{ width: 'auto', padding: '10px 18px' }} onClick={() => go('Queue')}>Staff console</button></p>
    </div>
  );
}

/* ================================ SCHEDULES ================================ */
export function SchedulesView({ rows = [], staff, busy, action, mutate, doctors = [], showAdd }) {
  const booked = rows.reduce((n, s) => n + (Number(s.max_slots) ? Number(s.max_slots) - Number(s.slots_left || 0) : 0), 0);
  const total = rows.reduce((n, s) => n + (Number(s.max_slots) || 0), 0);
  const full = rows.filter((s) => s.status !== 'closed' && Number(s.slots_left) < 1).length;
  const closed = rows.filter((s) => s.status === 'closed').length;

  return (
    <>
      <div className="mini m3">
        <Stat label="Sessions listed" value={rows.length} hint={`${closed} closed`} />
        <Stat label="Slots booked" value={total ? booked : '—'} hint={total ? `of ${total} available` : 'Slot totals not provided'} />
        <Stat label="Full sessions" value={full} hint="No slots left" />
      </div>

      {staff && showAdd && (
        <section className="pc" style={{ marginBottom: 22 }}>
          <h2>Add schedule</h2>
          <Form
            busy={busy}
            fields={[
              { name: 'doctor_id', options: doctors.map((d) => ({ value: d.id, label: d.name })) },
              field('date', 'date'), field('start_time', 'time'), field('end_time', 'time'),
              { name: 'max_slots', type: 'number', min: 1, max: 200 },
            ]}
            onSubmit={(v) => mutate('/schedules', 'POST', v)}
          />
        </section>
      )}

      {!rows.length ? <Empty>No schedules found.</Empty> : (
        <div className="live-table">
          <table>
            <thead><tr><th>Day &amp; time</th><th>Doctor</th><th>Slots</th><th>Status</th>{staff && <th style={{ textAlign: 'right' }}>Action</th>}</tr></thead>
            <tbody>
              {rows.map((r) => {
                const isFull = r.status !== 'closed' && Number(r.slots_left) < 1;
                const max = Number(r.max_slots);
                const used = max ? max - Number(r.slots_left || 0) : null;
                return (
                  <tr key={r.id}>
                    <td><b>{fmtDate(r.date, { weekday: 'long', month: 'short', day: 'numeric' })}</b><small>{fmtTime(r.start_time)} – {fmtTime(r.end_time)}</small></td>
                    <td><b>{r.doctor_name}</b></td>
                    <td>{max ? (<><b>{used} / {max}</b><span className={`sbar ${isFull ? 'full' : ''}`}><i style={{ width: `${Math.round((used / max) * 100)}%` }} /></span></>) : <b>{r.slots_left} left</b>}</td>
                    <td><Pill status={isFull ? 'full' : r.status}>{isFull ? 'Full' : title(r.status)}</Pill></td>
                    {staff && (
                      <td style={{ textAlign: 'right' }}>
                        <div className="live-actions" style={{ justifyContent: 'flex-end' }}>
                          {action(r.status === 'closed' ? 'Reopen' : 'Close session', `/schedules/${r.id}`, 'PUT', { status: r.status === 'closed' ? 'open' : 'closed' })}
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {staff && (
        <section className="pc" style={{ marginTop: 22 }}>
          <h2>Google Calendar</h2>
          <p className="hint">New and changed schedules and bookings are added to the shared clinic calendar automatically. Press the button once to add anything still missing.</p>
          <button style={{ marginTop: 14 }} disabled={busy} onClick={() => mutate('/calendar/sync', 'POST', {})}>Sync with Google Calendar</button>
        </section>
      )}
    </>
  );
}

/* ================================ APPOINTMENTS ================================ */
export function StaffAppointments({ rows = [], action, onRecord, staff }) {
  const [flt, setFlt] = useState('All');
  const statuses = ['All', ...new Set(rows.map((r) => title(r.status)))];
  const list = rows.filter((r) => flt === 'All' || title(r.status) === flt);
  return (
    <>
      <div className="tw"><Seg options={statuses} value={flt} onChange={setFlt} /><span>{list.length} appointment{list.length === 1 ? '' : 's'}</span></div>
      {!list.length ? <Empty>No appointments found.</Empty> : (
        <div className="live-table">
          <table>
            <thead><tr><th>Date &amp; time</th><th>Patient</th><th>Doctor</th><th>Queue</th><th>Status</th><th style={{ textAlign: 'right' }}>Actions</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td><b>{fmtDate(r.appointment_date)}</b><small>{fmtTime(r.estimated_time)}</small></td>
                  <td><b>{r.patient_name}</b></td>
                  <td>{r.doctor_name}</td>
                  <td><b>{qn(r.queue_number)}</b><small>{title(r.ticket_status || '')}</small></td>
                  <td><Pill status={r.status} /></td>
                  <td>
                    <div className="live-actions" style={{ justifyContent: 'flex-end' }}>
                      {staff && r.status === 'pending' && action('Confirm', `/appointments/${r.id}/status`, 'PATCH', { status: 'confirmed' })}
                      {['pending', 'confirmed'].includes(r.status) && staff && action('Cancel', `/appointments/${r.id}/status`, 'PATCH', { status: 'cancelled' }, true)}
                      {r.status !== 'cancelled' && <button onClick={() => onRecord(r)}>Add record</button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ==================================== EMAIL ==================================== */
export function EmailView({ doctors = [], emails = [], busy, mutate }) {
  const [doc, setDoc] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [date, setDate] = useState('');
  return (
    <>
      <div className="g3" style={{ gridTemplateColumns: '1.7fr 1fr' }}>
        <div className="pc sf">
          <h2>Email a doctor</h2>
          <label><span className="lbl">Recipient</span>
            <select value={doc} onChange={(e) => setDoc(e.target.value)}>
              <option value="">Choose a doctor…</option>
              {doctors.map((d) => <option key={d.id} value={d.id}>{d.name} · {d.email}</option>)}
            </select>
          </label>
          <label><span className="lbl">Subject</span><input maxLength={150} value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="e.g. Reminder: schedule changes for Friday" /></label>
          <label><span className="lbl">Message</span>
            <textarea rows="9" maxLength={2000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message to the clinic team" />
            <small className="hint">{message.length} / 2000 characters</small>
          </label>
          <div className="btns" style={{ alignItems: 'center' }}>
            <button className="btn" disabled={busy || !doc || !subject.trim() || !message.trim()}
              onClick={async () => { if (window.confirm('Send this message to the selected doctor?') && (await mutate('/emails/doctors', 'POST', { doctor_id: doc, subject, message }))) { setSubject(''); setMessage(''); } }}>
              {busy ? 'Please wait…' : 'Send email'}
            </button>
            <small className="hint">Delivery is queued through the clinic mail service.</small>
          </div>
        </div>
        <div>
          <div className="pc sf">
            <h2 style={{ fontSize: 17 }}>Appointment reminders</h2>
            <p className="hint" style={{ fontSize: 13 }}>Emails every patient who still has an appointment on the chosen day. Patients already reminded are skipped.</p>
            <label><span className="lbl">Date (empty = tomorrow)</span><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
            <button disabled={busy} onClick={() => mutate('/emails/reminders', 'POST', date ? { date } : {})}>Send reminders</button>
          </div>
          <div className="nv" style={{ marginTop: 22, fontSize: 13, lineHeight: 1.6 }}>
            <b>Confirmation and reminder emails</b>
            <p style={{ color: '#c3d2e0', margin: '8px 0 0' }}>Patients automatically receive a QR ticket by email after booking, plus a reminder before their slot. Emails are logged below for audit.</p>
          </div>
        </div>
      </div>
      <h2 style={{ margin: '8px 0 14px', fontSize: 21 }}>Email log</h2>
      <Table rows={emails} columns={['sent_at', 'recipient_email', 'subject', 'status']} />
    </>
  );
}

/* ==================================== USERS ==================================== */
export function UsersView({ admin, users = [], doctors = [], patients = [], busy, mutate, onEdit }) {
  const [flt, setFlt] = useState('All');
  const [mode, setMode] = useState('');
  const [kind, setKind] = useState('Doctor');

  const all = useMemo(() => [
    ...doctors.map((r) => ({ ...r, _role: 'Doctor', _kind: 'edit-doctors' })),
    ...users.map((r) => ({ ...r, _role: title(r.role), _kind: 'edit-users' })).filter((r) => ['Staff', 'Admin'].includes(r._role)),
    ...patients.map((r) => ({ ...r, _role: 'Patient', _kind: 'edit-patients' })),
  ], [doctors, users, patients]);

  const opts = ['All', 'Doctors', ...(admin ? ['Staff & admins'] : []), 'Patients'];
  const list = all.filter((r) => flt === 'All' || (flt === 'Doctors' && r._role === 'Doctor') || (flt === 'Patients' && r._role === 'Patient') || (flt === 'Staff & admins' && ['Staff', 'Admin'].includes(r._role)));
  const canEdit = (r) => admin || r._role === 'Patient';

  const accountForm = kind === 'Doctor'
    ? [...accountFields, field('specialization'), field('contact_no', 'tel', false)]
    : accountFields;

  return (
    <>
      <div className="mini m3">
        <Stat label="Doctors" value={doctors.length} hint="Can see their own patients" />
        <Stat label={admin ? 'Staff & admins' : 'Patients'} value={admin ? users.filter((u) => ['staff', 'admin'].includes(u.role)).length : patients.length} hint={admin ? 'Run the queue and accounts' : 'Registered patients'} />
        <Stat label="Patients" value={patients.length} hint="Registered patients" />
      </div>

      <div className="tw">
        <Seg options={opts} value={flt} onChange={setFlt} />
        <div className="btns">
          <button onClick={() => setMode(mode === 'patient' ? '' : 'patient')}>+ Add patient</button>
          {admin ? <button className="btn" onClick={() => setMode(mode === 'account' ? '' : 'account')}>+ Create account</button>
            : <small className="hint">Only admins can create doctor and staff accounts.</small>}
        </div>
      </div>

      {admin && mode === 'account' && (
        <section className="pc" style={{ marginBottom: 22 }}>
          <h2>Create account</h2>
          <p className="hint" style={{ marginBottom: 14 }}>Creates a login for a doctor or a staff member.</p>
          <Seg options={['Doctor', 'Staff']} value={kind} onChange={setKind} />
          <Form key={kind} busy={busy} label={`Create ${kind.toLowerCase()} account`} fields={accountForm}
            onSubmit={async (v) => { const ok = await mutate(kind === 'Doctor' ? '/doctors' : '/users', 'POST', kind === 'Doctor' ? v : { ...v, role: 'staff' }); if (ok) setMode(''); return ok; }} />
        </section>
      )}
      {mode === 'patient' && (
        <section className="pc" style={{ marginBottom: 22 }}>
          <h2>Add patient</h2>
          <Form busy={busy} label="Add patient" fields={[...accountFields, ...profileFields.slice(1)]}
            onSubmit={async (v) => { const ok = await mutate('/patients', 'POST', v); if (ok) setMode(''); return ok; }} />
        </section>
      )}

      {!list.length ? <Empty>No accounts found.</Empty> : (
        <div className="live-table">
          <table>
            <thead><tr><th>Name</th><th>Role</th><th>Contact</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={`${r._kind}-${r.id}`}>
                  <td><b>{r.name}</b><small>{r.email}</small></td>
                  <td><Pill status={r._role === 'Patient' ? 'completed' : 'confirmed'}>{r._role}</Pill>{r.specialization && <small>{r.specialization}</small>}</td>
                  <td>{r.contact_no || '—'}</td>
                  <td style={{ textAlign: 'right' }}>{canEdit(r) && <button onClick={() => onEdit(r._kind, r)}>Edit</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
