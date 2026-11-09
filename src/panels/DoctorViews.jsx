import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { Pill, Seg, Stat, Empty, dashboardStats, fmtDate, fmtTime, initials, title, today } from './ui';

export const ageOf = (birthdate) => {
  if (!birthdate) return null;
  const b = new Date(String(birthdate).slice(0, 10) + 'T00:00:00');
  if (isNaN(b)) return null;
  const n = new Date();
  let a = n.getFullYear() - b.getFullYear();
  if (n.getMonth() < b.getMonth() || (n.getMonth() === b.getMonth() && n.getDate() < b.getDate())) a -= 1;
  return a;
};

/* ======================= patient list + record + notes ======================= */
export function PatientRecords({ patients = [], selectedId, onSelect, records = [], loading, appointments = [], busy, onSave, onEdit, onPrint }) {
  const [q, setQ] = useState('');
  const [appt, setAppt] = useState('');
  const [diagnosis, setDiagnosis] = useState('');
  const [notes, setNotes] = useState('');

  const list = patients.filter((p) => `${p.name} ${p.email} P-${p.id}`.toLowerCase().includes(q.toLowerCase()));
  const p = patients.find((x) => String(x.id) === String(selectedId));
  const mine = p
    ? appointments.filter((a) => a.status !== 'cancelled' && (a.patient_id != null ? String(a.patient_id) === String(p.id) : a.patient_name === p.name))
    : [];
  const age = p ? ageOf(p.birthdate) : null;
  const latest = records[0];

  return (
    <div className="rec">
      <div className="pc" style={{ padding: 0 }}>
        <div style={{ padding: '26px 26px 18px', borderBottom: '1px solid var(--line)' }}>
          <h2>Patients</h2>
          <p className="hint">Search by name, patient ID or email.</p>
        </div>
        <div style={{ padding: 20 }}>
          <input className="search" placeholder="Search patients" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search patients" />
          {list.map((x) => (
            <button key={x.id} className={`pl ${String(x.id) === String(selectedId) ? 'sel' : ''}`} onClick={() => onSelect(x.id)}>
              <span><b>{x.name}</b><small>P-{x.id}</small></span>
              <small>{[x.sex, x.contact_no].filter(Boolean).join(' · ') || x.email}</small>
            </button>
          ))}
          {!list.length && <p className="hint">No patients match.</p>}
        </div>
      </div>

      <div className="col">
        {!p ? (
          <Empty>Choose a patient on the left to open their record.</Empty>
        ) : (
          <>
            <div className="pc">
              <span className="lbl" style={{ display: 'flex', justifyContent: 'space-between' }}>Patient record P-{p.id}<Pill status="confirmed">Active</Pill></span>
              <div className="big" style={{ fontSize: 32 }}>{p.name}</div>
              <p className="hint">{[age != null && `${age} years old`, p.sex, p.contact_no, p.email].filter(Boolean).join(' · ')}</p>
              <div className="row3" style={{ display: 'flex', gap: 60 }}>
                <div>
                  <span className="lbl">Last check-up</span>
                  <b style={{ fontSize: 20, color: 'var(--coral-dark)' }}>{latest ? fmtDate(latest.visit_date, { month: 'long', day: 'numeric', year: 'numeric' }) : 'No visits yet'}</b>
                  {latest && <small className="hint">with {latest.doctor_name}</small>}
                </div>
                <div>
                  <span className="lbl">Diagnosed condition</span>
                  <b style={{ fontSize: 17 }}>{latest?.diagnosis || '—'}</b>
                  <small className="hint">{records.length} consultation{records.length === 1 ? '' : 's'} on file</small>
                </div>
              </div>
              {p.address && <p className="hint" style={{ marginTop: 6 }}>Address: {p.address}</p>}
            </div>

            {onPrint && (
              <div className="pc">
                <h2>Consultation documents</h2>
                <p className="hint">Issue these after the consultation — print for the patient or save as a PDF and email it.</p>
                <div className="dt3">
                  {[['Medical certificate', 'Excuse letter for work or school.', 'certificate'], ['Prescription (Rx)', 'Medicines with dosage and frequency.', 'prescription'], ['Referral letter', 'Refer to a specialist, with your findings.', 'referral']].map(([t, d, k]) => (
                    <button key={k} className="dtile" onClick={() => onPrint(k, p)}><b>{t}</b><small>{d}</small></button>
                  ))}
                </div>
              </div>
            )}

            <div className="pc">
              <h2>Visit history</h2>
              <p className="hint">Complaint, diagnosis and what was advised at each visit.</p>
              {loading ? <p className="hint" style={{ marginTop: 16 }}>Loading…</p> : records.length ? (
                <div className="tl" style={{ marginTop: 20 }}>
                  {records.map((v, i) => (
                    <div key={v.id} className={i ? '' : 'on'}>
                      <b>{v.diagnosis || 'Consultation'}{i === 0 && <span className="late">LATEST</span>}</b>
                      <small>{fmtDate(v.visit_date)} · {v.doctor_name}</small>
                      {v.notes && <p>{v.notes}</p>}
                      <button className="linkbtn" onClick={() => onEdit(v)}>Edit</button>
                    </div>
                  ))}
                </div>
              ) : <Empty>No visit records yet.</Empty>}
            </div>

            <div className="pc nf">
              <h2>Add diagnosis &amp; visit notes</h2>
              <p className="hint" style={{ marginBottom: 20 }}>Saved to this patient’s record and shown to the clinic staff.</p>
              {mine.length ? (
                <>
                  <label><span className="lbl">Appointment</span>
                    <select value={appt} onChange={(e) => setAppt(e.target.value)}>
                      <option value="">Select the visit…</option>
                      {mine.map((a) => <option key={a.id} value={a.id}>{fmtDate(a.appointment_date)} · {a.doctor_name} · {a.queue_number}</option>)}
                    </select>
                  </label>
                  <label><span className="lbl">Diagnosis</span>
                    <input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} placeholder="e.g. Acute bronchitis" />
                  </label>
                  <label><span className="lbl">Visit notes</span>
                    <textarea rows="4" maxLength={500} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Findings, advice and follow-up plan" />
                    <small className="hint">{notes.length} / 500 characters</small>
                  </label>
                  <div className="btns" style={{ alignItems: 'center' }}>
                    <button
                      className="btn"
                      disabled={busy || !appt || (!diagnosis && !notes)}
                      onClick={async () => { if (await onSave({ appointment_id: appt, diagnosis, notes })) { setDiagnosis(''); setNotes(''); setAppt(''); } }}
                    >
                      {busy ? 'Please wait…' : 'Save to record'}
                    </button>
                    <small className="hint">Records are tied to a booked visit.</small>
                  </div>
                </>
              ) : (
                <p className="soft">This patient has no booked visit you can attach a record to.</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ================================ MY PATIENTS ================================ */
export function MyPatients({ data, appointments = [], patients = [], user, recordsProps, seg, setSeg, onOpen }) {
  const day = today();
  const rows = appointments.filter((a) => String(a.appointment_date).slice(0, 10) === day && a.status !== 'cancelled');

  return (
    <>
      <div className="mini">
        {dashboardStats(data).slice(0, 4).map((s) => <Stat key={s.label} {...s} />)}
      </div>

      <div className="live-banner">
        <span className="live-avatar lg">{initials(user.name)}</span>
        <div><strong>{user.name}</strong><small>Doctor · Calapan City Health Clinic</small></div>
        <span className="live-banner-tags">
          <span>Monday – Friday · 8:00 AM – 12:00 NN</span>
          <span><ShieldCheck size={15} /> Records visible only to authorized staff</span>
        </span>
      </div>

      <div className="tw">
        <Seg options={['Today’s patients', 'Patient records']} value={seg} onChange={setSeg} />
        <span>{fmtDate(day, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })}</span>
      </div>

      {seg === 'Patient records' ? (
        <PatientRecords {...recordsProps} patients={patients} appointments={appointments} />
      ) : !rows.length ? (
        <Empty>No patients booked for today.</Empty>
      ) : (
        <div className="live-table">
          <table>
            <thead><tr><th>Time</th><th>Queue</th><th>Patient</th><th>Status</th><th style={{ textAlign: 'right' }}>Record</th></tr></thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id}>
                  <td>{fmtTime(r.estimated_time)}</td>
                  <td><b>{r.queue_number ?? '—'}</b></td>
                  <td><b>{r.patient_name}</b></td>
                  <td><Pill status={r.ticket_status || r.status} /></td>
                  <td style={{ textAlign: 'right' }}><button onClick={() => onOpen(r)}>Open record</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
