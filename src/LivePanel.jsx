import React, { useState, useEffect } from 'react';
import { api } from './api';
import ClinicMap from './ClinicMap';
import QrScanner from './QrScanner';
import { Stethoscope, Phone, LogOut, RefreshCw } from 'lucide-react';
import './live.css';
import { title, today, initials, Form, field, profileFields } from './panels/ui';
import { PatientDashboard, BookVisit, MyAppointments, QrTicket, ProfileView, VisitRecords } from './panels/PatientViews';
import { MyPatients, PatientRecords } from './panels/DoctorViews';
import DocumentPrint from './panels/DocumentPrint';
import { StaffDashboard, QueueManagement, QueueDisplay, SchedulesView, StaffAppointments, EmailView, UsersView } from './panels/StaffViews';

// Optional: id of the shared "Calapan Clinic" Google Calendar, so staff can view it inside the portal.
const CALENDAR_ID = import.meta.env?.VITE_GOOGLE_CALENDAR_ID || '';

// One readable sentence for the result of a staff action (email reminders, calendar sync, ...)
function describeResult(message, r) {
  if ('sent' in r)
    return `${message} Sent: ${r.sent}; queued: ${r.queued}; failed: ${r.failed}; skipped: ${r.skipped ?? 0}.`;
  if ('schedules' in r)
    return `${message} Added ${r.schedules} schedule event(s) and ${r.appointments} appointment event(s); ${r.still_missing} still missing.`;
  return message || 'Saved.';
}

