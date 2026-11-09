import React, { useMemo, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { CLINIC_ADDRESS } from '../ClinicMap';
import { Pill, Seg, Stat, Empty, Form, profileFields, title, fmtDate, fmtTime, initials, calendarLink } from './ui';

const ACTIVE = (a) => a.qr_code && a.status !== 'cancelled';

/* ============================== DASHBOARD ============================== */
export function PatientDashboard({ data, appointments = [], records = [], go, user }) {
  const next = data.next_appointment;
  const count = (f) => appointments.filter(f).length;
  const upcoming = count((a) => ['pending', 'confirmed'].includes(a.status));
  const latest = records.slice(0, 3);

  return (
    <>
      <div className="g2">
        {next ? (
          <div className="pc">
            <span className="lbl" style={{ display: 'flex', justifyContent: 'space-between' }}>
              Next appointment <Pill status={next.status || 'confirmed'} />
            </span>
            <div className="big">
              {fmtDate(next.appointment_date, { month: 'short', day: 'numeric' })}, {fmtTime(next.estimated_time)}
            </div>
            <p className="hint">{fmtDate(next.appointment_date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</p>
            <div className="row3">
              <div><span className="lbl">Doctor</span><b>{next.doctor_name}</b></div>
              <div><span className="lbl">Queue number</span><b>{next.queue_number ?? '—'}</b></div>
              <div><span className="lbl">Ticket</span><b>{title(next.ticket_status || 'issued')}</b></div>
            </div>
            <div className="btns">
              <button className="btn" onClick={() => go('Book visit')}>Book appointment</button>
              <button onClick={() => go('Appointments')}>My appointments</button>
              <button onClick={() => go('QR ticket')}>View my QR ticket</button>
            </div>
          </div>
        ) : (
          <div className="pc">
            <span className="lbl">Next appointment</span>
            <div className="big">No upcoming visit</div>
            <p className="hint">Pick a doctor and a date to get your queue number and QR ticket.</p>
            <div className="btns" style={{ marginTop: 20 }}>
              <button className="btn" onClick={() => go('Book visit')}>Book appointment</button>
            </div>
          </div>
        )}

        <div className="navyc">
          <span className="lbl">Your queue number</span>
          <div className="big">{next?.queue_number ? String(next.queue_number).replace('-', '–') : '—'}</div>
          {next ? (
            <>
              <p>{next.doctor_name}<br />{fmtDate(next.appointment_date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })} at {fmtTime(next.estimated_time)}</p>
              <p className="soft-note">Ticket status: {title(next.ticket_status || 'issued')}</p>
              <a className="wbtn" href={calendarLink(next)} target="_blank" rel="noreferrer">Add to Google Calendar</a>
              <button className="obtn" onClick={() => go('QR ticket')}>Show my QR ticket</button>
            </>
          ) : (
            <p>Your queue number appears here as soon as you book.</p>
          )}
        </div>
      </div>

      <div className="mini">
        <Stat label="Upcoming" value={upcoming} hint={next ? `Next ${fmtDate(next.appointment_date, { month: 'short', day: 'numeric' })} · ${fmtTime(next.estimated_time)}` : 'Nothing booked'} />
        <Stat label="Completed visits" value={count((a) => a.status === 'completed')} hint="In your record" />
        <Stat label="Cancelled" value={count((a) => a.status === 'cancelled')} hint="Cancelled bookings" />
        <Stat label="Queue tickets" value={appointments.filter((a) => a.qr_code).length} hint="Issued to you" />
      </div>

      <div className="g2b">
        <div className="pc">
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
            <div>
              <h2>Recent visits</h2>
              <p className="hint">Your last consultations at the City Health Office.</p>
            </div>
            <button className="linkbtn" onClick={() => go('Records')}>View all →</button>
          </div>
          {latest.length ? (
            latest.map((r) => (
              <div className="li" key={r.id}>
                <div><b>{r.diagnosis || 'Consultation'}</b>{r.doctor_name} · {fmtDate(r.visit_date)}</div>
                <span>{r.notes}</span>
              </div>
            ))
          ) : (
            <Empty>No visit records yet.</Empty>
          )}
        </div>

        <div className="pc">
          <h2>Your care team</h2>
          {next && (
            <div className="li" style={{ marginTop: 12 }}>
              <div><b>{next.doctor_name}</b>Your next appointment</div>
            </div>
          )}
          <div className="li"><div>Clinic hours: Monday to Friday, 8:00 AM – 5:00 PM</div></div>
          <div className="li"><div>{CLINIC_ADDRESS}</div></div>
          <div className="li"><div>Only you, your doctor and authorized staff can see your records.</div></div>
        </div>
      </div>
    </>
  );
}

/* ============================== BOOK VISIT ============================== */
export function BookVisit({ schedules = [], user, busy, onBook }) {
  const open = useMemo(() => schedules.filter((s) => s.status === 'open'), [schedules]);
  const doctors = useMemo(() => [...new Map(open.map((s) => [s.doctor_name, s.doctor_name])).keys()], [open]);
  const [doctor, setDoctor] = useState('');
  const [date, setDate] = useState('');
  const [sid, setSid] = useState('');
  const [reason, setReason] = useState('');

  const days = useMemo(() => {
    const m = new Map();
    open.filter((s) => s.doctor_name === doctor).forEach((s) => {
      m.set(s.date, (m.get(s.date) || 0) + Number(s.slots_left || 0));
    });
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b));
  }, [open, doctor]);

  const sessions = open.filter((s) => s.doctor_name === doctor && s.date === date);
  const chosen = open.find((s) => String(s.id) === String(sid));

  if (!open.length) return <Empty>No open schedules right now. Please check again later.</Empty>;

  return (
    <div className="g2b">
      <div>
        <div className="pc" style={{ marginBottom: 22 }}>
          <div className="hd"><span className="n">1</span><h2>Choose a doctor</h2></div>
          <div className="btns">
            {doctors.map((d) => (
              <button key={d} className={d === doctor ? 'btn' : ''} onClick={() => { setDoctor(d); setDate(''); setSid(''); }}>{d}</button>
            ))}
          </div>
        </div>

        <div className="pc" style={{ marginBottom: 22 }}>
          <div className="hd"><span className="n">2</span><h2>Pick a date</h2></div>
          {doctor ? (
            <div className="dates">
              {days.map(([d, left]) => {
                const dt = new Date(d + 'T00:00:00');
                return (
                  <button key={d} disabled={left < 1} className={`d ${date === d ? 'on' : ''} ${left < 1 ? 'off' : ''}`} onClick={() => { setDate(d); setSid(''); }}>
                    <small>{dt.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase()}</small>
                    <b>{dt.getDate()}</b>
                    <small>{left < 1 ? 'Full' : dt.toLocaleDateString('en-US', { month: 'short' })}</small>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="soft">Choose a doctor first to see their clinic days.</div>
          )}
        </div>

        <div className="pc">
          <div className="hd"><span className="n">3</span><h2>Choose a time</h2></div>
          {date ? (
            <div className="btns">
              {sessions.map((s) => (
                <button key={s.id} disabled={Number(s.slots_left) < 1} className={String(s.id) === String(sid) ? 'btn' : ''} onClick={() => setSid(s.id)}>
                  {fmtTime(s.start_time)} – {fmtTime(s.end_time)} · {s.slots_left} slot(s) left
                </button>
              ))}
            </div>
          ) : (
            <div className="soft">Pick a date first to see available sessions.</div>
          )}
          <p className="hint" style={{ marginTop: 14, fontSize: 13 }}>Slots are limited per doctor schedule. Your exact queue time is assigned when you confirm.</p>
        </div>
      </div>

      <div className="pc">
        <h2>Appointment summary</h2>
        <div className="sumbox">
          <div className="sum">Doctor<b>{doctor || 'Not selected'}</b></div>
          <div className="sum">Date<b>{date ? fmtDate(date, { weekday: 'short', month: 'short', day: 'numeric' }) : 'Not selected'}</b></div>
          <div className="sum">Time<b>{chosen ? `${fmtTime(chosen.start_time)} – ${fmtTime(chosen.end_time)}` : 'Not selected'}</b></div>
        </div>
        <label className="fl"><span className="lbl">Patient full name</span><input value={user.name || ''} readOnly /></label>
        <label className="fl"><span className="lbl">Reason for visit (optional)</span>
          <textarea rows="3" maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Fever and cough for 2 days" />
        </label>
        <button className="btn wide" disabled={busy || !chosen} onClick={async () => { if (await onBook(chosen.id, reason)) { setReason(''); setSid(''); } }}>
          {busy ? 'Please wait…' : 'Confirm appointment →'}
        </button>
        <p className="hint" style={{ fontSize: 13, marginTop: 14 }}>Booking is free. Your QR ticket and queue number appear right after confirming.</p>
      </div>
    </div>
  );
}

/* ============================ MY APPOINTMENTS ============================ */
export function MyAppointments({ rows = [], onView, action }) {
  const statuses = ['All', ...[...new Set(rows.map((r) => title(r.status)))]];
  const [flt, setFlt] = useState('All');
  const list = rows.filter((r) => flt === 'All' || title(r.status) === flt);

  return (
    <>
      <div className="tw">
        <Seg options={statuses} value={flt} onChange={setFlt} />
        <span>{list.length} appointment{list.length === 1 ? '' : 's'}</span>
      </div>
      {!list.length ? (
        <Empty>No appointments found.</Empty>
      ) : (
        <div className="live-table">
          <table>
            <thead><tr><th>Date &amp; time</th><th>Doctor</th><th>Status</th><th style={{ textAlign: 'right' }}>Action</th></tr></thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.id}>
                  <td><b>{fmtDate(r.appointment_date)}</b><small>{fmtTime(r.estimated_time)}</small></td>
                  <td><b>{r.doctor_name}</b><small>Queue {r.queue_number ?? '—'}</small></td>
                  <td><Pill status={r.status} /></td>
                  <td style={{ textAlign: 'right' }}>
                    <div className="live-actions" style={{ justifyContent: 'flex-end' }}>
                      {ACTIVE(r) && <button className="btn" onClick={() => onView(r)}>View QR</button>}
                      {['pending', 'confirmed'].includes(r.status) && action('Cancel', `/appointments/${r.id}/cancel`, 'POST', {}, true)}
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

/* ================================ QR TICKET ================================ */
const STEPS = [
  ['Booked', 'Confirmation email sent'],
  ['Checked in', 'Staff scans your QR at the door'],
  ['Serving', 'Watch the queue board'],
  ['Completed', 'Visit notes saved to your record'],
];
const stepIndex = (s) => ({ issued: 0, waiting: 1, called: 2, served: 3 }[String(s)] ?? 0);

export function QrTicket({ rows = [], selected, setSelected, user, go }) {
  const tickets = rows.filter(ACTIVE).sort((a, b) => String(a.appointment_date).localeCompare(String(b.appointment_date)));
  const t = tickets.find((x) => String(x.id) === String(selected)) || tickets.find((x) => x.ticket_status !== 'served') || tickets[0];
  if (!t) return <Empty>You have no active QR ticket. Book a visit to get one.</Empty>;
  const step = stepIndex(t.ticket_status);

  return (
    <>
      {tickets.length > 1 && (
        <label className="live-filter">Ticket{' '}
          <select value={t.id} onChange={(e) => setSelected(e.target.value)}>
            {tickets.map((x) => <option key={x.id} value={x.id}>{fmtDate(x.appointment_date)} · {x.doctor_name} · {x.queue_number}</option>)}
          </select>
        </label>
      )}
      <div className="g2b">
        <div className="pc">
          <span className="lbl" style={{ display: 'flex', justifyContent: 'space-between' }}>Queue number <Pill status={t.status} /></span>
          <div className="big" style={{ fontSize: 72, color: 'var(--coral)' }}>{String(t.queue_number ?? '—').replace('-', '–')}</div>
          <div className="row3 kvg">
            <div><span className="lbl">Patient</span><b>{user.name}</b></div>
            <div><span className="lbl">Doctor</span><b>{t.doctor_name}</b></div>
            <div><span className="lbl">Date</span><b>{fmtDate(t.appointment_date, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</b></div>
            <div><span className="lbl">Estimated time</span><b>{fmtTime(t.estimated_time)}</b></div>
            <div><span className="lbl">Ticket status</span><b>{title(t.ticket_status || 'issued')}</b></div>
            <div><span className="lbl">Appointment</span><b>#{t.id}</b></div>
          </div>
          <div className="btns print-hide">
            <a className="btn" href={calendarLink(t)} target="_blank" rel="noreferrer">Add to Google Calendar</a>
            <button onClick={() => go('Appointments')}>My appointments</button>
            <button onClick={() => window.print()}>Print ticket</button>
          </div>
        </div>

        <div>
          <div className="pc qrw">
            <div className="qrb"><QRCodeSVG value={t.qr_code} size={190} marginSize={2} /></div>
            <h2>Show this at the check-in counter</h2>
            <p className="hint">Staff scan it to move your ticket from waiting to serving.</p>
            <p className="live-qr-text qrtext">{t.qr_code}</p>
          </div>
          <div className="pc print-hide" style={{ marginTop: 22 }}>
            <h2>Visit progress</h2>
            <div className="tl" style={{ marginTop: 16 }}>
              {STEPS.map(([a, b], i) => (
                <div key={a} className={i <= step ? 'on' : ''}><b>{a}</b>{b}</div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ================================== PROFILE ================================== */
export function ProfileView({ data, busy, revision, onSave }) {
  const p = data.patient_profile || {};
  const rows = [['Email', data.user.email], ['Contact number', p.contact_no], ['Sex', p.sex], ['Birthdate', p.birthdate ? fmtDate(p.birthdate) : null], ['Address', p.address]];
  return (
    <div className="g2">
      <div className="pc">
        <div className="pfa">
          <span className="live-avatar lg">{initials(data.user.name)}</span>
          <div><b style={{ fontSize: 20 }}>{data.user.name}</b><div className="hint">Patient</div></div>
        </div>
        {rows.map(([k, v]) => <div className="sum" key={k}>{k}<b>{v || '—'}</b></div>)}
        <p className="soft" style={{ textAlign: 'left', marginTop: 14 }}>Your records are visible only to you, the doctor you consulted and authorized clinic staff.</p>
      </div>
      <div className="pc">
        <h2>Personal information</h2>
        <p className="hint" style={{ marginBottom: 18 }}>Keep this updated so reminders and queue tickets reach you.</p>
        <Form key={revision} busy={busy} initial={{ ...p, name: data.user.name }} fields={profileFields} onSubmit={onSave} />
      </div>
    </div>
  );
}

/* ============================== VISIT RECORDS ============================== */
export function VisitRecords({ rows = [] }) {
  if (!rows.length) return <Empty>No visit records yet.</Empty>;
  return (
    <div className="pc">
      <h2>Visit history</h2>
      <p className="hint">Diagnosis and what was advised at each visit.</p>
      <div className="tl" style={{ marginTop: 20 }}>
        {rows.map((v, i) => (
          <div key={v.id} className={i ? '' : 'on'}>
            <b>{v.diagnosis || 'Consultation'}{i === 0 && <span className="late">LATEST</span>}</b>
            <small>{fmtDate(v.visit_date)} · {v.doctor_name}</small>
            {v.notes && <p>{v.notes}</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