export default function LivePanel({ user, onLogout }) {
  /* ---- Role flags ---- */
  const patient = user.role === 'patient';
  const doctor = user.role === 'doctor';
  const admin = user.role === 'admin';
  const staff = ['staff', 'admin'].includes(user.role);

  /* ---- Top-bar tabs: [page id, label] ---- */
  const tabs = patient
    ? [['Dashboard'], ['Book visit'], ['Appointments', 'My appointments'], ['QR ticket'], ['Records'], ['Profile'], ['Clinic map']]
    : doctor
    ? [['My patients'], ['Queue', 'Clinic queue'], ['Schedules', 'My schedule'], ...(CALENDAR_ID ? [['Calendar']] : []), ['Clinic map']]
    : [['Dashboard'], ['Appointments'], ['Queue'], ['Display'], ['Schedules'], ['Records'], ['Email'], ['Users'], ...(CALENDAR_ID ? [['Calendar']] : []), ['Clinic map']];

  /* ---- State ---- */
  const [page, setPage] = useState(doctor ? 'My patients' : 'Dashboard');
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
  const [records, setRecords] = useState([]);
  const [recLoading, setRecLoading] = useState(false);
  const [editor, setEditor] = useState(null);
  const [scanning, setScanning] = useState(false);
  const [ticketSel, setTicketSel] = useState('');
  const [printCtx, setPrintCtx] = useState({ type: 'certificate', patient: null });
  const [showAdd, setShowAdd] = useState(false);
  const [seg, setSeg] = useState('Today’s patients');

  const go = (t) => {
    setPage(t);
    setNotice('');
  };

  /* ---- Data loading (per page) ---- */
  useEffect(() => {
    let active = true;
    setLoading(true);
    setData(null);
    setError('');
    setEditor(null);

    async function load() {
      let result;
      let extra = [];

      if (page === 'Dashboard' && patient) {
        const [dash, ap, rec] = await Promise.all([api('/dashboard'), api('/appointments'), api('/records')]);
        result = { ...dash, appointments: ap.appointments, records: rec.records };
      } else if (page === 'Dashboard') {
        const [dash, q] = await Promise.all([api('/dashboard'), api('/queue?date=' + today())]);
        result = { ...dash, queue: q.queue };
      } else if (page === 'My patients') {
        const [dash, ap, pts] = await Promise.all([api('/dashboard'), api('/appointments'), api('/patients')]);
        result = { ...dash, appointments: ap.appointments, patients: pts.patients };
      } else if (page === 'Book visit' || page === 'Schedules') {
        result = await api('/schedules');
        if (staff) extra = (await api('/doctors')).doctors;
      } else if (page === 'Appointments' || page === 'QR ticket') {
        result = await api('/appointments');
      } else if (page === 'Queue') {
        result = await api('/queue?date=' + date);
        extra = (await api('/schedules?date=' + date)).schedules;
      } else if (page === 'Email') {
        const [em, docs] = await Promise.all([api('/emails'), api('/doctors')]);
        result = { emails: em.emails };
        extra = docs.doctors;
      } else if (page === 'Users') {
        const [docs, pts, usr] = await Promise.all([api('/doctors'), api('/patients'), admin ? api('/users') : Promise.resolve({ users: [] })]);
        result = { doctors: docs.doctors, patients: pts.patients, users: usr.users };
      } else if (page === 'Print') {
        result = { patients: (await api('/patients')).patients };
      } else if (page === 'Profile') {
        result = await api('/auth/me');
      } else if (page === 'Records') {
        if (patient) {
          result = await api('/records');
        } else {
          const [pts, ap] = await Promise.all([api('/patients'), api('/appointments')]);
          result = { patients: pts.patients, appointments: ap.appointments };
        }
      } else {
        result = {}; // Clinic map, Calendar, Display (the display polls by itself)
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
  }, [page, revision, date, patient, staff, admin]);

  /* ---- Records of the selected patient (doctor + staff) ---- */
  useEffect(() => {
    if (patient || !patientId || !['My patients', 'Records'].includes(page)) {
      setRecords([]);
      return undefined;
    }
    let active = true;
    setRecLoading(true);
    api('/records?patient_id=' + patientId)
      .then((d) => active && setRecords(Array.isArray(d.records) ? d.records : []))
      .catch((e) => active && setError(e.message))
      .finally(() => active && setRecLoading(false));
    return () => {
      active = false;
    };
  }, [patientId, page, revision, patient]);

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
    .map((s) => ({ value: s.id, label: `${s.doctor_name} · ${s.date} · ${s.start_time}` }));

  const recordsProps = {
    selectedId: patientId,
    onSelect: setPatientId,
    records,
    loading: recLoading,
    busy,
    onSave: (v) => mutate('/records', 'POST', v),
    onEdit: (row) => setEditor({ kind: 'edit-record', row }),
    onPrint: doctor
      ? (type, p) => {
          setPrintCtx({ type, patient: p });
          go('Print');
        }
      : undefined,
  };

  /* ---- Page heading ---- */
  const META = {
    Dashboard: patient
      ? [`Welcome, ${user.name}`, 'Here is what’s next on your clinic calendar, plus your queue number for the upcoming visit.']
      : [admin ? 'Admin dashboard' : 'Staff dashboard', 'Everything happening at the clinic today — the queue, the doctors on duty and the schedule gaps.'],
    'My patients': ['My patients today', 'Open a record to see when the patient was last seen, what was diagnosed and their visit notes.'],
    'Book visit': ['Book a visit', 'Choose a doctor, a date and a time. Your QR ticket is issued as soon as you confirm.'],
    Appointments: patient
      ? ['My appointments', 'Confirmed visits keep their QR ticket. Completed visits stay in your record for the next consultation.']
      : ['Appointments', 'Confirm or cancel bookings and add visit notes.'],
    'QR ticket': ['My QR ticket', 'Show this ticket at the check-in counter. Staff scan the QR code and your queue number moves forward automatically.'],
    Queue: doctor
      ? ['Clinic queue', 'Patients checked in today, in the order they will be called.']
      : ['Queue management', 'Scan a patient’s personal QR to check them in, then call the next patient. Every doctor keeps their own now-serving number.'],
    Display: ['Public queue display', 'Show this on the waiting-area screen. It updates by itself as patients are called.'],
    Schedules: doctor
      ? ['My schedule', 'Your clinic days and the hours patients can book.']
      : ['Doctor schedules', 'Each session carries a fixed number of slots. Close a session when the doctor is unavailable and it disappears from booking.'],
    Records: patient
      ? ['Visit records', 'Diagnosis and advice from each of your visits.']
      : ['Patient records', 'Open a patient to read their visit history and add notes to a booked visit.'],
    Email: ['Send email', 'Reach doctors about schedule changes, or send reminders to the patients booked for a day.'],
    Users: ['Users', 'Role-based access keeps patient records safe: doctors see their patients, staff run the queue, admins manage accounts.'],
    Profile: ['My profile', 'Keep your details current so confirmation emails, reminders and queue tickets reach you.'],
    'Clinic map': ['Clinic map', 'Find the City Health Office in Calapan City.'],
    Calendar: ['Clinic calendar', 'Doctor schedules and queue numbers.'],
    Print: ['Print a consultation document', 'Prepare a medical certificate, referral letter or prescription for this patient. Print it, or save it as a PDF and email it to the patient.'],
  };
  const [pageTitle, pageSub] = META[page] || [page, ''];

  const primary =
    page === 'Dashboard' && staff
      ? ['Open queue', () => go('Queue')]
      : page === 'Appointments' && patient
      ? ['Book appointment', () => go('Book visit')]
      : page === 'Schedules' && staff
      ? [showAdd ? 'Hide form' : 'Add schedule', () => setShowAdd((x) => !x)]
      : null;

  const ready = !(loading || (data && loadedPage !== page)) && data && loadedPage === page;

  /* ---- Render ---- */
  return (
    <div className="live-shell">
      {/* ============================ TOP BAR ============================ */}
      <header className="live-topbar print-hide">
        <div className={`live-topbar-inner ${tabs.length > 7 ? 'multi' : ''}`}>
          <a href="#home" className="live-brand">
            <span className="live-logo"><Stethoscope size={20} /></span>
            <span>
              <strong>Calapan City Health Clinic</strong>
              <small>{title(user.role)} console</small>
            </span>
          </a>

          <nav className="live-nav" aria-label="Clinic workspace">
            {tabs.map(([id, label]) => (
              <button key={id} className={page === id ? 'active' : ''} aria-current={page === id ? 'page' : undefined} onClick={() => go(id)}>
                {label || id}
              </button>
            ))}
          </nav>

          <div className="live-topbar-end">
            <a className="live-chip live-desk" href="tel:0432884417"><Phone size={15} /> Clinic desk</a>
            <span className="live-chip live-user">
              <span className="live-avatar">{initials(user.name)}</span>
              <span><strong>{user.name}</strong><small>{user.role === 'staff' ? 'Clinic staff' : title(user.role)}</small></span>
            </span>
            <button className="live-chip live-logout" onClick={onLogout}><LogOut size={15} /> Log out</button>
          </div>
        </div>
      </header>

      {/* ============================== MAIN ============================== */}
      <main className="live-main">
        <header className="live-header print-hide">
          <div>
            <h1>{pageTitle}</h1>
            <p className="live-sub">{pageSub}</p>
          </div>
          <div className="hbw">
            {page === 'Print' ? (
              <>
                <button className="btn" onClick={() => window.print()}>Print document</button>
                <button onClick={() => go('My patients')}>← Back to doctor console</button>
              </>
            ) : primary ? (
              <button className="btn" onClick={primary[1]}>{primary[0]}</button>
            ) : (
              <button className="live-refresh" disabled={loading || busy} onClick={() => setRevision((x) => x + 1)}>
                <RefreshCw size={15} /> Refresh
              </button>
            )}
          </div>
        </header>

        {notice && <p className="live-notice print-hide" role="status">{notice}</p>}
        {error && <p className="live-error print-hide" role="alert">{error}</p>}

        {loading || (data && loadedPage !== page) ? <p role="status">Loading clinic data…</p> : null}

        {ready && (
          <>
            {/* patient */}
            {page === 'Dashboard' && patient && (
              <PatientDashboard data={data} appointments={data.appointments || []} records={data.records || []} go={go} user={user} />
            )}
            {page === 'Book visit' && (
              <BookVisit
                schedules={data.schedules || []}
                user={user}
                busy={busy}
                onBook={async (id, reason) => {
                  const ok = await mutate('/appointments', 'POST', { schedule_id: id, reason });
                  if (ok) setPage('QR ticket');
                  return ok;
                }}
              />
            )}
            {page === 'Appointments' && patient && (
              <MyAppointments
                rows={data.appointments}
                action={action}
                onView={(r) => {
                  setTicketSel(r.id);
                  go('QR ticket');
                }}
              />
            )}
            {page === 'QR ticket' && <QrTicket rows={data.appointments || []} selected={ticketSel} setSelected={setTicketSel} user={user} go={go} />}
            {page === 'Records' && patient && <VisitRecords rows={data.records || []} />}
            {page === 'Profile' && (
              <ProfileView data={data} busy={busy} revision={revision} onSave={(v) => mutate('/auth/profile', 'PUT', v)} />
            )}

            {/* doctor */}
            {page === 'My patients' && (
              <MyPatients
                data={data}
                appointments={data.appointments || []}
                patients={data.patients || []}
                user={user}
                seg={seg}
                setSeg={setSeg}
                recordsProps={recordsProps}
                onOpen={(r) => {
                  const p = (data.patients || []).find((x) => String(x.id) === String(r.patient_id)) || (data.patients || []).find((x) => x.name === r.patient_name);
                  setSeg('Patient records');
                  if (p) setPatientId(p.id);
                }}
              />
            )}
            {page === 'Print' && (
              <DocumentPrint key={printCtx.type + (printCtx.patient?.id || '')} user={user} patients={data.patients || []} initialType={printCtx.type} initialPatient={printCtx.patient} onBack={() => go('My patients')} />
            )}

            {/* staff / admin */}
            {page === 'Dashboard' && staff && <StaffDashboard data={data} queue={data.queue || []} go={go} admin={admin} />}
            {page === 'Appointments' && staff && (
              <StaffAppointments rows={data.appointments} action={action} staff={staff} onRecord={(r) => setEditor({ kind: 'record', row: r })} />
            )}
            {page === 'Display' && <QueueDisplay go={go} />}
            {page === 'Records' && staff && (
              <PatientRecords {...recordsProps} patients={data.patients || []} appointments={data.appointments || []} />
            )}
            {page === 'Email' && <EmailView doctors={aux} emails={data.emails || []} busy={busy} mutate={mutate} />}
            {page === 'Users' && (
              <UsersView admin={admin} users={data.users || []} doctors={data.doctors || []} patients={data.patients || []} busy={busy} mutate={mutate} onEdit={(kind, row) => setEditor({ kind, row })} />
            )}

            {/* shared by doctor + staff */}
            {page === 'Queue' && (
              <QueueManagement
                rows={data.queue || []}
                date={date}
                setDate={setDate}
                staff={staff}
                busy={busy}
                mutate={mutate}
                action={action}
                onScan={() => setScanning(true)}
                scheduleOptions={scheduleOptions}
                go={go}
              />
            )}
            {page === 'Schedules' && (
              <SchedulesView rows={data.schedules || []} staff={staff} busy={busy} action={action} mutate={mutate} doctors={aux} showAdd={showAdd} />
            )}

            {/* common */}
            {page === 'Clinic map' && (
              <section className="pc">
                <h2>Find the clinic</h2>
                <p className="hint" style={{ marginBottom: 14 }}>City Health Office, Calapan City Hall Compound, Calapan City, Oriental Mindoro</p>
                <ClinicMap />
              </section>
            )}
            {page === 'Calendar' && CALENDAR_ID && (
              <section className="pc">
                <h2>Clinic calendar</h2>
                <p className="hint">If the calendar stays blank, sign in to Google with an account the clinic calendar is shared with.</p>
                <iframe
                  className="live-calendar"
                  title="Clinic Google Calendar"
                  src={`https://calendar.google.com/calendar/embed?src=${encodeURIComponent(CALENDAR_ID)}&ctz=Asia%2FManila&mode=WEEK`}
                />
                <p>
                  <a href={`https://calendar.google.com/calendar/u/0?cid=${btoa(CALENDAR_ID).replace(/=+$/, '')}`} target="_blank" rel="noreferrer">
                    Open in Google Calendar ↗
                  </a>
                </p>
              </section>
            )}
          </>
        )}

        {/* ======================== EDITOR DIALOG ======================== */}
        {editor && (
          <div className="live-overlay">
            <section className="live-card live-dialog" role="dialog" aria-modal="true" aria-label="Edit clinic information">
              <button onClick={() => setEditor(null)} disabled={busy}>Close</button>
              <h2>{title(editor.kind.replaceAll('-', ' '))}</h2>

              {['record', 'edit-record'].includes(editor.kind) ? (
                <Form
                  busy={busy}
                  initial={editor.row}
                  fields={[field('diagnosis', 'textarea', false), field('notes', 'textarea', false)]}
                  onSubmit={(v) =>
                    mutate(
                      editor.kind === 'record' ? '/records' : `/records/${editor.row.id}`,
                      editor.kind === 'record' ? 'POST' : 'PUT',
                      { ...v, ...(editor.kind === 'record' ? { appointment_id: editor.row.id } : {}) }
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
                      ? [field('name'), field('email', 'email'), field('specialization'), field('contact_no', 'tel', false)]
                      : [field('name'), field('email', 'email')]
                  }
                  onSubmit={(v) => mutate(`/${editor.kind.slice(5)}/${editor.row.id}`, 'PUT', v)}
                />
              )}
            </section>
          </div>
        )}

        {/* ======================== QR SCANNER DIALOG ======================== */}
        {scanning && (
          <div className="live-overlay">
            <section className="live-card live-dialog" role="dialog" aria-modal="true" aria-label="Scan QR ticket">
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
